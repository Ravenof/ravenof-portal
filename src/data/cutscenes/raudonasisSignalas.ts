// ════════════════════════════════════════════════════════════════════════════
// CUTSCENE 01 — „Raudonasis signalas" (PRE motion-comic, ~2 min)
// Šiaurinis sargybos bokštas prie senojo Varngrado kelio.
// Scenarijaus 16 kadrų → 24 runtime shot'ai (pauzės ir kalbėtojų kaitos
// skaidomos į atskirus beat'us su `cut` perėjimu — žr. KAMPANIJOS-TURINIO-GIDAS).
// Artwork/audio = PLACEHOLDER (public/campaign/raudonasis-signalas/*).
// Po scenos → kova „Išlaikykite bokštą 5 ėjimus" (scenario JSON apačioje).
// ════════════════════════════════════════════════════════════════════════════

import type { MotionComicDef } from '@/lib/campaign/motionComic'

const A = '/campaign/raudonasis-signalas'

export const raudonasisSignalasCutscene: MotionComicDef = {
  version: 1,
  // PLACEHOLDER audio (įkelk per admin ir pakeisk):
  musicUrl: null,      // tyli žema ambientinė tema
  ambientUrl: null,    // šaltas vėjas + tolimas akmenų girgždesys
  typewriter: true,
  autoAdvanceAfterVoice: false,
  characters: [
    {
      id: 'kernius', name: { lt: 'Kernius', en: 'Kernius' }, accentColor: 'rgb(200,150,60)',
      poses: { neutral: `${A}/kernius-neutral.svg`, battle: `${A}/kernius-battle.svg` },
    },
    {
      id: 'tomas', name: { lt: 'Tomas', en: 'Tomas' }, accentColor: 'rgb(120,150,190)',
      poses: { neutral: `${A}/tomas-neutral.svg`, lankas: `${A}/tomas-lankas.svg` },
    },
    {
      id: 'dargis', name: { lt: 'Dargis', en: 'Dargis' }, accentColor: 'rgb(168,160,160)',
      poses: { neutral: `${A}/dargis-speaking.svg`, profile: `${A}/dargis-profile.svg`, kalavijas: `${A}/dargis-kalavijas.svg`, nugara: `${A}/dargis-nugara.svg` },
    },
    {
      id: 'rimas', name: { lt: 'Rimas', en: 'Rimas' }, accentColor: 'rgb(138,92,246)',
      poses: { neutral: `${A}/rimas-apsestas.svg` },
    },
    {
      id: 'sargybinis', name: { lt: 'Sargybinis', en: 'Watchman' }, accentColor: 'rgb(110,120,140)',
      poses: { neutral: `${A}/sargybinis.svg` },
    },
    {
      id: 'demonas', name: { lt: 'Demonas', en: 'Demon' }, accentColor: 'rgb(200,30,30)',
      poses: { neutral: `${A}/demonas.svg` },
    },
  ],
  shots: [
    // ── 1 KADRAS — Šiaurės pakraštys (8 s) ──
    {
      id: 's01',
      background: `${A}/bg-laukai.svg`,
      effects: [{ kind: 'fog', intensity: 0.45 }],
      camera: { startScale: 1, endScale: 1.05, endX: -0.8, duration: 8 },
      transition: { type: 'cut' },
      sfxUrl: null, // PLACEHOLDER: vėjas + akmenų girgždesys
      text: {
        lt: 'Pirmasis ženklas buvo tai, kad Vethago Kalnas pradėjo kvėpuoti.',
        en: 'The first sign was that Mount Vethago began to breathe.',
      },
      voiceUrl: null,
      holdMs: 800,
    },
    // ── 2 KADRAS — Kalnas kvėpuoja (7 s; pauzė → 2 beat'ai) ──
    {
      id: 's02a',
      background: `${A}/bg-plysys.svg`,
      effects: [{ kind: 'fog', intensity: 0.3 }],
      camera: { startScale: 1, endScale: 1.04, duration: 7 },
      transition: { type: 'fade', duration: 500 },
      sfxUrl: null, // PLACEHOLDER: gilus duslus dūžis (širdies plakimas)
      text: { lt: 'Ne slinko. Ne griuvo. Nedrebėjo.', en: 'It did not slide. It did not crumble. It did not tremble.' },
      voiceUrl: null,
    },
    {
      id: 's02b',
      background: `${A}/bg-plysys.svg`,
      camera: { startScale: 1.04, endScale: 1.06, duration: 3, shake: 'light' },
      transition: { type: 'cut' },
      text: { lt: 'Kvėpavo.', en: 'It breathed.' },
      voiceUrl: null,
      holdMs: 700,
    },
    // ── 3 KADRAS — Kernius (7 s) ──
    {
      id: 's03',
      background: `${A}/bg-vidus.svg`,
      characters: [{ characterId: 'kernius', pose: 'neutral', x: 68, height: 92, depth: 12 }],
      tint: 'rgba(200,30,30,0.06)',
      camera: { startScale: 1.02, endScale: 1.09, endX: -1.5, duration: 7 },
      transition: { type: 'fade', duration: 450 },
      speakerId: 'kernius',
      text: { lt: 'Tomai...', en: 'Tomas...' },
      voiceUrl: null,
    },
    // ── 4 KADRAS — Sargybinių kambarys (7 s) ──
    {
      id: 's04',
      background: `${A}/bg-vidus.svg`,
      characters: [
        { characterId: 'tomas', pose: 'neutral', x: 34, height: 80, depth: 10 },
        { characterId: 'sargybinis', pose: 'neutral', x: 52, height: 70, depth: 8, dim: 0.25 },
        { characterId: 'kernius', pose: 'neutral', x: 82, height: 86, depth: 12 },
      ],
      camera: { startScale: 1.03, endScale: 1.05, startX: 1.2, endX: -0.8, duration: 6 },
      transition: { type: 'fade', duration: 420 },
      speakerId: 'kernius',
      text: { lt: 'Tomai. Kalnas juda.', en: 'Tomas. The mountain is moving.' },
      voiceUrl: null,
    },
    // ── 5 KADRAS — Dargis prie lango (8 s; profilis → per petį) ──
    {
      id: 's05a',
      background: `${A}/bg-vidus.svg`,
      characters: [{ characterId: 'dargis', pose: 'profile', x: 40, height: 90, depth: 12 }],
      camera: { startScale: 1.02, endScale: 1.05, duration: 5 },
      transition: { type: 'cut' },
      speakerId: 'dargis',
      text: { lt: 'Nekalbėkit nesąmonių.', en: 'Stop talking nonsense.' },
      voiceUrl: null,
      holdMs: 900,
    },
    {
      id: 's05b',
      background: `${A}/bg-plysys.svg`,
      characters: [{ characterId: 'dargis', pose: 'nugara', x: 22, height: 96, bottom: -8, depth: 16, dim: 0.2 }],
      effects: [{ kind: 'fog', intensity: 0.25 }],
      camera: { startScale: 1.02, endScale: 1.06, endX: 1, duration: 6 },
      transition: { type: 'cut' },
      speakerId: 'dargis',
      speakerName: { lt: 'Dargis, tyliau', en: 'Dargis, quieter' },
      text: { lt: '...Užkurkit signalą. Raudoną.', en: '...Light the signal. The red one.' },
      voiceUrl: null,
    },
    // ── 6 KADRAS — Plyšys (8 s; du kalbėtojai → 2 beat'ai) ──
    {
      id: 's06a',
      background: `${A}/bg-plysys.svg`,
      camera: { startScale: 1.05, endScale: 1.08, startY: 1.5, endY: -1.5, duration: 6, punchIn: true },
      transition: { type: 'fade', duration: 400 },
      sfxUrl: null, // PLACEHOLDER: akmens trūkimas + tolimas riksmas
      speakerId: 'tomas',
      speakerName: { lt: 'Tomas', en: 'Tomas' },
      text: { lt: 'Nežinau, ką matau.', en: 'I do not know what I am looking at.' },
      voiceUrl: null,
    },
    {
      id: 's06b',
      background: `${A}/bg-plysys.svg`,
      camera: { startScale: 1.08, endScale: 1.09, duration: 3 },
      transition: { type: 'cut' },
      speakerName: { lt: 'Dargis, už kadro', en: 'Dargis, off-screen' },
      text: { lt: 'Todėl ir užkurkit raudoną.', en: 'That is exactly why you light the red one.' },
      voiceUrl: null,
    },
    // ── 7 KADRAS — Signalas (7 s) ──
    {
      id: 's07',
      background: `${A}/bg-signalas.svg`,
      characters: [
        { characterId: 'tomas', pose: 'neutral', x: 26, height: 62, depth: 8, dim: 0.35 },
        { characterId: 'dargis', pose: 'neutral', x: 74, height: 66, depth: 10, dim: 0.3, flip: true },
      ],
      effects: [{ kind: 'embers', intensity: 0.6 }],
      tint: 'rgba(200,30,30,0.10)',
      camera: { startScale: 1.06, endScale: 1, startY: 2, endY: -1, duration: 6 },
      transition: { type: 'cut' },
      musicUrl: null,  // PLACEHOLDER: muzikoje atsiranda žemas būgnas
      sfxUrl: null,    // PLACEHOLDER: liepsnos pliūpsnis
      text: null,
      holdMs: 1500,
    },
    // ── 8 KADRAS — Sustingę dūmai (8 s) ──
    {
      id: 's08',
      background: `${A}/bg-dumai.svg`,
      camera: { startScale: 1, endScale: 1.05, startX: -1.5, endX: 1.5, duration: 8 },
      transition: { type: 'fade', duration: 600 },
      ambientUrl: null, // PLACEHOLDER: vėjas staiga NUTYLA (tylos ambient'as)
      text: {
        lt: 'Taisyklės, kuriomis Dargis gyveno penkiasdešimt metų, buvo atšauktos.',
        en: 'The rules Dargis had lived by for fifty years had just been revoked.',
      },
      voiceUrl: null,
      holdMs: 600,
    },
    // ── 9 KADRAS — Kita plyšio pusė (9 s, be dialogo) ──
    {
      id: 's09',
      background: `${A}/bg-plysio-vidus.svg`,
      effects: [{ kind: 'embers', intensity: 0.5 }, { kind: 'ash', intensity: 0.4 }],
      camera: { startScale: 1, endScale: 1.07, endY: 1.5, duration: 8 },
      transition: { type: 'wipe-diagonal', duration: 520 },
      sfxUrl: null, // PLACEHOLDER: tolima giesmė + grandinės + smūgis į šlaitą
      text: null,
      holdMs: 2200,
    },
    // ── 10 KADRAS — Pirmieji demonai (7 s, be dialogo) ──
    {
      id: 's10',
      background: `${A}/bg-slaitas.svg`,
      characters: [{ characterId: 'demonas', pose: 'neutral', x: 38, height: 44, bottom: 2, depth: 18 }],
      effects: [{ kind: 'ash', intensity: 0.5 }],
      tint: 'rgba(200,30,30,0.08)',
      camera: { startScale: 1.09, endScale: 1, duration: 7 },
      transition: { type: 'cut' },
      sfxUrl: null, // PLACEHOLDER: riaumojimai + stiprėjanti giesmė
      text: null,
      holdMs: 1800,
    },
    // ── 11 KADRAS — Rimas (8 s; pauzė → 2 beat'ai) ──
    {
      id: 's11a',
      background: `${A}/bg-vidus.svg`,
      characters: [{ characterId: 'rimas', pose: 'neutral', x: 50, height: 100, bottom: -4, depth: 12 }],
      effects: [{ kind: 'magic', intensity: 0.4, color: 'rgba(138,92,246,0.3)' }],
      camera: { startScale: 1.02, endScale: 1.1, endY: -1, duration: 6, punchIn: true },
      transition: { type: 'fade', duration: 450 },
      speakerId: 'rimas',
      speakerName: { lt: 'Rimas / svetimas balsas', en: 'Rimas / a foreign voice' },
      text: { lt: 'Mažieji eina pirmi.', en: 'The little ones go first.' },
      voiceUrl: null,
    },
    {
      id: 's11b',
      background: `${A}/bg-vidus.svg`,
      characters: [{ characterId: 'rimas', pose: 'neutral', x: 50, height: 100, bottom: -4, depth: 12 }],
      effects: [{ kind: 'magic', intensity: 0.5, color: 'rgba(138,92,246,0.35)' }],
      camera: { startScale: 1.1, endScale: 1.12, duration: 3 },
      transition: { type: 'cut' },
      speakerId: 'rimas',
      speakerName: { lt: 'Rimas / svetimas balsas', en: 'Rimas / a foreign voice' },
      text: { lt: 'Jie tikrina, ar pasaulis dar minkštas.', en: 'They are testing whether the world is still soft.' },
      voiceUrl: null,
      holdMs: 500,
    },
    // ── 12 KADRAS — Dargio smūgis (5 s) ──
    {
      id: 's12',
      background: `${A}/bg-vidus.svg`,
      characters: [
        { characterId: 'dargis', pose: 'kalavijas', x: 34, height: 92, depth: 14, entrance: 'slide-left' },
        { characterId: 'rimas', pose: 'neutral', x: 72, height: 74, bottom: -16, depth: 10, dim: 0.45 },
      ],
      camera: { startScale: 1.05, endScale: 1.06, duration: 4, shake: 'light' },
      transition: { type: 'cut' },
      sfxUrl: null, // PLACEHOLDER: metalo smūgis į šalmą + garo šnypštimas
      speakerId: 'dargis',
      text: { lt: 'Prie sienų. Visi.', en: 'To the walls. All of you.' },
      voiceUrl: null,
    },
    // ── 13 KADRAS — Pirmasis smūgis (7 s, be dialogo) ──
    {
      id: 's13',
      background: `${A}/bg-laiptai.svg`,
      camera: { startScale: 1, endScale: 1.07, endY: 2.5, duration: 7 },
      transition: { type: 'fade', duration: 500 },
      sfxUrl: null, // PLACEHOLDER: vienas sunkus smūgis + vyrių cypimas
      text: null,
      holdMs: 1600,
    },
    // ── 14 KADRAS — Juokas už durų (7 s; 3 beat'ai) ──
    {
      id: 's14a',
      background: `${A}/bg-durys.svg`,
      effects: [{ kind: 'dust', intensity: 0.4 }, { kind: 'magic', intensity: 0.35, color: 'rgba(138,92,246,0.3)' }],
      camera: { startScale: 1.01, endScale: 1.06, duration: 6 },
      transition: { type: 'cut' },
      sfxUrl: null, // PLACEHOLDER: antras smūgis + vaikiškas demono juokas
      speakerName: { lt: 'Tomas, tyliai', en: 'Tomas, quietly' },
      text: { lt: 'Kaip jie priėjo?', en: 'How did they get here?' },
      voiceUrl: null,
    },
    {
      id: 's14b',
      background: `${A}/bg-durys.svg`,
      effects: [{ kind: 'magic', intensity: 0.35, color: 'rgba(138,92,246,0.3)' }],
      camera: { startScale: 1.06, endScale: 1.08, duration: 3 },
      transition: { type: 'cut' },
      speakerName: { lt: 'Dargis', en: 'Dargis' },
      text: { lt: 'Jie neatėjo.', en: 'They did not come.' },
      voiceUrl: null,
      holdMs: 500,
    },
    {
      id: 's14c',
      background: `${A}/bg-durys.svg`,
      effects: [{ kind: 'magic', intensity: 0.4, color: 'rgba(138,92,246,0.35)' }],
      camera: { startScale: 1.08, endScale: 1.1, duration: 3, punchIn: true },
      transition: { type: 'cut' },
      speakerName: { lt: 'Dargis', en: 'Dargis' },
      text: { lt: 'Jie jau buvo čia.', en: 'They were already here.' },
      voiceUrl: null,
      holdMs: 600,
    },
    // ── 15 KADRAS — Ginklai (7 s; montažas → bendras planas, be dialogo) ──
    {
      id: 's15',
      background: `${A}/bg-vidus.svg`,
      characters: [
        { characterId: 'dargis', pose: 'kalavijas', x: 22, height: 84, depth: 14 },
        { characterId: 'kernius', pose: 'battle', x: 46, height: 78, depth: 11 },
        { characterId: 'tomas', pose: 'lankas', x: 68, height: 76, depth: 9 },
        { characterId: 'sargybinis', pose: 'neutral', x: 86, height: 70, depth: 7, dim: 0.2 },
      ],
      camera: { startScale: 1.06, endScale: 1.02, duration: 5 },
      transition: { type: 'cut' },
      musicUrl: null, // PLACEHOLDER: KOVINIS ritmas — tęsis prasidėjus misijai
      sfxUrl: null,   // PLACEHOLDER: lanko templė, oda ir metalas, kalavijas iš makšties
      text: null,
      holdMs: 1600,
    },
    // ── 16 KADRAS — Prie laiptų (8 s; 3 beat'ai + finalas) ──
    {
      id: 's16a',
      background: `${A}/bg-laiptai.svg`,
      characters: [
        { characterId: 'dargis', pose: 'nugara', x: 42, height: 96, bottom: -6, depth: 16 },
        { characterId: 'kernius', pose: 'battle', x: 18, height: 62, depth: 8, dim: 0.3 },
        { characterId: 'tomas', pose: 'lankas', x: 70, height: 60, depth: 7, dim: 0.3 },
      ],
      effects: [{ kind: 'magic', intensity: 0.3, color: 'rgba(138,92,246,0.28)' }],
      camera: { startScale: 1, endScale: 1.05, duration: 6 },
      transition: { type: 'fade', duration: 450 },
      speakerId: 'dargis',
      text: { lt: 'Raudonas signalas užkurtas.', en: 'The red signal is lit.' },
      voiceUrl: null,
      holdMs: 600,
    },
    {
      id: 's16b',
      background: `${A}/bg-laiptai.svg`,
      characters: [
        { characterId: 'dargis', pose: 'nugara', x: 42, height: 96, bottom: -6, depth: 16 },
      ],
      effects: [{ kind: 'magic', intensity: 0.35, color: 'rgba(138,92,246,0.3)' }],
      camera: { startScale: 1.05, endScale: 1.09, endY: 1.5, duration: 5 },
      transition: { type: 'cut' },
      speakerId: 'dargis',
      text: {
        lt: 'Dabar turim pasirūpinti, kad Varngradas jį pamatytų.',
        en: 'Now we make sure Varngrad gets to see it.',
      },
      voiceUrl: null,
    },
    {
      id: 's16c',
      background: `${A}/bg-laiptai.svg`,
      characters: [
        { characterId: 'dargis', pose: 'kalavijas', x: 40, height: 92, depth: 15 },
        { characterId: 'kernius', pose: 'battle', x: 16, height: 66, depth: 9 },
        { characterId: 'tomas', pose: 'lankas', x: 68, height: 64, depth: 8 },
        { characterId: 'sargybinis', pose: 'neutral', x: 88, height: 58, depth: 6 },
      ],
      effects: [{ kind: 'magic', intensity: 0.55, color: 'rgba(138,92,246,0.4)' }],
      tint: 'rgba(138,92,246,0.08)',
      camera: { startScale: 1.04, endScale: 1.08, duration: 3, shake: 'heavy' },
      transition: { type: 'cut' },
      sfxUrl: null, // PLACEHOLDER: durys įvirsta + demonų klyksmas
      speakerId: 'dargis',
      speakerName: { lt: 'Dargis, garsiai', en: 'Dargis, loudly' },
      text: { lt: 'Varngrado vyrai! Prie laiptų!', en: 'Men of Varngrad! To the stairs!' },
      voiceUrl: null,
      holdMs: 700,
    },
  ],
}

