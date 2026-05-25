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
    trainingPurchases: 0,
    exploredRooms: new Set(),
    _lastExploredRoom: -1,
    bagTab: 'all',
    
    // Portal animasyonu
    portalFrame: 1,
    portalTimer: 0,

    // Warrior execution overlay
    executionTimer: 0,
    executionX: 0,
    executionY: 0,

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

        // DOM elementlerini bir kez cache'le (per-frame getElementById önlenir)
        this._elBossBar  = document.getElementById('boss-hp-bar');
        this._elBossName = document.getElementById('boss-name');
        this._lastBossHpPct  = -1;
        this._lastBossPhase  = -1;
        this._hpAlertTimer   = 0; // critical_hp / low_hp diyalog throttle

        // 2. Kontrol Sistemini Başlat
        InputManager.init(this.canvas);
        
        // 3. Arka Plan Partikül Efektini Başlat (Dashboard dışındaki toz zerreleri)
        this.initBackgroundParticles();
        
        this.setupBagUI();

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
        const openBagBtn = document.getElementById('btn-open-bag');
        if (openBagBtn) openBagBtn.addEventListener('click', () => this.openBag());
        const closeBagBtn = document.getElementById('btn-close-bag');
        if (closeBagBtn) closeBagBtn.addEventListener('click', () => this.closeBag());
        document.querySelectorAll('.bag-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.bagTab = btn.dataset.bagTab || 'all';
                document.querySelectorAll('.bag-tab-btn').forEach(b => b.classList.toggle('active', b === btn));
                this.drawInventory();
            });
        });

        document.getElementById('btn-start').addEventListener('click', () => {
            // Kullanıcı etkileşimi anında AudioContext'i başlat/devam ettir
            SoundEngine.init();
            if (SoundEngine.ctx && SoundEngine.ctx.state === 'suspended') {
                SoundEngine.ctx.resume();
            }
            this.startNewGame();
        });
        
        document.getElementById('btn-retry').addEventListener('click', () => {
            SoundEngine.init();
            if (SoundEngine.ctx && SoundEngine.ctx.state === 'suspended') SoundEngine.ctx.resume();
            this.startNewGame();
        });

        document.getElementById('btn-restart').addEventListener('click', (e) => {
            e.stopPropagation();
            SoundEngine.init();
            if (SoundEngine.ctx && SoundEngine.ctx.state === 'suspended') SoundEngine.ctx.resume();
            this.startNewGame();
        });

        // CRT filtre toggle
        document.getElementById('btn-crt').addEventListener('click', (e) => {
            e.stopPropagation();
            this.crtEnabled = !this.crtEnabled;
            const wrapper = document.querySelector('.canvas-wrapper');
            if (wrapper) wrapper.classList.toggle('crt-on', this.crtEnabled);
            const btn = document.getElementById('btn-crt');
            btn.style.color = this.crtEnabled ? 'var(--neon-cyan)' : '';
            btn.style.borderColor = this.crtEnabled ? 'var(--neon-cyan)' : '';
        });

        // Ses seviyesi sürgüsü — click/change event'ini de durdur (intro-skip tetiklemesin)
        document.getElementById('slider-vol').addEventListener('click', (e) => e.stopPropagation());
        document.getElementById('slider-vol').addEventListener('input', (e) => {
            e.stopPropagation();
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

        document.getElementById('btn-ending-retry').addEventListener('click', () => {
            this.closeEnding();
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
                this.hideInventoryActionMenu();
            }
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest || !e.target.closest('.inventory-action-menu')) {
                this.hideInventoryActionMenu();
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

        // Karakter seçim ekranı aktif olduğunda menü müziğini başlat
        const _tryStartMenuMusic = () => {
            if (SoundEngine.menuMusicPlaying || SoundEngine.isMuted) return;

            // ctx, skipIntro() içinde zaten user gesture sırasında başlatıldıysa
            // burada direkt playMenuMusic() çalışır. Çalışmadıysa (video doğal bitti,
            // kullanıcı hiç tıklamadı) → sonraki tıklamada tekrar dene.
            if (SoundEngine.ctx && SoundEngine.ctx.state === 'running') {
                SoundEngine.playMenuMusic();
            } else {
                // ctx yok veya suspended: bir sonraki kullanıcı etkileşiminde başlat
                const _onNextInteraction = () => {
                    SoundEngine.init();
                    if (SoundEngine.ctx && SoundEngine.ctx.state === 'suspended') {
                        SoundEngine.ctx.resume().then(() => SoundEngine.playMenuMusic()).catch(() => {});
                    } else {
                        SoundEngine.playMenuMusic();
                    }
                    document.removeEventListener('click',      _onNextInteraction);
                    document.removeEventListener('keydown',    _onNextInteraction);
                    document.removeEventListener('touchstart', _onNextInteraction);
                };
                document.addEventListener('click',      _onNextInteraction, { once: true });
                document.addEventListener('keydown',    _onNextInteraction, { once: true });
                document.addEventListener('touchstart', _onNextInteraction, { once: true });
            }
        };
        // Splash'tan start ekranına geçince MutationObserver ile algıla
        const _startObserver = new MutationObserver(() => {
            const startScreen = document.getElementById('screen-start');
            if (startScreen && startScreen.classList.contains('active')) {
                _startObserver.disconnect();
                // Geçiş animasyonu bittikten sonra müziği başlat (~800ms)
                setTimeout(_tryStartMenuMusic, 800);
            }
        });
        const _startScreen = document.getElementById('screen-start');
        if (_startScreen) _startObserver.observe(_startScreen, { attributes: true, attributeFilter: ['class'] });
    },

    setupBagUI() {
        if (document.getElementById('screen-bag')) return;
        const invSection = document.querySelector('.section-inventory');
        const invContainer = document.getElementById('inventory-container');
        if (!invSection || !invContainer) return;
        const forgeBtn = document.getElementById('btn-forge');
        const sortBtn = document.getElementById('btn-sort-inv');

        invSection.innerHTML = `
            <div class="inventory-header">
                <div class="panel-title pixel-text"><i class="fa-solid fa-bag-shopping"></i> CANTA</div>
                <span id="inv-count" class="pixel-text font-small">0/30</span>
            </div>
            <div class="bag-launch-panel">
                <button id="btn-open-bag" class="bag-open-btn"><i class="fa-solid fa-bag-shopping"></i> CANTAYI AC</button>
                <div class="bag-quick-actions"></div>
            </div>
        `;
        const quickActions = invSection.querySelector('.bag-quick-actions');
        if (forgeBtn) quickActions.appendChild(forgeBtn);
        if (sortBtn) quickActions.appendChild(sortBtn);

        const bagScreen = document.createElement('div');
        bagScreen.id = 'screen-bag';
        bagScreen.className = 'overlay-screen';
        bagScreen.innerHTML = `
            <div class="screen-content shop-content">
                <div class="level-up-banner">
                    <i class="fa-solid fa-bag-shopping gold-color" style="font-size:28px"></i>
                    <h2 class="pixel-text" style="color:var(--neon-cyan)">CANTA</h2>
                </div>
                <div class="bag-tabs">
                    <button class="bag-tab-btn active" data-bag-tab="all">TUMU</button>
                    <button class="bag-tab-btn" data-bag-tab="equipment">EKIPMAN</button>
                    <button class="bag-tab-btn" data-bag-tab="shards">TAS PARCALARI</button>
                    <button class="bag-tab-btn" data-bag-tab="stones">TASLAR</button>
                </div>
                <div id="bag-grid-host"></div>
                <div id="stone-craft-container" class="stone-craft-panel"></div>
                <button id="btn-close-bag" class="action-btn pixel-text" style="font-size:10px;padding:12px 28px;">
                    <i class="fa-solid fa-times"></i> KAPAT
                </button>
            </div>
        `;
        const overlayParent = document.getElementById('screen-forge')?.parentElement || document.body;
        overlayParent.appendChild(bagScreen);
        invContainer.className = 'bag-grid';
        bagScreen.querySelector('#bag-grid-host').appendChild(invContainer);
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
        this.groundMarks = [];
        this.voidPulses  = [];
        this.merchant = null;
        this.boss = null;
        this.shopItems = null;
        this.runRescues = 0;
        this._karunSpawned = false;
        this.executionTimer = 0;
        this.executionX = 0;
        this.executionY = 0;
        this.trainingPurchases = 0;
        this._lastSetBonusText = '';
        this.exploredRooms = new Set();
        this._lastExploredRoom = -1;

        // 1. Zindanı ve Oyuncuyu Üret
        World.generate(this.floor);
        this.player = new Player(World.spawnPoints.player.x, World.spawnPoints.player.y);
        this.updateExploredRooms();

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
            this.player.stats.atk  += 9;
            this.player.stats.crit += 6;
            this.player.stats.maxHp+= 25;
            // Büyücü: Asa ile başlar (silah slotuna)
            this.player.equipment.weapon = { type: 'staff_common', name: 'Başlangıç Asası', rarity: 'common', stats: { atk: 4, hp: 10 }, description: 'Büyücünün asası. (+4 Hasar, +10 Can)' };
            this.addLog("🔮 BÜYÜCÜ: +9 Atk, +6 Kritik, +25 Can, Asa kuşandın! Cooldown pasifi level aldıkça açılır.", "level");
        }
        // ── Sınıfa özgü hareket/dash kimliği ─────────────────────────────────
        if (this.selectedClass === 'warrior') {
            this.player.dashCooldown         = 52;
            this.player.dashDuration         = 9;
            this.player.dashSpeedMultiplier  = 2.8;
            this.player.attackCooldown       = 28; // Yavaş ağır saldırı ritmi
        } else if (this.selectedClass === 'ranger') {
            this.player.dashCooldown         = 26;  // Yıldırım kaçış
            this.player.dashDuration         = 5;
            this.player.dashSpeedMultiplier  = 4.5;
            this.player.attackCooldown       = 18;  // Hızlı ok ritmi
        } else if (this.selectedClass === 'mage') {
            this.player.dashCooldown         = 60;  // Ender ışınlanma
            this.player.dashDuration         = 7;
            this.player.dashSpeedMultiplier  = 2.6;
            this.player.attackCooldown       = 32;  // Büyü döngüsü ritmi
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
            // ctx askıya alınmışsa devam ettir, ardından müziği başlat
            if (SoundEngine.ctx && SoundEngine.ctx.state === 'suspended') {
                SoundEngine.ctx.resume().then(() => SoundEngine.playMusic());
            } else {
                SoundEngine.playMusic();
            }
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
        this.groundMarks = [];
        this.voidPulses  = [];
        this._lastCombatState = false;
        this.merchant = null;
        this.boss = null;
        this.shopItems = null;
        this._karunSpawned = false;

        // Işınlanma sesi sentezle
        SoundEngine.playPortal();

        // Zindanı yeni kat derinliğine göre yeniden üret
        World.generate(this.floor);
        
        // Oyuncunun konumunu başlangıç odasına ata
        this.player.x = World.spawnPoints.player.x;
        this.player.y = World.spawnPoints.player.y;
        
        // Canavar ve sandıkları yeni kata yerleştir
        this.spawnMapEntities();
        this.exploredRooms = new Set();
        this._lastExploredRoom = -1;
        this.updateExploredRooms();

        // Kamera sarsıntısıyla derinlik hissiyatı ver
        this.triggerScreenShake(15);

        // Faiz geliri kapali: altin artik otomatik cogalmaz, satici/egitim/forge icin harcanir.

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

        // Zaman Yankısı: Zone 9 (kat 81-90) normal katlarda, oyuncunun kopyası
        const zone9 = Math.ceil(this.floor / 10) === 9;
        if (zone9 && !World.spawnPoints.boss && World.spawnPoints.enemies.length > 0) {
            const sp = World.spawnPoints.enemies[Math.floor(Math.random() * World.spawnPoints.enemies.length)];
            const echo = new Enemy(sp.x + 48, sp.y - 48, 'time_echo');
            this.enemies.push(echo);
            setTimeout(() => {
                if (window.DialogSystem) DialogSystem.triggerEvent('time_echo_spawn');
            }, 1500);
        }

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
            this.boss = new Boss(World.spawnPoints.boss.x, World.spawnPoints.boss.y, this.floor);
            this.enemies.push(this.boss);
            document.getElementById('boss-hud').classList.add('active');
            // Can barını baştan doldur
            document.getElementById('boss-hp-bar').style.width = '100%';
            if (this._elBossName) this._elBossName.textContent = this.boss.name;
            SoundEngine.playBossRoar();
            SoundEngine.startBossFight();
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
                    this.runRescues = (this.runRescues || 0) + 1;
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
        if (!SoundEngine.isMuted) setTimeout(() => SoundEngine.playMenuMusic(), 1200);
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

    // ─── SON SEÇİM EKRANI ───
    showEndingChoice() {
        this.state = 'ending_choice';
        const rescues = this.runRescues || 0;
        const kills   = this.killsCount || 0;

        const introEl = document.getElementById('ending-choice-intro');
        if (introEl) introEl.textContent = 'Aetherion yenik düştü. Kârun\'un gücü serbest kaldı. Ne yapacaksın?';

        const statsEl = document.getElementById('ending-run-stats');
        if (statsEl) statsEl.innerHTML = `Kurtardığın: <b>${rescues}</b> &nbsp;|&nbsp; Yendiğin: <b>${kills}</b>`;

        const btnContainer = document.getElementById('ending-choice-buttons');
        if (btnContainer) {
            const endings = [
                {
                    type: 'light',
                    icon: '✨',
                    title: 'IŞIĞIN YOLU',
                    desc: 'Çekirdeği yok et. Ruhları özgür bırak. Kendini feda et.',
                    color: '#ffd700',
                    locked: rescues < 3,
                    lockMsg: rescues < 3 ? `(${3 - rescues} kurtarma daha gerekli)` : '',
                },
                {
                    type: 'iron',
                    icon: '⚔️',
                    title: 'DEMİR YOLU',
                    desc: 'Gücü al. Zindan\'ın yeni hükümdarı ol.',
                    color: 'var(--neon-cyan)',
                    locked: false,
                    lockMsg: '',
                },
                {
                    type: 'dark',
                    icon: '💀',
                    title: 'KARANLIĞIN YOLU',
                    desc: 'Kârun\'un tahtına otur. Uçurumun efendisi ol.',
                    color: '#cc3333',
                    locked: kills < 150,
                    lockMsg: kills < 150 ? `(${150 - kills} öldürme daha gerekli)` : '',
                },
            ];
            btnContainer.innerHTML = '';
            endings.forEach(e => {
                const btn = document.createElement('button');
                btn.className = 'action-btn pixel-text';
                btn.style.cssText = `width:100%;text-align:left;padding:10px 14px;font-size:9px;line-height:1.7;background:rgba(0,0,0,0.6);border-color:${e.locked ? '#444' : e.color};color:${e.locked ? '#555' : e.color};margin-bottom:2px;opacity:${e.locked ? '0.45' : '1'}`;
                btn.innerHTML = `${e.icon} ${e.title}<br><span style="color:${e.locked ? '#444' : '#aaa'};font-size:8px">${e.desc}</span>${e.locked ? `<br><span style="color:#555;font-size:7px">${e.lockMsg}</span>` : ''}`;
                if (!e.locked) btn.onclick = () => this.resolveEnding(e.type);
                btnContainer.appendChild(btn);
            });
        }

        document.getElementById('screen-ending-choice').classList.add('active');
        SoundEngine.stopMusic();
    },

    resolveEnding(type) {
        document.getElementById('screen-ending-choice').classList.remove('active');

        const classNames = { warrior: '⚔️ Savaşçı', ranger: '🏹 Nişancı', mage: '🔮 Büyücü' };
        const cls = classNames[this.selectedClass] || '⚔️ Savaşçı';

        let icon, title, titleColor, subtitle, soulBonus, extraLine;

        if (type === 'light') {
            icon       = '✨';
            title      = 'IŞIĞIN ŞAMPIYONU';
            titleColor = 'var(--neon-gold)';
            subtitle   = 'Sera\'nın ruhu huzur buldu. Zindan\'ın zinciri kırıldı.';
            soulBonus  = 350 + Math.floor(this.killsCount * 0.5) + (this.runRescues || 0) * 20;
            extraLine  = `<div class="stat-line"><span>Kurtarılan:</span> <span class="pixel-text" style="color:var(--neon-gold)">${this.runRescues || 0} ruh</span></div>`;
        } else if (type === 'iron') {
            icon       = '🏆';
            title      = 'ZİNDAN FATİHİ';
            titleColor = 'var(--neon-cyan)';
            subtitle   = 'Gücü aldın. Zindan\'ın yeni hükümdarı oldun.';
            soulBonus  = 200 + Math.floor(this.killsCount * 0.5);
            extraLine  = `<div class="stat-line"><span>Hükümdarlık:</span> <span class="pixel-text" style="color:var(--neon-cyan)">SONSUZ</span></div>`;
        } else {
            icon       = '💀';
            title      = 'KARANLIĞIN EFENDİSİ';
            titleColor = '#cc3333';
            subtitle   = 'Kârun\'un tahtı senin oldu. Ama zindan seni de tüketecek...';
            soulBonus  = 100 + Math.floor(this.killsCount * 0.8);
            extraLine  = `<div class="stat-line"><span>Yenilen Ruh:</span> <span class="pixel-text" style="color:#cc3333">${this.killsCount}</span></div>`;
        }

        this._addSoulStones(soulBonus);
        this.addLog(`💎 ZAFERDEKİ ÖDÜL: +${soulBonus} Ruh Taşı!`, 'loot');
        this.state = 'victory';

        const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerHTML = val; };
        set('ending-icon',     icon);
        const titleEl = document.getElementById('ending-title');
        if (titleEl) { titleEl.textContent = title; titleEl.style.color = titleColor; }
        set('ending-subtitle', subtitle);
        set('ending-final-stats', `
            <div class="stat-line"><span>Sınıf:</span> <span class="pixel-text">${cls}</span></div>
            <div class="stat-line"><span>Geçilen Kat:</span> <span class="pixel-text">${this.floor}</span></div>
            <div class="stat-line"><span>Yenilen Düşman:</span> <span class="pixel-text red-color">${this.killsCount}</span></div>
            <div class="stat-line"><span>Ruh Taşı Ödülü:</span> <span class="pixel-text" style="color:var(--neon-gold)">+${soulBonus}</span></div>
            ${extraLine}
        `);

        document.getElementById('screen-ending').classList.add('active');
        SoundEngine.playLevelUp();

        setTimeout(() => {
            if (window.DialogSystem) {
                const key = { light: 'ending_light', iron: 'ending_iron', dark: 'ending_dark' }[type];
                DialogSystem.triggerEvent(key);
            }
        }, 1800);
    },

    _spawnKarunFinal(x, y) {
        const spawnX = x || (this.player ? this.player.x + 120 : 400);
        const spawnY = y || (this.player ? this.player.y        : 300);

        const karun = new Boss(spawnX, spawnY, 100);
        karun.name     = 'KÂRUN — SONSUZLUĞUN EFENDİSİ';
        karun.zone     = 10;
        karun.maxHp    = Math.floor(karun.maxHp * 1.4);
        karun.hp       = karun.maxHp;
        karun.atk      = Math.floor(karun.atk * 1.5);
        karun.speed    = 0.85;
        karun._isKarun = true;
        karun.facing   = 'right';
        // Kârun daha geniş — altın rengi
        karun.width    = 92;
        karun.height   = 140;
        karun.radius   = 30;

        this.boss = karun;
        this.enemies.push(karun);

        document.getElementById('boss-hud').classList.add('active');
        document.getElementById('boss-hp-bar').style.width = '100%';
        if (this._elBossName) this._elBossName.textContent = karun.name;
        SoundEngine.playBossRoar();
        SoundEngine.startBossFight();

        this.addLog('⚡ KÂRUN SAHNEDE! Son savaş başlıyor!', 'warning');
        this.triggerScreenShake(20);

        if (window.DialogSystem) {
            setTimeout(() => DialogSystem.triggerEvent('karun_final_appears'), 500);
        }
    },

    closeEnding() {
        this.state = 'start';
        document.getElementById('screen-ending').classList.remove('active');
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
                        SoundEngine.playSoulstone();
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
        document.getElementById('stat-crit').innerText = `${this.player.getTotalCrit()}%`;
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
        const skillNames = {
            warrior: ['KIRICI SAVURMA', 'GÖK KILICI'],
            ranger: ['DELİCİ OK', 'OK YAĞMURU'],
            mage: ['ATEŞ TOPU', 'METEOR']
        };
        const names = skillNames[this.selectedClass] || skillNames.warrior;
        const qName = document.querySelector('#btn-skill-q .skill-info span');
        const rName = document.querySelector('#btn-skill-w .skill-info span');
        if (qName) qName.textContent = names[0];
        if (rName) rName.textContent = names[1];
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
        const setText = this.player.getItemSetBonuses
            ? this.player.getItemSetBonuses().names.join(' | ')
            : '';
        if (setText !== this._lastSetBonusText) {
            this._lastSetBonusText = setText;
            if (setText) {
                this.addLog(`SET BONUSU AKTIF: ${setText}`, "level");
                if (window.SoundEngine) SoundEngine.playLevelUp();
            }
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
        const rar  = item.rarity === 'mythic' ? 'legendary' : item.rarity;  // Kizil esya simdilik legendary ikon kullanir
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
        if (type.startsWith('dagger_'))   return `item_dagger_${rar}`;
        if (type.startsWith('staff_'))    return `item_staff_${rar}`;
        if (type.startsWith('shield_'))   return `item_shield_${rar}`;
        if (type === 'potion_big')        return 'item_potion_red';
        if (type === 'gold_key')          return 'item_gold';
        if (type.startsWith('stone_shard_')) return 'item_gold';
        if (type.startsWith('stone_')) return 'item_ring_legendary';
        return `item_${type}`; // gold, potion_red, potion_blue
    },

    // Silah / Zırh Kuşanma pencerelerini doldurur
    _getItemEffectText(item) {
        if (!item || !item.effect) return '';
        const e = item.effect;
        if (e.type === 'frost') return `OZEL: %${Math.round((e.chance || 0) * 100)} yavaslatma`;
        if (e.type === 'burn') return `OZEL: %${Math.round((e.chance || 0) * 100)} yakma`;
        if (e.type === 'focus') return `OZEL: %${Math.round((e.chance || 0) * 100)} cooldown azaltma`;
        if (e.type === 'burn_focus') return `OZEL: %${Math.round((e.chance || 0) * 100)} yakma + cooldown azaltma`;
        if (e.type === 'lifesteal') return `OZEL: %${Math.round((e.chance || 0) * 100)} can calma`;
        return '';
    },

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
        if (!container || !this.player) return;
        container.innerHTML = ''; // Temizle

        const invCount = this.player.inventory.length; // Her yığın 1 slot sayılır
        document.getElementById('inv-count').innerText = `${invCount}/${this.player.maxInventorySlots}`;

        const visibleItems = this.player.inventory
            .map((item, index) => ({ item, index }))
            .filter(({ item }) => this._bagFilterItem(item));

        // 30 yuva oluştur
        for (let i = 0; i < this.player.maxInventorySlots; i++) {
            const slot = document.createElement('div');
            slot.className = 'inv-slot';

            const entry = visibleItems[i];
            const item = entry && entry.item;
            const itemIndex = entry && entry.index;
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
                canvas.addEventListener('mouseenter', () => { this._hoveredInvIndex = itemIndex; this.showTooltip(item, true); });
                canvas.addEventListener('mouseleave', () => { this._hoveredInvIndex = -1; this.hideTooltip(); });

                const openActionMenu = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showInventoryActionMenu(itemIndex, e.clientX, e.clientY);
                    this.hideTooltip();
                };

                // Sol tık: kullan / kuşan
                slot.addEventListener('click', () => {
                    this.player.useItem(itemIndex, this);
                    this.hideTooltip();
                });

                // Sağ tık: Sat / Parçala menüsü
                slot.addEventListener('contextmenu', openActionMenu);
                canvas.addEventListener('contextmenu', openActionMenu);
            }

            container.appendChild(slot);
        }

        this.drawStoneCraftPanel();
    },

    _bagFilterItem(item) {
        if (!item) return false;
        if (this.bagTab === 'equipment') return !!item.stats && !item.type.startsWith('stone_');
        if (this.bagTab === 'shards') return item.type.startsWith('stone_shard_');
        if (this.bagTab === 'stones') return item.type.startsWith('stone_') && !item.type.startsWith('stone_shard_');
        return true;
    },

    drawStoneCraftPanel() {
        const container = document.getElementById('stone-craft-container');
        if (!container || !this.player) return;
        container.innerHTML = '';
        const defs = [
            { key: 'ruby', name: 'YAKUT', stat: '+3 HASAR' },
            { key: 'sapphire', name: 'SAFIR', stat: '+4% KRITIK' },
            { key: 'emerald', name: 'ZUMRUT', stat: '+18 CAN' },
            { key: 'obsidian', name: 'OBSIDYEN', stat: '+2 DEFANS' }
        ];
        defs.forEach(def => {
            const stack = this.player.inventory.find(i => i.type === `stone_shard_${def.key}`);
            const count = stack ? (stack.count || 1) : 0;
            const btn = document.createElement('button');
            btn.className = 'stone-craft-btn';
            btn.disabled = count < 10;
            btn.innerHTML = `${def.name} TASI<br><span style="color:#888">${count}/10 parca</span><br><span style="color:var(--neon-cyan)">${def.stat}</span>`;
            btn.addEventListener('click', () => this.combineStoneShard(def.key));
            container.appendChild(btn);
        });
    },

    combineStoneShard(key) {
        const idx = this.player.inventory.findIndex(i => i.type === `stone_shard_${key}`);
        const stack = this.player.inventory[idx];
        if (!stack || (stack.count || 1) < 10) return;
        stack.count -= 10;
        if (stack.count <= 0) this.player.inventory.splice(idx, 1);

        const stoneType = `stone_${key}`;
        const existing = this.player.inventory.find(i => i.type === stoneType);
        if (existing) existing.count = (existing.count || 1) + 1;
        else this.player.inventory.push(new Item(0, 0, stoneType));

        if (SoundEngine.playForge) SoundEngine.playForge(); else SoundEngine.playChestOpen();
        this.addLog(`10 tas parcasi birlestirildi: ${stoneType.replace('stone_', '').toUpperCase()} tasi olustu.`, "loot");
        this.drawInventory();
        this.updateUI();
    },

    // Envanteri nadirliğe göre sırala (efsanevi > nadir > yaygın, iksirler sonda)
    sortInventory() {
        if (!this.player) return;
        const order = { mythic: 0, legendary: 1, epic: 2, rare: 3, common: 4 };
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
        const rarityNames = { common: 'YAYGIN', rare: 'NADIR', epic: 'EPIC', legendary: 'EFSANEVI', mythic: 'KIZIL' };
        rarityEl.innerText = rarityNames[item.rarity] || item.rarity.toUpperCase();
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
            const effectText = this._getItemEffectText(item);
            if (effectText) statsEl.innerHTML += `<div style="color:var(--neon-purple)">${effectText}</div>`;
            if (item.socketLimit) statsEl.innerHTML += `<div style="color:var(--neon-red)">TAŞ: ${(item.sockets || []).length}/${item.socketLimit}</div>`;
            if (equippedItem) statsEl.innerHTML += `<div style="color:#888;font-size:8px">▲ Kuşanılı: ${equippedItem.name}</div>`;
        }

        descEl.innerText = item.description || '';

        // CSS rengini nadirliğe göre eşitle
        const rarityColors = { common: 'var(--rarity-common)', rare: 'var(--rarity-rare)', epic: 'var(--rarity-epic)', legendary: 'var(--rarity-legendary)', mythic: 'var(--rarity-mythic)' };
        nameEl.style.color = rarityColors[item.rarity];

        // Envanter tooltip'i: satış fiyatı, parçalama butonu ve sağ tık ipucu
        const salvageBtn = document.getElementById('btn-tooltip-salvage');
        const salvageDescEl = document.getElementById('tooltip-salvage-desc');
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
                    if (salvageDescEl) {
                        salvageDescEl.textContent = 'Esyayi yok eder, kalici rastgele nitelik verir.';
                        salvageDescEl.style.display = 'block';
                    }
                } else {
                    salvageBtn.style.display = 'none';
                    if (salvageDescEl) salvageDescEl.style.display = 'none';
                }
            }
            hintEl.innerHTML = 'Sol tik: Kusan/Kullan &nbsp;|&nbsp; <span style="color:var(--neon-red)">Sag tik: Sat / Parcala</span>';
        } else {
            sellEl.style.display = 'none';
            if (salvageBtn) salvageBtn.style.display = 'none';
            if (salvageDescEl) salvageDescEl.style.display = 'none';
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
    hideInventoryActionMenu() {
        if (this._inventoryActionMenu) {
            this._inventoryActionMenu.remove();
            this._inventoryActionMenu = null;
        }
    },

    showInventoryActionMenu(index, clientX, clientY) {
        const item = this.player && this.player.inventory[index];
        if (!item || item.type === 'gold') return;

        this.hideInventoryActionMenu();

        const canSalvage = !!(item.stats && !item.type.startsWith('potion'));
        const menu = document.createElement('div');
        menu.className = 'inventory-action-menu';
        menu.innerHTML = `
            <button class="inventory-action-btn sell" type="button">
                <span>SAT</span><small>${this.getSellPrice(item)} Altin</small>
            </button>
            <button class="inventory-action-btn salvage" type="button" ${canSalvage ? '' : 'disabled'}>
                <span>PARCALA</span><small>${canSalvage ? 'Kalici rastgele nitelik' : 'Bu esya parcalanamaz'}</small>
            </button>
        `;

        menu.querySelector('.sell').addEventListener('click', (e) => {
            e.stopPropagation();
            this.sellInventoryItem(index);
            this.hideInventoryActionMenu();
        });
        menu.querySelector('.salvage').addEventListener('click', (e) => {
            e.stopPropagation();
            if (!canSalvage) return;
            this.salvageItem(index);
            this.hideInventoryActionMenu();
        });

        document.body.appendChild(menu);
        const mw = menu.offsetWidth || 190;
        const mh = menu.offsetHeight || 86;
        const left = Math.min(clientX, window.innerWidth - mw - 8);
        const top = Math.min(clientY, window.innerHeight - mh - 8);
        menu.style.left = `${Math.max(8, left)}px`;
        menu.style.top = `${Math.max(8, top)}px`;
        this._inventoryActionMenu = menu;
    },

    getSellPrice(item) {
        if (item.type === 'potion_red' || item.type === 'potion_blue') return 4;
        if (item.type && item.type.startsWith('stone_shard_')) return 2;
        if (item.type && item.type.startsWith('stone_')) return 35;
        const prices = { common: 3, rare: 8, epic: 14, legendary: 22, mythic: 60 };
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
            legendary: [{ stat: 'atk', val: 3 }, { stat: 'def', val: 3 }, { stat: 'hp', val: 12 }, { stat: 'crit', val: 2 }],
            mythic:    [{ stat: 'atk', val: 5 }, { stat: 'def', val: 5 }, { stat: 'hp', val: 20 }, { stat: 'crit', val: 3 }]
        };
        const pool = pools[item.rarity] || pools.common;
        const bonus = pool[Math.floor(Math.random() * pool.length)];
        this.player.stats[bonus.stat] = (this.player.stats[bonus.stat] || 0) + bonus.val;

        const statNames = { atk: 'SALDIRI', def: 'DEFANS', hp: 'MAKS CAN', crit: 'KRİTİK' };
        SoundEngine.playSalvage();
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
        // Güçlü sarsıntıda (idam, patlama, boss) kısa zoom atışı
        if (intensity >= 8 && World._critFlashTimer !== undefined) {
            World._critFlashTimer = 8;
        }
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

    _getRoomIndexAt(worldX, worldY) {
        if (!World.rooms || World.rooms.length === 0) return -1;
        const tx = Math.floor(worldX / World.tileSize);
        const ty = Math.floor(worldY / World.tileSize);
        for (let i = 0; i < World.rooms.length; i++) {
            const r = World.rooms[i];
            if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) return i;
        }
        return -1;
    },

    updateExploredRooms() {
        if (!this.player || !World.rooms || World.rooms.length === 0) return;
        const roomIndex = this._getRoomIndexAt(this.player.x, this.player.y);
        if (roomIndex < 0 || roomIndex === this._lastExploredRoom) return;
        this._lastExploredRoom = roomIndex;
        if (!this.exploredRooms) this.exploredRooms = new Set();
        this.exploredRooms.add(roomIndex);
    },

    _isWorldPointExplored(worldX, worldY) {
        const roomIndex = this._getRoomIndexAt(worldX, worldY);
        return roomIndex >= 0 && this.exploredRooms && this.exploredRooms.has(roomIndex);
    },

    drawMinimap() {
        if (!this.player || !World.rooms || World.rooms.length === 0) return;
        if (!this.exploredRooms) this.exploredRooms = new Set();

        const questOffset = this.currentQuest ? 44 : 0;
        const pad = 7;
        const panelW = 154;
        const panelH = 112;
        const x = 8;
        const y = 8 + questOffset;
        const mapX = x + pad;
        const mapY = y + 16;
        const mapW = panelW - pad * 2;
        const mapH = panelH - 23;
        const scale = Math.min(mapW / World.width, mapH / World.height);
        const offX = mapX + (mapW - World.width * scale) / 2;
        const offY = mapY + (mapH - World.height * scale) / 2;
        const toMini = (wx, wy) => ({
            x: offX + (wx / World.tileSize) * scale,
            y: offY + (wy / World.tileSize) * scale
        });

        const ctx = this.ctx;
        ctx.save();
        ctx.globalAlpha = 0.94;
        ctx.fillStyle = 'rgba(3, 4, 12, 0.88)';
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.48)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x, y, panelW, panelH, 6);
        ctx.fill();
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.font = "6px 'Press Start 2P'";
        ctx.textAlign = 'left';
        ctx.fillStyle = '#00f0ff';
        ctx.fillText('MINIMAP', x + 8, y + 10);
        ctx.fillStyle = 'rgba(255,255,255,0.42)';
        ctx.textAlign = 'right';
        ctx.fillText(`${this.exploredRooms.size}/${World.rooms.length}`, x + panelW - 8, y + 10);

        ctx.save();
        ctx.beginPath();
        ctx.rect(mapX, mapY, mapW, mapH);
        ctx.clip();

        ctx.fillStyle = '#05050d';
        ctx.fillRect(mapX, mapY, mapW, mapH);

        // Dense fog: hidden rooms are not drawn, so the layout is not leaked.
        ctx.fillStyle = 'rgba(38, 34, 58, 0.34)';
        for (let fy = mapY - 6; fy < mapY + mapH + 8; fy += 7) {
            for (let fx = mapX - 6; fx < mapX + mapW + 8; fx += 7) {
                if (((fx + fy + Math.floor(Date.now() / 240)) % 3) === 0) {
                    ctx.fillRect(fx, fy, 2, 2);
                }
            }
        }

        ctx.strokeStyle = 'rgba(90, 80, 135, 0.55)';
        ctx.lineWidth = Math.max(1, scale * 0.45);
        for (let i = 0; i < World.rooms.length - 1; i++) {
            if (!this.exploredRooms.has(i) || !this.exploredRooms.has(i + 1)) continue;
            const a = World.rooms[i];
            const b = World.rooms[i + 1];
            const ax = offX + (a.centerX + 0.5) * scale;
            const ay = offY + (a.centerY + 0.5) * scale;
            const bx = offX + (b.centerX + 0.5) * scale;
            const by = offY + (b.centerY + 0.5) * scale;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, ay);
            ctx.lineTo(bx, by);
            ctx.stroke();
        }

        World.rooms.forEach((r, i) => {
            if (!this.exploredRooms.has(i)) return;
            const rx = offX + r.x * scale;
            const ry = offY + r.y * scale;
            const rw = Math.max(3, r.w * scale);
            const rh = Math.max(3, r.h * scale);
            ctx.fillStyle = i === this._lastExploredRoom ? 'rgba(70, 110, 145, 0.92)' : 'rgba(38, 48, 76, 0.9)';
            ctx.strokeStyle = 'rgba(135, 215, 255, 0.46)';
            ctx.lineWidth = 1;
            ctx.fillRect(rx, ry, rw, rh);
            ctx.strokeRect(rx + 0.5, ry + 0.5, Math.max(1, rw - 1), Math.max(1, rh - 1));
        });

        if (this._isWorldPointExplored(World.portal.x, World.portal.y)) {
            const p = toMini(World.portal.x, World.portal.y);
            ctx.fillStyle = World.portal.active ? '#39ff14' : '#b026ff';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(p.x, p.y, World.portal.active ? 4 : 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }

        if (this.merchant && this._isWorldPointExplored(this.merchant.x, this.merchant.y)) {
            const m = toMini(this.merchant.x, this.merchant.y);
            ctx.fillStyle = this.merchant.isSpecial ? '#ff3b30' : '#ffd700';
            ctx.strokeStyle = '#05050d';
            ctx.lineWidth = 1;
            ctx.fillRect(m.x - 3, m.y - 3, 6, 6);
            ctx.strokeRect(m.x - 3.5, m.y - 3.5, 7, 7);
        }

        const pl = toMini(this.player.x, this.player.y);
        ctx.fillStyle = '#00f0ff';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(pl.x, pl.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();

        ctx.font = "5px 'Press Start 2P'";
        ctx.textAlign = 'left';
        ctx.fillStyle = '#39ff14';
        ctx.fillText('P', x + 8, y + panelH - 7);
        ctx.fillStyle = '#ffd700';
        ctx.fillText('S', x + 28, y + panelH - 7);
        ctx.fillStyle = World.portal.active ? '#39ff14' : '#b026ff';
        ctx.fillText('O', x + 48, y + panelH - 7);
        ctx.restore();
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
        this.updateExploredRooms();

        // Satıcıyı Güncelle
        if (this.merchant) this.merchant.update(this.player, this);

        // Diyalog: düşük can eventleri — 5 saniyede bir kontrol (throttle)
        if (window.DialogSystem && this.player) {
            this._hpAlertTimer = (this._hpAlertTimer || 0) - 1;
            if (this._hpAlertTimer <= 0) {
                const hpRatio = this.player.hp / this.player.getMaxHp();
                if (hpRatio <= 0.12) { DialogSystem.triggerEvent('critical_hp'); this._hpAlertTimer = 300; }
                else if (hpRatio <= 0.30) { DialogSystem.triggerEvent('low_hp'); this._hpAlertTimer = 300; }
            }
        }

        // Başarım bildirimi sayacı
        if (this.achievementNotif && this.achievementNotif.timer > 0) this.achievementNotif.timer--;
        else if (this.achievementNotif && this.achievementNotif.timer === 0) this.achievementNotif = null;

        // Boss Can Barı HUD güncellemesi — sadece değer değişince yaz (DOM thrash önlenir)
        if (this.boss) {
            const hpPercent = Math.round(Math.max(0, (this.boss.hp / this.boss.maxHp) * 100));
            const phase = this.boss.phase || 1;
            if (hpPercent !== this._lastBossHpPct) {
                this._lastBossHpPct = hpPercent;
                if (this._elBossBar) this._elBossBar.style.width = `${hpPercent}%`;
            }
            if (phase !== this._lastBossPhase) {
                this._lastBossPhase = phase;
                const phaseColors = ['#ff3b30', '#ff8c00', '#b026ff', '#ff2d78'];
                if (this._elBossBar) this._elBossBar.style.background = phaseColors[phase - 1];
                if (this._elBossName) {
                    const phaseStr = phase > 1 ? ` — FAZ ${phase}` : '';
                    this._elBossName.textContent = `${this.boss.name}${phaseStr}`;
                }
            }

            if (this.boss.hp <= 0) {
                this._lastBossHpPct = -1;
                this._lastBossPhase = -1;
                const bossZone = Math.ceil(this.floor / 10);
                const deadBossX = this.boss.x;
                const deadBossY = this.boss.y;
                this.boss = null;
                document.getElementById('boss-hud').classList.remove('active');
                // Boss post-diyalogu tetikle
                if (window.DialogSystem) DialogSystem.triggerBossPost(bossZone);
                // İlk boss öldürme eventi
                if (window.DialogSystem && !this._firstBossKilled) {
                    this._firstBossKilled = true;
                    setTimeout(() => DialogSystem.triggerEvent('first_boss_kill'), 2800);
                }
                // Kat 100: Aetherion yenildi → Kârun'u çağır; Kârun da yenildi → Son seçim
                if (this.floor === 100) {
                    if (!this._karunSpawned) {
                        this._karunSpawned = true;
                        setTimeout(() => this._spawnKarunFinal(deadBossX, deadBossY), 1800);
                    } else {
                        setTimeout(() => this.showEndingChoice(), 2000);
                    }
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

        // Dinamik müzik + zoom kamerası: yakın düşman varsa savaş moduna geç
        if (SoundEngine.musicPlaying && this.enemies.length > 0) {
            const inCombat = this.enemies.some(e => Math.hypot(e.x - this.player.x, e.y - this.player.y) < 220);
            if (inCombat !== this._lastCombatState) {
                this._lastCombatState = inCombat;
                if (SoundEngine.setCombatMode) SoundEngine.setCombatMode(inCombat);
                // UI combatfade: savaştayken kenar panelleri soldur
                const wrapper = document.querySelector('.dashboard-wrapper');
                if (wrapper) wrapper.classList.toggle('in-combat', inCombat);
            }
        } else if (this._lastCombatState) {
            this._lastCombatState = false;
            if (SoundEngine.setCombatMode) SoundEngine.setCombatMode(false);
            const wrapper = document.querySelector('.dashboard-wrapper');
            if (wrapper) wrapper.classList.remove('in-combat');
        }
        // Her kare zoom güncelle (lerp ile yumuşak geçiş)
        World.updateZoom(this._lastCombatState);

        // 4. Ganimetleri Güncelle
        this.items.forEach(item => item.update());

        // 4.5. Mermileri ve Büyüleri Güncelle
        this.projectiles.forEach(p => p.update(this));
        this.projectiles = this.projectiles.filter(p => {
            if (p instanceof WeaponRainProjectile) return !p.exploded;
            return p.life > 0;
        });

        // 4.5. Zemin İzlerini Güncelle (GroundMark sistemi)
        if (this.groundMarks && this.groundMarks.length > 0) {
            this.groundMarks.forEach(m => m.update());
            this.groundMarks = this.groundMarks.filter(m => m.life > 0);
            // Asit havuzu oyuncu üzerine gelirse yavaşlatma debuff'ı
            if (this.player) {
                for (const m of this.groundMarks) {
                    if (m.type === 'acid' && m.size > 5) {
                        const d = Math.hypot(this.player.x - m.x, this.player.y - m.y);
                        if (d < m.size * 0.85) {
                            if (this.player.applyDebuff) this.player.applyDebuff('slow', this);
                            break;
                        }
                    }
                }
            }
        }

        // 5. Partikülleri Güncelle (Süreleri bittiyse sil)
        this.particles.forEach(p => p.update());
        this.particles = this.particles.filter(p => p.life > 0);

        // 5.5. Void Pulse Çekimi — Yok-Damla ölümünde yakın partikülleri içe çeker
        if (this.voidPulses && this.voidPulses.length > 0) {
            for (const vp of this.voidPulses) {
                vp.life--;
                const pull = vp.strength * (vp.life / vp.maxLife);
                for (const p of this.particles) {
                    const dx = vp.x - p.x;
                    const dy = vp.y - p.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist > 2 && dist < vp.radius) {
                        const f = pull / Math.max(dist, 8);
                        p.vx += dx * f;
                        p.vy += dy * f;
                    }
                }
            }
            this.voidPulses = this.voidPulses.filter(vp => vp.life > 0);
        }

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

        // Çizimleri sarsıntı + sunum zoom için korumaya al
        this.ctx.save();

        // Darbe anında ekranı sars
        ScreenEffects.apply(this.ctx);

        // Sunum büyütmesi — tüm dünya katmanını oyuncuya yaklaştırır
        const _prezZoom = World.getCurrentZoom();
        this.ctx.scale(_prezZoom, _prezZoom);

        // Zindan Karolarını Çiz
        World.draw(this.ctx, this.canvas.width, this.canvas.height);

        // Zemin İzlerini Çiz (slime etkileşim izleri — tile üstünde, entity altında)
        if (this.groundMarks && this.groundMarks.length > 0) {
            this.groundMarks.forEach(m => m.draw(this.ctx, World.camera));
        }

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

        // ─── ZİNDAN BÖLGE RENK OVERLAY ───
        if (this.state === 'playing') {
            World.drawZoneAtmosphere(this.ctx, this.floor, this.canvas.width, this.canvas.height);
        }

        // ─── SINIF KİMLİĞİ OVERLAY ───────────────────────────────────────────
        if (this.state === 'playing' && this.player) {
            const cls = this.selectedClass;
            const cw = this.canvas.width;
            const ch = this.canvas.height;
            const hp = this.player.hp;
            const maxHp = this.player.getMaxHp();
            const hpRatio = hp / maxHp;

            if (cls === 'warrior' && hpRatio < 0.30) {
                // SAVAŞÇI: Düşük Can — Dayanma içgüdüsü kırmızı nabız
                const pulse = 0.5 + Math.sin(Date.now() / 220) * 0.35;
                const intensity = (0.30 - hpRatio) / 0.30; // 0→1 as HP drops
                const vg = this.ctx.createRadialGradient(cw/2, ch/2, ch * 0.15, cw/2, ch/2, ch * 0.9);
                vg.addColorStop(0, 'rgba(0,0,0,0)');
                vg.addColorStop(1, `rgba(180,0,0,${intensity * pulse * 0.45})`);
                this.ctx.save();
                this.ctx.fillStyle = vg;
                this.ctx.fillRect(0, 0, cw, ch);
                // "DAYANIYORUM" yazısı — sadece kritik düşükte
                if (hpRatio < 0.12) {
                    this.ctx.globalAlpha = pulse * 0.65;
                    this.ctx.font = "bold 8px 'Press Start 2P'";
                    this.ctx.fillStyle = '#ff2222';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText('DAYANIYORUM...', cw / 2, ch - 32);
                }
                this.ctx.restore();
            }

            if (cls === 'ranger' && this.player.r_phase === 'idle' && !this.player.isMoving) {
                // NİŞANCI: Durağan — pasif avcı sahnesi (köşelerde ince gölge)
                this.ctx.save();
                const cornerAlpha = 0.08 + Math.sin(Date.now() / 900) * 0.03;
                ['topleft','topright','bottomleft','bottomright'].forEach((c, i) => {
                    const cx2 = (i % 2 === 0) ? 0 : cw;
                    const cy2 = (i < 2)       ? 0 : ch;
                    const cg = this.ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, cw * 0.45);
                    cg.addColorStop(0, `rgba(5,2,18,${cornerAlpha * 2.5})`);
                    cg.addColorStop(1, 'rgba(0,0,0,0)');
                    this.ctx.fillStyle = cg;
                    this.ctx.fillRect(0, 0, cw, ch);
                });
                this.ctx.restore();
            }
        }

        // ─── WARRIOR İDAM OVERLAY (kırmızı vignette + yavaş geçiş) ───
        if (this.executionTimer > 0) {
            this.executionTimer--;
            const alpha = (this.executionTimer / 22) * 0.55;
            const cw = this.canvas.width;
            const ch = this.canvas.height;
            const grad = this.ctx.createRadialGradient(cw / 2, ch / 2, ch * 0.2, cw / 2, ch / 2, ch * 0.85);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(1, `rgba(160,0,0,${alpha})`);
            this.ctx.save();
            this.ctx.fillStyle = grad;
            this.ctx.fillRect(0, 0, cw, ch);
            this.ctx.restore();
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

        if (this.state === 'playing') {
            this.drawMinimap();
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

    openBag() {
        if (!this.player) return;
        this._preBagState = this.state;
        this.state = 'bag';
        this.drawInventory();
        const screen = document.getElementById('screen-bag');
        if (screen) screen.classList.add('active');
    },

    closeBag() {
        const screen = document.getElementById('screen-bag');
        if (screen) screen.classList.remove('active');
        this.state = this._preBagState && this._preBagState !== 'bag' ? this._preBagState : 'playing';
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
        const mythicCards = this._appendMythicForgeCards(container);

        for (let i = 0; i < inv.length; i++) {
            if (!isEquip(inv[i]) || inv[i].rarity === 'legendary' || inv[i].rarity === 'mythic' || used.has(i)) continue;
            for (let j = i + 1; j < inv.length; j++) {
                if (!isEquip(inv[j]) || used.has(j)) continue;
                if (inv[i].rarity === inv[j].rarity) {
                    pairs.push([i, j]);
                    used.add(i); used.add(j);
                    break;
                }
            }
        }

        if (pairs.length === 0 && mythicCards === 0) {
            container.innerHTML = '<div style="color:#888;font-size:10px;text-align:center;width:100%;padding:24px 0">Birleştirilebilecek eşya yok.<br><span style="color:#555">Aynı nadirlikte 2 ekipman gerekli.</span></div>';
            return;
        }

        const cost = { common: 35, rare: 95 };
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

    _appendMythicForgeCards(container) {
        const inv = this.player.inventory;
        const stones = inv.filter(i => i.type && i.type.startsWith('stone_') && !i.type.startsWith('stone_shard_'));
        const candidates = inv
            .map((item, index) => ({ item, index }))
            .filter(({ item }) => item.stats && item.rarity === 'legendary');
        if (candidates.length === 0) return 0;

        const header = document.createElement('div');
        header.style.cssText = 'width:100%;font-size:9px;color:var(--rarity-mythic);text-align:center;margin:2px 0 0;font-family:var(--font-pixel)';
        header.textContent = 'KIZIL DOVUM';
        container.appendChild(header);

        candidates.forEach(({ item, index }) => {
            const cost = 1800 + Math.floor((this.floor || 1) * 18);
            const canCraft = this.player.gold >= cost && stones.length > 0;
            const el = document.createElement('div');
            el.style.cssText = `border:1px solid ${canCraft ? 'var(--rarity-mythic)' : '#333'};border-radius:8px;padding:10px 14px;text-align:center;min-width:170px;max-width:190px;background:rgba(0,0,0,0.58);transition:border-color 0.2s;${canCraft ? 'cursor:pointer' : 'opacity:0.45'}`;
            if (canCraft) el.addEventListener('click', () => this.craftMythicItem(index, cost));
            el.innerHTML = `
                <div style="font-size:9px;color:var(--rarity-legendary);margin-bottom:5px">${item.name}</div>
                <div style="font-size:8px;color:#aaa;margin-bottom:5px">+ 1 TAM TAS + ${cost} ALTIN</div>
                <div style="font-size:9px;color:var(--rarity-mythic)">→ KIZIL EKIPMAN</div>
            `;
            container.appendChild(el);
        });
        return candidates.length;
    },

    craftMythicItem(index, cost) {
        const item = this.player.inventory[index];
        if (!item || item.rarity !== 'legendary' || this.player.gold < cost) return;
        const stoneIndex = this.player.inventory.findIndex(i => i.type && i.type.startsWith('stone_') && !i.type.startsWith('stone_shard_'));
        if (stoneIndex === -1) {
            this.addLog("Kizil dovum icin tam bir tas gerekli.", "system");
            return;
        }

        const stone = this.player.inventory[stoneIndex];
        if ((stone.count || 1) > 1) stone.count--;
        else this.player.inventory.splice(stoneIndex, 1);

        const mythic = {
            ...item,
            id: Math.random().toString(36).substring(2, 9),
            type: item.type.replace('_legendary', '_mythic'),
            name: item.name.replace(/Efsanevi|Kadim|Kristal/g, '').trim()
        };
        mythic.name = `Kizil ${mythic.name}`;
        mythic.rarity = 'mythic';
        mythic.stats = { ...(item.stats || {}) };
        if (mythic.stats.atk) mythic.stats.atk += 6;
        if (mythic.stats.def) mythic.stats.def += 4;
        if (mythic.stats.hp) mythic.stats.hp += 25;
        if (mythic.stats.crit) mythic.stats.crit += 4;
        mythic.socketLimit = 2;
        mythic.sockets = item.sockets ? [...item.sockets] : [];
        mythic.description = `${item.description || ''} Kizil dovumla guclendirildi. 2 tas yuvasi vardir.`;

        const targetIndex = this.player.inventory.indexOf(item);
        if (targetIndex === -1) return;
        this.player.inventory[targetIndex] = mythic;
        this.player.gold -= cost;
        SoundEngine.playForge();
        this.addLog(`[${item.name}] kizil ekipmana donustu: [${mythic.name}]`, "loot");
        this.triggerScreenShake(6);
        this.drawForge();
        this.updateUI();
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

        SoundEngine.playForge();
        this.addLog(`⚒ [${a.name}] + [${b.name}] → [${newItem.name}]`, "loot");
        this.triggerScreenShake(3);
        this.drawForge();
        this.updateUI();
    },

    generateShopItems() {
        const isSpecial = this.merchant && this.merchant.isSpecial;
        // Fiyat çarpanı: her 10 katta %40 artar (logaritmik)
        const floorPriceMult = 1.0 + Math.floor((this.floor - 1) / 10) * 0.55;
        this.shopItems = [];

        // 1. Birinci Slot: İksir (Sağlık veya Hız)
        const potType = Math.random() < 0.6 ? 'potion_red' : 'potion_blue';
        const potPrice = Math.floor((isSpecial ? 42 : 22) * floorPriceMult);
        this.shopItems.push({
            type: potType,
            name: potType === 'potion_red' ? 'Büyük Sağlık İksiri' : 'Kadim Hız İksiri',
            rarity: isSpecial && this.floor >= 15 ? 'legendary' : 'rare',
            price: potPrice,
            stats: {},
            description: potType === 'potion_red' 
                ? `Maksimum canınıza göre sağlığınızı yeniler.` 
                : `10 saniyeliğine +35% Hareket Hızı sağlar.`,
            sold: false
        });

        // 2, 3, 4. Slotlar: Rastgele Ekipman Parçaları!
        const gearCategories = ['sword', 'bow', 'staff', 'shield', 'armor', 'helmet', 'necklace', 'earrings', 'ring', 'gloves', 'boots'];
        
        for (let i = 0; i < 3; i++) {
            // Her slot için rastgele kategori seç
            const category = gearCategories[Math.floor(Math.random() * gearCategories.length)];
            
            // Nadirlik belirle:
            // Özel satıcı erken oyunda rare kalır; efsanevi garanti 15. kattan sonra açılır
            // Normal satıcıda ise çoğunlukla common/rare, çok nadiren legendary
            let rarity = 'common';
            if (isSpecial) {
                if (this.floor < 15) {
                    rarity = 'rare';
                } else if (i === 0) {
                    rarity = 'legendary';
                } else {
                    rarity = Math.random() < 0.45 ? 'legendary' : 'rare';
                }
            } else {
                const rRoll = Math.random();
                const legendaryChance = this.floor < 10 ? 0.00 : this.floor < 25 ? 0.025 : 0.055;
                const rareChance = this.floor < 10 ? 0.22 : this.floor < 25 ? 0.32 : 0.42;
                if (rRoll < legendaryChance) rarity = 'legendary';
                else if (rRoll < legendaryChance + rareChance) rarity = 'rare';
                else rarity = 'common';
            }

            // Statları ve Fiyatı ata (Nadirliğe göre)
            const tempItem = new Item(0, 0, `${category}_${rarity}`);
            const stats = tempItem.stats;
            const displayName = tempItem.name;
            const description = tempItem.description;

            // Fiyatı belirle (kata göre ölçekli)
            let price = 35;
            if (rarity === 'common') price = Math.floor((Math.random() * 14 + 34) * floorPriceMult);
            else if (rarity === 'rare') price = Math.floor((Math.random() * 30 + 88) * floorPriceMult);
            else if (rarity === 'legendary') price = Math.floor((Math.random() * 90 + 240) * floorPriceMult);

            this.shopItems.push({
                type: `${category}_${rarity}`,
                name: displayName,
                rarity: rarity,
                price: price,
                stats: stats,
                effect: tempItem.effect,
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
            const effectText = this._getItemEffectText(item);
            if (effectText) statText += `<div class="shop-stat purple-color">${effectText}</div>`;

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

        this.drawTrainingCards(container);
    },

    _trainingOptions() {
        const floorMult = 1 + Math.floor((this.floor - 1) / 10) * 0.45;
        const repeatMult = 1 + (this.trainingPurchases || 0) * 0.18;
        return [
            { key: 'atk', title: 'SILAH TALIMI', desc: 'Kalici +1 saldiri.', stat: '+1 HASAR', cost: Math.floor(75 * floorMult * repeatMult), action: () => { this.player.stats.atk += 1; } },
            { key: 'def', title: 'ZIRH TALIMI', desc: 'Kalici +1 defans.', stat: '+1 DEFANS', cost: Math.floor(80 * floorMult * repeatMult), action: () => { this.player.stats.def += 1; } },
            { key: 'hp', title: 'DAYANIKLILIK', desc: 'Kalici +8 maks can.', stat: '+8 CAN', cost: Math.floor(90 * floorMult * repeatMult), action: () => { this.player.stats.maxHp += 8; this.player.hp = Math.min(this.player.getMaxHp(), this.player.hp + 8); } },
            { key: 'crit', title: 'KESKIN GOZ', desc: 'Kalici +2% kritik.', stat: '+2% KRITIK', cost: Math.floor(115 * floorMult * repeatMult), action: () => { this.player.stats.crit += 2; } }
        ];
    },

    drawTrainingCards(container) {
        const header = document.createElement('div');
        header.style.cssText = 'width:100%;font-size:9px;color:var(--neon-cyan);text-align:center;margin:4px 0 0;font-family:var(--font-pixel)';
        header.textContent = 'ALTINLA ANTRENMAN';
        container.appendChild(header);

        this._trainingOptions().forEach(opt => {
            const card = document.createElement('div');
            card.className = 'shop-card rarity-common';
            card.innerHTML = `
                <div class="shop-item-info">
                    <h3 class="pixel-text shop-item-name rarity-color-rare">${opt.title}</h3>
                    <p class="shop-item-desc">${opt.desc}</p>
                    <div class="shop-stat gold-color">${opt.stat}</div>
                </div>
                <div class="shop-action-area"></div>
            `;
            const actionDiv = card.querySelector('.shop-action-area');
            const displayPrice = this.player.hasBarter ? Math.floor(opt.cost * 0.9) : opt.cost;
            const btn = document.createElement('button');
            btn.className = `shop-buy-btn ${this.player.gold >= displayPrice ? '' : 'poor'}`;
            btn.innerHTML = `<span>EGITIM AL</span><span class="shop-price-tag"><i class="fa-solid fa-coins gold-color"></i> ${displayPrice}g</span>`;
            btn.addEventListener('click', () => this.buyTraining(opt, displayPrice));
            actionDiv.appendChild(btn);
            container.appendChild(card);
        });
    },

    buyTraining(opt, price) {
        if (this.player.gold < price) {
            SoundEngine.playHit();
            this.addLog("Yetersiz altin! Egitim alamazsin.", "system");
            return;
        }
        this.player.gold -= price;
        opt.action();
        this.trainingPurchases = (this.trainingPurchases || 0) + 1;
        SoundEngine.playBuy();
        this.addLog(`Egitim alindi: ${opt.title} (${opt.stat})`, "level");
        this.updateUI();
        this.drawShop();
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
