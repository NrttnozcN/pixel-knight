/**
 * ==========================================================================
 * PIXEL KNIGHT - ENTITIES & RPG OBJECT MODELS
 * ==========================================================================
 * Bu dosya; Oyuncu, Düşmanlar, Eşyalar, Hazine Sandıkları, Partiküller ve 
 * Havada Uçan Hasar Sayılarını (Text Particles) tanımlayan sınıfları içerir.
 */

// --- 1. PARTİKÜL SİSTEMİ (Görsel Efektler) ---
class Particle {
    constructor(x, y, color, speedX, speedY, size, maxLife, gravity = 0) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = speedX;
        this.vy = speedY;
        this.size = size;
        this.life = maxLife;
        this.maxLife = maxLife;
        this.gravity = gravity;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity; // Yerçekimi etkisi
        this.vx *= 0.95; // Sürtünme
        this.vy *= 0.95;
        this.life--;
    }

    draw(ctx, camera) {
        const drawX = this.x - camera.x;
        const drawY = this.y - camera.y;
        
        ctx.save();
        ctx.fillStyle = this.color;
        // Ömrü azaldıkça opaklığı düşür (Fade out)
        ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
        ctx.fillRect(drawX - this.size/2, drawY - this.size/2, this.size, this.size);
        ctx.restore();
    }
}

// --- 2. UÇAN METİN PARTİKÜLLERİ (Hasar & XP Göstergeleri) ---
class TextParticle {
    constructor(x, y, text, color, fontSize = "10px", isCrit = false) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.fontSize = fontSize;
        this.isCrit = isCrit;
        this.vx = (Math.random() - 0.5) * 1.5;
        this.vy = -2.5 - Math.random() * 2; // Yukarı zıpla
        this.life = 45; // 45 Kare ömür
        this.maxLife = 45;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.12; // Yavaşça aşağı süzül (yerçekimi)
        this.vx *= 0.98;
        this.life--;
    }

    draw(ctx, camera) {
        const drawX = this.x - camera.x;
        const drawY = this.y - camera.y;

        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
        
        // Font stili
        ctx.font = `${this.isCrit ? "bold 13px" : this.fontSize} 'Press Start 2P'`;
        
        // Siyah dış hat (stroke) belirginlik için çok önemli!
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = this.isCrit ? 4 : 3;
        ctx.strokeText(this.text, drawX, drawY);

        ctx.fillStyle = this.color;
        ctx.textAlign = 'center';
        ctx.fillText(this.text, drawX, drawY);
        
        ctx.restore();
    }
}

// --- 3. LOOT & GANİMET EŞYALARI ---
class Item {
    constructor(x, y, type, amount = 1, equipmentStats = null) {
        this.x = x;
        this.y = y;
        this.type = type; // 'gold', 'potion_red', 'potion_blue', 'sword_common', 'sword_rare', 'sword_legendary', 'armor_common', 'armor_rare', 'armor_legendary'
        this.amount = amount;
        this.width = 32;
        this.height = 32;
        
        // Havaya fırlama animasyonu fiziği
        this.vx = (Math.random() - 0.5) * 5;
        this.vy = -6 - Math.random() * 5;
        this.bounceCount = 2; // Yere düşerken 2 kez zıplasın
        this.gravity = 0.5;
        this.groundY = y + (Math.random() - 0.5) * 15; // Düşeceği zemin seviyesi
        
        // Eşya Nadirlik ve İsim Bilgileri
        this.rarity = 'common';
        this.name = 'Bilinmeyen Eşya';
        this.stats = equipmentStats; // { atk: 5 } vb.
        this.description = '';
        this.enchantment = null; // Efsun bilgisi (30% şans)

        this.initItemProperties();
        // Ekipman parçasıysa %30 efsun şansı uygula
        if (this.type !== 'gold' && !this.type.startsWith('potion_')) {
            this.applyEnchantment();
        }
    }

    initItemProperties() {
        if (this.type === 'gold') {
            this.name = 'Altın Para';
            this.rarity = 'common';
        } else if (this.type === 'potion_red') {
            this.name = 'Sağlık İksiri';
            this.rarity = 'rare';
            this.description = 'Sağlığını anında +30 yeniler. (Kullanmak için tıkla)';
        } else if (this.type === 'potion_blue') {
            this.name = 'Hız İksiri';
            this.rarity = 'rare';
            this.description = '10 saniyeliğine hızını +35% artırır. (Kullanmak için tıkla)';
        }
        // SİLAHLAR (KILIÇLAR)
        else if (this.type === 'sword_common') {
            this.name = 'Paslı Kılıç';
            this.rarity = 'common';
            this.stats = this.stats || { atk: 3 };
            this.description = `Eski bir askerden kalma basit demir kılıç. (+${this.stats.atk} Hasar)`;
        } else if (this.type === 'sword_rare') {
            this.name = 'Buzul Kılıcı';
            this.rarity = 'rare';
            this.stats = this.stats || { atk: 7 };
            this.description = `Düşmanları donduran soğuk buzul çeliği. (+${this.stats.atk} Hasar)`;
        } else if (this.type === 'sword_legendary') {
            this.name = 'Efsanevi Alev Kılıcı';
            this.rarity = 'legendary';
            this.stats = this.stats || { atk: 15 };
            this.description = `Cehennem ateşinde dövülmüş, dokunanı yakan kılıç! (+${this.stats.atk} Hasar)`;
        }
        // MENZİLLİ SİLAHLAR (YAYLAR)
        else if (this.type === 'bow_common') {
            this.name = 'Sıradan Avcı Yayı';
            this.rarity = 'common';
            this.stats = this.stats || { atk: 4 };
            this.description = `Esnek ahşap avcı yayı. Sol tık ile hızlı ok fırlatır. (+${this.stats.atk} Hasar)`;
        } else if (this.type === 'bow_rare') {
            this.name = 'Kadim Buzul Yayı';
            this.rarity = 'rare';
            this.stats = this.stats || { atk: 8 };
            this.description = `Düşmana çarptığında buz saçan donmuş yay. Sol tık ile donmuş ok fırlatır. (+${this.stats.atk} Hasar)`;
        } else if (this.type === 'bow_legendary') {
            this.name = 'Efsanevi Alev Yayı';
            this.rarity = 'legendary';
            this.stats = this.stats || { atk: 17 };
            this.description = `Göklerden alevli meteor okları saçan kadim yay! Sol tık ile patlayan alev oku fırlatır. (+${this.stats.atk} Hasar)`;
        }
        // ZIRHLAR
        else if (this.type === 'armor_common') {
            this.name = 'Deri Yelek';
            this.rarity = 'common';
            this.stats = this.stats || { def: 2 };
            this.description = `Hafif ve basit deri koruma. (+${this.stats.def} Defans)`;
        } else if (this.type === 'armor_rare') {
            this.name = 'Şövalye Zırhı';
            this.rarity = 'rare';
            this.stats = this.stats || { def: 6 };
            this.description = `Demirden yapılmış dayanıklı şövalye zırhı. (+${this.stats.def} Defans)`;
        } else if (this.type === 'armor_legendary') {
            this.name = 'Kraliyet Zırhı';
            this.rarity = 'legendary';
            this.stats = this.stats || { def: 13 };
            this.description = `Efsanevi kralların kuşanıp savaştığı kutsal zırh! (+${this.stats.def} Defans)`;
        }
        // MİĞFERLER
        else if (this.type === 'helmet_common') {
            this.name = 'Deri Kapşon';
            this.rarity = 'common';
            this.stats = this.stats || { def: 1 };
            this.description = `Hafif deri miğfer. (+${this.stats.def} Defans)`;
        } else if (this.type === 'helmet_rare') {
            this.name = 'Çelik Vizörlü Miğfer';
            this.rarity = 'rare';
            this.stats = this.stats || { def: 3 };
            this.description = `Tüm yüzü kaplayan ağır demir kask. (+${this.stats.def} Defans)`;
        } else if (this.type === 'helmet_legendary') {
            this.name = 'Efsanevi Güneş Tacı';
            this.rarity = 'legendary';
            this.stats = this.stats || { def: 6, crit: 5 };
            this.description = `Kutsal ışıkla parıldayan kraliyet tacı. (+${this.stats.def} Defans, +${this.stats.crit}% Kritik)`;
        }
        // KOLYELER
        else if (this.type === 'necklace_common') {
            this.name = 'Kemik Kolye';
            this.rarity = 'common';
            this.stats = this.stats || { hp: 12 };
            this.description = `Kemik parçalarından yapılmış basit tılsım kolye. (+${this.stats.hp} Maks Can)`;
        } else if (this.type === 'necklace_rare') {
            this.name = 'Safir Koruyucu Kolye';
            this.rarity = 'rare';
            this.stats = this.stats || { hp: 25, def: 1 };
            this.description = `Göz alıcı mavi safir kolye. (+${this.stats.hp} Maks Can, +${this.stats.def} Defans)`;
        } else if (this.type === 'necklace_legendary') {
            this.name = 'Efsanevi Ejder Amuleti';
            this.rarity = 'legendary';
            this.stats = this.stats || { hp: 50, atk: 3 };
            this.description = `Ortasında erimiş ejderha kanı parıldayan kutsal muska! (+${this.stats.hp} Maks Can, +${this.stats.atk} Hasar)`;
        }
        // KÜPELER
        else if (this.type === 'earrings_common') {
            this.name = 'Bronz Halka Küpe';
            this.rarity = 'common';
            this.stats = this.stats || { crit: 2 };
            this.description = `Sıradan bronz halkalar. (+${this.stats.crit}% Kritik Şansı)`;
        } else if (this.type === 'earrings_rare') {
            this.name = 'Zümrüt Damla Küpe';
            this.rarity = 'rare';
            this.stats = this.stats || { crit: 5, spd: 0.1 };
            this.description = `Zarif zümrütten yapılmış yeşil küpeler. (+${this.stats.crit}% Kritik, +${this.stats.spd} Hız)`;
        } else if (this.type === 'earrings_legendary') {
            this.name = 'Efsanevi Kozmik Küpe';
            this.rarity = 'legendary';
            this.stats = this.stats || { crit: 9, spd: 0.25 };
            this.description = `Yıldız tozuyla şekillendirilmiş kozmik rünlü takılar! (+${this.stats.crit}% Kritik, +${this.stats.spd} Hız)`;
        }
        // YÜZÜKLER
        else if (this.type === 'ring_common') {
            this.name = 'Bakır Mühür Yüzüğü';
            this.rarity = 'common';
            this.stats = this.stats || { atk: 1 };
            this.description = `Basit bakır halka. (+${this.stats.atk} Hasar)`;
        } else if (this.type === 'ring_rare') {
            this.name = 'Safir Rün Yüzüğü';
            this.rarity = 'rare';
            this.stats = this.stats || { atk: 3, crit: 3 };
            this.description = `Üzerine mavi büyü rünleri işlenmiş yüzük. (+${this.stats.atk} Hasar, +${this.stats.crit}% Kritik)`;
        } else if (this.type === 'ring_legendary') {
            this.name = 'Efsanevi Kaos Yüzüğü';
            this.rarity = 'legendary';
            this.stats = this.stats || { atk: 6, crit: 6, def: 2 };
            this.description = `Boyutlar arası gücü parmağına taşıyan kaos rünü! (+${this.stats.atk} Hasar, +${this.stats.crit}% Kritik, +${this.stats.def} Defans)`;
        }
        // ELDİVENLER
        else if (this.type === 'gloves_common') {
            this.name = 'Deri Bileklik Eldiven';
            this.rarity = 'common';
            this.stats = this.stats || { atk: 1 };
            this.description = `Basit deri bilek koruyucular. (+${this.stats.atk} Hasar)`;
        } else if (this.type === 'gloves_rare') {
            this.name = 'Çelik Plakalı Eldiven';
            this.rarity = 'rare';
            this.stats = this.stats || { atk: 2, def: 2 };
            this.description = `Plakalarla kaplı koruyucu eldiven. (+${this.stats.atk} Hasar, +${this.stats.def} Defans)`;
        } else if (this.type === 'gloves_legendary') {
            this.name = 'Efsanevi Titan Pençesi';
            this.rarity = 'legendary';
            this.stats = this.stats || { atk: 5, def: 3, crit: 3 };
            this.description = `Kadim devlerin gücüyle kuşanmış efsanevi pençeler! (+${this.stats.atk} Hasar, +${this.stats.def} Defans, +${this.stats.crit}% Kritik)`;
        }
        // DİZLİKLER (BOOTS)
        else if (this.type === 'boots_common') {
            this.name = 'Köylü Çizmesi';
            this.rarity = 'common';
            this.stats = this.stats || { spd: 0.15 };
            this.description = `Yıpranmış deri seyahat botları. (+${this.stats.spd} Hız)`;
        } else if (this.type === 'boots_rare') {
            this.name = 'Gezgin Çelik Dizlikleri';
            this.rarity = 'rare';
            this.stats = this.stats || { spd: 0.35, def: 2 };
            this.description = `Çelik greave dizlikler. Hem korur hem hızlandırır. (+${this.stats.spd} Hız, +${this.stats.def} Defans)`;
        } else if (this.type === 'boots_legendary') {
            this.name = 'Efsanevi Hermes Kanatları';
            this.rarity = 'legendary';
            this.stats = this.stats || { spd: 0.7, crit: 4 };
            this.description = `Taktığında havada süzülüyormuş gibi hissettiren rüzgar botları! (+${this.stats.spd} Hız, +${this.stats.crit}% Kritik)`;
        }
        // HANÇERLER (Dagger) — Yüksek kritik, düşük hasar
        else if (this.type === 'dagger_common') {
            this.name = 'Demir Hançer';
            this.rarity = 'common';
            this.stats = this.stats || { atk: 2, crit: 4 };
            this.description = `Hızlı ve hafif kısa bıçak. (+${this.stats.atk} Hasar, +${this.stats.crit}% Kritik)`;
        } else if (this.type === 'dagger_rare') {
            this.name = 'Zümrüt Sessiz Bıçak';
            this.rarity = 'rare';
            this.stats = this.stats || { atk: 5, crit: 8, spd: 0.15 };
            this.description = `Gölgelerde gizlenen suikastçı bıçağı. (+${this.stats.atk} Hasar, +${this.stats.crit}% Kritik, +${this.stats.spd} Hız)`;
        } else if (this.type === 'dagger_legendary') {
            this.name = 'Efsanevi Ruh Bıçağı';
            this.rarity = 'legendary';
            this.stats = this.stats || { atk: 9, crit: 14, spd: 0.3 };
            this.description = `Ruhu söküp alan kadim suikastçı hançeri! (+${this.stats.atk} Hasar, +${this.stats.crit}% Kritik, +${this.stats.spd} Hız)`;
        }
        // ASALAR (Staff) — Can ve defans odaklı
        else if (this.type === 'staff_common') {
            this.name = 'Tahta Asa';
            this.rarity = 'common';
            this.stats = this.stats || { atk: 4, hp: 10 };
            this.description = `Büyü enerjisi yayan tahta asa. (+${this.stats.atk} Hasar, +${this.stats.hp} Can)`;
        } else if (this.type === 'staff_rare') {
            this.name = 'Kristal Asa';
            this.rarity = 'rare';
            this.stats = this.stats || { atk: 9, hp: 25, def: 2 };
            this.description = `Mavi kristal büyü asası. (+${this.stats.atk} Hasar, +${this.stats.hp} Can, +${this.stats.def} Defans)`;
        } else if (this.type === 'staff_legendary') {
            this.name = 'Efsanevi Ejderha Asası';
            this.rarity = 'legendary';
            this.stats = this.stats || { atk: 16, hp: 50, def: 4, crit: 5 };
            this.description = `Ejder gözü taşıyan efsanevi sihir asası! (+${this.stats.atk} Hasar, +${this.stats.hp} Can, +${this.stats.def} Def, +${this.stats.crit}% Kritik)`;
        }
        // KALKANLAR (Shield) — Tam defans odaklı
        else if (this.type === 'shield_common') {
            this.name = 'Tahta Kalkan';
            this.rarity = 'common';
            this.stats = this.stats || { def: 4, hp: 8 };
            this.description = `Basit tahta kalkan. (+${this.stats.def} Defans, +${this.stats.hp} Can)`;
        } else if (this.type === 'shield_rare') {
            this.name = 'Demir Kale Kalkanı';
            this.rarity = 'rare';
            this.stats = this.stats || { def: 9, hp: 20 };
            this.description = `Ağır demir savunma kalkanı. (+${this.stats.def} Defans, +${this.stats.hp} Can)`;
        } else if (this.type === 'shield_legendary') {
            this.name = 'Efsanevi Titan Kalkanı';
            this.rarity = 'legendary';
            this.stats = this.stats || { def: 16, hp: 40, atk: 2 };
            this.description = `Devlerin zırhından dökülen ezeli kalkan! (+${this.stats.def} Defans, +${this.stats.hp} Can, +${this.stats.atk} Hasar)`;
        }
        // İKSİR - BÜYÜK SAĞLIK
        else if (this.type === 'potion_big') {
            this.name = 'Büyük Sağlık İksiri';
            this.rarity = 'legendary';
            this.description = 'Sağlığını +70 anında yeniler!';
        }
    }

