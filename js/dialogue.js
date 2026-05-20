'use strict';
/**
 * PIXEL KNIGHT — Dialogue System
 * Canvas-drawn speech bubbles with typewriter effect.
 * Speakers: Sera (guide), Kârun (villain), rescued NPCs, bosses, narrator.
 */

const SPEAKERS = {
    SERA:     { name: 'SERA',    color: '#00f0ff', bg: 'rgba(0,18,36,0.97)',   border: '#00f0ff' },
    KARUN:    { name: 'KÂRUN',   color: '#cc44ff', bg: 'rgba(18,0,32,0.97)',   border: '#b026ff' },
    PEASANT:  { name: 'KÖYLÜ',   color: '#ffd700', bg: 'rgba(28,20,0,0.97)',   border: '#ffd700' },
    SOLDIER:  { name: 'ASKER',   color: '#ff7755', bg: 'rgba(32,8,0,0.97)',    border: '#ff6644' },
    MAGE_NPC: { name: 'BÜYÜCÜ',  color: '#bb88ff', bg: 'rgba(18,4,36,0.97)',   border: '#aa44ff' },
    MERCHANT: { name: 'TÜCCAR',  color: '#ffbb33', bg: 'rgba(28,18,0,0.97)',   border: '#ffaa00' },
    NARRATOR: { name: '· · ·',   color: '#bbbbbb', bg: 'rgba(4,4,14,0.97)',    border: '#555577' },
    BOSS:     { name: 'BOSS',    color: '#ff4444', bg: 'rgba(28,0,0,0.97)',    border: '#ff3333' },
};

