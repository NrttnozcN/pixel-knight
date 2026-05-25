'use strict';
/**
 * EREVORN — Dialogue System
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
            { speaker: 'NARRATOR', text: 'Karanlık Zindan. Tarikatın yeryüzüne en yakın kışlasıydı bir zamanlar. Şimdi rutubetli bir yıkıntı. Duvarlardaki rünlerin üzeri mor büyü izleriyle kirletilmiş.' },
            { speaker: 'SERA',     text: 'Şövalye... Elinde kırık kılıç, hafızan silinmiş, neden burada olduğunu bilmiyorsun. Ben seni hatırlıyorum. Sen benim soyumsun. Şimdi sadece bana güven — ayakta dur ve savaş.' },
            { speaker: 'SERA',     text: 'Kârun bu karanlıkları 200 yıldır yönetiyor. O seni yakaladı, hafızanı sildi. Ama hata yaptı — seni öldürmedi. Şimdi bu onun sonu olacak.' },
        ],
        2: [
            { speaker: 'NARRATOR', text: 'Gölge Mağarası. Soluk mor kristaller tek aydınlatma kaynağı. Duvarlardaki gölgeler hareket ediyor, fısıldıyor...' },
            { speaker: 'SERA',     text: 'Bu sesler gerçek. Kârun\'un ritüeli sırasında bedenleri sökülen tarikat üyeleri... gölge yaratıklarına dönüştüler. Işığı ve yaşamı emiyorlar. Dikkatli ol.' },
        ],
        3: [
            { speaker: 'NARRATOR', text: 'Goblin Yurdu. Halat köprüler, asılı demir kafesler, sarı zehir akan nehirler. Esir köylüler madende zorla çalıştırılıyor.' },
            { speaker: 'SERA',     text: 'Kârun goblin kabilelerini köleleştirdi. Aetherium ile besledi — onları canavarlaştırdı. Şövalye, esir köylüleri gördüğünde kurtarmayı unutma. Onlar masum.' },
            { speaker: 'KARUN',    text: 'Sera sana köylülerden bahsediyor... Tatlı. Ama burada güçlü olan ayakta kalır. Bunları kurtarmaya vakit harcamak seni yavaşlatır.' },
        ],
        4: [
            { speaker: 'NARRATOR', text: 'Alev Krallığı. Gorgoroth\'un jeotermal tapınakları. Lav şelaleleri, uçuşan siyah küller, yanan bazalt.' },
            { speaker: 'SERA',     text: 'Kârun\'un enerjisini burada çok daha güçlü hissediyorum. Buradaki tarikat büyücüleri yozlaşmış rahiplere dönüştü. Bedenlerini ateşe teslim ettiler.' },
            { speaker: 'KARUN',    text: '...Gidişatın beni endişelendirmeye başlıyor, şövalye. Devam et bakalım.' },
        ],
        5: [
            { speaker: 'NARRATOR', text: 'Donmuş Tundra. Buz duvarlarının içinde 200 yıl önce donmuş insanların siluetleri görünüyor. Soğuk rüzgar tünellerde uğulduyor.' },
            { speaker: 'SERA',     text: 'Frostgard krallığının altındaki donmuş kalıntılar. Kârun buraya ulaştığında en uzun direnen krallıktı. Kral Alden son ana kadar savaştı.' },
            { speaker: 'KARUN',    text: 'Alden\'ı hatırlıyorum. Direnmek onu ne yaptı? Tahtına zincirlenmiş dondurdum. Bütün bunları "doğru" olduğu için yaptım, şövalye.' },
        ],
        6: [
            { speaker: 'NARRATOR', text: 'Orman Tapınağı. Hayat Ağacı\'nın kalıntıları. Dev kökler sütunları sarmış, mor zehirli sporlar havada süzülüyor. Su pınarları Aetherium zehriyle akıyor.' },
            { speaker: 'SERA',     text: 'Bu benim gücümü aldığım kutsal tapınak. Kârun buna dokunmamalıydı... Lyra burada bir yerde. En yakın arkadaşım. Onu Hayat Ağacı\'na bağladı.' },
            { speaker: 'KARUN',    text: 'Kutsal mı? Dünya kuruyorken hiçbir şey kutsal değil. Sadece güç ve çözümler var. Sen bunları anlayamazsın.' },
        ],
        7: [
            { speaker: 'NARRATOR', text: 'Şeytan Kalesi. Kara demir ve obsidyenden gotik şato. Duvarlarda kanla yazılmış isimler — Kârun\'un kurbanları. Yokluk portalları mor alevlerle yanıyor.' },
            { speaker: 'SERA',     text: 'Şövalye... Yedinci bölgeye ulaştın. Buradan sonra artık geri dönüş yok. Ama sen zaten bunu biliyorsun. Devam et.' },
            { speaker: 'KARUN',    text: 'Bu isimleri okuyorsan bil: Hepsi güçsüz olduğu için orada. Ben dünyayı kurtarmaya çalışıyorum. Bedel bu.' },
        ],
        8: [
            { speaker: 'NARRATOR', text: 'Gökyüzü Kalesi. Yerçekimini bükücü rünlerle havada asılı tutulan beyaz mermer yollar. Bulutların üzerinde bir his.' },
            { speaker: 'KARUN',    text: 'Buraya kadar gelebildin... Beklenmedik. Valerius\'u hatırlar mısın, şövalye? Hafızan silinik, ama belki bir şeyler kalmıştır.' },
            { speaker: 'SERA',     text: 'Şövalye — sekizinci bölge. Kârun\'un konsey sarayı. Dikkatli ol, buradaki varlıklar eskiden en güçlü bilgelerimizdi.' },
        ],
        9: [
            { speaker: 'NARRATOR', text: 'Yokluk Alemi. Fizik kuralları işlemiyor. Gerçeklik yırtılmış. Havada kırık taşlar ve ayna parçaları süzülüyor. Mor-siyah sonsuzluk...' },
            { speaker: 'SERA',     text: 'Bu yer Kârun\'un bile tam kontrol edemediği bir alan. Buradaki şeyler gerçek değil — ama acı gerçek. Bir uyarı: Kendi yansımanı görebilirsin. Savaşmak zorunda kalacaksın.' },
            { speaker: 'KARUN',    text: 'Yokluk Alemi\'ne hoş geldin. Ben de burada pek rahat değilim, açıkçası. Nihil... planlarımın dışında.' },
        ],
        10: [
            { speaker: 'NARRATOR', text: 'Ejder Yuvası ve Taht Odası. Dünyanın Kalbi\'nin kızıl-altın enerjisi her yeri kaplıyor. Altın rün damarları zeminden geçiyor. Ve orada... Kârun\'un kara tahtı, kalbin tam üzerinde.' },
            { speaker: 'SERA',     text: 'Şövalye — bu son bölge. Kârun seni 200 yıl aradı. Senin kanına ihtiyacı var. Dünyanın Kalbi\'ni kontrol etmek için. Bugün bu zindan biter.' },
            { speaker: 'KARUN',    text: 'Sonunda geldin, torun. Artık kaçış yok. Ne yapacağını seç: Benimle ol... ya da her şey yok olsun.' },
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
            { speaker: 'NARRATOR', text: 'Koridorun sonunda ağır zincir sesleri duyuluyor. Demir kapıyla bütünleşmiş devasa bir figür...' },
            { speaker: 'SERA',     text: 'Kaelen! Tarikatın giriş kapısı koruyucusuydu. Kârun teslim olmayı reddetti diye bedenine erimiş zincirler kaynaklatmış. Onu kurtarmak için... önce yenmek zorundasın.' },
            { speaker: 'NARRATOR', text: 'Kaelen — Zincirlenmiş Muhafız. Ağır demirlerle kapıya zincirlenmiş, acı içinde inleyen dev bir zırh yığını.' },
        ],
        2:  [
            { speaker: 'NARRATOR', text: 'Gölgeler şekil alıyor. Yarı saydam bir figür kristallerin ışığını içine çekiyor...' },
            { speaker: 'SERA',     text: 'Vaelen! Kârun\'un en sadık çırağıydı. Ritüel sırasında bedeni eridi — Kârun onun ruhunu zindan\'ın gölge kuyusuna bağladı. Şimdi karanlığın kendisi.' },
            { speaker: 'KARUN',    text: 'Vaelen, misafirlerimize zindan karanlığını öğret...' },
        ],
        3:  [
            { speaker: 'NARRATOR', text: 'Kemik tahtta oturan dev bir figür. Ayak sesleri taşı sarsiyor.' },
            { speaker: 'KARUN',    text: "Grak'thor'u tanıştırayım sana. Benim için çalışmayı kabul eden ilk goblin şefiydi. Onu Aetherium ile besledim... ve işte bu oldu." },
            { speaker: 'SERA',     text: "Grak'thor kölelere zulmediyor! Madendeki tutsakları kurtarabilmek için önce onu durdur!" },
        ],
        4:  [
            { speaker: 'NARRATOR', text: 'Zırhtan akan lav damlaları yeri yakıyor. Cehennemi adımlar yaklaşıyor...' },
            { speaker: 'SERA',     text: 'Ignis! Tarikatın askeri komutanıydı. Kârun\'un "dünyayı arındırma" fikrine ilk inanan o oldu. Kardeşlerine ilk kılıç çeken de o.' },
            { speaker: 'KARUN',    text: 'Ignis benim için savaştı. Şimdi seninle savaşıyor. Bir fark görmüyor musun, şövalye?' },
        ],
        5:  [
            { speaker: 'NARRATOR', text: 'Buz kristallerinin içinde donmuş bir taht. Tahtın üzerinde nefreti dondurulmuş bir kral...' },
            { speaker: 'SERA',     text: 'Kral Alden! Frostgard\'ın hükümdarıydı. Kârun\'a en uzun süre direndi. Kârun onu tahtına zincirleyerek diri diri dondurdu. İki yüz yıldır buz altında nefret birikiyor.' },
            { speaker: 'KARUN',    text: 'Alden direndi. Ve işte bu yüzden orada. Direnenler hep böyle biter.' },
        ],
        6:  [
            { speaker: 'NARRATOR', text: 'Hayat Ağacı\'na bağlı, mor dikenlerle kaplı, acıyla ağlayan bir figür...' },
            { speaker: 'SERA',     text: '...Lyra. Tanrım. Lyra benim en yakın arkadaşımdı. Tapınak koruyucusuydu. Kârun onu kutsal Hayat Ağacı\'na bağlayarak... buna dönüştürdü. Şövalye... onu kurtarmak için yenmek zorundayız.' },
            { speaker: 'KARUN',    text: 'Sera\'nın arkadaşıyla tanışıyor musun? Güzel, değil mi? Bu Sera\'ya armağanımdı.' },
        ],
        7:  [
            { speaker: 'NARRATOR', text: 'Yokluk portalından süzülen karanlık. Dev boynuzlar. Gölge kanatlar. Kozmik bir varlık...' },
            { speaker: 'SERA',     text: 'Malakor! Kârun bunu kan paktıyla çağırdı. Yokluk boyutundan gelen kadim bir iblis generali. Kârun\'un en güçlü silahı.' },
            { speaker: 'KARUN',    text: 'Malakor... onunla özel bir anlaşmam var. Seni canlı götürmesini istedim. Ama artık bunun için çok geç.' },
        ],
        8:  [
            { speaker: 'NARRATOR', text: 'Beyaz mermer sütunlar arasında altın kristal gözlü bir figür. İki ucu keskin ışık kılıcı havada süzülüyor...' },
            { speaker: 'SERA',     text: 'Şövalye... dur. Bu... bu Valerius. Tarikatın Baş Yargıcı. Senin eski hocan.' },
            { speaker: 'KARUN',    text: 'Tanıdın mı, şövalye? Belki hafızan henüz tam silinmemiştir. Hocanla yeniden karşılaşmak nasıl hissettiriyor?' },
            { speaker: 'SERA',     text: 'Kârun Valerius\'un gözlerini altın rün kristalleriyle değiştirdi. Artık emirlerine körü körüne uyuyor. Ama içinde bir yerde hâlâ o eski Valerius var... Dikkatli ol.' },
        ],
        9:  [
            { speaker: 'NARRATOR', text: 'Gerçeklik parçalanıyor. Obsidyen parçacıklarından oluşan dev bir göz yavaşça şekilleniyor...' },
            { speaker: 'KARUN',    text: '...Bu... bu benim işim değil. Ben bunu çağırmadım.' },
            { speaker: 'SERA',     text: 'Ne? Kârun bile bunu kontrol edemiyor! Nihil, Erevorn\'u yutmaya çalışan yaşayan bir yırtık. Şövalye — bu sadece onun değil, herkesin düşmanı!' },
            { speaker: 'KARUN',    text: 'Bir kez... sadece bir kez... seninle aynı taraftayım. Nihil\'i durdur.' },
        ],
        10: [
            { speaker: 'NARRATOR', text: 'Dünyanın Kalbi\'nin kızıl altın enerjisi her yeri kaplıyor. Altın damarlar zeminden geçiyor. Ve orada... kara taht.' },
            { speaker: 'SERA',     text: 'Şövalye — bu son an. Kârun\'un tahtı Dünyanın Kalbi\'nin tam üzerinde. Ama önce Aetherion bekliyor. Kalbin kadim ejder koruyucusu. Kârun onu mor kristallerle yozlaştırdı.' },
            { speaker: 'KARUN',    text: 'Sonunda geldin, torun. Evet... seni bekliyordum. Sera\'nın son kanı. Dünyanın Kalbi\'ni kontrol etmem için tek eksik şey sendin.' },
            { speaker: 'SERA',     text: 'Şövalye! O senin kim olduğunu biliyor. Sen benim soyumsun — tarikatın kurucu kanının son temsilcisisin. Bunun için 200 yıl seni aradı. Tüm gücünü topla. SON SAVAŞ!' },
        ],
    },

    boss_post: {
        1:  [
            { speaker: 'SERA',  text: 'Kaelen devrildi. Zincirler çözüldü. Umarım ruhunu özgürce taşıyabilir artık.' },
            { speaker: 'KARUN', text: '...İlginç. Kaelen 200 yıldır o kapıyı tuttu. Sen birkaç dakikada indirdin. Devam et bakalım.' },
        ],
        2:  [
            { speaker: 'SERA',  text: 'Vaelen\'in gölgesi dağıldı. Bir zamanlar iyi bir insandı. Kârun onu bu hale getirdi.' },
            { speaker: 'KARUN', text: 'Vaelen hep çok sadıktı. Sonuna kadar. Sana bunu söylüyorum çünkü bundan gurur duyuyorum.' },
        ],
        3:  [
            { speaker: 'SERA',  text: "Grak'thor düştü! Köylüler artık biraz daha özgür. Her kurtardığın esir, her yendiğin boss — bunların hepsi önemli." },
            { speaker: 'KARUN', text: "Grak'thor işe yarardı. Ama artık işe yaramıyor. Devam et — daha iyilerini tanıştıracağım seninle." },
        ],
        4:  [
            { speaker: 'SERA',  text: 'Ignis yenildi! Ama bak... ölürken bile Kârun\'un adını haykırıyordu. Fanatiği buydu işte.' },
            { speaker: 'KARUN', text: 'Ignis en sadık askerlerimden biriydi. Bence yanlış taraftasın, şövalye.' },
        ],
        5:  [
            { speaker: 'SERA',  text: 'Kral Alden\'ın laneti çözüldü! İki yüz yıllık buz eridi. Frostgard\'ın son hükümdarı huzura kavuştu.' },
            { speaker: 'KARUN', text: 'Beşinci bölge. Yarısını geçtin. Başlamadan bitmeyeceğini anlıyorum artık.' },
        ],
        6:  [
            { speaker: 'SERA',  text: 'Lyra... Lyra huzura kavuştu. Teşekkür ederim şövalye. Bu benim için... çok şeydi.' },
            { speaker: 'KARUN', text: 'Sera ağlıyor mu? İlginç. Zayıflık, her zaman zayıflık.' },
        ],
        7:  [
            { speaker: 'SERA',  text: 'Malakor yokluk boyutuna geri döndü! Kârun\'un en güçlü silahını kırdın. Artık sadece iki bölge kaldı.' },
            { speaker: 'KARUN', text: 'Yedincisini de geçtin. Sana saygım arttı. Ama bu yaklaşmakta olan sonu değiştirmiyor.' },
        ],
        8:  [
            { speaker: 'SERA',  text: 'Valerius... düştü. Kârun\'un kontrolü kırıldı, son nefesinde seni tanıdı mı? Gördüm... gözlerinde bir şey değişti.' },
            { speaker: 'KARUN', text: 'Valerius seninle savaşırken hata yaptı. Seni tanımaya çalıştı. Bu onu yavaşlattı. Duygular, her zaman zayıflıktır.' },
            { speaker: 'SERA',  text: 'Şövalye — bir bölge kaldı. Kârun bekliyor. Hazır mısın?' },
        ],
        9:  [
            { speaker: 'KARUN', text: 'Nihil\'i durdurdun. Ben... beklenmedik. Sana minnetim var. Ama bu, aramızdaki hesabı değiştirmiyor.' },
            { speaker: 'SERA',  text: 'Kârun bile seni durduramayan şeyi sen durdurdun. Şövalye... artık gerçekten hazırsın. Son bölge. Dünyanın Kalbi.' },
        ],
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

        // ── SINIFA ÖZEL SEVİYE ATLAMA FISILTILARI ──────────────────────────────
        // Büyücü (Mage) — Her seviye atlamada rastgele seçilir
        level_up_mage: [
            {
                speaker: 'SERA',
                text: 'Damarlarındaki rün ateşi uyanıyor evlat. Hissettiğin o sıcaklık, soyumuzun kadim ışığıdır. Gücünü doğru yere yönlendir, seninle gurur duyuyorum.',
            },
            {
                speaker: 'KARUN',
                text: 'Bak hele... İki kıvılcım çaktı diye kendini büyücü mü sanıyorsun? Sera sana o oyuncakları kullanırken arkasındaki ölümcül bedeli söylemedi mi?',
            },
        ],
        // Savaşçı (Warrior) — Her seviye atlamada rastgele seçilir
        level_up_warrior: [
            {
                speaker: 'SERA',
                text: 'Zırhının ağırlığı seni yormasın. O demir, 200 yıl önce büyük babanın Kârun\'un karşısına dikilirken giydiği zırhın aynısıdır. Onun yarım kalan adaletini sen tamamlayacaksın.',
            },
            {
                speaker: 'KARUN',
                text: 'O kırık kılıçla buraya kadar yürüyebildin demek. Demir yığını! Tarikatın infazcısı olmak sana geçmişini hatırlatıyor mu? O zırhın içinde sadece boş bir kovan olarak öleceksin!',
            },
        ],
        // Okçu (Ranger) — Her seviye atlamada rastgele seçilir
        level_up_ranger: [
            {
                speaker: 'SERA',
                text: 'Nefesini tut ve hedefini seç. Adımların o kadar hafif ki, zindanın taşları bile seni duyamıyor. Sen bizim karanlıktaki görünmez okumuzsun, harika gidiyorsun.',
            },
            {
                speaker: 'KARUN',
                text: 'Bir gölge gibi süzüldüğünü mü sanıyorsun? Yayının geriliş sesini 100 kat yukarıdan duyabiliyorum! Fare gibi kaçarak benden kurtulamazsın.',
            },
        ],

        // ── ZONE 9: ZAMAN YANKISI ─────────────────────────────────────────────
        time_echo_spawn: [
            { speaker: 'KARUN',    text: 'Yokluk Alemine hoş geldin. Burada geçmişin seni kovalar. O yüze bak — tanıdık mı? Tanımalısın. O sensin. Zaman yokluğu içinde kırıldığında bıraktığın parça.' },
            { speaker: 'SERA',     text: 'Yankını öldürme. Öldüremezsin zaten — o senden bir parça. Onu anlayarak geç. Ama eğer zorlarsan... savaş. Sadece kendini suçlama.' },
        ],

        // ── ZONE 10: KÂRUN SAHNEYE ÇIKIYOR ───────────────────────────────────
        karun_final_appears: [
            { speaker: 'KARUN',    text: 'Aetherion benim için sadece bir zincirdi. Onun ölümü beni özgür kıldı. Şimdi... gerçek savaş başlıyor. Sen Sera\'nın soyusun — ama bu, yeterli değil.' },
            { speaker: 'SERA',     text: 'Şövalye! Asıl düşman bu — Kârun. 200 yıldır bekledim. Sen bu anın için doğdun. Sonu getir.' },
        ],

        // ── OYUN SONU DİYALOGLARI ─────────────────────────────────────────────
        ending_light: [
            { speaker: 'SERA',     text: 'Yaptığını görüyorum. Çekirdeği yok ediyorsun — kendini de onunla birlikte. Ama hiçbir zaman hata yapmadın. Soyumuz böyle biter: ışıkla.' },
            { speaker: 'NARRATOR', text: 'Altın Çekirdek parçalandı. 200 yıllık ruhlar zincirleri kırarak yükseldi. Zindan çöktü. Ve sen... artık burada değilsin.' },
            { speaker: 'SERA',     text: 'İnsanlar seni hatırlamayacak. Ama zindan duvarlarına kazılmış her rün, senin adını fısıldayacak. Elveda, son soyum.' },
        ],
        ending_iron: [
            { speaker: 'KARUN',    text: 'Gücü... aldın? Benden mi çaldın? Sen... sen benden daha güçlü müsün?' },
            { speaker: 'NARRATOR', text: 'Kârun\'un gücü yeni bir bedene geçti. Zindan hâlâ ayakta. Ejderin nefesi söndü, ama taht boş değil artık.' },
            { speaker: 'SERA',     text: 'Beklediğim bu değildi. Ama sen hayattasın. Belki... belki bu da bir zaferdir. Sonunda neye dönüşeceğini sen seçeceksin.' },
        ],
        ending_dark: [
            { speaker: 'KARUN',    text: '... Güldürme beni. Sen benden mi daha iyi olacaksın? Bu tahtı hak ettin mi, gerçekten? Bak kendine... bak neye dönüştün.' },
            { speaker: 'NARRATOR', text: 'Yeni bir Kârun doğdu. Zindan yeniden doldu. Karanlık sürdü — sadece farklı bir el tarafından.' },
            { speaker: 'SERA',     text: '... Sesini duyamıyorum artık. Sadece boşluk var. Umarım bir gün... geri dönersin.' },
        ],
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
        // Position dialog above the fixed bottom HUD overlay
        const rect = ctx.canvas.getBoundingClientRect();
        const scaleY = rect.height > 0 ? (H / rect.height) : 1;
        const hudMargin = Math.max(8, Math.round(150 * scaleY) + 6);
        const BY = H - BH - hudMargin;

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

        // Continue prompt blinks when text finished and not auto-advance.
        if (done && !this._current.auto) {
            const blink = Math.floor(Date.now() / 420) % 2 === 0;
            if (blink) {
                ctx.font      = "6px 'Press Start 2P'";
                ctx.fillStyle = sp.color;
                ctx.textAlign = 'right';
                ctx.fillText('[E/ENTER/TIK] DEVAM', BX + BW - 10, BY + BH - 9);
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
        const data = DIALOGUE_DATA.events[key];
        if (!data) return;
        this._evtCooldown[key] = now;
        // Sınıfa özel fısıltılar diziyse rastgele bir satır seç
        if (Array.isArray(data) && data.length > 0 && data[0].speaker) {
            // Tek diyalog nesnesi veya düz dizi
            this._enqueue(data, true);
        } else {
            this._enqueue(data, true);
        }
    },

    // Sınıfa özel level-up fısıltısını tetikle (game.js'ten çağrılır)
    triggerClassLevelUp(playerClass) {
        const keyMap = { mage: 'level_up_mage', warrior: 'level_up_warrior', ranger: 'level_up_ranger' };
        const key = keyMap[playerClass];
        if (!key) return;
        const now = Date.now();
        const COOL = 8000;
        if (this._evtCooldown[key] && now - this._evtCooldown[key] < COOL) return;
        const lines = DIALOGUE_DATA.events[key];
        if (!lines) return;
        this._evtCooldown[key] = now;
        // Sera ve Kârun satırından birini rastgele seç
        const picked = [lines[Math.floor(Math.random() * lines.length)]];
        this._enqueue(picked, true);
    },
};

window.DialogSystem = DialogSystem;
window.SPEAKERS     = SPEAKERS;
