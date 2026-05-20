/**
 * ==========================================================================
 * EREVORN - ORCHESTRATOR & STATE MANAGER
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
    state: 'start',
    shrines: [],        // Kutsal sütunlar
    currentQuest: null, // Aktif kat görevi
    questProgress: 0,
    questCompleted: false,
    playerHitThisFloor: false, // "Gölge" görevi için
    crtEnabled: false,  // CRT filtre aktif mi?
    achievementNotif: null, // { text, timer }
    selectedClass: 'warrior', // Başlangıç sınıfı: warrior / ranger / mage
    _hoveredInvIndex: -1,    // Tooltip üzerindeki envanter slot indeksi (salvage için)
    _tooltipHideTimeout: null,
    traps: [],               // Çevre tuzakları
    captives: [],            // Kurtarılabilir esir NPC'ler
    _lastCombatState: false, // Dinamik müzik için savaş durumu takibi
    tutorialStep: -1,        // -1=kapalı, 0-4=aktif ipucu adımı
    tutorialTimer: 0,        // Her adımın gösterim süreci
    
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

        // CRT filtre toggle
        document.getElementById('btn-crt').addEventListener('click', () => {
            this.crtEnabled = !this.crtEnabled;
            const wrapper = document.querySelector('.canvas-wrapper');
            if (wrapper) wrapper.classList.toggle('crt-on', this.crtEnabled);
            const btn = document.getElementById('btn-crt');
            btn.style.color = this.crtEnabled ? 'var(--neon-cyan)' : '';
            btn.style.borderColor = this.crtEnabled ? 'var(--neon-cyan)' : '';
        });

        // Ses seviyesi sürgüsü
        document.getElementById('slider-vol').addEventListener('input', (e) => {
            const vol = parseInt(e.target.value) / 100;
            SoundEngine.init();
            if (SoundEngine.masterGain) SoundEngine.masterGain.gain.setValueAtTime(vol * 0.3, SoundEngine.ctx.currentTime);
        });

        document.getElementById('btn-close-shop').addEventListener('click', () => {
            this.closeShop();
        });

        document.getElementById('btn-close-forge').addEventListener('click', () => {
            this.closeForge();
        });

        document.getElementById('btn-victory-retry').addEventListener('click', () => {
            this.closeVictory();
            this.startNewGame();
        });

        document.getElementById('btn-meta').addEventListener('click', () => {
            this.openMetaScreen();
        });

        document.getElementById('btn-close-meta').addEventListener('click', () => {
            this.closeMetaScreen();
        });

        document.getElementById('btn-story-continue').addEventListener('click', () => {
            this.closeStoryDialog();
        });

        // Parçalama (Salvage) butonu tooltip içinde
        document.getElementById('btn-tooltip-salvage').addEventListener('click', () => {
            if (this._hoveredInvIndex >= 0) {
                this.salvageItem(this._hoveredInvIndex);
                this.hideTooltip();
            }
        });

        document.getElementById('btn-sort-inv').addEventListener('click', () => {
            if (this.state === 'playing' && this.player) this.sortInventory();
        });

        document.getElementById('btn-forge').addEventListener('click', () => {
            if (this.state === 'playing' && this.player) this.openForge();
        });

        // Başlangıç sınıfı seçim kartları
        document.querySelectorAll('.class-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.class-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedClass = card.dataset.class;
            });
        });

        // Tooltip üzerinde fareyle: salvage butonuna geçerken kapanmasın
        const tooltipEl = document.getElementById('item-tooltip');
        if (tooltipEl) {
            tooltipEl.addEventListener('mouseenter', () => {
                if (this._tooltipHideTimeout) { clearTimeout(this._tooltipHideTimeout); this._tooltipHideTimeout = null; }
            });
            tooltipEl.addEventListener('mouseleave', () => { this._hoveredInvIndex = -1; this.hideTooltip(); });
        }

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

        // Erevorn menü jenerik müzik başlatma dinleyicisi (Autoplay engeline takılmamak için ilk tıklamada çalar)
        document.addEventListener('click', () => {
            const startScreen = document.getElementById('screen-start');
            if (startScreen && startScreen.classList.contains('active') && !SoundEngine.isMuted) {
                SoundEngine.playMenuMusic();
            }
        });
    },

    // Yeni Bir Oyuna Sıfırdan Başla
    startNewGame() {
        this.floor = 1;
        this.killsCount = 0;
        this.lives = 3;
        this.shrines = [];
        this.traps = [];
        this.captives = [];
        this.currentQuest = null;
        this.questProgress = 0;
        this.questCompleted = false;
        this.playerHitThisFloor = false;
        this._lastCombatState = false;
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

        // Sınıf bonusları uygula — güçlü ve belirgin farklılıklar + farklı başlangıç ekipmanı
        this.selectedClass = this.selectedClass || 'warrior';
        if (this.selectedClass === 'warrior') {
            this.player.stats.def  += 8;
            this.player.stats.atk  += 5;
            this.player.stats.maxHp+= 20;
            // Savaşçı: Kalkan ile başlar (zırh slotuna)
            this.player.equipment.armor = { type: 'shield_common', name: 'Başlangıç Kalkanı', rarity: 'common', stats: { def: 4, hp: 8 }, description: 'Savaşçının kalkanı.' };
            this.addLog("⚔️ SAVAŞÇI: +8 Def, +5 Atk, +20 Can, Kalkan kuşandın!", "level");
        } else if (this.selectedClass === 'ranger') {
            this.player.stats.crit += 12;
            this.player.stats.spd  += 0.6;
            this.player.stats.atk  += 4;
            // Nişancı: Yay ile başlar (silah slotuna)
            this.player.equipment.weapon = { type: 'bow_common', name: 'Başlangıç Yayı', rarity: 'common', stats: { atk: 4 }, description: 'Nişancının yayı. (+4 Hasar)' };
            this.addLog("🏹 NİŞANCI: +12 Kritik, +0.6 Hız, +4 Atk, Yay kuşandın!", "level");
        } else if (this.selectedClass === 'mage') {
            this.player.qMaxCooldown = Math.floor(this.player.qMaxCooldown * 0.55);
            this.player.wMaxCooldown = Math.floor(this.player.wMaxCooldown * 0.55);
            this.player.stats.atk  += 9;
            this.player.stats.crit += 6;
            this.player.stats.maxHp+= 25;
            // Büyücü: Asa ile başlar (silah slotuna)
            this.player.equipment.weapon = { type: 'staff_common', name: 'Başlangıç Asası', rarity: 'common', stats: { atk: 4, hp: 10 }, description: 'Büyücünün asası. (+4 Hasar, +10 Can)' };
            this.addLog("🔮 BÜYÜCÜ: Yetenek CD -45%, +9 Atk, +6 Kritik, +25 Can, Asa kuşandın!", "level");
        }
        // Ekipman sprite'larını güncelle
        if (window.SpriteEngine) window.SpriteEngine.updatePlayerSprites(this.player.equipment);
        this.player.hp = this.player.getMaxHp();

        // Kalıcı meta yükseltmelerini uygula (Ruh Taşı sistemi)
        this._applyMetaUpgrades();

        // Eğitim sistemi: ilk oynayışta ipuçları göster
        this.tutorialStep = localStorage.getItem('pk_tutorial_done') ? -1 : 0;
        this.tutorialTimer = 0;

        // Diyalog sistemi sıfırla ve Bölge 1 girişini tetikle
        this._firstBossKilled  = false;
        this._firstChestOpened = false;
        if (window.DialogSystem) {
            DialogSystem.reset();
            setTimeout(() => DialogSystem.triggerZoneEntry(1), 1200);
        }

        // 2. Varlıkları Haritaya Yerleştir
        this.spawnMapEntities();

        // 3. Arayüz Ekranlarını Gizle
        document.getElementById('screen-start').classList.remove('active');
        document.getElementById('screen-gameover').classList.remove('active');
        document.getElementById('screen-upgrade').classList.remove('active');
        document.getElementById('screen-shop').classList.remove('active');

        // 4. Durumu Güncelle ve Müzik Başlat
        this.state = 'playing';
        
        if (SoundEngine) {
            SoundEngine.stopMenuMusic();
        }
        
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
        this.traps = [];
        this.captives = [];
        this._lastCombatState = false;
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

        const zoneNames = ['','Karanlık Zindan','Gölge Mağarası','Goblin Yurdu','Alev Krallığı','Donmuş Tundra','Orman Tapınağı','Şeytan Kalesi','Gökyüzü Kalesi','Yokluk Alemi','Ejder Yuvası'];
        const zone = Math.ceil(this.floor / 10);
        const zoneName = zoneNames[zone] || 'Uçurum';
        this.addLog(`📍 Kat ${this.floor} — ${zoneName}`, "level");
        this._checkAchievements();

        // Hikaye diyalogları: Her 10. katta bölge geçişi hikayesi
        if (this.floor % 10 === 0) {
            setTimeout(() => this.showStoryDialog(this.floor), 600);
        }

        // Diyalog sistemi: bölge geçişi ve kata özel diyalog
        if (window.DialogSystem) {
            const zone    = Math.ceil(this.floor / 10);
            const prevZone = Math.ceil((this.floor - 1) / 10);
            if (zone !== prevZone) {
                setTimeout(() => DialogSystem.triggerZoneEntry(zone), 900);
            } else {
                DialogSystem.triggerFloor(this.floor);
            }
        }

        this.updateUI();
    },

    // Bölgeye göre düşman türleri döndür (10'ar katlık bölgeler)
    _getEnemyTypesForFloor(floor) {
        if (floor <= 10)  return ['slime', 'slime_fire', 'skeleton'];
        if (floor <= 20)  return ['slime_shadow', 'skeleton', 'goblin'];
        if (floor <= 30)  return ['goblin', 'zombie', 'spider'];
        if (floor <= 40)  return ['spider', 'troll', 'witch'];
        if (floor <= 50)  return ['troll', 'witch', 'ice_golem'];
        if (floor <= 60)  return ['ice_golem', 'demon', 'witch'];
        if (floor <= 70)  return ['demon', 'void_wraith', 'ice_golem'];
        if (floor <= 80)  return ['void_wraith', 'dragon_spawn', 'demon'];
        if (floor <= 90)  return ['dragon_spawn', 'abyss_lord', 'void_wraith'];
        return ['abyss_lord', 'dragon_spawn', 'void_wraith'];
    },

    // Harita üstünde canavar ve sandık sınıflarını ayağa kaldır
    spawnMapEntities() {
        this.shrines = [];
        this.captives = [];

        // Sandıkları oluştur
        World.spawnPoints.chests.forEach(pt => {
            this.chests.push(new Chest(pt.x, pt.y));
        });

        // Düşmanları bölgeye uygun türle oluştur
        const zoneTypes = this._getEnemyTypesForFloor(this.floor);
        World.spawnPoints.enemies.forEach(pt => {
            const type = zoneTypes[Math.floor(Math.random() * zoneTypes.length)];
            this.enemies.push(new Enemy(pt.x, pt.y, type));
        });

        // Kutsal sütunlar: Boss katı hariç %40 ihtimalle 1 sütun
        if (!World.spawnPoints.boss && Math.random() < 0.40 && World.spawnPoints.enemies.length > 0) {
            const sp = World.spawnPoints.enemies[Math.floor(Math.random() * World.spawnPoints.enemies.length)];
            this.shrines.push(new Shrine(sp.x + 64, sp.y + 64));
        }

        // Çevre tuzakları: 2. kattan itibaren boss katı hariç 2-4 tuzak
        if (this.floor > 1 && !World.spawnPoints.boss && World.spawnPoints.enemies.length > 0) {
            const trapCount = 2 + Math.floor(Math.random() * 3);
            const trapTypes = ['spike', 'fire'];
            for (let t = 0; t < trapCount; t++) {
                const ep = World.spawnPoints.enemies[Math.floor(Math.random() * World.spawnPoints.enemies.length)];
                const tx = ep.x + (Math.random() - 0.5) * 96;
                const ty = ep.y + (Math.random() - 0.5) * 96;
                if (World.isWalkable(tx, ty)) {
                    const type = trapTypes[Math.floor(Math.random() * trapTypes.length)];
                    this.traps.push(new Trap(
                        Math.floor(tx / 32) * 32 + 16,
                        Math.floor(ty / 32) * 32 + 16,
                        type
                    ));
                }
            }
        }

        // Kilitli altın sandık: Her 3 katta bir %60 ihtimalle
        if (this.floor >= 3 && this.floor % 3 === 0 && !World.spawnPoints.boss && World.spawnPoints.chests.length > 0) {
            const cp = World.spawnPoints.chests[0];
            this.chests.push(new Chest(cp.x + 80, cp.y, true));
        }

        // Esir NPC'ler: Kat 2'den itibaren normal katlarda 1-2 esir
        if (this.floor > 1 && !World.spawnPoints.boss && World.spawnPoints.enemies.length > 1) {
            const captiveCount = Math.random() < 0.45 ? 2 : 1;
            const npcTypes = ['peasant', 'soldier', 'mage', 'merchant'];
            for (let c = 0; c < captiveCount; c++) {
                const ep = World.spawnPoints.enemies[Math.floor(Math.random() * World.spawnPoints.enemies.length)];
                const cx = ep.x + (Math.random() - 0.5) * 100;
                const cy = ep.y + (Math.random() - 0.5) * 100;
                if (World.isWalkable(cx, cy)) {
                    const type = npcTypes[Math.floor(Math.random() * npcTypes.length)];
                    this.captives.push(new CaptiveNPC(cx, cy, type));
                }
            }
        }

        // Yeni kat görevi ata
        this._assignFloorQuest();

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
            // Boss pre-diyalogu tetikle
            if (window.DialogSystem) {
                const bossZone = Math.ceil(this.floor / 10);
                setTimeout(() => DialogSystem.triggerBossPre(bossZone), 700);
            }
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
                // Diyalog: ilk sandık eventi
                if (window.DialogSystem && !this._firstChestOpened) {
                    this._firstChestOpened = true;
                    setTimeout(() => DialogSystem.triggerEvent('first_chest'), 600);
                }
            }
        });

        if (openedAny) return;

        // 1.6. Shrine etkileşimi
        this.shrines.forEach(shrine => {
            if (!shrine.activated) {
                const sDist = Math.hypot(this.player.x - shrine.x, this.player.y - shrine.y);
                if (sDist < shrine.interactRange) shrine.activate(this.player, this);
            }
        });

        // 1.7. Esir NPC kurtarma
        let rescuedAny = false;
        this.captives.forEach(npc => {
            if (!npc.rescued) {
                const dist = Math.hypot(this.player.x - npc.x, this.player.y - npc.y);
                if (dist < npc.interactRange) {
                    npc.rescue(this);
                    rescuedAny = true;
                }
            }
        });
        if (rescuedAny) return;

        // 2. Çıkış portalına girmeyi dene
        const portalDist = Math.hypot(this.player.x - World.portal.x, this.player.y - World.portal.y);
        if (portalDist < interactRange) {
            if (World.portal.active) {
                this._checkQuestProgress('floor_cleared', null);
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

    // ─── GÖREV SİSTEMİ ───
    _assignFloorQuest() {
        this.questCompleted = false;
        this.questProgress = 0;
        this.playerHitThisFloor = false;
        const killTarget = 3 + Math.floor(this.floor / 15); // Ölçekli hedef: kat 1=3, kat 100=9
        const quests = [
            { id: 'hunter',   title: 'AVCI',     desc: `${killTarget} düşman yen`,    target: killTarget },
            { id: 'shadow',   title: 'GÖLGE',    desc: 'Hasar almadan katı temizle',  target: 1 },
            { id: 'alchemist',title: 'SİMYACI',  desc: 'Bu katta 1 iksir kullan',     target: 1 },
            { id: 'rescuer',  title: 'KURTARICI',desc: '1 esiri kurtar',              target: 1 },
            { id: 'treasure', title: 'HAZINEDAR',desc: '2 sandık aç',                target: 2 },
        ];
        // Boss katlarında sadece savaşçı görevi
        if (this.floor % 10 === 0) {
            this.currentQuest = { id: 'hunter', title: 'BOSS AVCISI', desc: `Boss'u yen!`, target: 1, isBossQuest: true };
        } else {
            this.currentQuest = quests[Math.floor(Math.random() * quests.length)];
        }
    },

    _checkQuestProgress(event, data) {
        if (!this.currentQuest || this.questCompleted) return;
        const q = this.currentQuest;

        if (q.id === 'hunter' && event === 'kill') {
            this.questProgress++; // Herhangi bir öldürme sayılır
        }
        if (q.id === 'shadow' && event === 'floor_cleared') {
            if (!this.playerHitThisFloor) this.questProgress = 1;
        }
        if (q.id === 'alchemist' && event === 'potion_used') {
            this.questProgress++;
        }
        if (q.id === 'rescuer' && event === 'npc_rescued') {
            this.questProgress++;
        }
        if (q.id === 'treasure' && event === 'chest_opened') {
            this.questProgress++;
        }

        if (this.questProgress >= q.target) {
            this.questCompleted = true;
            // Ölçekli ödül: kat * 2 + 30
            const goldReward = 30 + Math.floor(this.floor * 2.5);
            this.player.gold += goldReward;
            this.addLog(`✅ GÖREV TAMAMLANDI: ${q.title}! +${goldReward} Altın!`, "loot");
            this.textParticles.push(new TextParticle(
                this.player.x, this.player.y - 40,
                `+${goldReward}g GÖREV!`, 'var(--neon-gold)', '10px', true
            ));
            this._checkAchievements();
        }
    },

    // ─── BAŞARIM SİSTEMİ ───
    _checkAchievements() {
        const defs = [
            { key: 'first_boss',        name: 'İlk Zafer',       icon: '🏆', cond: () => this.floor > 10 },
            { key: 'explorer',          name: 'Zindan Kaşifi',   icon: '🗺️', cond: () => this.floor >= 50 },
            { key: 'dungeon_conqueror', name: 'Zindan Fatihi',   icon: '🏰', cond: () => this.floor >= 100 },
            { key: 'slime_slayer',      name: 'Balçık Katili',   icon: '⚔️', cond: () => parseInt(localStorage.getItem('pk_slimeKills') || 0) >= 100 },
            { key: 'millionaire',       name: 'Milyarder',       icon: '💰', cond: () => this.player && this.player.gold >= 1000 },
            { key: 'rescuer_hero',      name: 'Büyük Kurtarıcı',icon: '🦸', cond: () => parseInt(localStorage.getItem('pk_rescues') || '0') >= 10 },
            { key: 'centurion',         name: '100 Öldürme',     icon: '💯', cond: () => this.killsCount >= 100 },
        ];
        defs.forEach(def => {
            const already = localStorage.getItem(`pk_ach_${def.key}`);
            if (!already && def.cond()) {
                localStorage.setItem(`pk_ach_${def.key}`, '1');
                this.achievementNotif = { text: `🏆 BAŞARIM: ${def.icon} ${def.name}!`, timer: 300 };
                this.addLog(`🏆 BAŞARIM AÇILDI: ${def.name}!`, "loot");
            }
        });
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

        // Ruh Taşı kazanımı: kat * 2 + kill * 0.1
        const earned = Math.floor(this.floor * 2 + this.killsCount * 0.1);
        this._addSoulStones(earned);
        if (earned > 0) this.addLog(`💎 +${earned} Ruh Taşı kazandın!`, "loot");

        // Öldün ekranı
        document.getElementById('summary-floor').innerText = this.floor;
        document.getElementById('summary-gold').innerText = this.player.gold;
        document.getElementById('summary-kills').innerText = this.killsCount;

        document.getElementById('screen-gameover').classList.add('active');

        SoundEngine.stopMusic();
    },

    // ─── ZAFER EKRANI ───
    showVictory() {
        // Zafer bonusu ruh taşı
        const earned = 200 + Math.floor(this.killsCount * 0.5);
        this._addSoulStones(earned);
        this.addLog(`💎 ZAFERDEKİ ÖDÜL: +${earned} Ruh Taşı!`, "loot");
        this.state = 'victory';
        const title = this._getPlayerTitle();
        const statsEl = document.getElementById('victory-stats');
        if (statsEl) {
            const classNames = { warrior: '⚔️ Savaşçı', ranger: '🏹 Nişancı', mage: '🔮 Büyücü' };
            statsEl.innerHTML = `
                <div class="stat-line"><span>Sınıf:</span> <span class="pixel-text">${classNames[this.selectedClass] || '⚔️ Savaşçı'}</span></div>
                <div class="stat-line"><span>Unvan:</span> <span class="pixel-text gold-color">${title}</span></div>
                <div class="stat-line"><span>Geçilen Kat:</span> <span id="summary-floor" class="pixel-text">${this.floor}</span></div>
                <div class="stat-line"><span>Toplam Altın:</span> <span class="pixel-text gold-color">${this.player ? this.player.gold : 0}</span></div>
                <div class="stat-line"><span>Yenilen Düşman:</span> <span class="pixel-text red-color">${this.killsCount}</span></div>
            `;
        }
        document.getElementById('screen-victory').classList.add('active');
        SoundEngine.stopMusic();
        SoundEngine.playLevelUp();
    },

    closeVictory() {
        this.state = 'start';
        document.getElementById('screen-victory').classList.remove('active');
    },

    // ─── HİKAYE DİYALOĞU ───
    showStoryDialog(floor) {
        const stories = {
            10: {
                icon: '☠️',
                title: 'ZİNDAN MUHAFIZI',
                text: 'İlk bölümü geçtin kahraman! Ama zindan henüz başlıyor... Gölge Muhafızı seni bekliyor. Bu savaşı kazan ve daha derin katmanlara in!'
            },
            20: {
                icon: '🕷️',
                title: 'GÖLGE MAĞARASI',
                text: 'Gölgelerin içinde gözler parıldıyor... Goblinler ve zombiler bu mağaranın sakinleri. Gölge Lordu tahta oturuyor. Onun zincirlerini kırmadan ilerleyemezsin!'
            },
            30: {
                icon: '🔥',
                title: 'ALEV KRALLİĞI',
                text: 'Yer altı lavları tavandan damlıyor. Örümcekler ve trollerin ülkesini geçtin — şimdi Alev Devinin kapısındasın. Zırh eriyebilir, yürek eriymez!'
            },
            40: {
                icon: '❄️',
                title: 'DONMUŞ TUNDRA',
                text: 'Soğuk kemikleri donduruyor... Cadılar ve trollerin ülkesini geride bıraktın. Buz Golemi Efendisi buz kristalleri arasında seni bekliyor. Donmadan önce onu bitir!'
            },
            50: {
                icon: '🌿',
                title: 'ORMAN TAPINAĞI',
                text: 'Yer altındaki kadim orman... Buz golemlerinin soğuğundan kurtuldun. Orman Canavarı kutsal ağacı koruyor. Bu tapmağı geçmeden zindan seni bırakmaz!'
            },
            60: {
                icon: '😈',
                title: 'ŞEYTAN KALESİ',
                text: 'Kükürt kokusu havayı dolduruyor. Demonlar ve cadıların bölgesini aştın. Şeytan Prensi tahtından inerek seni bekliyor. En büyük günahını sormayacak — sadece savaşacak!'
            },
            70: {
                icon: '🌌',
                title: 'GÖKYÜZÜ KALESİ',
                text: 'Bulutların üzerinde bir kale... Yokluk hayaletleri burada dolaşıyor. Gökyüzü İlahı sonsuza dek hüküm sürüyor. Ya sen onu ya da o seni sonsuza gönderecek!'
            },
            80: {
                icon: '🌑',
                title: 'YOKLUK ALEMİ',
                text: 'Gerçeklik burada yok olup gidiyor... Ejder yavruları ve wraith\'lar bu boyutun yaratıkları. Yokluk Kraliçesi seni kendi alemine çekmeye çalışacak. Direnmek zorundasın!'
            },
            90: {
                icon: '🐉',
                title: 'EJDER YUVASI',
                text: 'En güçlü ejderlerin diyarı! Uçurum Lordları burada geziniyor. Ejder Efendisi binlerce yıldır uyuyor — ve sen onu uyandırdın. Son boss\'a giden yolun son adımı!'
            },
            100: {
                icon: '👹',
                title: 'KARANLĞIN LORDU — SON SAVAŞ',
                text: 'Sonunda... En derinde. 100 katlık zindanın sonunda Karanlığın Lordu seni bekliyor. Tüm güçlerin, tüm ekipmanın, tüm cesaretini topla. Buradan zaferle çıkarsan efsane olursun. Hazır mısın?'
            }
        };
        const s = stories[floor];
        if (!s) return;

        this.state = 'story';
        document.getElementById('story-icon').textContent = s.icon;
        document.getElementById('story-title').textContent = s.title;
        document.getElementById('story-text').textContent = s.text;
        document.getElementById('screen-story').classList.add('active');
    },

    closeStoryDialog() {
        this.state = 'playing';
        document.getElementById('screen-story').classList.remove('active');
    },

    // ─── UNVAN SİSTEMİ ───
    _getPlayerTitle() {
        if (this.floor >= 100 || localStorage.getItem('pk_ach_dungeon_conqueror')) return 'Zindan Fatihi';
        if (this.floor >= 90)  return 'Efsane Kahraman';
        if (this.floor >= 70)  return 'Kaos Lordu';
        if (this.floor >= 50)  return 'Zindan Efendisi';
        if (this.floor >= 30)  return 'Cesur Savaşçı';
        if (this.floor >= 20 || this.killsCount >= 100) return 'Efsanevi Katil';
        if (this.floor >= 10)  return 'Zindan Avcısı';
        if (this.floor >= 5)   return 'Cesur Kahraman';
        if (parseInt(localStorage.getItem('pk_rescues') || '0') >= 5) return 'Büyük Kurtarıcı';
        return 'Çaylak Kaşif';
    },

    // ─── RUH TAŞI META-PROGRESSİON ───
    _getSoulStones() {
        return parseInt(localStorage.getItem('pk_soul_stones') || '0');
    },

    _addSoulStones(amount) {
        const cur = this._getSoulStones();
        localStorage.setItem('pk_soul_stones', cur + amount);
    },

    _applyMetaUpgrades() {
        if (!this.player) return;
        const atk  = parseInt(localStorage.getItem('pk_meta_atk')  || '0');
        const def  = parseInt(localStorage.getItem('pk_meta_def')  || '0');
        const hp   = parseInt(localStorage.getItem('pk_meta_hp')   || '0');
        const crit = parseInt(localStorage.getItem('pk_meta_crit') || '0');
        const life = parseInt(localStorage.getItem('pk_meta_life') || '0');
        this.player.stats.atk  += atk  * 2;
        this.player.stats.def  += def  * 2;
        this.player.stats.maxHp+= hp   * 20;
        this.player.stats.crit += crit * 3;
        this.player.hp = this.player.getMaxHp();
        this.lives = Math.min(5, 3 + life);
        this.updateUI();
    },

    openMetaScreen() {
        this.state = 'meta';
        document.getElementById('screen-meta').classList.add('active');
        this._drawMetaUpgrades();
    },

    closeMetaScreen() {
        this.state = 'start';
        document.getElementById('screen-meta').classList.remove('active');
    },

    _drawMetaUpgrades() {
        const stones = this._getSoulStones();
        const stoneEl = document.getElementById('soul-stone-count');
        if (stoneEl) stoneEl.textContent = stones;

        const container = document.getElementById('meta-upgrades-container');
        if (!container) return;
        container.innerHTML = '';

        const upgrades = [
            { key: 'atk',  label: '⚔️ Güçlü Başlangıç', desc: '+2 Saldırı (kalıcı)', cost: 20, max: 5 },
            { key: 'def',  label: '🛡️ Demir Deri',        desc: '+2 Savunma (kalıcı)', cost: 20, max: 5 },
            { key: 'hp',   label: '❤️ Kahraman Yüreği',   desc: '+20 Maks Can (kalıcı)',cost: 25, max: 4 },
            { key: 'crit', label: '⚡ Keskin Göz',         desc: '+3% Kritik (kalıcı)', cost: 30, max: 3 },
            { key: 'life', label: '✨ Ekstra Can',         desc: '+1 Başlangıç Canı',   cost: 50, max: 1 },
        ];

        upgrades.forEach(u => {
            const cur = parseInt(localStorage.getItem(`pk_meta_${u.key}`) || '0');
            const maxed = cur >= u.max;
            const canAfford = stones >= u.cost && !maxed;

            const el = document.createElement('div');
            el.style.cssText = `border:1px solid ${canAfford ? '#555' : '#333'};border-radius:8px;padding:12px 14px;text-align:center;min-width:145px;background:rgba(0,0,0,0.5);transition:border-color 0.2s`;
            if (canAfford) { el.style.cursor = 'pointer'; }
            else { el.style.opacity = '0.5'; }

            el.innerHTML = `
                <div style="font-size:14px;margin-bottom:5px">${u.label.split(' ')[0]}</div>
                <div class="pixel-text" style="font-size:7px;color:var(--neon-purple);margin-bottom:4px">${u.label.substring(u.label.indexOf(' ')+1)}</div>
                <div style="font-size:9px;color:#aaa;margin-bottom:6px">${u.desc}</div>
                <div style="font-size:8px;color:#777;margin-bottom:6px">${cur}/${u.max} Seviye</div>
                ${maxed ? '<div style="font-size:9px;color:var(--neon-gold)">✅ TAMAMLANDI</div>' : `<div style="font-size:10px;color:var(--neon-purple)">💎 ${u.cost} Ruh Taşı</div>`}
            `;

            if (canAfford) {
                el.addEventListener('mouseenter', () => { el.style.borderColor = 'var(--neon-purple)'; });
                el.addEventListener('mouseleave', () => { el.style.borderColor = '#555'; });
                el.addEventListener('click', () => {
                    const cur2 = parseInt(localStorage.getItem(`pk_meta_${u.key}`) || '0');
                    const stones2 = this._getSoulStones();
                    if (stones2 >= u.cost && cur2 < u.max) {
                        localStorage.setItem('pk_soul_stones', stones2 - u.cost);
                        localStorage.setItem(`pk_meta_${u.key}`, cur2 + 1);
                        this._drawMetaUpgrades();
                    }
                });
            }
            container.appendChild(el);
        });
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

        // 1b. Can (lives) kalpleri (meta upgrade ile 5'e kadar çıkabilir)
        const livesEl = document.getElementById('lives-display');
        if (livesEl) {
            livesEl.innerHTML = '';
            const maxHearts = Math.max(3, this.lives);
            for (let i = 0; i < maxHearts; i++) {
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

        // 2c. Oyuncu unvanı
        const titleEl = document.getElementById('player-title-display');
        if (titleEl) {
            const title = this._getPlayerTitle();
            if (title !== 'Çaylak Kaşif') {
                titleEl.textContent = title.toUpperCase();
                titleEl.style.display = 'block';
            } else {
                titleEl.style.display = 'none';
            }
        }

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
        if (type === 'gold_key')          return 'item_gold';
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
                canvas.addEventListener('mouseenter', () => { this._hoveredInvIndex = i; this.showTooltip(item, true); });
                canvas.addEventListener('mouseleave', () => { this._hoveredInvIndex = -1; this.hideTooltip(); });

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

    // Envanteri nadirliğe göre sırala (efsanevi > nadir > yaygın, iksirler sonda)
    sortInventory() {
        if (!this.player) return;
        const order = { legendary: 0, rare: 1, common: 2 };
        const isConsumable = (item) => !item.stats || item.type === 'gold' || item.type.startsWith('potion');
        this.player.inventory.sort((a, b) => {
            const aC = isConsumable(a), bC = isConsumable(b);
            if (aC !== bC) return aC ? 1 : -1;
            return (order[a.rarity] ?? 3) - (order[b.rarity] ?? 3);
        });
        this.drawInventory();
        this.addLog("Envanter sıralandı.", "system");
    },

    // Hover Tooltip Bilgi Penceresi Gösterimi
    showTooltip(item, isInventory = false) {
        if (this._tooltipHideTimeout) { clearTimeout(this._tooltipHideTimeout); this._tooltipHideTimeout = null; }
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

        // Nitelik bonusları + kuşanılı eşya ile karşılaştırma
        statsEl.innerHTML = '';
        if (item.stats) {
            // Kuşanılmış eşyayı bul (eşya slotunu tahmin et)
            let equippedItem = null;
            if (item.type && this.player) {
                const t = item.type;
                if (t.includes('sword') || t.includes('bow') || t.includes('dagger') || t.includes('staff'))
                    equippedItem = this.player.equipment.weapon;
                else if (t.includes('armor')) equippedItem = this.player.equipment.armor;
                else if (t.includes('helmet')) equippedItem = this.player.equipment.helmet;
                else if (t.includes('ring')) equippedItem = this.player.equipment.ring;
                else if (t.includes('necklace')) equippedItem = this.player.equipment.necklace;
                else if (t.includes('earrings')) equippedItem = this.player.equipment.earrings;
                else if (t.includes('gloves')) equippedItem = this.player.equipment.gloves;
                else if (t.includes('boots')) equippedItem = this.player.equipment.boots;
                else if (t.includes('shield')) equippedItem = this.player.equipment.armor;
            }
            const eStats = equippedItem && equippedItem.stats ? equippedItem.stats : {};
            const diff = (key) => {
                const d = (item.stats[key] || 0) - (eStats[key] || 0);
                if (!equippedItem || d === 0) return '';
                return d > 0 ? ` <span style="color:#39ff14">(+${d})</span>` : ` <span style="color:#ff4444">(${d})</span>`;
            };
            if (item.stats.atk) statsEl.innerHTML += `<div>+${item.stats.atk} SALDIRI${diff('atk')}</div>`;
            if (item.stats.def) statsEl.innerHTML += `<div style="color:var(--neon-cyan)">+${item.stats.def} DEFANS${diff('def')}</div>`;
            if (item.stats.hp) statsEl.innerHTML += `<div style="color:var(--neon-green)">+${item.stats.hp} MAKS CAN${diff('hp')}</div>`;
            if (item.stats.spd) statsEl.innerHTML += `<div style="color:var(--neon-purple)">+${Math.floor(item.stats.spd * 100)}% HIZ${diff('spd')}</div>`;
            if (item.stats.crit) statsEl.innerHTML += `<div style="color:var(--neon-gold)">+${item.stats.crit}% KRİTİK${diff('crit')}</div>`;
            if (equippedItem) statsEl.innerHTML += `<div style="color:#888;font-size:8px">▲ Kuşanılı: ${equippedItem.name}</div>`;
        }

        descEl.innerText = item.description || '';

        // CSS rengini nadirliğe göre eşitle
        const rarityColors = { common: 'var(--rarity-common)', rare: 'var(--rarity-rare)', legendary: 'var(--rarity-legendary)' };
        nameEl.style.color = rarityColors[item.rarity];

        // Envanter tooltip'i: satış fiyatı, parçalama butonu ve sağ tık ipucu
        const salvageBtn = document.getElementById('btn-tooltip-salvage');
        if (isInventory && item.type !== 'gold') {
            const price = this.getSellPrice(item);
            sellEl.innerHTML = `<i class="fa-solid fa-coins"></i> SAT: <span>${price} Altın</span>`;
            sellEl.style.display = 'flex';
            // Parçalama butonu: sadece ekipman için (iksir değil)
            if (salvageBtn) {
                if (item.stats && !item.type.startsWith('potion')) {
                    const salvageDesc = { common: '+1 Nitelik', rare: '+2 Nitelik', legendary: '+3 Nitelik' };
                    salvageBtn.textContent = `⚡ PARÇALA (${salvageDesc[item.rarity] || '...'})`;
                    salvageBtn.style.display = 'block';
                } else {
                    salvageBtn.style.display = 'none';
                }
            }
            hintEl.innerHTML = 'Sol tık: Kuşan/Kullan &nbsp;|&nbsp; <span style="color:var(--neon-red)">Sağ tık: Sat</span>';
        } else {
            sellEl.style.display = 'none';
            if (salvageBtn) salvageBtn.style.display = 'none';
            hintEl.textContent = 'Kuşanmak veya kullanmak için tıkla';
        }

        tooltip.style.display = 'block';
    },

    hideTooltip() {
        // Kısa gecikme: salvage butonuna geçerken tooltip kaybolmasın
        if (this._tooltipHideTimeout) clearTimeout(this._tooltipHideTimeout);
        this._tooltipHideTimeout = setTimeout(() => {
            const tooltip = document.getElementById('item-tooltip');
            if (tooltip) tooltip.style.display = 'none';
        }, 120);
    },

    // Eşya satış fiyatını döndür (Pazarlıkçı: +%20)
    getSellPrice(item) {
        if (item.type === 'potion_red' || item.type === 'potion_blue') return 5;
        const prices = { common: 4, rare: 10, legendary: 30 };
        const base = prices[item.rarity] || 5;
        return this.player && this.player.hasBarter ? Math.floor(base * 1.2) : base;
    },

    // Eşya Parçalama — Kalıcı küçük nitelik bonusu verir
    salvageItem(index) {
        const item = this.player.inventory[index];
        if (!item || !item.stats || item.type === 'gold' || item.type.startsWith('potion')) return;

        this.player.inventory.splice(index, 1);

        const pools = {
            common:    [{ stat: 'atk', val: 1 }, { stat: 'def', val: 1 }],
            rare:      [{ stat: 'atk', val: 2 }, { stat: 'def', val: 2 }, { stat: 'hp', val: 6 }],
            legendary: [{ stat: 'atk', val: 3 }, { stat: 'def', val: 3 }, { stat: 'hp', val: 12 }, { stat: 'crit', val: 2 }]
        };
        const pool = pools[item.rarity] || pools.common;
        const bonus = pool[Math.floor(Math.random() * pool.length)];
        this.player.stats[bonus.stat] = (this.player.stats[bonus.stat] || 0) + bonus.val;

        const statNames = { atk: 'SALDIRI', def: 'DEFANS', hp: 'MAKS CAN', crit: 'KRİTİK' };
        SoundEngine.playLevelUp();
        this.addLog(`⚡ [${item.name}] parçalandı → Kalıcı +${bonus.val} ${statNames[bonus.stat]}!`, "loot");
        this.textParticles.push(new TextParticle(
            this.player.x, this.player.y - 40,
            `+${bonus.val} ${statNames[bonus.stat]}!`, 'var(--neon-purple)', '9px', true
        ));
        this.updateUI();
        this.drawInventory();
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
        if (this.merchant) this.merchant.update(this.player, this);

        // Diyalog: düşük can eventleri
        if (window.DialogSystem && this.player) {
            const hpRatio = this.player.hp / this.player.getMaxHp();
            if (hpRatio <= 0.12) DialogSystem.triggerEvent('critical_hp');
            else if (hpRatio <= 0.30) DialogSystem.triggerEvent('low_hp');
        }

        // Başarım bildirimi sayacı
        if (this.achievementNotif && this.achievementNotif.timer > 0) this.achievementNotif.timer--;
        else if (this.achievementNotif && this.achievementNotif.timer === 0) this.achievementNotif = null;

        // Gold achievement kontrolü (her frame değil, sadece gold değişince)
        if (this.player && this.player.gold >= 500) this._checkAchievements();

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
                const bossZone = Math.ceil(this.floor / 10);
                this.boss = null;
                document.getElementById('boss-hud').classList.remove('active');
                // Boss post-diyalogu tetikle
                if (window.DialogSystem) DialogSystem.triggerBossPost(bossZone);
                // İlk boss öldürme eventi
                if (window.DialogSystem && !this._firstBossKilled) {
                    this._firstBossKilled = true;
                    setTimeout(() => DialogSystem.triggerEvent('first_boss_kill'), 2800);
                }
                // Kat 100 boss'u yenildi → ZAFERİ KAZAN!
                if (this.floor === 100) {
                    setTimeout(() => this.showVictory(), 1200);
                }
            }
        }

        // Kamerayı oyuncu konumuna göre sabitle
        World.camera.update(this.player.x, this.player.y, this.canvas.width, this.canvas.height);

        // 3. Düşmanları Güncelle
        this.enemies.forEach(enemy => enemy.update(this.player, this));

        // 3.5. Tuzakları Güncelle
        this.traps.forEach(trap => trap.update(this.player, this));

        // 3.6. Esir NPC'leri güncelle (animasyon)
        this.captives.forEach(npc => npc.update());

        // Eğitim sayacı
        if (this.tutorialStep >= 0) {
            this.tutorialTimer++;
            const stepDurations = [300, 300, 300, 240, 240]; // frame per step
            if (this.tutorialTimer >= (stepDurations[this.tutorialStep] || 300)) {
                this.tutorialStep++;
                this.tutorialTimer = 0;
                if (this.tutorialStep >= 5) {
                    this.tutorialStep = -1;
                    localStorage.setItem('pk_tutorial_done', '1');
                }
            }
        }

        // Dinamik müzik: yakın düşman varsa savaş moduna geç
        if (SoundEngine.musicPlaying && this.enemies.length > 0) {
            const inCombat = this.enemies.some(e => Math.hypot(e.x - this.player.x, e.y - this.player.y) < 220);
            if (inCombat !== this._lastCombatState) {
                this._lastCombatState = inCombat;
                if (SoundEngine.setCombatMode) SoundEngine.setCombatMode(inCombat);
            }
        } else if (this._lastCombatState) {
            this._lastCombatState = false;
            if (SoundEngine.setCombatMode) SoundEngine.setCombatMode(false);
        }

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

        // 7. Diyalog sistemi güncelle
        if (window.DialogSystem) DialogSystem.update(dt);
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

        // Tuzakları Çiz (sandıkların altında görünür)
        this.traps.forEach(trap => trap.draw(this.ctx, World.camera));

        // Sandıkları Çiz
        this.chests.forEach(chest => chest.draw(this.ctx, World.camera));

        // Kutsal Sütunları Çiz
        this.shrines.forEach(shrine => shrine.draw(this.ctx, World.camera));

        // Ganimet Eşyalarını Çiz
        this.items.forEach(item => item.draw(this.ctx, World.camera));

        // Esir NPC'leri Çiz
        this.captives.forEach(npc => npc.draw(this.ctx, World.camera));

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

        // ─── ZİNDAN BÖLGE RENK OVERLAY (10 farklı bölge) ───
        if (this.state === 'playing') {
            const zone = Math.ceil(this.floor / 10);
            let biomeColor = null;
            if (zone === 2)  biomeColor = 'rgba(80,0,80,0.07)';       // Gölge Mağarası
            else if (zone === 3)  biomeColor = 'rgba(100,50,0,0.08)'; // Goblin/Zombi
            else if (zone === 4)  biomeColor = 'rgba(200,60,0,0.08)'; // Alev Krallığı
            else if (zone === 5)  biomeColor = 'rgba(0,80,180,0.09)'; // Donmuş Tundra
            else if (zone === 6)  biomeColor = 'rgba(0,100,30,0.08)'; // Orman Tapınağı
            else if (zone === 7)  biomeColor = 'rgba(180,0,0,0.10)';  // Şeytan Kalesi
            else if (zone === 8)  biomeColor = 'rgba(80,180,255,0.07)';// Gökyüzü Kalesi
            else if (zone === 9)  biomeColor = 'rgba(0,0,40,0.13)';   // Yokluk Alemi
            else if (zone === 10) biomeColor = 'rgba(200,80,0,0.10)'; // Ejder Yuvası / Uçurum
            // Boss katında ek karanlık overlay
            if (this.floor % 10 === 0) biomeColor = 'rgba(150,0,255,0.14)';
            if (biomeColor) {
                this.ctx.save();
                this.ctx.fillStyle = biomeColor;
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.restore();
            }
        }

        // ─── GÖREV PANELİ (sol üst) ───
        if (this.state === 'playing' && this.currentQuest) {
            const q = this.currentQuest;
            const prog = Math.min(this.questProgress, q.target);
            const done = this.questCompleted;
            const panelW = 160, panelH = 36;
            const px = 8, py = 8;
            this.ctx.save();
            this.ctx.globalAlpha = 0.82;
            this.ctx.fillStyle = done ? 'rgba(20,80,20,0.9)' : 'rgba(10,10,20,0.85)';
            this.ctx.strokeStyle = done ? '#39ff14' : 'rgba(0,240,255,0.4)';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath(); this.ctx.roundRect(px, py, panelW, panelH, 5); this.ctx.fill(); this.ctx.stroke();
            this.ctx.globalAlpha = 1;
            this.ctx.font = "6px 'Press Start 2P'";
            this.ctx.fillStyle = done ? '#39ff14' : '#00f0ff';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`GÖREV: ${q.title}`, px + 6, py + 13);
            this.ctx.fillStyle = '#aaa';
            this.ctx.fillText(done ? '✓ TAMAMLANDI!' : `${q.desc} (${prog}/${q.target})`, px + 6, py + 27);
            this.ctx.restore();
        }

        // ─── BAŞARIM BİLDİRİMİ ───
        if (this.achievementNotif && this.achievementNotif.timer > 0) {
            const alpha = Math.min(1, this.achievementNotif.timer / 60);
            this.ctx.save();
            this.ctx.globalAlpha = alpha * 0.95;
            this.ctx.fillStyle = 'rgba(10,10,30,0.92)';
            this.ctx.strokeStyle = '#ffd700';
            this.ctx.lineWidth = 2;
            const tw = 280, th = 28;
            const tx = (this.canvas.width - tw) / 2, ty = this.canvas.height - 50;
            this.ctx.beginPath(); this.ctx.roundRect(tx, ty, tw, th, 6); this.ctx.fill(); this.ctx.stroke();
            this.ctx.globalAlpha = alpha;
            this.ctx.font = "7px 'Press Start 2P'"; this.ctx.fillStyle = '#ffd700'; this.ctx.textAlign = 'center';
            this.ctx.fillText(this.achievementNotif.text, this.canvas.width / 2, ty + 18);
            this.ctx.restore();
        }

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

        // ─── EĞİTİM İPUÇLARI (İlk Oynayış) ───
        if (this.state === 'playing' && this.tutorialStep >= 0) {
            const hints = [
                { text: '⌨ WASD veya Ok Tuşları ile hareket et', sub: '' },
                { text: '🖱 Sol Tık ile saldır', sub: 'Düşmana yönelik tıkla!' },
                { text: '⚔ Q: Hızlı Hücum  |  R: Silah Yağmuru', sub: 'Yetenek tuşları' },
                { text: '📦 [E] ile sandık ve portal aç', sub: 'Tüm düşmanları yen → Portal açılır' },
                { text: '💎 İyi oyunlar! Efsaneler seni bekliyor...', sub: '' },
            ];
            const h = hints[this.tutorialStep];
            if (h) {
                const cx = this.canvas.width / 2;
                const cy = this.canvas.height - 44;
                this.ctx.save();
                this.ctx.fillStyle = 'rgba(0,0,0,0.65)';
                this.ctx.roundRect ? this.ctx.roundRect(cx - 220, cy - 20, 440, 40, 8) : this.ctx.fillRect(cx - 220, cy - 20, 440, 40);
                this.ctx.fill();
                this.ctx.font = "8px 'Press Start 2P'";
                this.ctx.textAlign = 'center';
                this.ctx.fillStyle = '#00f0ff';
                this.ctx.fillText(h.text, cx, cy - 3);
                if (h.sub) {
                    this.ctx.font = "6px 'Press Start 2P'";
                    this.ctx.fillStyle = '#aaa';
                    this.ctx.fillText(h.sub, cx, cy + 12);
                }
                this.ctx.restore();
            }
        }

        // Diyalog sistemi — her zaman en üstte çizilir
        if (window.DialogSystem) DialogSystem.draw(this.ctx);

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

    // --- DEMİRCİ OCAĞI (FORGE) ---
    openForge() {
        this.state = 'forge';
        document.getElementById('screen-forge').classList.add('active');
        this.drawForge();
    },

    closeForge() {
        this.state = 'playing';
        document.getElementById('screen-forge').classList.remove('active');
        this.updateUI();
    },

    _getItemCategory(type) {
        if (!type) return 'sword';
        return type.split('_')[0] || 'sword';
    },

    drawForge() {
        const container = document.getElementById('forge-pairs-container');
        container.innerHTML = '';
        const inv = this.player.inventory;
        const isEquip = (item) => item.stats && item.type !== 'gold' && !item.type.startsWith('potion');
        const rarityUp = { common: 'rare', rare: 'legendary' };
        const pairs = [];
        const used = new Set();

        for (let i = 0; i < inv.length; i++) {
            if (!isEquip(inv[i]) || inv[i].rarity === 'legendary' || used.has(i)) continue;
            for (let j = i + 1; j < inv.length; j++) {
                if (!isEquip(inv[j]) || used.has(j)) continue;
                if (inv[i].rarity === inv[j].rarity) {
                    pairs.push([i, j]);
                    used.add(i); used.add(j);
                    break;
                }
            }
        }

        if (pairs.length === 0) {
            container.innerHTML = '<div style="color:#888;font-size:10px;text-align:center;width:100%;padding:24px 0">Birleştirilebilecek eşya yok.<br><span style="color:#555">Aynı nadirlikte 2 ekipman gerekli.</span></div>';
            return;
        }

        const cost = { common: 20, rare: 50 };
        const rarityColor = { rare: 'var(--neon-cyan)', legendary: 'var(--neon-gold)' };
        const rarityName = { rare: 'NADİR', legendary: 'EFSANEVİ' };

        pairs.forEach(([idxA, idxB]) => {
            const a = inv[idxA], b = inv[idxB];
            const newRarity = rarityUp[a.rarity];
            const mergeCost = cost[a.rarity];
            const canAfford = this.player.gold >= mergeCost;

            const el = document.createElement('div');
            el.style.cssText = `border:1px solid ${canAfford ? '#555' : '#333'};border-radius:8px;padding:10px 14px;text-align:center;min-width:155px;max-width:175px;background:rgba(0,0,0,0.5);transition:border-color 0.2s`;
            if (canAfford) {
                el.style.cursor = 'pointer';
                el.addEventListener('mouseenter', () => { el.style.borderColor = 'var(--neon-gold)'; });
                el.addEventListener('mouseleave', () => { el.style.borderColor = '#555'; });
                el.addEventListener('click', () => this.mergeItems(idxA, idxB, newRarity, mergeCost));
            } else {
                el.style.opacity = '0.4';
            }

            el.innerHTML = `
                <div style="font-size:9px;color:#ccc;margin-bottom:3px">${a.name}</div>
                <div style="font-size:11px;color:#444;margin-bottom:3px">+</div>
                <div style="font-size:9px;color:#ccc;margin-bottom:7px">${b.name}</div>
                <div style="font-size:9px;color:var(--neon-gold);margin-bottom:7px">⚒ ${mergeCost} Altın</div>
                <div style="font-size:9px;color:${rarityColor[newRarity]}">→ ${rarityName[newRarity]} EKİPMAN</div>
            `;
            container.appendChild(el);
        });
    },

    mergeItems(idxA, idxB, newRarity, mergeCost) {
        const a = this.player.inventory[idxA];
        const b = this.player.inventory[idxB];
        this.player.gold -= mergeCost;

        // Yüksek indeksi önce sil (indeks kaymasını önler)
        const [hi, lo] = idxA > idxB ? [idxA, idxB] : [idxB, idxA];
        this.player.inventory.splice(hi, 1);
        this.player.inventory.splice(lo, 1);

        const cat = this._getItemCategory(a.type);
        const newItem = new Item(this.player.x, this.player.y, cat + '_' + newRarity);
        this.player.inventory.push(newItem);

        SoundEngine.playLevelUp();
        this.addLog(`⚒ [${a.name}] + [${b.name}] → [${newItem.name}]`, "loot");
        this.triggerScreenShake(3);
        this.drawForge();
        this.updateUI();
    },

    generateShopItems() {
        const isSpecial = this.merchant && this.merchant.isSpecial;
        // Fiyat çarpanı: her 10 katta %40 artar (logaritmik)
        const floorPriceMult = 1.0 + Math.floor((this.floor - 1) / 10) * 0.4;
        this.shopItems = [];

        // 1. Birinci Slot: İksir (Sağlık veya Hız)
        const potType = Math.random() < 0.6 ? 'potion_red' : 'potion_blue';
        const potPrice = Math.floor((isSpecial ? 30 : 15) * floorPriceMult);
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

            // Fiyatı belirle (kata göre ölçekli)
            let price = 25;
            if (rarity === 'common') price = Math.floor((Math.random() * 12 + 22) * floorPriceMult);
            else if (rarity === 'rare') price = Math.floor((Math.random() * 22 + 48) * floorPriceMult);
            else if (rarity === 'legendary') price = Math.floor((Math.random() * 50 + 110) * floorPriceMult);

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