    applyEnchantment() {
        if (Math.random() > 0.30) return; // %30 şans

        const enchants = [
            { name: 'Kan Emici',   stat: 'lifesteal', val: 1,  desc: '+Kan Emme' },
            { name: 'Keskin',      stat: 'atk',       val: 2,  desc: '+2 Hasar' },
            { name: 'Sağlam',      stat: 'def',       val: 2,  desc: '+2 Defans' },
            { name: 'Hız Rünü',    stat: 'spd',       val: 0.2, desc: '+0.2 Hız' },
            { name: 'Canlılık',    stat: 'hp',        val: 15, desc: '+15 Can' },
            { name: 'Kâhin',       stat: 'crit',      val: 4,  desc: '+4% Kritik' },
            { name: 'Demir Yumruk',stat: 'atk',       val: 3,  desc: '+3 Hasar' },
            { name: 'Aslan Yüreği',stat: 'hp',        val: 25, desc: '+25 Can' },
        ];

        const picked = enchants[Math.floor(Math.random() * enchants.length)];
        this.enchantment = picked;

        // Efsun adını eşya adına ekle
        this.name = `[${picked.name}] ${this.name}`;

        // Statı uygula
        if (!this.stats) this.stats = {};
        if (picked.stat !== 'lifesteal') {
            this.stats[picked.stat] = (this.stats[picked.stat] || 0) + picked.val;
        }

        // Açıklamayı güncelle
        this.description += ` ${picked.desc} (Efsunlu!)`;

        // Efsunlu eşyalar nadirlik basamağı atlar (common→rare, rare→legendary)
        if (this.rarity === 'common') this.rarity = 'rare';
        else if (this.rarity === 'rare') this.rarity = 'legendary';
    }

    update() {
        // Zıplama / Yere Düşme Fiziği
        if (this.bounceCount > 0) {
            this.x += this.vx;
            this.y += this.vy;
            this.vy += this.gravity;
            
            // Duvar çarpışması kontrolü
            if (!World.isWalkable(this.x, this.y)) {
                this.x -= this.vx;
                this.vx *= -0.5;
            }

            // Zemine çarptı mı?
            if (this.y >= this.groundY) {
                this.y = this.groundY;
                this.vy = -this.vy * 0.4; // Zıplat (enerji kaybet)
                this.vx *= 0.5; // Sürtünme
                this.bounceCount--;
            }
        }
    }

    // Oyuncuya doğru manyetik çekim hareketi
    magnetizeTowards(playerX, playerY, speed) {
        const angle = Math.atan2(playerY - this.y, playerX - this.x);
        this.x += Math.cos(angle) * speed;
        this.y += Math.sin(angle) * speed;
        
        // Zıplamayı iptal et ve havada süzül
        this.bounceCount = 0;
    }

    draw(ctx, camera) {
        const drawX = this.x - camera.x;
        const drawY = this.y - camera.y;

        // Nadirlik ışığı parıltısı (Yerde parıldasın)
        ctx.save();
        let glowColor = 'rgba(255,255,255,0.15)';
        let radius = 12;
        if (this.rarity === 'rare') { glowColor = 'rgba(0, 176, 255, 0.35)'; radius = 15; }
        else if (this.rarity === 'epic') { glowColor = 'rgba(160, 32, 240, 0.4)'; radius = 18; }
        else if (this.rarity === 'legendary') { 
            glowColor = `rgba(255, 140, 0, ${0.4 + Math.sin(Date.now() / 200) * 0.15})`; 
            radius = 22; 
        }

        const grad = ctx.createRadialGradient(drawX, drawY, 2, drawX, drawY, radius);
        grad.addColorStop(0, glowColor);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(drawX, drawY, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Piksel sprite'ını çiz
        let spriteKey = `item_${this.type}`;
        if (this.type.startsWith('sword_')) spriteKey = `item_sword_${this.rarity}`;
        if (this.type.startsWith('armor_')) spriteKey = `item_armor_${this.rarity}`;
        if (this.type.startsWith('bow_')) spriteKey = `item_bow_${this.rarity}`;
        if (this.type.startsWith('helmet_')) spriteKey = `item_helmet_${this.rarity}`;
        if (this.type.startsWith('necklace_')) spriteKey = `item_necklace_${this.rarity}`;
        if (this.type.startsWith('earrings_')) spriteKey = `item_earrings_${this.rarity}`;
        if (this.type.startsWith('ring_')) spriteKey = `item_ring_${this.rarity}`;
        if (this.type.startsWith('gloves_')) spriteKey = `item_gloves_${this.rarity}`;
        if (this.type.startsWith('boots_')) spriteKey = `item_boots_${this.rarity}`;
        // Yeni item türleri (sprite yoksa sword/armor sprite'ını yeniden kullan)
        if (this.type.startsWith('dagger_')) spriteKey = `item_sword_${this.rarity}`;
        if (this.type.startsWith('staff_')) spriteKey = `item_sword_${this.rarity}`;
        if (this.type.startsWith('shield_')) spriteKey = `item_armor_${this.rarity}`;
        if (this.type === 'potion_big') spriteKey = 'item_potion_red';

        SpriteEngine.draw(ctx, spriteKey, drawX - this.width/2, drawY - this.height/2, this.width, this.height);
    }
}

// --- 4. ETKİLEŞİMLİ HAZİNE SANDIĞI ---
class Chest {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 48;
        this.height = 48;
        this.opened = false;
    }

    open(game) {
        if (this.opened) return;
        this.opened = true;
        
        // Sandık açma sesi
        SoundEngine.playChestOpen();
        game.addLog("Sandık açıldı! Eşyalar saçılıyor.", "loot");

        // Ganimet havuzunu zenginleştir
        const itemCount = Math.floor(Math.random() * 3) + 3; // 3-5 adet ganimet
        for (let i = 0; i < itemCount; i++) {
            let type = 'gold';
            const roll = Math.random();
            
            // Ganimet olasılık havuzu
            if (roll < 0.40) type = 'gold'; // %40 altın
            else if (roll < 0.65) type = Math.random() < 0.6 ? 'potion_red' : 'potion_blue'; // %25 iksir
            else {
                // %35 oranında rastgele bir ekipman parçası düşer
                const gearCategories = ['sword', 'bow', 'armor', 'helmet', 'necklace', 'earrings', 'ring', 'gloves', 'boots', 'dagger', 'staff', 'shield'];
                const chosenCategory = gearCategories[Math.floor(Math.random() * gearCategories.length)];

                const rarityRoll = Math.random();
                let rarity = 'common';
                if (rarityRoll < 0.12) rarity = 'legendary';
                else if (rarityRoll < 0.38) rarity = 'rare';
                else rarity = 'common';

                type = `${chosenCategory}_${rarity}`;
            }

            // Ganimeti sandığın tam merkezinden hafif yukarı fırlatarak oluştur
            const floorMult = 1 + (window.GameEngine ? window.GameEngine.floor - 1 : 0) * 0.1;
            const chestGold = Math.floor((Math.random() * 10 + 15) * floorMult); // 15-25 base
            const lootItem = new Item(this.x, this.y - 10, type, type === 'gold' ? chestGold : 1);
            game.items.push(lootItem);
        }

        // Açılış efekt partikülleri (Altın yıldızlar!)
        for (let p = 0; p < 15; p++) {
            game.particles.push(new Particle(
                this.x, this.y - 12,
                '#ffd700', // Altın rengi
                (Math.random() - 0.5) * 6,
                -3 - Math.random() * 4,
                Math.random() * 3 + 3,
                40 + Math.random() * 20
            ));
        }
    }

    draw(ctx, camera) {
        const drawX = this.x - camera.x - this.width/2;
        const drawY = this.y - camera.y - this.height/2;

        const spriteName = this.opened ? 'chest_open' : 'chest_closed';
        SpriteEngine.draw(ctx, spriteName, drawX, drawY, this.width, this.height);
        
        // Eğer açılmadıysa ve oyuncu yakınındaysa üzerine minik bi parıltı veya ipucu çiz
        if (!this.opened) {
            ctx.save();
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'var(--neon-cyan)';
            // Yavaşça yanıp sönen ince bir çerçeve
            ctx.strokeStyle = `rgba(0, 240, 255, ${0.2 + Math.sin(Date.now() / 150) * 0.15})`;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(drawX - 2, drawY - 2, this.width + 4, this.height + 4);
            ctx.restore();
        }
    }
}

// --- 5. CANAVARLAR (Savaş Yapay Zekası) ---
class Enemy {
    constructor(x, y, type = 'slime') {
        this.x = x;
        this.y = y;
        this.type = type; // 'slime', 'slime_fire', 'slime_shadow', 'skeleton'
        this.width = 48;
        this.height = 48;
        
        // Canavar Nitelikleri (Tipine göre)
        this.hp = 15;
        this.maxHp = 15;
        this.speed = 1.0;
        this.atk = 8;
        this.xpReward = 15;
        this.goldReward = Math.floor(Math.random() * 5) + 2;
        
        // Yapay zeka ve hareket durumları
        this.state = 'idle'; // 'idle', 'patrol', 'chase'
        this.target = null;
        this.facing = 'right';

        // Görsel Hasar Alma Efektleri
        this.hitFlashTimer = 0;
        this.knockbackVx = 0;
        this.knockbackVy = 0;

        // Saldırı cooldown (knockback sırasında da çalışır)
        this.attackCooldownTimer = 60; // İlk temastan önce 1 sn bekle
        this.attackCooldownMax = 90;   // 1.5 sn aralarla vurur
        this.stunTimer = 0;      // Kritik vuruş sersemletmesi
        this.burnedTimer = 0;    // Elemental: yanıyor mu?
        this.poisonedTimer = 0;  // Elemental: zehirleniyor mu?

        // Animasyon karesi
        this.animTimer = 0;
        this.animFrame = 1;

        // Uygulayacağı debuff türü (null, 'burn', 'poison', 'slow')
        this.debuffType = null;

        this.initEnemyStats();
    }

