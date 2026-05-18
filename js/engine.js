/**
 * ==========================================================================
 * PIXEL KNIGHT - INPUT SYSTEM, SCREEN SHAKE & GAME LOOP ENGINE
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

            // 'E' tuşuna tek basış etkileşimi (Keydown tetiklemesi)
            if (key === 'e') {
                if (window.GameEngine) {
                    if (window.GameEngine.state === 'playing') {
                        window.GameEngine.handleInteraction();
                    } else if (window.GameEngine.state === 'shop') {
                        window.GameEngine.closeShop();
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

        // Geçen süreyi hesapla (Delta Time - Farklı hızlardaki ekranlar için kararlılık)
        const dt = timestamp - this.lastTime;
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
