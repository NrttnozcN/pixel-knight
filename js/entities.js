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

        this.initItemProperties();
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
                const gearCategories = ['sword', 'bow', 'armor', 'helmet', 'necklace', 'earrings', 'ring', 'gloves', 'boots'];
                const chosenCategory = gearCategories[Math.floor(Math.random() * gearCategories.length)];
                
                const rarityRoll = Math.random();
                let rarity = 'common';
                if (rarityRoll < 0.12) rarity = 'legendary';      // %12 Efsanevi
                else if (rarityRoll < 0.38) rarity = 'rare';     // %26 Nadir
                else rarity = 'common';                          // %62 Yaygın
                
                type = `${chosenCategory}_${rarity}`;
            }

            // Ganimeti sandığın tam merkezinden hafif yukarı fırlatarak oluştur
            const lootItem = new Item(this.x, this.y - 10, type, type === 'gold' ? Math.floor(Math.random() * 8) + 5 : 1);
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
        this.hitFlashTimer = 0; // Vurulduğunda kırmızı parlaması için
        this.knockbackVx = 0;
        this.knockbackVy = 0;
        
        // Animasyon karesi
        this.animTimer = 0;
        this.animFrame = 1;

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
            this.goldReward = Math.floor((Math.random() * 5 + 2) * floorMultiplier);
        } else if (this.type === 'slime_fire') {
            this.name = 'Lav Balçığı';
            this.hp = Math.floor(25 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 1.2;
            this.atk = Math.floor(12 * floorMultiplier);
            this.xpReward = Math.floor(20 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 8 + 4) * floorMultiplier);
        } else if (this.type === 'slime_shadow') {
            this.name = 'Karanlık Balçık';
            this.hp = Math.floor(40 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 1.5;
            this.atk = Math.floor(18 * floorMultiplier);
            this.xpReward = Math.floor(35 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 12 + 6) * floorMultiplier);
        } else if (this.type === 'skeleton') {
            this.name = 'İskelet Savaşçı';
            this.hp = Math.floor(30 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 1.1;
            this.atk = Math.floor(10 * floorMultiplier);
            this.xpReward = Math.floor(25 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 10 + 5) * floorMultiplier);
            this.width = 48;
            this.height = 48;
        }
    }

    update(player, game) {
        // 1. Geri Savrulma Fiziği (Knockback)
        if (Math.abs(this.knockbackVx) > 0.1 || Math.abs(this.knockbackVy) > 0.1) {
            const nextX = this.x + this.knockbackVx;
            const nextY = this.y + this.knockbackVy;

            if (World.isWalkable(nextX, this.y)) this.x = nextX;
            if (World.isWalkable(this.x, nextY)) this.y = nextY;

            this.knockbackVx *= 0.85; // Kuvveti yavaşça azalt
            this.knockbackVy *= 0.85;
            return; // Geri savrulurken normal hareket yapamaz
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
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.hypot(dx, dy);

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

            // Oyuncuyla temas ettiğinde hasar ver (Melee temas saldırısı)
            if (distance < 24) {
                player.takeDamage(this.atk, game);
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

    takeDamage(amount, knockbackAngle, game) {
        this.hp -= amount;
        this.hitFlashTimer = 10; // 10 kare kırmızı kal

        // Geri savurma kuvveti
        const force = 8;
        this.knockbackVx = Math.cos(knockbackAngle) * force;
        this.knockbackVy = Math.sin(knockbackAngle) * force;

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

        // Oyuncuya TP (XP) ver
        game.player.gainXp(this.xpReward, game);

        // Yere Altın Para Düşür
        const goldVal = this.goldReward;
        if (goldVal > 0) {
            game.items.push(new Item(this.x, this.y, 'gold', goldVal));
        }

        // Rastgele can potu şansı (%15) veya yeni 8 slot ekipmandan birini düşürme şansı (%7)
        const roll = Math.random();
        if (roll < 0.15) {
            game.items.push(new Item(this.x, this.y, 'potion_red'));
        } else if (roll < 0.22) {
            // Şansa göre tüm ekipman slotlarından (Yay, Kılıç, Kask, Kolye vb.) Common veya Rare kalitede eşya düşür
            const gearCategories = ['sword', 'bow', 'armor', 'helmet', 'necklace', 'earrings', 'ring', 'gloves', 'boots'];
            const chosenCategory = gearCategories[Math.floor(Math.random() * gearCategories.length)];
            const rarity = Math.random() < 0.85 ? 'common' : 'rare';
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
            crit: 5 // % Kritik vuruş şansı
        };
        this.hp = 100;
        this.gold = 0;

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

    // Ekipman hasarları dahil toplam saldırı gücünü döner
    getTotalAtk() {
        let bonus = 0;
        for (const slot in this.equipment) {
            const item = this.equipment[slot];
            if (item && item.stats && item.stats.atk) {
                bonus += item.stats.atk;
            }
        }
        return this.stats.atk + bonus;
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
        if (this.speedBuffTimer > 0) {
            baseSpd *= 1.35; // Hız potu %35 ekstra hız verir
        }
        return baseSpd;
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
                    // Darbe vurduk! Hasar hesapla
                    let damage = Math.floor(this.getTotalAtk() * (this.rapidAttackActive ? 0.7 : 1));
                    let isCrit = false;

                    // Kritik vuruş kontrolü
                    if (Math.random() * 100 < this.stats.crit) {
                        damage *= 2;
                        isCrit = true;
                        
                        // Kritik vuruşta ekran sallanması (Screen Shake)
                        game.triggerScreenShake(8);
                    }

                    // Düşmana hasar ver ve geri savur (knockback açısı kılıç savurma açısıdır)
                    enemy.takeDamage(damage, this.attackAngle, game);

                    // Ekranda hasar yazısı fırlat
                    const fontColor = isCrit ? 'var(--neon-gold)' : '#ffffff';
                    const fontText = isCrit ? `${damage}! CRIT` : `${damage}`;
                    game.textParticles.push(new TextParticle(
                        enemy.x, enemy.y - 15,
                        fontText,
                        fontColor,
                        isCrit ? "12px" : "9px",
                        isCrit
                    ));
                    
                    if (isCrit) {
                        game.addLog(`KRİTİK VURUŞ! ${enemy.name}'a ${damage} hasar verdin!`, "player-hit");
                    } else {
                        game.addLog(`${enemy.name}'a ${damage} hasar verdin.`, "player-hit");
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
        this.invincibleTimer = 35; // 35 kare boyunca dokunulmaz (kırmızı yanıp söner)

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

    die(game) {
        SoundEngine.playDeath();
        game.addLog("Elendin! Zindan seni yuttu.", "death");
        game.gameOver();
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

            // Envantere ekle
            this.inventory.push({
                id: Math.random().toString(36).substring(2, 9), // Eşsiz ID
                type: item.type,
                name: item.name,
                rarity: item.rarity,
                stats: item.stats,
                description: item.description
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
            this.nextLevelXp = Math.floor(this.nextLevelXp * 1.5); // XP barajı katlanır

            // Seviye Atlama Fanfarı
            SoundEngine.playLevelUp();
            game.addLog(`SEVİYE ATLADIN! Artık Seviye ${this.level} Şövalyesisin!`, "level");

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

        // 1. SAĞLIK İKSİRİ KULLANILDI
        if (item.type === 'potion_red') {
            if (this.hp >= this.getMaxHp()) {
                game.addLog("Canınız zaten tamamen dolu!", "system");
                return;
            }
            this.hp = Math.min(this.getMaxHp(), this.hp + 30);
            SoundEngine.playChestOpen(); // İksir içme sesi yerine
            game.addLog("Sağlık iksiri kullanıldı: +30 Sağlık.", "loot");
            
            // Yeşil iyileşme sayısı fırlat
            game.textParticles.push(new TextParticle(
                this.x, this.y - 20,
                `+30 HP`,
                'var(--neon-green)',
                "10px",
                false
            ));

            // İksiri envanterden sil
            this.inventory.splice(itemIndex, 1);
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

            this.inventory.splice(itemIndex, 1);
        }
        
        // 3. GENEL EKİPMAN KUŞANMA SİSTEMİ (8 Slot)
        else {
            let slot = null;
            if (item.type.startsWith('sword_') || item.type.startsWith('bow_')) {
                slot = 'weapon';
            } else if (item.type.startsWith('armor_')) {
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

        SoundEngine.playDash(); // Hızlı rüzgar sesi

        game.textParticles.push(new TextParticle(
            this.x, this.y - 20,
            "HIZLI HÜCUM!",
            "var(--neon-gold)",
            "11px",
            true
        ));

        game.addLog("AKTİF YETENEK (Q): Hızlı Hücum etkinleştirildi! 5 saniye boyunca Saldırı Hızı +100%, Hasar -30%.", "loot");
        
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
        this.hp = Math.floor(300 * floorMultiplier); // Muazzam ve katlandıkça büyüyen can havuzu
        this.maxHp = this.hp;
        this.atk = Math.floor(22 * floorMultiplier); // Yüksek ve katlandıkça büyüyen hasar
        this.speed = 0.85;
        this.xpReward = Math.floor(150 * floorMultiplier);
        
        this.animTimer = 0;
        this.animFrame = 1;
        this.facing = 'right';
        this.hitFlashTimer = 0;
        this.knockbackVx = 0;
        this.knockbackVy = 0;
        
        // Özel saldırı sayaçları
        this.attackCooldown = 150; // 2.5 saniyede bir özel saldırı
        this.attackCooldownTimer = 100; // Başlangıçta biraz beklesin
        
        // Minyon çağırma limitleri (sadece birer kez tetiklensin)
        this.spawned60 = false;
        this.spawned30 = false;
        
        // Slam animasyon sayaçları
        this.slamTimer = 0;
        this.slamActive = false;
        this.slamX = 0;
        this.slamY = 0;
        this.slamRadius = 0;
    }

    update(player, game) {
        // Geri savrulma (Çok minik savrulur Boss olduğu için)
        if (Math.abs(this.knockbackVx) > 0.1 || Math.abs(this.knockbackVy) > 0.1) {
            const nextX = this.x + this.knockbackVx * 0.15;
            const nextY = this.y + this.knockbackVy * 0.15;
            if (World.isWalkable(nextX, this.y)) this.x = nextX;
            if (World.isWalkable(this.x, nextY)) this.y = nextY;
            this.knockbackVx *= 0.85;
            this.knockbackVy *= 0.85;
        }

        if (this.hitFlashTimer > 0) this.hitFlashTimer--;
        if (this.attackCooldownTimer > 0) this.attackCooldownTimer--;

        // Animasyon zamanlayıcısı
        this.animTimer++;
        if (this.animTimer >= 18) {
            this.animFrame = this.animFrame === 1 ? 2 : 1;
            this.animTimer = 0;
        }

        // Oyuncuyla aradaki mesafe
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.hypot(dx, dy);

        // Eğer canı %40'ın altına düşerse sinirlenir (Enrage!)
        if (this.hp < this.maxHp * 0.4 && this.speed < 1.1) {
            this.speed = 1.3; // Hızlanır!
            game.addLog("ZİNDAN MUHAFIZI öfkelendi! Gözleri alev alev parlıyor!", "death");
            SoundEngine.playBossRoar();
        }

        // Minyon Çağırma Kontrolleri
        if (this.hp <= this.maxHp * 0.6 && !this.spawned60) {
            this.spawned60 = true;
            this.spawnMinions(game);
        }
        if (this.hp <= this.maxHp * 0.3 && !this.spawned30) {
            this.spawned30 = true;
            this.spawnMinions(game);
        }

        // Şok dalgası/Slam darbe alanı genişletme fiziği
        if (this.slamActive) {
            this.slamRadius += 6; // Şok dalgası genişler
            if (this.slamRadius >= 130) { // Maksimum etki alanı
                this.slamActive = false;
            }

            // Şok dalgasının oyuncuya hasar verip vermediğini kontrol et
            const pDist = Math.hypot(player.x - this.slamX, player.y - this.slamY);
            if (pDist < this.slamRadius && pDist > this.slamRadius - 15) {
                if (player.invincibleTimer === 0) {
                    const angle = Math.atan2(player.y - this.y, player.x - this.x);
                    player.takeDamage(15, game);
                    player.x += Math.cos(angle) * 15;
                    player.y += Math.sin(angle) * 15;
                }
            }
        }

        // 2. YAPAY ZEKA HAREKETİ VE ÖZEL SALDIRILAR
        if (player.hp > 0) {
            // Saldırı Cooldown bittiyse ve oyuncu yakındaysa Yere Vurma Şok Dalgası (Slam) kullan!
            if (this.attackCooldownTimer === 0 && distance < 150) {
                this.performSlam(player, game);
                return;
            }

            // Normal kovalama hareketi
            const angle = Math.atan2(dy, dx);
            const vx = Math.cos(angle) * this.speed;
            const vy = Math.sin(angle) * this.speed;

            this.facing = vx > 0 ? 'right' : 'left';

            const nextX = this.x + vx;
            const nextY = this.y + vy;

            if (World.isWalkable(nextX, this.y)) this.x = nextX;
            if (World.isWalkable(this.x, nextY)) this.y = nextY;

            // Oyuncuyla doğrudan temas ederse büyük hasar verir
            if (distance < 36) {
                player.takeDamage(this.atk, game);
            }
        }
    }

    // Özel Saldırı: Yere Vurma Şok Dalgası (Slam Explosion)
    performSlam(player, game) {
        this.attackCooldownTimer = this.attackCooldown;
        this.slamActive = true;
        this.slamRadius = 10;
        this.slamX = this.x;
        this.slamY = this.y;
        
        // Ekran sarsıntısı ve sesler
        game.triggerScreenShake(20);
        SoundEngine.playBossSlap();
        game.addLog("ZİNDAN MUHAFIZI yere vurdu! Alev dalgaları yayılıyor!", "death");

        // Yere vurma partikülleri
        for (let p = 0; p < 24; p++) {
            const angle = (p / 24) * Math.PI * 2;
            const spd = 3 + Math.random() * 3;
            game.particles.push(new Particle(
                this.x, this.y,
                '#ff453a', // Kırmızı/Turuncu alev partikülleri
                Math.cos(angle) * spd,
                Math.sin(angle) * spd,
                Math.random() * 4 + 4,
                40
            ));
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