    initEnemyStats() {
        // Zindan derinliğine (kat seviyesine) göre zorluk ölçekleme formülü
        // Kat 1'de çarpan = 1.0, her kat için +15% güçlenme
        const floorMultiplier = 1.0 + (window.GameEngine ? window.GameEngine.floor - 1 : 0) * 0.15;

        if (this.type === 'slime') {
            this.name = 'Jöle Balçık';
            this.hp = Math.floor(15 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 0.9;
            this.atk = Math.floor(5 * floorMultiplier);
            this.xpReward = Math.floor(10 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 7 + 8) * floorMultiplier);  // 8-15
            this.debuffType = 'slow'; // Yeşil balçık → yavaşlatır
        } else if (this.type === 'slime_fire') {
            this.name = 'Lav Balçığı';
            this.hp = Math.floor(25 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 1.2;
            this.atk = Math.floor(12 * floorMultiplier);
            this.xpReward = Math.floor(20 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 10 + 12) * floorMultiplier); // 12-22
            this.debuffType = 'burn'; // Kırmızı balçık → yakar + regen engeller
        } else if (this.type === 'slime_shadow') {
            this.name = 'Karanlık Balçık';
            this.hp = Math.floor(40 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 1.5;
            this.atk = Math.floor(18 * floorMultiplier);
            this.xpReward = Math.floor(35 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 15 + 15) * floorMultiplier); // 15-30
            this.debuffType = 'poison'; // Mor balçık → zehirler + regen engeller
        } else if (this.type === 'skeleton') {
            this.name = 'İskelet Savaşçı';
            this.hp = Math.floor(30 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 1.1;
            this.atk = Math.floor(10 * floorMultiplier);
            this.xpReward = Math.floor(25 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 10 + 10) * floorMultiplier); // 10-20
            this.width = 48;
            this.height = 48;
        }
    }

    update(player, game) {
        // Saldırı cooldown'ı her zaman say (knockback sırasında da!)
        if (this.attackCooldownTimer > 0) this.attackCooldownTimer--;
        // Elemental debuff sayaçları
        if (this.burnedTimer > 0) this.burnedTimer--;
        if (this.poisonedTimer > 0) this.poisonedTimer--;
        // Sersemletme: stun aktifken hareket ve saldırı yapamaz
        if (this.stunTimer > 0) { this.stunTimer--; return; }

        // Oyuncuya olan mesafeyi hesapla
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.hypot(dx, dy);

        // Melee saldırı: knockback/hareket durumundan bağımsız kontrol et
        if (distance < 32 && player.hp > 0 && this.attackCooldownTimer === 0) {
            player.takeDamage(this.atk, game);
            if (this.debuffType && player.applyDebuff) player.applyDebuff(this.debuffType, game);
            this.attackCooldownTimer = this.attackCooldownMax;
            if (window.SoundEngine) SoundEngine.playEnemyAttack();
        }

        // 1. Geri Savrulma Fiziği (Knockback) — hareketi durdurur ama saldırıyı engellemez
        if (Math.abs(this.knockbackVx) > 0.1 || Math.abs(this.knockbackVy) > 0.1) {
            const nextX = this.x + this.knockbackVx;
            const nextY = this.y + this.knockbackVy;

            if (World.isWalkable(nextX, this.y)) this.x = nextX;
            if (World.isWalkable(this.x, nextY)) this.y = nextY;

            this.knockbackVx *= 0.85;
            this.knockbackVy *= 0.85;
            if (this.hitFlashTimer > 0) this.hitFlashTimer--;
            return;
        }

        // Hasar parlaması süresini azalt
        if (this.hitFlashTimer > 0) this.hitFlashTimer--;

        // Animasyon zamanlayıcısı
        this.animTimer++;
        if (this.animTimer >= 20) {
            this.animFrame = this.animFrame === 1 ? 2 : 1;
            this.animTimer = 0;
        }

        // 2. YAPAY ZEKA VE HAREKET
        // Algılama mesafesi: 180 piksel
        if (distance < 180 && player.hp > 0) {
            this.state = 'chase';

            // Oyuncuya doğru yürü
            const angle = Math.atan2(dy, dx);
            const vx = Math.cos(angle) * this.speed;
            const vy = Math.sin(angle) * this.speed;

            this.facing = vx > 0 ? 'right' : 'left';

            const nextX = this.x + vx;
            const nextY = this.y + vy;

            // Duvar çarpışması ile akıllıca hareket et
            if (World.isWalkable(nextX, this.y)) {
                this.x = nextX;
            }
            if (World.isWalkable(this.x, nextY)) {
                this.y = nextY;
            }
        } else {
            // Devriye Gezme (Patrol) veya Bekleme
            if (this.state === 'chase') this.state = 'idle';

            if (Math.random() < 0.015) { // Rastgele yöne ufak hareket et
                this.patrolAngle = Math.random() * Math.PI * 2;
                this.state = 'patrol';
            }

            if (this.state === 'patrol') {
                const vx = Math.cos(this.patrolAngle) * (this.speed * 0.5);
                const vy = Math.sin(this.patrolAngle) * (this.speed * 0.5);
                
                this.facing = vx > 0 ? 'right' : 'left';

                const nextX = this.x + vx;
                const nextY = this.y + vy;

                if (World.isWalkable(nextX, nextY)) {
                    this.x = nextX;
                    this.y = nextY;
                } else {
                    this.state = 'idle'; // Duvara çarparsa dur
                }
            }
        }
    }

    takeDamage(amount, knockbackAngle, game, knockbackMult = 1) {
        this.hp -= amount;
        this.hitFlashTimer = 10; // 10 kare kırmızı kal

        // Geri savurma kuvveti (knockbackMult: kritik veya ağır silah için artırılır)
        const force = 8 * knockbackMult;
        this.knockbackVx = Math.cos(knockbackAngle) * force;
        this.knockbackVy = Math.sin(knockbackAngle) * force;

        // Elemental Reaksiyon: yanıyor + zehirleniyor = PATLAMA (alan hasarı)
        if (this.burnedTimer > 0 && this.poisonedTimer > 0) {
            this.burnedTimer = 0; this.poisonedTimer = 0;
            const explodeDmg = Math.floor(amount * 1.5);
            game.enemies.forEach(e => {
                const dist = Math.hypot(e.x - this.x, e.y - this.y);
                if (e !== this && dist < 96) e.takeDamage(explodeDmg, Math.atan2(e.y - this.y, e.x - this.x), game);
            });
            game.triggerScreenShake(6);
            game.addLog(`💥 ELEMENTAL PATLAMA! ${explodeDmg} alan hasarı!`, "death");
            for (let p = 0; p < 16; p++) {
                game.particles.push(new Particle(this.x, this.y, '#ff8c00',
                    (Math.random()-0.5)*8, (Math.random()-0.5)*8, Math.random()*5+3, 30));
            }
        }

        // Vurma sesi
        SoundEngine.playHit();

        // Parçacık fışkırması (Kan efekti)
        let bloodColor = '#e63946'; // Slime ise kırmızı
        if (this.type === 'slime') bloodColor = '#39ff14'; // Yeşil slime kanı!
        if (this.type === 'slime_shadow') bloodColor = '#b026ff'; // Mor kan!
        if (this.type === 'skeleton') bloodColor = '#e0dbcd'; // Kemik tozu parçacıkları!

        for (let p = 0; p < 8; p++) {
            game.particles.push(new Particle(
                this.x, this.y,
                bloodColor,
                (Math.random() - 0.5) * 5 + this.knockbackVx * 0.5,
                (Math.random() - 0.5) * 5 + this.knockbackVy * 0.5,
                Math.random() * 3 + 2,
                15 + Math.random() * 10
            ));
        }

        // Ölüm Kontrolü
        if (this.hp <= 0) {
            this.die(game);
        }
    }

    die(game) {
        // Canavarı listelerden sil
        game.enemies = game.enemies.filter(e => e !== this);
        game.addLog(`${this.name} yenildi! +${this.xpReward} TP.`, "enemy-hit");
        game.killsCount++;
        // Quest ve achievement takibi
        if (game._checkQuestProgress) game._checkQuestProgress('kill', { type: this.type });
        if (this.type && this.type.startsWith('slime')) {
            const prev = parseInt(localStorage.getItem('pk_slimeKills') || 0);
            localStorage.setItem('pk_slimeKills', prev + 1);
        }
        if (game._checkAchievements) game._checkAchievements();

        // Silah uzmanlığı için öldürme sayacı
        if (game.player && game.player.specialization === null) {
            const weapon = game.player.equipment && game.player.equipment.weapon;
            if (weapon && weapon.type && weapon.type.includes('bow')) {
                game.player.bowKills = (game.player.bowKills || 0) + 1;
            } else {
                game.player.swordKills = (game.player.swordKills || 0) + 1;
            }
        }

        // Vampir Dokunuşu: öldürmede +3 HP
        if (game.player.hasLifesteal) {
            game.player.hp = Math.min(game.player.getMaxHp(), game.player.hp + 3);
            game.textParticles.push(new TextParticle(game.player.x, game.player.y - 18, '+3 CAN', '#ff4488', "8px"));
        }

        // Oyuncuya TP (XP) ver
        game.player.gainXp(this.xpReward, game);

        // Yere Altın Para Düşür (Luck statı çarpan olarak artırır)
        const luckMult = 1 + ((game.player && game.player.stats.luck) || 0) / 100;
        const goldVal = Math.floor(this.goldReward * luckMult);
        if (goldVal > 0) {
            game.items.push(new Item(this.x, this.y, 'gold', goldVal));
        }

        // Düşman ölüm ganimetleri (Luck: efsanevi şansını artırır)
        const luckBonus = ((game.player && game.player.stats.luck) || 0);
        const legendaryChance = 0.05 + luckBonus / 1000;
        const rareChance = 0.30 + luckBonus / 500;
        const roll = Math.random();
        if (roll < 0.12) {
            game.items.push(new Item(this.x, this.y, 'potion_red'));
        } else if (roll < 0.16) {
            game.items.push(new Item(this.x, this.y, 'potion_blue'));
        } else if (roll < 0.28) {
            const gearCategories = ['sword', 'bow', 'armor', 'helmet', 'necklace', 'earrings', 'ring', 'gloves', 'boots', 'dagger', 'staff', 'shield'];
            const chosenCategory = gearCategories[Math.floor(Math.random() * gearCategories.length)];
            const rarityRoll = Math.random();
            const rarity = rarityRoll < legendaryChance ? 'legendary' : rarityRoll < rareChance ? 'rare' : 'common';
            game.items.push(new Item(this.x, this.y, `${chosenCategory}_${rarity}`));
        }

        // Ölüm parçacık patlaması
        for (let p = 0; p < 12; p++) {
            game.particles.push(new Particle(
                this.x, this.y,
                '#ffffff',
                (Math.random() - 0.5) * 4,
                (Math.random() - 0.5) * 4,
                Math.random() * 4 + 2,
                30
            ));
        }
    }

    draw(ctx, camera) {
        const drawX = this.x - camera.x - this.width/2;
        const drawY = this.y - camera.y - this.height/2;

        ctx.save();

        // Hasar alındığında karakteri kırmızı parlat (Destination-Out maskesiyle yapabiliriz ama canvas filtreleri çok daha modern ve premiumdur!)
        if (this.hitFlashTimer > 0) {
            ctx.filter = 'brightness(1.5) sepia(1) hue-rotate(-50deg) saturate(5)'; // Kırmızımsı hasar parlaması
        }

        // Sprite anahtarını bul
        let spriteKey = `${this.type}_idle${this.animFrame}`;
        if (this.facing === 'left') spriteKey += '_flipped';

        SpriteEngine.draw(ctx, spriteKey, drawX, drawY, this.width, this.height);
        
        ctx.restore();

        // 3. Mini Can Barı (Kafalarının üzerinde can göstergesi)
        if (this.hp < this.maxHp) {
            const barW = 32;
            const barH = 4;
            const barX = this.x - camera.x - barW / 2;
            const barY = this.y - camera.y - this.height / 2 - 8;

            ctx.fillStyle = '#222';
            ctx.fillRect(barX, barY, barW, barH);

            const hpPercent = Math.max(0, this.hp / this.maxHp);
            ctx.fillStyle = '#ff3333';
            ctx.fillRect(barX, barY, barW * hpPercent, barH);
        }
    }
}

