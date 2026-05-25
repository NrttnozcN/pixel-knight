/**
 * ==========================================================================
 * EREVORN - PROCEDURAL DUNGEON GENERATOR & WORLD SYSTEM
 * ==========================================================================
 * Bu dosya, rastgele zindan odaları ve koridorları üreten algoritmayı,
 * karo çarpışma testlerini, kamera sistemini ve dinamik meşale aydınlatmasını yönetir.
 */

const World = {
    width: 32,       // Zindan genişliği (Karo sayısı)
    height: 24,      // Zindan yüksekliği (Karo sayısı)
    tileSize: 48,    // Her bir karonun ekrandaki boyutu (48x48px)
    map: [],         // 2D Karo Matrisi: 0=Boş, 1=Duvar, 2=Yosunlu Boş
    rooms: [],       // Üretilen odaların listesi
    portal: { x: 0, y: 0, active: false }, // Çıkış portalı
    spawnPoints: { player: {x: 0, y: 0}, enemies: [], chests: [] },

    // Sunum ölçeği — ctx.scale(zoom) ile tüm dünya katmanına uygulanır
    zoom: 1.35,              // Temel büyütme (%35 daha yakın)
    _combatZoomBonus: 0,     // Savaş sırasında lerp ile +0.07'ye çıkar
    _critFlashTimer: 0,      // Kritik vuruş/idam — kısa anlık zum atışı

    getCurrentZoom() {
        const critBonus = this._critFlashTimer > 0
            ? Math.sin((this._critFlashTimer / 8) * Math.PI) * 0.04
            : 0;
        return this.zoom + this._combatZoomBonus + critBonus;
    },

    updateZoom(inCombat) {
        const target = inCombat ? 0.07 : 0.0;
        this._combatZoomBonus += (target - this._combatZoomBonus) * 0.035;
        if (this._critFlashTimer > 0) this._critFlashTimer--;
    },

    // Canvas piksel koordinatını dünya koordinatına çevirir.
    // Mouse.x/y canvas buffer pikselindedir; ctx.scale(zoom) nedeniyle
    // dünya koordinatı = canvasPiksel / zoom + kameraOfseti
    screenToWorld(canvasX, canvasY) {
        const zoom = this.getCurrentZoom();
        return {
            x: canvasX / zoom + this.camera.x,
            y: canvasY / zoom + this.camera.y
        };
    },

    // Kamera koordinatları
    camera: {
        x: 0,
        y: 0,
        _tx: 0,   // lerp hedef x
        _ty: 0,   // lerp hedef y
        update(playerX, playerY, canvasWidth, canvasHeight) {
            const cls = window.GameEngine && window.GameEngine.selectedClass;
            const zoom = World.getCurrentZoom();
            // Efektif görünür alan: zoom uygulandığında daha küçük
            const logicalW = canvasWidth  / zoom;
            const logicalH = canvasHeight / zoom;

            // Sınıfa özgü kamera gecikmesi
            let lerp = 0.92;
            if (cls === 'warrior') lerp = 0.09;
            else if (cls === 'ranger') lerp = 0.96;
            else if (cls === 'mage')   lerp = 0.16;

            this._tx = playerX - logicalW / 2;
            this._ty = playerY - logicalH / 2;

            this.x += (this._tx - this.x) * lerp;
            this.y += (this._ty - this.y) * lerp;

            // Mage: büyü yükleme sırasında kozmik titreme
            if (cls === 'mage' && window.GameEngine && window.GameEngine.player) {
                const mp = window.GameEngine.player;
                if (mp.m_phase === 'charge') {
                    const jitter = (1 - mp.m_phaseTimer / 18) * 1.8;
                    this.x += (Math.random() - 0.5) * jitter;
                    this.y += (Math.random() - 0.5) * jitter;
                }
            }

            // Sınır klamp — görünür alana göre ayarlanmış
            const maxCamX = (World.width  * World.tileSize) - logicalW;
            const maxCamY = (World.height * World.tileSize) - logicalH;
            this.x = Math.max(0, Math.min(this.x, Math.max(0, maxCamX)));
            this.y = Math.max(0, Math.min(this.y, Math.max(0, maxCamY)));
        }
    },

    // Yeni Bir Zindan Seviyesi Üret (Algoritma: Random Rooms & Corridors & Boss Arena)
    generate(floorLevel = 1) {
        this.rooms = [];
        this.spawnPoints.enemies = [];
        this.spawnPoints.chests = [];
        this.spawnPoints.boss = null; // Sıfırla
        this.spawnPoints.merchant = null; // Sıfırla
        this.portal.active = false;
        
        const isBossFloor = (floorLevel % 10 === 0);
        
        if (isBossFloor) {
            // Boss Katları daha derli toplu ve arenaya özel olur
            this.width = 24;
            this.height = 20;
        } else {
            // Normal katlar gitgide büyür
            this.width = 30 + Math.min(10, floorLevel * 2);
            this.height = 22 + Math.min(8, floorLevel);
        }

        // 1. Haritayı tamamen duvarla kapla (1 = Duvar)
        this.map = [];
        for (let y = 0; y < this.height; y++) {
            this.map[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.map[y][x] = 1;
            }
        }

        if (isBossFloor) {
            // --- BOSS ARENASI ÜRETİMİ ---
            // Oyuncu Başlangıç Odası (Güvenli Giriş Koridoru)
            const startRoom = { x: 2, y: 8, w: 4, h: 4, centerX: 4, centerY: 10 };
            // Devasa Zindan Muhafızı Arenası (Boss Odası)
            const bossRoom = { x: 9, y: 3, w: 12, h: 13, centerX: 15, centerY: 9 };
            
            this.rooms.push(startRoom);
            this.rooms.push(bossRoom);
            
            // Odaları Haritaya Kazı (Yosunsuz düz zemin - 0)
            for (const r of this.rooms) {
                for (let ry = r.y; ry < r.y + r.h; ry++) {
                    for (let rx = r.x; rx < r.x + r.w; rx++) {
                        this.map[ry][rx] = 0;
                    }
                }
            }
            
            // Başlangıç odası ile Arenayı birleştir (Yatay koridor kazı)
            this.carveHorizontalTunnel(startRoom.centerX, bossRoom.x + 1, startRoom.centerY);
            
            // Oyuncu Başlangıç Noktası
            this.spawnPoints.player = {
                x: startRoom.centerX * this.tileSize + this.tileSize / 2,
                y: startRoom.centerY * this.tileSize + this.tileSize / 2
            };
            
            // Boss Konumu (Arenanın tam ortası)
            this.spawnPoints.boss = {
                x: bossRoom.centerX * this.tileSize + this.tileSize / 2,
                y: bossRoom.centerY * this.tileSize + this.tileSize / 2
            };
            
            // Çıkış Portalı (Arenanın en arkasında)
            this.portal.x = (bossRoom.x + bossRoom.w - 2) * this.tileSize + this.tileSize / 2;
            this.portal.y = bossRoom.centerY * this.tileSize + this.tileSize / 2;
            
            console.log(`%c[World Generator] Floor ${floorLevel} (BOSS ARENASI) Hazırlandı.`, "color: #ff3b30; font-weight: bold;");
            return;
        }

        // --- NORMAL KAT ÜRETİMİ ---
        // 2. Rastgele Odalar Oluştur
        const minRoomSize = 5;
        const maxRoomSize = 8;
        const roomCount = 6 + Math.min(5, floorLevel); // Seviye arttıkça oda sayısı artar

        for (let i = 0; i < roomCount * 2; i++) { // Çakışmaları tolere etmek için fazla deneme yap
            const w = Math.floor(Math.random() * (maxRoomSize - minRoomSize + 1)) + minRoomSize;
            const h = Math.floor(Math.random() * (maxRoomSize - minRoomSize + 1)) + minRoomSize;
            const x = Math.floor(Math.random() * (this.width - w - 2)) + 1;
            const y = Math.floor(Math.random() * (this.height - h - 2)) + 1;

            const newRoom = { x, y, w, h, centerX: Math.floor(x + w / 2), centerY: Math.floor(y + h / 2) };

            // Çakışma kontrolü
            let overlaps = false;
            for (const r of this.rooms) {
                if (x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y) {
                    overlaps = true;
                    break;
                }
            }

            if (!overlaps) {
                this.rooms.push(newRoom);
                // Odayı oy (Duvarları boş zemine çevir - 0)
                // Detay katmak için rastgele yosunlu zeminler (2) ekle
                for (let ry = y; ry < y + h; ry++) {
                    for (let rx = x; rx < x + w; rx++) {
                        this.map[ry][rx] = Math.random() < 0.12 ? 2 : 0;
                    }
                }
            }

            if (this.rooms.length >= roomCount) break;
        }

        // 3. Odaları Tünellerle Bağla
        for (let i = 0; i < this.rooms.length - 1; i++) {
            const roomA = this.rooms[i];
            const roomB = this.rooms[i + 1];

            // Önce yatay sonra dikey tünel çiz
            this.carveHorizontalTunnel(roomA.centerX, roomB.centerX, roomA.centerY);
            this.carveVerticalTunnel(roomA.centerY, roomB.centerY, roomB.centerX);
        }

        // 4. Oyuncu Başlangıç Noktasını Belirle (1. Odanın Merkezi)
        const startRoom = this.rooms[0];
        this.spawnPoints.player = {
            x: startRoom.centerX * this.tileSize + this.tileSize / 2,
            y: startRoom.centerY * this.tileSize + this.tileSize / 2
        };

        // 5. Çıkış Portalını Yerleştir (Son Odanın Merkezi)
        const endRoom = this.rooms[this.rooms.length - 1];
        this.portal.x = endRoom.centerX * this.tileSize + this.tileSize / 2;
        this.portal.y = endRoom.centerY * this.tileSize + this.tileSize / 2;

        // 6. Düşmanları ve Sandıkları Dağıt
        // Başlangıç odası hariç diğer odalarda canavar ve sandık spawn et
        for (let i = 1; i < this.rooms.length; i++) {
            const room = this.rooms[i];
            
            // Sandık Spawn Şansı (%55 her odada 1 sandık)
            if (Math.random() < 0.55) {
                const chestX = (room.x + Math.floor(Math.random() * (room.w - 2)) + 1) * this.tileSize + this.tileSize / 2;
                const chestY = (room.y + Math.floor(Math.random() * (room.h - 2)) + 1) * this.tileSize + this.tileSize / 2;
                this.spawnPoints.chests.push({ x: chestX, y: chestY });
            }

            // Canavar Sayısı (Oda büyüklüğüne ve kat seviyesine göre 1-3 canavar)
            const enemyCount = Math.min(5, Math.floor(Math.random() * 2) + 1 + Math.floor(floorLevel / 12));
            for (let e = 0; e < enemyCount; e++) {
                const enemyX = (room.x + Math.floor(Math.random() * (room.w - 2)) + 1) * this.tileSize + this.tileSize / 2;
                const enemyY = (room.y + Math.floor(Math.random() * (room.h - 2)) + 1) * this.tileSize + this.tileSize / 2;
                
                // Zone'a göre lore uyumlu düşman havuzu
                const zone = Math.ceil(floorLevel / 10);
                let type = 'slime';
                const rand = Math.random();
                const zoneEnemyPools = {
                    1:  ['slime', 'slime_burning', 'skeleton', 'lost_armor', 'bat'],          // Karanlık Zindan
                    2:  ['shadow_creature', 'slime_toxic', 'slime_shadow', 'witch', 'blind_worker'],     // Gölge Mağarası
                    3:  ['mutant_goblin', 'mutant_goblin', 'goblin', 'zombie', 'enslaved_villager'],     // Goblin Yurdu
                    4:  ['slime_burning', 'demon', 'magma_golem', 'witch', 'charred_priest'],            // Alev Krallığı
                    5:  ['ice_zombie', 'ice_golem', 'skeleton', 'ice_bear', 'slime'],                    // Donmuş Tundra
                    6:  ['treant', 'treant', 'spider', 'troll', 'vine_horror'],                          // Orman Tapınağı
                    7:  ['gargoyle', 'gargoyle', 'demon', 'armored_knight', 'slime_shadow'],             // Şeytan Kalesi
                    8:  ['lightning_golem', 'ghost_arcanist', 'slime_rune', 'void_wraith', 'witch'],     // Gökyüzü Kalesi
                    9:  ['void_horror', 'void_wraith', 'slime_void', 'slime_shadow', 'abyss_lord'],      // Yokluk Alemi
                    10: ['dragon_spawn', 'abyss_lord', 'void_wraith', 'rune_clone', 'dragon_spawn'],     // Ejder Yuvası
                };
                const pool = zoneEnemyPools[zone] || ['slime', 'skeleton', 'slime_shadow'];
                // Yeni düşman tipleri henüz sprite'ı olmayan fallback'lere yönlendirilir
                const rawType = pool[Math.floor(rand * pool.length)];
                // Sprite/loji bulunan türlere map et
                // All lore enemy types now have stat blocks in entities.js — pass through directly
                type = rawType;

                // Koordinatlar çakışmasın diye minik kaymalar ekle
                this.spawnPoints.enemies.push({ x: enemyX, y: enemyY, type: type });
            }
        }

        // 7. Gizemli Satıcıyı Konumlandır (Başlangıç odası dışındaki ilk odaya yerleştir)
        if (this.rooms.length > 2) {
            const merchantRoom = this.rooms[1];
            this.spawnPoints.merchant = {
                x: merchantRoom.centerX * this.tileSize + this.tileSize / 2,
                y: merchantRoom.centerY * this.tileSize + this.tileSize / 2
            };
        }

        console.log(`%c[World Generator] Floor ${floorLevel} Hazırlandı. Oda: ${this.rooms.length}, Düşman: ${this.spawnPoints.enemies.length}, Sandık: ${this.spawnPoints.chests.length}`, "color: #00f0ff;");

        console.log(`%c[World Generator] Floor ${floorLevel} Hazırlandı. Oda: ${this.rooms.length}, Düşman: ${this.spawnPoints.enemies.length}, Sandık: ${this.spawnPoints.chests.length}`, "color: #00f0ff;");
    },

    // Yatay Tünel Kazıcı
    carveHorizontalTunnel(x1, x2, y) {
        const startX = Math.min(x1, x2);
        const endX = Math.max(x1, x2);
        for (let x = startX; x <= endX; x++) {
            if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
                this.map[y][x] = Math.random() < 0.08 ? 2 : 0;
            }
        }
    },

    // Dikey Tünel Kazıcı
    carveVerticalTunnel(y1, y2, x) {
        const startY = Math.min(y1, y2);
        const endY = Math.max(y1, y2);
        for (let y = startY; y <= endY; y++) {
            if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
                this.map[y][x] = Math.random() < 0.08 ? 2 : 0;
            }
        }
    },

    // Çarpışma Testi: Koordinatlar yürüme alanında mı? (Duvar değilse true döner)
    isWalkable(x, y) {
        // Karo indekslerini bul
        const tileX = Math.floor(x / this.tileSize);
        const tileY = Math.floor(y / this.tileSize);

        // Zindan sınırlarının dışı yürünemez
        if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
            return false;
        }

        // 1=Duvar dışındaki her karo yürünebilirdir (0=Boş, 2=Yosunlu Boş)
        return this.map[tileY][tileX] !== 1;
    },

    // Yarıçap çarpışması için duvarlara en yakın noktaları kontrol eden gelişmiş fonksiyon
    checkCircleCollision(x, y, radius) {
        const points = [
            { x: x - radius, y: y },
            { x: x + radius, y: y },
            { x: x, y: y - radius },
            { x: x, y: y + radius },
            // Çapraz noktalar
            { x: x - radius * 0.7, y: y - radius * 0.7 },
            { x: x + radius * 0.7, y: y - radius * 0.7 },
            { x: x - radius * 0.7, y: y + radius * 0.7 },
            { x: x + radius * 0.7, y: y + radius * 0.7 }
        ];

        for (const pt of points) {
            if (!this.isWalkable(pt.x, pt.y)) {
                return true; // Çarpışma var!
            }
        }
        return false; // Çarpışma yok
    },

    // Zindan Karolarını Ekrana Çiz (Culling ile sadece ekranda görünenleri çizer!)
    draw(ctx, canvasWidth, canvasHeight) {
        if (!this.map || this.map.length === 0) return;
        const zoom = this.getCurrentZoom();
        const startX = Math.floor(this.camera.x / this.tileSize);
        const startY = Math.floor(this.camera.y / this.tileSize);
        // Görünür karo sayısı = mantıksal görünür genişlik / karo boyutu
        const endX = startX + Math.ceil(canvasWidth  / (this.tileSize * zoom)) + 2;
        const endY = startY + Math.ceil(canvasHeight / (this.tileSize * zoom)) + 2;

        const limitX = Math.min(this.width, endX);
        const limitY = Math.min(this.height, endY);

        for (let y = Math.max(0, startY); y < limitY; y++) {
            for (let x = Math.max(0, startX); x < limitX; x++) {
                const tileType = this.map[y][x];
                const drawX = x * this.tileSize - this.camera.x;
                const drawY = y * this.tileSize - this.camera.y;

                if (tileType === 1) {
                    // Duvar Çiz
                    SpriteEngine.draw(ctx, 'tile_wall', drawX, drawY, this.tileSize, this.tileSize);
                } else if (tileType === 2) {
                    // Yosunlu Zemin Çiz
                    SpriteEngine.draw(ctx, 'tile_floor_moss', drawX, drawY, this.tileSize, this.tileSize);
                } else {
                    // Normal Boş Zemin Çiz
                    SpriteEngine.draw(ctx, 'tile_floor', drawX, drawY, this.tileSize, this.tileSize);
                }
            }
        }
    },

    // Her zone için lore'a uygun atmosfer rengi ve sis efekti
    drawZoneAtmosphere(ctx, floorLevel, canvasWidth, canvasHeight) {
        const zone = Math.ceil(floorLevel / 10);
        // Zone atmosfer renkleri (lore'dan: mor yozlaşma, buz mavisi, lav kırmızısı vs.)
        const zoneAtmos = {
            1:  { color: 'rgba(80, 0, 120, 0.08)',  pulse: false }, // Mor büyü izleri — Karanlık Zindan
            2:  { color: 'rgba(40, 0, 80,  0.14)',  pulse: true  }, // Solucan mor kristal — Gölge Mağarası
            3:  { color: 'rgba(100,60, 0,  0.10)',  pulse: false }, // Sarı zehir dumanı — Goblin Yurdu
            4:  { color: 'rgba(180,30, 0,  0.15)',  pulse: true  }, // Lav kırmızısı — Alev Krallığı
            5:  { color: 'rgba(100,180,220,0.12)',  pulse: false }, // Buz mavisi — Donmuş Tundra
            6:  { color: 'rgba(60, 120, 0, 0.10)',  pulse: false }, // Zehirli yeşil — Orman Tapınağı
            7:  { color: 'rgba(20,  0, 20, 0.18)',  pulse: true  }, // Obsidyen karanlık — Şeytan Kalesi
            8:  { color: 'rgba(200,200,255,0.07)',  pulse: false }, // Gökyüzü parlak — Gökyüzü Kalesi
            9:  { color: 'rgba(60,  0,100, 0.20)',  pulse: true  }, // Gerçeklik yırtığı — Yokluk Alemi
            10: { color: 'rgba(180,100, 0, 0.16)',  pulse: true  }, // Altın Kalp enerjisi — Ejder Yuvası
        };
        const atmos = zoneAtmos[zone];
        if (!atmos) return;

        ctx.save();
        const alpha = atmos.pulse
            ? parseFloat(atmos.color.split(',')[3]) * (0.7 + Math.sin(Date.now() / 1200) * 0.3)
            : 1.0;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = atmos.color;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.restore();
    },

    // Oyuncunun etrafındaki dinamik meşale aydınlatma maskesi (Radial Gradient Shadow Overlay)
    drawTorchLight(ctx, playerX, playerY, canvasWidth, canvasHeight) {
        const zoom    = this.getCurrentZoom();
        // Mantıksal canvas boyutu — ctx.scale(zoom) aktifken bu boyutta maskCanvas
        // çizmek ekranı tam kaplar (scale uygulandığında logicalW*zoom = canvasWidth)
        const logicalW = canvasWidth  / zoom;
        const logicalH = canvasHeight / zoom;

        // Oyuncunun mantıksal ekran konumu (dünya pikseli - kamera ofseti)
        const screenX = playerX - this.camera.x;
        const screenY = playerY - this.camera.y;

        // Işık yarıçapı: savaşta ve yakın kamerada biraz genişler
        const combatExpand = this._combatZoomBonus / 0.07; // 0→1
        const innerR = 38 + combatExpand * 14;   // 38px → 52px savaşta
        const outerR = 185 + combatExpand * 40;  // 185px → 225px savaşta

        ctx.save();

        const maskCanvas = document.createElement('canvas');
        maskCanvas.width  = Math.ceil(logicalW);
        maskCanvas.height = Math.ceil(logicalH);
        const maskCtx = maskCanvas.getContext('2d');

        maskCtx.fillStyle = '#030305';
        maskCtx.fillRect(0, 0, logicalW, logicalH);

        const gradient = maskCtx.createRadialGradient(
            screenX, screenY, innerR,
            screenX, screenY, outerR
        );
        gradient.addColorStop(0,   'rgba(0,0,0,1.0)');
        gradient.addColorStop(0.35,'rgba(0,0,0,0.85)');
        gradient.addColorStop(0.75,'rgba(0,0,0,0.18)');
        gradient.addColorStop(1,   'rgba(0,0,0,0.0)');

        maskCtx.globalCompositeOperation = 'destination-out';
        maskCtx.fillStyle = gradient;
        maskCtx.beginPath();
        maskCtx.arc(screenX, screenY, outerR + 10, 0, Math.PI * 2);
        maskCtx.fill();

        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(maskCanvas, 0, 0);

        ctx.restore();
    }
};
