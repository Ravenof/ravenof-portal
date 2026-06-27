// ════════════════════════════════════════════════════════════════════════════
// SAMPLE CAMPAIGN SEED — "Prazaro kilmė: Varngrado užrakinimas"
// Canon source: novelė „Varngradas / Tylos protokolas" (Atlas gairės + skyriai).
// World = Ravenoras · IP = Ravenof · prequel į Tylos Metus ir Mirties Maršo kilmę.
//
// CORE CANON (privaloma išlaikyti):
//  • Varngradas NE pralaimi — jis SĄMONINGAI tampa UŽRAKTU, sulaikančiu Belzatorą,
//    bet lieka uždarytas Inkvizicijos pietų užtvarų. Pabaiga = pergalė ir laidotuvės.
//  • Prazaras = Varngrado MARŠALAS (ne kapralas). Šioje novelėje jis NE piktadarys —
//    paliktas gynėjas su užkrėsta žaizda (būsimo Mirties Maršo kabliukas).
//  • Belzatoras NĖRA nužudomas — finale sužeistas ATSITRAUKIA į Vethago'o kelią.
//  • Saldas žūsta (~X–XI), įsmeigdamas ietį į Belzatoro žaizdą. Konstancijus žūsta (VIII,
//    „liudiju"). Klausas ir Mantas žūsta (IV). Vainius reanimuojasi (III). Regnaras
//    nužudomas (XV). Oglor'as lieka (manipuliatorius). Okuliaras – stebėtojas.
//  • Priešas = Demonų orda. Parama: Inkvizicijos legionas (griežta) ir Šviesos pulkas
//    (garbinga, bet ne paguodžianti). Mirties Maršas ČIA NENAUDOJAMAS kaip žaidėjo tapatybė.
//
// Battles run on the existing TutorialGame engine; advanced mission types currently
// play as a standard battle vs the configured enemy faction, scoring objectives from
// real battle stats (see CampaignRuntime + scenarioEngine). Deck packages below are
// the lore-accurate DESIGN target for future campaign-only cards.
// ════════════════════════════════════════════════════════════════════════════

import type { CampaignSeed } from '@/lib/campaign/seedTypes'

const ATLAS_EVENTS = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean)