const DIALOGUE_DATA = {

    zone_entry: {
        1: [
            { speaker: 'NARRATOR', text: 'Karanlık Zindan\'ın derinliklerine adım attın...' },
            { speaker: 'SERA',     text: 'Şövalye! Ben Sera\'yım — seninle yolculuk eden ruh rehberin. Bu zindanlar ölümcül, ama sen bir şeyler bulmak için buraya geldin.' },
            { speaker: 'SERA',     text: 'Kârun adında biri bu karanlıkları yönetiyor. Onun izini sürüyorum. Dikkatli ol ve karanlıktan korkma... henüz.' },
        ],
        2: [
            { speaker: 'NARRATOR', text: 'Gölge Mağarası. Işık buraya ulaşmayı çoktan bırakmış.' },
            { speaker: 'SERA',     text: 'Gözlerin görmediği yerde kulakların dinlesin. Düşmanlar seni duyduğunda sen de onları duymuş ol.' },
        ],
        3: [
            { speaker: 'NARRATOR', text: 'Goblin Yurdu. Bir çürüme kokusu havayı kaplıyor.' },
            { speaker: 'SERA',     text: 'Goblinler aptal değil, sadece vahşi. Onları küçümseme. Kârun onları örgütlemiş — yani liderlerini ara.' },
        ],
        4: [
            { speaker: 'NARRATOR', text: 'Alev Krallığı. Zemin sıcaklıktan titriyor.' },
            { speaker: 'SERA',     text: 'Kârun\'un izini burada çok daha güçlü hissedebiliyorum. Artık bizi izliyor olabilir.' },
            { speaker: 'KARUN',    text: '...Gidişatın beni eğlendiriyor, küçük şövalye. Devam et.' },
            { speaker: 'SERA',     text: 'O! Buraya bile ulaşmış. Şövalye, çok dikkatli ol.' },
        ],
        5: [
            { speaker: 'NARRATOR', text: 'Donmuş Tundra. Soğuk kemiklerine kadar işliyor.' },
            { speaker: 'SERA',     text: 'Burada bir zamanlar büyük bir imparatorluk vardı. Kârun her şeyi dondurdu. Kalıntılar arasında bir şey arıyor.' },
        ],
        6: [
            { speaker: 'NARRATOR', text: 'Orman Tapınağı. Eski güçlerin yattığı kutsal bir yer.' },
            { speaker: 'SERA',     text: 'Kârun buraya dokunmamalıydı. Bu topraklar binlerce yıldır korunuyor.' },
            { speaker: 'KARUN',    text: 'Kutsal mı? Hiçbir şey kutsal değil. Güçlü olan kalır, zayıf olan silinir.' },
            { speaker: 'SERA',     text: 'Onun sesini duydun mu? Aramızdaki mesafe azalıyor. Yakında yüz yüze geleceksin.' },
        ],
        7: [
            { speaker: 'NARRATOR', text: 'Şeytan Kalesi. Buradaki kurbanlar çığlık atmaktan vazgeçmiş.' },
            { speaker: 'SERA',     text: 'Şövalye... buradan sonra geri dönmek zorlaşıyor. Kararını ver. Devam edecek misin?' },
        ],
        8: [
            { speaker: 'NARRATOR', text: 'Gökyüzü Kalesi. Yere bakmaya cesaret edersen yüksekliği hissedersin.' },
            { speaker: 'KARUN',    text: 'Buraya kadar gelebildin... Seni beklenmedenden daha dayanıklı buluyorum.' },
            { speaker: 'SERA',     text: 'Kârun\'un merkezi bu bölgede bir yerde. Az kaldı. Hazır mısın?' },
        ],
        9: [
            { speaker: 'NARRATOR', text: 'Yokluk Alemi. Gerçeklik burada çözülüyor, sınırlar bulanık.' },
            { speaker: 'SERA',     text: 'Bu yer Kârun\'un gücüyle şekillendi. Buradaki hiçbir şey gerçek değil. Ama acı — acı gerçek.' },
            { speaker: 'KARUN',    text: 'Sonuna yaklaştın, şövalye. Bu bitişin mi, başlangıcın mı olduğunu henüz bilmiyorsun.' },
        ],
        10: [
            { speaker: 'NARRATOR', text: 'Ejder Yuvası. Tüm zindan bu noktada birleşiyor.' },
            { speaker: 'SERA',     text: 'Şövalye — bu son bölge. Kârun\'un kalesi burada. Hazırsan... hepsini bitir.' },
            { speaker: 'KARUN',    text: 'Sonunda geldin. Oyun sona eriyor. Ama kazananın kim olduğuna şimdi karar vereceğiz.' },
        ],
    },

    floor_specific: {
        3:  [{ speaker: 'SERA',     text: 'İlk esirleri gördün mü? Kârun\'un adamları masumları zincirlemiş. Onları kurtarırsan hem sen güçlenirsin hem de onlar.' }],
        7:  [{ speaker: 'SERA',     text: 'Dikkat! Boss yaklaşıyor. Her bölgenin sonunda Kârun bir muhafız bırakmış. Hazırlıklı ol!' }],
        15: [{ speaker: 'KARUN',    text: 'İkinci bölgeyi de geçtin. Neden bu kadar inat ediyor bu şövalye?' }],
        18: [{ speaker: 'SERA',     text: 'Gölge Mağarası\'nın derinliklerinde garip bir enerji hissediyorum. Kârun bir şey gizliyor burada.' }],
        25: [{ speaker: 'KARUN',    text: 'Üç bölge... Belki seni hafife aldım. Dördüncüsünde ne bulacağını gör bakalım.' }],
        28: [{ speaker: 'SERA',     text: 'Alev Krallığı\'nın sonu yaklaşıyor. İçindeki soğukluğu koru, ateş seni yenemez.' }],
        35: [{ speaker: 'SERA',     text: 'Yarı yoldasın! Bu zindan seni değiştiriyor. Ben bunu fark ediyorum.' }],
        38: [{ speaker: 'KARUN',    text: 'Yorulmadın mı? Ben yoruldum seni izlemekten. Artık ciddiye alıyorum.' }],
        47: [{ speaker: 'SERA',     text: 'Şövalye — bir sırrı sana söylemeliyim. Kârun ile aramda geçmişte bir bağ var. Sonunda anlayacaksın.' }],
        53: [{ speaker: 'KARUN',    text: 'Sera sana bir şey mi söyledi? Her şeyi bildiğini sanıyor. Ama benim hikayemi tam bilmiyor.' }],
        58: [{ speaker: 'SERA',     text: 'Orman Tapınağı\'nın kutsal taşları... bir zamanlar benim de gücümün kaynağıydı. Kârun onları kırdı.' }],
        65: [{ speaker: 'NARRATOR', text: 'Şeytan Kalesi\'nin duvarlarında kanla yazılmış isimler var. Bunlar Kârun\'un kurbanları.' }],
        68: [{ speaker: 'KARUN',    text: 'Bu isimleri okuyorsan bil: Hepsi güçsüz olduğu için orada. Güçlü olanlar hayatta kalır.' }],
        73: [{ speaker: 'SERA',     text: 'Sekizinci bölge. Şövalye — şimdiye kadar ne öğrendin? Güç mü, merhamet mi daha değerli?' }],
        77: [{ speaker: 'KARUN',    text: 'Sera\'nın fısıldamalarını dinleyip dinlemediğini merak ediyorum. O naif biridir.' }],
        87: [{ speaker: 'SERA',     text: 'Şövalye! Neredeyse bitti. Ama son bölgede Kârun\'un en güçlü varlıkları bekleniyor.' }],
        89: [{ speaker: 'KARUN',    text: 'Son bölgeye yaklaşıyorsun. Seninle konuşacağım şeyler var. Kişisel şeyler.' }],
        95: [{ speaker: 'SERA',     text: 'Kârun\'un sarayı yakın. Ne olursa olsun — bugün bu zindan biter.' }],
        98: [{ speaker: 'KARUN',    text: 'Ejder Yuvası\'na girdin. İyi. Son muhafızlarım seninle ilgilenecek. Ben bekliyorum.' }],
    },

    boss_pre: {
        1:  [
            { speaker: 'NARRATOR', text: 'Karanlık bir varlık önünü kesiyor...' },
            { speaker: 'SERA',     text: 'Kârun\'un birinci muhafızı! Dikkatli ol — zayıf noktasını bul ve var gücünle savaş!' },
        ],
        2:  [
            { speaker: 'NARRATOR', text: 'Gölgelerden dev bir figür şekilleniyor...' },
            { speaker: 'SERA',     text: 'Gölge Muhafızı! Bu varlık ışığı soğuruyor. Hızlı ol, ya o ya sen!' },
        ],
        3:  [
            { speaker: 'KARUN',    text: 'Goblin Klanı\'nın en güçlüsünü seninle tanıştırayım...' },
            { speaker: 'SERA',     text: 'Hazır mısın? Bu sadece başlangıç, şövalye!' },
        ],
        4:  [
            { speaker: 'KARUN',    text: 'Alev Tanrısı\'nı serbest bıraktım. Umarım serinleyebilirsin...' },
            { speaker: 'SERA',     text: 'Ateşten korkma! İçindeki gücü hatırla!' },
        ],
        5:  [
            { speaker: 'NARRATOR', text: 'Tundra\'nın sonsuz buzundan doğmuş bir yaratık...' },
            { speaker: 'SERA',     text: 'Soğuk sizi dondurmadan önce onu devir! Hızlı hareket et!' },
        ],
        6:  [
            { speaker: 'KARUN',    text: 'Orman\'ın ruhunu benim için çalışmaya zorladım. Şimdi onu serbest bırakıyorum — üzerine.' },
            { speaker: 'SERA',     text: 'Orman ruhu! Kârun onu yozlaştırmış. Kurtarabilmek için onu yenmek zorundayız.' },
        ],
        7:  [
            { speaker: 'KARUN',    text: 'Şeytan Kalesi\'nin efendisini hatırlatmak için... İşte o geliyor.' },
            { speaker: 'SERA',     text: 'Tüm gücünü ver! Bu ana kadar hayatta kaldın — bu savaşı da kazanacaksın!' },
        ],
        8:  [
            { speaker: 'KARUN',    text: 'Gökyüzü\'nün efendisi artık benim hizmetimde.' },
            { speaker: 'SERA',     text: 'Sonuna yaklaştık, şövalye. Bu savaşı kazan — neredeyse bitti!' },
        ],
        9:  [
            { speaker: 'KARUN',    text: 'Yokluk Alemi\'nin muhafızı. Varolmayan bir varlık. Bunu öldürebilir misin?' },
            { speaker: 'SERA',     text: 'Gerçek olmayan şeyler yine de acı verebilir. Çok dikkatli ol!' },
        ],
        10: [
            { speaker: 'KARUN',    text: 'Son olarak... Ejder. Hepsinin anası. Seni bekliyor.' },
            { speaker: 'SERA',     text: 'Şövalye — bu son savaş. Tüm gücünü topla. Ben her zaman seninleydim.' },
        ],
    },

    boss_post: {
        1:  [{ speaker: 'SERA',  text: 'Birinci muhafızı yendin! Zindan titredi. Kârun bunu hissetti.' }],
        2:  [{ speaker: 'SERA',  text: 'Gölge Muhafızı düştü! Her engeli aşıyorsun. Kârun\'u merak etmeye başladım.' }],
        3:  [
            { speaker: 'KARUN', text: '...Güçlüsün. Beklenmedik.' },
            { speaker: 'SERA',  text: 'Kârun\'un sesi değişti. Artık seni hafife almıyor!' },
        ],
        4:  [{ speaker: 'SERA',  text: 'Alev Tanrısı yenildi! Dördüncü bölge sona eriyor. Kârun endişeleniyor.' }],
        5:  [{ speaker: 'KARUN', text: 'Beşinci bölgeyi de geçtin. Başlamadan bitmeyeceğini anlıyorum artık.' }],
        6:  [{ speaker: 'SERA',  text: 'Orman ruhu kurtarıldı! Sen gerçek bir şövalye gibi davranıyorsun.' }],
        7:  [{ speaker: 'KARUN', text: 'Yedinci muhafızım da düştü. Sana saygım arttı. Ama bu bir şeyi değiştirmiyor.' }],
        8:  [{ speaker: 'SERA',  text: 'İki bölge daha! Şövalye — sen bunu yapabilirsin, buna inanıyorum.' }],
        9:  [{ speaker: 'KARUN', text: 'Dokuz muhafızım yenildi. Şimdi ben seni bekliyorum. Gel.' }],
    },

    npc_rescue: {
        peasant: [
            [
                { speaker: 'PEASANT', text: 'Tanrım! Kurtarıldım! Seni tüm ömrüm boyunca hayırlayacağım, şövalye!' },
                { speaker: 'PEASANT', text: 'Bu küçük altınlarım ama hepsini sana verdim. Umarım işine yarar.' },
            ],
            [
                { speaker: 'PEASANT', text: 'Canımı kurtardın! Bu canavarlar köyümü yaktı, ailemi kaçırdı...' },
                { speaker: 'SERA',    text: 'Bu Kârun\'un işi. Masumları tutsak ederek gücünü pekiştiriyor.' },
                { speaker: 'PEASANT', text: 'Altınlarım senin olsun, şövalye. Git ve bu karanlığı bitir.' },
            ],
        ],
        soldier: [
            [
                { speaker: 'SOLDIER', text: 'Asker olarak savaştım ama bu zindanlarda beni geçtiler.' },
                { speaker: 'SOLDIER', text: 'Al bu bilgiyi: Düşmanların zayıf noktasına vur, ön cepheye körü körüne girme. Sana savaş sırrımı veriyorum.' },
            ],
            [
                { speaker: 'SOLDIER', text: 'Kurtarıldım! On yıl orduda savaştım. O deneyimi sana aktarayım en azından.' },
                { speaker: 'SERA',    text: 'Kârun bir zamanlar bu askerlerin komutanıydı. Onları tutsak etmesi ihanet.' },
                { speaker: 'SOLDIER', text: 'Git ve onu yak, şövalye. Biz seni bekliyoruz.' },
            ],
        ],
        mage: [
            [
                { speaker: 'MAGE_NPC', text: 'Ah... nihayet! Büyülerim bu zindan duvarlarında soldu.' },
                { speaker: 'MAGE_NPC', text: 'Ama sana hayat enerjisi verebilirim. Büyüm zayıf ama kalbim güçlü.' },
            ],
            [
                { speaker: 'MAGE_NPC', text: 'Şövalye! Kârun\'un büyücüleri beni tutsak etti.' },
                { speaker: 'SERA',     text: 'Bir meslektaşım! Kârun çok sayıda büyücüyü esir almış.' },
                { speaker: 'MAGE_NPC', text: 'Bu şükranımı kabul et. Git ve Kârun\'u durdur — onun büyüsü beni zayıf bıraktı.' },
            ],
        ],
        merchant: [
            [
                { speaker: 'MERCHANT', text: 'Şövalye! Büyük bedel ödeyebilirdim ama kaçış yolu yoktu.' },
                { speaker: 'MERCHANT', text: 'Hazinemin bir kısmı burada. Al — iyi bir yatırıma dönüşsün!' },
            ],
            [
                { speaker: 'MERCHANT', text: 'Kurtuluşumu anlatamazsam bile cüzdanım konuşur.' },
                { speaker: 'MERCHANT', text: 'Ticaret hayatım boyunca öğrendim: İyilik dönüp gelir. Bu altınlar senin.' },
            ],
        ],
    },

    events: {
        first_kill:       [{ speaker: 'SERA',     text: 'İlk düşmanını yendin. Bir adım daha. Zindan seni test ediyor.' }],
        first_chest:      [{ speaker: 'SERA',     text: 'İlk sandık! Kârun\'un bıraktığı artıklar bazen işe yarar.' }],
        low_hp:           [{ speaker: 'SERA',     text: 'Dikkat! Çok hasar aldın. Hemen bir iyileşme kaynağı ara!' }],
        critical_hp:      [{ speaker: 'SERA',     text: 'ŞÖVALYE! Neredeyse ölüyorsun! Geri çekil, hemen!' }],
        level_up_5:       [{ speaker: 'SERA',     text: 'Seviye 5! Giderek daha tehlikeli bir düşman oluyorsun, Kârun için.' }],
        level_up_10:      [{ speaker: 'SERA',     text: 'Seviye 10! Zindan seni büyüttü. Ben bunu fark ediyorum.' }],
        idle_too_long:    [{ speaker: 'SERA',     text: 'Duruyorsun... Savaşmak zor, ama zindan seni beklemez.' }],
        first_boss_kill:  [{ speaker: 'SERA',     text: 'İlk Boss yenildi! Kârun\'un kalesi çatlamaya başladı.' }],
        first_npc_rescue: [{ speaker: 'SERA',     text: 'Bir tutsağı kurtardın! Kârun güçlünün kazandığını söyler — ama merhamet de bir güçtür.' }],
        many_rescues:     [{ speaker: 'SERA',     text: 'Beş kişiyi kurtardın! Şövalye — sen gerçekten bir kahraman oluyorsun.' }],
    },
};