// --- 6. ŞÖVALYE (KAHRAMAN / OYUNCU) ---
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 48;
        this.height = 48;
        this.radius = 16; // Çarpışma yarıçapı
        
        // RPG İstatistikleri
        this.level = 1;
        this.xp = 0;
        this.nextLevelXp = 100;
        
        // Temel Statlar
        this.stats = {
            maxHp: 100,
            atk: 10,
            def: 2,
            spd: 2.5,
            crit: 5,  // % Kritik vuruş şansı
            luck: 5   // % Şans statı (altın & efsanevi drop şansını artırır)
        };
        this.hp = 100;
        this.gold = 0;
        this.hasBarter = false; // Pazarlıkçı yeteneği aktif mi?
        this.comboCount = 0;
        this.comboTimer = 0;
        // Kutsal sütun buff sayaçları (30sn = 1800 frame)
        this.shrineAtkTimer = 0;
        this.shrineSpdTimer = 0;
        this.shrineRegenTimer = 0;
        this.shrineRegenTickTimer = 0;

        // Envanter & 8 Adet RPG Ekipman Slotu
        this.inventory = [];
        this.maxInventorySlots = 16;
        this.equipment = {
            helmet: null,
            necklace: null,
            earrings: null,
            ring: null,
            weapon: null,
            armor: null,
            gloves: null,
            boots: null
        };

        // Durumlar ve Zamanlayıcılar
        this.facing = 'right';
        this.isMoving = false;
        this.isAttacking = false;
        this.attackTimer = 0;
        this.attackCooldown = 25; // 25 karede bir saldırabilir (Hızlı saldırıda 12 kare)
        this.attackCooldownTimer = 0;
        
        this.invincibleTimer = 0; // Hasar aldıktan sonra kısa bir süre dokunulmaz olma
        
        // Hız potu güçlendirmesi
        this.speedBuffTimer = 0;

        // Debuff durumları (Düşman renklerine göre)
        this.burnTimer = 0;       // Yanma: 300 kare (~5sn), -3HP/60kare, regen engeller
        this.poisonTimer = 0;     // Zehir: 480 kare (~8sn), -2HP/60kare, regen engeller
        this.slowTimer = 0;       // Yavaşlama: 180 kare (~3sn), hız x0.6
        this.burnTickTimer = 0;
        this.poisonTickTimer = 0;

        // HP yenileme sistemi (5sn hasar almadan → yavaş iyileşme)
        this.regenTimer = 0;       // Hasar almadan geçen kare sayısı
        this.regenTickTimer = 0;   // Regen tick arası sayaç

        // Lv5 Silah uzmanlığı
        this.swordKills = 0;
        this.bowKills = 0;
        this.specialization = null; // null, 'sword', 'bow'

        // Lifesteal (Vampir Dokunuşu upgrade buff)
        this.hasLifesteal = false;

        // Yetenek Bekleme Süreleri (Skills & Cooldowns)
        this.qCooldown = 0;
        this.qMaxCooldown = 720; // 12 saniye (60fps'te 720 kare)
        this.wCooldown = 0;
        this.wMaxCooldown = 900; // 15 saniye (60fps'te 900 kare)
        this.rapidAttackActive = false;
        this.rapidAttackTimer = 0;

        // Atılma (Dash) Özellikleri
        this.isDashing = false;
        this.dashTimer = 0;
        this.dashDuration = 8; // 8 kare boyunca çok hızlı gider
        this.dashCooldown = 45; // 45 kare cooldown (0.75 saniye)
        this.dashCooldownTimer = 0;
        this.dashSpeedMultiplier = 3.2;
        this.dashDirection = { x: 0, y: 0 };

        // Animasyon kareleri
        this.animTimer = 0;
        this.animFrame = 1;

        // Başlangıç ekipmanları
        this.giveStartingGear();
        if (window.SpriteEngine) {
            window.SpriteEngine.updatePlayerSprites(this.equipment);
        }
    }

    giveStartingGear() {
        // Oyuna paslı bir kılıç ile başla
        this.equipment.weapon = {
            type: 'sword_common',
            name: 'Paslı Kılıç',
            rarity: 'common',
            stats: { atk: 3 },
            description: 'Basit demir kılıç. (+3 Hasar)'
        };
    }

    getTotalAtk() {
        let bonus = 0;
        for (const slot in this.equipment) {
            const item = this.equipment[slot];
            if (item && item.stats && item.stats.atk) bonus += item.stats.atk;
        }
        const base = this.stats.atk + bonus;
        return this.shrineAtkTimer > 0 ? Math.floor(base * 1.5) : base;
    }

    // Ekipman defansı dahil toplam defansı döner
    getTotalDef() {
        let bonus = 0;
        for (const slot in this.equipment) {
            const item = this.equipment[slot];
            if (item && item.stats && item.stats.def) {
                bonus += item.stats.def;
            }
        }
        return this.stats.def + bonus;
    }

    // Ekipmanlar dahil maksimum canı hesaplar
    getMaxHp() {
        let bonus = 0;
        for (const slot in this.equipment) {
            const item = this.equipment[slot];
            if (item && item.stats && item.stats.hp) {
                bonus += item.stats.hp;
            }
        }
        return this.stats.maxHp + bonus;
    }

    // Ekipman ve bufflar dahil toplam hızı döner
    getTotalSpd() {
        let bonus = 0;
        for (const slot in this.equipment) {
            const item = this.equipment[slot];
            if (item && item.stats && item.stats.spd) {
                bonus += item.stats.spd;
            }
        }
        let baseSpd = this.stats.spd + bonus;
        const wpn = this.equipment && this.equipment.weapon;
        if (wpn) {
            if (wpn.type && (wpn.type.includes('dagger') || wpn.type.includes('bow'))) baseSpd += 0.15;
            if (wpn.type && wpn.type.includes('sword')) baseSpd -= 0.15;
        }
        if (this.shrineSpdTimer > 0) baseSpd += 0.5;
        if (this.speedBuffTimer > 0) baseSpd *= 1.35;
        if (this.slowTimer > 0) baseSpd *= 0.6;
        return Math.max(0.5, baseSpd);
    }

    update(keys, mouse, game) {
        // Dokunulmazlık ve bekleme sürelerini azalt
        if (this.invincibleTimer > 0) this.invincibleTimer--;
        if (this.attackCooldownTimer > 0) this.attackCooldownTimer--;
        if (this.speedBuffTimer > 0) this.speedBuffTimer--;
        if (this.dashCooldownTimer > 0) this.dashCooldownTimer--;

        // Yetenek bekleme sürelerini azalt
        if (this.qCooldown > 0) this.qCooldown--;
        if (this.wCooldown > 0) this.wCooldown--;
        if (this.comboTimer > 0) { this.comboTimer--; if (this.comboTimer === 0) this.comboCount = 0; }
        // Shrine buff sayaçları
        if (this.shrineAtkTimer > 0) this.shrineAtkTimer--;
        if (this.shrineSpdTimer > 0) this.shrineSpdTimer--;
        if (this.shrineRegenTimer > 0) {
            this.shrineRegenTimer--;
            this.shrineRegenTickTimer++;
            if (this.shrineRegenTickTimer >= 30) { // Her 0.5sn +2 HP
                this.shrineRegenTickTimer = 0;
                this.hp = Math.min(this.getMaxHp(), this.hp + 2);
            }
        } else { this.shrineRegenTickTimer = 0; }

        // --- DEBUFF SAYAÇLARI ---
        if (this.burnTimer > 0) {
            this.burnTimer--;
            this.burnTickTimer++;
            if (this.burnTickTimer >= 60) { // Her 1sn yanma hasarı
                this.burnTickTimer = 0;
                const burnDmg = 3;
                this.hp = Math.max(1, this.hp - burnDmg);
                game.textParticles.push(new TextParticle(this.x, this.y - 20, `-${burnDmg} YANIK`, '#ff6600', "8px"));
                game.updateUI();
                if (window.SoundEngine && SoundEngine.playBurn) SoundEngine.playBurn();
            }
        } else {
            this.burnTickTimer = 0;
        }

        if (this.poisonTimer > 0) {
            this.poisonTimer--;
            this.poisonTickTimer++;
            if (this.poisonTickTimer >= 60) { // Her 1sn zehir hasarı
                this.poisonTickTimer = 0;
                const poisonDmg = 2;
                this.hp = Math.max(1, this.hp - poisonDmg);
                game.textParticles.push(new TextParticle(this.x, this.y - 20, `-${poisonDmg} ZEHİR`, '#a020a0', "8px"));
                game.updateUI();
                if (window.SoundEngine && SoundEngine.playPoison) SoundEngine.playPoison();
            }
        } else {
            this.poisonTickTimer = 0;
        }

        if (this.slowTimer > 0) {
            this.slowTimer--;
        }

        // --- HP YENILEME (5sn hasar almadan → her 1.5sn +1 HP) ---
        const hasDebuff = this.burnTimer > 0 || this.poisonTimer > 0;
        if (!hasDebuff && this.hp > 0 && this.hp < this.getMaxHp()) {
            this.regenTimer++;
            if (this.regenTimer >= 300) { // 5sn hasar almadan
                this.regenTickTimer++;
                if (this.regenTickTimer >= 90) { // Her 1.5sn
                    this.regenTickTimer = 0;
                    this.hp = Math.min(this.getMaxHp(), this.hp + 1);
                    game.updateUI();
                }
            }
        } else if (hasDebuff || this.invincibleTimer === 35) {
            this.regenTimer = 0;
            this.regenTickTimer = 0;
        }
        
        // Hızlı hücum yeteneğinin aktiflik durum kontrolü
        if (this.rapidAttackActive) {
            this.rapidAttackTimer--;
            if (this.rapidAttackTimer <= 0) {
                this.rapidAttackActive = false;
                game.addLog("Hızlı Hücum yeteneği sona erdi.", "system");
                game.updateUI();
            }
        }

        // 1. KLAVYE HAREKET KONTROLÜ
        let dx = 0;
        let dy = 0;

        if (keys['w'] || keys['arrowup']) dy = -1;
        if (keys['s'] || keys['arrowdown']) dy = 1;
        if (keys['a'] || keys['arrowleft']) dx = -1;
        if (keys['d'] || keys['arrowright']) dx = 1;

        // Çapraz hareketi normalize et (Çaprazda uçmasın)
        if (dx !== 0 && dy !== 0) {
            dx *= 0.7071;
            dy *= 0.7071;
        }

        // ATILMA (DASH) TETİKLEME KONTROLÜ
        if (keys[' '] && !this.isDashing && this.dashCooldownTimer === 0 && (dx !== 0 || dy !== 0)) {
            this.isDashing = true;
            this.dashTimer = this.dashDuration;
            this.dashCooldownTimer = this.dashCooldown;
            const len = Math.hypot(dx, dy);
            this.dashDirection = { x: dx / len, y: dy / len };
            SoundEngine.playDash();
            game.textParticles.push(new TextParticle(this.x, this.y - 20, "DASH!", "var(--neon-cyan)", "8px"));
            this.invincibleTimer = this.dashDuration + 5; // Dash boyunca hasar almaz
        }

        if (this.isDashing) {
            this.dashTimer--;
            if (this.dashTimer <= 0) {
                this.isDashing = false;
            }

            const dashSpd = this.getTotalSpd() * this.dashSpeedMultiplier;
            const nextX = this.x + this.dashDirection.x * dashSpd;
            const nextY = this.y + this.dashDirection.y * dashSpd;

            if (!World.checkCircleCollision(nextX, this.y, this.radius)) {
                this.x = nextX;
            }
            if (!World.checkCircleCollision(this.x, nextY, this.radius)) {
                this.y = nextY;
            }

            // Dash partikülleri (Neon gölge izi)
            for (let p = 0; p < 2; p++) {
                game.particles.push(new Particle(
                    this.x + (Math.random() - 0.5) * 10,
                    this.y + (Math.random() - 0.5) * 10,
                    'rgba(0, 240, 255, 0.45)', // Neon Cyan
                    -this.dashDirection.x * 2 + (Math.random() - 0.5) * 1,
                    -this.dashDirection.y * 2 + (Math.random() - 0.5) * 1,
                    Math.random() * 5 + 3,
                    15
                ));
            }
        } else {
            // Normal Hareket
            const totalSpd = this.getTotalSpd();
            const nextX = this.x + dx * totalSpd;
            const nextY = this.y + dy * totalSpd;

            this.isMoving = dx !== 0 || dy !== 0;

            if (this.isMoving) {
                if (!World.checkCircleCollision(nextX, this.y, this.radius)) {
                    this.x = nextX;
                }
                if (!World.checkCircleCollision(this.x, nextY, this.radius)) {
                    this.y = nextY;
                }

                if (dx > 0) this.facing = 'right';
                if (dx < 0) this.facing = 'left';

                if (Math.random() < 0.08) {
                    game.particles.push(new Particle(
                        this.x, this.y + 16,
                        'rgba(150, 150, 170, 0.25)', // Toz
                        (Math.random() - 0.5) * 1,
                        -0.2 - Math.random() * 0.5,
                        Math.random() * 4 + 2,
                        15
                    ));
                }
            }
        }

        // Animasyon Zamanlayıcı
        if (this.isMoving) {
            this.animTimer++;
            if (this.animTimer >= 12) {
                this.animFrame = this.animFrame === 1 ? 2 : 1;
                this.animTimer = 0;
            }
        } else {
            this.animFrame = 1;
        }

        // 2. FARE SALDIRI KONTROLÜ
        if (mouse.clicked && this.attackCooldownTimer === 0 && !this.isAttacking) {
            this.performAttack(mouse.x, mouse.y, game);
        }

        // Saldırı animasyon süresi kontrolü (Saldırı 12 kare sürer)
        if (this.isAttacking) {
            this.attackTimer++;
            if (this.attackTimer >= 12) {
                this.isAttacking = false;
                this.attackTimer = 0;
            }
        }

        // 3. EŞYALARI MANYETİK ALANLA ÇEKME MANTIĞI
        // Oyuncu 70 piksel yakınındaki tüm eşyaları kendine çeker
        const magnetRange = 70;
        game.items.forEach(item => {
            const itemDx = this.x - item.x;
            const itemDy = this.y - item.y;
            const dist = Math.hypot(itemDx, itemDy);

            if (dist < magnetRange) {
                // Yaklaştıkça hızı artır
                const pullSpeed = 4.5 + (magnetRange - dist) * 0.1;
                item.magnetizeTowards(this.x, this.y, pullSpeed);

                // Toplama mesafesi: 16 piksel
                if (dist < 18) {
                    this.collectItem(item, game);
                }
            }
        });
    }

    // Fare tıklanan yöne doğru kılıç savur veya ok fırlat
    performAttack(mouseX, mouseY, game) {
        const isBow = this.equipment.weapon && this.equipment.weapon.type.includes('bow');

        // Saldırı açısını hesapla (Oyuncudan fareye doğru)
        const screenX = this.x - World.camera.x;
        const screenY = this.y - World.camera.y;
        this.attackAngle = Math.atan2(mouseY - screenY, mouseX - screenX);

        // Oyuncuyu kılıç salladığı / ok attığı yöne döndür
        this.facing = Math.cos(this.attackAngle) > 0 ? 'right' : 'left';

        if (isBow) {
            // MENZİLLİ SALDIRI (OK ATMA)
            SoundEngine.playSwing(); // Chiptune ok fırlatma sesi

            const damage = Math.floor(this.getTotalAtk() * (this.rapidAttackActive ? 0.7 : 1));
            const rarity = this.equipment.weapon.rarity;

            // Mermiyi fırlat
            game.projectiles.push(new Projectile(this.x, this.y, this.attackAngle, 'arrow', damage, rarity));

            this.isAttacking = true;
            this.attackTimer = 0;
            // Hızlı Hücum yeteneği aktifse cooldown yarıya (12 kare) düşer
            this.attackCooldownTimer = this.rapidAttackActive ? 12 : this.attackCooldown;
            return;
        }

        // YAKIN DÖVÜŞ (KILIÇ SAVURMA)
        this.isAttacking = true;
        this.attackTimer = 0;
        this.attackCooldownTimer = this.rapidAttackActive ? 12 : this.attackCooldown;

        // Kılıç savurma retro sesi
        SoundEngine.playSwing();

        // Saldırı yayı ve canavar çarpışma kontrolü
        // Menzil: 55 piksel, Açı genişliği: ~90 derece (1.6 radyan)
        const attackRange = 55;
        const arcWidth = 1.6;

        game.enemies.forEach(enemy => {
            const edx = enemy.x - this.x;
            const edy = enemy.y - this.y;
            const distance = Math.hypot(edx, edy);

            if (distance < attackRange) {
                // Düşmanın kılıç yayı içinde kalıp kalmadığını kontrol et
                const angleToEnemy = Math.atan2(edy, edx);
                let diff = angleToEnemy - this.attackAngle;
                
                // Açı farkını normalize et (-PI ile PI arası)
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;

                if (Math.abs(diff) < arcWidth / 2) {
                    // Kombo çarpanı: her vuruş %2 hasar ekler
                    const comboDmgMult = 1 + Math.min(this.comboCount, 20) * 0.02;
                    let damage = Math.floor(this.getTotalAtk() * (this.rapidAttackActive ? 0.7 : 1) * comboDmgMult);
                    let isCrit = false;

                    // Silah ağırlık fiziği: ağır silah (sword) knockback 2.5x
                    const wpn = this.equipment && this.equipment.weapon;
                    const isHeavy = wpn && wpn.type && wpn.type.includes('sword');
                    const kbMult = isHeavy ? 2.5 : 1;

                    if (Math.random() * 100 < this.stats.crit) {
                        damage *= 2;
                        isCrit = true;
                        game.triggerScreenShake(8);
                    }

                    // Düşmana hasar ver (knockback çarpanı dahil)
                    enemy.takeDamage(damage, this.attackAngle, game, isCrit ? kbMult * 3 : kbMult);

                    // Kritik sersemletme: 0.7sn (42 kare) stun
                    if (isCrit) {
                        enemy.stunTimer = 42;
                    }

                    // Elemental: oyuncunun zehiri varsa düşman zehirlenir
                    if (this.poisonTimer > 0) {
                        enemy.poisonedTimer = 180;
                    }
                    // Elemental: oyuncunun yanması varsa düşman yanar
                    if (this.burnTimer > 0) {
                        enemy.burnedTimer = 180;
                    }

                    // Kombo artır
                    this.comboCount++;
                    this.comboTimer = 180; // 3 sn içinde tekrar vurulmazsa sıfırlanır
                    // Kombo milestone: 5'in katlarında ekranda göster
                    if (this.comboCount > 0 && this.comboCount % 5 === 0) {
                        game.textParticles.push(new TextParticle(
                            this.x, this.y - 35,
                            `COMBO x${this.comboCount}!`,
                            this.comboCount >= 20 ? '#ff00ff' : this.comboCount >= 10 ? 'var(--neon-gold)' : 'var(--neon-cyan)',
                            "11px", true
                        ));
                    }

                    const fontColor = isCrit ? 'var(--neon-gold)' : '#ffffff';
                    const fontText = isCrit ? `${damage}! CRIT` : `${damage}`;
                    game.textParticles.push(new TextParticle(enemy.x, enemy.y - 15, fontText, fontColor, isCrit ? "12px" : "9px", isCrit));

                    if (isCrit) {
                        game.addLog(`KRİTİK VURUŞ! ${enemy.name}'a ${damage} hasar verdin! (SERSEM)`, "player-hit");
                    } else {
                        game.addLog(`${enemy.name}'a ${damage} hasar verdin.${this.comboCount > 1 ? ` [x${this.comboCount} COMBO]` : ''}`, "player-hit");
                    }
                }
            }
        });
    }

    // Hasar Alma
    takeDamage(amount, game) {
        if (this.invincibleTimer > 0 || this.hp <= 0) return;

        // Gelen hasarı zırhımız azaltır
        const reduction = this.getTotalDef();
        const finalDamage = Math.max(1, amount - reduction);

        this.hp -= finalDamage;
        this.invincibleTimer = 35;
        this.regenTimer = 0;
        this.regenTickTimer = 0;
        this.comboCount = 0;
        this.comboTimer = 0;
        if (game && game.playerHitThisFloor !== undefined) game.playerHitThisFloor = true;

        // Lifesteal: %15 hasarın geri dönüşü
        if (this.hasLifesteal) {
            // (düşmana vurulduğunda iyileşir, bu player.takeDamage değil)
        }

        // Oyuncu hasar sesi
        SoundEngine.playPlayerHurt();
        
        // Kamera sarsıntısı (Premium efekt!)
        game.triggerScreenShake(12);

        // Kırmızı hasar sayısı fırlat
        game.textParticles.push(new TextParticle(
            this.x, this.y - 20,
            `-${finalDamage} HP`,
            'var(--neon-red)',
            "10px",
            true
        ));

        game.addLog(`Zarar gördün: -${finalDamage} Can!`, "death");

        // Ölüm kontrolü
        if (this.hp <= 0) {
            this.hp = 0;
            this.die(game);
        }

        // Arayüz can barını güncelle
        game.updateUI();
    }

    applyDebuff(type, game) {
        if (type === 'burn') {
            if (this.burnTimer === 0) game.addLog("YANIK! Lav Balçığı seni ateşe verdi! 5sn boyunca yanıyorsun.", "death");
            this.burnTimer = 300; // 5sn
            this.regenTimer = 0;
            if (window.SoundEngine && SoundEngine.playBurn) SoundEngine.playBurn();
        } else if (type === 'poison') {
            if (this.poisonTimer === 0) game.addLog("ZEHİR! Karanlık Balçık seni zehirledi! 8sn boyunca zehir etkisi.", "death");
            this.poisonTimer = 480; // 8sn
            this.regenTimer = 0;
            if (window.SoundEngine && SoundEngine.playPoison) SoundEngine.playPoison();
        } else if (type === 'slow') {
            if (this.slowTimer === 0) game.addLog("YAVAŞLAMA! Jöle Balçık seni yavaşlattı! 3sn boyunca.", "system");
            this.slowTimer = 180; // 3sn
            if (window.SoundEngine && SoundEngine.playSlow) SoundEngine.playSlow();
        }
    }

    die(game) {
        SoundEngine.playDeath();
        game.addLog("Elendin! Zindan seni yuttu.", "death");
        game.loseLife();
    }

    // Eşya Toplama Mantığı
    collectItem(item, game) {
        // Eşyayı listeden kaldır
        game.items = game.items.filter(i => i !== item);

        // 1. ALTIN TOPLAMA
        if (item.type === 'gold') {
            this.gold += item.amount;
            SoundEngine.playCoin();
            game.textParticles.push(new TextParticle(
                this.x, this.y - 12,
                `+${item.amount} Altın`,
                'var(--neon-gold)',
                "8px"
            ));
            game.addLog(`${item.amount} Altın para topladın.`, "loot");
        } 
        
        // 2. İKSİR VEYA EKİPMAN TOPLAMA
        else {
            // Yığınlanabilir tüketilebilirler (iksirler) → aynı türde olanı bul, sayacı artır
            const stackableTypes = ['potion_red', 'potion_blue', 'potion_big'];
            if (stackableTypes.includes(item.type)) {
                const existing = this.inventory.find(i => i.type === item.type);
                if (existing) {
                    existing.count = (existing.count || 1) + 1;
                    SoundEngine.playCoin();
                    game.textParticles.push(new TextParticle(
                        this.x, this.y - 15, item.name, 'var(--rarity-rare)', "8px"
                    ));
                    game.addLog(`Bulundu: [${item.name}] ×${existing.count}`, "loot");
                    game.updateUI();
                    return;
                }
            }

            if (this.inventory.length >= this.maxInventorySlots) {
                // Envanter doluysa yere geri düşür (fırlat)
                item.x = this.x;
                item.y = this.y;
                item.bounceCount = 2;
                item.vx = (Math.random() - 0.5) * 4;
                item.vy = -3;
                game.items.push(item);
                game.addLog("Envanteriniz dolu! Eşya toplanamadı.", "system");
                return;
            }

            // Envantere ekle (count:1 başlangıç)
            this.inventory.push({
                id: Math.random().toString(36).substring(2, 9),
                type: item.type,
                name: item.name,
                rarity: item.rarity,
                stats: item.stats,
                description: item.description,
                count: 1
            });

            // Altın sesi veya hafif çınlama sesi
            SoundEngine.playCoin();

            // Uçan metin göster
            let rColor = 'var(--text-primary)';
            if (item.rarity === 'rare') rColor = 'var(--rarity-rare)';
            else if (item.rarity === 'legendary') rColor = 'var(--rarity-legendary)';

            game.textParticles.push(new TextParticle(
                this.x, this.y - 15,
                item.name,
                rColor,
                "8px"
            ));

            game.addLog(`Bulundu: [${item.name}] (${item.rarity.toUpperCase()})`, "loot");
        }

        // Arayüz can barı, altın ve envanteri tazele
        game.updateUI();
    }

    // Tecrübe Puanı Kazanma
    gainXp(amount, game) {
        this.xp += amount;
        
        // Tecrübe sayısı fırlat
        game.textParticles.push(new TextParticle(
            this.x + 15, this.y - 12,
            `+${amount} TP`,
            '#bf5af2', // Mor renk
            "8px"
        ));

        // Seviye Atlama Kontrolü (Level Up)
        if (this.xp >= this.nextLevelXp) {
            this.xp -= this.nextLevelXp;
            this.level++;
            this.nextLevelXp = Math.floor(this.nextLevelXp * 1.5);

            // Seviye Atlama Fanfarı
            SoundEngine.playLevelUp();
            game.addLog(`SEVİYE ATLADIN! Artık Seviye ${this.level} Şövalyesisin!`, "level");

            // Lv5: Silah Uzmanlığı
            if (this.level === 5 && this.specialization === null) {
                if (this.bowKills >= this.swordKills) {
                    this.specialization = 'bow';
                    this.stats.crit += 8;          // Yay uzmanı: +8% kritik
                    this.attackCooldown = Math.max(12, this.attackCooldown - 5); // Hızlı ateş
                    game.addLog("UZMANLIK: YAY UZMANI! Kritik Şansı +8%, Saldırı Hızı arttı!", "level");
                } else {
                    this.specialization = 'sword';
                    this.stats.atk += 5;           // Kılıç uzmanı: +5 hasar
                    this.stats.def += 3;            // +3 defans
                    game.addLog("UZMANLIK: KILIÇ UZMANI! Hasar +5, Defans +3 kalıcı bonus!", "level");
                }
                game.textParticles.push(new TextParticle(this.x, this.y - 35, "UZMANLIK!", "var(--neon-gold)", "11px", true));
            }

            // Seviye atlama parçacık şöleni (Altın parçacıklar!)
            for (let p = 0; p < 25; p++) {
                game.particles.push(new Particle(
                    this.x, this.y,
                    'var(--neon-gold)',
                    (Math.random() - 0.5) * 8,
                    -4 - Math.random() * 5,
                    Math.random() * 5 + 3,
                    50 + Math.random() * 20,
                    0.15 // Hafif yerçekimi süzülmesi
                ));
            }

            // Arayüzü güncelle ve geliştirme popup ekranını göster!
            game.updateUI();
            game.showUpgradeScreen();
        } else {
            game.updateUI();
        }
    }

    // Envanterden Eşya Kuşanma veya İksir Kullanma
    useItem(itemIndex, game) {
        const item = this.inventory[itemIndex];
        if (!item) return;

        // Quest: iksir kullanım takibi
        const isPotion = ['potion_red','potion_blue','potion_big'].includes(item.type);
        if (isPotion && game._checkQuestProgress) game._checkQuestProgress('potion_used', null);

        // 1. SAĞLIK İKSİRİ KULLANILDI
        if (item.type === 'potion_red') {
            if (this.hp >= this.getMaxHp()) {
                game.addLog("Canınız zaten tamamen dolu!", "system");
                return;
            }
            this.hp = Math.min(this.getMaxHp(), this.hp + 30);
            SoundEngine.playChestOpen();
            game.addLog("Sağlık iksiri kullanıldı: +30 Sağlık.", "loot");

            game.textParticles.push(new TextParticle(
                this.x, this.y - 20, `+30 HP`, 'var(--neon-green)', "10px", false
            ));

            if ((item.count || 1) > 1) { item.count--; } else { this.inventory.splice(itemIndex, 1); }
        }
        
        // 1b. BÜYÜK SAĞLIK İKSİRİ
        else if (item.type === 'potion_big') {
            if (this.hp >= this.getMaxHp()) {
                game.addLog("Canınız zaten tamamen dolu!", "system");
                return;
            }
            this.hp = Math.min(this.getMaxHp(), this.hp + 70);
            SoundEngine.playChestOpen();
            game.addLog("Büyük sağlık iksiri kullanıldı: +70 Sağlık!", "loot");
            game.textParticles.push(new TextParticle(this.x, this.y - 20, `+70 HP`, 'var(--neon-green)', "11px", true));
            if ((item.count || 1) > 1) { item.count--; } else { this.inventory.splice(itemIndex, 1); }
        }

        // 2. HIZ İKSİRİ KULLANILDI
        else if (item.type === 'potion_blue') {
            this.speedBuffTimer = 600; // 600 kare = 10 saniye (60fps)
            SoundEngine.playChestOpen();
            game.addLog("Hız iksiri kullanıldı! 10 saniye boyunca +35% Hareket Hızı.", "loot");

            // Mavi pot yıldızları
            for (let p = 0; p < 12; p++) {
                game.particles.push(new Particle(
                    this.x, this.y,
                    'var(--neon-cyan)',
                    (Math.random() - 0.5) * 4,
                    (Math.random() - 0.5) * 4,
                    Math.random() * 3 + 2,
                    25
                ));
            }

            if ((item.count || 1) > 1) { item.count--; } else { this.inventory.splice(itemIndex, 1); }
        }

        // 3. GENEL EKİPMAN KUŞANMA SİSTEMİ (8 Slot)
        else {
            let slot = null;
            if (item.type.startsWith('sword_') || item.type.startsWith('bow_') ||
                item.type.startsWith('dagger_') || item.type.startsWith('staff_')) {
                slot = 'weapon';
            } else if (item.type.startsWith('armor_') || item.type.startsWith('shield_')) {
                slot = 'armor';
            } else if (item.type.startsWith('helmet_')) {
                slot = 'helmet';
            } else if (item.type.startsWith('necklace_')) {
                slot = 'necklace';
            } else if (item.type.startsWith('earrings_')) {
                slot = 'earrings';
            } else if (item.type.startsWith('ring_')) {
                slot = 'ring';
            } else if (item.type.startsWith('gloves_')) {
                slot = 'gloves';
            } else if (item.type.startsWith('boots_')) {
                slot = 'boots';
            }

            if (slot) {
                const oldItem = this.equipment[slot];
                this.equipment[slot] = item;

                const newMaxHp = this.getMaxHp();

                if (oldItem) {
                    this.inventory[itemIndex] = oldItem;
                } else {
                    this.inventory.splice(itemIndex, 1);
                }

                // Eğer can yeni maksimumu aşıyorsa sınırla
                if (this.hp > newMaxHp) {
                    this.hp = newMaxHp;
                }

                if (window.SpriteEngine) {
                    window.SpriteEngine.updatePlayerSprites(this.equipment);
                }

                SoundEngine.playChestOpen();
                game.addLog(`[${item.name}] kuşandın! RPG niteliklerin güncellendi.`, "loot");
            }
        }

        // Arayüz güncelle
        game.updateUI();
    }

    useSkillQ(game) {
        if (this.hp <= 0 || game.state !== 'playing') return;
        if (this.qCooldown > 0) {
            game.addLog("Hızlı Hücum henüz hazır değil!", "system");
            return;
        }

        this.rapidAttackActive = true;
        this.rapidAttackTimer = 300; // 5 saniye (60fps'te 300 kare)
        this.qCooldown = this.qMaxCooldown; // 12 saniye cooldown

        SoundEngine.playDash();

        // Q DASH-SALDIRI: etkinleşince yolundaki tüm düşmanlara hasar ver
        const dashAtk = Math.floor(this.getTotalAtk() * 1.5);
        const dashAngle = this.attackAngle || 0;
        game.enemies.forEach(enemy => {
            if (enemy instanceof Boss) return; // Boss bu etkiye muaf
            const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
            const ang = Math.atan2(enemy.y - this.y, enemy.x - this.x);
            const angDiff = Math.abs(ang - dashAngle);
            // Önündeki 160px mesafedeki, 90° açı içindeki düşmanlara vur
            if (dist < 160 && angDiff < Math.PI / 2) {
                enemy.takeDamage(dashAtk, dashAngle, game);
                // Kesik izi partikülü
                for (let p = 0; p < 5; p++) {
                    game.particles.push(new Particle(
                        enemy.x + (Math.random()-0.5)*20, enemy.y + (Math.random()-0.5)*20,
                        'var(--neon-gold)', (Math.random()-0.5)*4, (Math.random()-0.5)*4,
                        Math.random()*4+2, 20
                    ));
                }
            }
        });

        game.textParticles.push(new TextParticle(this.x, this.y - 20, "HIZLI HÜCUM!", "var(--neon-gold)", "11px", true));
        game.addLog("AKTİF YETENEK (Q): Hızlı Hücum + Dash Saldırı! 5sn Saldırı Hızı +100%, Hasar -30%.", "loot");
        
        // Işık saçan neon partiküller
        for (let p = 0; p < 15; p++) {
            game.particles.push(new Particle(
                this.x + (Math.random() - 0.5) * 20,
                this.y + (Math.random() - 0.5) * 20,
                'var(--neon-gold)',
                (Math.random() - 0.5) * 4,
                -2 - Math.random() * 3,
                Math.random() * 4 + 2,
                30
            ));
        }

        game.updateUI();
    }

    useSkillW(game) {
        if (this.hp <= 0 || game.state !== 'playing') return;
        if (this.wCooldown > 0) {
            game.addLog("Silah Yağmuru henüz hazır değil!", "system");
            return;
        }

        // En yakın 3 canavarı seç veya oyuncunun etrafına rastgele düşür
        let targets = [];
        if (game.enemies.length > 0) {
            const sortedEnemies = [...game.enemies].sort((a, b) => {
                return Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y);
            });
            for (let i = 0; i < Math.min(3, sortedEnemies.length); i++) {
                targets.push({ x: sortedEnemies[i].x, y: sortedEnemies[i].y });
            }
        }
        
        // Eğer 3 canavar yoksa, oyuncunun çevresine rastgele koordinatlar belirle
        while (targets.length < 3) {
            targets.push({
                x: this.x + (Math.random() - 0.5) * 160,
                y: this.y + (Math.random() - 0.5) * 160
            });
        }

        this.wCooldown = this.wMaxCooldown; // 15 saniye cooldown
        
        const isBow = this.equipment.weapon && this.equipment.weapon.type.includes('bow');
        const weaponType = isBow ? 'arrow' : 'sword';

        // Epic boss kükremesi benzeri büyü efekti sesi ver
        SoundEngine.playBossRoar(); 

        game.textParticles.push(new TextParticle(
            this.x, this.y - 20,
            "SİLAH YAĞMURU!",
            isBow ? "var(--neon-gold)" : "var(--neon-cyan)",
            "11px",
            true
        ));

        game.addLog(`AKTİF YETENEK (W): Silah Yağmuru tetiklendi! Göklerden 3 adet spektral ${isBow ? 'Alev Oku' : 'Kraliyet Kılıcı'} yağıyor!`, "loot");

        // Spektral mermileri 200ms aralıklarla gökten fırlat (Ardışık görsel şölen!)
        targets.forEach((target, index) => {
            setTimeout(() => {
                if (game.state !== 'playing') return;
                const startX = target.x;
                const startY = target.y - 350; // Yukarıdan aşağıya düşüş
                const damage = Math.floor(this.getTotalAtk() * 1.6);
                game.projectiles.push(new WeaponRainProjectile(startX, startY, target.x, target.y, damage, weaponType));
            }, index * 200);
        });

        game.updateUI();
    }

    draw(ctx, camera) {
        const drawX = this.x - camera.x - this.width/2;
        const drawY = this.y - camera.y - this.height/2;

        ctx.save();

        // Hasar alındığında şövalyeyi kırmızı yanıp söndür (Dokunulmazlık karesi)
        if (this.invincibleTimer > 0) {
            if (Math.floor(this.invincibleTimer / 4) % 2 === 0) {
                ctx.globalAlpha = 0.4;
                ctx.filter = 'brightness(1.5) sepia(1) hue-rotate(-50deg) saturate(5)';
            }
        }

        // 1. Şövalye Sprite'ını Çiz
        let spriteKey = this.isMoving ? `player_walk${this.animFrame}` : `player_idle${this.animFrame}`;
        if (this.isAttacking) {
            spriteKey = 'player_attack';
        }
        if (this.facing === 'left') {
            spriteKey += '_flipped';
        }

        SpriteEngine.draw(ctx, spriteKey, drawX, drawY, this.width, this.height);
        ctx.restore();

        // --- DİNAMİK SİLAH ÇİZİMİ (KILIÇ SAVURMA VE OK FIRLATMA EFEKTİ) ---
        const weapon = this.equipment.weapon;
        if (weapon) {
            ctx.save();
            const playerCenterX = this.x - camera.x;
            const playerCenterY = this.y - camera.y;
            ctx.translate(playerCenterX, playerCenterY);

            const isBow = weapon.type.includes('bow');
            
            if (this.isAttacking) {
                if (isBow) {
                    // Yayı mouse açısına doğru çevir
                    ctx.rotate(this.attackAngle);
                    const bowSprite = `item_bow_${weapon.rarity}`;
                    SpriteEngine.draw(ctx, bowSprite, 4, -16, 32, 32);
                    
                    // Yay gerilme oku çizimi (attackTimer 0-12 arası)
                    if (this.attackTimer < 8) {
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(8 - this.attackTimer, -1, 10, 2);
                    }
                } else {
                    // Kılıç savurma açısı (savrulma yayı ile tam senkronize!)
                    const progress = this.attackTimer / 12;
                    const sweepAngle = this.attackAngle - 0.9 + progress * 1.8;
                    ctx.rotate(sweepAngle);
                    
                    const swordSprite = `item_sword_${weapon.rarity}`;
                    ctx.rotate(Math.PI / 4); // Çapraz kılıç sprite'ını düzleştir
                    SpriteEngine.draw(ctx, swordSprite, -8, -32, 32, 32);
                }
            } else {
                // Silahı sırta veya kılıfına tak
                const flip = this.facing === 'left' ? -1 : 1;
                ctx.scale(flip, 1);
                
                if (isBow) {
                    const bowSprite = `item_bow_${weapon.rarity}`;
                    ctx.globalAlpha = 0.75;
                    SpriteEngine.draw(ctx, bowSprite, -22, -18, 28, 28);
                } else {
                    const swordSprite = `item_sword_${weapon.rarity}`;
                    ctx.globalAlpha = 0.75;
                    ctx.rotate(-Math.PI / 3);
                    SpriteEngine.draw(ctx, swordSprite, -16, -18, 28, 28);
                }
            }
            ctx.restore();
        }

        // 2. Kılıç Savurma Kesme İzi Efekti (Slash Arc - Görsel Savaş Kalitesi!)
        if (this.isAttacking) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            
            // Nadirlik derecesine göre kılıç izi rengini değiştir! (Muhteşem bir detay!)
            let slashColor = 'rgba(0, 240, 255, 0.65)'; // Rare: Mavi
            if (this.equipment.weapon && this.equipment.weapon.rarity === 'legendary') {
                slashColor = 'rgba(255, 140, 0, 0.75)'; // Legendary: Turuncu Alev
            } else if (this.equipment.weapon && this.equipment.weapon.rarity === 'common') {
                slashColor = 'rgba(220, 220, 220, 0.6)'; // Common: Beyaz/Gri
            }

            ctx.strokeStyle = slashColor;
            ctx.shadowBlur = 12;
            ctx.shadowColor = slashColor;
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            
            ctx.beginPath();
            
            // Kılıcın savrulma açısını zamanlayıcıyla çizdir (yayın büyümesi)
            const progress = this.attackTimer / 12; // 0 ile 1 arası
            const startAngle = this.attackAngle - 0.9 + progress * 0.4;
            const endAngle = this.attackAngle + 0.9 - (1 - progress) * 0.4;

            ctx.arc(this.x - camera.x, this.y - camera.y, 40, startAngle, endAngle);
            ctx.stroke();
            ctx.restore();
        }

        // 3. Mini Hız Potu Parıltısı (Eğer hız potu aktifse ayağında parıltılar)
        if (this.speedBuffTimer > 0) {
            ctx.save();
            ctx.fillStyle = 'var(--neon-cyan)';
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(this.x - camera.x + (Math.random() - 0.5) * 20, this.y - camera.y + 18, Math.random() * 3 + 1, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}

// --- 7b. KUTSAL SÜTUN (SHRINE) ---
class Shrine {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 48;
        this.activated = false;
        this.interactRange = 44;
        this.glowTimer = 0;
        const types = ['atk', 'spd', 'regen'];
        this.type = types[Math.floor(Math.random() * types.length)];
    }

    activate(player, game) {
        if (this.activated) return;
        this.activated = true;
        SoundEngine.playChestOpen();
        if (this.type === 'atk') {
            player.shrineAtkTimer = 1800;
            game.addLog("🔱 Kutsal Sütun: +%50 Hasar bonusu 30sn!", "loot");
            game.textParticles.push(new TextParticle(this.x, this.y - 20, "+%50 HASAR!", "#ff8c00", "9px", true));
        } else if (this.type === 'spd') {
            player.shrineSpdTimer = 1800;
            game.addLog("🔱 Kutsal Sütun: +0.5 Hız bonusu 30sn!", "loot");
            game.textParticles.push(new TextParticle(this.x, this.y - 20, "+0.5 HIZ!", "#00f0ff", "9px", true));
        } else {
            player.shrineRegenTimer = 1800;
            game.addLog("🔱 Kutsal Sütun: Saniyede +2 HP yenileme 30sn!", "loot");
            game.textParticles.push(new TextParticle(this.x, this.y - 20, "+2 HP/SN!", "#39ff14", "9px", true));
        }
    }

    draw(ctx, camera) {
        const drawX = this.x - camera.x - this.width / 2;
        const drawY = this.y - camera.y - this.height;
        this.glowTimer++;
        const glow = Math.sin(this.glowTimer / 20) * 0.3 + 0.7;
        const colors = { atk: '#ff4500', spd: '#00f0ff', regen: '#39ff14' };
        const col = colors[this.type] || '#ffffff';
        ctx.save();
        ctx.globalAlpha = glow;
        // Sütun gövdesi
        ctx.fillStyle = this.activated ? '#333' : col;
        ctx.fillRect(drawX + 8, drawY, 16, this.height);
        // Tepe kristali
        if (!this.activated) {
            ctx.shadowColor = col; ctx.shadowBlur = 12;
            ctx.fillStyle = col;
            ctx.fillRect(drawX + 10, drawY - 8, 12, 12);
        }
        ctx.restore();
        // E tuşu ipucu
        if (!this.activated) {
            ctx.save();
            ctx.font = "6px 'Press Start 2P'";
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.fillText('[E]', this.x - camera.x, this.y - camera.y - this.height - 6);
            ctx.restore();
        }
    }
}

