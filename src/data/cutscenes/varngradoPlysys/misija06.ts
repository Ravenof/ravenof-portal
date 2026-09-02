// ════════════════════════════════════════════════════════════════════════════
// M6 „Mėlyno mithrilo aušra" — V3
// PRE „Pirmi prie sienos" (17 beat'ų → 22 shots, ~2:50) +
// POST „Kas atėjo padėti" (13 beat'ų → 17 shots) + FAIL.
// LOCK: PRE baigiasi apsupties vadui perskėlus Ordino pleištą — pirmas tikslas
// „Per 3 ėjimus sujunk abi Ordino grupes".
// ════════════════════════════════════════════════════════════════════════════
import type { MotionComicDef } from '@/lib/campaign/motionComic'
import { A, CAST, S, C } from './cast'

export const m06pre: MotionComicDef = {
  version: 1, musicUrl: null, ambientUrl: null, typewriter: true, autoAdvanceAfterVoice: false,
  characters: CAST,
  shots: [
    // ── A. Ordinas pasirenka kelią ──
    // 01 — Dvi stovyklos (establishing)
    S('s01', `${A}/bg-apsupties-laukas.svg`, {
      transition: { type: 'cut' },
      effects: [{ kind: 'fog', intensity: 0.35 }],
      camera: { startScale: 1, endScale: 1.06, endX: 1, duration: 8 },
      text: null, holdMs: 2500,
    }),
    // 02 — Ką mato kapitonas
    C('s02a', `${A}/bg-apsupties-laukas.svg`, {
      characters: [{ characterId: 'kapitonas', pose: 'neutral', x: 40, height: 88, depth: 12 }],
      speakerName: { lt: 'Ordino žvalgas', en: 'Order scout' },
      text: { lt: 'Jie čia buvo prieš mus. Gal laukia bendro signalo.', en: 'They were here before us. Maybe they wait for a joint signal.' },
    }),
    C('s02b', `${A}/bg-apsupties-laukas.svg`, { // rodo į raudoną ugnį virš Varngrado
      tint: 'rgba(200,30,30,0.06)',
      characters: [{ characterId: 'kapitonas', pose: 'neutral', x: 44, height: 90, depth: 12 }],
      speakerId: 'kapitonas', text: { lt: 'Miestas jau davė signalą.', en: 'The city has already given its signal.' },
      holdMs: 600,
    }),
    // 03 — Neužtenka visiems
    C('s03', `${A}/bg-apsupties-laukas.svg`, {
      characters: [{ characterId: 'kapitonas', pose: 'kovinis', x: 42, height: 92, depth: 12 }],
      speakerId: 'kapitonas',
      text: { lt: 'Iki vartų nuvesiu vieną pleištą. Atgal tokio kelio nebus.', en: 'I can lead one wedge to the gates. There will be no such road back.' },
      holdMs: 900, // be epinės priesaikos — kariai tiesiog užsega šalmus
    }),
    // ── B. Prazaras negali atidaryti per anksti ──
    // 04 — Ant sienos
    S('s04a', `${A}/bg-siena-horizontas.svg`, {
      characters: [
        { characterId: 'vartu-kapitonas', pose: 'neutral', x: 62, height: 84, depth: 11, flip: true },
        { characterId: 'prazaras', pose: 'neutral', x: 28, height: 88, depth: 12, dim: 0.15 },
      ],
      speakerId: 'vartu-kapitonas',
      text: { lt: 'Jei atversim dabar, demonai bus prie mažųjų durų pirmi.', en: 'If we open now, the demons reach the small door first.' },
    }),
    C('s04b', `${A}/bg-siena-horizontas.svg`, {
      characters: [
        { characterId: 'vartu-kapitonas', pose: 'neutral', x: 62, height: 84, depth: 11, flip: true, dim: 0.2 },
        { characterId: 'prazaras', pose: 'neutral', x: 28, height: 88, depth: 12 },
      ],
      speakerId: 'prazaras',
      text: { lt: 'Jei neatversim laiku, Ordinas mirs prie užvertos sienos.', en: 'If we do not open in time, the Order dies at a sealed wall.' },
      holdMs: 500,
    }),
    // 05 — Aiški sąlyga (vėliavos signalas)
    S('s05', `${A}/bg-siena-horizontas.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'isako', x: 36, height: 92, depth: 12 }],
      camera: { startScale: 1.02, endScale: 1.07, duration: 4 },
      sfxUrl: null, // PLACEHOLDER: vėliavos ženklai — nuvalyti kelią, tada durys
      speakerId: 'prazaras', text: { lt: 'Nuvalykit kelią — tada durys.', en: 'Clear the road — then the door.' },
      holdMs: 800, // Ordino kapitonas tolumoje pakartoja ženklą
    }),
    // ── C. Akis randa centrą ──
    // 06 — Netikras frontas
    S('s06', `${A}/bg-apsupties-laukas.svg`, {
      tint: 'rgba(90,140,220,0.08)',
      effects: [{ kind: 'dust', intensity: 0.35 }],
      characters: [{ characterId: 'kernius', pose: 'akis', x: 26, height: 86, depth: 12 }],
      speakerId: 'kernius', text: { lt: 'Jie kviečia jį į vidų.', en: 'They are inviting him in.' },
    }),
    // 07 — Tikras vadas
    C('s07', `${A}/bg-apsupties-laukas.svg`, {
      effects: [{ kind: 'magic', intensity: 0.4, color: 'rgba(138,92,246,0.35)' }],
      characters: [{ characterId: 'kernius', pose: 'akis', x: 48, height: 92, depth: 12 }],
      camera: { startScale: 1.03, endScale: 1.09, duration: 4, punchIn: true },
      speakerId: 'kernius',
      text: { lt: 'Didysis už trečios eilės. Jis laukia, kol pleištas ištįs.', en: 'The big one is behind the third row. He waits for the wedge to stretch thin.' },
    }),
    // 08 — Perspėjimas per lauką (mėlyna strėlė)
    S('s08a', `${A}/bg-apsupties-laukas.svg`, {
      tint: 'rgba(90,140,220,0.08)',
      sfxUrl: null, // PLACEHOLDER: pažymėta strėlė įsminga greta taikinio
      text: null, holdMs: 1100,
    }),
    C('s08b', `${A}/bg-apsupties-laukas.svg`, {
      characters: [{ characterId: 'kapitonas', pose: 'kovinis', x: 40, height: 92, depth: 12 }],
      speakerId: 'kapitonas', text: { lt: 'Į pažymėtą didįjį. Pleištą laikyt glaudžiai.', en: 'On the marked big one. Keep the wedge tight.' },
      holdMs: 500,
    }),
    // ── D. Abu vadai rizikuoja ──
    // 09 — Prazaro dalis
    S('s09a', `${A}/bg-vartu-kiemas.svg`, {
      characters: [
        { characterId: 'vartu-kapitonas', pose: 'neutral', x: 62, height: 84, depth: 11, flip: true },
        { characterId: 'prazaras', pose: 'neutral', x: 30, height: 88, depth: 12 },
      ],
      speakerId: 'vartu-kapitonas', text: { lt: 'Maršale, tavo vieta ant sienos.', en: 'Marshal, your place is on the wall.' },
    }),
    C('s09b', `${A}/bg-vartu-kiemas.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 40, height: 92, depth: 12 }],
      speakerId: 'prazaras',
      text: { lt: 'Kai atsidarys durys, mano vieta bus tarp jų ir miesto.', en: 'When the door opens, my place is between it and the city.' },
      holdMs: 800,
    }),
    // 10 — Sužeistieji pirmi
    C('s10a', `${A}/bg-vartu-kiemas.svg`, {
      characters: [
        { characterId: 'gydytoja', pose: 'neutral', x: 60, height: 84, depth: 11, flip: true },
        { characterId: 'prazaras', pose: 'neutral', x: 28, height: 88, depth: 12, dim: 0.15 },
      ],
      speakerId: 'gydytoja', text: { lt: 'Kiek turėsim laiko?', en: 'How much time will we have?' },
    }),
    C('s10b', `${A}/bg-vartu-kiemas.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 36, height: 90, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Tiek, kiek jie nusipirks lauke.', en: 'As much as they buy for us out there.' },
      holdMs: 500,
    }),
    // 11 — Inkvizicija tebemato
    S('s11a', `${A}/bg-inkvizicijos-kalva.svg`, {
      effects: [{ kind: 'fog', intensity: 0.25 }],
      speakerName: { lt: 'Ordino žvalgas', en: 'Order scout' },
      text: { lt: 'Jie stebi.', en: 'They are watching.' },
    }),
    C('s11b', `${A}/bg-apsupties-laukas.svg`, {
      characters: [{ characterId: 'kapitonas', pose: 'neutral', x: 44, height: 90, depth: 12 }],
      speakerId: 'kapitonas', text: { lt: 'Tegu įsidėmi kelią.', en: 'Let them memorize the road.' },
      holdMs: 500,
    }),
    // ── E. Pleištas perskeliamas ──
    // 12 — Klaidingas atsitraukimas (be žodžių)
    S('s12', `${A}/bg-apsupties-laukas.svg`, {
      tint: 'rgba(200,30,30,0.06)',
      effects: [{ kind: 'fog', intensity: 0.35 }, { kind: 'dust', intensity: 0.3 }],
      camera: { startScale: 1.02, endScale: 1.07, duration: 4 },
      text: null, holdMs: 1300, // demonų centras pasitraukia; sužeistieji atsilieka
    }),
    // 13 — Apsupties vado smūgis (reveal be teksto)
    S('s13', `${A}/bg-apsupties-laukas.svg`, {
      transition: { type: 'cut' },
      tint: 'rgba(200,30,30,0.1)',
      effects: [{ kind: 'dust', intensity: 0.55 }],
      camera: { startScale: 1.05, endScale: 1.12, duration: 2, shake: 'heavy' },
      characters: [{ characterId: 'belzatoras', pose: 'demonas', x: 56, height: 52, bottom: 6, depth: 9, entrance: 'slide-up' }],
      sfxUrl: null, // PLACEHOLDER: milžiniškas ginklas perskelia rikiuotę; du žirgai krinta
      text: null, holdMs: 1200,
    }),
    // 14 — Atkirsti žmonės
    C('s14', `${A}/bg-apsupties-laukas.svg`, {
      characters: [{ characterId: 'kapitonas', pose: 'kovinis', x: 40, height: 92, depth: 12 }],
      speakerId: 'kapitonas', text: { lt: 'Pleištas padalytas. Galinė grupė — gyva.', en: 'The wedge is split. The rear group is alive.' },
      holdMs: 500,
    }),
    // 15 — Durys dar užvertos
    C('s15a', `${A}/bg-vartu-kiemas.svg`, {
      characters: [{ characterId: 'vartu-kapitonas', pose: 'neutral', x: 60, height: 86, depth: 12, flip: true }],
      speakerId: 'vartu-kapitonas', text: { lt: 'Atidarom?', en: 'Do we open?' },
    }),
    C('s15b', `${A}/bg-vartu-kiemas.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 36, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Dar ne. Pirma sujungsim jų liniją.', en: 'Not yet. First we rejoin their line.' },
      holdMs: 800,
    }),
    // 16 — Prazaras išeina (siaura kovinė anga)
    S('s16', `${A}/bg-apsupties-laukas.svg`, {
      effects: [{ kind: 'dust', intensity: 0.35 }],
      characters: [
        { characterId: 'prazaras', pose: 'kalavijas', x: 32, height: 90, depth: 12, entrance: 'slide-left' },
        { characterId: 'kapitonas', pose: 'kovinis', x: 72, height: 84, depth: 11, flip: true, dim: 0.15 },
      ],
      speakerId: 'prazaras', text: { lt: 'Tu laikai priekinę grupę. Aš pasieksiu galinę.', en: 'You hold the front group. I will reach the rear.' },
      holdMs: 500,
    }),
    // 17 — Pirmas bendras smūgis → kova
    C('s17', `${A}/bg-apsupties-laukas.svg`, {
      tint: 'rgba(90,140,220,0.08)',
      effects: [{ kind: 'dust', intensity: 0.5 }],
      camera: { startScale: 1.05, endScale: 1.11, duration: 2, shake: 'heavy' },
      characters: [
        { characterId: 'kapitonas', pose: 'kovinis', x: 30, height: 90, depth: 12 },
        { characterId: 'belzatoras', pose: 'demonas', x: 56, height: 48, bottom: 6, depth: 9 },
        { characterId: 'prazaras', pose: 'kalavijas', x: 80, height: 86, depth: 11, flip: true },
      ],
      sfxUrl: null, // PLACEHOLDER: mithrilo skydas sulaiko ginklą; kirtis į koją
      text: null, holdMs: 1000, // UI atsiranda ant bendro smūgio pasekmės
    }),
  ],
}

