/**
 * ==========================================================================
 * EREVORN - MOBİL KONTROLLER (Dokunmatik Joystick + Butonlar)
 * ==========================================================================
 * Dokunmatik cihazları tespit eder, virtual joystick ve butonlarla
 * mevcut Keyboard/Mouse nesnelerine hareket ve saldırı iletir.
 */

const MobileControls = {
    joystickTouchId: null,
    joystickBaseX: 0,
    joystickBaseY: 0,
    joystickRadius: 55,
    isActive: false,

    init() {
        // Dokunmatik destek yoksa hiçbir şey yapma
        const hasTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
        if (!hasTouch) return;

        this.isActive = true;

        // Mobil kontrol panelini göster
        const overlay = document.getElementById('mobile-controls');
        if (overlay) overlay.style.display = 'flex';

        // Sayfa scroll ve zoom'u engelle (oyun sırasında istenmeyen kaydırma olmasın)
        document.body.style.touchAction = 'none';
        document.body.style.overscrollBehavior = 'none';

        // Mouse başlangıç konumunu canvas ortasına koy
        const canvas = document.getElementById('game-canvas');
        if (canvas) {
            Mouse.x = canvas.width / 2;
            Mouse.y = canvas.height / 2;
        }

        this.setupJoystick();
        this.setupActionButtons();
        this.setupCanvasTouch();
    },

    // --- JOYSTICK ---
    setupJoystick() {
        const base = document.getElementById('joystick-base');
        if (!base) return;

        base.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            this.joystickTouchId = touch.identifier;
            const rect = base.getBoundingClientRect();
            this.joystickBaseX = rect.left + rect.width / 2;
            this.joystickBaseY = rect.top + rect.height / 2;
            this._moveJoystick(touch);
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            if (this.joystickTouchId === null) return;
            for (const touch of e.changedTouches) {
                if (touch.identifier === this.joystickTouchId) {
                    e.preventDefault();
                    this._moveJoystick(touch);
                    break;
                }
            }
        }, { passive: false });

        document.addEventListener('touchend', (e) => {
            for (const touch of e.changedTouches) {
                if (touch.identifier === this.joystickTouchId) {
                    this.joystickTouchId = null;
                    // Tüm hareket tuşlarını bırak
                    Keyboard['w'] = false;
                    Keyboard['a'] = false;
                    Keyboard['s'] = false;
                    Keyboard['d'] = false;
                    // Topuzu merkeze geri al
                    const knob = document.getElementById('joystick-knob');
                    if (knob) knob.style.transform = 'translate(-50%, -50%)';
                    break;
                }
            }
        }, { passive: false });
    },

    _moveJoystick(touch) {
        const dx = touch.clientX - this.joystickBaseX;
        const dy = touch.clientY - this.joystickBaseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = this.joystickRadius;
        const angle = Math.atan2(dy, dx);
        const clamp = Math.min(dist, maxDist);

        // Topuzu görsel olarak hareket ettir
        const knob = document.getElementById('joystick-knob');
        if (knob) {
            const kx = Math.cos(angle) * clamp;
            const ky = Math.sin(angle) * clamp;
            knob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;
        }

        // Yön eşiğini aşınca WASD tuşlarını simüle et
        const threshold = maxDist * 0.22;
        Keyboard['w'] = dy < -threshold;
        Keyboard['s'] = dy >  threshold;
        Keyboard['a'] = dx < -threshold;
        Keyboard['d'] = dx >  threshold;
    },

    // --- AKSİYON BUTONLARI ---
    setupActionButtons() {
        // Saldırı butonu — basılı tutulunca sürekli saldırı
        this._bindHold('btn-mob-attack',
            () => { Mouse.clicked = true;  if (window.SoundEngine) SoundEngine.init(); },
            () => { Mouse.clicked = false; }
        );

        // Etkileşim [E] — tek basış
        this._bindTap('btn-mob-e', () => {
            if (window.SoundEngine) SoundEngine.init();
            if (!window.GameEngine) return;
            if (GameEngine.state === 'playing') GameEngine.handleInteraction();
            else if (GameEngine.state === 'shop')   GameEngine.closeShop();
        });

        // Yetenek Q
        this._bindTap('btn-mob-q', () => {
            if (GameEngine?.state === 'playing' && GameEngine.player) {
                GameEngine.player.useSkillQ(GameEngine);
            }
        });

        // Yetenek R
        this._bindTap('btn-mob-r', () => {
            if (GameEngine?.state === 'playing' && GameEngine.player) {
                GameEngine.player.useSkillW(GameEngine);
            }
        });
    },

    // Basılı tut → start / end
    _bindHold(id, onStart, onEnd) {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); onStart(); }, { passive: false });
        btn.addEventListener('touchend',   (e) => { e.preventDefault(); onEnd();   }, { passive: false });
        btn.addEventListener('touchcancel',(e) => { e.preventDefault(); onEnd();   }, { passive: false });
    },

    // Tek dokunuş
    _bindTap(id, onTap) {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); onTap(); }, { passive: false });
    },

    // --- CANVAS DOKUNUŞu (Fare yönünü günceller) ---
    setupCanvasTouch() {
        const canvas = document.getElementById('game-canvas');
        if (!canvas) return;

        const updateMouse = (touch) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width  / rect.width;
            const scaleY = canvas.height / rect.height;
            Mouse.x = (touch.clientX - rect.left) * scaleX;
            Mouse.y = (touch.clientY - rect.top)  * scaleY;
        };

        // Canvas'a dokunulunca: fare konumunu güncelle + tek saldırı tetikle
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (window.SoundEngine) SoundEngine.init();
            if (e.touches.length > 0) {
                updateMouse(e.touches[0]);
                // Joystick'ten gelen dokunuşsa saldırı tetikleme
                if (e.touches[0].identifier !== this.joystickTouchId) {
                    Mouse.clicked = true;
                    setTimeout(() => { Mouse.clicked = false; }, 80);
                }
            }
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length > 0) updateMouse(e.touches[0]);
        }, { passive: false });
    }
};