export const prazarasVarngradasCampaign: CampaignSeed = {
  campaign: {
    seedKey: 'prazaras-varngradas',
    slug: 'prazaro-kilme-varngrado-uzrakinimas',
    title: 'Prazaro kilmė: Varngrado užrakinimas',
    subtitle: 'Demonų karas · Varngrado gynyba · užraktas, ne kapas',
    description:
      'Vethago’o Kalnas atsiveria ir Demonų orda griūva į šiaurę. Varngradas — pirmoji ' +
      'linija. Maršalas Prazaras laiko vartus su nepatogiais sąjungininkais: Inkvizicijos legionu ' +
      'ir Šviesos pulko Ordinu. Kai pietų Inkvizicija paskelbia miestą paaukota zona ir uždaro ' +
      'užtvaras, Varngradas pasirenka ne bėgti, o tapti užraktu. Belzatoras sužeidžiamas ir ' +
      'atsitraukia — bet vartai lieka užkalti. Pergalė ir laidotuvės vienu metu.',
    campaignType: 'story',
    lorePeriod: 'demonu-karas',
    relatedFactions: ['Demonų orda', 'Inkvizicijos legionas', 'Šviesos pulkas'],
    coverImageUrl: null,
    mapImageUrl: null,
    visibility: 'draft',
  },

  chapters: [
    { seedKey: 'ch1', sortOrder: 0, title: 'I skyrius: Pirmieji dūmai',
      description: 'Plyšys, mobilizacija ir pirmasis proveržis. Vethago’o Kalnas pradeda kvėpuoti.' },
    { seedKey: 'ch2', sortOrder: 1, title: 'II skyrius: Apgultis prasideda',
      description: 'Vartų ir sienos gynyba. Inkvizicijos ugnis ateina su savo kaina.' },
    { seedKey: 'ch3', sortOrder: 2, title: 'III skyrius: Šviesa ir pelenai',
      description: 'Šviesos pulkas, Tamsos Altorius, maras po oda. Prazaras perima vadovavimą.' },
    { seedKey: 'ch4', sortOrder: 3, title: 'IV skyrius: Užrakintas miestas',
      description: 'Pietūs uždaro ratą. Varngradas tampa užraktu. Belzatoras atsitraukia, bet vartai lieka užkalti.' },
  ],

  // ── CUTSCENES (Ravenof balsas; replikos imtos iš novelės skyrių) ──
  cutscenes: [
    { seedKey: 'cs00_pre', title: 'Prologas — Kai atsivėrė plyšys', type: 'dialogue', skippable: true, steps: [
      { id: 's1', side: 'narrator', text: 'Pirmasis ženklas buvo tai, kad Vethago’o Kalnas pradėjo kvėpuoti. Ne slinko. Ne griuvo. Kvėpavo.' },
      { id: 's2', side: 'left', characterName: 'Sargas Kernius', text: 'Tomai. Kalnas juda.' },
      { id: 's3', side: 'left', characterName: 'Dargis', text: 'Ar matai miško gaisrą? Ar matai plėšikus? Ar matai kariuomenę?' },
      { id: 's4', side: 'left', characterName: 'Sargas Kernius', text: 'Nežinau, ką matau.' },
      { id: 's5', side: 'left', characterName: 'Dargis', text: 'Tada raudoną signalą. Ir bėk į Varngradą. Duosi Prazarui — ne raštininkams, ne vartų sargams. Prazarui.' },
    ]},
    { seedKey: 'cs00_post', title: 'Prologas — Žinia pasiekia vartus', type: 'dialogue', skippable: true, steps: [
      { id: 's1', side: 'left', characterName: 'Kernius (paskutiniai žodžiai)', text: 'Jie neša marą. Ir vardus, kurie ne tavo. Belzatoras…' },
      { id: 's2', side: 'narrator', text: 'Dargio raštas — tik trys eilutės: „Vethago’o Kalnas atsivėrė. Demonai perėjo į mūsų pusę. Jei ši žinia pasiekė vartus — jūs esate pirmoji linija."' },
      { id: 's3', side: 'right', characterName: 'Maršalas Prazaras', text: 'Pakelkite visą miestą. Pabėgėlius — prie vidinių aikščių. Lankininkus — ant sienų. Pranešti Inkvizicijai ir Ordinui.' },
      { id: 's4', side: 'right', characterName: 'Prazaras', text: 'Rašyk: Varngradas laiko vartus.' },
    ]},

    { seedKey: 'cs01_pre', title: 'Varngradas kelia vartus', type: 'dialogue', skippable: true, steps: [
      { id: 's1', side: 'narrator', text: 'Varngradas pabudo ne nuo saulės. Nuo geležies. Varpai skambėjo be maldos — karo ritmu. Pro pietinius vartus plūdo pabėgėliai.' },
      { id: 's2', side: 'left', characterName: 'Inkvizitorius Madelius', text: 'Matau, jau spėjote pastatyti teismą prie vartų. Sveiki įleidžiami, juodų žymių paliesti — ne.' },
      { id: 's3', side: 'right', characterName: 'Prazaras', text: 'Jie prie mano vartų. Tikrinsim — bet sprendimas mano mieste yra mano.' },
      { id: 's4', side: 'left', characterName: 'Gunteris, Šviesos pulko vadas', text: 'Ordinas atvyko kautis ar ginčytis?' },
      { id: 's5', side: 'right', characterName: 'Prazaras', text: 'Kautis. Šiaurės keliuose — demonų žvalgai. Jie eina mūsų matuoti. Neleiskim išeiti su atsakymu.' },
    ]},
    { seedKey: 'cs01_post', title: 'Varngradas kelia vartus — Trijų jėgų frontas', type: 'dialogue', skippable: true, steps: [
      { id: 's1', side: 'right', characterName: 'Prazaras', text: 'Varngradas laikys vartus.' },
      { id: 's2', side: 'left', characterName: 'Gunteris', text: 'Tada Ordinas laikys kelią iki jų.' },
      { id: 's3', side: 'left', characterName: 'Madelius', text: 'O Inkvizicija laikys tai, ko jūs abu nenorite matyti.' },
      { id: 's4', side: 'narrator', text: 'Mėlynas Ordino mithrilas, auksinė Inkvizicijos liepsna ir pilka Varngrado geležis pirmą kartą stojo į vieną liniją. Bet pirmas įtrūkimas sąjungoje atsirado dar prieš pirmą mūšį.' },
    ]},

    { seedKey: 'cs02_pre', title: 'Pirmasis puolimas', type: 'dialogue', skippable: true, steps: [
      { id: 's1', side: 'narrator', text: 'Demonai nebėgo. Jie judėjo kaip kažkas, kas jau žino, kur stovės kiekvienas žmogus ant sienos. Virš jų kabėjo Okuliaro akis — ji matavo.' },
      { id: 's2', side: 'right', characterName: 'Prazaras', text: 'Nežiūrėti į mažųjų akis. Skydai aukščiau.' },
      { id: 's3', side: 'left', characterName: 'Eleonora Kraujoviesa', text: 'Jie ne mokosi. Jie kapstosi mūsų prisiminimuose. Oglor’as kalba per tai, kas dar kraujuoja.' },
    ]},
    { seedKey: 'cs02_post', title: 'Pirmasis puolimas — Tikri vardai prieš melus', type: 'dialogue', skippable: true, steps: [
      { id: 's1', side: 'narrator', text: 'Oglor’as šaukė artimųjų balsais nuo lauko. Konstancijus atsakė ne malda — vardais: „Arnas, sūnus Miglės. Gyvas. Įleistas." Belzatoras varė belaisvius prie angų.' },
      { id: 's2', side: 'left', characterName: 'Eleonora', text: 'Vaiko ranka jau juoda iki riešo. Jei trauksim visą — prarasim abu.' },
      { id: 's3', side: 'left', characterName: 'Arnas', text: 'Aš nenoriu kalbėti jų balsu. Greitai.' },
      { id: 's4', side: 'right', characterName: 'Prazaras', text: '(nukerta) Ne vartai pradėjo imti aukas. Aš. Ištraukit jį vidun — vardu, ne kaip dingusio.' },
    ]},
    { seedKey: 'cs02_fail', title: 'Pirmasis puolimas — Pralaimėjimas', type: 'dialogue', skippable: true, steps: [
      { id: 's1', side: 'left', characterName: 'Saldas', text: 'Siena neatlaikė. Regnaras pasiėmė, ką atėjo.' },
      { id: 's2', side: 'right', characterName: 'Prazaras', text: 'Tada renkam liniją iš naujo. Ir saugom vardus, ne tik akmenis.' },
    ]},

    { seedKey: 'cs03_pre', title: 'Maras po oda', type: 'dialogue', skippable: true, steps: [
      { id: 's1', side: 'narrator', text: 'Karantino palapinėje gulėjo Vainius iš Laukščių. Negyvas. Bent jau turėjo būti.' },
      { id: 's2', side: 'left', characterName: 'Vainius (lavonas)', text: 'Rasa. Kodėl atidavei mane šviesai?' },
      { id: 's3', side: 'left', characterName: 'Ema, miesto gydytoja', text: 'Tai ne jis. Jį valdo kvietimas. Vardas — skausmas — šviesa — ugnis. Tokia tvarka.' },
      { id: 's4', side: 'right', characterName: 'Prazaras', text: 'Nedeginam aklai. Kas pradeda dainuoti — tam pirma vardą.' },
    ]},
    { seedKey: 'cs03_post', title: 'Maras po oda — Protokolas', type: 'dialogue', skippable: true, steps: [
      { id: 's1', side: 'left', characterName: 'Vainius (paskutinis, savo balsu)', text: 'Neleisk man grįžti.' },
      { id: 's2', side: 'left', characterName: 'Eleonora', text: 'Kol žmogus pats gali atsisakyti kvietimo — jis dar žmogus. Tarpas mažas. Bet yra.' },
      { id: 's3', side: 'right', characterName: 'Prazaras', text: 'Tada kol nežinom, niekas čia nedegins gyvo žmogaus be mano įsakymo. Vardus rašom. Visus.' },
    ]},

    { seedKey: 'cs04_pre', title: 'Oglor’o melas', type: 'dialogue', skippable: true, steps: [
      { id: 's1', side: 'narrator', text: 'Oglor’as nepuolė sienos. Jis įėjo į miestą per ausis. Dingo įsakymai, paskui žodžiai, paskui pasitikėjimas. Trys pergamentai su Prazaro ženklu — nė vieno jis nerašė.' },
      { id: 's2', side: 'center', characterName: 'Balsas rūke (Oglor’as)', text: 'Atidaryk šonines duris. Įsakymas mano.' },
      { id: 's3', side: 'left', characterName: 'Klausas', text: 'Balsas tas pats… bet žodžiai ne jo.' },
    ]},
    { seedKey: 'cs04_post', title: 'Oglor’o melas — Trys liudininkai', type: 'dialogue', skippable: true, steps: [
      { id: 's1', side: 'narrator', text: 'Klausas, apgautas, nužudė Mantą ir atvėrė duris. Vėliau sulaikė Regnarą, kad Milė grįžtų. Žuvo rūke — ir žudikas, ir gelbėtojas.' },
      { id: 's2', side: 'right', characterName: 'Prazaras', text: 'Jei girdite mano balsą, bet nematote veido — netikėkite. Svarbų įsakymą liudys trys: Varngradas, Inkvizicija ir Ordinas.' },
      { id: 's3', side: 'center', characterName: 'Oglor’as', text: 'Jūs gražiai taisote mažus melus. Bus įdomu pamatyti, ką darysite su dideliu.' },
    ]},
    { seedKey: 'cs04_fail', title: 'Oglor’o melas — Pralaimėjimas', type: 'dialogue', skippable: true, steps: [
      { id: 's1', side: 'left', characterName: 'Gunteris', text: 'Šoninės durys atviros. Melas perėjo greičiau už mus.' },
      { id: 's2', side: 'right', characterName: 'Prazaras', text: 'Tada klausiam vėl: kas iš to laimi. Trys liudininkai. Visada.' },
    ]},

    { seedKey: 'cs05_pre', title: 'Tamsos Altorius', type: 'dialogue', skippable: true, steps: [
      { id: 's1', side: 'left', characterName: 'Eleonora', text: 'Jie nebespaudžia sienos. Jie spaudžia orą. Žibintų aliejus juoduoja. Šaltinis — Tamsos Altorius už miesto.' },
      { id: 's2', side: 'left', characterName: 'Arnas', text: 'Jei neduosiu kraujo, ar sakys, kad dėl manęs mirė žmonės?' },
      { id: 's3', side: 'left', characterName: 'Ema', text: 'Jei kas nors taip pasakys, aš jam sulaužysiu nosį. Visiems, jei reikės.' },
      { id: 's4', side: 'left', characterName: 'Gunteris', text: 'Smogiamoji grupė. Greitai. Be heroizmo.' },
    ]},
    { seedKey: 'cs05_post', title: 'Tamsos Altorius — Indas, ne alkis', type: 'dialogue', skippable: true, steps: [
      { id: 's1', side: 'center', characterName: 'Velnio advokatas', text: 'Tu manai, kad jeigu pakankamai tiksliai pavadinsi pjūvį, jis nustos būti žiaurumas. Kiekvienas smūgis čia turi kainą.' },
      { id: 's2', side: 'left', characterName: 'Eleonora', text: 'Raudonas kraujas, mėlynas mithrilas, auksinė liepsna — į juodą šerdį. Dabar!' },
      { id: 's3', side: 'center', characterName: 'Velnio advokatas', text: 'Kvaila. Jūs sudaužėte indą, bet ne alkį.' },
      { id: 's4', side: 'right', characterName: 'Prazaras', text: 'Altorius pažeistas. Belzatoras atsakys pilnu smūgiu. Ruoškit sieną.' },
    ]},

    { seedKey: 'cs06_pre', title: 'Karantino taryba', type: 'dialogue', skippable: true, steps: [
      { id: 's1', side: 'left', characterName: 'Inkvizitorius Raukta', text: 'Maršale Prazarai. Pietinė Inkvizicijos taryba perima Varngrado karantino valdymą.' },
      { id: 's2', side: 'right', characterName: 'Prazaras', text: 'Varngradas vis dar kovoja. Valdymas neperduodamas. Saugom savus vardais, ne svetimu protokolu.' },
      { id: 's3', side: 'left', characterName: 'Rasa', text: 'Jei kalbėsit apie vartus, kalbėsit ir apie tuos, kurie stovi prie jų iš vidinės pusės. Atskirsit — atskirkit vardais ir šeimom.' },
    ]},
    { seedKey: 'cs06_post', title: 'Karantino taryba — Du priešai', type: 'dialogue', skippable: true, steps: [
      { id: 's1', side: 'left', characterName: 'Alarikas Teisusis', text: 'O kai pamatysite, kad miestas prarastas?' },
      { id: 's2', side: 'left', characterName: 'Madelius', text: 'Tada aš pats jį sudeginsiu. Iki tol mano žibintai lieka Varngrade.' },
      { id: 's3', side: 'narrator', text: 'Raukta ir Pietinė Inkvizicija pradėjo statyti užtvaras. Nuo dabar Varngradas turėjo du priešus: ordą šiaurėje ir izoliaciją pietuose.' },
    ]},

    { seedKey: 'cs07_pre', title: 'Paskutinė evakuacija', type: 'dialogue', skippable: true, steps: [
      { id: 's1', side: 'left', characterName: 'Rasa', text: 'Penki vaikai prie vieno suaugusio. Pagal būrius, ne pagal šeimas. Jei myli — paleisk greičiau.' },
      { id: 's2', side: 'right', characterName: 'Prazaras', text: 'Pro rytinį griovį, kol pietūs neuždarė tarpo. Kiekvienas perėjęs vaikas — diena, kurią nupirkom.' },
      { id: 's3', side: 'left', characterName: 'Silelora (kaukėta žibinto nešėja)', text: 'Po patikrinimo praleisiu pirmą grupę. Raukta priešinsis.' },
    ]},
    { seedKey: 'cs07_post', title: 'Paskutinė evakuacija — Kelias užsidaro', type: 'dialogue', skippable: true, steps: [
      { id: 's1', side: 'left', characterName: 'Arnas', text: 'Aš neturiu rankos. Jei bijot nešėjų — tikrinkit. Bet jei bijot vaikų, tai sakykit taip.' },
      { id: 's2', side: 'left', characterName: 'Gunteris', text: 'Aš nesideru. Aš skubu.' },
      { id: 's3', side: 'narrator', text: 'Vaikai perėjo. Belzatoras smogė vartus. Evakuacijos kelias užsidarė — likę tapo frontu.' },
      { id: 's4', side: 'right', characterName: 'Prazaras', text: 'Nuo šiol niekas nebelaukia masinio išėjimo. Likę stovi vartų vietoje.' },
    ]},
    { seedKey: 'cs07_fail', title: 'Paskutinė evakuacija — Pralaimėjimas', type: 'dialogue', skippable: true, steps: [
      { id: 's1', side: 'left', characterName: 'Rasa', text: 'Per daug liko ant kelio. Smaigai nelaukė patikrinimo.' },
      { id: 's2', side: 'right', characterName: 'Prazaras', text: 'Tada vardus tų, kurie krito, rašom pirmus. Kad niekas nevadintų jų skaičiumi.' },
    ]},

    { seedKey: 'cs08_pre', title: 'Užkalti vartai', type: 'dialogue', skippable: true, steps: [
      { id: 's1', side: 'narrator', text: 'Pietuose suskambo Inkvizicijos varpai: užtvaros baigtos. Šiaurėje Belzatoras pakėlė kirvį. Varngradas tapo nepaklusniu miestu.' },
      { id: 's2', side: 'left', characterName: 'Tėvas Konstancijus', text: 'Rašau ne tam, kad išgelbėčiau. Rašau, kad niekas neperrašytų.' },
      { id: 's3', side: 'right', characterName: 'Prazaras', text: 'Jei vartai kris — barikada laiko. Jei barikada — gatvė. Jei gatvė — namai. Mokam už kiekvieną akmenį.' },
    ]},
    { seedKey: 'cs08_post', title: 'Užkalti vartai — Liudiju', type: 'dialogue', skippable: true, steps: [
      { id: 's1', side: 'left', characterName: 'Konstancijus', text: 'Liudiju: Varngradas laikė vartus. Liudiju: žmonės viduje buvo gyvi. Liudiju: kas juos užrakins — nebegalės sakyti, kad nežinojo.' },
      { id: 's2', side: 'left', characterName: 'Madelius', text: '(atidaro žibinto šerdį) Tu nori miesto?' },
      { id: 's3', side: 'left', characterName: 'Ema', text: 'Išjunkit! Šviesa degina pilkus!' },
      { id: 's4', side: 'right', characterName: 'Prazaras', text: 'Konstancijus mirė su „liudiju". Balta šviesa atstūmė demonus — ir sudegino savus. Šviesa degina taip pat baisiai kaip tamsa.' },
    ]},
    { seedKey: 'cs08_fail', title: 'Užkalti vartai — Pralaimėjimas', type: 'dialogue', skippable: true, steps: [
      { id: 's1', side: 'narrator', text: 'Vartai krito greičiau, nei spėjo barikada.' },
      { id: 's2', side: 'right', characterName: 'Prazaras', text: 'Atsitraukt į antrą liniją. Niekas nepalieka spragos atviros — užtverkit kūnais, jei reikės.' },
    ]},

    { seedKey: 'cs09_pre', title: 'Miestas be ryto', type: 'dialogue', skippable: true, steps: [
      { id: 's1', side: 'narrator', text: 'Ryto nebeliko ir antrą dieną. Regnaras prasibrovė ne per vartus — per užkrėstą šulinį. Ir puolė ne ligonius. Vardų lentas.' },
      { id: 's2', side: 'left', characterName: 'Regnaras Mėgdžiotojas', text: 'Tavo miestas pilnas atvirų durų, maršale. Vardai lūžta lengviau nei vartai.' },
      { id: 's3', side: 'right', characterName: 'Prazaras', text: 'Jei sulaužys vardus — ligoniai sustiprės. Saugom lentas kaip sieną.' },
    ]},
    { seedKey: 'cs09_post', title: 'Miestas be ryto — Priešas po miestu', type: 'dialogue', skippable: true, steps: [
      { id: 's1', side: 'narrator', text: 'Lentas apgynė. Regnaras nėrė atgal į šulinį: „Vardai lūžta lengviau nei vartai." Šulinį užvertė akmenimis.' },
      { id: 's2', side: 'left', characterName: 'Belzatoras', text: 'Miestas jau valgo save.' },
      { id: 's3', side: 'right', characterName: 'Prazaras', text: 'Ne. (sau) Sienos nebepakanka. Priešas jau po miestu.' },
    ]},

    { seedKey: 'cs10_pre', title: 'Paskutinė rikiuotė', type: 'dialogue', skippable: true, steps: [
      { id: 's1', side: 'narrator', text: 'Belzatoras atėjo su visa orda — ne testuoti, o pasiimti. Vartų kiemas buvo paskutinė riba.' },
      { id: 's2', side: 'right', characterName: 'Prazaras', text: 'Vartų kiemas laiko. Kai jis įkiš galvą — numesim grandinę, žibintus į žaizdą, ir smogsim viskuo.' },
      { id: 's3', side: 'left', characterName: 'Saldas', text: 'Grandinė nesustabdys jo.' },
      { id: 's4', side: 'right', characterName: 'Prazaras', text: 'Ne. Bet privers pasilenkti.' },
    ]},
    { seedKey: 'cs10_post', title: 'Paskutinė rikiuotė — Vartų nebėra', type: 'dialogue', skippable: true, steps: [
      { id: 's1', side: 'narrator', text: 'Šiauriniai vartai, laikę kelią šimtmečius, subyrėjo. Krintantys akmenys, grandinė ir žibintai į išdegtą akį privertė Belzatorą pirmą kartą atsitraukti — sužeistą.' },
      { id: 's2', side: 'left', characterName: 'Belzatoras', text: 'Dabar žinau jūsų kainą.' },
      { id: 's3', side: 'right', characterName: 'Prazaras', text: 'Ne. Tik pirmą įmoką.' },
      { id: 's4', side: 'right', characterName: 'Prazaras', text: 'Vartų nebėra. Dabar žmonės yra vartai.' },
    ]},
    { seedKey: 'cs10_fail', title: 'Paskutinė rikiuotė — Pralaimėjimas', type: 'dialogue', skippable: true, steps: [
      { id: 's1', side: 'left', characterName: 'Gunteris', text: 'Grandinė neįsitempė laiku. Jis dar nepajuto.' },
      { id: 's2', side: 'right', characterName: 'Prazaras', text: 'Tada ruošiam iš naujo. Jis pajus.' },
    ]},

    { seedKey: 'cs11_pre', title: 'Kai šviesa užsidaro', type: 'dialogue', skippable: true, steps: [
      { id: 's1', side: 'narrator', text: 'Pietų pergamentas: „Varngradas laikomas paaukota zona." Oglor’as iš lavonų sukrovė veidrodį ir rodė miestui tiesą be priežasties.' },
      { id: 's2', side: 'left', characterName: 'Madelius', text: 'Aš žinojau apie protokolą nuo pirmos dienos. Atėjau, nes jei nebūčiau — ta riba būtų išnykusi pirmą naktį.' },
      { id: 's3', side: 'center', characterName: 'Oglor’as', text: 'Šviesa, kuri gelbėja. Šviesa, kuri degina. Abu sakiniai teisingi.' },
      { id: 's4', side: 'right', characterName: 'Prazaras', text: 'Jie mus vadina zona. Mes taip nevadinsim.' },
    ]},
    { seedKey: 'cs11_post', title: 'Kai šviesa užsidaro — Saldos kaina', type: 'dialogue', skippable: false, steps: [
      { id: 's1', side: 'narrator', text: 'Belzatoras įžengė per degantį veidrodį. Saldas žengė priekin — ne atgal.' },
      { id: 's2', side: 'left', characterName: 'Saldas', text: '(įsmeigęs ietį į žaizdą) Dabar būtų gera grandinė. Stumkit.' },
      { id: 's3', side: 'narrator', text: 'Ietis su sidabru ir Arno krauju įėjo giliau. Belzatoras gravo sužeistas atsitraukė. Saldas — nebe.' },
      { id: 's4', side: 'left', characterName: 'Belzatoras', text: 'Jūs ne miestas. Jūs kapas su ginklais.' },
      { id: 's5', side: 'right', characterName: 'Prazaras', text: 'Tada lipk atsargiai. (rašo) „Saldas, Varngrado kapitonas. Laikė vartus, kai vartų nebebuvo. Blogai klausė įsakymų."' },
    ]},

    { seedKey: 'cs12_pre', title: 'Užtvėrimas', type: 'dialogue', skippable: true, steps: [
      { id: 's1', side: 'left', characterName: 'Raukta', text: 'Pietinė taryba patvirtino pilną užtvėrimą. Nuo sutemų joks žmogus, daiktas ar žinia nepaliks Varngrado.' },
      { id: 's2', side: 'left', characterName: 'Madelius', text: 'Užrašykit tiksliai: aš jau perėjau į nepaklusnumą. Paveiktas žmonių, kuriuos dar bandžiau išgelbėti.' },
      { id: 's3', side: 'left', characterName: 'Eleonora', text: 'Riba užsidaro. Šventintas ratas traiško viską, kas nestabilu. Pilkus reikia traukti nuo pietų spaudimo.' },
    ]},
    { seedKey: 'cs12_post', title: 'Užtvėrimas — Indas', type: 'dialogue', skippable: true, steps: [
      { id: 's1', side: 'left', characterName: 'Belzatoras', text: 'Atidaryk pietus. Priversk juos deginti gyvus. Tada ateik pas mane su tikra neapykanta.' },
      { id: 's2', side: 'right', characterName: 'Prazaras', text: 'Ne. Ginu tai, kas liko tarp jūsų abiejų.' },
      { id: 's3', side: 'narrator', text: 'Užtvėrimas pavertė Varngradą ne tvirtove — indu. Ir kažkas jau pradėjo spausti jo sienas iš vidaus.' },
    ]},

    { seedKey: 'cs13_pre', title: 'Indas', type: 'dialogue', skippable: true, steps: [
      { id: 's1', side: 'left', characterName: 'Ieva iš Laukščių', text: '(vemia juodą vandenį) Vartų nebėra. Indas turi dugną. Dugnas arčiau nei dangtis. Po miestu beldžia.' },
      { id: 's2', side: 'left', characterName: 'Eleonora', text: 'Užkratas eina per drenažą ir senas kapavietes po rotuše. Reikia užverti dugną — sidabru ir žibintais.' },
      { id: 's3', side: 'right', characterName: 'Prazaras', text: 'Griaunam koloną, užkemšam kanalą. Tautvydai — su manimi.' },
    ]},
    { seedKey: 'cs13_post', title: 'Indas — Dugnas užvertas', type: 'dialogue', skippable: true, steps: [
      { id: 's1', side: 'center', characterName: 'Oglor’as', text: 'Vadas, kuris griauna pagrindą, kad išgelbėtų stogą. Gražu.' },
      { id: 's2', side: 'right', characterName: 'Prazaras', text: 'Prazaras. Varngrado maršalas. (smogia kolonai)' },
      { id: 's3', side: 'narrator', text: 'Kolona griuvo ir užkimšo kanalą. Indo dugnas sandarus. Varngradas užrakintas ir iš apačios, ir iš viršaus — bet nebeskilo.' },
    ]},

    { seedKey: 'cs14_pre', title: 'Užrakintųjų sprendimas', type: 'dialogue', skippable: true, steps: [
      { id: 's1', side: 'narrator', text: 'Taryba renkasi prie vardų lentų — jei spręs dėl miesto, tegul spręs ten, kur miestas dar turi veidus.' },
      { id: 's2', side: 'right', characterName: 'Prazaras', text: 'Mes nebelaukiame kelio. Varngradas — ne miestas, laukiantis evakuacijos. Varngradas yra užraktas.' },
      { id: 's3', side: 'left', characterName: 'Ema', text: 'Tada ką duodi žmonėms vietoj vilties?' },
      { id: 's4', side: 'right', characterName: 'Prazaras', text: 'Darbą. Vardus. Sieną, kuria tapsime patys.', choices: [
        { key: 'name', label: 'Likti prie vardų' }, { key: 'wall', label: 'Likti prie sienos' }, { key: 'water', label: 'Likti prie vandens' },
      ] },
    ]},
    { seedKey: 'cs14_post', title: 'Užrakintųjų sprendimas — Darbų sąrašas', type: 'dialogue', skippable: true, steps: [
      { id: 's1', side: 'narrator', text: 'Balsai kilo ne kaip džiaugsmas. Kaip darbų sąrašas. Tai buvo geriau — džiaugsmas būtų buvęs melas.' },
      { id: 's2', side: 'left', characterName: 'Sena moteris prie lentų', text: 'Aš lieku prie vardų.' },
      { id: 's3', side: 'right', characterName: 'Prazaras', text: 'Tada laikom. Vardas, liudininkas, darbas. Ne išgelbėjimas — užraktas.' },
    ]},

    { seedKey: 'cs15_pre', title: 'Paskutinė naktis', type: 'dialogue', skippable: true, steps: [
      { id: 's1', side: 'left', characterName: 'Laima', text: 'Mano Ugnė pietuose! Atidaryk vartus!' },
      { id: 's2', side: 'left', characterName: 'Ema', text: 'Nemeluok sau, kad tai kelias. Sakyk taip, kaip yra: nebegali kvėpuoti nuo laukimo.' },
      { id: 's3', side: 'right', characterName: 'Prazaras', text: 'Tavo darbas čia — atsiminti, kad Ugnė turi kam laikyti ranką pietuose. Ir laikyti vardus čia.' },
    ]},
    { seedKey: 'cs15_post', title: 'Paskutinė naktis — Mėgdžiotojo mirtis', type: 'dialogue', skippable: true, steps: [
      { id: 's1', side: 'left', characterName: 'Regnaras', text: '(prie Prazaro žaizdos) Atidaryk.' },
      { id: 's2', side: 'narrator', text: 'Prazaras įsmeigė sidabro smaigą Regnarui po žandikauliu. Mėgdžiotojas neteko gerklės.' },
      { id: 's3', side: 'left', characterName: 'Gunteris', text: '(kerta) Šitas už Klausą.' },
      { id: 's4', side: 'left', characterName: 'Eleonora', text: 'Regnaras miręs. Bet Belzatoras nesitraukia — jis keičia centrą. Užtvaros. Prie vaikų stovyklos.' },
    ]},
    { seedKey: 'cs15_fail', title: 'Paskutinė naktis — Pralaimėjimas', type: 'dialogue', skippable: true, steps: [
      { id: 's1', side: 'left', characterName: 'Ema', text: 'Jis palietė žaizdą. Juoda gija kyla. Vardas?' },
      { id: 's2', side: 'right', characterName: 'Prazaras', text: 'Prazaras. Varngrado maršalas. Greičiau — kol balsas dar mano.' },
    ]},

    { seedKey: 'cs16_pre', title: 'Varngradas nekrenta', type: 'dialogue', skippable: true, steps: [
      { id: 's1', side: 'narrator', text: 'Belzatoras nepuola miesto. Jis daužo pietų užtvarų mazgus — spyną, kurią Inkvizicija pati uždėjo ant Varngrado. Už trečios linijos klykia vaikai.' },
      { id: 's2', side: 'right', characterName: 'Prazaras', text: 'Atidarykit pietinius vartus. Ne bėgti — smogti į mazgus iš vidaus. Padėsim pietums laikyti jų pačių užtvarą.' },
      { id: 's3', side: 'left', characterName: 'Raukta', text: 'Jei atversiu ratą, užkratas išeis.' },
      { id: 's4', side: 'left', characterName: 'Silelora', text: 'Atverk segmentą. Ne miestą.' },
      { id: 's5', side: 'right', characterName: 'Prazaras', text: 'Varngradas išeina ne bėgti. Varngradas išeina laikyti.' },
    ]},
    { seedKey: 'cs16_post', title: 'Varngradas nekrenta — Pergalė ir laidotuvės', type: 'cinematic', skippable: false, steps: [
      { id: 's1', side: 'narrator', text: 'Inkvizicijos šviesa, Ordino plienas ir Varngrado kraujas pirmą kartą smogė ne vienas kitam — į vieną priešą.' },
      { id: 's2', side: 'right', characterName: 'Prazaras', text: '(stumdamas ietį) Noriu, kad tu neišeitum.' },
      { id: 's3', side: 'narrator', text: 'Belzatoras krito ant kelio, krūtinėje — Varngrado ietis, Saldos žaizda vėl atverta. Ne sunaikintas — bet jo žingsniai tapo sužeisto karaliaus žingsniais. Orda pasitraukė į Vethago’o kelią.' },
      { id: 's4', side: 'left', characterName: 'Prazaras', text: 'Atidarysi?' },
      { id: 's5', side: 'left', characterName: 'Raukta', text: 'Ratas lieka. Vienas kanalas. Per Silelorą. Viskas tikrinama.' },
      { id: 's6', side: 'right', characterName: 'Prazaras', text: 'Varngradas nekrenta. Ne kaip miestas, kuris tikisi išsigelbėti — kaip miestas, kuris nusprendė, kad jo pabaiga nepriklausys priešui.' },
    ]},

    { seedKey: 'cs17_epilogue', title: 'Epilogas — Tylos protokolas', type: 'cinematic', skippable: false, steps: [
      { id: 's1', side: 'narrator', text: 'Pirmas oficialus raportas vadinosi „Dėl Varngrado paaukotos zonos sulaikymo". Jame nebuvo Prazaro vardo.' },
      { id: 's2', side: 'left', characterName: 'Arnas', text: 'Prazaras, Varngrado maršalas. Nukirto man ranką, kad prakeiksmas neišeitų. Aš gyvas.' },
      { id: 's3', side: 'left', characterName: 'Rasa', text: 'Jie vadina Varngradą zona. Mes vadinsim vardais.' },
      { id: 's4', side: 'left', characterName: 'Silelora', text: 'Vieną kopiją — toliau. Su vardais. (vėliau dingsta iš oficialių sąrašų)' },
      { id: 's5', side: 'left', characterName: 'Ema', text: 'Vardas?' },
      { id: 's6', side: 'right', characterName: 'Prazaras', text: 'Prazaras. Varngrado maršalas.' },
      { id: 's7', side: 'left', characterName: 'Ema', text: 'Pareiga?' },
      { id: 's8', side: 'right', characterName: 'Prazaras', text: 'Laikyti.' },
      { id: 's9', side: 'narrator', text: 'Kanalas siaurėjo. Prasidėjo Tylos protokolas — tiltas į Tylos Metus ir Mirties Maršo kilmę. Po metų ant akmens prie senosios pietų linijos kažkas išraižė: „Varngradas nekrenta. Kol vardai laikosi." O prie pat žemės — paskutinį žodį: „Laikyti."' },
    ]},
  ],

  // ── 18 NODES (kanono struktūra; mūšiai veikia ant esamos TutorialGame variklio) ──
  nodes: [
    { seedKey: 'node00', chapterSeedKey: 'ch1', title: 'Prologas: Kai atsivėrė plyšys', subtitle: 'Vethago’o Kalnas',
      loreText: 'Sargybos bokšte septyni vyrai mato, kaip atsiveria plyšys. Kernius siunčiamas perspėti Varngradą.',
      posX: 19, posY: 12, iconType: 'story', missionType: 'STORY_ONLY', unlockRule: { type: 'always' },
      nextSeedKeys: ['node01'], preCutsceneSeedKey: 'cs00_pre', postCutsceneSeedKey: 'cs00_post',
      objectives: [{ id: 'warn', kind: 'win', label: 'Perduok įspėjimą Prazarui', primary: true }],
      rewardPayload: { exp: 40, codexUnlocks: ['vethago-kalno-plysys'] },
      sourceChapter: 'Prologas', sourceEventIds: ATLAS_EVENTS('E00-01, E00-02'),
      canonSummary: 'Plyšio atidarymas; Kernius pasiekia Varngradą su žinia. Belzatoras pereina į mūsų pusę.',
      canonCharacters: ['Kernius', 'Dargis', 'Tomas', 'Prazaras'], canonLocations: ['Vethago’o Kalnas', 'Varngrado vartai'] },

    { seedKey: 'node01', chapterSeedKey: 'ch1', title: 'Varngradas kelia vartus', subtitle: 'Pabėgėlių aikštė',
      loreText: 'Mobilizacija. Atvyksta pabėgėliai, Inkvizicija ir Šviesos pulko Ordinas — trijų jėgų frontas.',
      posX: 28, posY: 20, iconType: 'battle', missionType: 'STANDARD_CARD_BATTLE', unlockRule: { type: 'all_prev' },
      prevSeedKeys: ['node00'], nextSeedKeys: ['node02'],
      preCutsceneSeedKey: 'cs01_pre', postCutsceneSeedKey: 'cs01_post',
      objectives: [{ id: 'win', kind: 'win', label: 'Sutriuškink demonų žvalgus', primary: true },
                   { id: 'fast', kind: 'defeat_within', label: 'Laimėk iki 10 ėjimo', primary: false, params: { turns: 10 } }],
      battleConfig: { playerDeckMode: 'collection', enemyDeckMode: 'faction', enemyFactionName: 'Demonų orda', enemyName: 'Demonų žvalgai', difficulty: 'easy', aiProfile: 'aggressive', storyDeckPackage: 'pkg1' },
      rewardPayload: { gold: 120, exp: 60 },
      sourceChapter: 'I', sourceEventIds: ATLAS_EVENTS('E01-01, E01-02, E01-03'),
      canonSummary: 'Varngradas mobilizuojamas; pabėgėliai; Inkvizicija ir Ordinas atvyksta kaip nepatogūs sąjungininkai.',
      canonCharacters: ['Prazaras', 'Saldas', 'Ema', 'Rasa', 'Madelius', 'Konstancijus', 'Gunteris', 'Alarikas'], canonLocations: ['Varngrado vartai', 'Pabėgėlių aikštė'] },

    { seedKey: 'node02', chapterSeedKey: 'ch1', title: 'Pirmasis puolimas', subtitle: 'Šiaurinė siena',
      loreText: 'Pirmoji demonų banga tikrina sieną. Okuliaras žymi silpnybes, Oglor’as klaidina, Regnaras medžioja vaikus.',
      posX: 37, posY: 25, iconType: 'gate', missionType: 'GATE_DEFENSE', unlockRule: { type: 'all_prev' },
      prevSeedKeys: ['node01'], nextSeedKeys: ['node03'],
      preCutsceneSeedKey: 'cs02_pre', postCutsceneSeedKey: 'cs02_post', failureCutsceneSeedKey: 'cs02_fail',
      objectives: [{ id: 'win', kind: 'win', label: 'Atremk pirmąją bangą', primary: true },
                   { id: 'gate', kind: 'protect_objective', label: 'Siena išlieka su ≥10 HP', primary: false, params: { objectiveId: 'wall', hp: 10 } },
                   { id: 'kids', kind: 'keep_alive_count', label: 'Išgelbėk Arną ir Milę', primary: false, params: { count: 1, tag: 'child' } }],
      battleConfig: { playerDeckMode: 'collection', enemyDeckMode: 'faction', enemyFactionName: 'Demonų orda', enemyName: 'Pirmoji banga', difficulty: 'normal', aiProfile: 'objective_attacker', storyDeckPackage: 'pkg1' },
      scenario: { objectives: [{ id: 'wall', kind: 'wall', label: 'Šiaurinė siena', hp: 20, maxHp: 20, side: 'player' }],
        rules: [{ trigger: 'onTurnStart', turn: 3, actions: [{ type: 'dialogue', text: 'Oglor’as: girdi? Tai jų balsai…', characterName: 'Oglor’as' }] }] },
      rewardPayload: { gold: 150, exp: 80, cardMin: 'magic' },
      sourceChapter: 'II', sourceEventIds: ATLAS_EVENTS('E02-01, E02-02, E02-03'),
      canonSummary: 'Impai, kirminai, dyglių velniai ir Okuliaras testuoja sieną; Oglor’o balsai; Prazaras ir Gunteris gelbsti Arną ir Milę.',
      canonCharacters: ['Prazaras', 'Saldas', 'Gunteris', 'Okuliaras', 'Oglor’as', 'Regnaras', 'Arnas', 'Milė'], canonLocations: ['Šiauriniai vartai', 'Sienos'] },

    { seedKey: 'node03', chapterSeedKey: 'ch1', title: 'Maras po oda', subtitle: 'Karantino aikštė',
      loreText: 'Vainius reanimuojasi. Sukuriamas vardas–skausmas–šviesa–ugnis protokolas. Arnas paaukoja ranką.',
      posX: 30, posY: 33, iconType: 'elite', missionType: 'CUSTOM', unlockRule: { type: 'all_prev' },
      prevSeedKeys: ['node02'], nextSeedKeys: ['node04'],
      preCutsceneSeedKey: 'cs03_pre', postCutsceneSeedKey: 'cs03_post',
      objectives: [{ id: 'win', kind: 'win', label: 'Stabilizuok karantiną', primary: true },
                   { id: 'few', kind: 'no_more_than', label: 'Nedegink aklai (≤3 burtai)', primary: false, params: { count: 3 } }],
      battleConfig: { playerDeckMode: 'collection', enemyDeckMode: 'faction', enemyFactionName: 'Demonų orda', enemyName: 'Užkratas', difficulty: 'normal', aiProfile: 'chaotic_demon', storyDeckPackage: 'pkg1' },
      scenario: { startingCurses: [], rules: [{ trigger: 'onTurnStart', everyTurns: 2, actions: [{ type: 'dialogue', text: 'Kažkas pradeda dainuoti… vardą!', characterName: 'Ema' }] }] },
      rewardPayload: { gold: 160, exp: 90, codexUnlocks: ['vardas-skausmas-sviesa-ugnis-protokolas'] },
      sourceChapter: 'III', sourceEventIds: ATLAS_EVENTS('E03-01, E03-02, E03-03'),
      canonSummary: 'Užkrato logika ir karantino protokolas; Arno rankos auka, kad prakeiksmas neišeitų.',
      canonCharacters: ['Vainius', 'Ema', 'Eleonora', 'Arnas', 'Prazaras'], canonLocations: ['Karantino aikštė'] },

    { seedKey: 'node04', chapterSeedKey: 'ch1', title: 'Oglor’o melas', subtitle: 'Šoninės durys',
      loreText: 'Suklastoti įsakymai Prazaro balsu. Klausas atveria duris ir nužudo Mantą, vėliau sulaiko Regnarą už Milę.',
      posX: 41, posY: 33, iconType: 'siege', missionType: 'AMBUSH', unlockRule: { type: 'all_prev' },
      prevSeedKeys: ['node03'], nextSeedKeys: ['node05', 'node06'],
      preCutsceneSeedKey: 'cs04_pre', postCutsceneSeedKey: 'cs04_post', failureCutsceneSeedKey: 'cs04_fail',
      objectives: [{ id: 'win', kind: 'win', label: 'Sustabdyk proveržį pro šonines duris', primary: true },
                   { id: 'mile', kind: 'keep_alive_count', label: 'Išsaugok Milę', primary: false, params: { count: 1, tag: 'child' } }],
      battleConfig: { playerDeckMode: 'collection', enemyDeckMode: 'faction', enemyFactionName: 'Demonų orda', enemyName: 'Oglor’o klasta', difficulty: 'normal', aiProfile: 'tactical', storyDeckPackage: 'pkg1' },
      scenario: { startingEnemyBoard: [], rules: [{ trigger: 'onCardPlayed', actions: [{ type: 'dialogue', text: 'Balsas: „Įsakymas mano." (be liudininko – netikėk)', characterName: 'Oglor’as' }], once: true }] },
      rewardPayload: { gold: 170, exp: 100, codexUnlocks: ['triju-liudijimu-protokolas'] },
      sourceChapter: 'IV', sourceEventIds: ATLAS_EVENTS('E04-01, E04-02, E04-03'),
      canonSummary: 'Triple-witness protokolas (Varngradas + Inkvizicija + Ordinas) gimsta po Oglor’o melo. Klausas ir Mantas žūsta.',
      canonCharacters: ['Oglor’as', 'Klausas', 'Mantas', 'Milė', 'Regnaras', 'Gunteris', 'Prazaras'], canonLocations: ['Šoninės durys', 'Vartų vidus'] },

    { seedKey: 'node05', chapterSeedKey: 'ch2', title: 'Tamsos Altorius', subtitle: 'Už miesto',
      loreText: 'Smogiamoji grupė naikina ritualinį mazgą. Arno kraujo riba silpnina altorių; Velnio advokatas siūlo sandėrius.',
      posX: 53, posY: 23, iconType: 'boss', missionType: 'CUSTOM', unlockRule: { type: 'any_prev' },
      prevSeedKeys: ['node04'], nextSeedKeys: ['node06'],
      preCutsceneSeedKey: 'cs05_pre', postCutsceneSeedKey: 'cs05_post',
      objectives: [{ id: 'win', kind: 'win', label: 'Sunaikink Tamsos Altorių', primary: true },
                   { id: 'fast', kind: 'defeat_within', label: 'Spėk iki turn 12 (kol ritualas neįsibėgėjo)', primary: false, params: { turns: 12 } }],
      battleConfig: { playerDeckMode: 'collection', enemyDeckMode: 'faction', enemyFactionName: 'Demonų orda', enemyName: 'Ritualo sargai', difficulty: 'hard', aiProfile: 'protector', storyDeckPackage: 'pkg2' },
      scenario: { objectives: [{ id: 'altar', kind: 'relic', label: 'Tamsos Altorius', hp: 24, maxHp: 24, side: 'enemy' }] },
      rewardPayload: { gold: 200, exp: 110, cardMin: 'unique' },
      sourceChapter: 'V', sourceEventIds: ATLAS_EVENTS('E05-01, E05-02'),
      canonSummary: 'Pirmas aktyvus kontrsmūgis prieš demonų ritualus; altorius pažeistas, bet provokuoja pilną puolimą.',
      canonCharacters: ['Gunteris', 'Eleonora', 'Doriana', 'Arnas', 'Velnio advokatas', 'Prazaras'], canonLocations: ['Tamsos Altorius'] },

    { seedKey: 'node06', chapterSeedKey: 'ch2', title: 'Karantino taryba', subtitle: 'Tarybos vieta',
      loreText: 'Varngradas atsisako perduoti vartus išorinei Inkvizicijai. Pietuose pradedamos užtvaros.',
      posX: 33, posY: 42, iconType: 'story', missionType: 'STORY_ONLY', unlockRule: { type: 'all_prev' },
      prevSeedKeys: ['node05'], nextSeedKeys: ['node07'],
      preCutsceneSeedKey: 'cs06_pre', postCutsceneSeedKey: 'cs06_post',
      objectives: [{ id: 'decide', kind: 'win', label: 'Apsispręsk dėl miesto laikysenos', primary: true }],
      rewardPayload: { exp: 70 },
      sourceChapter: 'VI', sourceEventIds: ATLAS_EVENTS('E06-01, E06-02'),
      canonSummary: 'Politinis lūžis: prasideda Varngrado ir Pietinės Inkvizicijos konfliktas. Antras priešas – izoliacija.',
      canonCharacters: ['Prazaras', 'Madelius', 'Gunteris', 'Alarikas', 'Ema', 'Eleonora', 'Raukta'], canonLocations: ['Tarybos vieta', 'Pietinės užtvaros'] },

    { seedKey: 'node07', chapterSeedKey: 'ch2', title: 'Paskutinė evakuacija', subtitle: 'Rytinis griovys → pietų užtvaros',
      loreText: 'Vaikai ir sužeistieji vedami per griovį į pietus. Silelora praleidžia, Raukta priešinasi.',
      posX: 45, posY: 47, iconType: 'battle', missionType: 'ESCORT', unlockRule: { type: 'all_prev' },
      prevSeedKeys: ['node06'], nextSeedKeys: ['node08'],
      preCutsceneSeedKey: 'cs07_pre', postCutsceneSeedKey: 'cs07_post', failureCutsceneSeedKey: 'cs07_fail',
      objectives: [{ id: 'win', kind: 'win', label: 'Pravesk civilius iki patikros', primary: true },
                   { id: 'kids', kind: 'keep_alive_count', label: 'Arnas ir Milė pasiekia stovyklą', primary: false, params: { count: 2, tag: 'child' } }],
      battleConfig: { playerDeckMode: 'collection', enemyDeckMode: 'faction', enemyFactionName: 'Demonų orda', enemyName: 'Ordos persekiotojai', difficulty: 'normal', aiProfile: 'aggressive', storyDeckPackage: 'pkg2' },
      scenario: { objectives: [{ id: 'convoy', kind: 'convoy', label: 'Pabėgėlių kolona', hp: 12, maxHp: 12, side: 'player' }] },
      rewardPayload: { gold: 180, exp: 100 },
      sourceChapter: 'VII', sourceEventIds: ATLAS_EVENTS('E07-01, E07-02, E07-03'),
      canonSummary: 'Dalis ateities išnešama iš miesto; vaikai tampa tiesos nešėjais. Evakuacijos kelias užsidaro.',
      canonCharacters: ['Rasa', 'Arnas', 'Milė', 'Silelora', 'Raukta', 'Prazaras', 'Gunteris'], canonLocations: ['Rytinis griovys', 'Pietų užtvaros', 'Stebima stovykla'] },

    { seedKey: 'node08', chapterSeedKey: 'ch3', title: 'Užkalti vartai', subtitle: 'Šiauriniai vartai',
      loreText: 'Belzatoras laužia vartus. Konstancijus žūsta liudydamas. Madeliaus balta šviesa atstumia demonus, bet degina pilkus.',
      posX: 36, posY: 38, iconType: 'gate', missionType: 'GATE_DEFENSE', unlockRule: { type: 'all_prev' },
      prevSeedKeys: ['node07'], nextSeedKeys: ['node09'],
      preCutsceneSeedKey: 'cs08_pre', postCutsceneSeedKey: 'cs08_post', failureCutsceneSeedKey: 'cs08_fail',
      objectives: [{ id: 'win', kind: 'win', label: 'Išlaikyk liniją iki atsitraukimo', primary: true },
                   { id: 'gate', kind: 'protect_objective', label: 'Vartai išlieka su ≥8 HP', primary: false, params: { objectiveId: 'gate', hp: 8 } },
                   { id: 'gray', kind: 'keep_alive_count', label: 'Sumažink pilkųjų aukas', primary: false, params: { count: 2, tag: 'gray' } }],
      battleConfig: { playerDeckMode: 'collection', enemyDeckMode: 'boss', enemyFactionName: 'Demonų orda', enemyName: 'Belzatoras (aplinkos bosas)', difficulty: 'hard', aiProfile: 'siege', storyDeckPackage: 'pkg2' },
      scenario: { objectives: [{ id: 'gate', kind: 'gate', label: 'Šiauriniai vartai', hp: 18, maxHp: 18, side: 'player' }],
        rules: [{ trigger: 'onTurnStart', turn: 4, actions: [{ type: 'dialogue', text: 'Konstancijus: „Liudiju."', characterName: 'Konstancijus' }] }] },
      rewardPayload: { gold: 220, exp: 130, boosters: 1, cosmetics: ['card-back-varngrado-vartai'] },
      sourceChapter: 'VIII', sourceEventIds: ATLAS_EVENTS('E08-01, E08-02'),
      canonSummary: 'Vartų griuvimas; Konstancijaus mirtis su „liudiju"; balta šviesa tampa dviprasmė (gynyba ir grėsmė).',
      canonCharacters: ['Belzatoras', 'Konstancijus', 'Madelius', 'Prazaras', 'Ema'], canonLocations: ['Šiauriniai vartai', 'Vartų kiemas', 'Karantino aikštė'] },

    { seedKey: 'node09', chapterSeedKey: 'ch3', title: 'Miestas be ryto', subtitle: 'Užkrėstas šulinys',
      loreText: 'Regnaras įsiveržia per šulinį ir puola vardų lentas. Sienos nebepakanka — priešas po miestu.',
      posX: 30, posY: 50, iconType: 'wave', missionType: 'WAVE_DEFENSE', unlockRule: { type: 'all_prev' },
      prevSeedKeys: ['node08'], nextSeedKeys: ['node10'],
      preCutsceneSeedKey: 'cs09_pre', postCutsceneSeedKey: 'cs09_post',
      objectives: [{ id: 'win', kind: 'win', label: 'Apgink vardų lentas, atremk Regnarą', primary: true },
                   { id: 'survive', kind: 'survive_turns', label: 'Ištverk 8 ėjimus', primary: false, params: { turns: 8 } },
                   { id: 'names', kind: 'protect_objective', label: 'Vardų lentos išlieka', primary: false, params: { objectiveId: 'names', hp: 1 } }],
      battleConfig: { playerDeckMode: 'collection', enemyDeckMode: 'waves', enemyFactionName: 'Demonų orda', enemyName: 'Regnaras ir užkrėstas vanduo', difficulty: 'hard', aiProfile: 'objective_attacker', storyDeckPackage: 'pkg2' },
      scenario: { survivalTurns: 8,
        objectives: [{ id: 'names', kind: 'relic', label: 'Vardų lentos', hp: 12, maxHp: 12, side: 'player' }],
        waves: [
          { id: 'well_wave_01', name: 'Šulinio antplūdis', triggerType: 'turn', turn: 2, spawnSide: 'gate', warningText: 'Vanduo juda — kažkas lipa iš šulinio!', mustClear: true, unitPool: [] },
          { id: 'well_wave_02', name: 'Regnaro šešėliai', triggerType: 'turn', turn: 5, spawnSide: 'random', warningText: 'Regnaras šokinėja per šešėlius!', mustClear: true, unitPool: [] }] },
      rewardPayload: { gold: 230, exp: 120 },
      sourceChapter: 'IX', sourceEventIds: ATLAS_EVENTS('E09-01, E09-02'),
      canonSummary: 'Regnaras per šulinį laužo vardų lenteles; vardai tampa tiesiogine apsaugos priemone.',
      canonCharacters: ['Regnaras', 'Prazaras', 'Gunteris', 'Ema', 'Madelius', 'Alarikas'], canonLocations: ['Užkrėstas šulinys', 'Vardų lentos'] },

    { seedKey: 'node10', chapterSeedKey: 'ch3', title: 'Paskutinė rikiuotė', subtitle: 'Vartų kiemas / griuvėsiai',
      loreText: 'Vartai žlunga. Krentantys akmenys, grandinės ir žibintai pirmą kartą fiziškai sužeidžia Belzatorą — jis atsitraukia. Saldas sužeistas, bet gyvas.',
      posX: 39, posY: 53, iconType: 'boss', missionType: 'BOSS_BATTLE', unlockRule: { type: 'all_prev' },
      prevSeedKeys: ['node09'], nextSeedKeys: ['node11'],
      preCutsceneSeedKey: 'cs10_pre', postCutsceneSeedKey: 'cs10_post', failureCutsceneSeedKey: 'cs10_fail',
      objectives: [{ id: 'win', kind: 'win', label: 'Priversk Belzatorą atsitraukti (sužeisk)', primary: true },
                   { id: 'praz', kind: 'protect_objective', label: 'Neprarask Prazaro', primary: false, params: { objectiveId: 'prazaras', hp: 1 } }],
      battleConfig: { playerDeckMode: 'collection', enemyDeckMode: 'boss', enemyFactionName: 'Demonų orda', enemyName: 'Belzatoras', difficulty: 'hard', aiProfile: 'boss', storyDeckPackage: 'pkg2' },
      scenario: { objectives: [{ id: 'prazaras', kind: 'commander', label: 'Maršalas Prazaras', hp: 30, maxHp: 30, side: 'player' }],
        rules: [{ trigger: 'onTurnStart', turn: 1, actions: [{ type: 'setBossPhase', phase: 1 }] },
                { trigger: 'onTurnStart', turn: 6, actions: [{ type: 'dialogue', text: 'Saldas: žibintai – DABAR! Aš laikau!', characterName: 'Saldas' }] }] },
      rewardPayload: { gold: 280, exp: 160, boosters: 1, cardMin: 'epic', codexUnlocks: ['belzatoro-zaizda'] },
      sourceChapter: 'X', sourceEventIds: ATLAS_EVENTS('E10-01, E10-02'),
      canonSummary: 'Belzatoras pirmą kartą fiziškai sužeistas (krentantys akmenys, grandinės, žibintai į išdegtą akį); vartai galutinai žlunga. Saldas išgyvena.',
      canonCharacters: ['Belzatoras', 'Prazaras', 'Saldas', 'Gunteris', 'Madelius', 'Doriana'], canonLocations: ['Vartų kiemas', 'Šiauriniai griuvėsiai'] },

    { seedKey: 'node11', chapterSeedKey: 'ch4', title: 'Kai šviesa užsidaro', subtitle: 'Pietinė linija',
      loreText: 'Pietų taryba paskelbia Varngradą paaukota zona; Madelius pripažįsta, kad žinojo nuo pirmos dienos. Saldas savo noru įsmeigia ietį į Belzatoro žaizdą ir žūsta — demonas sunkiai sužeistas atsitraukia.',
      posX: 34, posY: 60, iconType: 'story', missionType: 'STORY_ONLY', unlockRule: { type: 'all_prev' },
      prevSeedKeys: ['node10'], nextSeedKeys: ['node12'],
      preCutsceneSeedKey: 'cs11_pre', postCutsceneSeedKey: 'cs11_post',
      objectives: [{ id: 'face', kind: 'win', label: 'Priimk paaukotos zonos tiesą', primary: true }],
      rewardPayload: { exp: 90 },
      sourceChapter: 'XI', sourceEventIds: ATLAS_EVENTS('E11-01, E11-02'),
      canonSummary: 'Oficialus izoliacijos lūžis (Raukta – ne piktadarys, o protokolo žmogus). Saldas žūsta įsmeigdamas ietį (sidabras + Arno kraujas) į Belzatoro žaizdą; demonas sunkiai sužeistas atsitraukia.',
      canonCharacters: ['Raukta', 'Madelius', 'Prazaras', 'Ema', 'Silelora', 'Saldas', 'Belzatoras'], canonLocations: ['Pietinė linija', 'Vartų kiemas', 'Vardų aikštė'] },

    { seedKey: 'node12', chapterSeedKey: 'ch4', title: 'Užtvėrimas', subtitle: 'Pietų užtvaros / akmeninė gatvė',
      loreText: 'Šventintas ratas spaudžia. Pilkus reikia perkelti nuo pietų spaudimo, barikadas laikyti. Miestas tampa indu.',
      posX: 40, posY: 64, iconType: 'wave', missionType: 'SURVIVAL', unlockRule: { type: 'all_prev' },
      prevSeedKeys: ['node11'], nextSeedKeys: ['node13'],
      preCutsceneSeedKey: 'cs12_pre', postCutsceneSeedKey: 'cs12_post',
      objectives: [{ id: 'win', kind: 'survive_turns', label: 'Ištverk spaudimą 8 ėjimus', primary: true, params: { turns: 8 } },
                   { id: 'gray', kind: 'keep_alive_count', label: 'Perkelk pilkus saugiai (≥2)', primary: false, params: { count: 2, tag: 'gray' } }],
      battleConfig: { playerDeckMode: 'collection', enemyDeckMode: 'faction', enemyFactionName: 'Demonų orda', enemyName: 'Spaudimo laukas', difficulty: 'hard', aiProfile: 'objective_attacker', storyDeckPackage: 'pkg2' },
      scenario: { survivalTurns: 8, objectives: [{ id: 'ring', kind: 'relic', label: 'Šventintas ratas (spaudimas)', hp: 20, maxHp: 20, side: 'enemy' }] },
      rewardPayload: { gold: 240, exp: 130 },
      sourceChapter: 'XII', sourceEventIds: ATLAS_EVENTS('E12-01, E12-02'),
      canonSummary: 'Pietų ratas užsidaro; Varngradas fiziškai tampa uždaru indu. Pilki – ir saugoma grupė, ir taktinė rizika.',
      canonCharacters: ['Prazaras', 'Ema', 'Madelius', 'Raukta', 'Silelora'], canonLocations: ['Pietų užtvaros', 'Akmeninė gatvė'] },

    { seedKey: 'node13', chapterSeedKey: 'ch4', title: 'Indas', subtitle: 'Rotušės požemiai',
      loreText: 'Užkratas bando išeiti per požemių vandenį ir senas kapavietes. Prazaro grupė užveria dugną.',
      posX: 30, posY: 66, iconType: 'elite', missionType: 'CUSTOM', unlockRule: { type: 'all_prev' },
      prevSeedKeys: ['node12'], nextSeedKeys: ['node14'],
      preCutsceneSeedKey: 'cs13_pre', postCutsceneSeedKey: 'cs13_post',
      objectives: [{ id: 'win', kind: 'win', label: 'Užverk požeminį dugno mazgą', primary: true },
                   { id: 'fast', kind: 'defeat_within', label: 'Spėk iki turn 10 (juodas vanduo plinta)', primary: false, params: { turns: 10 } }],
      battleConfig: { playerDeckMode: 'collection', enemyDeckMode: 'faction', enemyFactionName: 'Demonų orda', enemyName: 'Juodas vanduo', difficulty: 'hard', aiProfile: 'chaotic_demon', storyDeckPackage: 'pkg2' },
      scenario: { objectives: [{ id: 'drain', kind: 'relic', label: 'Drenažo mazgas', hp: 20, maxHp: 20, side: 'enemy' }] },
      rewardPayload: { gold: 240, exp: 140, cardMin: 'unique' },
      sourceChapter: 'XIII', sourceEventIds: ATLAS_EVENTS('E13-01, E13-02'),
      canonSummary: 'Indo dugnas užveriamas; užmiršti vardai tampa lore sluoksniu. Miestas spaudžiamas iš vidaus.',
      canonCharacters: ['Prazaras', 'Tautvydas', 'Doriana', 'Eleonora', 'Ieva iš Laukščių'], canonLocations: ['Rotušės požemiai', 'Drenažo kanalai', 'Senos kapavietės'] },

    { seedKey: 'node14', chapterSeedKey: 'ch4', title: 'Užrakintųjų sprendimas', subtitle: 'Vardų aikštė',
      loreText: 'Centrinė novelės tezė: Varngradas nustoja laukti evakuacijos ir sąmoningai tampa užraktu. Kiekvienam — darbas.',
      posX: 36, posY: 70, iconType: 'story', missionType: 'STORY_ONLY', unlockRule: { type: 'all_prev' },
      prevSeedKeys: ['node13'], nextSeedKeys: ['node15'],
      preCutsceneSeedKey: 'cs14_pre', postCutsceneSeedKey: 'cs14_post',
      objectives: [{ id: 'win', kind: 'win', label: 'Paskirstyk miestą darbams', primary: true }],
      rewardPayload: { exp: 120, codexUnlocks: ['varngrado-uzraktas'] },
      sourceChapter: 'XIV', sourceEventIds: ATLAS_EVENTS('E14-01, E14-02'),
      canonSummary: 'Core identity: Varngradas yra užraktas, ne paaukota zona. Galutinis kaladės paketas „Varngrado Užraktas".',
      canonCharacters: ['Prazaras', 'Gunteris', 'Madelius', 'Ema', 'Eleonora', 'Alarikas', 'Tautvydas'], canonLocations: ['Vardų aikštė', 'Visas Varngradas'] },

    { seedKey: 'node15', chapterSeedKey: 'ch4', title: 'Paskutinė naktis', subtitle: 'Akmeninė gatvė / barikados',
      loreText: 'Civilių panika ir paskutinis Regnaro puolimas per Prazaro žaizdą. Mėgdžiotojas nužudomas.',
      posX: 43, posY: 74, iconType: 'boss', missionType: 'AMBUSH', unlockRule: { type: 'all_prev' },
      prevSeedKeys: ['node14'], nextSeedKeys: ['node16'],
      preCutsceneSeedKey: 'cs15_pre', postCutsceneSeedKey: 'cs15_post', failureCutsceneSeedKey: 'cs15_fail',
      objectives: [{ id: 'win', kind: 'win', label: 'Nužudyk Regnarą Mėgdžiotoją', primary: true },
                   { id: 'praz', kind: 'protect_objective', label: 'Neleisk atverti Prazaro žaizdos', primary: false, params: { objectiveId: 'prazaras', hp: 10 } }],
      battleConfig: { playerDeckMode: 'collection', enemyDeckMode: 'boss', enemyFactionName: 'Demonų orda', enemyName: 'Regnaras Mėgdžiotojas', difficulty: 'hard', aiProfile: 'tactical', storyDeckPackage: 'pkg3' },
      scenario: { objectives: [{ id: 'prazaras', kind: 'commander', label: 'Prazaro žaizda (korupcija)', hp: 20, maxHp: 20, side: 'player' }] },
      rewardPayload: { gold: 280, exp: 160, cardMin: 'epic' },
      sourceChapter: 'XV', sourceEventIds: ATLAS_EVENTS('E15-01, E15-02, E15-03'),
      canonSummary: 'Regnaras nužudomas; Prazaro užkratas sustiprėja. Belzatoras keičia taikinį į pietų ratą prie vaikų stovyklos.',
      canonCharacters: ['Regnaras', 'Prazaras', 'Gunteris', 'Doriana', 'Madelius', 'Ema', 'Laima'], canonLocations: ['Akmeninė gatvė', 'Šiaurinė barikada', 'Pietų vartai'] },

    { seedKey: 'node16', chapterSeedKey: 'ch4', title: 'Varngradas nekrenta', subtitle: 'Pietų siūlė',
      loreText: 'Finalas: Varngradas išeina ginti užtvarų, kurios jį uždarė. Belzatoras sužeidžiamas ir ATSITRAUKIA — bet ratas lieka uždarytas.',
      posX: 38, posY: 82, iconType: 'boss', missionType: 'WALL_DEFENSE', unlockRule: { type: 'all_prev' },
      prevSeedKeys: ['node15'], nextSeedKeys: ['node17'],
      preCutsceneSeedKey: 'cs16_pre', postCutsceneSeedKey: 'cs16_post',
      objectives: [{ id: 'win', kind: 'win', label: 'Sustabdyk Belzatorą prie pietų siūlės', primary: true },
                   { id: 'kids', kind: 'keep_alive_count', label: 'Apsaugok vaikų stovyklą', primary: false, params: { count: 1, tag: 'child' } },
                   { id: 'seam', kind: 'prevent_breach', label: 'Bent vienas užtvarų segmentas lieka', primary: false, params: { objectiveId: 'seam' } }],
      battleConfig: { playerDeckMode: 'collection', enemyDeckMode: 'waves', enemyFactionName: 'Demonų orda', enemyName: 'Belzatoras (finalas)', difficulty: 'hard', aiProfile: 'siege', storyDeckPackage: 'pkg3' },
      scenario: { survivalTurns: 10,
        objectives: [{ id: 'seam', kind: 'wall', label: 'Pietų siūlė (užtvarų mazgas)', hp: 25, maxHp: 25, side: 'player' },
                     { id: 'camp', kind: 'convoy', label: 'Vaikų stovykla', hp: 10, maxHp: 10, side: 'player' }],
        waves: [
          { id: 'final_wave_01', name: 'Šoninis smūgis į mazgą', triggerType: 'turn', turn: 3, spawnSide: 'wall', warningText: 'Demonai daužo užtvarų mazgą!', mustClear: true, unitPool: [] },
          { id: 'final_wave_02', name: 'Belzatoro spaudimas', triggerType: 'turn', turn: 6, spawnSide: 'wall', warningText: 'Belzatoras eina į trečią liniją — prie vaikų!', mustClear: true, unitPool: [] }],
        rules: [{ trigger: 'onTurnStart', turn: 8, actions: [{ type: 'dialogue', text: 'Rasa: jeigu šausit į Varngradą, vaikai matys!', characterName: 'Rasa' }] }] },
      rewardPayload: { gold: 400, exp: 250, boosters: 2, cardMin: 'legendary', cosmetics: ['title-uzrakto-liudytojas'], codexUnlocks: ['belzatoro-atsitraukimas'] },
      sourceChapter: 'XVI', sourceEventIds: ATLAS_EVENTS('E16-01, E16-02, E16-03'),
      canonSummary: 'Finali tezė: Varngradas ne išgelbėtas, bet NEKRENTA. Belzatoras sužeistas atsitraukia į Vethago’o kelią; ratas lieka uždarytas, leidžiamas tik žinių kanalas.',
      canonCharacters: ['Prazaras', 'Gunteris', 'Madelius', 'Silelora', 'Raukta', 'Rasa', 'Arnas', 'Milė', 'Belzatoras', 'Matas iš Dervių'], canonLocations: ['Pietų siūlė', 'Trečia užtvarų linija', 'Vaikų stovykla'] },

    { seedKey: 'node17', chapterSeedKey: 'ch4', title: 'Epilogas: Tylos protokolas', subtitle: 'Pietų archyvai',
      loreText: 'Oficiali istorija perrašoma. Tikri vardai išgyvena per kopijas, vaikus ir liudytojus. Prasideda Tylos protokolas.',
      posX: 30, posY: 89, iconType: 'reward', missionType: 'STORY_ONLY', unlockRule: { type: 'all_prev' },
      prevSeedKeys: ['node16'], nextSeedKeys: [], preCutsceneSeedKey: 'cs17_epilogue',
      objectives: [{ id: 'witness', kind: 'win', label: 'Išnešk vardus', primary: true }],
      rewardPayload: { exp: 300, cosmetics: ['card-back-tylos-protokolas', 'title-uzrakto-liudytojas'], codexUnlocks: ['tylos-protokolas', 'mirties-marso-kabliukas'], characterUnlocks: ['prazaras-marsalas'] },
      sourceChapter: 'Epilogas', sourceEventIds: ATLAS_EVENTS('EE-01, EE-02, EE-03'),
      canonSummary: 'Tiltas į Tylos Metus ir Mirties Maršo ateitį. Tyla – politinio ir maginio uždarymo rezultatas, ne staigi mirtis.',
      canonCharacters: ['Raukta', 'Silelora', 'Rasa', 'Madelius', 'Prazaras', 'Ema', 'Arnas', 'Milė'], canonLocations: ['Pietų archyvai', 'Varngradas'] },
  ],

  // ── DECK PACKAGES (lore-tikslus DIZAINAS būsimoms kampanijos kortoms) ──
  // Pirmam perėjimui rekomenduojama NEnaudoti atsitiktinės modernios kolekcijos.
  // Šie paketai – kuriamų „campaign-only" kortų projektas (žr. dokumentaciją).
  deckPackages: [
    { key: 'pkg1', title: 'Varngrado gynėjai', availability: 'Mazgai 1–4',
      identity: 'Žmonės gynėjai: sienos, vartai, disciplina, gelbėjimas, paprasti ginklai. JOKIO nemirėlių / Mirties Maršo motyvo.',
      mechanics: ['Taunt / sargyba', 'Vartų / objektų taisymas', 'Apsauga', 'Vardų žymėjimas', 'Mažas removal'],
      champion: { name: 'Prazaras, Varngrado maršalas', skills: [
        'Kelkite vartus — gynėjui Guard/Taunt arba objektui +HP',
        'Rikiuotė prie sienos — gretimiems gynėjams +buff / mažiau bangos žalos',
        'Niekas nepalieka spragos — prišaukia Varngrado Sargybinį (1/2) prie objekto' ] },
      cards: [
        { name: 'Varngrado sargybinis', role: 'Taunt 1/2', count: 2 },
        { name: 'Sienos ietis', role: 'Reach gynyba', count: 2 },
        { name: 'Vartų arbaletininkas', role: 'Tolimas smūgis', count: 2 },
        { name: 'Sandėlių nešikas', role: 'Resursai/aukso', count: 2 },
        { name: 'Karantino prižiūrėtoja', role: 'Pilkų valdymas', count: 2 },
        { name: 'Vardų raštininkas', role: 'Vardo žymė', count: 2 },
        { name: 'Saldas, vartų kapitonas', role: 'Lyderis', count: 1 },
        { name: 'Ema, miesto gydytoja', role: 'Gydymas', count: 1 },
        { name: 'Tautvydas, jaunas karininkas', role: 'Buff/lyderystė', count: 1 },
        { name: 'Uždaryti vartus', role: 'Reaction', count: 2 },
        { name: 'Akmenys nuo sienos', role: 'AoE žala', count: 2 },
        { name: 'Vardas ant lentos', role: 'Apsauga nuo ištrynimo', count: 2 },
        { name: 'Atsitraukti į antrą liniją', role: 'Repozicija', count: 2 },
        { name: 'Paskutinis postas', role: 'Last stand', count: 1 },
        { name: 'Karantino ratas', role: 'Zonos kontrolė', count: 1 } ] },

    { key: 'pkg2', title: 'Trijų jėgų frontas', availability: 'Po mazgo 4–5',
      identity: 'Prideda Inkvizicijos legioną ir Šviesos pulką kaip nepatogius sąjungininkus: žibintai, liudijimas, anti-curse, šventa žala su kaina.',
      mechanics: ['Žibintai', 'Liudijimas (triple-witness)', 'Anti-curse', 'Šventa žala su downside pilkiems', 'Elitiniai riteriai'],
      cards: [
        { name: 'Madelius, žibintų vadas', count: 1 }, { name: 'Tėvas Konstancijus, liudytojas', count: 1 },
        { name: 'Eleonora Kraujoviesa', count: 1 }, { name: 'Gunteris, Šviesos pulko vadas', count: 1 },
        { name: 'Alarikas Teisusis', count: 1 }, { name: 'Doriana, Ordino kovotoja', count: 1 },
        { name: 'Žibinto nešėjas', count: 2 }, { name: 'Ordino riteris', count: 2 },
        { name: 'Triple liudijimas', role: 'Anti-suklastoti įsakymai', count: 1 },
        { name: 'Žibinto ratas', count: 2 },
        { name: 'Balta šviesa', role: 'AoE su žala pilkiems/užkrėstiems', count: 1 },
        { name: 'Arno kraujo riba', role: 'Anti-ritualas', count: 1 },
        { name: 'Grandinės ir balista', role: 'Anti-bosas', count: 1 } ] },

    { key: 'pkg3', title: 'Varngrado Užraktas', availability: 'Po mazgo 14',
      identity: 'Miestas nebegina vartų — miestas yra užraktas. Objektų gynyba, auka, vardai, barikados, kontroliuojama korupcija.',
      mechanics: ['Objektų gynyba', 'Auka', 'Vardai', 'Barikados', 'Išgyvenimas', 'Kontroliuojama korupcija'],
      cards: [
        { name: 'Miestas vietoj vartų', count: 1 }, { name: 'Užrakintųjų sprendimas', count: 1 },
        { name: 'Pietų siūlė', count: 1 }, { name: 'Vardų aikštė', count: 1 },
        { name: 'Šventinto rato spaudimas', count: 1 }, { name: 'Užvertas dugnas', count: 1 },
        { name: 'Laikykite grandinę', count: 2 }, { name: 'Paskutinė rikiuotė', count: 1 },
        { name: 'Liudiju', count: 1 }, { name: 'Nepamiršti vardai', count: 2 },
        { name: 'Prazaro žaizda', role: 'Rizikinga kampanijos korta/objektas (NE paprastas buff)', count: 1 } ] },
  ],

  // ── ENEMY PACKAGES (Demonų orda) ──
  enemyPackages: [
    { key: 'orda_pool', title: 'Bendras Demonų ordos bangų telkinys', faction: 'Demonų orda',
      notes: 'Bazinės bangos visiems šiaurės mazgams.',
      units: ['Impas iš plyšio', 'Dyglių velnias', 'Juodo dūmo nešėjas', 'Maro kirminas', 'Grandinių nešėjas',
              'Plyšio šuo', 'Raguotas puolėjas', 'Dainuojantis užkratas', 'Pragaro sutarties šnibždesys', 'Belzatoro akis'] },
    { key: 'okuliaras', title: 'Okuliaras (stebėtojas)', faction: 'Demonų orda',
      notes: 'Stebėtojas/parama, NE pagrindinis brutalas.',
      behavior: ['Žymi silpnus objektus/sienos sekcijas', 'Atskleidžia/debuffina', 'Didina kitos bangos taiklumą'] },
    { key: 'ogloras', title: 'Oglor’as Klaidinotojas (balsai)', faction: 'Demonų orda',
      notes: 'Manipuliacija, ne vien žala. Atremiamas triple-witness / Liudijimo kortomis.',
      behavior: ['Suklastoti įsakymai („Suklastotas įsakymas")', 'Kopijuoja sąjungininkų balsus/vardus', 'Laikinai paklaidina draugiškus vienetus'] },
    { key: 'regnaras', title: 'Regnaras Mėgdžiotojas (medžiotojas)', faction: 'Demonų orda',
      notes: 'Infiltratorius. Grįžta iki nužudymo mazge 15 — NE paprastas brutalas.',
      behavior: ['Taikosi į vaikus, vardus, silpnus vienetus ir Prazaro žaizdą', 'Juda per šulinius/šešėlius', 'Vengia atviro mūšio'] },
    { key: 'belzatoras', title: 'Belzatoras (Ordos vadas)', faction: 'Demonų orda',
      notes: 'Pirmiausia aplinkos bosas, vėliau tiesioginis. NEGALI būti galutinai nužudytas — finale ATSITRAUKIA.',
      behavior: ['Puola objektus: vartus, sienas, pietų siūlę', 'Fazės su šarvu', 'Sužeidžiamas grandinėmis, žibintais, balista, Ordino plienu ir Prazaro komanda', 'Finalo rezultatas: atsitraukimas, ne mirtis'] },
  ],
}

export default prazarasVarngradasCampaign