// --- 7. GİZEMLİ SATICI (MERCHANT NPC) ---
class Merchant {
    constructor(x, y, isSpecial = false) {
        this.x = x;
        this.y = y;
        this.isSpecial = isSpecial;
        this.width = 48;
        this.height = 48;
        this.radius = 16;
        this.facing = 'right';
        this.animTimer = 0;
        this.animFrame = 1;
        this.interactionRadius = 48;
        this.isPlayerNear = false;
    }

    update(player, game) {
        // Animasyon döngüsü
        this.animTimer++;
        if (this.animTimer >= 22) {
            this.animFrame = this.animFrame === 1 ? 2 : 1;
            this.animTimer = 0;
        }

        // Oyuncuyla arasındaki mesafeyi ölç
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.hypot(dx, dy);

        this.facing = dx > 0 ? 'right' : 'left';

        // Oyuncu yakındaysa etkileşim uyarısını yak
        if (dist < this.interactionRadius) {
            if (!this.isPlayerNear) {
                this.isPlayerNear = true;
                if (this.isSpecial) {
                    game.addLog(`ÖZEL SATICI: "5. Katın katlarına ulaştın kahraman! Sana en nadir ve efsanevi mallarımı getirdim... [E Tuşu]"`, "level");
                } else {
                    game.addLog(`Gizemli Satıcı: "Sıcak altın kokusunu uzaklardan aldım... Malzemelerime bir bak şövalye! [E Tuşu]"`, "loot");
                }
            }
        } else {
            this.isPlayerNear = false;
        }
    }

