/**
 * ==========================================================================
 * EREVORN - INPUT SYSTEM, SCREEN SHAKE & GAME LOOP ENGINE
 * ==========================================================================
 * Bu dosya; klavye/fare dinleyicilerini, ekran sarsma (Screen Shake) sistemini
 * ve saniyede 60 kare çalışan kararlı Game Loop motorunu yönetir.
 */

// Klavye ve Fare Durumları
const Keyboard = {};
const Mouse = { x: 0, y: 0, clicked: false };

// Giriş Yöneticisi Kurulumu
const InputManager = {
    init(canvas) {
        // 1. Klavye Tuşlarını Dinle
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            Keyboard[key] = true;
            
            // Boşluk, ok tuşları ve WASD tuşlarının sayfayı kaydırmasını engelle (Kritik tarayıcı müdahalesi!)
            if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.key)) {
                e.preventDefault();
            }

            // Dialogue can be advanced with common confirm keys.
            if (['e', 'enter', ' '].includes(key) && window.DialogSystem && window.DialogSystem.isActive()) {
                window.DialogSystem.advance();
                e.preventDefault();
                return;
            }

            // 'E' tuşuna tek basış etkileşimi (Keydown tetiklemesi)
            if (key === 'e') {
                if (window.DialogSystem && window.DialogSystem.isActive()) {
                    window.DialogSystem.advance();
                } else if (window.GameEngine) {
                    if (window.GameEngine.state === 'playing') {
                        window.GameEngine.handleInteraction();
                    } else if (window.GameEngine.state === 'shop') {
                        window.GameEngine.closeShop();
                    } else if (window.GameEngine.state === 'forge') {
                        window.GameEngine.closeForge();
                    }
                }
            }

            // Enter / Escape tuşu: hikaye diyaloğunu kapat
            if (key === 'enter' || key === 'escape') {
                if (window.GameEngine) {
                    if (window.GameEngine.state === 'story') {
                        window.GameEngine.closeStoryDialog();
                    } else if (window.GameEngine.state === 'victory') {
                        window.GameEngine.closeVictory();
                        window.GameEngine.startNewGame();
                    } else if (window.GameEngine.state === 'meta') {
                        window.GameEngine.closeMetaScreen();
                    }
                }
            }

            // 'Q' tuşuna tek basış (Hızlı Hücum Yeteneği)
            if (key === 'q') {
                if (window.GameEngine && window.GameEngine.state === 'playing' && window.GameEngine.player) {
                    window.GameEngine.player.useSkillQ(window.GameEngine);
                }
            }

            // 'R' tuşuna tek basış (Silah Yağmuru Yeteneği)
            if (key === 'r') {
                if (window.GameEngine && window.GameEngine.state === 'playing' && window.GameEngine.player) {
                    window.GameEngine.player.useSkillW(window.GameEngine);
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            Keyboard[e.key.toLowerCase()] = false;
        });

        // ─── DEBUG ŞİFRESİ: "erevorn" yazınca aktif olur ───────────────────
        const DEBUG_CODE = 'erevorn';
        let _debugBuffer = '';
        window.addEventListener('keydown', (e) => {
            if (!window.GameEngine) return;
            const g = window.GameEngine;

            // Şifre tampon güncelleme
            _debugBuffer = (_debugBuffer + e.key.toLowerCase()).slice(-DEBUG_CODE.length);
            if (_debugBuffer === DEBUG_CODE) {
                g._debugMode = !g._debugMode;
                const msg = g._debugMode ? '🛠️ DEBUG MODU AÇIK' : '🛠️ DEBUG MODU KAPALI';
                if (g.addLog) g.addLog(msg, 'level');
                // Ekrana büyük yazı göster
                const el = document.createElement('div');
                el.textContent = msg;
                el.style.cssText = 'position:fixed;top:40%;left:50%;transform:translate(-50%,-50%);font-family:monospace;font-size:22px;color:#39ff14;background:rgba(0,0,0,0.85);padding:16px 32px;border:2px solid #39ff14;border-radius:6px;z-index:9999;pointer-events:none';
                document.body.appendChild(el);
                setTimeout(() => el.remove(), 2000);
                _debugBuffer = '';
                return;
            }

            if (!g._debugMode || g.state !== 'playing') return;

            // F → Sonraki kata ışınlan (Floor Skip)
            if (e.key === 'f' || e.key === 'F') {
                g.nextFloor();
                if (g.addLog) g.addLog(`⏭️ DEBUG: Kat ${g.floor}'e atlandı`, 'level');
            }

            // Shift+F → Belirli bir kata atla (konsola sor)
            if (e.key === 'F' && e.shiftKey) {
                const target = parseInt(prompt('Hangi kata atlamak istiyorsun? (1-100)'), 10);
                if (target >= 1 && target <= 100 && !isNaN(target)) {
                    g.floor = target - 1;
                    g.nextFloor();
                    if (g.addLog) g.addLog(`⏭️ DEBUG: Kat ${g.floor}'e ışınlandın`, 'level');
                }
            }

            // G → God Mod toggle (hasar almaz)
            if (e.key === 'g' || e.key === 'G') {
                g._godMode = !g._godMode;
                if (g.addLog) g.addLog(g._godMode ? '🛡️ GOD MOD: AÇIK' : '🛡️ GOD MOD: KAPALI', 'level');
            }

            // K → Tüm düşmanları öldür
            if (e.key === 'k' || e.key === 'K') {
                let count = 0;
                [...g.enemies].forEach(en => {
                    if (en !== g.boss) { en.hp = 0; count++; }
                });
                if (g.boss) { g.boss.hp = 1; }
                if (g.addLog) g.addLog(`💀 DEBUG: ${count} düşman yok edildi`, 'enemy');
            }

            // H → Tam can doldur
            if (e.key === 'h' || e.key === 'H') {
                if (g.player) {
                    g.player.hp = g.player.getMaxHp ? g.player.getMaxHp() : g.player.stats.maxHp;
                    if (g.addLog) g.addLog('💚 DEBUG: Can dolduruldu', 'loot');
                }
            }

            // J → +1000 altın
            if (e.key === 'j' || e.key === 'J') {
                if (g.player) {
                    g.player.gold += 1000;
                    if (g.addLog) g.addLog('💰 DEBUG: +1000 altın eklendi', 'loot');
                }
            }
        });

        // 2. Fare Hareketlerini Dinle
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            // Arayüz ölçeklenmiş olsa bile fare konumunu canvas pikseline tam oranla eşitle
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            
            Mouse.x = (e.clientX - rect.left) * scaleX;
            Mouse.y = (e.clientY - rect.top) * scaleY;
        });

        // 3. Fare Tıklamalarını Dinle
        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Sol tık
                if (window.DialogSystem && window.DialogSystem.isActive()) {
                    window.DialogSystem.advance();
                    e.preventDefault();
                    return;
                }
                Mouse.clicked = true;
                
                // Ses motorunu tarayıcı politikaları nedeniyle ilk tıklamada gizlice başlat
                if (window.SoundEngine) {
                    window.SoundEngine.init();
                }
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                Mouse.clicked = false;
            }
        });

        // Ekrana tıklandığında odaklanma kaybını önle
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
};