// Oyun motoru yüklendikten sonra başlat
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => MobileControls.init(), 150);
    setTimeout(_applyMobileLayout, 200);
});

/*
 * iOS Safari tam ekran — en güvenilir yöntem:
 * body'nin kendisini position:fixed yaparak Safari'nin
 * toolbar/vh hesaplamalarını tamamen atlatırız.
 * wrapper içinde normal akışla tüm elemanlar body'yi doldurur.
 */
function _applyMobileLayout() {
    const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    if (!isTouch) return;

    /* innerWidth/Height DOM değişikliğinden önce oku */
    const w = window.innerWidth;
    const h = window.innerHeight;
    const isLandscape = w > h;

    const s  = (el, p, v) => el && el.style.setProperty(p, v, 'important');
    const rs = (el)        => { if (el) el.removeAttribute('style'); };

    const wrapper    = document.querySelector('.dashboard-wrapper');
    const header     = document.querySelector('.game-header');
    const bottomHUD  = document.querySelector('.horizontal-dashboard-bottom');
    const sidebar    = document.querySelector('.sidebar-combat-log-panel');
    const dashBody   = document.querySelector('.dashboard-body');
    const viewport   = document.querySelector('.game-viewport-container');
    const canvasWrap = document.querySelector('.canvas-wrapper');

    if (isLandscape) {
        /* 1. BODY'yi tam ekran yap (iOS Safari en güvenli yaklaşım) */
        s(document.documentElement, 'overflow', 'hidden');
        s(document.documentElement, 'height',   '100%');
        s(document.body, 'position', 'fixed');
        s(document.body, 'top',      '0');
        s(document.body, 'left',     '0');
        s(document.body, 'right',    '0');
        s(document.body, 'bottom',   '0');
        s(document.body, 'overflow', 'hidden');
        s(document.body, 'padding',  '0');
        s(document.body, 'margin',   '0');
        s(document.body, 'width',    '100%');
        s(document.body, 'height',   '100%');

        /* 2. Wrapper body'yi doldursun */
        s(wrapper, 'position',      'relative');
        s(wrapper, 'width',         '100%');
        s(wrapper, 'height',        '100%');
        s(wrapper, 'max-width',     'none');
        s(wrapper, 'max-height',    'none');
        s(wrapper, 'border-radius', '0');
        s(wrapper, 'border',        'none');
        s(wrapper, 'overflow',      'hidden');
        s(wrapper, 'padding',       '0');

        /* 3. Gereksiz UI elemanlarını gizle */
        s(header,    'display', 'none');
        s(bottomHUD, 'display', 'none');
        s(sidebar,   'display', 'none');

        /* 4. Dashboard body */
        s(dashBody, 'height',   '100%');
        s(dashBody, 'width',    '100%');
        s(dashBody, 'overflow', 'hidden');
        s(dashBody, 'min-height', '0');

        /* 5. Viewport */
        s(viewport, 'flex',     '1');
        s(viewport, 'width',    '100%');
        s(viewport, 'height',   '100%');
        s(viewport, 'padding',  '0');
        s(viewport, 'gap',      '0');
        s(viewport, 'overflow', 'hidden');

        /* 6. Canvas sarmalayıcı */
        s(canvasWrap, 'flex',          '1');
        s(canvasWrap, 'width',         '100%');
        s(canvasWrap, 'height',        '100%');
        s(canvasWrap, 'border',        'none');
        s(canvasWrap, 'border-radius', '0');
        s(canvasWrap, 'min-height',    '0');

        window.scrollTo(0, 0);

    } else {
        /* Dikey: inline stilleri temizle, CSS devralır */
        rs(document.documentElement);
        [document.body, wrapper, header, bottomHUD, sidebar, dashBody, viewport, canvasWrap]
            .forEach(rs);
    }
}

// Yön değişiminde 350ms bekle (iOS innerWidth/Height gecikmeli güncellenir)
window.addEventListener('orientationchange', () => {
    setTimeout(_applyMobileLayout, 350);
});

// Resize da tetikle (split view, klavye açılması vb. için)
window.addEventListener('resize', () => {
    setTimeout(_applyMobileLayout, 100);
});

window.MobileControls = MobileControls;