// ════════════════════════════════════════════════════════════════════════════
// MISIJOS „RAUDONASIS SIGNALAS" scenario JSON (Node → Advanced JSON → scenario).
// Tikslas: išlaikyti bokštą 5 ėjimus; demonai negali pasiekti pabėgimo liuko.
// PAKEISK <demon-uuid-*> tikrais Demonų frakcijos kortų id iš admin → Kortos.
// Pre-cutscene: ši scena (admin'e sukurk cutscene, į metadata.motionComic
// įklijuok šio failo JSON — /dev/cutscene puslapyje yra "Kopijuoti JSON").
// ════════════════════════════════════════════════════════════════════════════
export const raudonasisSignalasScenario = {
  survivalTurns: 5,
  objectives: [
    { id: 'liukas', kind: 'gate', label: 'Pabėgimo liukas', hp: 15, maxHp: 15, side: 'player' },
  ],
  waves: [
    { id: 'mazieji1', name: 'Mažieji eina pirmi', triggerType: 'turn', turn: 2, spawnSide: 'top', warningText: 'Mažieji eina pirmi!', exactUnits: ['<demon-uuid-1>', '<demon-uuid-1>'] },
    { id: 'mazieji2', name: 'Antra banga', triggerType: 'turn', turn: 4, spawnSide: 'top', warningText: 'Durys neatlaikė!', exactUnits: ['<demon-uuid-1>', '<demon-uuid-2>'] },
  ],
  rules: [
    // pirmoji kovos replika
    { trigger: 'onBattleStart', once: true, actions: [{ type: 'dialogue', text: 'Kerniau, laikykis atokiau nuo durų. Jeigu bokštas kris – žinią nuneši tu.', characterName: 'Dargis' }] },
    // demonai kas ėjimą spaudžia liuką, kol jų yra ant lentos
    { trigger: 'onTurnEnd', everyTurns: 1, conditions: [{ lhs: 'enemyKills', op: '>=', rhs: 0 }], actions: [{ type: 'damageObjective', objectiveId: 'liukas', amount: 2 }] },
    // desperacija žemame HP
    { trigger: 'onCondition', once: true, conditions: [{ lhs: 'playerHp', op: '<=', rhs: 10 }], actions: [{ type: 'dialogue', text: 'Laikykitės! Signalas jau dega – Varngradas turi jį pamatyti!', characterName: 'Dargis' }] },
  ],
}