// --- EKRAN SARSINTI SİSTEMİ (Screen Shake) ---
const ScreenEffects = {
    shakeIntensity: 0,
    shakeDecay: 0.9, // Her karede sarsıntıyı %10 azalt

    trigger(intensity) {
        this.shakeIntensity = intensity;
    },

    // Canvas çizimi öncesinde sarsıntı kaydırmasını uygula
    apply(ctx) {
        if (this.shakeIntensity > 0.1) {
            const dx = (Math.random() - 0.5) * this.shakeIntensity;
            const dy = (Math.random() - 0.5) * this.shakeIntensity;
            ctx.translate(dx, dy);
            
            // Sarsıntıyı sönümle (Decay)
            this.shakeIntensity *= this.shakeDecay;
        } else {
            this.shakeIntensity = 0;
        }
    }
};

// --- OYUN DÖNGÜSÜ MOTORU (Game Loop) ---
const GameLoop = {
    lastTime: 0,
    isRunning: false,

    start(gameUpdateCallback, gameDrawCallback) {
        this.update = gameUpdateCallback;
        this.draw = gameDrawCallback;
        this.isRunning = true;
        this.lastTime = performance.now();
        
        requestAnimationFrame((timestamp) => this.loop(timestamp));
    },

    stop() {
        this.isRunning = false;
    },

    loop(timestamp) {
        if (!this.isRunning) return;

        // Geçen süreyi hesapla; 50ms'e sabitle (sekme gizlenince devasa dt'yi önler)
        const dt = Math.min(timestamp - this.lastTime, 50);
        this.lastTime = timestamp;

        // 1. Güncellemeleri yap (Fizik, Yapay Zeka vb.)
        if (this.update) {
            this.update(dt);
        }

        // 2. Görselleri ekranı temizleyip yeniden çiz
        if (this.draw) {
            this.draw();
        }

        // Sonraki kareyi çağır
        requestAnimationFrame((timestamp) => this.loop(timestamp));
    }
};

// Varlıkların dışarıya aktarılması
window.Keyboard = Keyboard;
window.Mouse = Mouse;
window.ScreenEffects = ScreenEffects;
window.GameLoop = GameLoop;