export const m06post: MotionComicDef = {
  version: 1, musicUrl: null, ambientUrl: null, typewriter: true, autoAdvanceAfterVoice: false,
  characters: CAST,
  shots: [
    // 01 — Durys atsiveria (kapitonas įžengia paskutinis, atbulas)
    S('p01', `${A}/bg-vartu-kiemas.svg`, {
      transition: { type: 'cut' },
      effects: [{ kind: 'dust', intensity: 0.25 }],
      characters: [{ characterId: 'kapitonas', pose: 'kovinis', x: 60, height: 88, depth: 12, flip: true, entrance: 'slide-right' }],
      sfxUrl: null, // PLACEHOLDER: neštuvai, vartų grandinės
      text: null, holdMs: 1500,
    }),
    // 02 — Pirmas susitikimas
    C('p02a', `${A}/bg-vartu-kiemas.svg`, {
      characters: [
        { characterId: 'kapitonas', pose: 'neutral', x: 64, height: 88, depth: 12, flip: true },
        { characterId: 'prazaras', pose: 'neutral', x: 30, height: 88, depth: 12 },
      ],
      speakerId: 'kapitonas', text: { lt: 'Maniau, pirmiausia įleisi kardus.', en: 'I thought you would let the swords in first.' },
    }),
    C('p02b', `${A}/bg-vartu-kiemas.svg`, {
      characters: [
        { characterId: 'kapitonas', pose: 'neutral', x: 64, height: 88, depth: 12, flip: true, dim: 0.2 },
        { characterId: 'prazaras', pose: 'neutral', x: 30, height: 88, depth: 12 },
      ],
      speakerId: 'prazaras', text: { lt: 'Kardai gali palaukti. Kraujas — ne.', en: 'Swords can wait. Blood cannot.' },
      holdMs: 500,
    }),
    // 03 — Gydytojos darbas
    C('p03a', `${A}/bg-vartu-kiemas.svg`, {
      characters: [{ characterId: 'gydytoja', pose: 'neutral', x: 44, height: 86, depth: 12 }],
      speakerId: 'gydytoja', text: { lt: 'Kas gali stovėti, neša tą, kuris negali.', en: 'Whoever can stand carries the one who cannot.' },
      holdMs: 600, // Ordino kapitonas pats pakelia vieną sužeistąjį
    }),
    // 04 — Kiek laiko miestas laiko
    C('p04a', `${A}/bg-vartu-kiemas.svg`, {
      characters: [
        { characterId: 'kapitonas', pose: 'neutral', x: 62, height: 88, depth: 12, flip: true },
        { characterId: 'prazaras', pose: 'neutral', x: 30, height: 88, depth: 12, dim: 0.15 },
      ],
      speakerId: 'kapitonas', text: { lt: 'Kiek dienų laikotės?', en: 'How many days have you held?' },
    }),
    C('p04b', `${A}/bg-vartu-kiemas.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 38, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Vieną.', en: 'One.' },
      holdMs: 800, // kapitonas pažvelgia į apdegusias sienas — atrodo ilgiau
    }),
    // 05 — Ko reikės rytoj
    C('p05a', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'isako', x: 34, height: 90, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Mums reikia vaistų, maisto ir žmonių sienoms.', en: 'We need medicine, food and hands for the walls.' },
    }),
    C('p05b', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'kapitonas', pose: 'neutral', x: 58, height: 88, depth: 12, flip: true }],
      speakerId: 'kapitonas',
      text: { lt: 'Atvedžiau žmones. Kiti du kroviniai turėjo ateiti pietų keliu.', en: 'I brought people. The other two shipments were to come by the southern road.' },
      holdMs: 500,
    }),
    // 06 — Balta vėliava (be žodžių)
    S('p06', `${A}/bg-vartai-isore.svg`, {
      tint: 'rgba(220,215,200,0.07)',
      effects: [{ kind: 'fog', intensity: 0.3 }],
      characters: [{ characterId: 'pasiuntinys', pose: 'neutral', x: 52, height: 84, depth: 11, entrance: 'fade' }],
      text: null, holdMs: 1300, // iš stovyklos, kuri visą mūšį nejudėjo
    }),
    // 07 — Ne pagalbos sąrašas
    C('p07', `${A}/bg-vartu-kiemas.svg`, {
      characters: [{ characterId: 'pasiuntinys', pose: 'neutral', x: 54, height: 88, depth: 12 }],
      speakerId: 'pasiuntinys',
      text: { lt: 'Pagal vyresniojo inkvizitoriaus įsakymą perimame sanitarinę išorinių kelių kontrolę.', en: 'By order of the Senior Inquisitor we assume sanitary control of the outer roads.' },
    }),
    // 08 — Vaistai
    C('p08a', `${A}/bg-vartu-kiemas.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 30, height: 90, depth: 12 },
        { characterId: 'pasiuntinys', pose: 'neutral', x: 68, height: 84, depth: 11, flip: true, dim: 0.2 },
      ],
      speakerId: 'prazaras', text: { lt: 'Kiek vaistų vežimų atsivežėt?', en: 'How many wagons of medicine did you bring?' },
    }),
    C('p08b', `${A}/bg-vartu-kiemas.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 30, height: 90, depth: 12, dim: 0.2 },
        { characterId: 'pasiuntinys', pose: 'neutral', x: 68, height: 84, depth: 11, flip: true },
      ],
      speakerId: 'pasiuntinys', text: { lt: 'Nė vieno.', en: 'None.' },
    }),
    // 09 — Kareiviai
    C('p09a', `${A}/bg-vartu-kiemas.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 30, height: 90, depth: 12 },
        { characterId: 'pasiuntinys', pose: 'neutral', x: 68, height: 84, depth: 11, flip: true, dim: 0.2 },
      ],
      speakerId: 'prazaras', text: { lt: 'Kiek karių skirsit sienai?', en: 'How many soldiers will you give the wall?' },
    }),
    C('p09b', `${A}/bg-vartu-kiemas.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 30, height: 90, depth: 12, dim: 0.2 },
        { characterId: 'pasiuntinys', pose: 'neutral', x: 68, height: 84, depth: 11, flip: true },
      ],
      speakerId: 'pasiuntinys',
      text: { lt: 'Mūsų užduotis — užtikrinti, kad niekas neišeitų iš rizikos zonos.', en: 'Our task is to ensure that no one leaves the risk zone.' },
      holdMs: 700,
    }),
    // 10 — Dvi organizacijos
    C('p10a', `${A}/bg-vartu-kiemas.svg`, {
      characters: [{ characterId: 'kapitonas', pose: 'kovinis', x: 42, height: 92, depth: 12 }],
      speakerId: 'kapitonas', text: { lt: 'Orda yra šiaurėje.', en: 'The Horde is in the north.' },
    }),
    C('p10b', `${A}/bg-vartu-kiemas.svg`, {
      characters: [{ characterId: 'pasiuntinys', pose: 'neutral', x: 58, height: 90, depth: 12, flip: true }],
      speakerId: 'pasiuntinys', text: { lt: 'Užkratas neturi krypties.', en: 'Contagion has no direction.' },
      holdMs: 500,
    }),
    // 11 — Kernius tampa įrodymu
    C('p11a', `${A}/bg-vartu-kiemas.svg`, {
      characters: [
        { characterId: 'pasiuntinys', pose: 'neutral', x: 32, height: 88, depth: 12 },
        { characterId: 'kernius', pose: 'akis', x: 70, height: 86, depth: 11, flip: true },
      ],
      effects: [{ kind: 'magic', intensity: 0.25, color: 'rgba(138,92,246,0.25)' }],
      speakerId: 'pasiuntinys', text: { lt: 'Šitas sargybinis bus perduotas patikrai.', en: 'This watchman will be handed over for inspection.' },
    }),
    C('p11b', `${A}/bg-vartu-kiemas.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 38, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Jis niekur neis be mano įsakymo.', en: 'He goes nowhere without my order.' },
      holdMs: 600,
    }),
    // 12 — Baltas vaškas
    C('p12', `${A}/bg-vartu-kiemas.svg`, {
      characters: [{ characterId: 'pasiuntinys', pose: 'neutral', x: 54, height: 88, depth: 12 }],
      sfxUrl: null, // PLACEHOLDER: balto vaško įsakymo stingeris
      speakerId: 'pasiuntinys',
      text: { lt: 'Tada vyresnysis inkvizitorius kalbėsis su jumis abiem.', en: 'Then the Senior Inquisitor will speak with you both.' },
      holdMs: 500,
    }),
    // 13 — Tarybos durys
    S('p13', `${A}/bg-karo-kambarys.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 30, height: 88, depth: 12 },
        { characterId: 'kernius', pose: 'neutral', x: 56, height: 82, depth: 11, dim: 0.15 },
        { characterId: 'kapitonas', pose: 'neutral', x: 80, height: 84, depth: 11, flip: true, dim: 0.15 },
      ],
      camera: { startScale: 1, endScale: 1.06, duration: 6 },
      text: null, holdMs: 1500, // perėjimas į 7 misiją
    }),
  ],
}

export const m06fail = [
  { characterName: 'Ordino kapitonas', text: 'Jie dar laukia už mūsų.' },
  { characterName: 'Prazaras', text: 'Tada nepuolam vado. Pirma sujungiam liniją.' },
]
