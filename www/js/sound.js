/**
 * ==========================================================================
 * PIXEL KNIGHT - WEB AUDIO RETRO SYNTHESIZER ENGINE
 * ==========================================================================
 * Bu dosya, harici hiçbir .mp3/.wav dosyasına ihtiyaç duymadan,
 * tarayıcının Web Audio API'sini kullanarak gerçek zamanlı 8-bit ses üretir.
 */

const SoundEngine = {
    ctx: null,
    masterGain: null,
    musicInterval: null,
    _combatInterval: null,
    _combatMode: false,
    isMuted: true, // Varsayılan olarak tarayıcı politikaları nedeniyle sessiz başlar
    musicPlaying: false,

    // Ritim ve nota dizilimleri (Cozy Retro RPG melodisi: Am - F - C - G)
    notes: {
        'A3': 220.00, 'B3': 246.94, 'C4': 261.63, 'D4': 293.66, 
        'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00,
        'B4': 493.88, 'C5': 523.25, 'D5': 587.33, 'E5': 659.25,
        'F5': 698.46, 'G5': 783.99, 'A5': 880.00
    },

    // Ses motorunu başlat (İlk kullanıcı etkileşiminde tetiklenir)
    init() {
        if (this.ctx) return;
        
        try {
            // Web Audio Bağlamını oluştur
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            
            // Ana ses kontrol düğümü (Master Gain)
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);
            
            // Başlangıç sesi seviyesi (%15 çok kafa şişirmemesi için)
            this.masterGain.gain.setValueAtTime(0.15, this.ctx.currentTime);
            
            console.log("%c[Sound Engine] Web Audio API Başlatıldı.", "color: #b026ff; font-weight: bold;");
        } catch (e) {
            console.warn("Web Audio API tarayıcınızda desteklenmiyor.", e);
        }
    },

    // Genel Ses Açma/Kapama
    toggleMute() {
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        this.isMuted = !this.isMuted;
        
        const btn = document.getElementById('btn-sound');
        if (btn) {
            if (this.isMuted) {
                btn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
                btn.style.color = 'var(--text-secondary)';
                btn.style.borderColor = 'rgba(255,255,255,0.08)';
                btn.style.boxShadow = 'none';
                this.stopMusic();
            } else {
                btn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
                btn.style.color = 'var(--neon-green)';
                btn.style.borderColor = 'var(--neon-green)';
                btn.style.boxShadow = '0 0 10px rgba(57, 255, 20, 0.3)';
                this.playMusic();
            }
        }
    },

    // --- SFX: SES EFEKTLERİ ---
    
    // 1. Kılıç Savurma (Sword Swing) - Triangle dalgası ile frekans düşüşü
    playSwing() {
        if (this.isMuted || !this.ctx) return;
        this.init();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(450, this.ctx.currentTime);
        // Frekansı hızla düşür (woosh hissi)
        osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.12);

        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.12);
    },

    // 2. Canavara Vurma (Hit Enemy) - Kısa gürültülü kare dalga decay
    playHit() {
        if (this.isMuted || !this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    },

    // 3. Oyuncunun Hasar Alması (Player Hurt) - Boğuk bas gürültüsü
    playPlayerHurt() {
        if (this.isMuted || !this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(30, this.ctx.currentTime + 0.25);

        gain.gain.setValueAtTime(0.6, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.25);
    },

    // 4. Altın Toplama (Coin Collect) - İki hızlı tonda klasik retro çınlama
    playCoin() {
        if (this.isMuted || !this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        // B5 notası (987Hz), ardından hemen E6 notası (1318Hz)
        osc.frequency.setValueAtTime(987.77, now);
        osc.frequency.setValueAtTime(1318.51, now + 0.08);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.08);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.25);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(now + 0.25);
    },

    // 5. Sandık Açma (Chest Open) - Yükselen retro arpej
    playChestOpen() {
        if (this.isMuted || !this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        
        // Hızlıca yükselen C4 - E4 - G4 - C5 arpeji
        osc.frequency.setValueAtTime(261.63, now);
        osc.frequency.setValueAtTime(329.63, now + 0.06);
        osc.frequency.setValueAtTime(392.00, now + 0.12);
        osc.frequency.setValueAtTime(523.25, now + 0.18);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.18);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.35);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(now + 0.35);
    },

    // 6. Seviye Atlama (Level Up Fanfare) - Şanlı retro zafer melodisi!
    playLevelUp() {
        if (this.isMuted || !this.ctx) return;

        const now = this.ctx.currentTime;
        const notesList = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4'ten C6'ya arpej
        
        notesList.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);

            const duration = idx === notesList.length - 1 ? 0.4 : 0.08;
            gain.gain.setValueAtTime(0.2, now + idx * 0.08);
            gain.gain.linearRampToValueAtTime(0.01, now + idx * 0.08 + duration);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + duration);
        });
    },

    // 7. Portal Geçişi (Portal Teleport) - Uzaysal phaser frekans dalgalanması
    playPortal() {
        if (this.isMuted || !this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, now);
        // Hızlı bir sarmal yükseliş
        osc.frequency.exponentialRampToValueAtTime(2000, now + 0.8);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.4);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.8);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(now + 0.8);
    },

    // 8. Ölüm (Player Death) - Hüzünlü alçalan melodi
    playDeath() {
        if (this.isMuted || !this.ctx) return;

        const now = this.ctx.currentTime;
        const freqs = [392.00, 311.13, 261.63, 196.00]; // G4 - Eb4 - C4 - G3
        
        freqs.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.2);

            gain.gain.setValueAtTime(0.35, now + idx * 0.2);
            gain.gain.linearRampToValueAtTime(0.01, now + idx * 0.2 + 0.22);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now + idx * 0.2);
            osc.stop(now + idx * 0.2 + 0.22);
        });
    },

    // 9. Atılma (Dash Whoosh) - Triangle dalgası ile süper hızlı frekans kayması
    playDash() {
        if (this.isMuted || !this.ctx) return;
        this.init();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    },

    // 10. Satın Alma (Shop Purchase Chime) - Üç neşeli tiz harmonik nota
    playBuy() {
        if (this.isMuted || !this.ctx) return;
        this.init();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(783.99, now + 0.08); // G5
        osc.frequency.setValueAtTime(1046.50, now + 0.16); // C6

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.16);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(now + 0.3);
    },

    // 11. Boss Kükremesi (Boss Roar) - Derin bas kükremesi ve deprem etkisi
    playBossRoar() {
        if (this.isMuted || !this.ctx) return;
        this.init();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(75, now);
        osc.frequency.linearRampToValueAtTime(45, now + 0.50);

        gain.gain.setValueAtTime(0.6, now);
        gain.gain.linearRampToValueAtTime(0.6, now + 0.40);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.60);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(now + 0.60);
    },

    // 12. Boss Darbesi (Boss Slam) - Tok bas şok dalgası patlaması
    playBossSlap() {
        if (this.isMuted || !this.ctx) return;
        this.init();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.linearRampToValueAtTime(20, now + 0.45);

        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(now + 0.45);
    },

    // 13. Düşman Saldırısı (Enemy Attack) - Agresif bas darbesi
    playEnemyAttack() {
        if (this.isMuted || !this.ctx) return;
        this.init();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(55, this.ctx.currentTime + 0.10);

        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.10);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.10);
    },

    // 14. Yanma Debuff (Burn) - Sıcak ve keskin tiz crackle
    playBurn() {
        if (this.isMuted || !this.ctx) return;
        this.init();

        const now = this.ctx.currentTime;
        // Kısa ve sert bir alev sesi (frekans spike)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.08);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(now + 0.08);
    },

    // 15. Zehir Debuff (Poison) - Derin ve rahatsız edici bubble sesi
    playPoison() {
        if (this.isMuted || !this.ctx) return;
        this.init();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.linearRampToValueAtTime(85, now + 0.18);

        gain.gain.setValueAtTime(0.14, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.18);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(now + 0.18);
    },

    // 16. Yavaşlama Debuff (Slow) - Uğultulu alçalan ton
    playSlow() {
        if (this.isMuted || !this.ctx) return;
        this.init();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.30);

        gain.gain.setValueAtTime(0.10, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.30);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(now + 0.30);
    },

    // --- BGM: ARKA PLAN MÜZİĞİ ---
    
    // Prosedürel 8-Bit Retro Müzik Motoru (Loops)
    playMusic() {
        if (this.isMuted || this.musicPlaying || !this.ctx) return;
        this.musicPlaying = true;

        let beat = 0;
        
        // Akorlar (Bassline Frekansları)
        // Am (A-C-E), F (F-A-C), C (C-E-G), G (G-B-D)
        const basslines = [
            ['A2', 'A2', 'E3', 'A2', 'A2', 'E3', 'A2', 'B2'],
            ['F2', 'F2', 'C3', 'F2', 'F2', 'C3', 'F2', 'G2'],
            ['C2', 'C2', 'G2', 'C2', 'C2', 'G2', 'C2', 'D2'],
            ['G2', 'G2', 'D3', 'G2', 'G2', 'D3', 'G2', 'G3']
        ];

        // Melodi Notaları
        const melody = [
            'E4', 'G4', 'A4', null, 'A4', 'B4', 'C5', null,
            'C5', 'D5', 'E5', null, 'D5', 'C5', 'B4', 'G4',
            'A4', null, 'E4', 'G4', 'A4', null, 'C5', 'B4',
            'A4', 'G4', 'E4', 'G4', 'A4', null, null, null
        ];

        const playNote = (freq, duration, type = 'triangle', volume = 0.04) => {
            if (!this.ctx || this.isMuted) return;
            
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            
            gain.gain.setValueAtTime(volume, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + duration - 0.02);
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        };

        const getFreq = (noteStr) => {
            if (!noteStr) return 0;
            // E2, A2 vb. düşük oktav frekans hesaplama
            const baseNotes = { 'C': 16.35, 'D': 18.35, 'E': 20.60, 'F': 21.83, 'G': 24.50, 'A': 27.50, 'B': 30.87 };
            const char = noteStr[0];
            const octave = parseInt(noteStr[1]);
            return baseNotes[char] * Math.pow(2, octave);
        };

        // 130 BPM temposunda (her nota vuruşu ~230ms)
        this.musicInterval = setInterval(() => {
            if (this.isMuted) return;

            const chordIdx = Math.floor((beat % 32) / 8);
            const bassNoteStr = basslines[chordIdx][beat % 8];
            const bassFreq = getFreq(bassNoteStr);

            // 1. Bas Ritm (Kare Dalga - Tok Bas Ritim)
            if (bassFreq > 0) {
                playNote(bassFreq, 0.2, 'triangle', 0.08);
            }

            // 2. Tiz Melodi (Sine veya Triangle - Tatlı Melodi)
            const melodyNoteStr = melody[beat % 32];
            if (melodyNoteStr) {
                const melodyFreq = this.notes[melodyNoteStr];
                if (melodyFreq) {
                    playNote(melodyFreq, 0.22, 'sine', 0.06);
                }
            }

            beat++;
        }, 230);
    },

    stopMusic() {
        if (this.musicInterval) {
            clearInterval(this.musicInterval);
            this.musicInterval = null;
        }
        if (this._combatInterval) {
            clearInterval(this._combatInterval);
            this._combatInterval = null;
        }
        this.musicPlaying = false;
        this._combatMode = false;
    },

    // Dinamik müzik: savaş modunda hi-hat perküsyon katmanı ekler
    setCombatMode(active) {
        if (active === this._combatMode) return;
        this._combatMode = active;

        if (active) {
            // Hi-hat + hız artışı efekti
            if (this._combatInterval) clearInterval(this._combatInterval);
            this._combatInterval = setInterval(() => {
                if (this.isMuted || !this._combatMode || !this.ctx) return;
                const buf = this.ctx.createBuffer(1, 512, this.ctx.sampleRate);
                const data = buf.getChannelData(0);
                for (let i = 0; i < 512; i++) data[i] = (Math.random() * 2 - 1);
                const src = this.ctx.createBufferSource();
                const gain = this.ctx.createGain();
                src.buffer = buf;
                gain.gain.setValueAtTime(0.012, this.ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.03);
                src.connect(gain);
                gain.connect(this.masterGain);
                src.start();
                src.stop(this.ctx.currentTime + 0.03);
            }, 115);
        } else {
            if (this._combatInterval) {
                clearInterval(this._combatInterval);
                this._combatInterval = null;
            }
        }
    }
};

// Ses butonunu sayfada dinle
window.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btn-sound');
    if (btn) {
        btn.addEventListener('click', () => {
            SoundEngine.toggleMute();
        });
    }
});