// ─────────────────────────────────────────────
const DialogSystem = {
    _lines: [],       // pending line objects
    _current: null,   // currently displayed line
    _charIdx: 0,      // chars revealed so far
    _charTimer: 0,    // ms accumulator for typewriter
    _autoTimer: 0,    // ms accumulator for auto-advance
    _triggered: {},   // keys already triggered this run
    _evtCooldown: {}, // event name → last triggered timestamp

    CHAR_DELAY:   26,   // ms per character
    AUTO_DELAY:  2400,  // ms before auto-advancing

    isActive() { return this._current !== null; },

    reset() {
        this._lines      = [];
        this._current    = null;
        this._charIdx    = 0;
        this._charTimer  = 0;
        this._autoTimer  = 0;
        this._triggered  = {};
        this._evtCooldown = {};
    },

    // Called when player presses E during dialogue
    advance() {
        if (!this._current) return false;
        const full = this._current.text;
        if (this._charIdx < full.length) {
            // Reveal all text instantly
            this._charIdx = full.length;
            this._charTimer = 0;
            this._autoTimer = 0;
        } else {
            this._showNext();
        }
        return true; // consumed the E press
    },

    _showNext() {
        if (this._lines.length === 0) {
            this._current = null;
            return;
        }
        this._current  = this._lines.shift();
        this._charIdx  = 0;
        this._charTimer = 0;
        this._autoTimer = 0;
    },

    _enqueue(lines, auto) {
        lines.forEach(l => this._lines.push({ speaker: l.speaker, text: l.text, auto: !!auto }));
        if (!this._current) this._showNext();
    },

    update(dt) {
        if (!this._current) return;
        const ms = dt * 1000;
        const full = this._current.text;

        if (this._charIdx < full.length) {
            this._charTimer += ms;
            while (this._charTimer >= this.CHAR_DELAY && this._charIdx < full.length) {
                this._charTimer -= this.CHAR_DELAY;
                this._charIdx++;
            }
        } else if (this._current.auto) {
            this._autoTimer += ms;
            if (this._autoTimer >= this.AUTO_DELAY) this._showNext();
        }
    },

    draw(ctx) {
        if (!this._current) return;

        const sp   = SPEAKERS[this._current.speaker] || SPEAKERS.NARRATOR;
        const full = this._current.text;
        const disp = full.substring(0, this._charIdx);
        const done = this._charIdx >= full.length;

        const W = ctx.canvas.width;
        const H = ctx.canvas.height;
        const BW = W - 14;
        const BH = 102;
        const BX = 7;
        const BY = H - BH - 7;

        ctx.save();

        // Drop-shadow
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur  = 10;

        // Main box
        ctx.globalAlpha = 0.97;
        ctx.fillStyle   = sp.bg;
        ctx.strokeStyle = sp.border;
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.roundRect(BX, BY, BW, BH, 7);
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;

        // Colored left-side accent bar
        ctx.fillStyle   = sp.border;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.roundRect(BX, BY + 14, 3, BH - 28, 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Speaker name tag (above box top-left)
        const NTW = 96, NTH = 18;
        ctx.fillStyle   = sp.border;
        ctx.globalAlpha = 0.92;
        ctx.beginPath();
        ctx.roundRect(BX + 10, BY - NTH + 3, NTW, NTH, 4);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.font      = "7px 'Press Start 2P'";
        ctx.fillStyle = '#000';
        ctx.textAlign = 'left';
        ctx.fillText(sp.name, BX + 16, BY - 2);

        // Dialogue text
        ctx.font      = "7px 'Press Start 2P'";
        ctx.fillStyle = '#e4e4e4';
        ctx.textAlign = 'left';
        this._wrapText(ctx, disp, BX + 14, BY + 24, BW - 24, 14, 4);

        // [E] DEVAM prompt — blinks when text finished and not auto-advance
        if (done && !this._current.auto) {
            const blink = Math.floor(Date.now() / 420) % 2 === 0;
            if (blink) {
                ctx.font      = "6px 'Press Start 2P'";
                ctx.fillStyle = sp.color;
                ctx.textAlign = 'right';
                ctx.fillText('[E] DEVAM', BX + BW - 10, BY + BH - 9);
            }
        }

        // Typing cursor
        if (!done) {
            const blink = Math.floor(Date.now() / 300) % 2 === 0;
            if (blink) {
                ctx.font      = "7px 'Press Start 2P'";
                ctx.fillStyle = sp.color;
                ctx.textAlign = 'left';
                ctx.fillText('▌', BX + 14 + ctx.measureText(this._lastLineText(disp, BW - 24)).width, BY + 24 + 14 * this._lineCount(ctx, disp, BW - 24, 4));
            }
        }

        ctx.restore();
    },

    _wrapText(ctx, text, x, y, maxW, lineH, maxLines) {
        const words = text.split(' ');
        let line = '', lc = 0;
        for (let i = 0; i < words.length; i++) {
            const test = line ? line + ' ' + words[i] : words[i];
            if (ctx.measureText(test).width > maxW && line) {
                ctx.fillText(line, x, y + lc * lineH);
                lc++;
                if (lc >= maxLines) return;
                line = words[i];
            } else {
                line = test;
            }
        }
        if (lc < maxLines && line) ctx.fillText(line, x, y + lc * lineH);
    },

    _lineCount(ctx, text, maxW, maxLines) {
        const words = text.split(' ');
        let line = '', lc = 0;
        for (let i = 0; i < words.length; i++) {
            const test = line ? line + ' ' + words[i] : words[i];
            if (ctx.measureText(test).width > maxW && line) {
                lc++;
                if (lc >= maxLines) return lc;
                line = words[i];
            } else {
                line = test;
            }
        }
        return lc;
    },

    _lastLineText(text, maxW) {
        // approximate — just return last 10 chars for cursor positioning
        const words = text.split(' ');
        let line = '';
        for (const w of words) {
            const test = line ? line + ' ' + w : w;
            line = test;
        }
        return line;
    },

    // ── Public trigger methods ──────────────────

    triggerZoneEntry(zone) {
        const key = 'ze_' + zone;
        if (this._triggered[key]) return;
        this._triggered[key] = true;
        const lines = DIALOGUE_DATA.zone_entry[zone];
        if (lines) this._enqueue(lines, false);
    },

    triggerFloor(floor) {
        const key = 'fl_' + floor;
        if (this._triggered[key]) return;
        this._triggered[key] = true;
        const lines = DIALOGUE_DATA.floor_specific[floor];
        if (lines) this._enqueue(lines, true);
    },

    triggerBossPre(zone) {
        const key = 'bp_' + zone;
        if (this._triggered[key]) return;
        this._triggered[key] = true;
        const lines = DIALOGUE_DATA.boss_pre[zone];
        if (lines) this._enqueue(lines, false);
    },

    triggerBossPost(zone) {
        const key = 'bpo_' + zone;
        if (this._triggered[key]) return;
        this._triggered[key] = true;
        const lines = DIALOGUE_DATA.boss_post[zone];
        if (lines) this._enqueue(lines, true);
    },

    triggerNPC(npcType) {
        const rescues = parseInt(localStorage.getItem('pk_rescues') || '0');
        const variants = DIALOGUE_DATA.npc_rescue[npcType];
        if (!variants) return;
        const lines = variants[rescues % variants.length];
        if (lines) this._enqueue(lines, false);
    },

    triggerEvent(key) {
        const now  = Date.now();
        const COOL = 22000; // ms between same event
        if (this._evtCooldown[key] && now - this._evtCooldown[key] < COOL) return;
        const lines = DIALOGUE_DATA.events[key];
        if (!lines) return;
        this._evtCooldown[key] = now;
        this._enqueue(lines, true);
    },
};

window.DialogSystem = DialogSystem;
window.SPEAKERS     = SPEAKERS;
