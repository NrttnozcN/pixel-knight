/**
 * ==========================================================================
 * EREVORN - PROCEDURAL SPRITE GENERATOR & CACHE SYSTEM
 * ==========================================================================
 * Bu dosya, harici görsellere ihtiyaç duymadan, piksel matrislerini tarayıcı
 * belleğinde Canvas nesnelerine dönüştürerek oyunun tüm grafiklerini oluşturur.
 */

const SpriteEngine = {
    // Önbelleğe alınmış canvas varlıkları (prosedürel matrisler)
    cache: {},

    // PNG sprite sheet önbelleği — dış sheet'ler varsa matristen önce kullanılır
    pngCache: {},

    // Çok kareli sprite isimlerini takip eder (prosedürel sallanmayı azaltmak için)
    multiFrameSprites: new Set(),

    // Tek bir sprite sheet PNG'sini yükle ve karelere böl.
    // Tek-kare PNG de kabul edilir: görsel genişliği < frameW*2 ise tüm kareler
    // o tek görsel üzerinden üretilir (idle2 = idle1 kopyası gibi).
    // config: { src, frameW, frameH, frames: ['key1','key2',...], frameCount }
    loadSheet(config) {
        return new Promise((resolve) => {
            const img = new Image();
            console.log('[Sprite Engine] Loading sheet from:', config.src);
            img.onload = () => {
                console.log('[Sprite Engine] Successfully loaded:', config.src);
                
                // Debug log edge pixels
                try {
                    const c_test = document.createElement('canvas');
                    c_test.width = img.naturalWidth;
                    c_test.height = img.naturalHeight;
                    const ctx_test = c_test.getContext('2d');
                    ctx_test.drawImage(img, 0, 0);
                    const imgData = ctx_test.getImageData(0, 0, c_test.width, c_test.height);
                    const d = imgData.data;
                    let r=0, g=0, b=0, a=0, count=0;
                    const w = c_test.width;
                    const h = c_test.height;
                    for (let x=0; x<w; x++) {
                        let i=(0*w+x)*4; r+=d[i]; g+=d[i+1]; b+=d[i+2]; a+=d[i+3]; count++;
                        i=((h-1)*w+x)*4; r+=d[i]; g+=d[i+1]; b+=d[i+2]; a+=d[i+3]; count++;
                    }
                    console.log(`[TEST] Image ${config.src} edge color: R=${Math.round(r/count)}, G=${Math.round(g/count)}, B=${Math.round(b/count)}, A=${Math.round(a/count)}`);
                } catch(e) {
                    console.error('Debug log failed:', e);
                }
                
                let actualCount;
                if (config.frameCount) {
                    actualCount = config.frameCount;
                } else if (config.frames && config.frames.length > 1) {
                    actualCount = config.frames.length;
                } else {
                    const expectedFrameW = img.naturalHeight * (config.frameW / config.frameH);
                    actualCount = Math.max(1, Math.min(20, Math.round(img.naturalWidth / expectedFrameW)));
                }

                let srcW, srcH;
                if (config.gridCols) {
                    const gridRows = Math.ceil(actualCount / config.gridCols);
                    srcW = img.naturalWidth  / config.gridCols;
                    srcH = img.naturalHeight / gridRows;
                } else {
                    srcW = img.naturalWidth / actualCount;
                    srcH = img.naturalHeight;
                }

                const targetH = 256;
                const targetW = Math.round(targetH * (config.frameW / config.frameH));

                const isMulti = (actualCount > 1);

                config.frames.forEach((key, i) => {
                    if (isMulti) {
                        this.multiFrameSprites.add(key);
                        this.multiFrameSprites.add(key + '_flipped');
                    }

                    // frameMap/cropRects varsa animasyon isimlerini atlas içindeki belirli karelere bağla.
                    // Yoksa mevcut kare sayısından fazlasını istiyorsa son kareyi tekrar kullan.
                    const mappedFrame = Array.isArray(config.frameMap) ? config.frameMap[i] : i;
                    const fi = Math.max(0, Math.min(mappedFrame ?? i, actualCount - 1));
                    const crop = Array.isArray(config.cropRects) ? config.cropRects[fi] : null;
                    const frameSrcX = crop ? crop.x : (config.gridCols ? (fi % config.gridCols) * srcW : fi * srcW);
                    const frameSrcY = crop ? crop.y : (config.gridCols ? Math.floor(fi / config.gridCols) * srcH : 0);
                    const frameSrcW = crop ? crop.w : srcW;
                    const frameSrcH = crop ? crop.h : srcH;

                    const c = document.createElement('canvas');
                    c.width  = targetW;
                    c.height = targetH;
                    const ctx = c.getContext('2d');
                    
                    // En boy oranını koruyarak çiz (uzayıp büzülmeyi önler)
                    const srcAspect = frameSrcW / frameSrcH;
                    const targetAspect = targetW / targetH;
                    let drawW = targetW;
                    let drawH = targetH;
                    let drawX = 0;
                    let drawY = 0;

                    if (srcAspect < targetAspect) {
                        drawH = targetH;
                        drawW = Math.round(targetH * srcAspect);
                        drawX = Math.round((targetW - drawW) / 2);
                    } else if (srcAspect > targetAspect) {
                        drawW = targetW;
                        drawH = Math.round(targetW / srcAspect);
                        drawY = Math.round(targetH - drawH); // tabana yasla
                    }

                    // Geçici bir tuval üzerinde resmi ölçeklendir ve arka planı temizle.
                    // Böylece şeffaf kenar boşlukları olmadan flood-fill düzgün çalışır.
                    const tempC = document.createElement('canvas');
                    tempC.width = drawW;
                    tempC.height = drawH;
                    const tempCtx = tempC.getContext('2d');
                    tempCtx.imageSmoothingEnabled = true;
                    tempCtx.imageSmoothingQuality = 'high';
                    
                    tempCtx.drawImage(img, frameSrcX, frameSrcY, frameSrcW, frameSrcH, 0, 0, drawW, drawH);

                    // Arka plan rengi tespiti ve şeffaflaştırma (geçici tuvalde kenarlar doludur):
                    try { this._removeBackground(tempCtx, drawW, drawH); }
                    catch(e) { console.warn('[Sprite] Arka plan silme atlandı:', key, e.message); }

                    // Temizlenmiş resmi hedef tuvale yerleştir
                    ctx.imageSmoothingEnabled = false; // Zaten temizlendi, ekstra yumuşatma yapmasın
                    ctx.drawImage(tempC, drawX, drawY);

                    this.pngCache[key] = c;

                    // Ayna (flipped) versiyonu otomatik üret
                    const fc = document.createElement('canvas');
                    fc.width = targetW; fc.height = targetH;
                    const fctx = fc.getContext('2d');
                    fctx.imageSmoothingEnabled = false;
                    fctx.translate(targetW, 0); fctx.scale(-1, 1);
                    fctx.drawImage(c, 0, 0);
                    this.pngCache[key + '_flipped'] = fc;
                });
                resolve(true);
            };
            img.onerror = (err) => {
                console.error('[Sprite Engine] Error loading sheet:', config.src, err);
                resolve(false);
            };
            img.src = config.src;
        });
    },

    // İki aşamalı arka plan kaldırıcı:
    // 1) Tüm kenar pikseli flood-fill (bağlı arka plan bölgeleri)
    // 2) Parlaklık+doygunluk filtresi (kalan gri/beyaz piksel adacıkları)
    _removeBackground(ctx, w, h) {
        const imageData = ctx.getImageData(0, 0, w, h);
        const d = imageData.data;

        // Tüm kenar piksellerinin ortalama rengini al
        let bgR=0, bgG=0, bgB=0, bgA=0, count=0;
        for (let x=0; x<w; x++) {
            let i=(0*w+x)*4; bgR+=d[i];bgG+=d[i+1];bgB+=d[i+2];bgA+=d[i+3];count++;
            i=((h-1)*w+x)*4; bgR+=d[i];bgG+=d[i+1];bgB+=d[i+2];bgA+=d[i+3];count++;
        }
        for (let y=1; y<h-1; y++) {
            let i=(y*w+0)*4; bgR+=d[i];bgG+=d[i+1];bgB+=d[i+2];bgA+=d[i+3];count++;
            i=(y*w+(w-1))*4; bgR+=d[i];bgG+=d[i+1];bgB+=d[i+2];bgA+=d[i+3];count++;
        }
        bgR=Math.round(bgR/count); bgG=Math.round(bgG/count);
        bgB=Math.round(bgB/count); bgA=Math.round(bgA/count);

        // Zaten şeffaf veya çok koyu (siyah) arka plan → işlem yapma
        if (bgA < 200) return;
        const bgBrightness = (bgR+bgG+bgB)/3;
        if (bgBrightness < 25) return;

        // ── AŞAMA 1: Kenar flood-fill ──────────────────────────────────────
        const tol = 65; // Düşük tolerans: arka planı kaldırır ama benzer tonlu zırh piksellerini korur
        const visited = new Uint8Array(w * h);
        const queue = [];
        for (let x=0; x<w; x++) { queue.push(x,0); queue.push(x,h-1); }
        for (let y=1; y<h-1; y++) { queue.push(0,y); queue.push(w-1,y); }

        let qi = 0;
        while (qi < queue.length) {
            const x=queue[qi++], y=queue[qi++];
            if (x<0||x>=w||y<0||y>=h) continue;
            const pos=y*w+x;
            if (visited[pos]) continue;
            visited[pos]=1;
            const idx=pos*4;
            const dr=d[idx]-bgR, dg=d[idx+1]-bgG, db=d[idx+2]-bgB;
            const dist=Math.sqrt(dr*dr+dg*dg+db*db);
            if (dist>=tol) continue;
            d[idx+3]=Math.round(d[idx+3]*(dist/tol));
            queue.push(x+1,y, x-1,y, x,y+1, x,y-1);
        }

        // ── AŞAMA 2: Parlaklık+doygunluk filtresi (kalan adacıklar) ────────
        // Yüksek parlaklık (>175) VE düşük doygunluk (<0.35) → arka plan
        // Bu yöntem köşeye bağlı olmayan kalıntı pikselleri de temizler.
        for (let i=0; i<d.length; i+=4) {
            if (d[i+3] === 0) continue; // Zaten şeffaf → atla
            const r=d[i], g=d[i+1], b=d[i+2];
            const bright=(r+g+b)/3;
            if (bright < 175) continue; // Koyu piksel → karakter, dokunma
            const maxC=Math.max(r,g,b), minC=Math.min(r,g,b);
            const sat=maxC>0?(maxC-minC)/maxC:0;
            if (sat > 0.35) continue; // Renkli piksel → karakter, dokunma
            // Gri/beyaz arka plan pikseli → şeffaflaştır
            const fade=Math.max(0, 1-(bright-175)/80) * Math.max(0, 1-sat/0.35);
            d[i+3]=Math.round(d[i+3]*(1-fade));
        }

        ctx.putImageData(imageData, 0, 0);
    },

    // Tüm sprite sheet'leri asenkron yükle — eksik dosyalar sessizce atlanır
    async loadAllPNGs() {
        // Her sheet: { src, frameW, frameH, frames }
        // frameW/frameH = tek bir kare boyutu (piksel)
        // frames = soldan sağa kare isimleri (oyun içi sprite key'leri)
        //
        // OYUNCU  : 5 kare → sheet 240×64px (5 × 48px genişlik)
        //   [idle1][idle2][walk1][walk2][attack]
        //
        // DÜŞMAN  : 2 kare → sheet 96×48px  (2 × 48px)
        //   [idle1][idle2]
        //
        // BOSS    : 2 kare → sheet 128×96px (2 × 64px)
        //   [idle1][idle2]

        const SHEETS = [
            // ── OYUNCU — her sınıf kendi sheet'inden yüklenir ───────────────
            // Savaşçı (warrior): sprites/player/sheet.png — 5-frame yatay şerit (1024×1024)
            { src: 'sprites/player/sheet.png', frameW: 48, frameH: 64, frameCount: 5,
              cropRects: [
                { x: 0,   y: 333, w: 179, h: 358 },
                { x: 195, y: 333, w: 189, h: 358 },
                { x: 384, y: 333, w: 192, h: 358 },
                { x: 576, y: 333, w: 192, h: 358 },
                { x: 768, y: 333, w: 256, h: 358 },
              ],
              frames: ['warrior_idle1','warrior_idle2','warrior_walk1','warrior_walk2','warrior_attack'] },
            // Okçu (ranger): sprites/player/archer.png — 5-frame yatay şerit
            { src: 'sprites/player/archer.png', frameW: 48, frameH: 64, frameCount: 5,
              cropRects: [
                { x: 21,  y: 324, w: 179, h: 324 },
                { x: 216, y: 324, w: 179, h: 324 },
                { x: 412, y: 324, w: 192, h: 324 },
                { x: 611, y: 324, w: 192, h: 324 },
                { x: 803, y: 324, w: 215, h: 324 },
              ],
              frames: ['ranger_idle1','ranger_idle2','ranger_walk1','ranger_walk2','ranger_attack'] },
            // Büyücü (mage): serbest yerleşimli 1024x1024 atlas içinden kırpılan kareler
            { src: 'sprites/player/mage_sheet.png', frameW: 48, frameH: 64, frameCount: 5,
              cropRects: [
                { x: 31,  y: 87, w: 171, h: 250 },
                { x: 247, y: 87, w: 168, h: 250 },
                { x: 421, y: 88, w: 192, h: 249 },
                { x: 591, y: 88, w: 185, h: 249 },
                { x: 757, y: 89, w: 247, h: 248 },
              ],
              frames: ['mage_idle1','mage_idle2','mage_walk1','mage_walk2','mage_attack'] },

            // ── TEMEL DÜŞMANLAR ─────────────────────────────────────────────
            // Her sheet = 96×48px | 2 kare @ 48×48
            { src: 'sprites/enemies/slime_sheet.png', frameW: 48, frameH: 48, frameCount: 2,
              cropRects: [{ x: 62, y: 318, w: 388, h: 358 }, { x: 543, y: 359, w: 450, h: 317 }],
              frames: ['slime_idle1','slime_idle2'] },
            { src: 'sprites/enemies/slime_fire_sheet.png', frameW: 48, frameH: 48, frameCount: 2,
              cropRects: [{ x: 56, y: 341, w: 456, h: 370 }, { x: 512, y: 341, w: 456, h: 370 }],
              frames: ['slime_fire_idle1','slime_fire_idle2'] },
            { src: 'sprites/enemies/slime_shadow_sheet.png', frameW: 48, frameH: 48, frameCount: 2,
              cropRects: [{ x: 62, y: 338, w: 388, h: 322 }, { x: 533, y: 374, w: 450, h: 286 }],
              frames: ['slime_shadow_idle1','slime_shadow_idle2'] },
            { src: 'sprites/enemies/skeleton_sheet.png',     frameW: 48, frameH: 64, frameCount: 2,
              cropRects: [{ x: 72, y: 180, w: 378, h: 670 }, { x: 553, y: 185, w: 414, h: 660 }],
              frames: ['skeleton_idle1','skeleton_idle2'] },
            { src: 'sprites/enemies/zombie_sheet.png',       frameW: 48, frameH: 64, frameCount: 2,
              cropRects: [{ x: 46, y: 290, w: 442, h: 478 }, { x: 569, y: 256, w: 307, h: 512 }],
              frames: ['zombie_idle1','zombie_idle2'] },
            { src: 'sprites/enemies/goblin_sheet.png',       frameW: 48, frameH: 48, frameCount: 2,
              cropRects: [{ x: 0, y: 0, w: 512, h: 512 }, { x: 512, y: 0, w: 512, h: 512 }],
              frames: ['goblin_idle1','goblin_idle2'] },
            { src: 'sprites/enemies/spider_sheet.png',       frameW: 48, frameH: 48, frameCount: 2,
              cropRects: [{ x: 11, y: 215, w: 501, h: 312 }, { x: 512, y: 282, w: 502, h: 250 }],
              frames: ['spider_idle1','spider_idle2'] },
            { src: 'sprites/enemies/troll_sheet.png',        frameW: 48, frameH: 64, frameCount: 2,
              cropRects: [{ x: 41, y: 190, w: 435, h: 578 }, { x: 527, y: 190, w: 471, h: 578 }],
              frames: ['troll_idle1','troll_idle2'] },
            { src: 'sprites/enemies/witch_sheet.png',        frameW: 48, frameH: 64, frameCount: 2,
              cropRects: [{ x: 46, y: 230, w: 432, h: 538 }, { x: 543, y: 230, w: 420, h: 538 }],
              frames: ['witch_idle1','witch_idle2'] },
            { src: 'sprites/enemies/ice_golem_sheet.png',    frameW: 48, frameH: 64, frameCount: 2,
              cropRects: [{ x: 32, y: 163, w: 440, h: 679 }, { x: 518, y: 160, w: 500, h: 681 }],
              frames: ['ice_golem_idle1','ice_golem_idle2'] },
            { src: 'sprites/enemies/demon_sheet.png',        frameW: 48, frameH: 64, frameCount: 2,
              cropRects: [{ x: 52, y: 108, w: 388, h: 660 }, { x: 522, y: 108, w: 420, h: 660 }],
              frames: ['demon_idle1','demon_idle2'] },
            { src: 'sprites/enemies/void_wraith_sheet.png',  frameW: 48, frameH: 64, frameCount: 2,
              cropRects: [{ x: 88, y: 144, w: 367, h: 613 }, { x: 553, y: 98, w: 394, h: 659 }],
              frames: ['void_wraith_idle1','void_wraith_idle2'] },
            { src: 'sprites/enemies/dragon_spawn_sheet.png', frameW: 48, frameH: 64, frameCount: 2,
              cropRects: [{ x: 82, y: 144, w: 399, h: 808 }, { x: 538, y: 92, w: 440, h: 870 }],
              frames: ['dragon_spawn_idle1','dragon_spawn_idle2'] },
            { src: 'sprites/enemies/abyss_lord_sheet.png',   frameW: 48, frameH: 64, frameCount: 2,
              cropRects: [{ x: 31, y: 77, w: 419, h: 803 }, { x: 528, y: 93, w: 434, h: 782 }],
              frames: ['abyss_lord_idle1','abyss_lord_idle2'] },

            // ── BOSSLAR (Her bölge için ayrı) ──────────────────────────────
            // Her boss sheet = 128×96px | 2 kare @ 64×96
            { src: 'sprites/bosses/z1_sheet.png',  frameW: 64, frameH: 96,
              cropRects: [{ x: 12, y: 30, w: 372, h: 977 }, { x: 384, y: 5, w: 345, h: 1012 }],
              frames: ['boss_z1_idle1','boss_z1_idle2'] },  // KAELEN
            { src: 'sprites/bosses/z2_sheet.png',  frameW: 64, frameH: 96,
              cropRects: [{ x: 12, y: 1, w: 372, h: 1012 }, { x: 384, y: 1, w: 345, h: 1016 }],
              frames: ['boss_z2_idle1','boss_z2_idle2'] },  // VAELEN
            { src: 'sprites/bosses/z3_sheet.png',  frameW: 64, frameH: 96,
              cropRects: [{ x: 12, y: 0, w: 372, h: 1023 }, { x: 384, y: 1, w: 351, h: 1021 }],
              frames: ['boss_z3_idle1','boss_z3_idle2'] },  // GRAK'THOR
            { src: 'sprites/bosses/z4_sheet.png',  frameW: 64, frameH: 96,
              cropRects: [{ x: 12, y: 1, w: 372, h: 1022 }, { x: 384, y: 5, w: 345, h: 1017 }],
              frames: ['boss_z4_idle1','boss_z4_idle2'] },  // İGNİS
            { src: 'sprites/bosses/z5_sheet.png',  frameW: 64, frameH: 96,
              cropRects: [{ x: 14, y: 14, w: 370, h: 1003 }, { x: 384, y: 5, w: 345, h: 1017 }],
              frames: ['boss_z5_idle1','boss_z5_idle2'] },  // KRAL ALDEN
            { src: 'sprites/bosses/z6_sheet.png',  frameW: 64, frameH: 96,
              cropRects: [{ x: 12, y: 0, w: 372, h: 1023 }, { x: 384, y: 1, w: 345, h: 1021 }],
              frames: ['boss_z6_idle1','boss_z6_idle2'] },  // LYRA
            { src: 'sprites/bosses/z7_sheet.png',  frameW: 64, frameH: 96,
              cropRects: [{ x: 12, y: 1, w: 372, h: 1022 }, { x: 384, y: 1, w: 345, h: 1021 }],
              frames: ['boss_z7_idle1','boss_z7_idle2'] },  // MALAKOR
            { src: 'sprites/bosses/z8_sheet.png',  frameW: 64, frameH: 96,
              cropRects: [{ x: 12, y: 1, w: 372, h: 1022 }, { x: 384, y: 0, w: 345, h: 1022 }],
              frames: ['boss_z8_idle1','boss_z8_idle2'] },  // VALERİUS
            { src: 'sprites/bosses/z9_sheet.png',  frameW: 64, frameH: 96,
              cropRects: [{ x: 80, y: 30, w: 304, h: 977 }, { x: 384, y: 5, w: 345, h: 1017 }],
              frames: ['boss_z9_idle1','boss_z9_idle2'] },  // NİHİL
            { src: 'sprites/bosses/z10_sheet.png',   frameW: 64, frameH: 96,
              cropRects: [{ x: 12, y: 5, w: 372, h: 1018 }, { x: 384, y: 5, w: 345, h: 1017 }],
              frames: ['boss_z10_idle1','boss_z10_idle2'] },   // AETHERİON
            { src: 'sprites/bosses/karun_sheet.png', frameW: 64, frameH: 96,
              cropRects: [{ x: 7, y: 0, w: 377, h: 1023 }, { x: 384, y: 0, w: 371, h: 1022 }],
              frames: ['boss_karun_idle1','boss_karun_idle2'] }, // KÂRUN (Gerçek Son Boss)
        ];

        const results = await Promise.all(SHEETS.map(s => this.loadSheet(s)));
        const loaded = results.filter(Boolean).length;
        if (loaded > 0) {
            console.log(`%c[Sprite Engine] ${loaded} sprite sheet yüklendi`, "color: #39ff14; font-weight: bold;");
        }
    },

    // Renk Haritası (Palette)
    palette: {
        '.': 'transparent',
        ' ': '#24242c', // Zemin karolarındaki derz boşlukları için koyu gri taş dolgusu
        'k': '#000000', // Siyah çerçeve
        'w': '#ffffff', // Beyaz
        'g': '#888888', // Gri zırh / taş
        'd': '#444444', // Koyu gri duvar / zemin gölgesi
        'l': '#aaaaaa', // Açık gri metal / zemin detayı
        's': '#ffcc99', // Ten rengi (Skin)
        'h': '#5c3a21', // Kahverengi saç / tahta sap
        'r': '#e63946', // Kırmızı (Can potu, kan efekti)
        'b': '#1d3557', // Mavi / Lacivert kumaş
        'c': '#00f0ff', // Parlak turkuaz / portal rengi
        'm': '#b026ff', // Büyülü mor / epik renk
        'o': '#ff9f1c', // Altın sarısı / turuncu / efsanevi renk
        'y': '#ffd700', // Saf sarı / altın para
        'e': '#4f772d', // Mossy yeşil / yapay zeka balçık gözü
        'p': '#ffc6ff', // Pembe slime gövdesi
        'i': '#31572c', // Koyu yeşil zemin otu / slime
        'x': '#a020f0'  // Mor büyü enerjisi
    },

    // 16x16 Piksel Matris Şablonları
    templates: {
        // --- ÇEVRE TILE'LARI (ZİNDAN) ---
        tile_floor: [
            "llllllllllllllll",
            "lg g g g g g g l",
            "g d d d d d d d ",
            "g d d d d d d d ",
            "g d d d d d d d ",
            "g d d d d d d d ",
            "g d d d d d d d ",
            "g d d d d d d d ",
            "g d d d d d d d ",
            "g d d d d d d d ",
            "g d d d d d d d ",
            "g d d d d d d d ",
            "g d d d d d d d ",
            "g d d d d d d d ",
            "lg g g g g g g l",
            "llllllllllllllll"
        ],
        
        tile_floor_moss: [
            "llllllllllllllll",
            "lg g g i i g g l",
            "g d d i i i d d ",
            "g d d d i d d d ",
            "g d d d d d d d ",
            "g d d d d d d d ",
            "g d i i d d d d ",
            "g i i i i d d d ",
            "g d i i d d d d ",
            "g d d d d d d d ",
            "g d d d d d d d ",
            "g d d d i i d d ",
            "g d d i i d d d ",
            "g d d d d d d d ",
            "lg g g g g g g l",
            "llllllllllllllll"
        ],

        tile_wall: [
            "kkkkkkkkkkkkkkkk",
            "kllllllllllllllk",
            "klgggggggggggglk",
            "klgddddddddddglk",
            "klgdkkkkkkkkdglk",
            "klgdklkklklddglk",
            "klgdkkkkkkkkdglk",
            "klgddddddddddglk",
            "klgdkkkkkkkkdglk",
            "klgdklkklklddglk",
            "klgdkkkkkkkkdglk",
            "klgddddddddddglk",
            "klgggggggggggglk",
            "kllllllllllllllk",
            "kkkkkkkkkkkkkkkk",
            "kkkkkkkkkkkkkkkk"
        ],

        // --- OYUNCU (ŞÖVALYE) ---
        player_idle1: [
            "....kkkkkk......",
            "...krrwwwrrk....", // Kırmızı sorguç ve beyaz parıltılar
            "..krrrkkkrrrk...",
            "..klggggggggk...", // Çelik miğfer
            "..klgcwwccwglk..", // Neon turkuaz parıldayan vizör!
            "..klggggggggk...",
            "...kkkkkkkkk....",
            "...kbbllbbkk....", // Mavi tunik ve eldiven detayları
            "..kblllllbkk....",
            ".kblllylllbbk...",
            ".klllllyllllbk..",
            ".klllllllllbbk..",
            "..kllllllllbk...",
            "...kdd..ddkk....",
            "...kdd..ddkk....",
            "..kkd...dkkk...."
        ],
        player_idle2: [
            "....kkkkkk......",
            "...krrwwwrrk....",
            "..krrrkkkrrrk...",
            "..klggggggggk...",
            "..klgcwwccwglk..",
            "..klggggggggk...",
            "...kkkkkkkkk....",
            "....kbbllbbk....", // Nefes alma bob efekti (gövde 1px aşağı)
            "...kblllllbkk...",
            "..kblllylllbbk..",
            "..klllllyllllbk.",
            "..klllllllllbbk.",
            "...kllllllllbk..",
            "...kdd..ddkk....",
            "...kdd..ddkk....",
            "..kkd...dkkk...."
        ],
        player_walk1: [
            "....kkkkkk......",
            "...krrwwwrrk....",
            "..krrrkkkrrrk...",
            "..klggggggggk...",
            "..klgcwwccwglk..",
            "..klggggggggk...",
            "...kkkkkkkkk....",
            "...kbbllbbkk....",
            "..kblllllbkk....",
            ".kblllylllbbk...",
            ".klllllyllllbk..",
            ".klllllllllbbk..",
            "..kllllllllbk...",
            "...kdd..ddkk....",
            "....kdd..ddk....",
            "....kk...kkk...."
        ],
        player_walk2: [
            "....kkkkkk......",
            "...krrwwwrrk....",
            "..krrrkkkrrrk...",
            "..klggggggggk...",
            "..klgcwwccwglk..",
            "..klggggggggk...",
            "...kkkkkkkkk....",
            "...kbbllbbkk....",
            "..kblllllbkk....",
            ".kblllylllbbk...",
            ".klllllyllllbk..",
            ".klllllllllbbk..",
            "..kllllllllbk...",
            "....kdd..ddk....",
            "...kdd....ddk...",
            "..kkk......kk..."
        ],
        player_attack: [
            "....kkkkkk......",
            "...krrwwwrrk....",
            "..krrrkkkrrrk...",
            "..klggggggggk...",
            "..klgcwwccwglk..",
            "..klggggggggk...",
            "...kkkkkkkkk....",
            "...kbbllbbkk....",
            "..kblllllbkk....",
            ".kblllylllbbk.c.",
            ".klllllyllllbkcc",
            ".klllllllllbbkcc",
            "..kllllllllbkkc.",
            "...kdd..ddkk....",
            "...kdd..ddkk....",
            "..kkd...dkkk...."
        ],

        // --- DÜŞMANLAR ---
        // Slime (Jöle Yaratık)
        slime_idle1: [
            "................",
            "................",
            "......kkkk......",
            "....kkiiiikk....",
            "...kiiiiiiiikk..",
            "..kiiieeiieiiikk",
            ".kiiieeeiieeeikk",
            ".kiiiiiiiiiiiiik",
            "kiiiiiiiiiiiiiik",
            "kiiiiiiiiiiiiiik",
            "kiiiiiiiiiiiiiik",
            "kiiiiiiiiiiiiiik",
            "kiiiiiiiiiiiiiik",
            ".kiiiiiiiiiiiiik",
            "..kkkkkkkkkkkkk.",
            "................"
        ],
        slime_idle2: [
            "................",
            "................",
            "................",
            "......kkkk......",
            "....kkiiiikk....",
            "...kiiiiiiiikk..",
            "..kiiieeiieiiikk",
            ".kiiieeeiieeeikk",
            "kiiiiiiiiiiiiiik",
            "kiiiiiiiiiiiiiik",
            "kiiiiiiiiiiiiiik",
            "kiiiiiiiiiiiiiik",
            ".kiiiiiiiiiiiiik",
            ".kkkkkkkkkkkkkkk",
            "................",
            "................"
        ],

        // --- YENİ SİLÜET TASARIMLARI (Rafine Edilmiş) ---

        // YANICI SLİME — Şişirilmiş baskı kabı, ısı çatlakları, alev sivri ucu
        // Kimlik: Tek yönde çatlak + yukarı fışkıran sivri uç = "kaçan baskı"
        slime_burning_idle1: [
            "................",
            ".......kk.......",
            "......kiik......",
            ".....kiiiik.....",
            "....kiiiiiikk...",
            "..kiiiiiiiiiiiik",
            "..kiieiiiieiiik.",
            ".kiiiiiiiiiiiiik",
            "kiiiiiiiiiiiiiik",
            "kiiieiiiiiiiiiik",
            "kiiiiiiiiieiiiik",
            "kiiiiiiiiiiiiiik",
            ".kiiiiiiiiiiiiik",
            "..kkkkkkkkkkkk..",
            "................",
            "................"
        ],
        slime_burning_idle2: [
            "................",
            "................",
            ".......kk.......",
            "......kiik......",
            ".....kiiiikk....",
            "...kiiiiiiiiiiiik",
            "..kiieiiieiiiiik",
            ".kiiiiiiiiiiiiik",
            "kiiiiiiiiiiiiiik",
            "kiieiiiiiiiiiiik",
            "kiiiiiiiieiiiik.",
            "kiiiiiiiiiiiiiik",
            ".kiiiiiiiiiiiiik",
            "..kkkkkkkkkkkkk.",
            "................",
            "................"
        ],

        // ZEHİRLİ SLİME — Yassı+geniş, asimetrik kabarcıklar, asit sızıntısı
        // Kimlik: Sol=büyük kabarcık, Sağ=küçük, altta sol asit damlası
        slime_toxic_idle1: [
            "................",
            "................",
            "................",
            "..kkk...kk......",
            ".kiiiik.kiik....",
            ".kiiikkkiiiik...",
            "kiiiiiiiiiiiiiik",
            "kiiiieiiiieiiiik",
            "kiiiiiiiiiiiiiik",
            ".kiiiiiiiiiiiiik",
            "..kkkkkkkkkkkkk.",
            ".kek............",
            "................",
            "................",
            "................",
            "................"
        ],
        slime_toxic_idle2: [
            "................",
            "................",
            "..kkk...kk......",
            ".kiiiik.kiik....",
            ".kiiikkkiiiik...",
            "kiiiiiiiiiiiiiik",
            "kiiiieiiiieiiiik",
            "kiiiiiiiiiiiiiik",
            ".kiiiiiiiiiiiiik",
            "..kkkkkkkkkkkkk.",
            ".kek............",
            "................",
            "................",
            "................",
            "................",
            "................"
        ],

        // RÜN SLİME — Düz tepe (geometrik güç), simetrik rün deseni
        // Kimlik: Köşeli üst kenar + çift rün çizgisi = "kontrollü bozulma"
        slime_rune_idle1: [
            "................",
            "................",
            "....kkkkkkkk....",
            "...kiiiiiiiik...",
            "..kieiiiiiieik..",
            "..kiiiiiiiiiik..",
            ".kiiieiiiiieiiik",
            "kiiiiiiiiiiiiiik",
            "kiiiiiiiiiiiiiik",
            "kiiiiiiiiiiiiiik",
            "kiiiiiiiiiiiiiik",
            ".kiiiiiiiiiiiik.",
            "..kkkkkkkkkkkk..",
            "................",
            "................",
            "................"
        ],
        slime_rune_idle2: [
            "................",
            "................",
            "................",
            "....kkkkkkkk....",
            "...kiiiiiiiik...",
            "..kieiiiiiieik..",
            "..kiiiiiiiiiik..",
            ".kiiieiiiiieiiik",
            "kiiiiiiiiiiiiiik",
            "kiiiiiiiiiiiiiik",
            "kiiiiiiiiiiiiiik",
            ".kiiiiiiiiiiiik.",
            "..kkkkkkkkkkkk..",
            "................",
            "................",
            "................"
        ],

        // BOŞ (VOID) SLİME — Aşınan kenarlar, void yıldızları, uzay damlaması
        // Kimlik: Sol=düzensiz çıkış, Sağ=eriyik, İçinde dağıtılmış yıldızlar
        slime_void_idle1: [
            "................",
            "................",
            "...kk...........",
            "..kiiikk........",
            ".kiiiiiiiik.....",
            ".kiiiieiiiiiiiik",
            "kiiiiiiiiiiiik..",
            "kiiiiiiiiiiiiiik",
            "kiiieiiiiieiiiik",
            "kiiiiiiiiiiiiiik",
            ".kiiiiiiiiiiiik.",
            ".kiiiiiiiiiiiikk",
            "...kkkkkkkkkk...",
            ".......kk.......",
            "................",
            "................"
        ],
        slime_void_idle2: [
            "................",
            "................",
            "................",
            "...kk...........",
            "..kiiikk........",
            ".kiiiiiiiik.....",
            ".kiiiieiiiiiiiik",
            "kiiiiiiiiiiiik..",
            "kiiiiiiiiiiiiiik",
            "kiiieiiiiieiiiik",
            "kiiiiiiiiiiiiiik",
            ".kiiiiiiiiiiiik.",
            "..kiiiiiiiiiiikk",
            "....kkkkkkkkk...",
            "................",
            "................"
        ],

        // Skeleton (İskelet Savaşçı)
        skeleton_idle1: [
            ".....kkkkkk.....",
            "....kwwwwwwk....",
            "...kwwkwwkwwk...",
            "...kwwwwwwwwk...",
            "....kwwkkwwk....",
            ".....kkkkkk.....",
            "......kwwk......",
            "....kkwwwwkk....",
            "...kwwwwwwwwk...",
            "..kwwkwwkwwkwwk.",
            "..kww.kwwk.kwwk.",
            "......kwwk......",
            ".....kwwkwwk....",
            ".....kwk..kwk...",
            "....kwk....kwk..",
            "....kk......kk.."
        ],
        skeleton_idle2: [
            ".....kkkkkk.....",
            "....kwwwwwwk....",
            "...kwwkwwkwwk...",
            "...kwwwwwwwwk...",
            "....kwwkkwwk....",
            ".....kkkkkk.....",
            "......kwwk......",
            "....kkwwwwkk....",
            "...kwwwwwwwwk...",
            "..kwwkwwkwwkwwk.",
            "..kww.kwwk.kwwk.",
            "......kwwk......",
            ".....kwwkwwk....",
            ".....kwk..kwk...",
            "....kwk....kwk..",
            "....kk......kk.."
        ],

        // Gizemli Satıcı (Merchant NPC)
        merchant_idle1: [
            "....kkkkkk......",
            "...kmmmmmmkk....",
            "..kmmmmmmmmkk...",
            "..kmmsswssshkk..",
            "..kmmssssssskk..",
            "...kkkkkkkkk....",
            "...kddllbbkk....",
            "..kdblllllbkk...",
            ".kdblllylllbbk..",
            ".kdlllllyllllbk.",
            ".kdblllllllbbk..",
            "..kdbllllllbk...",
            "...kdd..ddkk....",
            "...kdd..ddkk....",
            "..kkd...dkkk...."
        ],
        merchant_idle2: [
            "....kkkkkk......",
            "...kmmmmmmkk....",
            "..kmmmmmmmmkk...",
            "..kmmsswssshkk..",
            "..kmmssssssskk..",
            "...kkkkkkkkk....",
            "...kddllbbkk....",
            "..kdblllllbkk...",
            ".kdblllylllbbk..",
            ".kdlllllyllllbk.",
            ".kdblllllllbbk..",
            "..kdbllllllbk...",
            "...kdd..ddkk....",
            "...kdd..ddkk....",
            "..kkd...dkkk...."
        ],

        // Zindan Muhafızı Tacı (Boss Crown)
        boss_crown: [
            "................",
            "................",
            "....y..y..y.....",
            "....yoyoyoy.....",
            "....yoyoyoy.....",
            "....kkkkkkk.....",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................"
        ],

        // --- ETKİLEŞİMLİ EŞYALAR & NESNELER ---
        // Sandık (Chest)
        chest_closed: [
            "................",
            "....kkkkkkkk....",
            "...khhhhhhhhk...",
            "..khhhhhhhhhhk..",
            ".khhhhyyyyhhhhk.",
            ".khhhhykkyhhhhk.",
            ".kkkkkkkkkkkkkk.",
            ".khhhhhhhhhhhhk.",
            ".khhhhhhhyyhhhk.",
            ".khhhhhhhyyhhhk.",
            ".khhhhhhhhhhhhk.",
            ".khhhhhhhhhhhhk.",
            ".khhhhhhhhhhhhk.",
            ".khhhhhhhhhhhhk.",
            "..kkkkkkkkkkkk..",
            "................"
        ],
        chest_open: [
            "....kkkkkkkk....",
            "...khhhhhhhhk...",
            "..khhhhhhhhhhk..",
            ".khhhhyyyyhhhhk.",
            ".kkkkkkykkkkkkk.",
            "....kyyyyyy.....",
            "....kyyyyyy.....",
            "....khhhhhh.....",
            "...khhhhhhhhk...",
            "..khhhhhhhhhhk..",
            ".khhhhhhhhhhhhk.",
            ".khhhhhhhhhhhhk.",
            ".khhhhhhhhhhhhk.",
            ".khhhhhhhhhhhhk.",
            "..kkkkkkkkkkkk..",
            "................"
        ],

        // Çıkış Portalı (Portal)
        portal1: [
            "......cccc......",
            "....cccccccc....",
            "...ccxxcxxccc...",
            "..ccxxxxxxxccc..",
            ".ccxxxxxxxxxccl.",
            ".ccxxxxxxxxxcccl",
            "ccxxxxxxxxxxxccc",
            "ccxxxxxxxxxxxccc",
            "ccxxxxxxxxxxxccc",
            "ccxxxxxxxxxxxccc",
            ".ccxxxxxxxxxcccl",
            ".ccxxxxxxxxxccl.",
            "..ccxxxxxxxccc..",
            "...ccxxcxxccc...",
            "....cccccccc....",
            "......cccc......"
        ],
        portal2: [
            "......cccc......",
            "....cccccccc....",
            "...ccxxcxxccc...",
            "..ccxxxxxxxccc..",
            ".ccxxxxxxxxxccl.",
            ".ccxxxxxxxxxcccl",
            "ccxxxxxxxxxxxccc",
            "ccxxxxcxxccxxccc",
            "ccxxxxxcxxcxxccc",
            "ccxxxxxxxxxxxccc",
            ".ccxxxxxxxxxcccl",
            ".ccxxxxxxxxxccl.",
            "..ccxxxxxxxccc..",
            "...ccxxcxxccc...",
            "....cccccccc....",
            "......cccc......"
        ],

        // Altın (Gold Coin)
        item_gold: [
            "......kk......",
            "....kyyyyk....",
            "...kyyyyyyk...",
            "..kyyoyyoyyk..",
            "..kyyoyyoyyk..",
            "...kyyyyyyk...",
            "....kyyyyk....",
            "......kk......",
            "..............",
            "..............",
            "..............",
            "..............",
            "..............",
            "..............",
            "..............",
            ".............."
        ],

        // Can Potu (Health Potion)
        item_potion_red: [
            "......kk......",
            ".....kwwk.....",
            ".....klld.....",
            "....kkkkkk....",
            "...krrrrrrk...",
            "..krrrrrrrrk..",
            "..krrwwrrrrk..",
            "..krrrrrrrrk..",
            "..krrrrrrrrk..",
            "...krrrrrrk...",
            "....kkkkkk....",
            "..............",
            "..............",
            "..............",
            "..............",
            ".............."
        ],

        // Hız Potu (Speed Potion)
        item_potion_blue: [
            "......kk......",
            ".....kwwk.....",
            ".....klld.....",
            "....kkkkkk....",
            "...kcccccck...",
            "..kcccccccck..",
            "..kccwwcccck..",
            "..kcccccccck..",
            "..kcccccccck..",
            "...kcccccck...",
            "....kkkkkk....",
            "..............",
            "..............",
            "..............",
            "..............",
            ".............."
        ],

        // --- SİLAHLAR ---
        // Sıradan Kılıç (Common Sword)
        item_sword_common: [
            "............ll..",
            "...........ldk..",
            "..........ldk...",
            ".........ldk....",
            "........ldk.....",
            ".......ldk......",
            "......ldk.......",
            ".....ldk........",
            "....ldk.........",
            "...ldk..........",
            "..ldk...........",
            ".kwwk...........",
            "..khk...........",
            "...khk..........",
            "....kk..........",
            "................"
        ],

        // Buz Kılıcı (Rare Frost Sword)
        item_sword_rare: [
            "............cc..",
            "...........cck..",
            "..........cck...",
            ".........cck....",
            "........cck.....",
            ".......cck......",
            "......cck.......",
            ".....cck........",
            "....cck.........",
            "...cck..........",
            "..cck...........",
            ".kkkk...........",
            "..kbk...........",
            "...kbk..........",
            "....kk..........",
            "................"
        ],

        // Efsanevi Alev Kılıcı (Legendary Fire Sword)
        item_sword_legendary: [
            "............oo..",
            "...........oyk..",
            "..........oyk...",
            ".........oyk....",
            "........oyk.....",
            ".......oyk......",
            "......oyk.......",
            ".....oyk........",
            "....oyk.........",
            "...oyk..........",
            "..oyk...........",
            ".kkkk...........",
            "..krk...........",
            "...krk..........",
            "....kk..........",
            "................"
        ],

        // --- ZIRHLAR ---
        item_armor_common: [
            "....kkkkkkkk....",
            "...kllllllllk...",
            "..kllllllllllk..",
            ".kllllllllllllk.",
            "klllkkkkkkkklllk",
            "kllk.kkkkkk.kllk",
            "kkk.kddddddk.kkk",
            "....kddddddk....",
            "....kddddddk....",
            "....kddddddk....",
            "....kddddddk....",
            "....kddddddk....",
            "....kddddddk....",
            "....kkkkkkkk....",
            "................",
            "................"
        ],
        item_armor_rare: [
            "....kkkkkkkk....",
            "...kbbbbbbbbk...",
            "..kbbbbbbbbbbk..",
            ".kbbbbbbbbbbbbk.",
            "kbbbkkkkkkkkbbbk",
            "kbbk.kkkkkk.kbbk",
            "kkk.kddddddk.kkk",
            "....kddddddk....",
            "....kddddddk....",
            "....kddddddk....",
            "....kddddddk....",
            "....kddddddk....",
            "....kddddddk....",
            "....kkkkkkkk....",
            "................",
            "................"
        ],
        item_armor_legendary: [
            "....kkkkkkkk....",
            "...koooooooook...",
            "..koooooooooook..",
            ".koooooooooooook.",
            "koookkkkkkkkoook",
            "kook.kkkkkk.kook",
            "kkk.kddddddk.kkk",
            "....kddddddk....",
            "....kddddddk....",
            "....kddddddk....",
            "....kddddddk....",
            "....kddddddk....",
            "....kddddddk....",
            "....kkkkkkkk....",
            "................",
            "................"
        ],
        item_bow_common: [
            "......kkkk......",
            "....kkhhhhk.....",
            "...khh....hk....",
            "..khh..ww..hk...", // Kiriş ipi (beyaz)
            ".khh....w...hk..",
            ".khh....w...hk..",
            "khh.....w....hk.",
            "khh.....w....hk.",
            "khh.....w....hk.",
            ".khh....w...hk..",
            ".khh....w...hk..",
            "..khh..ww..hk...",
            "...khh....hk....",
            "....kkhhhhk.....",
            "......kkkk......",
            "................"
        ],
        item_bow_rare: [
            "......kkkk......",
            "....kkcccck.....", // Buzul mavi yay gövdesi
            "...kcc....ck....",
            "..kcc..ww..ck...",
            ".kcc....w...ck..",
            ".kcc....w...ck..",
            "kcc.....w....ck.",
            "kcc.....w....ck.",
            "kcc.....w....ck.",
            ".kcc....w...ck..",
            ".kcc....w...ck..",
            "..kcc..ww..ck...",
            "...kcc....ck....",
            "....kkcccck.....",
            "......kkkk......",
            "................"
        ],
        item_bow_legendary: [
            "......kkkk......",
            "....kkoooook.....", // Altın alev yayı
            "...koo....ok....",
            "..koo..ww..ok...",
            ".koo....w...ok..",
            ".koo....w...ok..",
            "koo.....w....ok.",
            "koo.....w....ok.",
            "koo.....w....ok.",
            ".koo....w...ok..",
            ".koo....w...ok..",
            "..koo..ww..ok...",
            "...koo....ok....",
            "....kkoooook.....",
            "......kkkk......",
            "................"
        ],
        // --- MİĞFERLER ---
        item_helmet_common: [
            "......kkkk......",
            "....khhhhhhk....",
            "...khhhhhhhhk...",
            "..khhkkkkkkhhk..",
            "..khk.kkkk.khk..",
            "..kk.kddddk.kk..",
            ".....kddddk.....",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................"
        ],
        item_helmet_rare: [
            "......kkkk......",
            "....kllllllk....", // Parlak çelik miğfer
            "...kllllllllk...",
            "..kllkkkkkkllk..",
            "..klk.kkkk.klk..",
            "..kk.kddddk.kk..",
            ".....kcccck.....", // Turkuaz vizör
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................"
        ],
        item_helmet_legendary: [
            "......kkkk......",
            "....koooooook....", // Efsanevi altın taç miğfer
            "...koooooooook...",
            "..kookkkkkkook..",
            "..kok.kkkk.kok..",
            "..kk.kddddk.kk..",
            ".....krrrry.....", // Kırmızı mücevherler
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................"
        ],
        // --- KOLYELER ---
        item_necklace_common: [
            "....kkkkkkkk....",
            "...kh......hk...",
            "..kh........hk..",
            ".kh..........hk.",
            "kh............hk",
            "kk............kk",
            "......khk.......", // Tahta kolye ucu
            ".....khdhk......",
            "......khk.......",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................"
        ],
        item_necklace_rare: [
            "....kkkkkkkk....",
            "...kc......ck...",
            "..kc........ck..",
            ".kc..........ck.",
            "kc............ck",
            "kk............kk",
            "......kck.......", // Safir kolye ucu
            ".....kccck......",
            "......kck.......",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................"
        ],
        item_necklace_legendary: [
            "....kkkkkkkk....",
            "...ky......yk...",
            "..ky........yk..",
            ".ky..........yk.",
            "ky............yk",
            "kk............kk",
            "......kyk.......", // Efsanevi yakut güneş kolye ucu
            ".....kyryk......",
            "......kyk.......",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................"
        ],
        // --- KÜPELER ---
        item_earrings_common: [
            "................",
            "......kkk.......",
            ".....khdhk......", // Tahta küpe halkası
            "......kkk.......",
            "................",
            "................",
            "......kkk.......",
            ".....khdhk......",
            "......kkk.......",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................"
        ],
        item_earrings_rare: [
            "................",
            "......kkk.......",
            ".....kccck......", // Mavi safir küpe
            "......kkk.......",
            "................",
            "................",
            "......kkk.......",
            ".....kccck......",
            "......kkk.......",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................"
        ],
        item_earrings_legendary: [
            "................",
            "......kkk.......",
            ".....korok......", // Efsanevi alev yakut küpe
            "......kkk.......",
            "................",
            "................",
            "......kkk.......",
            ".....korok......",
            "......kkk.......",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................"
        ],
        // --- YÜZÜKLER ---
        item_ring_common: [
            "................",
            "......kkkk......",
            "....kkhddhkk....",
            "...kh......hk...",
            "...kh......hk...",
            "....kkhddhkk....",
            "......kkkk......",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................"
        ],
        item_ring_rare: [
            "................",
            "......kkkk......",
            "....kkcddckk....", // Gümüş safir yüzük
            "...kc.kcck.ck...",
            "...kc.kcck.ck...",
            "....kkcddckk....",
            "......kkkk......",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................"
        ],
        item_ring_legendary: [
            "................",
            "......kkkk......",
            "....kkoddokk....", // Efsanevi alev yakut rün yüzüğü
            "...ko.krrk.ok...",
            "...ko.krrk.ok...",
            "....kkoddokk....",
            "......kkkk......",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................"
        ],
        // --- ELDİVENLER ---
        item_gloves_common: [
            "................",
            ".....kkk..kkk...",
            "....khhhkkhhhk..", // Deri eldivenler
            "....khhhhhhhhk..",
            "....khhhhhhhhk..",
            "....khhkkkkhhk..",
            "....kkk....kkk..",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................"
        ],
        item_gloves_rare: [
            "................",
            ".....kkk..kkk...",
            "....klllkllllk..", // Demir zırh eldiveni
            "....kllllllllk..",
            "....kllllllllk..",
            "....kllkkkklk...",
            "....kkk....kk...",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................"
        ],
        item_gloves_legendary: [
            "................",
            ".....kkk..kkk...",
            "....kooookooook..", // Efsanevi alev ejder eldiveni
            "....koooooooook..",
            "....koooooooook..",
            "....kookkkkook..",
            "....kkk....kkk..",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................"
        ],
        // --- DİZLİKLER (BOOTS) ---
        item_boots_common: [
            "................",
            "......kk..kk....",
            ".....khhkkhhk...", // Deri botlar / dizlikler
            ".....khhkkhhk...",
            ".....khhkkhhk...",
            "....khhhkhhhk...",
            "....kkkkkkkk....",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................"
        ],
        item_boots_rare: [
            "................",
            "......kk..kk....",
            ".....kllkkllk...", // Demir dizlikler
            ".....kllkkllk...",
            ".....kllkkllk...",
            "....klllklllk...",
            "....kkkkkkkk....",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................"
        ],
        item_boots_legendary: [
            "................",
            "......kk..kk....",
            ".....kookkook...", // Efsanevi kanatlı Hermes dizlikleri
            ".....kookookc...",
            ".....kookookcc..",
            "....koookoookc..",
            "....kkkkkkkk....",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................"
        ],
        // --- OK MERMİLERİ ---
        item_staff_common: [
            ".......kk.......",
            "......khhk......",
            "......khhk......",
            ".......hk.......",
            ".......hk.......",
            ".......hk.......",
            ".......hk.......",
            ".......hk.......",
            ".......hk.......",
            ".......hk.......",
            ".......hk.......",
            ".......hk.......",
            "......khhk......",
            ".....kh..hk.....",
            "................",
            "................"
        ],
        item_staff_rare: [
            "......kcck......",
            ".....kcwwck.....",
            "......kcck......",
            ".......ck.......",
            ".......hk.......",
            ".......hk.......",
            ".......hk.......",
            ".......hk.......",
            ".......hk.......",
            ".......hk.......",
            ".......hk.......",
            "......khhk......",
            ".....kh..hk.....",
            "....kh....hk....",
            "................",
            "................"
        ],
        item_staff_legendary: [
            "......kyyk......",
            ".....koyyok.....",
            "....koxwwxok....",
            ".....koyyok.....",
            "......kyyk......",
            ".......ok.......",
            ".......hk.......",
            ".......hk.......",
            ".......hk.......",
            ".......hk.......",
            ".......hk.......",
            "......khhk......",
            ".....kh..hk.....",
            "....kh....hk....",
            "................",
            "................"
        ],
        item_dagger_common: [
            "........ll......",
            ".......ldk......",
            "......ldk.......",
            ".....ldk........",
            "....ldk.........",
            "...ldk..........",
            "..ldk...........",
            ".kwwk...........",
            "..khk...........",
            "...kk...........",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................"
        ],
        item_dagger_rare: [
            "........cc......",
            ".......cck......",
            "......cck.......",
            ".....cck........",
            "....cck.........",
            "...cck..........",
            "..cck...........",
            ".kwwk...........",
            "..kmk...........",
            "...kk...........",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................"
        ],
        item_dagger_legendary: [
            "........mm......",
            ".......mxk......",
            "......mxk.......",
            ".....mxk........",
            "....mxk.........",
            "...mxk..........",
            "..mxk...........",
            ".kwwk...........",
            "..krk...........",
            "...kk...........",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................"
        ],
        item_shield_common: [
            "....kkkkkkkk....",
            "...khhhhhhhk....",
            "..khhhhhhhhhk...",
            "..khhkkkkhhhk...",
            "..khhkddkhhhk...",
            "..khhkddkhhhk...",
            "..khhkkkkhhhk...",
            "...khhhhhhk.....",
            "....khhhhk......",
            ".....khhk.......",
            "......kk........",
            "................",
            "................",
            "................",
            "................",
            "................"
        ],
        item_shield_rare: [
            "....kkkkkkkk....",
            "...kllllllllk...",
            "..kllllllllllk..",
            "..kllkcckllllk..",
            "..kllkcckllllk..",
            "..kllkkkkllllk..",
            "...kllllllllk...",
            "....kllllllk....",
            ".....kllllk.....",
            "......kllk......",
            ".......kk.......",
            "................",
            "................",
            "................",
            "................",
            "................"
        ],
        item_shield_legendary: [
            "....kkkkkkkk....",
            "...kooooooook...",
            "..koooooooooook.",
            "..kookyykoooook.",
            "..kookrrkoooook.",
            "..kookyykoooook.",
            "...kooooooook...",
            "....koooook.....",
            ".....kooook.....",
            "......kook......",
            ".......kk.......",
            "................",
            "................",
            "................",
            "................",
            "................"
        ],
        projectile_arrow_common: [
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "kkkkkkkkkkkkkkww", // Sıradan tahta ok
            "khhhhhhhhhhhhhdww",
            "kkkkkkkkkkkkkkww",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................"
        ],
        projectile_arrow_rare: [
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "kkkkkkkkkkkkkkcc", // Soğuk buzul oku
            "kcccccccccccccww",
            "kkkkkkkkkkkkkkcc",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................"
        ],
        projectile_arrow_legendary: [
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "kkkkkkkkkkkkkkoo", // Alev alan yanan ok
            "kooooooooooooorww",
            "kkkkkkkkkkkkkkoo",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................"
        ]
    },

    // --- SPRITE ÜRETME FONKSİYONU ---
    init() {
        console.log("%c[Sprite Engine] Prosedürel Piksel Çizimleri Derleniyor...", "color: #00f0ff; font-weight: bold;");

        // PNG sprite'larını arka planda yükle (bulunmayan dosyalar sessizce atlanır)
        this.loadAllPNGs();

        // Tile'lara özel koyu renk override'ları — karakter sprite'larını etkilemez
        const DARK_TILE = {
            'l': '#2a2a38', // Açık gri → koyu lacivert-gri
            'g': '#18181f', // Orta gri → neredeyse siyah
            'd': '#0e0e14', // Koyu gri → saf karanlık
            'k': '#06060a', // Siyah çerçeve → daha derin siyah
            ' ': '#0c0c12'  // Derz → derin gece mavisi
        };
        const TILE_KEYS = new Set(['tile_floor','tile_floor_moss','tile_wall']);

        // Şablonları oku ve canvas'lara çizip cache'le
        for (const [key, matrix] of Object.entries(this.templates)) {
            const overrides = TILE_KEYS.has(key) ? DARK_TILE : null;
            this.cache[key] = this.compile(matrix, 4, overrides); // 4x Ölçekli çiz (her piksel 4x4 olur, 64x64px toplam sprite)
            
            // Eğer canavar balçık ise, farklı renk swapper'ları üret
            if (key === 'slime_idle1' || key === 'slime_idle2') {
                // Kırmızı / Fire Slime
                this.cache[key.replace('slime', 'slime_fire')] = this.compile(matrix, 4, { 'i': '#d93c3c', 'e': '#ffd700' });
                // Mor / Shadow Slime
                this.cache[key.replace('slime', 'slime_shadow')] = this.compile(matrix, 4, { 'i': '#8a2be2', 'e': '#00f0ff' });
            }
        }

        // Yeni silüet slime varyantları — her biri kendi renk paleti ile derlenir
        const _newSlimePalettes = [
            { prefix: 'slime_burning', body: '#2a0a00', glow: '#ff4800' },  // koyu kömür + alev turuncu
            { prefix: 'slime_toxic',   body: '#122000', glow: '#b8ff00' },  // koyu hastalıklı yeşil + asit sarısı
            { prefix: 'slime_rune',    body: '#120820', glow: '#aa00ff' },  // derin mor-siyah + rün moru
            { prefix: 'slime_void',    body: '#06060f', glow: '#5566cc' },  // neredeyse siyah + soluk yıldız mavisi
        ];
        for (const s of _newSlimePalettes) {
            for (const f of ['idle1', 'idle2']) {
                const k = `${s.prefix}_${f}`;
                if (this.templates[k]) {
                    this.cache[k] = this.compile(this.templates[k], 4, { 'i': s.body, 'e': s.glow });
                }
            }
        }
        
        // Karakterin duruşlarının ters yönlerini (flip) de üret ve cache'le
        this.generateFlippedSprites();
        
        console.log("%c[Sprite Engine] Derleme Başarılı! Toplam Sprite: " + Object.keys(this.cache).length, "color: #39ff14; font-weight: bold;");
        
        // Profil resmini çiz
        this.drawAvatar();
    },

    // Matrisi Canvas'a Dönüştüren Derleyici
    compile(matrix, scale = 4, colorOverrides = null) {
        const size = 16;
        const canvas = document.createElement('canvas');
        canvas.width = size * scale;
        canvas.height = size * scale;
        const ctx = canvas.getContext('2d');
        
        // Anti-aliasing'i kapat (Piksel keskinliği için kritik!)
        ctx.imageSmoothingEnabled = false;
        ctx.mozImageSmoothingEnabled = false;
        ctx.webkitImageSmoothingEnabled = false;

        for (let row = 0; row < size; row++) {
            const line = matrix[row] || "................";
            for (let col = 0; col < size; col++) {
                const char = line[col] || ".";
                if (char === '.') continue; // Şeffaf piksel

                // Renk seç (override varsa onu kullan)
                let color = this.palette[char] || 'white';
                if (colorOverrides && colorOverrides[char]) {
                    color = colorOverrides[char];
                }

                ctx.fillStyle = color;
                ctx.fillRect(col * scale, row * scale, scale, scale);
            }
        }
        return canvas;
    },

    // Sola bakan (Yatayda ters çevrilmiş - Flipped) sprite'ları üret
    generateFlippedSprites() {
        const spritesToFlip = [
            'player_idle1', 'player_idle2', 'player_walk1', 'player_walk2', 'player_attack',
            'slime_idle1', 'slime_idle2', 'slime_fire_idle1', 'slime_fire_idle2',
            'slime_shadow_idle1', 'slime_shadow_idle2',
            'slime_burning_idle1', 'slime_burning_idle2',
            'slime_toxic_idle1', 'slime_toxic_idle2',
            'slime_rune_idle1', 'slime_rune_idle2',
            'slime_void_idle1', 'slime_void_idle2',
            'skeleton_idle1', 'skeleton_idle2',
            'merchant_idle1', 'merchant_idle2'
        ];

        spritesToFlip.forEach(key => {
            const sourceCanvas = this.cache[key];
            if (!sourceCanvas) return;

            const flippedCanvas = document.createElement('canvas');
            flippedCanvas.width = sourceCanvas.width;
            flippedCanvas.height = sourceCanvas.height;
            const ctx = flippedCanvas.getContext('2d');
            
            ctx.imageSmoothingEnabled = false;
            
            // Yatayda ayna yansıması (flip) yap
            ctx.translate(sourceCanvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(sourceCanvas, 0, 0);

            this.cache[key + '_flipped'] = flippedCanvas;
        });
    },

    // Sağ taraftaki HUD avatar kutusuna oyuncuyu çizer (sınıfa göre)
    drawAvatar() {
        const avatarCanvas = document.getElementById('avatar-canvas');
        if (!avatarCanvas) return;
        const ctx = avatarCanvas.getContext('2d');
        ctx.clearRect(0, 0, 64, 64);

        const cls = (window.GameEngine && window.GameEngine.selectedClass) || 'warrior';
        const key = this.pngCache[`${cls}_idle1`] ? `${cls}_idle1` : 'player_idle1';
        const isPNG = !!this.pngCache[key];
        const sprite = this.pngCache[key] || this.cache[key];
        
        if (sprite) {
            const oldSmoothing = ctx.imageSmoothingEnabled;
            const oldQuality = ctx.imageSmoothingQuality;
            
            if (isPNG) {
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
            } else {
                ctx.imageSmoothingEnabled = false;
            }
            
            ctx.drawImage(sprite, 0, 0, 64, 64);
            
            ctx.imageSmoothingEnabled = oldSmoothing;
            ctx.imageSmoothingQuality = oldQuality;
        }
    },

    updatePlayerSprites(equipment) {
        const colorOverrides = {};

        // 1. HELMET OVERRIDES
        if (equipment && equipment.helmet) {
            const rarity = equipment.helmet.rarity;
            if (rarity === 'common') {
                colorOverrides['c'] = '#8e9297'; // vizör gray
                colorOverrides['g'] = '#8c5a3c'; // rusty metal
                colorOverrides['l'] = '#a66f4e'; // light rusty metal
            } else if (rarity === 'rare') {
                colorOverrides['c'] = '#00b0ff'; // vizör blue
                colorOverrides['g'] = '#bbbbbb'; // steel metal
                colorOverrides['l'] = '#eeeeee'; 
            } else if (rarity === 'legendary') {
                colorOverrides['c'] = '#ff8c00'; // vizör orange
                colorOverrides['g'] = '#ffd700'; // gold metal
                colorOverrides['l'] = '#fff099';
                colorOverrides['r'] = '#b026ff'; // purple crest
                colorOverrides['w'] = '#ff007f'; // pink crest highlight
            }
        }

        // 2. ARMOR OVERRIDES
        if (equipment && equipment.armor) {
            const rarity = equipment.armor.rarity;
            if (rarity === 'common') {
                colorOverrides['b'] = '#5c3a21'; // leather brown
                colorOverrides['l'] = '#8b5a2b'; // dark copper shoulders
            } else if (rarity === 'rare') {
                colorOverrides['b'] = '#1d3557'; // steel blue
                colorOverrides['l'] = '#cccccc'; // silver shoulders
            } else if (rarity === 'legendary') {
                colorOverrides['b'] = '#4a0e4e'; // deep royal purple
                colorOverrides['l'] = '#ffd700'; // glowing gold shoulders
            }
        }

        // 3. BOOTS OVERRIDES
        if (equipment && equipment.boots) {
            const rarity = equipment.boots.rarity;
            if (rarity === 'common') {
                colorOverrides['d'] = '#5c3a21'; // simple brown boots
            } else if (rarity === 'rare') {
                colorOverrides['d'] = '#6e7075'; // polished steel greaves
            } else if (rarity === 'legendary') {
                colorOverrides['d'] = '#ffd700'; // gold boots
            }
        }

        // Recompile player templates with these overrides
        const playerTemplates = [
            'player_idle1', 'player_idle2', 'player_walk1', 'player_walk2', 'player_attack'
        ];

        playerTemplates.forEach(key => {
            const matrix = this.templates[key];
            if (matrix) {
                this.cache[key] = this.compile(matrix, 4, colorOverrides);
            }
        });

        // Regenerate flipped versions
        const spritesToFlip = [
            'player_idle1', 'player_idle2', 'player_walk1', 'player_walk2', 'player_attack'
        ];

        spritesToFlip.forEach(key => {
            const sourceCanvas = this.cache[key];
            if (!sourceCanvas) return;

            const flippedCanvas = document.createElement('canvas');
            flippedCanvas.width = sourceCanvas.width;
            flippedCanvas.height = sourceCanvas.height;
            const ctx = flippedCanvas.getContext('2d');
            
            ctx.imageSmoothingEnabled = false;
            
            ctx.translate(sourceCanvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(sourceCanvas, 0, 0);

            this.cache[key + '_flipped'] = flippedCanvas;
        });

        // Update the HUD avatar canvas too!
        this.drawAvatar();
    },

    // Kolay çizim yardımcı fonksiyonu — PNG varsa önce onu kullanır, yoksa matrisi
    draw(ctx, spriteName, x, y, width = 64, height = 64, isMoving = false) {
        const isPNG = !!this.pngCache[spriteName];
        const sprite = this.pngCache[spriteName] || this.cache[spriteName];
        if (sprite) {
            const oldSmoothing = ctx.imageSmoothingEnabled;
            const oldQuality = ctx.imageSmoothingQuality;
            
            if (isPNG) {
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                
                ctx.save();
                
                const isWalking = isMoving || spriteName.includes('_walk');
                const isAttacking = spriteName.includes('_attack');
                
                if (isAttacking) {
                    // Attack lunge & tilt
                    const isFlipped = spriteName.includes('_flipped');
                    const lungeX = isFlipped ? -8 : 8;
                    const tilt = isFlipped ? -0.12 : 0.12;
                    
                    ctx.translate(x + width / 2 + lungeX, y + height);
                    ctx.rotate(tilt);
                    ctx.drawImage(sprite, -width / 2, -height, width, height);
                } else if (isWalking) {
                    // High-quality procedural walk cycle
                    const walkTime = Date.now() / 150; // speed of walking steps
                    
                    // Çok kareli animasyon ise prosedürel hareketi hafiflet (bacaklar zaten hareket ediyor!)
                    const isMulti = SpriteEngine.multiFrameSprites.has(spriteName);
                    
                    // Bobbing up and down
                    const bobY = Math.abs(Math.sin(walkTime)) * (isMulti ? 2 : 6); // up to 6px bobbing
                    
                    // Squash & stretch based on step phase
                    const stepSine = Math.sin(walkTime * 2); // twice the frequency of bobbing
                    const scaleY = 1.0 + stepSine * (isMulti ? 0.015 : 0.04);
                    const scaleX = 1.0 - stepSine * (isMulti ? 0.007 : 0.02);
                    
                    // Rocking tilt (swaying)
                    const tilt = Math.cos(walkTime) * (isMulti ? 0.03 : 0.12); // rock left/right
                    
                    // Horizontal shear/skew to simulate leg stride
                    const shearX = isMulti ? 0 : Math.sin(walkTime) * 0.08; 
                    
                    ctx.translate(x + width / 2, y + height);
                    ctx.rotate(tilt);
                    if (shearX !== 0) {
                        ctx.transform(1, 0, shearX, 1, 0, 0);
                    }
                    
                    const w = width * scaleX;
                    const h = height * scaleY;
                    ctx.drawImage(sprite, -w / 2, -h - bobY, w, h);
                } else {
                    // Idle breathing (squash & stretch)
                    const breatheTime = Date.now() / 250;
                    const scaleY = 1.0 + Math.sin(breatheTime) * 0.025;
                    const scaleX = 1.0 - Math.sin(breatheTime) * 0.01;
                    
                    const drawW = width * scaleX;
                    const drawH = height * scaleY;
                    const drawX = x + (width - drawW) / 2;
                    const drawY = y + (height - drawH);
                    
                    ctx.drawImage(sprite, drawX, drawY, drawW, drawH);
                }
                
                ctx.restore();
            } else {
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(sprite, x, y, width, height);
            }
            
            ctx.imageSmoothingEnabled = oldSmoothing;
            ctx.imageSmoothingQuality = oldQuality;
        } else {
            // Hata durumunda mor kare çiz (klasik oyun hatası!)
            ctx.fillStyle = '#ff00ff';
            ctx.fillRect(x, y, width, height);
        }
    }
};

// Sayfa yüklendiğinde çizimleri derle
window.addEventListener('DOMContentLoaded', () => {
    SpriteEngine.init();
});
