/**
 * ==========================================================================
 * PIXEL KNIGHT - ORCHESTRATOR & STATE MANAGER
 * ==========================================================================
 * Bu dosya; oyunun durumlarını (Giriş, Oyun İçi, Seviye Atlama Seçimleri, 
 * Ölüm), UI panellerini, envanteri, savaşı ve kat geçişlerini koordine eder.
 */

const GameEngine = {
    canvas: null,
    ctx: null,
    
    // Oyun nesneleri listeleri
    player: null,
    enemies: [],
    chests: [],
    items: [],
    particles: [],
    textParticles: [],
    projectiles: [],
    
    floor: 1,
    killsCount: 0,
    lives: 3,
    state: 'start', // 'start', 'playing', 'upgrade', 'gameover', 'respawning'
    
    // Portal animasyonu
    portalFrame: 1,
    portalTimer: 0,

    // Ekran Sarsıntısı için yedekler
    bgCanvas: null,
    bgCtx: null,
    bgParticles: [],

    init() {
        console.log("%c[Game Engine] Başlatılıyor...", "color: #39ff14; font-weight: bold;");
        
        // 1. Canvas Elemanlarını Bağla
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Anti-aliasing'i kapat (Piksel keskinliği için)
        this.ctx.imageSmoothingEnabled = false;

        // 2. Kontrol Sistemini Başlat
        InputManager.init(this.canvas);
        
        // 3. Arka Plan Partikül Efektini Başlat (Dashboard dışındaki toz zerreleri)
        this.initBackgroundParticles();
        
        // 4. HTML Arayüz Butonlarını Dinle
        this.setupUIListeners();
        
        // 5. Oyun Döngüsünü Başlat
        GameLoop.start(
            (dt) => this.update(dt),
            () => this.draw()
        );
        
        this.addLog("Zindan kapıları aralandı. Başlamak için butona basın.", "system");
    },

    // Arayüz buton dinleyicilerini kur
    setupUIListeners() {
        document.getElementById('btn-start').addEventListener('click', () => {
            this.startNewGame();
        });
        
        document.getElementById('btn-retry').addEventListener('click', () => {
            this.startNewGame();
        });

        document.getElementById('btn-restart').addEventListener('click', () => {
            this.startNewGame();
        });

        document.getElementById('btn-close-shop').addEventListener('click', () => {
            this.closeShop();
        });

        // Tooltip'i fareyle takip et, ekrandan taşmayı önle
        document.addEventListener('mousemove', (e) => {
            const tooltip = document.getElementById('item-tooltip');
            if (tooltip && tooltip.style.display === 'block') {
                const tw = tooltip.offsetWidth || 240;
                const th = tooltip.offsetHeight || 160;
                let left = e.clientX + 15;
                let top  = e.clientY + 15;
                if (left + tw > window.innerWidth  - 8) left = e.clientX - tw - 15;
                if (top  + th > window.innerHeight - 8) top  = e.clientY - th - 15;
                tooltip.style.left = left + 'px';
                tooltip.style.top  = top  + 'px';
            }
        });
    },

    // Yeni Bir Oyuna Sıfırdan Başla
    startNewGame() {
        this.floor = 1;
        this.killsCount = 0;
        this.lives = 3;
        this.enemies = [];
        this.chests = [];
        this.items = [];
        this.particles = [];
        this.textParticles = [];
        this.projectiles = [];
        this.merchant = null;
        this.boss = null;
        this.shopItems = null;

        // 1. Zindanı ve Oyuncuyu Üret
        World.generate(this.floor);
        this.player = new Player(World.spawnPoints.player.x, World.spawnPoints.player.y);

        // 2. Varlıkları Haritaya Yerleştir
        this.spawnMapEntities();

        // 3. Arayüz Ekranlarını Gizle
        document.getElementById('screen-start').classList.remove('active');
        document.getElementById('screen-gameover').classList.remove('active');
        document.getElementById('screen-upgrade').classList.remove('active');
        document.getElementById('screen-shop').classList.remove('active');

        // 4. Durumu Güncelle ve Müzik Başlat
        this.state = 'playing';
        
        // Mute butonuna göre müziği oynat
        if (SoundEngine && !SoundEngine.isMuted) {
            SoundEngine.playMusic();
        }

        this.addLog("Maceraya başlandı! Zindan Katı: 1", "system");
        this.updateUI();
    },

    // Bir Sonraki Kata Işınlan (Portal Geçişi)
    nextFloor() {
        this.floor++;
        this.enemies = [];
        this.chests = [];
        this.items = [];
        this.particles = [];
        this.textParticles = [];
        this.projectiles = [];
        this.merchant = null;
        this.boss = null;
        this.shopItems = null;

        // Işınlanma sesi sentezle
        SoundEngine.playPortal();

        // Zindanı yeni kat derinliğine göre yeniden üret
        World.generate(this.floor);
        
        // Oyuncunun konumunu başlangıç odasına ata
        this.player.x = World.spawnPoints.player.x;
        this.player.y = World.spawnPoints.player.y;
        
        // Canavar ve sandıkları yeni kata yerleştir
        this.spawnMapEntities();

        // Kamera sarsıntısıyla derinlik hissiyatı ver
        this.triggerScreenShake(15);

        // Faiz sistemi: Her 100 altın için %5 faiz
        if (this.player && this.player.gold >= 100) {
            const interest = Math.floor(this.player.gold / 100) * 5;
            this.player.gold += interest;
            this.addLog(`💰 Yatırımlarından +${interest} altın faiz geliri kazandın!`, "loot");
        }

        this.addLog(`Zindanın daha karanlık kısımlarına geçtin... Kat: ${this.floor}`, "level");
        
        this.updateUI();
    },

    // Harita üstünde canavar ve sandık sınıflarını ayağa kaldır
    spawnMapEntities() {
        // Sandıkları oluştur
        World.spawnPoints.chests.forEach(pt => {
            this.chests.push(new Chest(pt.x, pt.y));
        });

        // Düşmanları oluştur
        World.spawnPoints.enemies.forEach(pt => {
            this.enemies.push(new Enemy(pt.x, pt.y, pt.type));
        });

        // Portalın hemen solunda Gizemli Seyyar Satıcı oluştur! (Kullanıcı Talebi: Her katta portal kenarında satıcı)
        // Her 5. katta yalnızca efsanevi ve çok nadir eşyalar satan Özel Seyyar Satıcı gelir!
        const isSpecialMerchant = (this.floor % 5 === 0);
        this.merchant = new Merchant(World.portal.x - 52, World.portal.y, isSpecialMerchant);

        // Zindan Muhafızı Boss oluştur (Varsa)
        if (World.spawnPoints.boss) {
            this.boss = new Boss(World.spawnPoints.boss.x, World.spawnPoints.boss.y);
            this.enemies.push(this.boss);
            document.getElementById('boss-hud').classList.add('active');
            // Can barını baştan doldur
            document.getElementById('boss-hp-bar').style.width = '100%';
            SoundEngine.playBossRoar();
        } else {
            document.getElementById('boss-hud').classList.remove('active');
        }
    },

    // 'E' Tuşu ile Sandık Açma / Portala Girme Etkileşim Yönetimi
    handleInteraction() {
        if (this.state !== 'playing') return;

        const interactRange = 40;

        // 1. Yakınlardaki satıcı ile dükkanı aç
        if (this.merchant) {
            const mDist = Math.hypot(this.player.x - this.merchant.x, this.player.y - this.merchant.y);
            if (mDist < this.merchant.interactionRadius) {
                this.openShop();
                return;
            }
        }

        // 1.5. Yakınlardaki sandıkları açmayı dene
        let openedAny = false;
        this.chests.forEach(chest => {
            const dist = Math.hypot(this.player.x - chest.x, this.player.y - chest.y);
            if (dist < interactRange && !chest.opened) {
                chest.open(this);
                openedAny = true;
            }
        });

        if (openedAny) return;

        // 2. Çıkış portalına girmeyi dene (Zindandaki tüm canavarlar yenildiyse portal aktiftir!)
        const portalDist = Math.hypot(this.player.x - World.portal.x, this.player.y - World.portal.y);
        if (portalDist < interactRange) {
            if (World.portal.active) {
                this.nextFloor();
            } else {
                this.addLog("Portal kapalı! Bir sonraki kata geçmek için odalardaki tüm canavarları temizlemelisin!", "system");
                
                // Uçan uyarı yazısı
                this.textParticles.push(new TextParticle(
                    World.portal.x, World.portal.y - 30,
                    "PORTAL KAPALI",
                    "var(--neon-red)",
                    "8px",
                    true
                ));
            }
        }
    },

    // Can kaybı: 3 can sistemi
    loseLife() {
        this.lives = Math.max(0, this.lives - 1);
        this.updateUI();

        if (this.lives > 0) {
            // Can var — aynı katta respawn
            this.state = 'respawning';
            this.addLog(`💔 CAN KAYBETTIN! ${this.lives} canın kaldı. Yeniden doğuyorsun...`, "death");
            setTimeout(() => this.respawnPlayer(), 1500);
        } else {
            // Tüm canlar bitti — gerçek game over
            this.gameOver();
        }
    },

    // Aynı katta yeniden doğ (envanter/ekipman korunur)
    respawnPlayer() {
        if (!this.player || this.state !== 'respawning') return;

        // HP doldur, debuffleri temizle
        this.player.hp = this.player.getMaxHp();
        this.player.burnTimer     = 0;
        this.player.poisonTimer   = 0;
        this.player.slowTimer     = 0;
        this.player.burnTickTimer = 0;
        this.player.poisonTickTimer = 0;
        this.player.regenTimer    = 0;

        // Kat başlangıç noktasına ışınla
        this.player.x = World.spawnPoints.player.x;
        this.player.y = World.spawnPoints.player.y;

        // 2 saniyelik dokunulmazlık (120 frame)
        this.player.invincibleTimer = 120;

        this.state = 'playing';
        this.addLog("✨ Yeniden doğdun! HP doldu, 2sn dokunulmazlık kazandın.", "system");

        if (SoundEngine && !SoundEngine.isMuted) SoundEngine.playMusic();
        this.updateUI();
    },

    // Oyuncu Öldüğünde (Game Over)
    gameOver() {
        this.state = 'gameover';

        // Öldün ekranı
        document.getElementById('summary-floor').innerText = this.floor;
        document.getElementById('summary-gold').innerText = this.player.gold;
        document.getElementById('summary-kills').innerText = this.killsCount;

        document.getElementById('screen-gameover').classList.add('active');

        SoundEngine.stopMusic();
    },

    // Seviye Atlama (Geliştirme Popup Seçim Kartlarını Göster)
    showUpgradeScreen() {
        this.state = 'upgrade';
        
        const container = document.getElementById('upgrade-options-container');
        container.innerHTML = ''; // Eski seçenekleri sil
        
        // 14 farklı geliştirmeden 3 tane benzersiz rastgele seçim kartı üret
        const upgrades = [
            {
                id: 'atk',
                title: 'ALEV GÜCÜ',
                desc: 'Saldırı gücünü kalıcı olarak +4 artırır. Rakipleri yakıp geç.',
                icon: 'fa-fire',
                rarity: 'rare',
                action: () => { this.player.stats.atk += 4; }
            },
            {
                id: 'def',
                title: 'ÇELİK DERİ',
                desc: 'Defansı kalıcı olarak +3 artırır. Gelen hasarları engelle.',
                icon: 'fa-shield-halved',
                rarity: 'rare',
                action: () => { this.player.stats.def += 3; }
            },
            {
                id: 'hp',
                title: 'DEV YÜREĞİ',
                desc: 'Maksimum canı +25 artırır ve canınızı tamamen doldurur.',
                icon: 'fa-heart-pulse',
                rarity: 'legendary',
                action: () => {
                    this.player.stats.maxHp += 25;
                    this.player.hp = this.player.getMaxHp();
                }
            },
            {
                id: 'spd',
                title: 'RÜZGAR ADIMI',
                desc: 'Temel hareket hızını +0.4 artırır. Çok daha kıvrak ol.',
                icon: 'fa-wind',
                rarity: 'epic',
                action: () => { this.player.stats.spd += 0.4; }
            },
            {
                id: 'crit',
                title: 'TAVŞAN AYAĞI',
                desc: 'Kritik vuruş şansını +7% artırarak 2 kat hasar vurma şansını artır.',
                icon: 'fa-bolt',
                rarity: 'legendary',
                action: () => { this.player.stats.crit += 7; }
            },
            {
                id: 'lifesteal',
                title: 'VAMPİR DOKUNUŞU',
                desc: 'Her öldürmede +3 HP kazan. Kan emen saldırı ustası ol.',
                icon: 'fa-droplet',
                rarity: 'legendary',
                action: () => { this.player.hasLifesteal = true; }
            },
            {
                id: 'atkspd',
                title: 'EL ÇABUKLUĞU',
                desc: 'Saldırı cooldown\'unu -5 kare azaltır. Çok daha hızlı sal.',
                icon: 'fa-hand-fist',
                rarity: 'rare',
                action: () => { this.player.attackCooldown = Math.max(8, this.player.attackCooldown - 5); }
            },
            {
                id: 'balanced',
                title: 'DENGELİ GÜÇ',
                desc: '+2 Hasar, +2 Defans, +10 Maksimum Can. Her şeyi dengeli artır.',
                icon: 'fa-scale-balanced',
                rarity: 'rare',
                action: () => { this.player.stats.atk += 2; this.player.stats.def += 2; this.player.stats.maxHp += 10; }
            },
            {
                id: 'ironheart',
                title: 'DEMİR YÜREK',
                desc: 'Maksimum canı +40 artırır ama hız -0.1 düşer. Ham dayanıklılık.',
                icon: 'fa-heart',
                rarity: 'epic',
                action: () => { this.player.stats.maxHp += 40; this.player.stats.spd = Math.max(1, this.player.stats.spd - 0.1); }
            },
            {
                id: 'lethal',
                title: 'ÖLÜMCÜL DARBE',
                desc: '+5 Hasar ve +5% Kritik şansı. Düşmanları tek vuruşta devir.',
                icon: 'fa-skull',
                rarity: 'legendary',
                action: () => { this.player.stats.atk += 5; this.player.stats.crit += 5; }
            },
            {
                id: 'berserker',
                title: 'BERK ÇİLGİNLIK',
                desc: '+6 Hasar, ama Max Can -10. Saldırı odaklı berserker ol.',
                icon: 'fa-face-angry',
                rarity: 'epic',
                action: () => { this.player.stats.atk += 6; this.player.stats.maxHp = Math.max(30, this.player.stats.maxHp - 10); }
            },
            {
                id: 'turtle',
                title: 'KAPLUMBAĞA ZIRHI',
                desc: '+5 Defans ve +0.2 Hız kaybı. Yavaş ama kırılmaz ol.',
                icon: 'fa-shield',
                rarity: 'rare',
                action: () => { this.player.stats.def += 5; this.player.stats.spd = Math.max(1, this.player.stats.spd - 0.2); }
            },
            {
                id: 'fullheal',
                title: 'KUTSAL İYİLEŞME',
                desc: 'Canını tamamen doldurur ve tüm debufları temizler.',
                icon: 'fa-star-of-life',
                rarity: 'legendary',
                action: () => {
                    this.player.hp = this.player.getMaxHp();
                    this.player.burnTimer = 0; this.player.poisonTimer = 0; this.player.slowTimer = 0;
                }
            },
            {
                id: 'dashmaster',
                title: 'GÖLGE ADIMI',
                desc: 'Dash cooldown\'unu 45→20 kareye düşürür. Anlık kaçış ustası.',
                icon: 'fa-person-running',
                rarity: 'epic',
                action: () => { this.player.dashCooldown = 20; }
            },
            {
                id: 'barter',
                title: 'PAZARLIKÇı',
                desc: 'Satıcıda tüm fiyatlar %20 ucuzlar. Sattığın eşyalardan %20 fazla altın kazanırsın.',
                icon: 'fa-handshake',
                rarity: 'rare',
                action: () => { this.player.hasBarter = true; }
            },
            {
                id: 'luck',
                title: 'ŞANS TANRISI',
                desc: 'Şans statını +10 artırır. Düşman altın dropları ve efsanevi eşya şansı yükselir.',
                icon: 'fa-clover',
                rarity: 'rare',
                action: () => { this.player.stats.luck += 10; }
            }
        ];

        // Seçenekleri karıştırıp ilk 3'ünü al
        const shuffled = upgrades.sort(() => 0.5 - Math.random()).slice(0, 3);

        shuffled.forEach(upg => {
            const btn = document.createElement('button');
            btn.className = `upgrade-card shadow-${upg.rarity}`;
            
            let colorClass = 'cyan-color';
            if (upg.rarity === 'epic') colorClass = 'red-color';
            if (upg.rarity === 'legendary') colorClass = 'legendary-color';

            btn.innerHTML = `
                <div class="card-icon ${colorClass}"><i class="fa-solid ${upg.icon}"></i></div>
                <h3 class="pixel-text card-title">${upg.title}</h3>
                <p class="card-desc">${upg.desc}</p>
            `;

            btn.addEventListener('click', () => {
                // Geliştirmeyi uygula
                upg.action();
                
                // Oyunu devam ettir
                this.state = 'playing';
                document.getElementById('screen-upgrade').classList.remove('active');
                
                this.addLog(`Geliştirme Seçildi: ${upg.title}!`, "level");
                
                this.updateUI();
            });

            container.appendChild(btn);
        });

        document.getElementById('screen-upgrade').classList.add('active');
    },

    // Arayüz Değerlerini Güncelle (HUD / Can Barları / Envanter)
    updateUI() {
        if (!this.player) return;

        // 1. Üst HUD Barı
        document.getElementById('floor-val').innerText = this.floor;
        document.getElementById('gold-val').innerText = this.player.gold;

        // 1b. Can (lives) kalpleri
        const livesEl = document.getElementById('lives-display');
        if (livesEl) {
            livesEl.innerHTML = '';
            for (let i = 0; i < 3; i++) {
                const h = document.createElement('span');
                h.className = i < this.lives ? 'life-heart active' : 'life-heart empty';
                h.textContent = '♥';
                livesEl.appendChild(h);
            }
        }

        // 2. Can (HP) ve Tecrübe (XP) Barları
        const maxHp = this.player.getMaxHp();
        const hpPercent = Math.max(0, (this.player.hp / maxHp) * 100);
        document.getElementById('hp-bar').style.width = `${hpPercent}%`;
        document.getElementById('hp-txt').innerText = `${this.player.hp} / ${maxHp}`;

        // 2b. Yatay Mobil Mini HUD (landscape telefon)
        const mobHpBar = document.getElementById('mob-hp-bar');
        if (mobHpBar) mobHpBar.style.width = `${hpPercent}%`;
        const mobHpTxt = document.getElementById('mob-hp-txt');
        if (mobHpTxt) mobHpTxt.textContent = `${this.player.hp}/${maxHp}`;
        const mobFloor = document.getElementById('mob-floor-val');
        if (mobFloor) mobFloor.textContent = this.floor;
        const mobLevel = document.getElementById('mob-level-val');
        if (mobLevel) mobLevel.textContent = this.player.level;
        const mobGold = document.getElementById('mob-gold-val');
        if (mobGold) mobGold.textContent = this.player.gold;

        const xpPercent = Math.max(0, (this.player.xp / this.player.nextLevelXp) * 100);
        document.getElementById('xp-bar').style.width = `${xpPercent}%`;
        document.getElementById('xp-txt').innerText = `${this.player.xp} / ${this.player.nextLevelXp}`;

        document.getElementById('level-val').innerText = this.player.level;

        // 3. Karakter Nitelikleri Değerleri
        document.getElementById('stat-atk').innerText = this.player.getTotalAtk();
        document.getElementById('stat-def').innerText = this.player.getTotalDef();
        document.getElementById('stat-spd').innerText = this.player.getTotalSpd().toFixed(1);
        document.getElementById('stat-crit').innerText = `${this.player.stats.crit}%`;
        const luckEl = document.getElementById('stat-luck');
        if (luckEl) luckEl.innerText = `${this.player.stats.luck}%`;

        // 4. Kuşanmış Ekipman Slotlarını Çiz
        this.drawEquipmentSlot('helmet', this.player.equipment.helmet);
        this.drawEquipmentSlot('necklace', this.player.equipment.necklace);
        this.drawEquipmentSlot('earrings', this.player.equipment.earrings);
        this.drawEquipmentSlot('ring', this.player.equipment.ring);
        this.drawEquipmentSlot('weapon', this.player.equipment.weapon);
        this.drawEquipmentSlot('armor', this.player.equipment.armor);
        this.drawEquipmentSlot('gloves', this.player.equipment.gloves);
        this.drawEquipmentSlot('boots', this.player.equipment.boots);

        // 4b. Set Bonus Kontrolü
        this._checkSetBonus();

        // 5. Yetenek Cooldown Göstergesi (Q ve R butonları üzerinde)
        const cooldownQ = document.getElementById('cooldown-q');
        const cooldownR = document.getElementById('cooldown-r');
        if (cooldownQ) {
            const qRatio = this.player.qCooldown / this.player.qMaxCooldown;
            if (this.player.qCooldown > 0) {
                cooldownQ.style.height = `${qRatio * 100}%`;
                const qSecs = Math.ceil(this.player.qCooldown / 60);
                cooldownQ.textContent = `${qSecs}s`;
                cooldownQ.style.display = 'flex';
            } else {
                cooldownQ.style.height = '0%';
                cooldownQ.textContent = '';
                cooldownQ.style.display = 'none';
            }
        }
        if (cooldownR) {
            const rRatio = this.player.wCooldown / this.player.wMaxCooldown;
            if (this.player.wCooldown > 0) {
                cooldownR.style.height = `${rRatio * 100}%`;
                const rSecs = Math.ceil(this.player.wCooldown / 60);
                cooldownR.textContent = `${rSecs}s`;
                cooldownR.style.display = 'flex';
            } else {
                cooldownR.style.height = '0%';
                cooldownR.textContent = '';
                cooldownR.style.display = 'none';
            }
        }

        // 6. Debuff Durum Göstergesi (HUD'da simge ile)
        this._updateDebuffHUD();

        // 7. Envanter Grid Çizimi
        this.drawInventory();
    },

    _checkSetBonus() {
        if (!this.player) return;
        const eq = this.player.equipment;

        // Tüm kuşanılmış ekipmanların nadirliklerini say
        const rarities = Object.values(eq).filter(Boolean).map(i => i.rarity);
        const legendaryCount = rarities.filter(r => r === 'legendary').length;
        const rareCount = rarities.filter(r => r === 'rare').length;

        // Set bonus: daha önce uygulananları tekrar uygulama
        if (!this.player._setBonusApplied) this.player._setBonusApplied = {};

        // Full Legendary Set (6+ efsanevi) → Titan Seti
        if (legendaryCount >= 6 && !this.player._setBonusApplied['titan']) {
            this.player._setBonusApplied['titan'] = true;
            this.player.stats.atk += 10;
            this.player.stats.def += 6;
            this.player.stats.crit += 8;
            this.addLog("TİTAN SETİ TAMAMLANDI! +10 Hasar, +6 Def, +8% Kritik! EFSANE BONUS!", "level");
            if (window.SoundEngine) SoundEngine.playLevelUp();
        }

        // Full Rare Set (6+ nadir) → Şövalye Seti
        if (rareCount >= 6 && !this.player._setBonusApplied['knight']) {
            this.player._setBonusApplied['knight'] = true;
            this.player.stats.atk += 5;
            this.player.stats.def += 4;
            this.player.stats.maxHp += 30;
            this.addLog("ŞÖVALYE SETİ TAMAMLANDI! +5 Hasar, +4 Def, +30 Can! Set Bonusu Aktif!", "level");
        }
    },

    _updateDebuffHUD() {
        if (!this.player) return;
        // Mevcut debuff göstergesi HTML elemanı varsa güncelle (yoksa yoksay)
        const debuffEl = document.getElementById('debuff-indicators');
        if (!debuffEl) return;
        let html = '';
        if (this.player.burnTimer > 0) {
            const s = Math.ceil(this.player.burnTimer / 60);
            html += `<span class="debuff-icon burn-icon" title="Yanma ${s}s">🔥${s}s</span>`;
        }
        if (this.player.poisonTimer > 0) {
            const s = Math.ceil(this.player.poisonTimer / 60);
            html += `<span class="debuff-icon poison-icon" title="Zehir ${s}s">☠${s}s</span>`;
        }
        if (this.player.slowTimer > 0) {
            const s = Math.ceil(this.player.slowTimer / 60);
            html += `<span class="debuff-icon slow-icon" title="Yavaşlama ${s}s">🐢${s}s</span>`;
        }
        debuffEl.innerHTML = html;
    },

    // Tüm item türleri için doğru sprite anahtarını döner
    _getItemSpriteKey(item) {
        const type = item.type;
        const rar  = item.rarity;  // enchant sonrası değişmiş olabilir
        if (type.startsWith('sword_'))    return `item_sword_${rar}`;
        if (type.startsWith('bow_'))      return `item_bow_${rar}`;
        if (type.startsWith('armor_'))    return `item_armor_${rar}`;
        if (type.startsWith('helmet_'))   return `item_helmet_${rar}`;
        if (type.startsWith('necklace_')) return `item_necklace_${rar}`;
        if (type.startsWith('earrings_')) return `item_earrings_${rar}`;
        if (type.startsWith('ring_'))     return `item_ring_${rar}`;
        if (type.startsWith('gloves_'))   return `item_gloves_${rar}`;
        if (type.startsWith('boots_'))    return `item_boots_${rar}`;
        // Yeni tipler → mevcut sprite'lara eşle
        if (type.startsWith('dagger_'))   return `item_sword_${rar}`;
        if (type.startsWith('staff_'))    return `item_sword_${rar}`;
        if (type.startsWith('shield_'))   return `item_armor_${rar}`;
        if (type === 'potion_big')        return 'item_potion_red';
        return `item_${type}`; // gold, potion_red, potion_blue
    },

    // Silah / Zırh Kuşanma pencerelerini doldurur
    drawEquipmentSlot(slotType, item) {
        const slotEl = document.getElementById(`slot-${slotType}`);
        const itemContainer = slotEl.querySelector('.slot-item-container');
        
        itemContainer.innerHTML = ''; // Temizle
        slotEl.className = 'equip-slot'; // Reset class

        if (item) {
            slotEl.classList.add(`rarity-glow-${item.rarity}`);
            
            // Piksel eşya ikonunu çizmek için dinamik canvas oluştur
            const canvas = document.createElement('canvas');
            canvas.width = 36;
            canvas.height = 36;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;

            const spriteKey = this._getItemSpriteKey(item);

            SpriteEngine.draw(ctx, spriteKey, 0, 0, 36, 36);

            canvas.className = 'pixel-item';
            itemContainer.appendChild(canvas);

            // Hover olaylarında tooltip göster
            canvas.addEventListener('mouseenter', (e) => this.showTooltip(item));
            canvas.addEventListener('mouseleave', () => this.hideTooltip());
            
            // Tıklanırsa kuşanılmış eşyayı çıkar ve envantere at
            canvas.addEventListener('click', () => {
                if (this.player.inventory.length >= this.player.maxInventorySlots) {
                    this.addLog("Kuşanılan eşyayı çıkarmak için envanterinizde yer olmalı!", "system");
                    return;
                }
                
                this.player.inventory.push(item);
                this.player.equipment[slotType] = null;
                
                if (window.SpriteEngine) {
                    window.SpriteEngine.updatePlayerSprites(this.player.equipment);
                }

                SoundEngine.playChestOpen();
                this.addLog(`${item.name} kuşanılmaktan çıkarıldı.`, "system");
                this.hideTooltip();
                this.updateUI();
            });
        }
    },

    // Envanterdeki 16 slotu dinamik çizer
    drawInventory() {
        const container = document.getElementById('inventory-container');
        container.innerHTML = ''; // Temizle

        const invCount = this.player.inventory.length; // Her yığın 1 slot sayılır
        document.getElementById('inv-count').innerText = `${invCount}/${this.player.maxInventorySlots}`;

        // 16 yuva oluştur
        for (let i = 0; i < this.player.maxInventorySlots; i++) {
            const slot = document.createElement('div');
            slot.className = 'inv-slot';

            const item = this.player.inventory[i];
            if (item) {
                slot.classList.add(`rarity-glow-${item.rarity}`);

                // İtem sprite canvas'ı
                const canvas = document.createElement('canvas');
                canvas.width = 32;
                canvas.height = 32;
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = false;

                const spriteKey = this._getItemSpriteKey(item);

                SpriteEngine.draw(ctx, spriteKey, 0, 0, 32, 32);

                canvas.className = 'pixel-item';
                slot.appendChild(canvas);

                // Yığın sayısı rozeti (count > 1 ise sağ alt köşe)
                if ((item.count || 1) > 1) {
                    const badge = document.createElement('span');
                    badge.className = 'inv-count-badge';
                    badge.textContent = item.count;
                    slot.appendChild(badge);
                }

                // Eşya açıklaması hover tooltip (isInventory = true)
                canvas.addEventListener('mouseenter', () => this.showTooltip(item, true));
                canvas.addEventListener('mouseleave', () => this.hideTooltip());

                // Sol tık: kullan / kuşan
                canvas.addEventListener('click', () => {
                    this.player.useItem(i, this);
                    this.hideTooltip();
                });

                // Sağ tık: sat
                canvas.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    this.sellInventoryItem(i);
                    this.hideTooltip();
                });
            }

            container.appendChild(slot);
        }
    },

    // Hover Tooltip Bilgi Penceresi Gösterimi
    showTooltip(item, isInventory = false) {
        const tooltip = document.getElementById('item-tooltip');
        const nameEl = document.getElementById('tooltip-name');
        const rarityEl = document.getElementById('tooltip-rarity');
        const statsEl = document.getElementById('tooltip-stats');
        const descEl = document.getElementById('tooltip-description');
        const sellEl = document.getElementById('tooltip-sell-price');
        const hintEl = tooltip.querySelector('.tooltip-action-hint');

        nameEl.innerText = item.name.toUpperCase();
        nameEl.className = `pixel-text rarity-color-${item.rarity}`;

        // Nadirlik etiket sınıfı
        rarityEl.innerText = item.rarity === 'common' ? 'YAYGIN' : (item.rarity === 'rare' ? 'NADİR' : 'EFSANEVİ');
        rarityEl.className = `item-rarity-badge rarity-badge-${item.rarity}`;

        // Nitelik bonuslarını doldur
        statsEl.innerHTML = '';
        if (item.stats) {
            if (item.stats.atk) statsEl.innerHTML += `<div>+${item.stats.atk} SALDIRI</div>`;
            if (item.stats.def) statsEl.innerHTML += `<div style="color: var(--neon-cyan)">+${item.stats.def} DEFANS</div>`;
            if (item.stats.hp) statsEl.innerHTML += `<div style="color: var(--neon-green)">+${item.stats.hp} MAKS CAN</div>`;
            if (item.stats.spd) statsEl.innerHTML += `<div style="color: var(--neon-purple)">+${Math.floor(item.stats.spd * 100)}% HIZ</div>`;
            if (item.stats.crit) statsEl.innerHTML += `<div style="color: var(--neon-gold)">+${item.stats.crit}% KRİTİK</div>`;
        }

        descEl.innerText = item.description || '';

        // CSS rengini nadirliğe göre eşitle
        const rarityColors = { common: 'var(--rarity-common)', rare: 'var(--rarity-rare)', legendary: 'var(--rarity-legendary)' };
        nameEl.style.color = rarityColors[item.rarity];

        // Envanter tooltip'i: satış fiyatı ve sağ tık ipucu
        if (isInventory && item.type !== 'gold') {
            const price = this.getSellPrice(item);
            sellEl.innerHTML = `<i class="fa-solid fa-coins"></i> SAT: <span>${price} Altın</span>`;
            sellEl.style.display = 'flex';
            hintEl.innerHTML = 'Sol tık: Kuşan/Kullan &nbsp;|&nbsp; <span style="color:var(--neon-red)">Sağ tık: Sat</span>';
        } else {
            sellEl.style.display = 'none';
            hintEl.textContent = 'Kuşanmak veya kullanmak için tıkla';
        }

        tooltip.style.display = 'block';
    },

    hideTooltip() {
        const tooltip = document.getElementById('item-tooltip');
        if (tooltip) tooltip.style.display = 'none';
    },

    // Eşya satış fiyatını döndür (Pazarlıkçı: +%20)
    getSellPrice(item) {
        if (item.type === 'potion_red' || item.type === 'potion_blue') return 10;
        const prices = { common: 8, rare: 22, legendary: 65 };
        const base = prices[item.rarity] || 5;
        return this.player && this.player.hasBarter ? Math.floor(base * 1.2) : base;
    },

    // Envanterden eşya sat
    sellInventoryItem(index) {
        const item = this.player.inventory[index];
        if (!item || item.type === 'gold') return;

        const price = this.getSellPrice(item);
        this.player.inventory.splice(index, 1);
        this.player.gold += price;

        SoundEngine.playBuy();
        this.addLog(`Satıldı: [${item.name}] → +${price} Altın`, "loot");

        if (this.state === 'playing') {
            this.textParticles.push(new TextParticle(
                this.player.x, this.player.y - 30,
                `+${price}g`,
                'var(--neon-gold)',
                '10px',
                false
            ));
        }

        this.updateUI();
    },

    // Ekran Sarsıntısı Tetikleyici (Engine'e köprü)
    triggerScreenShake(intensity) {
        ScreenEffects.trigger(intensity);
    },

    // Savaş günlüğüne mesaj ekleme fonksiyonu
    addLog(text, type = "system") {
        const logBody = document.getElementById('combat-log');
        if (!logBody) return;

        const now = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

        const entry = document.createElement('p');
        entry.className = `log-entry ${type}`;
        entry.innerHTML = `<span class="time">[${timeStr}]</span> ${text}`;

        logBody.appendChild(entry);
        
        // Log sayısını sınırla (Max 40 satır)
        while (logBody.children.length > 40) {
            logBody.removeChild(logBody.firstChild);
        }

        // Günlüğü en aşağıya kaydır
        logBody.scrollTop = logBody.scrollHeight;
    },

    // --- ARKA PLAN (DASHBOARD DIŞI) NEON PARÇACIK EFEKTİ ---
    initBackgroundParticles() {
        this.bgCanvas = document.getElementById('bg-particles');
        this.bgCtx = this.bgCanvas.getContext('2d');
        
        this.resizeBgCanvas();
        window.addEventListener('resize', () => this.resizeBgCanvas());

        // 35 adet yavaş yüzen neon mor/mavi toz parçacığı oluştur
        this.bgParticles = [];
        for (let i = 0; i < 35; i++) {
            this.bgParticles.push({
                x: Math.random() * this.bgCanvas.width,
                y: Math.random() * this.bgCanvas.height,
                vx: (Math.random() - 0.5) * 0.4,
                vy: -0.2 - Math.random() * 0.4,
                size: Math.random() * 2 + 1,
                color: Math.random() < 0.5 ? 'rgba(0, 240, 255, 0.15)' : 'rgba(176, 38, 255, 0.15)'
            });
        }
    },

    resizeBgCanvas() {
        if (this.bgCanvas) {
            this.bgCanvas.width = window.innerWidth;
            this.bgCanvas.height = window.innerHeight;
        }
    },

    updateBackgroundParticles() {
        if (!this.bgCanvas) return;

        this.bgParticles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;

            // Ekran dışına çıkanları alttan tekrar sür
            if (p.y < -10) {
                p.y = this.bgCanvas.height + 10;
                p.x = Math.random() * this.bgCanvas.width;
            }
            if (p.x < -10 || p.x > this.bgCanvas.width + 10) {
                p.vx *= -1;
            }
        });
    },

    drawBackgroundParticles() {
        if (!this.bgCanvas) return;

        this.bgCtx.clearRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);
        this.bgParticles.forEach(p => {
            this.bgCtx.fillStyle = p.color;
            this.bgCtx.beginPath();
            this.bgCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.bgCtx.fill();
        });
    },

    // --- GAME LOOP: FİZİK VE MANTIK GÜNCELLEMELERİ ---
    update(dt) {
        // Arka plan zerrelerini her durumda oynat
        this.updateBackgroundParticles();

        if (this.state !== 'playing') return;

        // 1. Çıkış Portalı Aktivasyon Durumu Kontrolü
        // Zindandaki tüm düşmanlar öldüyse portal aktifleşir!
        if (this.enemies.length === 0 && !World.portal.active) {
            World.portal.active = true;
            SoundEngine.playLevelUp(); // Küçük bir chiptune uyarısı
            this.addLog("ZİNDANDAKİ TÜM YARATIKLAR YENİLDİ! Çıkış Portalı Aktifleşti!", "level");
            this.textParticles.push(new TextParticle(
                World.portal.x, World.portal.y - 30,
                "PORTAL AKTİF!",
                "var(--neon-green)",
                "9px",
                true
            ));
        }

        // Portal dönme animasyon karesi zamanlayıcısı
        this.portalTimer++;
        if (this.portalTimer >= 15) {
            this.portalFrame = this.portalFrame === 1 ? 2 : 1;
            this.portalTimer = 0;
        }

        // 2. Oyuncuyu Güncelle
        this.player.update(Keyboard, Mouse, this);

        // Satıcıyı Güncelle
        if (this.merchant) {
            this.merchant.update(this.player, this);
        }

        // Boss Can Barı HUD güncellemesi
        if (this.boss) {
            const hpPercent = Math.max(0, (this.boss.hp / this.boss.maxHp) * 100);
            const barEl = document.getElementById('boss-hp-bar');
            barEl.style.width = `${hpPercent}%`;

            // Faz rengi: 1=kırmızı, 2=turuncu, 3=mor, 4=pembe alev
            const phaseColors = ['#ff3b30', '#ff8c00', '#b026ff', '#ff2d78'];
            barEl.style.background = phaseColors[(this.boss.phase || 1) - 1];

            // Boss adı faz göstergesiyle güncelle
            const nameEl = document.getElementById('boss-name');
            if (nameEl) {
                const phaseStr = this.boss.phase > 1 ? ` — FAZ ${this.boss.phase}` : '';
                nameEl.textContent = `${this.boss.name}${phaseStr}`;
            }

            if (this.boss.hp <= 0) {
                this.boss = null;
                document.getElementById('boss-hud').classList.remove('active');
            }
        }

        // Kamerayı oyuncu konumuna göre sabitle
        World.camera.update(this.player.x, this.player.y, this.canvas.width, this.canvas.height);

        // 3. Düşmanları Güncelle
        this.enemies.forEach(enemy => enemy.update(this.player, this));

        // 4. Ganimetleri Güncelle
        this.items.forEach(item => item.update());

        // 4.5. Mermileri ve Büyüleri Güncelle
        this.projectiles.forEach(p => p.update(this));
        this.projectiles = this.projectiles.filter(p => {
            if (p instanceof WeaponRainProjectile) return !p.exploded;
            return p.life > 0;
        });

        // 5. Partikülleri Güncelle (Süreleri bittiyse sil)
        this.particles.forEach(p => p.update());
        this.particles = this.particles.filter(p => p.life > 0);

        // 6. Uçan Metinleri Güncelle
        this.textParticles.forEach(tp => tp.update());
        this.textParticles = this.textParticles.filter(tp => tp.life > 0);
    },

    // --- GAME LOOP: EKRANA GÖRSELLERİ ÇİZ ---
    draw() {
        // 1. Arayüz dışındaki arka plan parçacıklarını çiz
        this.drawBackgroundParticles();

        // 2. Ana oyun canvas ekranını temizle
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Çizimleri sarsıntı efekti (Screen Shake) için korumaya al (save)
        this.ctx.save();
        
        // Darbe anında ekranı sars
        ScreenEffects.apply(this.ctx);

        // Zindan Karolarını Çiz
        World.draw(this.ctx, this.canvas.width, this.canvas.height);

        // Çıkış Portalını Çiz
        const portalDrawX = World.portal.x - World.camera.x - 24;
        const portalDrawY = World.portal.y - World.camera.y - 24;
        
        if (World.portal.active) {
            // Portal parıltı dairesi
            this.ctx.save();
            const pGrad = this.ctx.createRadialGradient(
                World.portal.x - World.camera.x, World.portal.y - World.camera.y, 4,
                World.portal.x - World.camera.x, World.portal.y - World.camera.y, 35
            );
            pGrad.addColorStop(0, `rgba(176, 38, 255, ${0.45 + Math.sin(Date.now() / 150) * 0.15})`);
            pGrad.addColorStop(1, 'rgba(0,0,0,0)');
            this.ctx.fillStyle = pGrad;
            this.ctx.beginPath();
            this.ctx.arc(World.portal.x - World.camera.x, World.portal.y - World.camera.y, 35, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();

            // Aktif portal spriteları
            const portalSprite = `portal${this.portalFrame}`;
            SpriteEngine.draw(this.ctx, portalSprite, portalDrawX, portalDrawY, 48, 48);
        } else {
            // Pasif portal (Sönük gri portal halkası)
            this.ctx.save();
            this.ctx.filter = 'grayscale(1) brightness(0.4)';
            SpriteEngine.draw(this.ctx, 'portal1', portalDrawX, portalDrawY, 48, 48);
            this.ctx.restore();
        }

        // Sandıkları Çiz
        this.chests.forEach(chest => chest.draw(this.ctx, World.camera));

        // Ganimet Eşyalarını Çiz
        this.items.forEach(item => item.draw(this.ctx, World.camera));

        // Satıcıyı Çiz
        if (this.merchant) {
            this.merchant.draw(this.ctx, World.camera);
        }

        // Mermileri ve Büyüleri Çiz
        this.projectiles.forEach(p => p.draw(this.ctx, World.camera));

        // Düşmanları Çiz
        this.enemies.forEach(enemy => enemy.draw(this.ctx, World.camera));

        // Oyuncuyu Çiz
        if (this.player) {
            this.player.draw(this.ctx, World.camera);
        }

        // Görsel Efekt Partiküllerini Çiz
        this.particles.forEach(p => p.draw(this.ctx, World.camera));

        // Uçan Sayı Metinlerini Çiz
        this.textParticles.forEach(tp => tp.draw(this.ctx, World.camera));

        // Meşale Işık Maskesini Üzerine Çiz (Fog of War)
        if (this.player && this.state === 'playing') {
            World.drawTorchLight(this.ctx, this.player.x, this.player.y, this.canvas.width, this.canvas.height);
        }

        // Sarsıntı matrisini kapat
        this.ctx.restore();

        // Kombo sayacı canvas üzerinde göster (sağ üst)
        if (this.state === 'playing' && this.player && this.player.comboCount >= 3) {
            const cx = this.canvas.width - 10;
            const cy = 40;
            const comboColor = this.player.comboCount >= 20 ? '#ff00ff' : this.player.comboCount >= 10 ? '#ffd700' : '#00f0ff';
            this.ctx.save();
            this.ctx.textAlign = 'right';
            this.ctx.font = "bold 14px 'Press Start 2P'";
            this.ctx.strokeStyle = '#000'; this.ctx.lineWidth = 4;
            this.ctx.strokeText(`COMBO x${this.player.comboCount}`, cx, cy);
            this.ctx.fillStyle = comboColor;
            this.ctx.fillText(`COMBO x${this.player.comboCount}`, cx, cy);
            this.ctx.restore();
        }

        // 3. Ekrana ek görsel HUD uyarıları çizdir (Portal Aktifse canvas ortasında yanıp sönen uyarı)
        if (this.state === 'playing' && World.portal.active) {
            this.ctx.save();
            this.ctx.font = "8px 'Press Start 2P'";
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = `rgba(57, 255, 20, ${0.45 + Math.sin(Date.now() / 150) * 0.4})`; // Neon yeşil parıltı
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 3;
            this.ctx.strokeText("PORTAL AÇILDI! ÇIKIŞ YOLUNU BUL", this.canvas.width / 2, 35);
            this.ctx.fillText("PORTAL AÇILDI! ÇIKIŞ YOLUNU BUL", this.canvas.width / 2, 35);
            this.ctx.restore();
        }
    },

    // --- GİZEMLİ SATICI DÜKKAN YÖNETİMİ ---
    openShop() {
        this.state = 'shop';
        
        // Dükkanı açtığımızda rastgele 4 eşya üret
        if (!this.shopItems) {
            this.generateShopItems();
        }

        this.drawShop();
        
        document.getElementById('screen-shop').classList.add('active');
        SoundEngine.playBuy(); // Dükkanı açarken minik çınlama sesi çal
    },

    closeShop() {
        this.state = 'playing';
        document.getElementById('screen-shop').classList.remove('active');
        this.updateUI();
    },

    generateShopItems() {
        const isSpecial = this.merchant && this.merchant.isSpecial;
        this.shopItems = [];

        // 1. Birinci Slot: İksir (Sağlık veya Hız)
        const potType = Math.random() < 0.6 ? 'potion_red' : 'potion_blue';
        const potPrice = isSpecial ? 30 : 15;
        this.shopItems.push({
            type: potType,
            name: potType === 'potion_red' ? 'Büyük Sağlık İksiri' : 'Kadim Hız İksiri',
            rarity: isSpecial ? 'legendary' : 'rare',
            price: potPrice,
            stats: {},
            description: potType === 'potion_red' 
                ? `Maksimum canınıza göre sağlığınızı yeniler.` 
                : `10 saniyeliğine +35% Hareket Hızı sağlar.`,
            sold: false
        });

        // 2, 3, 4. Slotlar: Rastgele Ekipman Parçaları!
        const gearCategories = ['sword', 'bow', 'armor', 'helmet', 'necklace', 'earrings', 'ring', 'gloves', 'boots'];
        
        for (let i = 0; i < 3; i++) {
            // Her slot için rastgele kategori seç
            const category = gearCategories[Math.floor(Math.random() * gearCategories.length)];
            
            // Nadirlik belirle:
            // Özel satıcıda en az 1 efsanevi garanti, diğerleri de rare/legendary
            // Normal satıcıda ise çoğunlukla common/rare, çok nadiren legendary
            let rarity = 'common';
            if (isSpecial) {
                if (i === 0) {
                    rarity = 'legendary';
                } else {
                    rarity = Math.random() < 0.45 ? 'legendary' : 'rare';
                }
            } else {
                const rRoll = Math.random();
                if (rRoll < 0.06) rarity = 'legendary';
                else if (rRoll < 0.30) rarity = 'rare';
                else rarity = 'common';
            }

            // Statları ve Fiyatı ata (Nadirliğe göre)
            const tempItem = new Item(0, 0, `${category}_${rarity}`);
            const stats = tempItem.stats;
            const displayName = tempItem.name;
            const description = tempItem.description;

            // Fiyatı belirle
            let price = 25;
            if (rarity === 'common') price = Math.floor(Math.random() * 10) + 25; // 25-35
            else if (rarity === 'rare') price = Math.floor(Math.random() * 20) + 50; // 50-70
            else if (rarity === 'legendary') price = Math.floor(Math.random() * 40) + 120; // 120-160

            this.shopItems.push({
                type: `${category}_${rarity}`,
                name: displayName,
                rarity: rarity,
                price: price,
                stats: stats,
                description: description,
                sold: false
            });
        }
    },

    drawShop() {
        const container = document.getElementById('shop-items-container');
        container.innerHTML = '';

        this.shopItems.forEach((item, idx) => {
            const card = document.createElement('div');
            card.className = `shop-card rarity-${item.rarity} ${item.sold ? 'sold-out' : ''}`;

            // Eşya ikonu çizmek için canvas
            const canvas = document.createElement('canvas');
            canvas.width = 48;
            canvas.height = 48;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;

            let spriteKey = `item_${item.type}`;
            SpriteEngine.draw(ctx, spriteKey, 0, 0, 48, 48);

            // Bilgi detayları
            const infoDiv = document.createElement('div');
            infoDiv.className = 'shop-item-info';
            
            let statText = '';
            if (item.stats) {
                if (item.stats.atk) statText += `<div class="shop-stat red-color">+${item.stats.atk} HASAR</div>`;
                if (item.stats.def) statText += `<div class="shop-stat cyan-color">+${item.stats.def} DEFANS</div>`;
                if (item.stats.hp) statText += `<div class="shop-stat green-color">+${item.stats.hp} CAN</div>`;
                if (item.stats.spd) statText += `<div class="shop-stat purple-color">+${Math.floor(item.stats.spd * 100)}% HIZ</div>`;
                if (item.stats.crit) statText += `<div class="shop-stat gold-color">+${item.stats.crit}% KRİTİK</div>`;
            }

            infoDiv.innerHTML = `
                <h3 class="pixel-text shop-item-name rarity-color-${item.rarity}">${item.name.toUpperCase()}</h3>
                <p class="shop-item-desc">${item.description}</p>
                ${statText}
            `;

            // Buton ve Fiyat Etiketi
            const actionDiv = document.createElement('div');
            actionDiv.className = 'shop-action-area';

            if (item.sold) {
                actionDiv.innerHTML = `<button class="shop-buy-btn disabled" disabled>TÜKENDİ</button>`;
            } else {
                // Pazarlıkçı: fiyatı %20 indir
                const displayPrice = this.player.hasBarter ? Math.floor(item.price * 0.8) : item.price;
                item._displayPrice = displayPrice; // buyShopItem'de kullanılır
                const buyBtn = document.createElement('button');
                buyBtn.className = `shop-buy-btn ${this.player.gold >= displayPrice ? '' : 'poor'}`;
                buyBtn.innerHTML = `
                    <span>SATIN AL</span>
                    <span class="shop-price-tag"><i class="fa-solid fa-coins gold-color"></i> ${displayPrice}g${this.player.hasBarter ? ' <span style="color:#aaffaa;font-size:8px">(%20 İND.)</span>' : ''}</span>
                `;

                buyBtn.addEventListener('click', () => {
                    this.buyShopItem(idx);
                });

                actionDiv.appendChild(buyBtn);
            }

            card.appendChild(canvas);
            card.appendChild(infoDiv);
            card.appendChild(actionDiv);

            container.appendChild(card);
        });
    },

    buyShopItem(index) {
        const item = this.shopItems[index];
        if (!item || item.sold) return;

        // Pazarlıkçı indirimi uygula
        const actualPrice = item._displayPrice !== undefined ? item._displayPrice : item.price;

        // Altın yeterli mi?
        if (this.player.gold < actualPrice) {
            SoundEngine.playHit(); // Hata sesi
            this.addLog("Yetersiz altın! Canavarlardan altın toplayıp geri gel.", "system");
            
            // Uçan uyarı yazısı
            this.textParticles.push(new TextParticle(
                this.player.x, this.player.y - 20,
                "ALTIN YETERSİZ!",
                "var(--neon-red)",
                "8px",
                true
            ));
            return;
        }

        // Envanterde yer var mı?
        if (this.player.inventory.length >= this.player.maxInventorySlots) {
            SoundEngine.playHit();
            this.addLog("Envanteriniz dolu! Eşya satın alınamadı.", "system");
            return;
        }

        // Altını düş (pazarlıkçı indirimi uygulanmış fiyatla), eşyayı satıldı işaretle ve envantere ekle
        this.player.gold -= actualPrice;
        item.sold = true;

        // Envantere yeni Item sınıfı nesnesi ekle
        this.player.inventory.push(new Item(0, 0, item.type));

        SoundEngine.playBuy(); // Para sesi
        this.addLog(`Satın alındı: [${item.name}]`, "loot");

        // UI ve dükkanı yeniden çiz
        this.updateUI();
        this.drawShop();
    }
};

// Sayfa tamamen yüklendiğinde motoru tetikle
window.addEventListener('DOMContentLoaded', () => {
    window.GameEngine = GameEngine;
    GameEngine.init();
});
