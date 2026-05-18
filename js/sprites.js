/**
 * ==========================================================================
 * PIXEL KNIGHT - PROCEDURAL SPRITE GENERATOR & CACHE SYSTEM
 * ==========================================================================
 * Bu dosya, harici görsellere ihtiyaç duymadan, piksel matrislerini tarayıcı
 * belleğinde Canvas nesnelerine dönüştürerek oyunun tüm grafiklerini oluşturur.
 */

const SpriteEngine = {
    // Önbelleğe alınmış canvas varlıkları
    cache: {},

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
        
        // Şablonları oku ve canvas'lara çizip cache'le
        for (const [key, matrix] of Object.entries(this.templates)) {
            this.cache[key] = this.compile(matrix, 4); // 4x Ölçekli çiz (her piksel 4x4 olur, 64x64px toplam sprite)
            
            // Eğer canavar balçık ise, farklı renk swapper'ları üret
            if (key === 'slime_idle1' || key === 'slime_idle2') {
                // Kırmızı / Fire Slime
                this.cache[key.replace('slime', 'slime_fire')] = this.compile(matrix, 4, { 'i': '#d93c3c', 'e': '#ffd700' });
                // Mor / Shadow Slime
                this.cache[key.replace('slime', 'slime_shadow')] = this.compile(matrix, 4, { 'i': '#8a2be2', 'e': '#00f0ff' });
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

    // Sağ taraftaki HUD avatar kutusuna piksel şövalyemizi çizer
    drawAvatar() {
        const avatarCanvas = document.getElementById('avatar-canvas');
        if (!avatarCanvas) return;
        const ctx = avatarCanvas.getContext('2d');
        
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, 64, 64);
        
        // Idle1 oyuncu görselini çiz
        const playerSprite = this.cache['player_idle1'];
        if (playerSprite) {
            ctx.drawImage(playerSprite, 0, 0, 64, 64);
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

    // Kolay çizim yardımcı fonksiyonu
    draw(ctx, spriteName, x, y, width = 64, height = 64) {
        const sprite = this.cache[spriteName];
        if (sprite) {
            ctx.drawImage(sprite, x, y, width, height);
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
