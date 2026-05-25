/**
 * ==========================================================================
 * EREVORN - ENTITIES & RPG OBJECT MODELS
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

// --- 3. ZEMIN ETKİLEŞİM SİSTEMİ (GroundMark) ---
// Slime'ların geride bıraktığı zemin izleri — zemin katmanında çizilir, yaşam süresi bitince silinir.
class GroundMark {
    constructor(x, y, type, options = {}) {
        this.x = x;
        this.y = y;
        this.type   = type;    // 'scorch' | 'acid' | 'rune'
        this.life   = options.life || 200;
        this.maxLife = this.life;
        const defSize = type === 'acid' ? 4 : type === 'rune' ? 7 : 10;
        this.size       = options.startSize || defSize;
        this.targetSize = options.targetSize || (type === 'acid' ? 18 : this.size);
        this._age = 0;
    }

    update() {
        this.life--;
        this._age++;
        // Acid: expand to targetSize during first 35% of lifetime
        if (this.type === 'acid') {
            const growEnd = this.maxLife * 0.35;
            if (this._age < growEnd) this.size = this.targetSize * (this._age / growEnd);
            else if (this.size < this.targetSize) this.size = this.targetSize;
        }
        return this.life <= 0;
    }

    draw(ctx, camera) {
        if (this.life <= 0) return;
        const dx = this.x - camera.x;
        const dy = this.y - camera.y;
        // Camera culling — skip marks outside viewport
        const m = this.size + 16;
        if (dx < -m || dx > ctx.canvas.width + m || dy < -m || dy > ctx.canvas.height + m) return;

        const alpha = Math.min(1, this.life / this.maxLife);
        ctx.save();

        if (this.type === 'scorch') {
            // Dark brownish radial gradient
            ctx.globalAlpha = alpha * 0.65;
            const g = ctx.createRadialGradient(dx, dy, 0, dx, dy, this.size);
            g.addColorStop(0,   '#1a0800');
            g.addColorStop(0.5, '#0d0400');
            g.addColorStop(1,   'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(dx, dy, this.size, 0, Math.PI * 2); ctx.fill();
            // Heat flicker: only while fresh (>60% life remaining)
            if (this.life > this.maxLife * 0.6) {
                const flicker = Math.sin(Date.now() * 0.014 + this.x * 0.09) * 0.4 + 0.55;
                ctx.globalAlpha = alpha * 0.2 * flicker;
                const gf = ctx.createRadialGradient(dx, dy, 0, dx, dy, this.size * 0.44);
                gf.addColorStop(0, '#cc2200'); gf.addColorStop(1, 'rgba(160,30,0,0)');
                ctx.fillStyle = gf;
                ctx.beginPath(); ctx.arc(dx, dy, this.size * 0.44, 0, Math.PI * 2); ctx.fill();
            }

        } else if (this.type === 'acid') {
            const sz = Math.max(2, this.size);
            // Flat ellipse puddle (wide and low)
            ctx.globalAlpha = alpha * 0.55;
            const g = ctx.createRadialGradient(dx, dy, 0, dx, dy, sz);
            g.addColorStop(0,   '#2e4000');
            g.addColorStop(0.6, '#1a2500');
            g.addColorStop(1,   'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.ellipse(dx, dy, sz * 1.4, sz * 0.6, 0, 0, Math.PI * 2); ctx.fill();
            // Deterministic bubble dots (no RNG in draw = stable)
            if (this.life > 50 && sz > 5) {
                ctx.globalAlpha = alpha * 0.4;
                ctx.fillStyle = '#6a9000';
                const seed = (this.x * 11 + this.y * 7) | 0;
                const n = sz > 12 ? 3 : 2;
                for (let i = 0; i < n; i++) {
                    const bx = dx + Math.sin(seed + i * 2.1) * sz * 0.55;
                    const by = dy + Math.cos(seed + i * 1.8) * sz * 0.28;
                    ctx.fillRect((bx)|0, (by)|0, 2, 2);
                }
            }

        } else if (this.type === 'rune') {
            const s = this.size;
            const pulse = Math.sin(Date.now() * 0.007 + this.x * 0.11) * 0.28 + 0.72;
            ctx.globalAlpha = alpha * pulse * 0.6;
            ctx.strokeStyle = '#440088';
            ctx.lineWidth = 1;
            // Outer rotated diamond
            ctx.beginPath();
            ctx.moveTo(dx,     dy - s); ctx.lineTo(dx + s, dy);
            ctx.lineTo(dx,     dy + s); ctx.lineTo(dx - s, dy);
            ctx.closePath(); ctx.stroke();
            // Inner cross
            const h = s * 0.55;
            ctx.beginPath();
            ctx.moveTo(dx - h, dy); ctx.lineTo(dx + h, dy);
            ctx.moveTo(dx, dy - h); ctx.lineTo(dx, dy + h);
            ctx.stroke();
            // Center glow pixel
            ctx.globalAlpha = alpha * pulse * 0.85;
            ctx.fillStyle = '#6600cc';
            ctx.fillRect((dx - 1)|0, (dy - 1)|0, 2, 2);
        }

        ctx.restore();
    }
}

// --- 4. LOOT & GANİMET EŞYALARI ---
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
        this.effect = null;
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
            this.effect = { type: 'frost', chance: 0.35, duration: 45 };
            this.description = `Düşmanları donduran soğuk buzul çeliği. (+${this.stats.atk} Hasar)`;
        } else if (this.type === 'sword_legendary') {
            this.name = 'Efsanevi Alev Kılıcı';
            this.rarity = 'legendary';
            this.stats = this.stats || { atk: 15 };
            this.effect = { type: 'burn', chance: 0.45, duration: 240 };
            this.description = `Cehennem ateşinde dövülmüş, dokunanı yakan kılıç! (+${this.stats.atk} Hasar)`;
        }
        // MENZİLLİ SİLAHLAR (YAYLAR)
        else if (this.type === 'bow_common') {
            this.name = 'Sıradan Avcı Yayı';
            this.rarity = 'common';
            this.stats = this.stats || { atk: 4, crit: 2 };
            this.description = `Esnek ahşap avcı yayı. Sol tık ile hızlı ok fırlatır. (+${this.stats.atk} Hasar)`;
        } else if (this.type === 'bow_rare') {
            this.name = 'Kadim Buzul Yayı';
            this.rarity = 'rare';
            this.stats = this.stats || { atk: 8, crit: 4 };
            this.effect = { type: 'frost', chance: 0.28, duration: 36 };
            this.description = `Düşmana çarptığında buz saçan donmuş yay. Sol tık ile donmuş ok fırlatır. (+${this.stats.atk} Hasar)`;
        } else if (this.type === 'bow_legendary') {
            this.name = 'Efsanevi Alev Yayı';
            this.rarity = 'legendary';
            this.stats = this.stats || { atk: 17, crit: 7 };
            this.effect = { type: 'burn', chance: 0.35, duration: 220 };
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
            this.effect = { type: 'focus', chance: 0.25, q: 12, w: 18 };
            this.description = `Büyü enerjisi yayan tahta asa. (+${this.stats.atk} Hasar, +${this.stats.hp} Can)`;
        } else if (this.type === 'staff_rare') {
            this.name = 'Kristal Asa';
            this.rarity = 'rare';
            this.stats = this.stats || { atk: 9, hp: 25, def: 2 };
            this.effect = { type: 'focus', chance: 0.45, q: 22, w: 32 };
            this.description = `Mavi kristal büyü asası. (+${this.stats.atk} Hasar, +${this.stats.hp} Can, +${this.stats.def} Defans)`;
        } else if (this.type === 'staff_legendary') {
            this.name = 'Efsanevi Ejderha Asası';
            this.rarity = 'legendary';
            this.stats = this.stats || { atk: 16, hp: 50, def: 4, crit: 5 };
            this.effect = { type: 'burn_focus', chance: 0.55, duration: 220, q: 28, w: 42 };
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
        // ALTIN ANAHTAR
        else if (this.type === 'gold_key') {
            this.name = 'Altın Anahtar';
            this.rarity = 'legendary';
            this.description = 'Kilitli hazine sandığını açmak için kullanılır. Efsanevi ganimetler bekliyor!';
        }
        else if (this.type && this.type.startsWith('stone_shard_')) {
            const names = {
                ruby: 'Yakut Parçası',
                sapphire: 'Safir Parçası',
                emerald: 'Zümrüt Parçası',
                obsidian: 'Obsidyen Parçası'
            };
            const key = this.type.replace('stone_shard_', '');
            this.name = names[key] || 'Taş Parçası';
            this.rarity = 'rare';
            this.description = '10 parça birleşince ekipmana takılabilir bir güç taşı olur.';
        }
        else if (this.type && this.type.startsWith('stone_')) {
            const defs = {
                ruby: ['Yakut Taşı', 'Silaha takılır. +3 saldırı verir.'],
                sapphire: ['Safir Taşı', 'Silaha takılır. +4% kritik verir.'],
                emerald: ['Zümrüt Taşı', 'Zırha takılır. +18 maksimum can verir.'],
                obsidian: ['Obsidyen Taşı', 'Zırha takılır. +2 defans verir.']
            };
            const key = this.type.replace('stone_', '');
            const def = defs[key] || ['Güç Taşı', 'Ekipmana takılarak kalitesini artırır.'];
            this.name = def[0];
            this.rarity = 'epic';
            this.description = def[1];
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
        } else if (this.type.startsWith('sword_') || this.type.startsWith('bow_') || this.type.startsWith('staff_')) {
            this.effect = { type: 'lifesteal', chance: 0.35, rate: 0.10 };
        }

        // Açıklamayı güncelle
        this.description += ` ${picked.desc} (Efsunlu!)`;

        // Efsun stat ekler ama nadirlik basamağı atlatmaz.
        // Aksi halde erken oyunda rare drop'lar turuncuya dönüşüp ekonomiyi kırıyor.
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
        const spriteRarity = this.rarity === 'mythic' ? 'legendary' : this.rarity;
        if (this.type.startsWith('sword_')) spriteKey = `item_sword_${spriteRarity}`;
        if (this.type.startsWith('armor_')) spriteKey = `item_armor_${spriteRarity}`;
        if (this.type.startsWith('bow_')) spriteKey = `item_bow_${spriteRarity}`;
        if (this.type.startsWith('helmet_')) spriteKey = `item_helmet_${spriteRarity}`;
        if (this.type.startsWith('necklace_')) spriteKey = `item_necklace_${spriteRarity}`;
        if (this.type.startsWith('earrings_')) spriteKey = `item_earrings_${spriteRarity}`;
        if (this.type.startsWith('ring_')) spriteKey = `item_ring_${spriteRarity}`;
        if (this.type.startsWith('gloves_')) spriteKey = `item_gloves_${spriteRarity}`;
        if (this.type.startsWith('boots_')) spriteKey = `item_boots_${spriteRarity}`;
        // Yeni item türleri (sprite yoksa sword/armor sprite'ını yeniden kullan)
        if (this.type.startsWith('dagger_')) spriteKey = `item_dagger_${spriteRarity}`;
        if (this.type.startsWith('staff_')) spriteKey = `item_staff_${spriteRarity}`;
        if (this.type.startsWith('shield_')) spriteKey = `item_shield_${spriteRarity}`;
        if (this.type === 'potion_big') spriteKey = 'item_potion_red';
        if (this.type.startsWith('stone_shard_')) spriteKey = 'item_gold';
        if (this.type.startsWith('stone_')) spriteKey = 'item_ring_legendary';

        SpriteEngine.draw(ctx, spriteKey, drawX - this.width/2, drawY - this.height/2, this.width, this.height);
    }
}

// --- 4. ETKİLEŞİMLİ HAZİNE SANDIĞI ---
class Chest {
    constructor(x, y, locked = false) {
        this.x = x;
        this.y = y;
        this.width = 48;
        this.height = 48;
        this.opened = false;
        this.locked = locked; // Altın anahtar gerektiren kilitli sandık
    }

    open(game) {
        if (this.opened) return;

        // Kilitli sandık: altın anahtar gerekir
        if (this.locked) {
            const keyIdx = game.player.inventory.findIndex(i => i.type === 'gold_key');
            if (keyIdx === -1) {
                game.addLog("🔒 Bu sandık kilitli! Altın Anahtar gerekiyor.", "system");
                game.textParticles.push(new TextParticle(this.x, this.y - 30, "KİLİTLİ!", "#ffd700", "9px", true));
                return;
            }
            // Anahtarı tüket
            game.player.inventory.splice(keyIdx, 1);
            game.addLog("🗝️ Altın Anahtar kullanıldı! Efsanevi hazine açılıyor...", "loot");
            this.locked = false;
            // Garantili efsanevi loot
            const cats = ['sword', 'bow', 'staff', 'shield', 'armor', 'helmet', 'ring', 'necklace', 'earrings', 'gloves', 'boots'];
            for (let i = 0; i < 2; i++) {
                const cat = cats[Math.floor(Math.random() * cats.length)];
                const deep = game.floor >= 15;
                const rarity = deep && Math.random() < 0.45 ? 'legendary' : 'rare';
                game.items.push(new Item(this.x + (Math.random()-0.5)*20, this.y - 10, cat + '_' + rarity));
            }
            const bonus = Math.floor(25 + Math.random() * 45);
            game.items.push(new Item(this.x, this.y - 10, 'gold', bonus));
            game.triggerScreenShake(6);
        }

        this.opened = true;

        // Quest takibi
        if (game._checkQuestProgress) game._checkQuestProgress('chest_opened', null);

        // Sandık açma sesi
        SoundEngine.playChestOpen();
        if (!this.locked) game.addLog("Sandık açıldı! Eşyalar saçılıyor.", "loot");

        // Ganimet havuzunu zenginleştir
        const itemCount = Math.floor(Math.random() * 2) + 2; // 2-3 adet ganimet
        for (let i = 0; i < itemCount; i++) {
            let type = 'gold';
            const roll = Math.random();
            
            // Ganimet olasılık havuzu
            if (roll < 0.48) type = 'gold'; // %48 altin
            else if (roll < 0.74) type = Math.random() < 0.6 ? 'potion_red' : 'potion_blue'; // %26 iksir
            else if ((window.GameEngine ? window.GameEngine.floor : 1) >= 10 && roll < 0.82) {
                const shardTypes = ['ruby', 'sapphire', 'emerald', 'obsidian'];
                type = `stone_shard_${shardTypes[Math.floor(Math.random() * shardTypes.length)]}`;
            }
            else {
                // %35 oranında rastgele bir ekipman parçası düşer
                const gearCategories = ['sword', 'bow', 'staff', 'shield', 'armor', 'helmet', 'necklace', 'earrings', 'ring', 'gloves', 'boots'];
                const chosenCategory = gearCategories[Math.floor(Math.random() * gearCategories.length)];

                const rarityRoll = Math.random();
                let rarity = 'common';
                const floor = window.GameEngine ? window.GameEngine.floor : 1;
                const legendaryChance = floor < 10 ? 0 : floor < 25 ? 0.015 : 0.035;
                const rareChance = floor < 10 ? 0.18 : floor < 25 ? 0.24 : 0.30;
                if (rarityRoll < legendaryChance) rarity = 'legendary';
                else if (rarityRoll < legendaryChance + rareChance) rarity = 'rare';
                else rarity = 'common';

                type = `${chosenCategory}_${rarity}`;
            }

            // Ganimeti sandığın tam merkezinden hafif yukarı fırlatarak oluştur
            const floorMult = 1 + (window.GameEngine ? window.GameEngine.floor - 1 : 0) * 0.1;
            const chestGold = Math.floor((Math.random() * 3 + 4) * floorMult); // 4-7 base
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

        if (!this.opened) {
            ctx.save();
            if (this.locked) {
                // Kilitli sandık: altın parıltı + kilit ikonu
                ctx.shadowBlur = 14;
                ctx.shadowColor = '#ffd700';
                ctx.strokeStyle = `rgba(255,215,0,${0.5 + Math.sin(Date.now() / 200) * 0.3})`;
                ctx.lineWidth = 2;
                ctx.strokeRect(drawX - 2, drawY - 2, this.width + 4, this.height + 4);
                ctx.font = "13px serif";
                ctx.textAlign = 'center';
                ctx.fillText('🔒', this.x - camera.x, this.y - camera.y - this.height/2 - 4);
            } else {
                ctx.shadowBlur = 10;
                ctx.shadowColor = 'var(--neon-cyan)';
                ctx.strokeStyle = `rgba(0, 240, 255, ${0.2 + Math.sin(Date.now() / 150) * 0.15})`;
                ctx.lineWidth = 1.5;
                ctx.strokeRect(drawX - 2, drawY - 2, this.width + 4, this.height + 4);
            }
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
        this._hitReact = null; // { timer, max, type-specific fields }

        // Saldırı cooldown (knockback sırasında da çalışır)
        this.attackCooldownTimer = 60; // İlk temastan önce 1 sn bekle
        this.attackCooldownMax = 90;   // 1.5 sn aralarla vurur
        this.attackAnimTimer = 0;
        this.attackAnimMax = 18;
        this.attackAngle = 0;
        this.stunTimer = 0;      // Kritik vuruş sersemletmesi
        this.hitStopTimer = 0;   // Warrior ağır vuruş donma efekti
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
        // Logaritmik ölçekleme — 100 kat için dengeli (kat 1=1.0, kat 50=4.5, kat 100≈5.0)
        const floor = window.GameEngine ? window.GameEngine.floor : 1;
        const floorMultiplier = Math.min(5.0, 1.0 + Math.sqrt(Math.max(0, floor - 1)) * 0.4);

        if (this.type === 'slime') {
            this.name = 'Jöle Balçık';
            this.hp = Math.floor(15 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 0.9;
            this.atk = Math.floor(5 * floorMultiplier);
            this.xpReward = Math.floor(10 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 3 + 3) * floorMultiplier);  // 3-6
            this.debuffType = 'slow'; // Yeşil balçık → yavaşlatır
        } else if (this.type === 'slime_fire') {
            this.name = 'Lav Balçığı';
            this.hp = Math.floor(25 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 1.2;
            this.atk = Math.floor(12 * floorMultiplier);
            this.xpReward = Math.floor(20 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 4 + 5) * floorMultiplier); // 5-9
            this.debuffType = 'burn'; // Kırmızı balçık → yakar + regen engeller
        } else if (this.type === 'slime_shadow') {
            this.name = 'Karanlık Balçık';
            this.hp = Math.floor(40 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 1.5;
            this.atk = Math.floor(18 * floorMultiplier);
            this.xpReward = Math.floor(35 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 5 + 7) * floorMultiplier); // 7-12
            this.debuffType = 'poison'; // Mor balçık → zehirler + regen engeller

        // ── YENİ SLİME VARYANTLARİ ────────────────────────────────────────────
        } else if (this.type === 'slime_burning') {
            this.name = 'Kor-Bal';            // Şişirilmiş baskı kabı — ağır ama hızlı
            this.hp = Math.floor(32 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 1.1;                  // Ağır ısı itkisiyle orta hız
            this.atk = Math.floor(14 * floorMultiplier);
            this.xpReward = Math.floor(28 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 4 + 5) * floorMultiplier);
            this.debuffType = 'burn';

        } else if (this.type === 'slime_toxic') {
            this.name = 'Çürük-Yüz';          // Yavaş sürünen, geniş kaplama alanı
            this.hp = Math.floor(48 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 0.6;                  // Yavaş sürünme hareketi
            this.atk = Math.floor(11 * floorMultiplier);
            this.xpReward = Math.floor(32 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 4 + 5) * floorMultiplier);
            this.attackCooldownMax = 65;        // Sık asit damlacığı
            this.debuffType = 'poison';
            this.width = 54; this.height = 40;  // Geniş+yassı fiziksel form

        } else if (this.type === 'slime_rune') {
            this.name = 'Mühür-Et';            // Bilinçli nabız hareketi, yüksek hasar
            this.hp = Math.floor(38 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 0.85;                 // Yavaş ama kararlı
            this.atk = Math.floor(20 * floorMultiplier);
            this.xpReward = Math.floor(42 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 5 + 6) * floorMultiplier);
            this.attackCooldownMax = 105;       // Ağır rün darbesi, yavaş ama yıkıcı
            this.debuffType = 'slow';

        } else if (this.type === 'slime_void') {
            this.name = 'Yok-Damla';           // Sessiz süzülme — düşük HP yüksek hasar
            this.hp = Math.floor(22 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 1.65;                 // Doğaüstü hız (void kayışı)
            this.atk = Math.floor(24 * floorMultiplier);
            this.xpReward = Math.floor(52 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 6 + 8) * floorMultiplier);
            this.attackCooldownMax = 50;        // Hızlı tekrarlayan void vuruşu
            this.debuffType = 'poison';

        } else if (this.type === 'skeleton') {
            this.name = 'İskelet Savaşçı';
            this.hp = Math.floor(30 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 1.1;
            this.atk = Math.floor(10 * floorMultiplier);
            this.xpReward = Math.floor(25 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 4 + 4) * floorMultiplier);
            this.width = 48;
            this.height = 48;
        } else if (this.type === 'goblin') {
            this.name = 'Goblin Savaşçısı';
            this.hp = Math.floor(22 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 1.7;
            this.atk = Math.floor(9 * floorMultiplier);
            this.xpReward = Math.floor(20 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 4 + 5) * floorMultiplier);
            this.debuffType = null;
        } else if (this.type === 'zombie') {
            this.name = 'Çürümüş Zombi';
            this.hp = Math.floor(50 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 0.65;
            this.atk = Math.floor(14 * floorMultiplier);
            this.xpReward = Math.floor(30 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 4 + 5) * floorMultiplier);
            this.debuffType = 'poison';
        } else if (this.type === 'spider') {
            this.name = 'Zehir Örümceği';
            this.hp = Math.floor(28 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 1.9;
            this.atk = Math.floor(8 * floorMultiplier);
            this.xpReward = Math.floor(22 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 3 + 4) * floorMultiplier);
            this.debuffType = 'poison';
        } else if (this.type === 'troll') {
            this.name = 'Kaya Trolü';
            this.hp = Math.floor(90 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 0.6;
            this.atk = Math.floor(24 * floorMultiplier);
            this.xpReward = Math.floor(60 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 6 + 8) * floorMultiplier);
            this.attackCooldownMax = 120;
            this.debuffType = 'slow';
            this.width = 56; this.height = 56;
        } else if (this.type === 'witch') {
            this.name = 'Gölge Cadısı';
            this.hp = Math.floor(36 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 0.85;
            this.atk = Math.floor(17 * floorMultiplier);
            this.xpReward = Math.floor(42 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 5 + 7) * floorMultiplier);
            this.debuffType = 'burn';
        } else if (this.type === 'ice_golem') {
            this.name = 'Buz Golemi';
            this.hp = Math.floor(75 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 0.75;
            this.atk = Math.floor(19 * floorMultiplier);
            this.xpReward = Math.floor(52 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 6 + 8) * floorMultiplier);
            this.debuffType = 'slow';
            this.width = 56; this.height = 56;
        } else if (this.type === 'demon') {
            this.name = 'Alev Şeytanı';
            this.hp = Math.floor(58 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 1.4;
            this.atk = Math.floor(25 * floorMultiplier);
            this.xpReward = Math.floor(65 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 7 + 9) * floorMultiplier);
            this.debuffType = 'burn';
        } else if (this.type === 'void_wraith') {
            this.name = 'Yokluk Hayaleti';
            this.hp = Math.floor(50 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 2.1;
            this.atk = Math.floor(21 * floorMultiplier);
            this.xpReward = Math.floor(70 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 7 + 9) * floorMultiplier);
            this.debuffType = 'poison';
        } else if (this.type === 'dragon_spawn') {
            this.name = 'Ejder Yavrusu';
            this.hp = Math.floor(88 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 1.7;
            this.atk = Math.floor(36 * floorMultiplier);
            this.xpReward = Math.floor(98 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 10 + 11) * floorMultiplier);
            this.debuffType = 'burn';
            this.width = 56; this.height = 56;
        } else if (this.type === 'abyss_lord') {
            this.name = 'Uçurum Lordu';
            this.hp = Math.floor(100 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 1.6;
            this.atk = Math.floor(35 * floorMultiplier);
            this.xpReward = Math.floor(110 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 10 + 12) * floorMultiplier);
            this.debuffType = 'poison';
            this.attackCooldownMax = 55;
        } else if (this.type === 'time_echo') {
            // Zaman Yankısı — oyuncunun geçmişteki hayaleti, onun statlarını kopyalar
            this.name = 'ZAMAN YANKISI';
            this._spriteOverride = 'skeleton';
            this._isTimeEcho = true;
            const player = window.GameEngine && window.GameEngine.player;
            const baseAtk = player ? Math.floor(player.stats.atk * 0.8) : Math.floor(20 * floorMultiplier);
            const baseHp  = player ? Math.floor(player.stats.maxHp * 0.7) : Math.floor(80 * floorMultiplier);
            this.hp       = baseHp;
            this.maxHp    = baseHp;
            this.speed    = 1.6;
            this.atk      = baseAtk;
            this.xpReward = Math.floor(150 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 10 + 15) * floorMultiplier);
            this.attackCooldownMax = 70;
            this.debuffType = 'slow';
            this.width = 48; this.height = 48;

        // ── ZONE 1 ──────────────────────────────────────────────────────────
        } else if (this.type === 'lost_armor') {
            this.name = 'Yitik Muhafız';
            this._spriteOverride = 'skeleton';
            this.hp = Math.floor(35 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 0.7;
            this.atk = Math.floor(14 * floorMultiplier);
            this.xpReward = Math.floor(30 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 4 + 5) * floorMultiplier);
            this.attackCooldownMax = 100;
        } else if (this.type === 'bat') {
            this.name = 'Rün Yarasa';
            this._spriteOverride = 'slime_shadow';
            this.hp = Math.floor(12 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 2.4;
            this.atk = Math.floor(7 * floorMultiplier);
            this.xpReward = Math.floor(14 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 2 + 2) * floorMultiplier);
            this.attackCooldownMax = 50;
            this.debuffType = 'poison';

        // ── ZONE 2 ──────────────────────────────────────────────────────────
        } else if (this.type === 'shadow_creature') {
            this.name = 'Gölge Yaratığı';
            this._spriteOverride = 'slime_shadow';
            this.hp = Math.floor(45 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 1.8;
            this.atk = Math.floor(20 * floorMultiplier);
            this.xpReward = Math.floor(40 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 5 + 6) * floorMultiplier);
            this.debuffType = 'slow';
        } else if (this.type === 'blind_worker') {
            this.name = 'Kör İşçi';
            this._spriteOverride = 'zombie';
            this.hp = Math.floor(28 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 1.1;
            this.atk = Math.floor(11 * floorMultiplier);
            this.xpReward = Math.floor(22 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 3 + 3) * floorMultiplier);

        // ── ZONE 3 ──────────────────────────────────────────────────────────
        } else if (this.type === 'mutant_goblin') {
            this.name = 'Mutant Goblin';
            this._spriteOverride = 'goblin';
            this.hp = Math.floor(40 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 1.5;
            this.atk = Math.floor(17 * floorMultiplier);
            this.xpReward = Math.floor(35 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 5 + 5) * floorMultiplier);
            this.debuffType = 'poison';
            this.width = 52; this.height = 52;
        } else if (this.type === 'enslaved_villager') {
            this.name = 'Köleleştirilmiş Köylü';
            this._spriteOverride = 'zombie';
            this.hp = Math.floor(20 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 1.0;
            this.atk = Math.floor(9 * floorMultiplier);
            this.xpReward = Math.floor(18 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 3 + 2) * floorMultiplier);

        // ── ZONE 4 ──────────────────────────────────────────────────────────
        } else if (this.type === 'magma_golem') {
            this.name = 'Magma Golemi';
            this._spriteOverride = 'ice_golem';
            this.hp = Math.floor(75 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 0.9;
            this.atk = Math.floor(28 * floorMultiplier);
            this.xpReward = Math.floor(75 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 7 + 8) * floorMultiplier);
            this.debuffType = 'burn';
            this.width = 56; this.height = 56;
        } else if (this.type === 'charred_priest') {
            this.name = 'Kül Rahibi';
            this._spriteOverride = 'witch';
            this.hp = Math.floor(38 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 1.2;
            this.atk = Math.floor(22 * floorMultiplier);
            this.xpReward = Math.floor(50 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 6 + 6) * floorMultiplier);
            this.debuffType = 'burn';

        // ── ZONE 5 ──────────────────────────────────────────────────────────
        } else if (this.type === 'ice_zombie') {
            this.name = 'Buz Zombisi';
            this._spriteOverride = 'zombie';
            this.hp = Math.floor(48 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 0.8;
            this.atk = Math.floor(19 * floorMultiplier);
            this.xpReward = Math.floor(45 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 5 + 6) * floorMultiplier);
            this.debuffType = 'slow';
        } else if (this.type === 'ice_bear') {
            this.name = 'Buz Ayısı';
            this._spriteOverride = 'troll';
            this.hp = Math.floor(80 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 1.3;
            this.atk = Math.floor(30 * floorMultiplier);
            this.xpReward = Math.floor(80 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 8 + 9) * floorMultiplier);
            this.debuffType = 'slow';
            this.width = 60; this.height = 60;

        // ── ZONE 6 ──────────────────────────────────────────────────────────
        } else if (this.type === 'treant') {
            this.name = 'Treant';
            this._spriteOverride = 'troll';
            this.hp = Math.floor(90 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 0.7;
            this.atk = Math.floor(32 * floorMultiplier);
            this.xpReward = Math.floor(90 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 8 + 10) * floorMultiplier);
            this.attackCooldownMax = 110;
            this.width = 64; this.height = 64;
        } else if (this.type === 'vine_horror') {
            this.name = 'Sarmaşık Dehşeti';
            this._spriteOverride = 'spider';
            this.hp = Math.floor(55 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 1.4;
            this.atk = Math.floor(24 * floorMultiplier);
            this.xpReward = Math.floor(60 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 6 + 7) * floorMultiplier);
            this.debuffType = 'slow';

        // ── ZONE 7 ──────────────────────────────────────────────────────────
        } else if (this.type === 'gargoyle') {
            this.name = 'Gargoyle';
            this._spriteOverride = 'skeleton';
            this.hp = Math.floor(65 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 1.9;
            this.atk = Math.floor(26 * floorMultiplier);
            this.xpReward = Math.floor(70 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 7 + 8) * floorMultiplier);
            this.attackCooldownMax = 70;
        } else if (this.type === 'armored_knight') {
            this.name = 'Zırhlı Şövalye';
            this._spriteOverride = 'skeleton';
            this.hp = Math.floor(85 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 0.9;
            this.atk = Math.floor(33 * floorMultiplier);
            this.xpReward = Math.floor(88 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 9 + 10) * floorMultiplier);
            this.attackCooldownMax = 100;
            this.width = 56; this.height = 56;

        // ── ZONE 8 ──────────────────────────────────────────────────────────
        } else if (this.type === 'lightning_golem') {
            this.name = 'Şimşek Golemi';
            this._spriteOverride = 'ice_golem';
            this.hp = Math.floor(72 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 1.4;
            this.atk = Math.floor(29 * floorMultiplier);
            this.xpReward = Math.floor(78 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 8 + 9) * floorMultiplier);
            this.debuffType = 'burn';
            this.width = 56; this.height = 56;
        } else if (this.type === 'ghost_arcanist') {
            this.name = 'Hayalet Büyücü';
            this._spriteOverride = 'witch';
            this.hp = Math.floor(55 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 1.6;
            this.atk = Math.floor(31 * floorMultiplier);
            this.xpReward = Math.floor(72 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 8 + 9) * floorMultiplier);
            this.debuffType = 'poison';

        // ── ZONE 9 ──────────────────────────────────────────────────────────
        } else if (this.type === 'void_horror') {
            this.name = 'Yokluk Dehşeti';
            this._spriteOverride = 'void_wraith';
            this.hp = Math.floor(95 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 1.4;
            this.atk = Math.floor(38 * floorMultiplier);
            this.xpReward = Math.floor(105 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 10 + 12) * floorMultiplier);
            this.debuffType = 'slow';
            this.width = 56; this.height = 56;

        // ── ZONE 10 ─────────────────────────────────────────────────────────
        } else if (this.type === 'rune_clone') {
            this.name = 'Rün Klonu';
            this._spriteOverride = 'skeleton';
            this.hp = Math.floor(60 * floorMultiplier);
            this.maxHp = this.hp;
            this.speed = 1.5;
            this.atk = Math.floor(28 * floorMultiplier);
            this.xpReward = Math.floor(80 * floorMultiplier);
            this.goldReward = Math.floor((Math.random() * 9 + 9) * floorMultiplier);
        }
    }

    update(player, game) {
        // Saldırı cooldown'ı her zaman say (knockback sırasında da!)
        if (this.attackCooldownTimer > 0) this.attackCooldownTimer--;
        if (this.attackAnimTimer > 0) this.attackAnimTimer--;
        if (this._rangerMarked > 0) this._rangerMarked--;
        // Elemental debuff sayaçları
        if (this.burnedTimer > 0) this.burnedTimer--;
        if (this.poisonedTimer > 0) this.poisonedTimer--;
        // Warrior hit-stop: ağır vuruş donması
        if (this.hitStopTimer > 0) { this.hitStopTimer--; return; }
        // Sersemletme: stun aktifken hareket ve saldırı yapamaz
        if (this.stunTimer > 0) { this.stunTimer--; return; }

        // Oyuncuya olan mesafeyi hesapla
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.hypot(dx, dy);

        // Melee saldırı: knockback/hareket durumundan bağımsız kontrol et
        if (distance < 32 && player.hp > 0 && this.attackCooldownTimer === 0) {
            this.attackAngle = Math.atan2(dy, dx);
            this.attackAnimTimer = this.attackAnimMax;
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
            if (this._hitReact && this._hitReact.timer > 0) this._hitReact.timer--;
            return;
        }

        // Hasar parlaması süresini azalt
        if (this.hitFlashTimer > 0) this.hitFlashTimer--;
        if (this._hitReact && this._hitReact.timer > 0) this._hitReact.timer--;

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

        // Zemin etkileşim efektleri
        this._updateGroundInteraction(game);
    }

    _updateGroundInteraction(game) {
        if (!game || !game.groundMarks) return;
        const MAX_MARKS = 60;
        this._gmTimer = (this._gmTimer || 0) + 1;
        const moving = (this.state === 'chase' || this.state === 'patrol');

        if (this.type === 'slime_burning') {
            // Scorch mark every 12 frames while chasing — trail of burnt floor
            if (moving && this._gmTimer % 12 === 0 && game.groundMarks.length < MAX_MARKS) {
                game.groundMarks.push(new GroundMark(this.x, this.y, 'scorch', { life: 240, targetSize: 12 }));
            }
            // Ember particle: 1 hot cinder rises every 18 frames
            if (this._gmTimer % 18 === 0) {
                game.particles.push(new Particle(
                    this.x + (Math.random() - 0.5) * 10,
                    this.y + 6,
                    Math.random() < 0.5 ? '#cc2200' : '#ff5500',
                    (Math.random() - 0.5) * 0.5,
                    -0.85 - Math.random() * 0.5,
                    1.5, 28, 0.02   // gravity 0.02: rises then slows
                ));
            }

        } else if (this.type === 'slime_toxic') {
            // Acid puddle every 8 frames — grows, then evaporates
            if (this._gmTimer % 8 === 0 && game.groundMarks.length < MAX_MARKS) {
                game.groundMarks.push(new GroundMark(this.x, this.y, 'acid', {
                    life: 300, startSize: 4, targetSize: 18
                }));
            }

        } else if (this.type === 'slime_rune') {
            // Rune seal stamp every 22 frames while moving
            if (moving && this._gmTimer % 22 === 0 && game.groundMarks.length < MAX_MARKS) {
                game.groundMarks.push(new GroundMark(this.x, this.y, 'rune', { life: 340 }));
                // Pulse ring: 6 particles burst outward from the stamp
                for (let a = 0; a < 6; a++) {
                    const ang = (a / 6) * Math.PI * 2;
                    game.particles.push(new Particle(
                        this.x + Math.cos(ang) * 3,
                        this.y + Math.sin(ang) * 3,
                        '#4400aa',
                        Math.cos(ang) * 0.7, Math.sin(ang) * 0.7,
                        1.5, 16, 0
                    ));
                }
            }

        }
        // slime_void: intentional absence — no marks generated
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

        // Vurma parçacıkları ve tepki animasyonu
        this._spawnHitVFX(knockbackAngle, game);

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
        // Diyalog: ilk öldürme eventi
        if (window.DialogSystem && game.killsCount === 1) {
            setTimeout(() => DialogSystem.triggerEvent('first_kill'), 600);
        }
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
        const luckMult = 1 + ((game.player && game.player.stats.luck) || 0) / 140;
        const economyMult = Math.min(1.15, 0.62 + (game.floor || 1) * 0.006);
        const goldVal = Math.floor(this.goldReward * luckMult * economyMult);
        if (goldVal > 0) {
            game.items.push(new Item(this.x, this.y, 'gold', goldVal));
        }

        const floor = game.floor || 1;
        const shardChance = floor < 10 ? 0.015 : floor < 30 ? 0.055 : floor < 50 ? 0.08 : 0.11;
        if (Math.random() < shardChance) {
            const shardTypes = ['ruby', 'sapphire', 'emerald', 'obsidian'];
            const shard = shardTypes[Math.floor(Math.random() * shardTypes.length)];
            game.items.push(new Item(this.x, this.y, `stone_shard_${shard}`));
        }

        // Altın Anahtar düşürme (%8 şans: slime_shadow ve skeleton)
        if ((this.type === 'slime_shadow' || this.type === 'skeleton') && Math.random() < 0.03) {
            game.items.push(new Item(this.x, this.y, 'gold_key'));
            game.addLog("🗝️ Altın Anahtar düştü! Kilitli sandıkları açabilirsin.", "loot");
        }

        // Düşman ölüm ganimetleri (Luck: efsanevi şansını artırır)
        const luckBonus = ((game.player && game.player.stats.luck) || 0);
        const legendaryChance = (floor < 10 ? 0 : floor < 25 ? 0.01 : floor < 50 ? 0.025 : 0.04) + (floor < 10 ? 0 : luckBonus / 2200);
        const rareChance = (floor < 10 ? 0.16 : floor < 25 ? 0.22 : floor < 50 ? 0.28 : 0.34) + luckBonus / 800;
        const roll = Math.random();
        if (roll < 0.10) {
            game.items.push(new Item(this.x, this.y, 'potion_red'));
        } else if (roll < 0.13) {
            game.items.push(new Item(this.x, this.y, 'potion_blue'));
        } else if (roll < 0.22) {
            const gearCategories = ['sword', 'bow', 'staff', 'shield', 'armor', 'helmet', 'necklace', 'earrings', 'ring', 'gloves', 'boots'];
            const chosenCategory = gearCategories[Math.floor(Math.random() * gearCategories.length)];
            const rarityRoll = Math.random();
            const rarity = rarityRoll < legendaryChance ? 'legendary' : rarityRoll < rareChance ? 'rare' : 'common';
            game.items.push(new Item(this.x, this.y, `${chosenCategory}_${rarity}`));
        }

        // Ölüm parçacık patlaması
        this._spawnDeathVFX(game);
    }

    _spawnHitVFX(knockbackAngle, game) {
        const x = this.x;
        const y = this.y;
        const r = (a, b) => a + Math.random() * (b - a);
        const kx = Math.cos(knockbackAngle);
        const ky = Math.sin(knockbackAngle);

        if (this.type === 'slime_burning') {
            this._hitReact = { timer: 18, max: 18 };
            // Ember spray biased in knockback direction
            for (let i = 0; i < 5; i++) {
                const ang = knockbackAngle + r(-0.8, 0.8);
                game.particles.push(new Particle(x, y,
                    i < 3 ? '#ff4400' : '#cc2200',
                    Math.cos(ang) * r(2.2, 4.5), Math.sin(ang) * r(2.2, 4.5),
                    r(1.5, 2.5), r(18, 28), 0.04));
            }
            // Two heat shimmer wisps rising from wound
            for (let i = 0; i < 2; i++) {
                game.particles.push(new Particle(
                    x + r(-8, 8), y, '#660800',
                    r(-0.3, 0.3), r(-1.2, -0.6), r(3, 4.5), r(14, 22), -0.02));
            }

        } else if (this.type === 'slime_toxic') {
            this._hitReact = { timer: 24, max: 24, angle: knockbackAngle };
            // Asymmetric acid splash — biased, not radially symmetric
            for (let i = 0; i < 4; i++) {
                const ang = knockbackAngle + r(-1.1, 0.5);
                game.particles.push(new Particle(x, y,
                    i % 2 === 0 ? '#6a9000' : '#4a6800',
                    Math.cos(ang) * r(1.5, 3.2), Math.sin(ang) * r(1.0, 2.5),
                    r(2, 3.5), r(20, 32), 0.07));
            }
            // Single rising gas burst — diseased organism releasing toxin
            game.particles.push(new Particle(x, y, '#5a7a00',
                r(-0.3, 0.3), r(-1.5, -0.8), r(2.5, 4), r(35, 50), -0.015));

        } else if (this.type === 'slime_rune') {
            this._hitReact = { timer: 14, max: 14 };
            // Cardinal rune sparks — angular X pattern, not random scatter
            for (let i = 0; i < 4; i++) {
                const ang = (i / 4) * Math.PI * 2 + Math.PI / 4; // 45° rotated cross
                game.particles.push(new Particle(
                    x + Math.cos(ang) * 6, y + Math.sin(ang) * 6,
                    i % 2 === 0 ? '#aa00ff' : '#6600cc',
                    Math.cos(ang) * r(1.2, 2.2), Math.sin(ang) * r(1.2, 2.2),
                    r(1.5, 2.5), r(22, 32)));
            }
            // Single bright discharge in knockback direction
            game.particles.push(new Particle(x, y, '#dd66ff',
                kx * r(1.0, 1.8), ky * r(1.0, 1.8), 3, 16));

        } else if (this.type === 'slime_void') {
            this._hitReact = { timer: 20, max: 20 };
            // Wound closure — dark particles fly TOWARD center (inverted direction)
            for (let i = 0; i < 4; i++) {
                const ang = knockbackAngle + r(-0.4, 0.4);
                const dist = r(12, 20);
                game.particles.push(new Particle(
                    x + Math.cos(ang) * dist, y + Math.sin(ang) * dist,
                    i % 2 === 0 ? '#040414' : '#0a0a1a',
                    -Math.cos(ang) * r(1.4, 2.6), -Math.sin(ang) * r(1.4, 2.6),
                    r(2, 3.5), r(10, 16)));
            }
            // Barely visible near-black wisp
            game.particles.push(new Particle(x, y, '#06060f',
                kx * 0.8, ky * 0.8, 2.5, 20));

        } else {
            // Generic blood particles for all other enemy types
            let bloodColor = '#e63946';
            if (this.type === 'slime')        bloodColor = '#39ff14';
            if (this.type === 'slime_shadow') bloodColor = '#b026ff';
            if (this.type === 'skeleton')     bloodColor = '#e0dbcd';
            for (let p = 0; p < 8; p++) {
                game.particles.push(new Particle(
                    x, y, bloodColor,
                    (Math.random() - 0.5) * 5 + this.knockbackVx * 0.5,
                    (Math.random() - 0.5) * 5 + this.knockbackVy * 0.5,
                    Math.random() * 3 + 2, 15 + Math.random() * 10));
            }
        }
    }

    _spawnDeathVFX(game) {
        const x = this.x;
        const y = this.y;
        const r = (a, b) => a + Math.random() * (b - a);
        const push = (col, vx, vy, sz, life, grav = 0) =>
            game.particles.push(new Particle(x, y, col, vx, vy, sz, life, grav));
        const ring = (n, cols, sMin, sMax, szMin, szMax, lMin, lMax, grav = 0, jitter = 0.3) => {
            for (let i = 0; i < n; i++) {
                const ang = (i / n) * Math.PI * 2 + r(-jitter, jitter);
                const spd = r(sMin, sMax);
                const col = cols[Math.floor(Math.random() * cols.length)];
                push(col, Math.cos(ang) * spd, Math.sin(ang) * spd, r(szMin, szMax), r(lMin, lMax), grav);
            }
        };

        if (this.type === 'slime_burning') {
            // Inward collapse — dark smoke wisps contracting
            for (let i = 0; i < 5; i++) {
                const ang = r(0, Math.PI * 2);
                push('#1a0800', Math.cos(ang) * 0.35, Math.sin(ang) * 0.35 - 0.3, r(4, 7), r(18, 26), -0.015);
            }
            // Pressure rupture — ember burst
            ring(10, ['#ff4400', '#cc2200', '#ff6600'], 2.2, 4.8, 2, 3.5, 30, 50, 0.03);
            // Heavy ash chunks
            ring(4, ['#3a1400', '#2a0c00'], 1.4, 2.8, 3.5, 5.5, 26, 36, 0.08);
            // Delayed ember drift — slow-rising sparks
            setTimeout(() => {
                if (!game.particles) return;
                for (let i = 0; i < 5; i++) {
                    push('#ff4400', r(-0.4, 0.4), r(-1.4, -0.7), 1.5, r(45, 60), -0.008);
                }
            }, 80);
            // Lingering scorch at death position
            if (game.groundMarks && game.groundMarks.length < 60) {
                game.groundMarks.push(new GroundMark(x, y, 'scorch', { life: 360, startSize: 6, targetSize: 14 }));
            }

        } else if (this.type === 'slime_toxic') {
            // Viscous glob plop — heavy globs fall down
            for (let i = 0; i < 5; i++) {
                const ang = r(0, Math.PI * 2);
                const col = i % 2 === 0 ? '#2e4000' : '#1a3300';
                push(col, Math.cos(ang) * r(0.3, 0.9), Math.sin(ang) * r(0.3, 0.9), r(5, 8), r(20, 30), 0.09);
            }
            // Rising gas wisps
            for (let i = 0; i < 3; i++) {
                push('#5a7a00', r(-0.5, 0.5), r(-1.7, -1.0), r(2.5, 4), r(50, 68), -0.018);
            }
            // Bubble burst — upper-half biased
            for (let i = 0; i < 8; i++) {
                const ang = r(-Math.PI * 0.9, -Math.PI * 0.1);
                const col = ['#6a9000', '#4a6800', '#88b000'][i % 3];
                push(col, Math.cos(ang) * r(1.2, 2.4), Math.sin(ang) * r(0.8, 1.8), r(2, 3), r(18, 26));
            }
            // Delayed acid drips
            setTimeout(() => {
                if (!game.particles) return;
                for (let i = 0; i < 4; i++) {
                    push('#8ab000', r(-1.4, 1.4), r(0.6, 1.6), 2, r(35, 45), 0.06);
                }
            }, 60);
            // Large death acid puddle — bigger than walking ones
            if (game.groundMarks && game.groundMarks.length < 60) {
                game.groundMarks.push(new GroundMark(x, y, 'acid', { life: 380, startSize: 8, targetSize: 22 }));
            }

        } else if (this.type === 'slime_rune') {
            // Seal shutdown — 6 sparks at circle radius
            for (let i = 0; i < 6; i++) {
                const ang = (i / 6) * Math.PI * 2;
                const ox = Math.cos(ang) * 10, oy = Math.sin(ang) * 10;
                const col = i % 2 === 0 ? '#aa00ff' : '#6600cc';
                game.particles.push(new Particle(x + ox, y + oy, col,
                    Math.cos(ang) * r(0.6, 1.3), Math.sin(ang) * r(0.6, 1.3), 2, r(40, 52)));
            }
            // Magical discharge — arcane motes + seal fragments
            setTimeout(() => {
                if (!game.particles) return;
                ring(8, ['#cc44ff', '#8800dd', '#bb00ff'], 1.6, 3.0, 2, 3, 20, 30);
                ring(4, ['#220033', '#110022'], 1.2, 2.2, 4, 5.5, 30, 42, 0.04);
            }, 40);
            // Rune echo — slow-drifting wisps
            setTimeout(() => {
                if (!game.particles) return;
                for (let i = 0; i < 4; i++) {
                    push('#6600aa', r(-0.4, 0.4), r(-0.4, 0.4), 2, r(55, 72), -0.004);
                }
            }, 100);
            // Persistent death rune seal
            if (game.groundMarks && game.groundMarks.length < 60) {
                game.groundMarks.push(new GroundMark(x, y, 'rune', { life: 420 }));
            }

        } else if (this.type === 'slime_void') {
            // Gravity well — pull nearby particles inward for 14 frames
            if (game.voidPulses) {
                game.voidPulses.push({ x, y, life: 14, maxLife: 14, radius: 85, strength: 1.4 });
            }
            // Dark matter convergence — outer ring flying INWARD
            for (let i = 0; i < 6; i++) {
                const ang = (i / 6) * Math.PI * 2 + r(-0.2, 0.2);
                const radius = r(12, 22);
                const col = i % 2 === 0 ? '#040414' : '#07071c';
                game.particles.push(new Particle(
                    x + Math.cos(ang) * radius, y + Math.sin(ang) * radius,
                    col,
                    -Math.cos(ang) * r(1.6, 2.8), -Math.sin(ang) * r(1.6, 2.8),
                    r(2.5, 4.5), r(12, 18)
                ));
            }
            // Distortion ring collapse — 8 points converging to center
            setTimeout(() => {
                if (!game.particles) return;
                for (let i = 0; i < 8; i++) {
                    const ang = (i / 8) * Math.PI * 2;
                    game.particles.push(new Particle(
                        x + Math.cos(ang) * 18, y + Math.sin(ang) * 18,
                        '#0a0a1a',
                        -Math.cos(ang) * 2.6, -Math.sin(ang) * 2.6,
                        2, r(10, 14)
                    ));
                }
            }, 50);
            // Aftershock echo — barely visible residue
            setTimeout(() => {
                if (!game.particles) return;
                for (let i = 0; i < 3; i++) {
                    push('#08081a', r(-0.5, 0.5), r(-0.5, 0.5), 2, r(28, 40));
                }
            }, 120);
            // NO ground marks — the void leaves nothing

        } else {
            // Generic death burst for all other enemy types
            for (let p = 0; p < 12; p++) {
                game.particles.push(new Particle(
                    x, y, '#ffffff',
                    (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4,
                    Math.random() * 4 + 2, 30
                ));
            }
        }
    }

    draw(ctx, camera) {
        const hasPNG = !!(SpriteEngine.pngCache[`${this._spriteOverride || this.type}_idle1`]);
        const scale  = hasPNG ? 1.5 : 1.0;
        const visW   = this.width  * scale;
        const visH   = this.height * scale;
        const drawX  = this.x - camera.x - visW / 2;
        const drawY  = this.y - camera.y - visH / 2;

        // Zemin gölgesi — karakteri zeminden görsel olarak ayırır
        {
            const scx = this.x - camera.x;
            const scy = this.y - camera.y + visH * 0.40;
            const rw  = visW * 0.38;
            const rh  = visW * 0.12;
            ctx.save();
            ctx.globalAlpha = 0.38;
            const sg = ctx.createRadialGradient(scx, scy, 0, scx, scy, rw);
            sg.addColorStop(0, 'rgba(0,0,0,0.75)');
            sg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = sg;
            ctx.beginPath();
            ctx.ellipse(scx, scy, rw, rh, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.save();

        // Hasar parlaması — tür başına renk kimliği
        if (this.hitFlashTimer > 0) {
            if (this.type === 'slime_burning') {
                ctx.filter = 'brightness(1.9) sepia(1) hue-rotate(-20deg) saturate(7)';   // kızgın turuncu
            } else if (this.type === 'slime_toxic') {
                ctx.filter = 'brightness(1.5) sepia(1) hue-rotate(60deg) saturate(6)';    // hastalıklı sarı-yeşil
            } else if (this.type === 'slime_rune') {
                ctx.filter = 'brightness(1.7) sepia(1) hue-rotate(-140deg) saturate(7)';  // arkanik mor
            } else if (this.type !== 'slime_void') {
                ctx.filter = 'brightness(1.5) sepia(1) hue-rotate(-50deg) saturate(5)';   // genel kırmızı
            }
            // slime_void: renk parlaması yok — saydam yara kapanması hitReact'te işlenir
        }

        // Zaman Yankısı: soluk cyan glow + yarı saydam hayalet efekti
        if (this._isTimeEcho) {
            ctx.globalAlpha = 0.7 + 0.15 * Math.sin(Date.now() / 250);
            if (this.hitFlashTimer <= 0) {
                ctx.filter = 'brightness(0.8) sepia(1) hue-rotate(160deg) saturate(4)';
            }
        }

        // Void slime: zemin soyutlama alanı — sprite altında çizilir, iz bırakmaz
        if (this.type === 'slime_void') {
            const cx = this.x - camera.x;
            const cy = this.y - camera.y + 8;
            const voidPulse = Math.sin(Date.now() * 0.004 + this.x * 0.05) * 0.06 + 0.1;
            ctx.save();
            ctx.globalAlpha = voidPulse;
            const vg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 28);
            vg.addColorStop(0, '#000008');
            vg.addColorStop(0.5, '#020210');
            vg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = vg;
            ctx.beginPath(); ctx.ellipse(cx, cy, 28, 14, 0, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }

        // Sprite anahtarını bul (yeni düşman türleri için spriteOverride kullan)
        const spriteBase = this._spriteOverride || this.type;
        let spriteKey = `${spriteBase}_idle${this.animFrame}`;
        if (this.facing === 'left') spriteKey += '_flipped';

        // Vuruş tepki deformasyonu — tür başına özgün fizik kimliği
        if (this._hitReact && this._hitReact.timer > 0) {
            const progress = 1 - (this._hitReact.timer / this._hitReact.max); // 0.0 → 1.0
            const cx = this.x - camera.x;
            const cy = this.y - camera.y;

            if (this.type === 'slime_burning') {
                // Genişleme baskısı → çatlak titreşimi → reform
                const expand  = Math.sin(progress * Math.PI) * 0.22;
                const wobble  = progress > 0.55
                    ? Math.sin(progress * Math.PI * 5) * 0.06 * (1 - progress)
                    : 0;
                ctx.translate(cx, cy);
                ctx.scale(1 + expand * 0.9 + wobble, 1 + expand * 0.75 + wobble * 0.5);
                ctx.translate(-cx, -cy);

            } else if (this.type === 'slime_toxic') {
                // Asimetrik yatay eğilme → organik titre-toparlanma
                const lean   = progress < 0.25 ? progress / 0.25 : 1 - (progress - 0.25) / 0.75;
                const wobble = Math.sin(progress * Math.PI * 4) * 0.12 * (1 - progress);
                const ang    = this._hitReact.angle || 0;
                const skX    = Math.sin(ang) * lean * 0.14 + wobble * 0.08;
                const skY    = Math.cos(ang) * lean * 0.06;
                const sy     = 1 - lean * 0.14;
                ctx.translate(cx, cy);
                ctx.transform(1, skY, skX, sy, 0, 0); // skew+ölçek (kayma)
                ctx.translate(-cx, -cy);

            } else if (this.type === 'slime_rune') {
                // Geometrik anlık kırılma — yumuşak geçiş yok, adım adım snap
                const t = this._hitReact.timer;
                const m = this._hitReact.max;
                let sx = 1, sy = 1;
                if      (t > m * 0.78) { sx = 0.68; sy = 1.30; }  // düz sıkışma
                else if (t > m * 0.57) { sx = 1.34; sy = 0.72; }  // aşırı esnetme
                else if (t > m * 0.36) { sx = 0.92; sy = 1.08; }  // geri sekme
                else                   { sx = 1.04; sy = 0.97; }  // yeniden oturma
                ctx.translate(cx, cy);
                ctx.scale(sx, sy);
                ctx.translate(-cx, -cy);

            } else if (this.type === 'slime_void') {
                // İçe çöküş → siluet kararsızlığı → yeniden cisimleşme
                let scale, alpha;
                if (progress < 0.25) {
                    scale = 1 - (progress / 0.25) * 0.28;
                    alpha = 0.2 + progress * 1.6;
                } else if (progress < 0.60) {
                    const flicker = Math.sin(progress * Math.PI * 14) * 0.08;
                    scale = 0.72 + flicker;
                    alpha = 0.5 + Math.sin(progress * Math.PI * 8) * 0.2;
                } else {
                    const rp = (progress - 0.60) / 0.40;
                    scale = 0.72 + rp * 0.28;
                    alpha = 0.5 + rp * 0.5;
                }
                ctx.translate(cx, cy);
                ctx.scale(scale, scale);
                ctx.translate(-cx, -cy);
                ctx.globalAlpha = alpha;
            }
        }

        ctx.save();
        if (this.attackAnimTimer > 0) {
            const p = 1 - this.attackAnimTimer / this.attackAnimMax;
            const recover = p > 0.55 ? 1 - (p - 0.55) / 0.45 : 1;
            const thrust = Math.sin(Math.min(1, p / 0.55) * Math.PI) * Math.max(0, recover);
            const cx = this.x - camera.x;
            const cy = this.y - camera.y;
            const dir = this.facing === 'left' ? -1 : 1;
            ctx.translate(cx + Math.cos(this.attackAngle || 0) * 8 * thrust, cy + Math.sin(this.attackAngle || 0) * 5 * thrust);
            ctx.scale(1 + 0.14 * thrust, 1 - 0.08 * thrust);
            ctx.rotate(dir * -0.10 * thrust);
            ctx.translate(-cx, -cy);
        } else if (this.attackCooldownTimer > 0 && this.attackCooldownTimer < 16 && this.state === 'chase') {
            const prep = 1 - this.attackCooldownTimer / 16;
            const cx = this.x - camera.x;
            const cy = this.y - camera.y;
            ctx.translate(cx, cy);
            ctx.scale(1 - 0.05 * prep, 1 + 0.07 * prep);
            ctx.translate(-cx, -cy);
        }

        SpriteEngine.draw(ctx, spriteKey, drawX, drawY, visW, visH, this.state !== 'idle' || this.attackAnimTimer > 0);
        ctx.restore();

        if (this.attackAnimTimer > 0) {
            const p = 1 - this.attackAnimTimer / this.attackAnimMax;
            const alpha = Math.sin(p * Math.PI);
            ctx.save();
            ctx.globalAlpha = alpha * 0.55;
            ctx.strokeStyle = this.debuffType === 'burn' ? '#ff6a00'
                : this.debuffType === 'poison' ? '#9cff2e'
                : this.debuffType === 'slow' ? '#b026ff'
                : '#ffdddd';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 8;
            ctx.shadowColor = ctx.strokeStyle;
            ctx.beginPath();
            ctx.arc(
                this.x - camera.x + Math.cos(this.attackAngle || 0) * 8,
                this.y - camera.y + Math.sin(this.attackAngle || 0) * 8,
                Math.max(visW, visH) * 0.42,
                (this.attackAngle || 0) - 0.55,
                (this.attackAngle || 0) + 0.55
            );
            ctx.stroke();
            ctx.restore();
        }

        // Zaman Yankısı: üstüne ismini yaz
        if (this._isTimeEcho) {
            ctx.restore();
            ctx.save();
            ctx.globalAlpha = 0.9;
            ctx.font = 'bold 8px monospace';
            ctx.fillStyle = '#00f0ff';
            ctx.textAlign = 'center';
            ctx.fillText('ZAMAN YANKISI', this.x - camera.x, this.y - camera.y - this.height / 2 - 14);
        }

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

        if (this._rangerMarked > 0) {
            const pulse = 0.45 + Math.sin(Date.now() / 120) * 0.25;
            ctx.save();
            ctx.globalAlpha = pulse;
            ctx.strokeStyle = '#00dcff';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00dcff';
            ctx.beginPath();
            ctx.arc(this.x - camera.x, this.y - camera.y, Math.max(this.width, this.height) * 0.55, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
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
        this.maxInventorySlots = 30;
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

        // Sınıf hareket kimlikleri
        this.moveVx = 0;           // Warrior momentum X hızı
        this.moveVy = 0;           // Warrior momentum Y hızı
        this.idleTimer = 0;        // Dur/bekle sayacı (idle behaviors)
        this.lastDx = 0;           // Son hareket yönü (stomp tespiti)
        this.lastDy = 0;

        // Ranger hassas avcı durum makinesi
        this.r_phase = 'idle';       // 'idle'|'draw'
        this.r_phaseTimer = 0;
        this.r_phaseMaxTimer = 15;
        this.r_skillAnimOnly = false;
        this.r_shadowTrail = [];     // [{x,y,a}] — karanlık siluet izi
        this.r_eyeGlow = 0;          // Nişan alırken göz parlaması (0→1)
        this.r_cloakTimer = 0;       // Pelerin partikülleri zamanlayıcı
        this.r_stepTimer = 0;        // Sessiz adım zamanlayıcı

        // Mage yasak kozmik büyü durum makinesi
        this.m_phase = 'idle';       // 'idle'|'charge'
        this.m_phaseTimer = 0;
        this.m_phaseMaxTimer = 18;
        this.m_skillAnimOnly = false;
        this.m_runeAngle = 0;        // Dönen rün halkası açısı
        this.m_runeRadius = 22;      // Rün halkası genişliği
        this.m_corruptTimer = 0;     // Bozulma partikülleri zamanlayıcı

        // Warrior ağır dövüş durum makinesi
        this.w_phase = 'idle';    // 'idle'|'windup'|'swing'|'recovery'
        this.w_phaseTimer = 0;
        this.w_hitLanded = false;
        this.w_isCritHit = false;
        this.w_trailPoints = [];   // Greatsword yörünge izi noktaları
        this.w_footTimer = 0;      // Ağır adım sesi zamanlayıcı
        this.w_emberTimer = 0;     // Kor partikülleri zamanlayıcı

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
        bonus += this.getItemSetBonuses().atk || 0;
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
        bonus += this.getItemSetBonuses().def || 0;
        let total = this.stats.def + bonus;
        const cls = window.GameEngine && window.GameEngine.selectedClass;
        if (cls === 'warrior') {
            const maxHp = this.getMaxHp ? this.getMaxHp() : this.stats.maxHp;
            if (maxHp > 0 && this.hp / maxHp <= 0.35) total += 6;
        }
        return total;
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
        bonus += this.getItemSetBonuses().hp || 0;
        return this.stats.maxHp + bonus;
    }

    // Ekipman ve bufflar dahil toplam hızı döner
    getTotalCrit() {
        let bonus = 0;
        for (const slot in this.equipment) {
            const item = this.equipment[slot];
            if (item && item.stats && item.stats.crit) bonus += item.stats.crit;
        }
        bonus += this.getItemSetBonuses().crit || 0;
        return this.stats.crit + bonus;
    }

    getItemSetBonuses() {
        const counts = { flame: 0, frost: 0, focus: 0, bulwark: 0, rare: 0, legendary: 0 };
        for (const slot in this.equipment) {
            const item = this.equipment[slot];
            if (!item) continue;
            const type = item.type || '';
            const effectType = item.effect && item.effect.type;
            if (item.rarity === 'rare') counts.rare++;
            if (item.rarity === 'legendary') counts.legendary++;
            if (effectType === 'burn' || effectType === 'burn_focus') counts.flame++;
            if (effectType === 'frost') counts.frost++;
            if (effectType === 'focus' || effectType === 'burn_focus') counts.focus++;
            if (type.startsWith('shield_') || type.startsWith('armor_') || type.startsWith('helmet_')) counts.bulwark++;
        }
        const bonus = { atk: 0, def: 0, hp: 0, crit: 0, spd: 0, names: [] };
        if (counts.legendary >= 6) {
            bonus.atk += 6;
            bonus.def += 3;
            bonus.crit += 5;
            bonus.names.push('Titan Seti: +6 Saldiri, +3 Defans, +5% Kritik');
        } else if (counts.rare >= 6) {
            bonus.atk += 3;
            bonus.def += 2;
            bonus.hp += 15;
            bonus.names.push('Sovalye Seti: +3 Saldiri, +2 Defans, +15 Can');
        }
        if (counts.flame >= 2) { bonus.atk += 3; bonus.names.push('Alev Seti: +3 Saldiri'); }
        if (counts.frost >= 2) { bonus.def += 2; bonus.names.push('Buz Seti: +2 Defans'); }
        if (counts.focus >= 2) { bonus.crit += 4; bonus.names.push('Run Seti: +4% Kritik'); }
        if (counts.bulwark >= 3) { bonus.hp += 20; bonus.def += 1; bonus.names.push('Muhafiz Seti: +20 Can, +1 Defans'); }
        return bonus;
    }

    getWeaponEffect() {
        const weapon = this.equipment && this.equipment.weapon;
        return weapon && weapon.effect ? weapon.effect : null;
    }

    _applyWeaponEffect(enemy, game, damage = 0, angle = 0) {
        const effect = this.getWeaponEffect();
        if (!effect || !enemy || !game || Math.random() > (effect.chance ?? 1)) return;

        if (effect.type === 'frost') {
            enemy.stunTimer = Math.max(enemy.stunTimer || 0, effect.duration || 36);
            enemy.hitStopTimer = Math.max(enemy.hitStopTimer || 0, 4);
            game.textParticles.push(new TextParticle(enemy.x, enemy.y - 24, 'YAVAS!', '#66d9ff', '8px', true));
            this._skillBurst(game, enemy.x, enemy.y, '#66d9ff', 6, 3);
        } else if (effect.type === 'burn' || effect.type === 'burn_focus') {
            enemy.burnedTimer = Math.max(enemy.burnedTimer || 0, effect.duration || 210);
            game.textParticles.push(new TextParticle(enemy.x, enemy.y - 24, 'YANIK!', '#ff6a00', '8px', true));
            this._skillBurst(game, enemy.x, enemy.y, '#ff6a00', 7, 3);
        }

        if (effect.type === 'focus' || effect.type === 'burn_focus') {
            this.qCooldown = Math.max(0, this.qCooldown - (effect.q || 12));
            this.wCooldown = Math.max(0, this.wCooldown - (effect.w || 18));
            game.textParticles.push(new TextParticle(this.x, this.y - 30, 'ODAK', '#9b30ff', '8px', true));
        }

        if (effect.type === 'lifesteal') {
            const heal = Math.max(1, Math.floor(damage * (effect.rate || 0.08)));
            this.hp = Math.min(this.getMaxHp(), this.hp + heal);
            game.textParticles.push(new TextParticle(this.x, this.y - 26, `+${heal} CAN`, '#39ff14', '8px', true));
        }
    }

    getTotalSpd() {
        let bonus = 0;
        for (const slot in this.equipment) {
            const item = this.equipment[slot];
            if (item && item.stats && item.stats.spd) {
                bonus += item.stats.spd;
            }
        }
        bonus += this.getItemSetBonuses().spd || 0;
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
        const _cls = window.GameEngine && window.GameEngine.selectedClass;
        const isWarrior = _cls === 'warrior';
        const isRanger  = _cls === 'ranger';
        const isMage    = _cls === 'mage';

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

            // ── SINIF KİMLİKLİ DASH VİZÜEL ──────────────────────────────────
            if (isWarrior) {
                // SAVAŞÇI: Ağır zemin darbesi — toz + ember patlaması
                for (let p = 0; p < 5; p++) {
                    game.particles.push(new Particle(
                        this.x + (Math.random()-0.5) * 12,
                        this.y + 14 + Math.random() * 6,
                        p < 2 ? '#ff6600' : 'rgba(100,80,60,0.5)',
                        -this.dashDirection.x * (1+Math.random()*2) + (Math.random()-0.5)*2,
                        -1.5 - Math.random() * 2,
                        Math.random() * 5 + 2, 18
                    ));
                }
                this.moveVx = this.dashDirection.x * this.getTotalSpd() * this.dashSpeedMultiplier;
                this.moveVy = this.dashDirection.y * this.getTotalSpd() * this.dashSpeedMultiplier;
            } else if (isRanger) {
                // NİŞANCI: Hayalet göz kırpma — başlangıç noktasında karanlık siluet
                this.r_shadowTrail.push({ x: this.x, y: this.y, a: 0.85 });
                this.r_shadowTrail.push({ x: this.x + (Math.random()-0.5)*6, y: this.y + (Math.random()-0.5)*4, a: 0.60 });
                // Hız çizgileri (başlangıç yönüne karşı)
                for (let p = 0; p < 4; p++) {
                    game.particles.push(new Particle(
                        this.x - this.dashDirection.x * p * 8 + (Math.random()-0.5)*4,
                        this.y - this.dashDirection.y * p * 8 + (Math.random()-0.5)*4,
                        'rgba(0,180,220,0.35)',
                        -this.dashDirection.x * (0.5+Math.random()*0.5),
                        -this.dashDirection.y * (0.5+Math.random()*0.5),
                        1 + Math.random() * 2, 10
                    ));
                }
            } else if (isMage) {
                // BÜYÜCÜ: Yokluk portalı — ayrılış ve varış noktasında halka
                for (let p = 0; p < 10; p++) {
                    const ang = (p / 10) * Math.PI * 2;
                    game.particles.push(new Particle(
                        this.x + Math.cos(ang) * 16,
                        this.y + Math.sin(ang) * 16,
                        p % 2 === 0 ? '#9b30ff' : '#ffd700',
                        -Math.cos(ang) * 2.5,
                        -Math.sin(ang) * 2.5,
                        Math.random() * 3 + 1, 16
                    ));
                }
            } else {
                // Varsayılan: Neon cyan izi
                for (let p = 0; p < 2; p++) {
                    game.particles.push(new Particle(
                        this.x + (Math.random()-0.5) * 10,
                        this.y + (Math.random()-0.5) * 10,
                        'rgba(0,240,255,0.45)',
                        -this.dashDirection.x * 2 + (Math.random()-0.5) * 1,
                        -this.dashDirection.y * 2 + (Math.random()-0.5) * 1,
                        Math.random() * 5 + 3, 15
                    ));
                }
            }
        } else {
            // ── SINIF KİMLİKLİ HAREKET SİSTEMİ ──────────────────────────────
            const totalSpd = this.getTotalSpd();
            this.isMoving = dx !== 0 || dy !== 0;

            if (isWarrior) {
                // SAVAŞÇI: Momentum — ağır ivmelenme ve frenleme
                const accel   = 0.15;
                const friction = this.isMoving ? 0.20 : 0.30;
                this.moveVx += (dx * totalSpd - this.moveVx) * accel;
                this.moveVy += (dy * totalSpd - this.moveVy) * accel;
                this.moveVx *= (1 - friction);
                this.moveVy *= (1 - friction);

                if (Math.abs(this.moveVx) > 0.1 || Math.abs(this.moveVy) > 0.1) {
                    const nx = this.x + this.moveVx;
                    const ny = this.y + this.moveVy;
                    if (!World.checkCircleCollision(nx, this.y, this.radius)) this.x = nx;
                    if (!World.checkCircleCollision(this.x, ny, this.radius)) this.y = ny;
                    if (this.moveVx > 0.3) this.facing = 'right';
                    if (this.moveVx < -0.3) this.facing = 'left';
                }

                // Yön değiştirince toprak darbesi
                const turned = (dx !== 0 && Math.sign(dx) !== Math.sign(this.lastDx)) ||
                               (dy !== 0 && Math.sign(dy) !== Math.sign(this.lastDy));
                if (turned && Math.abs(this.moveVx) > 1.2) {
                    for (let p = 0; p < 3; p++) {
                        game.particles.push(new Particle(
                            this.x, this.y + 16,
                            'rgba(90,70,50,0.55)',
                            (Math.random() - 0.5) * 3, -0.8 - Math.random() * 0.8,
                            Math.random() * 5 + 3, 16
                        ));
                    }
                }

            } else if (isMage) {
                // BÜYÜCÜ: Yumuşak süzülme — hafif momentum, büyülü hava
                const accel = 0.22;
                this.moveVx += (dx * totalSpd - this.moveVx) * accel;
                this.moveVy += (dy * totalSpd - this.moveVy) * accel;
                if (!this.isMoving) { this.moveVx *= 0.88; this.moveVy *= 0.88; }

                const nx = this.x + this.moveVx;
                const ny = this.y + this.moveVy;
                if (!World.checkCircleCollision(nx, this.y, this.radius)) this.x = nx;
                if (!World.checkCircleCollision(this.x, ny, this.radius)) this.y = ny;
                if (this.moveVx > 0.3) this.facing = 'right';
                if (this.moveVx < -0.3) this.facing = 'left';

            } else {
                // NİŞANCI + varsayılan: anlık ivme, sıfır gecikme
                if (this.isMoving) {
                    const nx = this.x + dx * totalSpd;
                    const ny = this.y + dy * totalSpd;
                    if (!World.checkCircleCollision(nx, this.y, this.radius)) this.x = nx;
                    if (!World.checkCircleCollision(this.x, ny, this.radius)) this.y = ny;
                    if (dx > 0) this.facing = 'right';
                    if (dx < 0) this.facing = 'left';
                }
            }

            // İz partikülleri — sınıfa göre farklı
            if (this.isMoving) {
                if (isWarrior && Math.random() < 0.06) {
                    game.particles.push(new Particle(
                        this.x, this.y + 16,
                        'rgba(120,100,70,0.3)',
                        (Math.random()-0.5)*1.2, -0.3-Math.random()*0.4,
                        Math.random()*4+2, 14
                    ));
                } else if (!isWarrior && !isMage && !isRanger && Math.random() < 0.08) {
                    game.particles.push(new Particle(
                        this.x, this.y + 16,
                        'rgba(150,150,170,0.25)',
                        (Math.random()-0.5)*1, -0.2-Math.random()*0.5,
                        Math.random()*4+2, 15
                    ));
                }
            }

            // Durağan sayaç
            this.idleTimer = this.isMoving ? 0 : this.idleTimer + 1;
        }

        this.lastDx = dx;
        this.lastDy = dy;

        // Animasyon Zamanlayıcı
        if (this.isMoving) {
            this.animTimer++;
            if (this.animTimer >= 20) {
                this.animFrame = this.animFrame === 1 ? 2 : 1;
                this.animTimer = 0;
            }
        } else {
            this.animFrame = 1;
        }

        // ── SINIF BEKLEME DAVRANIŞLARI (IDLE BEHAVIORS) ──────────────────────
        if (this.idleTimer > 60) {
            if (isWarrior && this.idleTimer % 85 === 0) {
                // Zırh parıltısı — altın yansıma
                game.particles.push(new Particle(
                    this.x + (Math.random()-0.5)*14,
                    this.y - 8 + (Math.random()-0.5)*14,
                    `rgba(255,200,60,${0.3+Math.random()*0.3})`,
                    (Math.random()-0.5)*0.8, -0.4-Math.random()*0.4,
                    Math.random()*3+1, 20
                ));
            }
            if (isWarrior && this.idleTimer % 240 === 0) {
                SoundEngine.playArmorBreath();
            }
            if (isRanger && this.idleTimer % 130 === 0) {
                // Avcı taraması — göz parlaması + rüzgar fısıltısı
                this.r_eyeGlow = 0.75;
                SoundEngine.playWindWhisper();
            }
            if (isRanger && this.r_eyeGlow > 0) {
                this.r_eyeGlow = Math.max(0, this.r_eyeGlow - 0.04);
            }
            if (isMage && this.idleTimer % 100 === 0) {
                SoundEngine.playRuneAmbient();
            }
        }

        // Warrior: ağır adım sesi + kor partikülleri
        if (isWarrior) {
            if (this.isMoving) {
                this.w_footTimer++;
                if (this.w_footTimer >= 22) {
                    this.w_footTimer = 0;
                    SoundEngine.playHeavyFootstep();
                    game.particles.push(new Particle(
                        this.x, this.y + 18,
                        'rgba(80,60,40,0.45)',
                        (Math.random() - 0.5) * 2, -0.6,
                        Math.random() * 5 + 3, 18
                    ));
                }
            }
            this.w_emberTimer++;
            if (this.w_emberTimer >= 10) {
                this.w_emberTimer = 0;
                const ec = ['#ff4400', '#ff8800', '#ffcc00'][Math.floor(Math.random() * 3)];
                game.particles.push(new Particle(
                    this.x + (Math.random() - 0.5) * 22,
                    this.y + (Math.random() - 0.5) * 22,
                    ec,
                    (Math.random() - 0.5) * 1.5,
                    -1.8 - Math.random() * 1.5,
                    Math.random() * 2 + 1,
                    22 + Math.random() * 14
                ));
            }
        }

        // Ranger: gölge siluet izi + pelerin partikülleri + sessiz adım
        if (isRanger) {
            // Siluet izini güncelle
            if (this.isMoving) {
                this.r_shadowTrail.push({ x: this.x, y: this.y, a: 0.55 });
                if (this.r_shadowTrail.length > 9) this.r_shadowTrail.shift();
            }
            this.r_shadowTrail = this.r_shadowTrail
                .map(p => ({ ...p, a: p.a * 0.78 }))
                .filter(p => p.a > 0.03);

            // Pelerin partikülleri (hareket ederken)
            if (this.isMoving) {
                this.r_cloakTimer++;
                if (this.r_cloakTimer >= 6) {
                    this.r_cloakTimer = 0;
                    const trailX = this.x - Math.cos(this.facing === 'right' ? 0 : Math.PI) * 10;
                    game.particles.push(new Particle(
                        trailX + (Math.random() - 0.5) * 8,
                        this.y + 8 + (Math.random() - 0.5) * 6,
                        `rgba(15,8,35,${0.3 + Math.random() * 0.25})`,
                        (this.facing === 'right' ? -0.6 : 0.6) + (Math.random() - 0.5) * 0.4,
                        -0.3 - Math.random() * 0.4,
                        Math.random() * 5 + 3, 18
                    ));
                }
                // Sessiz adım sesi
                this.r_stepTimer++;
                if (this.r_stepTimer >= 26) {
                    this.r_stepTimer = 0;
                    SoundEngine.playShadowStep();
                    // Neredeyse görünmez toz
                    game.particles.push(new Particle(
                        this.x, this.y + 18,
                        'rgba(100,80,130,0.18)',
                        (Math.random() - 0.5) * 1.2, -0.3,
                        Math.random() * 3 + 2, 12
                    ));
                }
            }
            this._rangerUpdatePhase(game);
        }

        // Mage: sürekli bozulma partikülleri + rün açısı
        if (isMage) {
            this.m_runeAngle += 0.045;
            this.m_corruptTimer++;
            if (this.m_corruptTimer >= 8) {
                this.m_corruptTimer = 0;
                const corrupt = Math.random() < 0.55 ? '#9b30ff' : '#ffd700';
                const ang = Math.random() * Math.PI * 2;
                const dist = 12 + Math.random() * 18;
                game.particles.push(new Particle(
                    this.x + Math.cos(ang) * dist,
                    this.y + Math.sin(ang) * dist,
                    corrupt,
                    (Math.random() - 0.5) * 0.9,
                    -1.0 - Math.random() * 1.4,
                    Math.random() * 2 + 1,
                    22 + Math.random() * 14
                ));
            }
            this._mageUpdatePhase(game);
        }

        // Warrior faz sistemi güncellemesi
        if (isWarrior) this._warriorUpdatePhase(game);

        // 2. FARE SALDIRI KONTROLÜ
        const canAttack = this.attackCooldownTimer === 0 && !this.isAttacking
            && (!isWarrior || this.w_phase === 'idle')
            && (!isRanger  || this.r_phase === 'idle')
            && (!isMage    || this.m_phase === 'idle');
        if (mouse.clicked && canAttack) {
            this.performAttack(mouse.x, mouse.y, game);
        }

        // Saldırı animasyon süresi kontrolü — faz sistemli sınıflar kendisi yönetir
        if (this.isAttacking && !isWarrior && !isRanger && !isMage) {
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

        // Canvas pikselini dünya koordinatına çevir, sonra saldırı açısını hesapla.
        // Mouse.x/y canvas buffer pikselindedir; ctx.scale(zoom) uygulandığından
        // piksel / zoom + kamera = dünya koordinatı.
        const wm = World.screenToWorld(mouseX, mouseY);
        this.attackAngle = Math.atan2(wm.y - this.y, wm.x - this.x);

        const _atkCls = window.GameEngine && window.GameEngine.selectedClass;

        // Ranger — yay germe faz sistemi
        const isRangerAtk = _atkCls === 'ranger';
        if (isRangerAtk && isBow) {
            this.facing = Math.cos(this.attackAngle) > 0 ? 'right' : 'left';
            this.r_phase = 'draw';
            this.r_phaseTimer = 15;
            this.r_phaseMaxTimer = 15;
            this.r_skillAnimOnly = false;
            this.r_eyeGlow = 0;
            this.isAttacking = true;
            this.attackTimer = 0;
            this.attackCooldownTimer = 30;
            SoundEngine.playBowDraw();
            return;
        }

        // Mage — rün yükleme faz sistemi
        const isMageAtk = _atkCls === 'mage';
        if (isMageAtk && !isBow) {
            this.facing = Math.cos(this.attackAngle) > 0 ? 'right' : 'left';
            this.m_phase = 'charge';
            this.m_phaseTimer = 18;
            this.m_phaseMaxTimer = 18;
            this.m_skillAnimOnly = false;
            this.m_runeRadius = 20;
            this.isAttacking = true;
            this.attackTimer = 0;
            this.attackCooldownTimer = 38;
            SoundEngine.playRuneCharge();
            return;
        }

        // Warrior ağır saldırı — faz sistemi üzerinden başlat
        const isWarrior = _atkCls === 'warrior';
        if (isWarrior && !isBow) {
            this.facing = Math.cos(this.attackAngle) > 0 ? 'right' : 'left';
            this.w_phase = 'windup';
            this.w_phaseTimer = 10;
            this.w_hitLanded = false;
            this.w_isCritHit = false;
            this.w_trailPoints = [];
            this.attackCooldownTimer = 55;
            SoundEngine.playWarriorWindup();
            return;
        }

        // Oyuncuyu kılıç salladığı / ok attığı yöne döndür
        this.facing = Math.cos(this.attackAngle) > 0 ? 'right' : 'left';

        if (isBow) {
            // MENZİLLİ SALDIRI (OK ATMA)
            SoundEngine.playArcherAttack();

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

        // YAKIN DÖVÜŞ (KILIÇ / ASA SAVURMA)
        this.isAttacking = true;
        this.attackTimer = 0;
        this.attackCooldownTimer = this.rapidAttackActive ? 12 : this.attackCooldown;

        const isStaff = this.equipment.weapon && this.equipment.weapon.type.includes('staff');
        if (isStaff) SoundEngine.playMageAttack(); else SoundEngine.playSwing();

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

                    if (Math.random() * 100 < this.getTotalCrit()) {
                        damage *= 2;
                        isCrit = true;
                        game.triggerScreenShake(8);
                        SoundEngine.playCritical();
                    }

                    // Düşmana hasar ver (knockback çarpanı dahil)
                    enemy.takeDamage(damage, this.attackAngle, game, isCrit ? kbMult * 3 : kbMult);
                    this._applyWeaponEffect(enemy, game, damage, this.attackAngle);

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
        if (window.GameEngine && window.GameEngine._godMode) return;

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
            SoundEngine.playGoldPick();
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
            const stackableTypes = ['potion_red', 'potion_blue', 'potion_big', 'gold_key'];
            if (stackableTypes.includes(item.type) || item.type.startsWith('stone_shard_') || item.type.startsWith('stone_')) {
                const existing = this.inventory.find(i => i.type === item.type);
                if (existing) {
                    existing.count = (existing.count || 1) + 1;
                    SoundEngine.playItemPick();
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
                effect: item.effect,
                sockets: item.sockets || [],
                socketLimit: item.socketLimit || (item.rarity === 'mythic' ? 2 : item.rarity === 'legendary' ? 1 : 0),
                description: item.description,
                count: 1
            });

            SoundEngine.playItemPick();

            // Uçan metin göster
            let rColor = 'var(--text-primary)';
            if (item.rarity === 'rare') rColor = 'var(--rarity-rare)';
            else if (item.rarity === 'epic') rColor = 'var(--rarity-epic)';
            else if (item.rarity === 'legendary') rColor = 'var(--rarity-legendary)';
            else if (item.rarity === 'mythic') rColor = 'var(--rarity-mythic)';

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
            this._applyClassLevelPassive(game);

            // Seviye Atlama Fanfarı
            SoundEngine.playLevelUp();
            game.addLog(`SEVİYE ATLADIN! Artık Seviye ${this.level} Şövalyesisin!`, "level");
            // Diyalog seviye eventi
            if (window.DialogSystem) {
                if (this.level === 5)  setTimeout(() => DialogSystem.triggerEvent('level_up_5'),  500);
                if (this.level === 10) setTimeout(() => DialogSystem.triggerEvent('level_up_10'), 500);
                // Sınıfa özel fısıltı (her seviye atlamada)
                const cls = window.GameEngine && window.GameEngine.selectedClass;
                if (cls) setTimeout(() => DialogSystem.triggerClassLevelUp(cls), 1200);
            }

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

    _applyClassLevelPassive(game) {
        const cls = (window.GameEngine && window.GameEngine.selectedClass) || 'warrior';
        if (cls === 'warrior') {
            this.stats.maxHp += 4;
            if (this.level % 2 === 0) this.stats.def += 1;
            this.hp = Math.min(this.getMaxHp(), this.hp + 4);
            game.addLog("PASIF: Savasci dayanıklılığı arttı. +4 Can, her 2 seviyede +1 Def.", "level");
        } else if (cls === 'ranger') {
            this.stats.spd += 0.06;
            if (this.level % 2 === 0) this.attackCooldown = Math.max(10, this.attackCooldown - 1);
            game.addLog("PASIF: Okcu çevikliği arttı. Hız ve zamanla saldırı ritmi gelişiyor.", "level");
        } else if (cls === 'mage') {
            this.stats.atk += 2;
            this.qMaxCooldown = Math.max(420, Math.floor(this.qMaxCooldown * 0.97));
            this.wMaxCooldown = Math.max(540, Math.floor(this.wMaxCooldown * 0.97));
            game.addLog("PASIF: Buyucu gucu arttı. +2 saldırı ve sınırlı cooldown azalması.", "level");
        }
    }

    // Envanterden Eşya Kuşanma veya İksir Kullanma
    _weaponClassRequirement(item) {
        if (!item || !item.type) return null;
        if (item.type.startsWith('sword_')) return 'warrior';
        if (item.type.startsWith('bow_')) return 'ranger';
        if (item.type.startsWith('staff_')) return 'mage';
        if (item.type.startsWith('dagger_')) return 'none';
        return null;
    }

    _classDisplayName(cls) {
        if (cls === 'warrior') return 'Savasci';
        if (cls === 'ranger') return 'Okcu';
        if (cls === 'mage') return 'Buyucu';
        return 'Bu sinif';
    }

    canEquipItem(item, game = null) {
        const requiredClass = this._weaponClassRequirement(item);
        if (!requiredClass) return true;
        const cls = (game && game.selectedClass) || this._skillClass();
        return requiredClass !== 'none' && requiredClass === cls;
    }

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

        else if (item.type && item.type.startsWith('stone_') && !item.type.startsWith('stone_shard_')) {
            const stoneKey = item.type.replace('stone_', '');
            const defs = {
                ruby: { slot: 'weapon', label: 'Yakut', stat: 'atk', val: 3 },
                sapphire: { slot: 'weapon', label: 'Safir', stat: 'crit', val: 4 },
                emerald: { slot: 'armor', label: 'Zumrut', stat: 'hp', val: 18 },
                obsidian: { slot: 'armor', label: 'Obsidyen', stat: 'def', val: 2 }
            };
            const def = defs[stoneKey];
            const target = def && this.equipment[def.slot];
            if (!def || !target) {
                game.addLog("Bu tasi takmak icin uygun ekipman kusanmiyorsun.", "system");
                return;
            }
            target.sockets = target.sockets || [];
            target.socketLimit = target.socketLimit || (target.rarity === 'mythic' ? 2 : target.rarity === 'legendary' ? 1 : 0);
            if (target.socketLimit <= 0) {
                game.addLog("Bu ekipmanda tas yuvasi yok. Taslar sadece turuncu ve kizil ekipmana takilir.", "system");
                return;
            }
            if (target.sockets.length >= target.socketLimit) {
                game.addLog("Bu ekipmanin tas yuvalari dolu.", "system");
                return;
            }
            if (target.sockets.includes(stoneKey)) {
                game.addLog("Ayni tas bu ekipmana ikinci kez takilamaz.", "system");
                return;
            }
            target.sockets.push(stoneKey);
            target.stats = target.stats || {};
            target.stats[def.stat] = (target.stats[def.stat] || 0) + def.val;
            target.description += ` [${def.label} Tasi: +${def.val} ${def.stat.toUpperCase()}]`;
            if ((item.count || 1) > 1) { item.count--; } else { this.inventory.splice(itemIndex, 1); }
            if (SoundEngine.playForge) SoundEngine.playForge(); else SoundEngine.playChestOpen();
            game.addLog(`${def.label} tasi [${target.name}] ekipmanina takildi.`, "loot");
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
                if (slot === 'weapon' && !this.canEquipItem(item, game)) {
                    const requiredClass = this._weaponClassRequirement(item);
                    const owner = requiredClass === 'none' ? 'hicbir sinif' : this._classDisplayName(requiredClass);
                    game.addLog(`${item.name} kusanilamaz. Bu silah ${owner} icin.`, "system");
                    game.textParticles.push(new TextParticle(this.x, this.y - 24, "UYUMSUZ SILAH", '#ff453a', "9px", true));
                    return;
                }

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

                SoundEngine.playEquip(slot, item.type);
                game.addLog(`[${item.name}] kuşandın! RPG niteliklerin güncellendi.`, "loot");
            }
        }

        // Arayüz güncelle
        game.updateUI();
    }

    _skillClass() {
        return (window.GameEngine && window.GameEngine.selectedClass) || 'warrior';
    }

    _angleDiff(a, b) {
        let d = a - b;
        while (d < -Math.PI) d += Math.PI * 2;
        while (d > Math.PI) d -= Math.PI * 2;
        return Math.abs(d);
    }

    _skillTarget(maxRange = 260, cone = Math.PI * 0.7) {
        const game = window.GameEngine;
        if (!game || !game.enemies) return null;
        const aim = this.attackAngle || (this.facing === 'left' ? Math.PI : 0);
        let best = null;
        let bestScore = Infinity;
        for (const enemy of game.enemies) {
            if (!enemy || enemy.hp <= 0) continue;
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const dist = Math.hypot(dx, dy);
            if (dist > maxRange) continue;
            const diff = this._angleDiff(Math.atan2(dy, dx), aim);
            if (diff > cone) continue;
            const score = dist + diff * 90;
            if (score < bestScore) {
                best = enemy;
                bestScore = score;
            }
        }
        if (!best) {
            best = [...game.enemies]
                .filter(e => e && e.hp > 0 && Math.hypot(e.x - this.x, e.y - this.y) <= maxRange)
                .sort((a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y))[0] || null;
        }
        return best;
    }

    _skillBurst(game, x, y, color, count = 14, radius = 4) {
        for (let p = 0; p < count; p++) {
            const a = (p / count) * Math.PI * 2;
            const spd = 1.5 + Math.random() * 3.5;
            game.particles.push(new Particle(
                x + Math.cos(a) * radius,
                y + Math.sin(a) * radius,
                color,
                Math.cos(a) * spd,
                Math.sin(a) * spd,
                Math.random() * 4 + 2,
                24 + Math.random() * 12
            ));
        }
    }

    _damageSkillTarget(enemy, amount, game, color, label, knockbackAngle = null) {
        if (!enemy) return false;
        const angle = knockbackAngle ?? Math.atan2(enemy.y - this.y, enemy.x - this.x);
        enemy.takeDamage(amount, angle, game, enemy instanceof Boss ? 0.5 : 1.4);
        game.textParticles.push(new TextParticle(enemy.x, enemy.y - 18, label || `${amount}`, color, "10px", true));
        this._skillBurst(game, enemy.x, enemy.y, color, 12, 4);
        return true;
    }

    _useClassSingleTarget(game) {
        if (this.hp <= 0 || game.state !== 'playing') return;
        if (this.qCooldown > 0) {
            game.addLog("Tek hedef yetenegin henuz hazir degil!", "system");
            return;
        }

        const cls = this._skillClass();
        const target = this._skillTarget(cls === 'ranger' ? 360 : 240, cls === 'mage' ? Math.PI : Math.PI * 0.55);
        if (!target) {
            game.addLog("Yetenek icin menzilde hedef yok.", "system");
            return;
        }

        this.qCooldown = this.qMaxCooldown;
        const angle = Math.atan2(target.y - this.y, target.x - this.x);
        this.attackAngle = angle;
        this.facing = Math.cos(angle) > 0 ? 'right' : 'left';

        if (cls === 'warrior') {
            this.isAttacking = true;
            this.attackTimer = 0;
            this.w_phase = 'windup';
            this.w_phaseTimer = 8;
            this.w_hitLanded = true;
            this.w_trailPoints = [];
            const dmg = Math.floor(this.getTotalAtk() * 2.35);
            this._damageSkillTarget(target, dmg, game, '#ffb13b', `KIRICI ${dmg}`, angle);
            target.stunTimer = Math.max(target.stunTimer || 0, target instanceof Boss ? 18 : 55);
            target.hitStopTimer = Math.max(target.hitStopTimer || 0, 6);
            game.triggerScreenShake(12);
            SoundEngine.playBossSlap();
            game.addLog("Q: Kalkan Kiran tek hedefe agir hasar ve sersemletme uyguladi.", "loot");
        } else if (cls === 'ranger') {
            this.isAttacking = true;
            this.attackTimer = 0;
            this.r_phase = 'draw';
            this.r_phaseTimer = 18;
            this.r_phaseMaxTimer = 18;
            this.r_skillAnimOnly = true;
            this.r_eyeGlow = 1;
            const dmg = Math.floor(this.getTotalAtk() * 1.9);
            target._rangerMarked = 360;
            game.projectiles.push(new Projectile(this.x, this.y, angle, 'piercing_arrow', dmg, 'legendary'));
            game.textParticles.push(new TextParticle(this.x, this.y - 22, "DELİCİ OK!", '#00dcff', "11px", true));
            this._skillBurst(game, this.x, this.y, '#00dcff', 10, 8);
            SoundEngine.playArcherAttack();
            game.addLog("Q: Dev delici ok firlatildi. Ilk hedef isaretlenir, arkadakiler daha az hasar alir.", "loot");
        } else {
            this.isAttacking = true;
            this.attackTimer = 0;
            this.m_phase = 'charge';
            this.m_phaseTimer = 26;
            this.m_phaseMaxTimer = 26;
            this.m_skillAnimOnly = true;
            this.m_runeRadius = 30;
            const dmg = Math.floor(this.getTotalAtk() * 2.0);
            game.projectiles.push(new Projectile(this.x, this.y, angle, 'fireball', dmg, 'rare'));
            game.textParticles.push(new TextParticle(this.x, this.y - 22, "ATEŞ TOPU!", '#ff6a00', "11px", true));
            this._skillBurst(game, this.x, this.y, '#ff6a00', 12, 8);
            SoundEngine.playMageAttack();
            game.addLog("Q: Büyük ateş topu atıldı. Hedefi yakar ve küçük alanda patlar.", "loot");
        }

        game.updateUI();
    }

    _useClassArea(game) {
        if (this.hp <= 0 || game.state !== 'playing') return;
        if (this.wCooldown > 0) {
            game.addLog("Alan yetenegin henuz hazir degil!", "system");
            return;
        }

        const cls = this._skillClass();
        this.wCooldown = this.wMaxCooldown;

        if (cls === 'warrior') {
            const aim = this.attackAngle || (this.facing === 'left' ? Math.PI : 0);
            this.isAttacking = true;
            this.attackTimer = 0;
            this.attackAngle = aim;
            this.facing = Math.cos(aim) > 0 ? 'right' : 'left';
            this.w_phase = 'windup';
            this.w_phaseTimer = 10;
            this.w_hitLanded = true;
            this.w_trailPoints = [];
            const tx = this.x + Math.cos(aim) * 80;
            const ty = this.y + Math.sin(aim) * 80;
            game.projectiles.push(new WeaponRainProjectile(tx, ty - 380, tx, ty, Math.floor(this.getTotalAtk() * 1.85), 'sword'));
            this._skillBurst(game, this.x, this.y, '#ffb13b', 18, 10);
            SoundEngine.playBossRoar();
            game.textParticles.push(new TextParticle(this.x, this.y - 24, "GÖK KILICI!", '#ffb13b', "11px", true));
            game.addLog("R: Gok Kilici havaya firlatildi; dustugunde alan hasari verir.", "loot");
        } else if (cls === 'ranger') {
            this.isAttacking = true;
            this.attackTimer = 0;
            this.r_phase = 'draw';
            this.r_phaseTimer = 22;
            this.r_phaseMaxTimer = 22;
            this.r_skillAnimOnly = true;
            this.r_eyeGlow = 1;
            const targets = [];
            const sorted = [...game.enemies].filter(e => e && e.hp > 0)
                .sort((a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y));
            for (let i = 0; i < Math.min(5, sorted.length); i++) targets.push({ x: sorted[i].x, y: sorted[i].y });
            while (targets.length < 5) {
                const a = Math.random() * Math.PI * 2;
                const d = 50 + Math.random() * 120;
                targets.push({ x: this.x + Math.cos(a) * d, y: this.y + Math.sin(a) * d });
            }
            targets.forEach((target, index) => {
                setTimeout(() => {
                    if (game.state !== 'playing') return;
                    game.projectiles.push(new WeaponRainProjectile(target.x, target.y - 340, target.x, target.y, Math.floor(this.getTotalAtk() * 1.35), 'arrow'));
                }, index * 110);
            });
            SoundEngine.playBossRoar();
            game.textParticles.push(new TextParticle(this.x, this.y - 24, "OK YAGMURU!", '#00dcff', "11px", true));
            game.addLog("R: Ok Yagmuru en yakin hedeflerin uzerine coklu atis indirdi.", "loot");
        } else {
            const aim = this.attackAngle || 0;
            this.isAttacking = true;
            this.attackTimer = 0;
            this.m_phase = 'charge';
            this.m_phaseTimer = 38;
            this.m_phaseMaxTimer = 38;
            this.m_skillAnimOnly = true;
            this.m_runeRadius = 38;
            const target = this._skillTarget(320, Math.PI) || { x: this.x + Math.cos(aim) * 120, y: this.y + Math.sin(aim) * 120 };
            game.projectiles.push(new MeteorProjectile(target.x, target.y, Math.floor(this.getTotalAtk() * 2.25)));
            SoundEngine.playVoidCast();
            game.textParticles.push(new TextParticle(this.x, this.y - 24, "METEOR!", '#ff6a00', "11px", true));
            game.addLog("R: Meteor cagirdin. Uyari halkasindan sonra genis alanda patlar ve yakar.", "loot");
        }

        game.updateUI();
    }

    useSkillQ(game) {
        this._useClassSingleTarget(game);
        return;
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
        this._useClassArea(game);
        return;
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
        // PNG sprite'ları collision kutusundan biraz büyük çizilir, ama boss ölçeğine yaklaşmaz.
        const cls = (window.GameEngine && window.GameEngine.selectedClass) || 'warrior';
        const clsPrefix = SpriteEngine.pngCache[`${cls}_idle1`] ? cls : 'player';
        const hasPNG = clsPrefix !== 'player';
        const classScale = { warrior: 1.65, ranger: 1.65, mage: 1.22 };
        const scale  = hasPNG ? (classScale[cls] || 1.65) : 1.0;
        const visW   = this.width  * scale;
        const visH   = this.height * scale;

        // BÜYÜCÜ: Yüzme salınımı — Y ekseni üzerinde hafif hover
        const floatOffsetY = (cls === 'mage')
            ? Math.sin(Date.now() / 480) * 3.5
            : 0;

        const drawX  = this.x - camera.x - visW / 2;
        const drawY  = this.y - camera.y - visH / 2 + floatOffsetY;

        ctx.save();

        // Hasar alındığında şövalyeyi kırmızı yanıp söndür (Dokunulmazlık karesi)
        if (this.invincibleTimer > 0) {
            if (Math.floor(this.invincibleTimer / 4) % 2 === 0) {
                ctx.globalAlpha = 0.4;
                ctx.filter = 'brightness(1.5) sepia(1) hue-rotate(-50deg) saturate(5)';
            }
        }

        // 1. Oyuncu Sprite'ını Çiz — seçili sınıfa özel PNG varsa onu kullan
        let spriteKey = this.isMoving ? `${clsPrefix}_walk${this.animFrame}` : `${clsPrefix}_idle${this.animFrame}`;
        if (this.isAttacking) {
            spriteKey = `${clsPrefix}_attack`;
        }
        if (this.facing === 'left') {
            spriteKey += '_flipped';
        }

        SpriteEngine.draw(ctx, spriteKey, drawX, drawY, visW, visH, this.isMoving);
        ctx.restore();

        const _drawCls = window.GameEngine && window.GameEngine.selectedClass;

        // RANGER: Gölge siluet izi
        if (_drawCls === 'ranger' && this.r_shadowTrail.length > 0) {
            ctx.save();
            this.r_shadowTrail.forEach((pt, i) => {
                ctx.globalAlpha = pt.a * 0.45;
                ctx.fillStyle = '#0d0520';
                ctx.beginPath();
                ctx.ellipse(
                    pt.x - camera.x, pt.y - camera.y + 6,
                    10 * (i / this.r_shadowTrail.length), 15 * (i / this.r_shadowTrail.length),
                    0, 0, Math.PI * 2
                );
                ctx.fill();
            });
            ctx.restore();
        }

        // RANGER: Nişan göz parlaması
        if (_drawCls === 'ranger' && this.r_eyeGlow > 0.05) {
            ctx.save();
            const eyeOffX = this.facing === 'right' ? 7 : -7;
            const eyeX = this.x - camera.x + eyeOffX;
            const eyeY = this.y - camera.y - 12;
            ctx.globalAlpha = this.r_eyeGlow;
            const eg = ctx.createRadialGradient(eyeX, eyeY, 0, eyeX, eyeY, 9);
            eg.addColorStop(0, 'rgba(0, 220, 255, 1.0)');
            eg.addColorStop(0.4, 'rgba(0, 120, 255, 0.6)');
            eg.addColorStop(1,   'rgba(0, 40, 200, 0)');
            ctx.fillStyle = eg;
            ctx.beginPath();
            ctx.arc(eyeX, eyeY, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // RANGER: Yay germe nişan göstergesi (nişan çarpı)
        if (_drawCls === 'ranger' && this.r_phase === 'draw') {
            ctx.save();
            const prog = Math.max(0, Math.min(1, 1 - this.r_phaseTimer / (this.r_phaseMaxTimer || 15)));
            const aimDist = 32 + prog * 10;
            const aimX = this.x - camera.x + Math.cos(this.attackAngle) * aimDist;
            const aimY = this.y - camera.y + Math.sin(this.attackAngle) * aimDist;
            ctx.globalAlpha = 0.35 + prog * 0.55;
            ctx.strokeStyle = '#00dcff';
            ctx.lineWidth = 1 + prog;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00dcff';
            const cs = 5 + prog * 3;
            ctx.beginPath(); ctx.moveTo(aimX - cs, aimY); ctx.lineTo(aimX + cs, aimY); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(aimX, aimY - cs); ctx.lineTo(aimX, aimY + cs); ctx.stroke();
            // Ok yolu çizgisi
            ctx.globalAlpha = 0.18 + prog * 0.22;
            ctx.setLineDash([3, 4]);
            ctx.beginPath();
            ctx.moveTo(this.x - camera.x, this.y - camera.y);
            ctx.lineTo(aimX, aimY);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        // MAGE: Rün halkası (yüklenirken genişler, boştayken sabit döner)
        if (_drawCls === 'mage') {
            const runeCount = 6;
            const runeRad = this.m_runeRadius;
            const runeAlpha = this.m_phase === 'charge' ? 0.80 : 0.18;
            ctx.save();
            for (let i = 0; i < runeCount; i++) {
                const ang = this.m_runeAngle + (i / runeCount) * Math.PI * 2;
                const rx = this.x - camera.x + Math.cos(ang) * runeRad;
                const ry = this.y - camera.y + Math.sin(ang) * runeRad;
                ctx.globalAlpha = runeAlpha;
                ctx.fillStyle = i % 2 === 0 ? '#9b30ff' : '#ffd700';
                ctx.shadowBlur = this.m_phase === 'charge' ? 12 : 5;
                ctx.shadowColor = ctx.fillStyle;
                ctx.beginPath();
                ctx.moveTo(rx, ry - 4);
                ctx.lineTo(rx + 3, ry);
                ctx.lineTo(rx, ry + 4);
                ctx.lineTo(rx - 3, ry);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();

            // Yükleme halkası
            if (this.m_phase === 'charge') {
                ctx.save();
                const cp = Math.max(0, Math.min(1, 1 - this.m_phaseTimer / (this.m_phaseMaxTimer || 18)));
                ctx.globalAlpha = 0.18 + cp * 0.52;
                ctx.strokeStyle = '#9b30ff';
                ctx.lineWidth = 2 + cp * 3;
                ctx.shadowBlur = 22;
                ctx.shadowColor = '#9b30ff';
                ctx.beginPath();
                ctx.arc(this.x - camera.x, this.y - camera.y, this.m_runeRadius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            // Bozulma aurası (level 5+ artar)
            const corruptLevel = Math.min(1, Math.max(0, (this.level - 4) / 8));
            if (corruptLevel > 0.05) {
                ctx.save();
                ctx.globalAlpha = corruptLevel * 0.12 + Math.sin(Date.now() / 500) * 0.04;
                const ag = ctx.createRadialGradient(
                    this.x - camera.x, this.y - camera.y, 4,
                    this.x - camera.x, this.y - camera.y, 38
                );
                ag.addColorStop(0, 'rgba(155,48,255,0.7)');
                ag.addColorStop(1, 'rgba(155,48,255,0)');
                ctx.fillStyle = ag;
                ctx.beginPath();
                ctx.arc(this.x - camera.x, this.y - camera.y, 38, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // WARRIOR: Greatsword yörünge izi (çoklu gradient çizgi)
        const isWarriorDraw = _drawCls === 'warrior';
        if (_drawCls === 'warrior' && this.w_trailPoints.length > 1) {
            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            for (let i = 1; i < this.w_trailPoints.length; i++) {
                const pt   = this.w_trailPoints[i];
                const prev = this.w_trailPoints[i - 1];
                const prog = i / this.w_trailPoints.length;
                ctx.beginPath();
                ctx.strokeStyle = `rgba(200,60,0,${pt.a * 0.9})`;
                ctx.lineWidth = prog * 8 + 1;
                ctx.shadowBlur = 16;
                ctx.shadowColor = 'rgba(255,130,0,0.7)';
                ctx.moveTo(prev.x - camera.x, prev.y - camera.y);
                ctx.lineTo(pt.x - camera.x, pt.y - camera.y);
                ctx.stroke();
            }
            ctx.restore();
        }

        // WARRIOR: Windup hazırlık göstergesi (büyüyen turuncu halka)
        if (_drawCls === 'warrior' && this.w_phase === 'windup') {
            ctx.save();
            const prog = 1 - this.w_phaseTimer / 10;
            ctx.globalAlpha = 0.25 + prog * 0.45;
            ctx.strokeStyle = '#cc3300';
            ctx.lineWidth = 3 + prog * 2;
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ff5500';
            ctx.beginPath();
            ctx.arc(this.x - camera.x, this.y - camera.y, 26 + prog * 18, 0, Math.PI * 2);
            ctx.stroke();
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

        // SINIF KİMLİĞİ: Zemin aura gölgesi
        if (_drawCls === 'warrior') {
            // Savaşçı: Kırmızımsı baskın zemin gölgesi
            ctx.save();
            const hpR = this.hp / (this.getMaxHp ? this.getMaxHp() : 100);
            const baseAlpha = 0.12 + (1 - hpR) * 0.18; // HP düştükçe daha belirgin
            const wg = ctx.createRadialGradient(
                this.x - camera.x, this.y - camera.y + 14, 0,
                this.x - camera.x, this.y - camera.y + 14, 28
            );
            wg.addColorStop(0, `rgba(180,40,0,${baseAlpha})`);
            wg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = wg;
            ctx.beginPath();
            ctx.ellipse(this.x - camera.x, this.y - camera.y + 14, 28, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if (_drawCls === 'ranger') {
            // Nişancı: Minimal siyah zemin izi (av hayvanı gibi sessiz)
            ctx.save();
            ctx.globalAlpha = 0.22;
            ctx.fillStyle = '#050210';
            ctx.beginPath();
            ctx.ellipse(this.x - camera.x, this.y - camera.y + 16, 16, 6, 0, 0, Math.PI * 2);
            ctx.fill();
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

    // --- RANGER FAZ SİSTEMİ ---

    _rangerUpdatePhase(game) {
        if (this.r_phase === 'idle') return;
        this.r_phaseTimer--;

        if (this.r_phase === 'draw') {
            this.r_eyeGlow = Math.min(1.0, 1 - this.r_phaseTimer / (this.r_phaseMaxTimer || 15));

            if (this.r_phaseTimer <= 0) {
                // ATEŞle
                this.r_phase = 'idle';
                this.r_eyeGlow = 0;
                this.isAttacking = false;
                const skillAnimOnly = this.r_skillAnimOnly;
                this.r_skillAnimOnly = false;
                this.r_phaseMaxTimer = 15;
                if (skillAnimOnly) return;

                const drawMult = this.rapidAttackActive ? 0.85 : 1.35;
                const damage = Math.floor(this.getTotalAtk() * drawMult);
                let isCrit = Math.random() * 100 < this.getTotalCrit();
                if (isCrit) {
                    // Ranger kritik: hassasiyet flaşı
                    game.triggerScreenShake(4);
                    SoundEngine.playCritical();
                    game.textParticles.push(new TextParticle(
                        this.x, this.y - 28,
                        'ZAYIF NOKTA!', '#00dcff', "9px", true
                    ));
                }

                const rarity = (this.equipment.weapon && this.equipment.weapon.rarity) || 'common';
                game.projectiles.push(new Projectile(this.x, this.y, this.attackAngle, 'arrow', isCrit ? damage * 2 : damage, rarity));
                SoundEngine.playBowRelease();

                // Geri tepme toz partikülleri (minimal, şık)
                for (let p = 0; p < 3; p++) {
                    game.particles.push(new Particle(
                        this.x - Math.cos(this.attackAngle) * 8,
                        this.y - Math.sin(this.attackAngle) * 8,
                        'rgba(140,110,70,0.35)',
                        -Math.cos(this.attackAngle) * (1 + Math.random() * 1.5),
                        -Math.sin(this.attackAngle) * (1 + Math.random() * 1.5),
                        1 + Math.random() * 2, 12
                    ));
                }

                if (isCrit) {
                    game.addLog(`KRİTİK İSABET! Zayıf noktayı deldi! (${damage * 2} hasar)`, "player-hit");
                }
            }
        }
    }

    // --- MAGE FAZ SİSTEMİ ---

    _mageUpdatePhase(game) {
        if (this.m_phase === 'idle') return;
        this.m_phaseTimer--;

        if (this.m_phase === 'charge') {
            const progress = Math.max(0, Math.min(1, 1 - this.m_phaseTimer / (this.m_phaseMaxTimer || 18)));
            this.m_runeRadius = 20 + progress * 28;

            // Rün çerçevesinden parçacık fışkırması
            if (Math.random() < 0.45) {
                const ra = Math.random() * Math.PI * 2;
                game.particles.push(new Particle(
                    this.x + Math.cos(ra) * this.m_runeRadius,
                    this.y + Math.sin(ra) * this.m_runeRadius,
                    Math.random() < 0.5 ? '#9b30ff' : '#ffd700',
                    (Math.random() - 0.5) * 2.5,
                    -1.8 - Math.random() * 2.2,
                    Math.random() * 3 + 1.5,
                    18 + Math.random() * 12
                ));
            }

            if (this.m_phaseTimer <= 0) {
                // BÜYÜ ATIŞ
                this.m_phase = 'idle';
                this.m_runeRadius = 22;
                this.isAttacking = false;
                const skillAnimOnly = this.m_skillAnimOnly;
                this.m_skillAnimOnly = false;
                this.m_phaseMaxTimer = 18;
                if (skillAnimOnly) return;

                // Yokluk içe çöküşü — halka içe çöker
                for (let p = 0; p < 18; p++) {
                    const ang = (p / 18) * Math.PI * 2;
                    const rad = 42 + progress * 12;
                    game.particles.push(new Particle(
                        this.x + Math.cos(ang) * rad,
                        this.y + Math.sin(ang) * rad,
                        p % 3 === 0 ? '#ffd700' : '#9b30ff',
                        -Math.cos(ang) * 4.5,
                        -Math.sin(ang) * 4.5,
                        Math.random() * 3 + 2, 20
                    ));
                }

                // Büyüyü fırlat
                const damage = Math.floor(this.getTotalAtk() * 1.5);
                const rarity = (this.equipment.weapon && this.equipment.weapon.rarity) || 'common';
                game.projectiles.push(new Projectile(this.x, this.y, this.attackAngle, 'spell', damage, rarity));

                SoundEngine.playVoidCast();
                SoundEngine.playVoidImplosion();
                game.triggerScreenShake(5);

                // Gerçeklik bozulması — önde kısa yol partikülleri
                for (let p = 0; p < 7; p++) {
                    game.particles.push(new Particle(
                        this.x + Math.cos(this.attackAngle) * p * 14,
                        this.y + Math.sin(this.attackAngle) * p * 14,
                        p % 2 === 0 ? '#9b30ff' : 'rgba(200,160,255,0.6)',
                        (Math.random() - 0.5) * 2.5,
                        (Math.random() - 0.5) * 2.5,
                        Math.random() * 4 + 2, 22
                    ));
                }

                game.textParticles.push(new TextParticle(
                    this.x, this.y - 24,
                    'RÜN PATLAMASI!', '#9b30ff', "9px", true
                ));
                game.addLog(`Rün büyüsü tetiklendi! ${damage} yokluk hasarı.`, "player-hit");
            }
        }
    }

    // --- WARRIOR FAZ SİSTEMİ ---

    _warriorUpdatePhase(game) {
        if (this.w_phase === 'idle') return;
        this.w_phaseTimer--;

        if (this.w_phase === 'windup') {
            if (this.w_phaseTimer <= 0) {
                this.w_phase = 'swing';
                this.w_phaseTimer = 8;
                this.isAttacking = true;
                this.attackTimer = 0;
                SoundEngine.playWarriorSwing();
            }
        } else if (this.w_phase === 'swing') {
            // Greatsword iz noktası ekle
            const progress = 1 - this.w_phaseTimer / 8;
            const trailAngle = this.attackAngle - 1.0 + progress * 2.0;
            this.w_trailPoints.push({
                x: this.x + Math.cos(trailAngle) * 52,
                y: this.y + Math.sin(trailAngle) * 52,
                a: 0.9 - progress * 0.3
            });
            if (this.w_trailPoints.length > 14) this.w_trailPoints.shift();

            if (!this.w_hitLanded) this._warriorCheckHit(game);

            if (this.w_phaseTimer <= 0) {
                this.w_phase = 'recovery';
                this.w_phaseTimer = 14;
                this.isAttacking = false;
            }
        } else if (this.w_phase === 'recovery') {
            this.w_trailPoints = this.w_trailPoints
                .map(p => ({ ...p, a: p.a * 0.82 }))
                .filter(p => p.a > 0.04);
            if (this.w_phaseTimer <= 0) {
                this.w_phase = 'idle';
                this.w_trailPoints = [];
            }
        }
    }

    _warriorCheckHit(game) {
        const attackRange = 70;
        const arcWidth = 2.0;

        game.enemies.forEach(enemy => {
            const edx = enemy.x - this.x;
            const edy = enemy.y - this.y;
            if (Math.hypot(edx, edy) >= attackRange) return;

            const angleToEnemy = Math.atan2(edy, edx);
            let diff = angleToEnemy - this.attackAngle;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            if (Math.abs(diff) >= arcWidth / 2) return;

            this.w_hitLanded = true;

            const isCrit = Math.random() * 100 < this.getTotalCrit();
            this.w_isCritHit = isCrit;
            let damage = Math.floor(this.getTotalAtk() * 1.4);
            if (isCrit) damage *= 2;

            const kbMult = isCrit ? 5 : 3;
            enemy.takeDamage(damage, this.attackAngle, game, kbMult);
            this._applyWeaponEffect(enemy, game, damage, this.attackAngle);
            enemy.hitStopTimer = 5;
            if (isCrit) enemy.stunTimer = 60;

            // Execution: can %20 altındaysa infaz
            if (enemy.hp > 0 && enemy.hp <= enemy.maxHp * 0.20) {
                this._triggerExecution(enemy, game, isCrit);
                return;
            }

            // Kan patlaması
            const bloodCount = isCrit ? 14 : 8;
            for (let p = 0; p < bloodCount; p++) {
                game.particles.push(new Particle(
                    enemy.x, enemy.y,
                    p % 4 === 0 ? '#880010' : '#cc1020',
                    (Math.random() - 0.5) * 9 + Math.cos(this.attackAngle) * 4,
                    (Math.random() - 0.5) * 9 + Math.sin(this.attackAngle) * 4,
                    Math.random() * 4 + 2, 22 + Math.random() * 10
                ));
            }
            // Zırh kıvılcımları
            const sparkCount = isCrit ? 8 : 4;
            for (let p = 0; p < sparkCount; p++) {
                game.particles.push(new Particle(
                    enemy.x, enemy.y,
                    p % 2 === 0 ? '#ffd700' : '#ffffff',
                    (Math.random() - 0.5) * 7, (Math.random() - 0.5) * 7 - 1,
                    Math.random() * 2 + 1, 12 + Math.random() * 8
                ));
            }

            game.triggerScreenShake(isCrit ? 22 : 16);
            SoundEngine.playWarriorImpact();
            if (isCrit) SoundEngine.playCritical();

            const txtColor = isCrit ? '#ff5500' : '#ff2222';
            game.textParticles.push(new TextParticle(
                enemy.x, enemy.y - 20,
                isCrit ? `${damage}! EZME` : `${damage}`,
                txtColor, isCrit ? "12px" : "10px", isCrit
            ));

            if (isCrit) {
                game.addLog(`AĞIR KRİTİK! ${enemy.name}'a ${damage} ezme hasarı! (SERSEM)`, "player-hit");
            } else {
                game.addLog(`${enemy.name}'a ${damage} ağır hasar verdin.`, "player-hit");
            }
        });
    }

    _triggerExecution(enemy, game, isCrit) {
        enemy.hp = 0;
        enemy.die(game);

        SoundEngine.playExecution();
        game.triggerScreenShake(28);

        // Kanlı patlama
        for (let p = 0; p < 22; p++) {
            game.particles.push(new Particle(
                enemy.x, enemy.y,
                p % 3 === 0 ? '#ff0000' : '#880000',
                (Math.random() - 0.5) * 14,
                (Math.random() - 0.5) * 14,
                Math.random() * 6 + 3,
                38 + Math.random() * 20
            ));
        }

        // Execution overlay (game.js tarafından çizilir)
        if (window.GameEngine) {
            window.GameEngine.executionTimer = 22;
            window.GameEngine.executionX = enemy.x;
            window.GameEngine.executionY = enemy.y;
        }

        game.textParticles.push(new TextParticle(
            enemy.x, enemy.y - 30,
            'İDAM!', '#ff0000', "14px", true
        ));
        game.addLog(`İDAM! ${enemy.name} yokluğa gönderildi!`, "death");
    }
}

// --- 7a. ÇEVRE TUZAĞI ---
class Trap {
    constructor(x, y, type = 'spike') {
        this.x = x;
        this.y = y;
        this.type = type; // 'spike' | 'fire'
        this.phase = Math.floor(Math.random() * 120);
        this.maxPhase = 120;
        this.warnStart = 95;
        this.activeStart = 105;
        this.active = false;
        this.hitCooldown = 0;
        this.damage = type === 'spike' ? 8 : 12;
    }

    update(player, game) {
        this.phase = (this.phase + 1) % this.maxPhase;
        this.active = this.phase >= this.activeStart;
        if (this.hitCooldown > 0) this.hitCooldown--;
        if (this.active && this.hitCooldown === 0 && player.hp > 0) {
            const dist = Math.hypot(player.x - this.x, player.y - this.y);
            if (dist < 18) {
                player.takeDamage(this.damage, game);
                this.hitCooldown = 60;
                game.addLog(`⚠️ Tuzak! ${this.damage} hasar aldın.`, "enemy");
            }
        }
    }

    draw(ctx, camera) {
        const dx = this.x - camera.x;
        const dy = this.y - camera.y;
        const isWarn = this.phase >= this.warnStart && !this.active;
        ctx.save();
        if (this.type === 'spike') {
            ctx.fillStyle = '#444';
            ctx.fillRect(dx - 13, dy - 3, 26, 6);
            if (this.active) {
                ctx.fillStyle = '#bbb';
                ctx.shadowColor = '#ff3333'; ctx.shadowBlur = 8;
                for (let i = -9; i <= 9; i += 7) {
                    ctx.beginPath();
                    ctx.moveTo(dx + i, dy - 3);
                    ctx.lineTo(dx + i + 3, dy - 15);
                    ctx.lineTo(dx + i + 6, dy - 3);
                    ctx.fill();
                }
            } else if (isWarn) {
                const a = (Math.sin(Date.now() / 70) + 1) / 2;
                ctx.fillStyle = `rgba(255,80,0,${a * 0.5})`;
                ctx.fillRect(dx - 13, dy - 3, 26, 6);
            }
        } else {
            ctx.fillStyle = '#5a3010';
            ctx.fillRect(dx - 7, dy - 7, 14, 14);
            if (this.active) {
                const h = 22 + Math.sin(Date.now() / 60) * 6;
                const g = ctx.createLinearGradient(dx, dy - 7, dx, dy - 7 - h);
                g.addColorStop(0, 'rgba(255,180,0,0.9)');
                g.addColorStop(0.5, 'rgba(255,60,0,0.7)');
                g.addColorStop(1, 'rgba(255,0,0,0)');
                ctx.fillStyle = g;
                ctx.shadowColor = '#ff5500'; ctx.shadowBlur = 16;
                ctx.fillRect(dx - 5, dy - 7 - h, 10, h);
            } else if (isWarn) {
                const a = (Math.sin(Date.now() / 90) + 1) / 2;
                ctx.shadowColor = `rgba(255,120,0,${a})`; ctx.shadowBlur = 8;
            }
        }
        ctx.restore();
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

// --- 6b. KURTARILABİLİR ESİR NPC ---
class CaptiveNPC {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type || ['peasant', 'soldier', 'mage', 'merchant'][Math.floor(Math.random() * 4)];
        this.rescued = false;
        this.interactRange = 52;
        this.width = 40;
        this.height = 40;
        this._wobble = Math.random() * Math.PI * 2;
    }

    update() {
        this._wobble += 0.04;
    }

    rescue(game) {
        if (this.rescued) return;
        this.rescued = true;
        if (window.SoundEngine) SoundEngine.playNPCRescue();
        const floor = game.floor || 1;

        if (this.type === 'peasant') {
            const gold = Math.floor(20 + floor * 2.5 + Math.random() * 30);
            game.player.gold += gold;
            game.addLog(`🧑‍🌾 Köylü kurtarıldı! Minnetle +${gold} Altın verdi.`, 'loot');
            game.textParticles.push(new TextParticle(this.x, this.y - 35, `+${gold}g ÖDÜL!`, 'var(--neon-gold)', '10px', true));
        } else if (this.type === 'soldier') {
            const bonus = 1 + Math.floor(floor / 25);
            game.player.stats.atk += bonus;
            game.addLog(`⚔️ Asker kurtarıldı! Savaş sırrı öğretti: Kalıcı +${bonus} Saldırı!`, 'level');
            game.textParticles.push(new TextParticle(this.x, this.y - 35, `+${bonus} SALDIRI!`, '#ff4444', '10px', true));
        } else if (this.type === 'mage') {
            const bonus = 10 + Math.floor(floor / 8) * 5;
            game.player.stats.maxHp += bonus;
            game.player.hp = Math.min(game.player.getMaxHp(), game.player.hp + bonus);
            game.addLog(`🔮 Büyücü kurtarıldı! Hayat sırrını paylaştı: Kalıcı +${bonus} Maks Can!`, 'level');
            game.textParticles.push(new TextParticle(this.x, this.y - 35, `+${bonus} MAX CAN!`, 'var(--neon-green)', '10px', true));
        } else if (this.type === 'merchant') {
            const gold = Math.floor(45 + floor * 4 + Math.random() * 50);
            game.player.gold += gold;
            game.addLog(`💰 Tüccar kurtarıldı! Hazinesini paylaştı: +${gold} Altın!`, 'loot');
            game.textParticles.push(new TextParticle(this.x, this.y - 35, `+${gold}g HAZINE!`, 'var(--neon-gold)', '11px', true));
        }

        // İstatistik izleme
        const prev = parseInt(localStorage.getItem('pk_rescues') || '0');
        localStorage.setItem('pk_rescues', prev + 1);

        // Diyalog sistemi: NPC kurtarma konuşması
        if (window.DialogSystem) {
            setTimeout(() => DialogSystem.triggerNPC(this.type), 400);
            // İlk kurtarma eventi
            if (prev === 0) setTimeout(() => DialogSystem.triggerEvent('first_npc_rescue'), 3000);
            // Çok sayıda kurtarma eventi
            if (prev + 1 === 5) setTimeout(() => DialogSystem.triggerEvent('many_rescues'), 3000);
        }

        // Quest ve başarım bildirimi
        if (game._checkQuestProgress) game._checkQuestProgress('npc_rescued', null);
        if (game._checkAchievements) game._checkAchievements();

        game.triggerScreenShake(5);
        if (window.SoundEngine) SoundEngine.playLevelUp();

        for (let p = 0; p < 15; p++) {
            game.particles.push(new Particle(
                this.x, this.y,
                '#ffd700',
                (Math.random() - 0.5) * 7,
                (Math.random() - 0.5) * 7,
                Math.random() * 4 + 2, 35
            ));
        }
    }

    draw(ctx, camera) {
        if (this.rescued) return;
        const dx = this.x - camera.x;
        const dy = this.y - camera.y + Math.sin(this._wobble) * 2;

        const icons   = { peasant: '🧑', soldier: '⚔️', mage: '🔮', merchant: '💰' };
        const colors  = { peasant: '#ffd700', soldier: '#ff6600', mage: '#b026ff', merchant: '#00f0ff' };
        const labels  = { peasant: 'KÖYLÜ', soldier: 'ASKER', mage: 'BÜYÜCÜ', merchant: 'TÜCCAR' };
        const col = colors[this.type] || '#fff';

        ctx.save();

        // Kafes arka planı
        ctx.fillStyle = 'rgba(40,25,15,0.75)';
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 2;
        ctx.fillRect(dx - 18, dy - 22, 36, 42);
        ctx.strokeRect(dx - 18, dy - 22, 36, 42);

        // Kafes yatay çubukları
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1.5;
        for (let b = -10; b <= 10; b += 10) {
            ctx.beginPath(); ctx.moveTo(dx + b, dy - 22); ctx.lineTo(dx + b, dy + 20); ctx.stroke();
        }

        // Parıltı kenarlığı
        ctx.shadowColor = col;
        ctx.shadowBlur = 14;
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(dx - 20, dy - 24, 40, 46);
        ctx.shadowBlur = 0;

        // Emoji ikonu
        ctx.font = '18px serif';
        ctx.textAlign = 'center';
        ctx.fillText(icons[this.type] || '❓', dx, dy + 10);

        // İpucu: [E] KURTAR (yanıp söner)
        if (Math.floor(Date.now() / 600) % 2 === 0) {
            ctx.font = "5px 'Press Start 2P'";
            ctx.fillStyle = col;
            ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
            ctx.strokeText('[E] KURTAR', dx, dy - 30);
            ctx.fillText('[E] KURTAR', dx, dy - 30);
            ctx.font = "5px 'Press Start 2P'";
            ctx.fillStyle = '#ccc';
            ctx.fillText(labels[this.type] || '', dx, dy - 38);
        }

        ctx.restore();
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
                    const fl = window.GameEngine ? window.GameEngine.floor : '?';
                    game.addLog(`ÖZEL SATICI: "${fl}. Kata ulaştın kahraman! Sana en nadir ve efsanevi mallarımı getirdim... [E Tuşu]"`, "level");
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
    constructor(x, y, bossFloorOverride = null) {
        this.x = x;
        this.y = y;
        this.width = 96; // Devasa boyut!
        this.height = 96;
        this.radius = 32; // Büyük çarpışma dairesi
        
        // Boss ölçekleme: sqrt-tabanlı, max 8x güç
        const bossFloor = bossFloorOverride ?? (window.GameEngine ? window.GameEngine.floor : 10);
        const floorMultiplier = Math.min(8.0, 1.0 + Math.sqrt(Math.max(0, bossFloor - 1)) * 0.65);

        // Her bölgede farklı boss ismi
        const bossNames = [
            'KAELEN — ZİNCİRLENMİŞ MUHAFIZ',    // 10
            'VAELEN — GÖLGELERİN DOKUYUCUSU',   // 20
            "GRAK'THOR — KÖLE EFENDİSİ",         // 30
            'IGNİS — ALEVİN İNFAZCISI',          // 40
            'KRAL ALDEN — BUZUN LANETİ',         // 50
            'LYRA — DİKENLERİN KRALİÇESİ',      // 60
            'MALAKOR — YOKLUĞUN ÇEKİCİ',        // 70
            'BAŞ YARGIÇ VALERİUS — KÖR ADALET', // 80
            'NİHİL — EBEDİ BOŞLUK',              // 90
            'AETHERİON & KÂRUN',                  // 100
        ];
        const zone = Math.ceil(bossFloor / 10);
        this.zone = zone; // PNG sprite anahtarı için kullanılır: boss_z{zone}_idle1
        this.name = bossNames[Math.min(zone - 1, 9)] || 'ZİNDAN MUHAFIZI';
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
        this.slamImpactTimer = 0;
        this.slamImpactMax = 20;
        this.meleeAttackTimer = 0;
        this.meleeAttackMax = 16;
        this.meleeAttackAngle = 0;

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
        if (this.slamImpactTimer > 0) this.slamImpactTimer--;
        if (this.meleeAttackTimer > 0) this.meleeAttackTimer--;
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
            game.addLog(`⚡ FAZ 2 — ${this.name} güçleniyor! Saldırılar artıyor!`, "death");
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
            game.addLog(`💀 FAZ 3 — ${this.name} yarı yıkık! Gözleri kan kırmızısı alevlerle yanıyor!`, "death");
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
            game.addLog(`🔥 FAZ 4 — SON FORM! ${this.name} çılgına döndü! Tüm gücüyle saldırıyor!`, "death");
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

            this.facing = this._isKarun ? 'right' : (vx > 0 ? 'right' : 'left');

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
                this.meleeAttackAngle = Math.atan2(dy, dx);
                this.meleeAttackTimer = this.meleeAttackMax;
                player.takeDamage(this.atk, game);
                this.meleeCooldownTimer = this.meleeCooldownMax;
            }
        }
    }

    // Faz geçişinde minyon çağır
    _spawnPhaseMinions(game, phase) {
        const counts = { 2: 2, 3: 3, 4: 4 };
        const count = counts[phase] || 2;
        game.addLog(`${this.name}: 'Hizmetçilerim gelsin!' Faz ${phase} minyonları çağrılıyor!`, "death");

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
        this.slamImpactTimer = this.slamImpactMax;
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
        game.addLog(`KUTSAL ZAFER! ${this.name} devrildi!`, "level");
        
        SoundEngine.stopBossFight();
        SoundEngine.playBossVictory();
        setTimeout(() => {
            if (window.SoundEngine && !SoundEngine.isMuted && !SoundEngine.musicPlaying) SoundEngine.playMusic();
        }, 3500);
        
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
        // Görsel boyutu collision box'tan büyük — boss daha etkileyici görünür
        const visW = this.width  * 1.8;
        const visH = this.height * 1.8;
        const baseDrawX = this.x - camera.x - visW / 2;
        const baseDrawY = this.y - camera.y - visH / 2;

        const t = Date.now();

        // ── PROSEDÜrel ANİMASYON ────────────────────────────────────────────
        // 1. Havada süzülme (idle bob)
        const floatY = Math.sin(t / (this._isKarun ? 950 : 700)) * (this._isKarun ? 1.2 : 3.5);

        // 2. Nefes alma ölçeği (çok hafif)
        const breathScale = 1.0 + Math.sin(t / 1100) * (this._isKarun ? 0.008 : 0.022);

        // 3. Saldırı öncesi gerilim (attack anticipation)
        let chargeScale = 1.0;
        let chargeTilt  = 0;
        const cooldownRatio = this.attackCooldown > 0
            ? this.attackCooldownTimer / this.attackCooldown : 1.0;
        if (cooldownRatio < 0.28) {
            const charge = 1.0 - cooldownRatio / 0.28; // 0→1 saldırı yaklaşırken
            chargeScale = 1.0 + charge * (this._isKarun ? 0.08 : 0.20);
            chargeTilt  = this._isKarun ? 0 : Math.sin(t / 75) * charge * 0.13; // titreşim
        }

        // 4. Slam patlaması (slamActive başladığı anlık pop)
        let slamPop = 1.0;
        if (this.slamActive && this.slamRadius < 40) {
            slamPop = 1.0 + (1.0 - this.slamRadius / 40) * 0.28;
        }

        let attackLungeX = 0;
        let attackLungeY = 0;
        let impactScaleX = 1.0;
        let impactScaleY = 1.0;
        if (this.slamImpactTimer > 0) {
            const p = 1 - this.slamImpactTimer / this.slamImpactMax;
            const snap = Math.sin(p * Math.PI);
            impactScaleX += snap * 0.18;
            impactScaleY -= snap * 0.10;
        }
        if (this.meleeAttackTimer > 0) {
            const p = 1 - this.meleeAttackTimer / this.meleeAttackMax;
            const thrust = Math.sin(p * Math.PI);
            attackLungeX = Math.cos(this.meleeAttackAngle || 0) * 12 * thrust;
            attackLungeY = Math.sin(this.meleeAttackAngle || 0) * 8 * thrust;
            impactScaleX += thrust * 0.12;
            impactScaleY -= thrust * 0.06;
        }

        // 5. Yürüme sallanması (yatay)
        const walkSway = this._isKarun ? 0 : Math.sin(t / 240) * 2.2;

        const totalScale = breathScale * chargeScale * slamPop;

        // Sprite merkezi (transform pivot noktası)
        const cx = baseDrawX + visW / 2 + walkSway + attackLungeX;
        const cy = baseDrawY + visH / 2 + floatY + attackLungeY;

        // ── ARKA PLAN PARLAMASI (aura) ───────────────────────────────────────
        ctx.save();
        const phaseColors = ['#4466ff', '#aa33ff', '#ff4422', '#ff0000'];
        const auraColor   = phaseColors[Math.min(this.phase - 1, 3)];
        const auraPulse   = 0.10 + 0.08 * Math.sin(t / 380);
        ctx.globalAlpha   = auraPulse;
        ctx.shadowBlur    = 0;
        ctx.fillStyle     = auraColor;
        ctx.beginPath();
        ctx.ellipse(cx, cy + visH * 0.25, visW * 0.45 * totalScale, visH * 0.18 * totalScale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // ── SPRITE ──────────────────────────────────────────────────────────
        ctx.save();

        if (this.hitFlashTimer > 0) {
            ctx.filter = 'brightness(1.5) sepia(1) hue-rotate(-50deg) saturate(5)';
        } else if (this._isKarun && !SpriteEngine.pngCache['boss_karun_idle1']) {
            ctx.filter = `brightness(${1.0 + 0.25 * Math.sin(t / 180)}) sepia(0.6) hue-rotate(270deg) saturate(3)`;
            ctx.globalAlpha = 0.92 + 0.08 * Math.sin(t / 120);
        } else {
            // Faza göre parlaklık artışı
            const phaseGlow = [0, 0.15, 0.30, 0.50][Math.min(this.phase - 1, 3)];
            const glowPulse = phaseGlow * (0.8 + 0.2 * Math.sin(t / 300));
            ctx.filter = `brightness(${1.0 + glowPulse}) saturate(${1.0 + phaseGlow * 1.2})`;
        }

        // Kârun'un kendi özel sprite key'i var; diğerleri zone bazlı
        const baseKey = this._isKarun
            ? `boss_karun_idle${this.animFrame}`
            : `boss_z${this.zone}_idle${this.animFrame}`;
        const fallbackKey = `skeleton_idle${this.animFrame}`;
        const hasPNG = !!(SpriteEngine.pngCache[baseKey] || SpriteEngine.pngCache[baseKey + '_flipped']);
        let spriteKey = hasPNG ? baseKey : fallbackKey;
        if (!this._isKarun && this.facing === 'left') spriteKey += '_flipped';

        // Transform: pivot = merkez, döndür + ölçekle
        ctx.translate(cx, cy);
        ctx.rotate(chargeTilt);
        ctx.scale(totalScale * impactScaleX, totalScale * impactScaleY);
        SpriteEngine.draw(ctx, spriteKey, -visW / 2, -visH / 2, visW, visH, !this._isKarun);
        ctx.restore();

        if (this.meleeAttackTimer > 0) {
            const p = 1 - this.meleeAttackTimer / this.meleeAttackMax;
            const alpha = Math.sin(p * Math.PI);
            ctx.save();
            ctx.globalAlpha = alpha * 0.65;
            ctx.strokeStyle = this._isKarun ? '#d566ff' : '#ff453a';
            ctx.lineWidth = 5;
            ctx.shadowBlur = 16;
            ctx.shadowColor = ctx.strokeStyle;
            ctx.beginPath();
            ctx.arc(
                this.x - camera.x + Math.cos(this.meleeAttackAngle || 0) * 18,
                this.y - camera.y + Math.sin(this.meleeAttackAngle || 0) * 18,
                Math.max(visW, visH) * 0.34,
                (this.meleeAttackAngle || 0) - 0.65,
                (this.meleeAttackAngle || 0) + 0.65
            );
            ctx.stroke();
            ctx.restore();
        }

        // ── KÂRUN: MOR HALE ──────────────────────────────────────────────────
        if (this._isKarun) {
            ctx.save();
            const pulse = 0.25 + 0.15 * Math.sin(t / 200);
            ctx.beginPath();
            ctx.arc(this.x - camera.x, this.y - camera.y, this.width * 0.65, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(180, 0, 255, ${pulse})`;
            ctx.lineWidth = 4;
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#b000ff';
            ctx.stroke();
            ctx.restore();
        }

        // ── TAÇ ──────────────────────────────────────────────────────────────
        const crownW = 32;
        const crownH = 32;
        const crownX = this.x - camera.x - crownW / 2;
        const crownY = this.y - camera.y - visH / 2 - 6 + floatY;
        SpriteEngine.draw(ctx, 'boss_crown', crownX, crownY, crownW, crownH);

        // ── SLAM ŞOKALAGASI ──────────────────────────────────────────────────
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
        this.hitEnemies = new Set();
        if (type === 'piercing_arrow') {
            this.vx = Math.cos(angle) * 11.5;
            this.vy = Math.sin(angle) * 11.5;
            this.width = 28;
            this.height = 18;
            this.life = 70;
        } else if (type === 'fireball') {
            this.vx = Math.cos(angle) * 3.4;
            this.vy = Math.sin(angle) * 3.4;
            this.width = 46;
            this.height = 46;
            this.life = 170;
        }
        if (!this.life) this.life = 90; // 1.5 saniye
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
            if (this.hitEnemies && this.hitEnemies.has(enemy)) continue;
            const dist = Math.hypot(this.x - enemy.x, this.y - enemy.y);
            const hitRadius = this.type === 'fireball' ? 18 : (this.type === 'piercing_arrow' ? 14 : 8);
            if (dist < (enemy.width/2 + hitRadius)) {
                if (this.type === 'fireball') {
                    this._explodeFireball(game, enemy);
                    this.life = 0;
                    break;
                }
                // Darbe vuruldu! Kritik şansı
                const isCrit = Math.random() * 100 < game.player.getTotalCrit();
                let finalDamage = isCrit ? Math.floor(this.damage * 2) : Math.floor(this.damage);
                if (this.type === 'piercing_arrow' && this.hitEnemies.size > 0) finalDamage = Math.floor(finalDamage * 0.6);
                if (enemy._rangerMarked > 0) {
                    finalDamage = Math.floor(finalDamage * 1.25);
                    enemy._rangerMarked = Math.max(0, enemy._rangerMarked - 90);
                }
                
                // Canavara hasar ver ve oku fırlattığımız açıda geri savur (knockback)
                enemy.takeDamage(finalDamage, this.angle, game);
                game.player._applyWeaponEffect(enemy, game, finalDamage, this.angle);
                
                // Darbe partikülleri
                if (this.type === 'spell') {
                    // BÜYÜCÜ: Yokluk levitasyon — düşman yukarı yükselir
                    enemy.knockbackVy = -(5 + Math.random() * 3);
                    enemy.knockbackVx *= 0.25; // Yatay savurma neredeyse yok
                    SoundEngine.playVoidImplosion();
                    for (let p = 0; p < 14; p++) {
                        game.particles.push(new Particle(
                            this.x, this.y,
                            p % 3 === 0 ? '#ffd700' : (p % 3 === 1 ? '#9b30ff' : 'rgba(200,160,255,0.7)'),
                            (Math.random() - 0.5) * 6,
                            -2 - Math.random() * 4, // Yukarı patlama
                            Math.random() * 4 + 2, 22
                        ));
                    }
                    // Gerçeklik çatlakları (radyal çizgi partikülleri)
                    for (let p = 0; p < 6; p++) {
                        const ca = (p / 6) * Math.PI * 2;
                        game.particles.push(new Particle(
                            this.x + Math.cos(ca) * 4, this.y + Math.sin(ca) * 4,
                            'rgba(155,48,255,0.5)',
                            Math.cos(ca) * (2 + Math.random() * 2),
                            Math.sin(ca) * (2 + Math.random() * 2),
                            1, 18
                        ));
                    }
                    game.triggerScreenShake(isCrit ? 8 : 4);
                } else {
                    // Ok çarpma partikülleri
                    const particleColor = this.rarity === 'legendary' ? 'var(--neon-gold)' : (this.rarity === 'rare' ? 'var(--neon-cyan)' : '#8e9297');
                    for (let p = 0; p < 6; p++) {
                        game.particles.push(new Particle(
                            this.x, this.y,
                            particleColor,
                            (Math.random() - 0.5) * 4,
                            (Math.random() - 0.5) * 4,
                            Math.random() * 3 + 2, 15
                        ));
                    }
                }

                // Hasar metnini fırlat
                const hitColor = this.type === 'spell' ? '#cc88ff' : (isCrit ? 'var(--neon-gold)' : '#ffffff');
                game.textParticles.push(new TextParticle(
                    enemy.x, enemy.y - 15,
                    isCrit ? `${finalDamage}! CRIT` : `${finalDamage}`,
                    hitColor,
                    isCrit ? "12px" : "9px",
                    isCrit
                ));

                // Arayüz loguna ekle
                const atkVerb = this.type === 'spell' ? 'rün büyüsüyle' : 'okla';
                if (isCrit) {
                    game.addLog(`KRİTİK! ${enemy.name}'a ${atkVerb} ${finalDamage} hasar verdin!`, "player-hit");
                } else {
                    game.addLog(`${enemy.name}'a ${atkVerb} ${finalDamage} hasar verdin.`, "player-hit");
                }

                if (this.type === 'piercing_arrow') {
                    this.hitEnemies.add(enemy);
                    if (window.GameEngine && window.GameEngine.selectedClass === 'ranger' && isCrit) {
                        game.player.hp = Math.min(game.player.getMaxHp(), game.player.hp + 2);
                        game.textParticles.push(new TextParticle(game.player.x, game.player.y - 24, '+2 CAN', '#39ff14', "8px"));
                    }
                    if (this.hitEnemies.size >= 4) this.life = 0;
                } else {
                    this.life = 0;
                    break;
                }
            }
        }
    }

    _explodeFireball(game, directEnemy = null) {
        const radius = 58;
        SoundEngine.playBurn();
        game.triggerScreenShake(7);
        game.enemies.forEach(enemy => {
            const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
            if (dist <= radius) {
                const dmg = enemy === directEnemy ? this.damage : Math.floor(this.damage * 0.55);
                enemy.takeDamage(dmg, Math.atan2(enemy.y - this.y, enemy.x - this.x), game, 0.9);
                enemy.burnedTimer = Math.max(enemy.burnedTimer || 0, 240);
                game.textParticles.push(new TextParticle(enemy.x, enemy.y - 18, `${dmg} YANIK`, '#ff6a00', "10px", enemy === directEnemy));
            }
        });
        for (let p = 0; p < 26; p++) {
            const a = (p / 26) * Math.PI * 2;
            const spd = 2 + Math.random() * 4;
            game.particles.push(new Particle(this.x, this.y, p % 2 ? '#ff6a00' : '#ffcc33', Math.cos(a) * spd, Math.sin(a) * spd, Math.random() * 5 + 2, 30, 0.04));
        }
    }

    draw(ctx, camera) {
        const drawX = this.x - camera.x;
        const drawY = this.y - camera.y;

        ctx.save();
        ctx.translate(drawX, drawY);

        if (this.type === 'fireball') {
            const t = Date.now() / 120;
            const outerR = 28 + Math.sin(t) * 4;
            const g = ctx.createRadialGradient(0, 0, 2, 0, 0, outerR);
            g.addColorStop(0, '#fff2a0');
            g.addColorStop(0.45, '#ff6a00');
            g.addColorStop(1, 'rgba(160,20,0,0)');
            ctx.fillStyle = g;
            ctx.shadowBlur = 18;
            ctx.shadowColor = '#ff6a00';
            ctx.beginPath();
            ctx.arc(0, 0, outerR, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'spell') {
            // Mage yokluk orbu — mor parlayan küre
            ctx.rotate(this.angle);
            const t = Date.now() / 180;
            const innerR = 5 + Math.sin(t) * 1.5;
            const outerR = 10 + Math.sin(t * 1.3) * 2;
            // Dış aura
            const auraG = ctx.createRadialGradient(0, 0, innerR * 0.3, 0, 0, outerR);
            auraG.addColorStop(0, 'rgba(200,120,255,0.9)');
            auraG.addColorStop(0.5, 'rgba(120,40,220,0.6)');
            auraG.addColorStop(1, 'rgba(80,0,160,0)');
            ctx.fillStyle = auraG;
            ctx.beginPath();
            ctx.arc(0, 0, outerR, 0, Math.PI * 2);
            ctx.fill();
            // Parlak iç nokta
            ctx.fillStyle = this.rarity === 'legendary' ? '#ffd700' : '#cc88ff';
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#9b30ff';
            ctx.beginPath();
            ctx.arc(0, 0, innerR, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Ok — mevcut sprite
            ctx.rotate(this.angle);
            const spriteKey = `projectile_arrow_${this.rarity}`;
            if (this.type === 'piercing_arrow') {
                ctx.strokeStyle = '#00dcff';
                ctx.lineWidth = 5;
                ctx.shadowBlur = 14;
                ctx.shadowColor = '#00dcff';
                ctx.beginPath();
                ctx.moveTo(-24, 0);
                ctx.lineTo(28, 0);
                ctx.stroke();
            }
            SpriteEngine.draw(ctx, spriteKey, -16, -16, 32, 32);
        }

        ctx.restore();
    }
}

// --- 7. SİLAH YAĞMURU MERMİSİ (W Yeteneği AoE) ---
class MeteorProjectile {
    constructor(targetX, targetY, damage) {
        this.x = targetX;
        this.y = targetY - 420;
        this.targetX = targetX;
        this.targetY = targetY;
        this.damage = damage;
        this.warningTimer = 62;
        this.vy = 8.5;
        this.life = 240;
        this.exploded = false;
    }

    update(game) {
        if (this.exploded) return;
        this.life--;
        if (this.warningTimer > 0) {
            this.warningTimer--;
            return;
        }
        this.y += this.vy;
        if (this.y >= this.targetY) {
            this.y = this.targetY;
            this.explode(game);
        }
    }

    explode(game) {
        this.exploded = true;
        this.life = 0;
        const radius = 125;
        game.triggerScreenShake(24);
        SoundEngine.playBossSlap();
        game.enemies.forEach(enemy => {
            const dist = Math.hypot(enemy.x - this.targetX, enemy.y - this.targetY);
            if (dist <= radius) {
                const falloff = 1 - Math.min(0.45, dist / radius * 0.45);
                const dmg = Math.floor(this.damage * falloff);
                enemy.takeDamage(dmg, Math.atan2(enemy.y - this.targetY, enemy.x - this.targetX), game, enemy instanceof Boss ? 0.7 : 1.8);
                enemy.burnedTimer = Math.max(enemy.burnedTimer || 0, 300);
                game.textParticles.push(new TextParticle(enemy.x, enemy.y - 18, `${dmg} METEOR`, '#ff6a00', "10px", true));
            }
        });
        for (let p = 0; p < 42; p++) {
            const a = (p / 42) * Math.PI * 2;
            const spd = 2 + Math.random() * 6;
            game.particles.push(new Particle(this.targetX, this.targetY, p % 3 === 0 ? '#ffcc33' : '#ff3b00', Math.cos(a) * spd, Math.sin(a) * spd - 1, Math.random() * 6 + 3, 40, 0.06));
        }
    }

    draw(ctx, camera) {
        const tx = this.targetX - camera.x;
        const ty = this.targetY - camera.y;
        ctx.save();
        const pulse = 0.45 + Math.sin(Date.now() / 90) * 0.2;
        ctx.globalAlpha = this.warningTimer > 0 ? pulse : 0.35;
        ctx.strokeStyle = '#ff3b00';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 16;
        ctx.shadowColor = '#ff6a00';
        ctx.beginPath();
        ctx.arc(tx, ty, 42 + Math.max(0, 42 - this.warningTimer) * 1.2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        if (this.warningTimer <= 0) {
            const x = this.x - camera.x;
            const y = this.y - camera.y;
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(Date.now() / 90);
            const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 24);
            g.addColorStop(0, '#fff2a0');
            g.addColorStop(0.45, '#ff6a00');
            g.addColorStop(1, 'rgba(160,0,0,0)');
            ctx.fillStyle = g;
            ctx.shadowBlur = 22;
            ctx.shadowColor = '#ff3b00';
            ctx.beginPath();
            ctx.arc(0, 0, 24, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}

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

        const radius = this.type === 'sword' ? 120 : 80; // Patlama hasar yarıçapı
        const targetColor = this.type === 'arrow' ? 'var(--neon-gold)' : '#ffb13b';

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
        ctx.shadowBlur = this.type === 'arrow' ? 15 : 28;
        ctx.shadowColor = this.type === 'arrow' ? 'var(--neon-gold)' : '#ffb13b';
        
        if (this.type === 'sword') {
            ctx.rotate(Math.PI);
            const g = ctx.createLinearGradient(0, -92, 0, 74);
            g.addColorStop(0, '#fff2a0');
            g.addColorStop(0.35, '#ffb13b');
            g.addColorStop(1, '#6b2500');
            ctx.fillStyle = g;
            ctx.strokeStyle = '#2a1200';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(0, -98);
            ctx.lineTo(24, -38);
            ctx.lineTo(12, 54);
            ctx.lineTo(0, 78);
            ctx.lineTo(-12, 54);
            ctx.lineTo(-24, -38);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#ffcc33';
            ctx.fillRect(-42, 42, 84, 12);
            ctx.fillStyle = '#5a2200';
            ctx.fillRect(-8, 54, 16, 42);
            ctx.strokeStyle = 'rgba(255,210,80,0.7)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, -70);
            ctx.lineTo(0, 52);
            ctx.stroke();
        } else {
            SpriteEngine.draw(ctx, spriteKey, -16, -16, 32, 32);
        }

        ctx.restore();
    }
}
