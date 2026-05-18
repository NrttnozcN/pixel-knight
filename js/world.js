/**
 * ==========================================================================
 * PIXEL KNIGHT - PROCEDURAL DUNGEON GENERATOR & WORLD SYSTEM
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

    // Kamera koordinatları
    camera: {
        x: 0,
        y: 0,
        update(playerX, playerY, canvasWidth, canvasHeight) {
            // Oyuncuyu ekranın ortasında tut
            this.x = playerX - canvasWidth / 2;
            this.y = playerY - canvasHeight / 2;
            
            // Kamera harita sınırlarının dışına taşmasın
            const maxCamX = (World.width * World.tileSize) - canvasWidth;
            const maxCamY = (World.height * World.tileSize) - canvasHeight;
            
            this.x = Math.max(0, Math.min(this.x, maxCamX));
            this.y = Math.max(0, Math.min(this.y, maxCamY));
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
        
        const isBossFloor = (floorLevel % 5 === 0);
        
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
            const enemyCount = Math.floor(Math.random() * 2) + 1 + Math.floor(floorLevel / 3);
            for (let e = 0; e < enemyCount; e++) {
                const enemyX = (room.x + Math.floor(Math.random() * (room.w - 2)) + 1) * this.tileSize + this.tileSize / 2;
                const enemyY = (room.y + Math.floor(Math.random() * (room.h - 2)) + 1) * this.tileSize + this.tileSize / 2;
                
                // Zindan derinleştikçe İskelet şansı artar, Slime azalır
                let type = 'slime';
                const rand = Math.random();
                if (floorLevel >= 4) {
                    type = rand < 0.4 ? 'slime' : (rand < 0.75 ? 'skeleton' : 'slime_shadow');
                } else if (floorLevel >= 2) {
                    type = rand < 0.6 ? 'slime' : (rand < 0.85 ? 'skeleton' : 'slime_fire');
                } else {
                    type = rand < 0.8 ? 'slime' : 'slime_fire'; // Kat 1: Sadece Slime türleri
                }

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
        if (!this.map || this.map.length === 0) return; // Harita henüz üretilmediyse çizim yapmadan güvenli çıkış yap
        const startX = Math.floor(this.camera.x / this.tileSize);
        const startY = Math.floor(this.camera.y / this.tileSize);
        // Ekrana sığan karo sayısı + tolerans
        const endX = startX + Math.ceil(canvasWidth / this.tileSize) + 1;
        const endY = startY + Math.ceil(canvasHeight / this.tileSize) + 1;

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

    // Oyuncunun etrafındaki dinamik meşale aydınlatma maskesi (Radial Gradient Shadow Overlay)
    drawTorchLight(ctx, playerX, playerY, canvasWidth, canvasHeight) {
        // Ekrandaki oyuncu merkez koordinatını hesapla
        const screenX = playerX - this.camera.x;
        const screenY = playerY - this.camera.y;

        ctx.save();
        
        // Gölgelendirme rengini zindan hissi veren çok koyu bir lacivert/siyah yap
        const shadowColor = '#030305';

        // 1. Ekran boyutunda siyah bir maske katmanı oluştur
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = canvasWidth;
        maskCanvas.height = canvasHeight;
        const maskCtx = maskCanvas.getContext('2d');

        // Komple siyah boya
        maskCtx.fillStyle = shadowColor;
        maskCtx.fillRect(0, 0, canvasWidth, canvasHeight);

        // 2. Oyuncunun merkezinde ışık çemberini "oy" (Destination-Out ile sil)
        // Işık yarıçapı: 160 piksel
        const gradient = maskCtx.createRadialGradient(
            screenX, screenY, 30,  // Sıcak meşale göbeği (tam ışık)
            screenX, screenY, 170  // Yavaşça kararma yarıçapı
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 1.0)'); // Tamamen delik/şeffaf
        gradient.addColorStop(0.4, 'rgba(0, 0, 0, 0.8)'); // Hafif gölge başlangıcı
        gradient.addColorStop(0.8, 'rgba(0, 0, 0, 0.15)'); // Koyu gölge
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.0)'); // Tamamen siyah

        maskCtx.globalCompositeOperation = 'destination-out';
        maskCtx.fillStyle = gradient;
        maskCtx.beginPath();
        maskCtx.arc(screenX, screenY, 175, 0, Math.PI * 2);
        maskCtx.fill();

        // 3. Maskeyi ana ekranın üstüne çiz
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(maskCanvas, 0, 0);

        ctx.restore();
    }
};