    draw(ctx, camera) {
        const drawX = this.x - camera.x - this.width/2;
        const drawY = this.y - camera.y - this.height/2;

        ctx.save();
        // Altında parıltı (Özel ise neon altın/turuncu, normal ise mor büyü halesi)
        const grad = ctx.createRadialGradient(drawX + this.width/2, drawY + this.height/2, 2, drawX + this.width/2, drawY + this.height/2, 20);
        if (this.isSpecial) {
            grad.addColorStop(0, `rgba(255, 140, 0, ${0.35 + Math.sin(Date.now() / 150) * 0.1})`);
        } else {
            grad.addColorStop(0, 'rgba(176, 38, 255, 0.25)');
        }
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(drawX + this.width/2, drawY + this.height/2, 20, 0, Math.PI * 2);
        ctx.fill();

        let spriteKey = `merchant_idle${this.animFrame}`;
        if (this.facing === 'left') spriteKey += '_flipped';

        SpriteEngine.draw(ctx, spriteKey, drawX, drawY, this.width, this.height);
        ctx.restore();

        // Eğer oyuncu yakındaysa başının üzerinde "[E] DÜKKAN" yazısı göster
        if (this.isPlayerNear) {
            ctx.save();
            ctx.font = "8px 'Press Start 2P'";
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.strokeText("[E] DÜKKAN", drawX + this.width/2 - 28, drawY - 12);
            ctx.fillStyle = this.isSpecial ? 'var(--neon-gold)' : 'var(--neon-cyan)';
            ctx.fillText("[E] DÜKKAN", drawX + this.width/2 - 28, drawY - 12);
            ctx.restore();
        }
    }
}

// --- 8. ZİNDAN MUHAFIZI (BOSS ENEMY) ---
class Boss {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 96; // Devasa boyut!
        this.height = 96;
        this.radius = 32; // Büyük çarpışma dairesi
        
        // Zorluk seviyesi ölçekleme çarpanı
        const floorMultiplier = 1.0 + (window.GameEngine ? window.GameEngine.floor - 1 : 0) * 0.15;

        this.name = "ZİNDAN MUHAFIZI";
        // Temel statlar (Faz 1 değerleri) — kattaki zorlukla ölçeklenir
        this.baseAtk   = Math.floor(20 * floorMultiplier);
        this.baseSpeed = 0.75;
        this.baseSlamCooldown = 180; // 3sn

        this.hp    = Math.floor(500 * floorMultiplier); // Daha uzun savaş
        this.maxHp = this.hp;
        this.atk   = this.baseAtk;
        this.speed = this.baseSpeed;
        this.xpReward = Math.floor(200 * floorMultiplier);

        this.animTimer = 0;
        this.animFrame = 1;
        this.facing = 'right';
        this.hitFlashTimer = 0;
        this.knockbackVx = 0;
        this.knockbackVy = 0;

        // Saldırı zamanlayıcıları
        this.attackCooldown      = this.baseSlamCooldown;
        this.attackCooldownTimer = 120; // Kısa başlangıç gecikmesi

        // Faz sistemi — her eşikte bir kez tetiklenir
        this.phase = 1;
        this.phaseTriggered = { 2: false, 3: false, 4: false };

        // Minyon çağırma (faz 2 ve 3'te)
        this.spawnedPhase2 = false;
        this.spawnedPhase3 = false;

        // Slam dalgası
        this.slamActive = false;
        this.slamX = 0;
        this.slamY = 0;
        this.slamRadius = 0;

        // Melee temas cooldown
        this.meleeCooldownTimer = 0;
        this.meleeCooldownMax   = 90; // 1.5sn
    }

    update(player, game) {
        // Geri savrulma (Boss çok hafif kayar)
        if (Math.abs(this.knockbackVx) > 0.1 || Math.abs(this.knockbackVy) > 0.1) {
            const nextX = this.x + this.knockbackVx * 0.12;
            const nextY = this.y + this.knockbackVy * 0.12;
            if (World.isWalkable(nextX, this.y)) this.x = nextX;
            if (World.isWalkable(this.x, nextY)) this.y = nextY;
            this.knockbackVx *= 0.82;
            this.knockbackVy *= 0.82;
        }

        if (this.hitFlashTimer > 0) this.hitFlashTimer--;
        if (this.attackCooldownTimer > 0) this.attackCooldownTimer--;
        if (this.meleeCooldownTimer > 0) this.meleeCooldownTimer--;

        // Animasyon
        this.animTimer++;
        if (this.animTimer >= 18) {
            this.animFrame = this.animFrame === 1 ? 2 : 1;
            this.animTimer = 0;
        }

        const hpRatio = this.hp / this.maxHp;

        // ═══════════════════════════════════════════════
        // FAZ SİSTEMİ — Kademeli Güçlenme
        // ═══════════════════════════════════════════════

        // FAZ 2: Can %75 altına düştüğünde (1. güçlenme)
        if (hpRatio <= 0.75 && !this.phaseTriggered[2]) {
            this.phaseTriggered[2] = true;
            this.phase = 2;
            this.atk   = Math.floor(this.baseAtk * 1.25);
            this.speed = this.baseSpeed + 0.25;
            this.attackCooldown = Math.floor(this.baseSlamCooldown * 0.80);
            game.addLog("⚡ FAZ 2 — Muhafız'ın zırhı kızarmaya başladı! Saldırılar güçlendi!", "death");
            SoundEngine.playBossRoar();
            game.triggerScreenShake(10);
            this._spawnPhaseMinions(game, 2);
        }

        // FAZ 3: Can %50 altına düştüğünde (2. güçlenme)
        if (hpRatio <= 0.50 && !this.phaseTriggered[3]) {
            this.phaseTriggered[3] = true;
            this.phase = 3;
            this.atk   = Math.floor(this.baseAtk * 1.55);
            this.speed = this.baseSpeed + 0.55;
            this.attackCooldown = Math.floor(this.baseSlamCooldown * 0.60);
            game.addLog("💀 FAZ 3 — Muhafız yarı yıkık! Gözleri kan kırmızısı alevlerle yandı!", "death");
            SoundEngine.playBossRoar();
            game.triggerScreenShake(16);
            this._spawnPhaseMinions(game, 3);
        }

        // FAZ 4: Can %25 altına düştüğünde (3. güçlenme — son form)
        if (hpRatio <= 0.25 && !this.phaseTriggered[4]) {
            this.phaseTriggered[4] = true;
            this.phase = 4;
            this.atk   = Math.floor(this.baseAtk * 2.0);
            this.speed = this.baseSpeed + 0.90;
            this.attackCooldown = Math.floor(this.baseSlamCooldown * 0.40);
            game.addLog("🔥 FAZ 4 — SON FORM! Muhafız çılgına döndü! Tüm gücüyle saldırıyor!", "death");
            SoundEngine.playBossRoar();
            game.triggerScreenShake(22);
            this._spawnPhaseMinions(game, 4);
        }

        // Şok dalgası fiziği
        if (this.slamActive) {
            this.slamRadius += 7;
            if (this.slamRadius >= 150) this.slamActive = false;

            const pDist = Math.hypot(player.x - this.slamX, player.y - this.slamY);
            if (pDist < this.slamRadius && pDist > this.slamRadius - 18) {
                if (player.invincibleTimer === 0) {
                    const ang = Math.atan2(player.y - this.y, player.x - this.x);
                    const slamDmg = 10 + (this.phase - 1) * 6;
                    player.takeDamage(slamDmg, game);
                    // Duvar kontrolü ile geri savurma — duvara gömülmeyi önler
                    const kbDist = 18;
                    const kbX = Math.cos(ang) * kbDist;
                    const kbY = Math.sin(ang) * kbDist;
                    if (!World.checkCircleCollision(player.x + kbX, player.y, player.radius)) {
                        player.x += kbX;
                    } else {
                        for (let s = kbDist - 4; s >= 0; s -= 4) {
                            const nx = player.x + Math.cos(ang) * s;
                            if (!World.checkCircleCollision(nx, player.y, player.radius)) { player.x = nx; break; }
                        }
                    }
                    if (!World.checkCircleCollision(player.x, player.y + kbY, player.radius)) {
                        player.y += kbY;
                    } else {
                        for (let s = kbDist - 4; s >= 0; s -= 4) {
                            const ny = player.y + Math.sin(ang) * s;
                            if (!World.checkCircleCollision(player.x, ny, player.radius)) { player.y = ny; break; }
                        }
                    }
                }
            }
        }

        // Oyuncu ile mesafe
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.hypot(dx, dy);

        if (player.hp > 0) {
            // Slam: yakında ve cooldown bittiyse
            if (this.attackCooldownTimer === 0 && distance < 160) {
                this.performSlam(player, game);
                return;
            }

            // Kovalama hareketi
            const angle = Math.atan2(dy, dx);
            const vx = Math.cos(angle) * this.speed;
            const vy = Math.sin(angle) * this.speed;

            this.facing = vx > 0 ? 'right' : 'left';

            const nextX = this.x + vx;
            const nextY = this.y + vy;
            const bR = 20; // Hareket için gerçekçi çarpışma yarıçapı
            const canX = !World.checkCircleCollision(nextX, this.y, bR);
            const canY = !World.checkCircleCollision(this.x, nextY, bR);
            if (canX) this.x = nextX;
            if (canY) this.y = nextY;
            // Köşe sıkışma önleme: her iki yön bloklu ise yanal kaydırma dene
            if (!canX && !canY) {
                const perp = angle + Math.PI / 2;
                if (!World.checkCircleCollision(this.x + Math.cos(perp) * this.speed, this.y, bR))
                    this.x += Math.cos(perp) * this.speed;
                if (!World.checkCircleCollision(this.x, this.y + Math.sin(perp) * this.speed, bR))
                    this.y += Math.sin(perp) * this.speed;
            }

            // Doğrudan temas hasarı (cooldown'lu)
            if (distance < 40 && this.meleeCooldownTimer === 0) {
                player.takeDamage(this.atk, game);
                this.meleeCooldownTimer = this.meleeCooldownMax;
            }
        }
    }

    // Faz geçişinde minyon çağır
    _spawnPhaseMinions(game, phase) {
        const counts = { 2: 2, 3: 3, 4: 4 };
        const count = counts[phase] || 2;
        game.addLog(`ZİNDAN MUHAFIZI: 'Hizmetçilerim gelsin!' Faz ${phase} minyonları çağrılıyor!`, "death");

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const dist  = 110 + Math.random() * 40;
            const sx = this.x + Math.cos(angle) * dist;
            const sy = this.y + Math.sin(angle) * dist;
            if (!World.isWalkable(sx, sy)) continue;

            const types = ['slime_fire', 'slime_shadow', 'skeleton'];
            const minyonType = types[Math.floor(Math.random() * types.length)];
            const minyon = new Enemy(sx, sy, minyonType);
            minyon.name = `Faz${phase} Minyonu`;
            // Faza göre güçlü minyon
            const boost = 1.0 + (phase - 1) * 0.3;
            minyon.maxHp = Math.floor(minyon.maxHp * boost);
            minyon.hp    = minyon.maxHp;
            minyon.atk   = Math.floor(minyon.atk * boost);
            minyon.speed = minyon.speed * boost;
            game.enemies.push(minyon);

            for (let p = 0; p < 8; p++) {
                game.particles.push(new Particle(
                    sx, sy, '#b026ff',
                    (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5,
                    Math.random() * 3 + 2, 20
                ));
            }
        }
    }

    // Özel Saldırı: Yere Vurma Şok Dalgası (Faz'a göre güçlenir)
    performSlam(player, game) {
        this.attackCooldownTimer = this.attackCooldown;
        this.slamActive = true;
        this.slamRadius = 10;
        this.slamX = this.x;
        this.slamY = this.y;

        // Faz'a göre daha güçlü sarsıntı ve mesaj
        const shakeAmt = 16 + (this.phase - 1) * 6;
        game.triggerScreenShake(shakeAmt);
        SoundEngine.playBossSlap();

        const phaseMsg = this.phase >= 3 ? "🔥 ULTRA SLAM!" : "ZİNDAN MUHAFIZI yere vurdu!";
        game.addLog(`${phaseMsg} Şok dalgaları yayılıyor! (Faz ${this.phase})`, "death");

        // Faz'a göre renk ve sayı artar
        const colors = ['#ff453a', '#ff8c00', '#ff0000', '#ff00ff'];
        const color  = colors[Math.min(this.phase - 1, 3)];
        const pCount = 20 + (this.phase - 1) * 8; // Faz1=20, Faz4=44 partikül

        for (let p = 0; p < pCount; p++) {
            const angle = (p / pCount) * Math.PI * 2;
            const spd = 3 + Math.random() * 3 + (this.phase - 1);
            game.particles.push(new Particle(
                this.x, this.y, color,
                Math.cos(angle) * spd,
                Math.sin(angle) * spd,
                Math.random() * 4 + 3,
                45
            ));
        }

        // Faz 4: Double Slam (2. dalgayı 400ms sonra fırlat)
        if (this.phase >= 4) {
            setTimeout(() => {
                if (!game || game.state !== 'playing') return;
                this.slamActive = true;
                this.slamRadius = 10;
                this.slamX = this.x;
                this.slamY = this.y;
                SoundEngine.playBossSlap();
            }, 400);
        }
    }

    // Minyon (Slime) Çağırma yeteneği
    spawnMinions(game) {
        game.addLog("ZİNDAN MUHAFIZI: 'Uyanın kölelerim!' Minyonlar çağrılıyor!", "death");
        SoundEngine.playBossRoar();

        // 3 adet küçük ateş/karanlık balçığı arena etrafında spawn et
        const offsets = [
            { x: -100, y: -100 },
            { x: 100, y: -100 },
            { x: 0, y: 120 }
        ];

        offsets.forEach(offset => {
            const sx = this.x + offset.x;
            const sy = this.y + offset.y;
            if (World.isWalkable(sx, sy)) {
                // Minyonları zindan katına ekle
                const minyonType = Math.random() < 0.5 ? 'slime_fire' : 'slime_shadow';
                const minyon = new Enemy(sx, sy, minyonType);
                minyon.name = "Muhafız Minyonu";
                minyon.maxHp = 20;
                minyon.hp = 20;
                minyon.speed = 1.1;
                game.enemies.push(minyon);
                
                // Spawn parçacıkları
                for (let p = 0; p < 8; p++) {
                    game.particles.push(new Particle(
                        sx, sy,
                        '#b026ff',
                        (Math.random() - 0.5) * 4,
                        (Math.random() - 0.5) * 4,
                        Math.random() * 3 + 2,
                        20
                    ));
                }
            }
        });
    }

    takeDamage(amount, knockbackAngle, game) {
        this.hp -= amount;
        this.hitFlashTimer = 10;

        // Knockback (Boss olduğu için çok hafif geriye gider)
        const force = 1.5;
        this.knockbackVx = Math.cos(knockbackAngle) * force;
        this.knockbackVy = Math.sin(knockbackAngle) * force;

        SoundEngine.playHit();
        game.triggerScreenShake(6);

        // Koyu kırmızı ve kemik beyazı kan/kemik partikülleri fışkırt
        for (let p = 0; p < 15; p++) {
            game.particles.push(new Particle(
                this.x, this.y,
                Math.random() < 0.5 ? '#ffffff' : '#ffd700',
                (Math.random() - 0.5) * 6,
                (Math.random() - 0.5) * 6,
                Math.random() * 4 + 2,
                20
            ));
        }

        // Ölüm Kontrolü
        if (this.hp <= 0) {
            this.hp = 0;
            this.die(game);
        }
    }

    die(game) {
        // Canavarlardan sil
        game.enemies = game.enemies.filter(e => e !== this);
        game.addLog("KUTSAL ZAFER! Zindan Muhafızı devrildi!", "level");
        
        // Müzik durdur ve seviye atlama sesi
        SoundEngine.playLevelUp();
        
        // Zindan kapılarını aç (portal etkinleşsin)
        World.portal.active = true;
        game.addLog("Çıkış portalı mor alevlerle parıldamaya başladı! Next Level'a geçebilirsiniz.", "loot");

        // Yere devasa ganimet saç (1 Chest, 3-5 Gold Piles, 1 Legendary Sword or Armor!)
        const chest = new Chest(this.x, this.y);
        game.chests.push(chest);
        
        // 5 adet altın torbası fırlat
        for (let g = 0; g < 5; g++) {
            game.items.push(new Item(this.x, this.y, 'gold', Math.floor(Math.random() * 15) + 15));
        }

        // Garanti 1 Efsanevi (Legendary) Eşya fırlat!
        const isSword = Math.random() < 0.5;
        const legendaryItem = new Item(this.x, this.y, isSword ? 'sword_legendary' : 'armor_legendary');
        game.items.push(legendaryItem);

        // Şanlı ölüm patlaması
        for (let p = 0; p < 45; p++) {
            game.particles.push(new Particle(
                this.x, this.y,
                '#ffd700',
                (Math.random() - 0.5) * 12,
                (Math.random() - 0.5) * 12,
                Math.random() * 6 + 3,
                50,
                0.05
            ));
        }
    }

    draw(ctx, camera) {
        const drawX = this.x - camera.x - this.width/2;
        const drawY = this.y - camera.y - this.height/2;

        ctx.save();

        if (this.hitFlashTimer > 0) {
            ctx.filter = 'brightness(1.5) sepia(1) hue-rotate(-50deg) saturate(5)';
        }

        // Büyük Skeleton Sprite'ını Çiz
        let spriteKey = `skeleton_idle${this.animFrame}`;
        if (this.facing === 'left') spriteKey += '_flipped';

        SpriteEngine.draw(ctx, spriteKey, drawX, drawY, this.width, this.height);
        ctx.restore();

        // Başına altın taç (boss_crown) çiz! (Muazzam bir görsel detay!)
        const crownW = 32;
        const crownH = 32;
        const crownX = this.x - camera.x - crownW / 2;
        const crownY = this.y - camera.y - this.height / 2 - 4 + Math.sin(Date.now() / 150) * 3; // Havada hafifçe süzülür!
        SpriteEngine.draw(ctx, 'boss_crown', crownX, crownY, crownW, crownH);

        // Eğer yere vurma şok dalgası aktifse çiz (Şık alev halkası efekti!)
        if (this.slamActive) {
            ctx.save();
            ctx.strokeStyle = `rgba(255, 69, 58, ${1 - this.slamRadius / 130})`;
            ctx.lineWidth = 4;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ff453a';
            ctx.beginPath();
            ctx.arc(this.slamX - camera.x, this.slamY - camera.y, this.slamRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }
}

// --- 6. OK VE YETENEK MERMİLERİ SİSTEMİ ---
class Projectile {
    constructor(x, y, angle, type, damage, rarity) {
        this.x = x;
        this.y = y;
        this.vx = Math.cos(angle) * 8.5;
        this.vy = Math.sin(angle) * 8.5;
        this.angle = angle;
        this.type = type; // 'arrow'
        this.damage = damage;
        this.rarity = rarity; // 'common', 'rare', 'legendary'
        this.width = 16;
        this.height = 16;
        this.life = 90; // 1.5 saniye ömür
    }

    update(game) {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;

        // Duvar Çarpışması Kontrolü
        if (!World.isWalkable(this.x, this.y)) {
            this.life = 0;
            // Duvara çarpınca partikül fırlat
            const particleColor = this.rarity === 'legendary' ? 'var(--neon-gold)' : (this.rarity === 'rare' ? 'var(--neon-cyan)' : '#8e9297');
            for (let p = 0; p < 4; p++) {
                game.particles.push(new Particle(
                    this.x, this.y,
                    particleColor,
                    (Math.random() - 0.5) * 3,
                    (Math.random() - 0.5) * 3,
                    Math.random() * 3 + 2,
                    15
                ));
            }
            return;
        }

        // Canavar Çarpışması Kontrolü
        for (let enemy of game.enemies) {
            const dist = Math.hypot(this.x - enemy.x, this.y - enemy.y);
            if (dist < (enemy.width/2 + 8)) {
                // Darbe vuruldu! Kritik şansı
                const isCrit = Math.random() * 100 < game.player.stats.crit;
                const finalDamage = isCrit ? Math.floor(this.damage * 2) : Math.floor(this.damage);
                
                // Canavara hasar ver ve oku fırlattığımız açıda geri savur (knockback)
                enemy.takeDamage(finalDamage, this.angle, game);
                
                // Darbe partikülleri
                const particleColor = this.rarity === 'legendary' ? 'var(--neon-gold)' : (this.rarity === 'rare' ? 'var(--neon-cyan)' : '#8e9297');
                for (let p = 0; p < 6; p++) {
                    game.particles.push(new Particle(
                        this.x, this.y,
                        particleColor,
                        (Math.random() - 0.5) * 4,
                        (Math.random() - 0.5) * 4,
                        Math.random() * 3 + 2,
                        15
                    ));
                }

                // Hasar metnini fırlat
                game.textParticles.push(new TextParticle(
                    enemy.x, enemy.y - 15,
                    isCrit ? `${finalDamage}! CRIT` : `${finalDamage}`,
                    isCrit ? 'var(--neon-gold)' : '#ffffff',
                    isCrit ? "12px" : "9px",
                    isCrit
                ));

                // Arayüz loguna ekle
                if (isCrit) {
                    game.addLog(`KRİTİK OK ATISI! ${enemy.name}'a ${finalDamage} hasar verdin!`, "player-hit");
                } else {
                    game.addLog(`${enemy.name}'a okla ${finalDamage} hasar verdin.`, "player-hit");
                }

                this.life = 0;
                break;
            }
        }
    }

    draw(ctx, camera) {
        const drawX = this.x - camera.x;
        const drawY = this.y - camera.y;

        ctx.save();
        ctx.translate(drawX, drawY);
        ctx.rotate(this.angle);

        // Açıya göre döndürülmüş oku çiz
        const spriteKey = `projectile_arrow_${this.rarity}`;
        SpriteEngine.draw(ctx, spriteKey, -16, -16, 32, 32);

        ctx.restore();
    }
}

// --- 7. SİLAH YAĞMURU MERMİSİ (W Yeteneği AoE) ---
class WeaponRainProjectile {
    constructor(startX, startY, targetX, targetY, damage, type) {
        this.x = startX;
        this.y = startY;
        this.targetX = targetX;
        this.targetY = targetY;
        this.damage = damage;
        this.type = type; // 'sword' veya 'arrow'
        this.vy = 9.5; // Düşüş hızı
        this.width = 32;
        this.height = 32;
        this.angle = Math.PI / 2; // Aşağı doğru bakarak düşsün
        this.exploded = false;
    }

    update(game) {
        if (this.exploded) return;

        this.y += this.vy;

        // Hedef zemine ulaştı mı?
        if (this.y >= this.targetY) {
            this.y = this.targetY;
            this.exploded = true;
            this.explode(game);
        }
    }

    explode(game) {
        // Ekranı sars ve tok bir darbe sesi ver
        game.triggerScreenShake(11);
        SoundEngine.playBossSlap();

        const radius = 80; // Patlama hasar yarıçapı (geniş AoE)
        const targetColor = this.type === 'arrow' ? 'var(--neon-gold)' : 'var(--neon-cyan)';

        // Çevredeki tüm canavarları yakala
        game.enemies.forEach(enemy => {
            const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
            if (dist < radius) {
                const isCrit = Math.random() < 0.25; // %25 yetenek kritik şansı
                const finalDamage = isCrit ? Math.floor(this.damage * 1.5) : this.damage;
                
                enemy.takeDamage(finalDamage, Math.PI / 2, game);

                game.textParticles.push(new TextParticle(
                    enemy.x, enemy.y - 15,
                    isCrit ? `${finalDamage}! CRIT` : `${finalDamage}`,
                    targetColor,
                    isCrit ? "12px" : "9px",
                    isCrit
                ));
            }
        });

        // Devasa parıltı patlama partikülleri fırlat
        for (let p = 0; p < 15; p++) {
            const angle = (p / 15) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
            const spd = 2 + Math.random() * 4;
            game.particles.push(new Particle(
                this.x, this.y,
                targetColor,
                Math.cos(angle) * spd,
                Math.sin(angle) * spd - 1,
                Math.random() * 5 + 3,
                35
            ));
        }
    }

    draw(ctx, camera) {
        if (this.exploded) return;

        const drawX = this.x - camera.x;
        const drawY = this.y - camera.y;

        ctx.save();
        ctx.translate(drawX, drawY);
        ctx.rotate(this.angle);

        // Spektral neon kılıç/ok parlaması
        const spriteKey = this.type === 'arrow' ? 'projectile_arrow_legendary' : 'item_sword_legendary';
        ctx.globalAlpha = 0.85;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.type === 'arrow' ? 'var(--neon-gold)' : 'var(--neon-cyan)';
        
        SpriteEngine.draw(ctx, spriteKey, -16, -16, 32, 32);

        ctx.restore();
    }
}
