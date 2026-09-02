// ════════════════════════════════════════════════════════════════════════════
// M4 „Trys varpai" — V3
// PRE „Ką miestas saugo" (16 beat'ų → 21 shots, ~2:35) +
// POST „Po gatvėmis" (10 beat'ų → 13 shots) + FAIL.
// LOCK: PRE baigiasi triptiku (dega grūdai / puolama gydykla / slysta grandinė)
// — pirmas tikslas „Išsaugok bent dvi vietas; puiki pergalė — visas tris".
// ════════════════════════════════════════════════════════════════════════════
import type { MotionComicDef } from '@/lib/campaign/motionComic'
import { A, CAST, S, C } from './cast'

export const m04pre: MotionComicDef = {
  version: 1, musicUrl: null, ambientUrl: null, typewriter: true, autoAdvanceAfterVoice: false,
  characters: CAST,
  shots: [
    // ── A. Trumpa ramybė ──
    // 01 — Duonos eilė (≥2,5 s su žmonėmis)
    S('s01', `${A}/bg-miesto-gatve.svg`, {
      transition: { type: 'cut' },
      tint: 'rgba(240,180,41,0.06)',
      effects: [{ kind: 'embers', intensity: 0.15 }],
      camera: { startScale: 1, endScale: 1.05, duration: 8 },
      characters: [
        { characterId: 'mergaite', pose: 'neutral', x: 46, height: 50, bottom: -6, depth: 10 },
        { characterId: 'intendantas', pose: 'neutral', x: 72, height: 80, depth: 10, flip: true, dim: 0.15 },
      ],
      text: null, holdMs: 2500,
    }),
    // 02 — Skaičiai turi veidus
    C('s02a', `${A}/bg-miesto-gatve.svg`, {
      characters: [
        { characterId: 'intendantas', pose: 'neutral', x: 60, height: 86, depth: 12, flip: true },
        { characterId: 'prazaras', pose: 'neutral', x: 28, height: 88, depth: 12, dim: 0.15 },
      ],
      speakerId: 'intendantas',
      text: { lt: 'Iki apgulties užteko šešioms savaitėms. Su pabėgėliais — keturioms.', en: 'Before the siege we had six weeks. With the refugees — four.' },
    }),
    C('s02b', `${A}/bg-miesto-gatve.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 36, height: 90, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Dalink vienodai.', en: 'Share it evenly.' },
    }),
    C('s02c', `${A}/bg-miesto-gatve.svg`, {
      characters: [{ characterId: 'intendantas', pose: 'neutral', x: 58, height: 86, depth: 12, flip: true }],
      speakerId: 'intendantas', text: { lt: 'Kariams irgi?', en: 'Soldiers too?' },
    }),
    C('s02d', `${A}/bg-miesto-gatve.svg`, { // eilėje — sužeistas vartų sargybinis
      characters: [
        { characterId: 'sargybinis', pose: 'neutral', x: 62, height: 76, depth: 10, flip: true, dim: 0.15 },
        { characterId: 'prazaras', pose: 'neutral', x: 30, height: 90, depth: 12 },
      ],
      speakerId: 'prazaras', text: { lt: 'Visiems.', en: 'Everyone.' },
      holdMs: 700,
    }),
    // 03 — Gydykla
    S('s03a', `${A}/bg-gydykla.svg`, {
      characters: [
        { characterId: 'gydytoja', pose: 'neutral', x: 36, height: 84, depth: 11 },
        { characterId: 'kernius', pose: 'neutral', x: 68, height: 84, depth: 11, flip: true },
      ],
      speakerId: 'gydytoja',
      text: { lt: 'Jei tau vėl prasidės dūmas, pasakai prieš krisdamas.', en: 'If the smoke starts again, you tell me before you fall.' },
    }),
    C('s03b', `${A}/bg-gydykla.svg`, {
      characters: [{ characterId: 'kernius', pose: 'neutral', x: 48, height: 88, depth: 12 }],
      speakerId: 'kernius', text: { lt: 'Jei spėsiu.', en: 'If I have time to.' },
      holdMs: 500, // ne juokelis — abu pripažįsta riziką
    }),
    // 04 — Vartų mechanizmas
    S('s04', `${A}/bg-vartu-kiemas.svg`, {
      characters: [{ characterId: 'vartu-kapitonas', pose: 'neutral', x: 42, height: 88, depth: 12 }],
      effects: [{ kind: 'embers', intensity: 0.2 }],
      sfxUrl: null, // PLACEHOLDER: kalvių žaizdras, keičiamas krumpliaratis
      speakerId: 'vartu-kapitonas', text: { lt: 'Vieną uždarymą atlaikys. Antro nežadu.', en: 'It will take one more closing. I promise no second.' },
      holdMs: 500,
    }),
    // ── B. Kerniaus akis renkasi taikinius ──
    // 05 — Karo kambarys
    S('s05', `${A}/bg-karo-kambarys.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'isako', x: 34, height: 90, depth: 12 },
        { characterId: 'kernius', pose: 'neutral', x: 74, height: 80, depth: 10, flip: true, dim: 0.2 },
      ],
      speakerId: 'prazaras', text: { lt: 'Jei viena vieta šauksis pagalbos, rezervas eis ten.', en: 'If one place calls for help, the reserve goes there.' },
    }),
    // 06 — Žvilgsnis juda pats
    C('s06a', `${A}/bg-karo-kambarys.svg`, {
      effects: [{ kind: 'magic', intensity: 0.3, color: 'rgba(138,92,246,0.3)' }],
      characters: [{ characterId: 'kernius', pose: 'akis', x: 54, height: 92, depth: 12 }],
      camera: { startScale: 1.04, endScale: 1.09, duration: 4, punchIn: true },
      speakerId: 'kernius', text: { lt: 'Aš jos nejudinu.', en: 'I am not moving it.' },
      holdMs: 600, // Prazaras uždengia žemėlapį audiniu
    }),
    // 07 — Kaltė
    C('s07a', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'kernius', pose: 'akis', x: 50, height: 90, depth: 12 }],
      speakerId: 'kernius',
      text: { lt: 'Išveskit mane už sienos. Jei jis mato per mane, nustos matuoti miestą.', en: 'Take me outside the walls. If he sees through me, he will stop measuring the city.' },
    }),
    C('s07b', `${A}/bg-karo-kambarys.svg`, {
      characters: [
        { characterId: 'kernius', pose: 'akis', x: 64, height: 84, depth: 11, flip: true, dim: 0.2 },
        { characterId: 'prazaras', pose: 'neutral', x: 28, height: 88, depth: 12 },
      ],
      speakerId: 'prazaras', text: { lt: 'Ar žinai, kad nustos?', en: 'Do you know that he will?' },
      holdMs: 800, // Kernius tyli
    }),
    C('s07c', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 38, height: 92, depth: 12 }],
      speakerId: 'prazaras',
      text: { lt: 'Tada neleisiu priešui už mus pasirinkti, ką aukoti.', en: 'Then I will not let the enemy choose our sacrifices for us.' },
      holdMs: 1000,
    }),
    // ── C. Trys smūgiai ──
    // 08 — Pirmas varpas (vartai)
    S('s08', `${A}/bg-vartu-kiemas.svg`, {
      transition: { type: 'cut' },
      tint: 'rgba(200,30,30,0.08)',
      effects: [{ kind: 'dust', intensity: 0.35 }],
      camera: { startScale: 1.02, endScale: 1.07, duration: 3, shake: 'light' },
      sfxUrl: null, // PLACEHOLDER: sunkus pavojaus varpas; kauliniai pjūklai iš griovio
      speakerId: 'vartu-kapitonas', speakerName: { lt: 'Vartų kapitono balsas', en: 'Gate captain’s voice' },
      text: { lt: 'Jie eina į mechanizmą, ne į sieną!', en: 'They are going for the mechanism, not the wall!' },
    }),
    // 09 — Antras varpas (grūdai)
    C('s09', `${A}/bg-miesto-gatve.svg`, {
      tint: 'rgba(120,200,80,0.06)',
      effects: [{ kind: 'embers', intensity: 0.35 }],
      camera: { startScale: 1.03, endScale: 1.08, duration: 3, shake: 'light' },
      sfxUrl: null, // PLACEHOLDER: žemesnis grūdų aikštės varpas; molinis indas su žalsva ugnimi
      speakerId: 'intendantas', speakerName: { lt: 'Intendanto balsas', en: 'Quartermaster’s voice' },
      text: { lt: 'Ugnis ant sandėlio!', en: 'Fire on the granary!' },
    }),
    // 10 — Trečias varpas (gydykla)
    C('s10', `${A}/bg-gydykla.svg`, {
      tint: 'rgba(200,30,30,0.07)',
      effects: [{ kind: 'dust', intensity: 0.4 }],
      camera: { startScale: 1.03, endScale: 1.08, duration: 3, shake: 'light' },
      sfxUrl: null, // PLACEHOLDER: skubus gydyklos varpelis; grotos kyla iš apačios
      speakerId: 'gydytoja', speakerName: { lt: 'Gydytojos balsas', en: 'Healer’s voice' },
      text: { lt: 'Jie po mumis!', en: 'They are beneath us!' },
      holdMs: 500,
    }),
    // ── D. Sprendimas padalija jėgas ──
    // 11 — Neįmanomas rezervas
    S('s11a', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'vartu-kapitonas', pose: 'neutral', x: 62, height: 86, depth: 12, flip: true }],
      speakerId: 'vartu-kapitonas', text: { lt: 'Turim vieną rezervą. Kur siunčiam?', en: 'We have one reserve. Where does it go?' },
    }),
    C('s11b', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'isako', x: 36, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Dalink į tris.', en: 'Split it in three.' },
    }),
    C('s11c', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'vartu-kapitonas', pose: 'neutral', x: 62, height: 86, depth: 12, flip: true }],
      speakerId: 'vartu-kapitonas', text: { lt: 'Tada niekur neužteks.', en: 'Then it will be enough nowhere.' },
    }),
    C('s11d', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'isako', x: 40, height: 94, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Užteks tiek, kiek nuvesim patys.', en: 'It will be enough where we lead it ourselves.' },
      holdMs: 1000,
    }),
    // 12 — Kerniaus vaidmuo
    C('s12a', `${A}/bg-karo-kambarys.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 30, height: 88, depth: 12 },
        { characterId: 'kernius', pose: 'akis', x: 66, height: 86, depth: 11, flip: true },
      ],
      speakerId: 'prazaras', text: { lt: 'Tu matai jų jungtis. Sakysi, kur jie keičia kryptį.', en: 'You see their threads. You will call out where they change direction.' },
    }),
    C('s12b', `${A}/bg-karo-kambarys.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 30, height: 88, depth: 12, dim: 0.2 },
        { characterId: 'kernius', pose: 'akis', x: 66, height: 86, depth: 11, flip: true },
      ],
      speakerId: 'kernius', text: { lt: 'O jei jie keis ją pagal mane?', en: 'And if they change it because of me?' },
    }),
    C('s12c', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 40, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Tada pirmą kartą pažiūrėsi ten, kur mes norim.', en: 'Then for once you will look where we want you to.' },
      holdMs: 800,
    }),
    // ── E. Mūšis prasideda trijose vietose ──
    // 13 — Grūdai užsidega (mergaitė kitoje liepsnos pusėje)
    S('s13', `${A}/bg-miesto-gatve.svg`, {
      transition: { type: 'cut' },
      tint: 'rgba(240,120,40,0.1)',
      effects: [{ kind: 'embers', intensity: 0.55 }, { kind: 'smoke', intensity: 0.3 }],
      camera: { startScale: 1.04, endScale: 1.09, duration: 2, shake: 'light' },
      characters: [{ characterId: 'mergaite', pose: 'neutral', x: 70, height: 44, bottom: -6, depth: 9, dim: 0.15 }],
      sfxUrl: null, // PLACEHOLDER: indas sudūžta, ugnis ant durų
      text: null, holdMs: 1100,
    }),
    // 14 — Gydykla pralaužiama
    C('s14', `${A}/bg-gydykla.svg`, {
      effects: [{ kind: 'dust', intensity: 0.45 }, { kind: 'smoke', intensity: 0.3 }],
      camera: { startScale: 1.04, endScale: 1.09, duration: 2, shake: 'light' },
      characters: [{ characterId: 'gydytoja', pose: 'neutral', x: 36, height: 86, depth: 12 }],
      sfxUrl: null, // PLACEHOLDER: demonas įsikimba į lovos rėmą
      text: null, holdMs: 1100,
    }),
    // 15 — Mechanizmo smūgis
    C('s15', `${A}/bg-vartu-kiemas.svg`, {
      effects: [{ kind: 'dust', intensity: 0.5 }],
      camera: { startScale: 1.05, endScale: 1.1, duration: 2, shake: 'heavy' },
      sfxUrl: null, // PLACEHOLDER: pjūklas perkerta atramą; grandinė slysta
      text: null, holdMs: 1100,
    }),
    // 16 — Pirmas pasirinkimas → kova
    C('s16', `${A}/bg-karo-kambarys.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'kalavijas', x: 32, height: 92, depth: 12 },
        { characterId: 'kernius', pose: 'akis', x: 68, height: 86, depth: 11, flip: true },
      ],
      effects: [{ kind: 'magic', intensity: 0.3, color: 'rgba(138,92,246,0.3)' }],
      camera: { startScale: 1.04, endScale: 1.1, duration: 3, punchIn: true },
      speakerId: 'prazaras',
      text: { lt: 'Kerniau, rodyk jų jungtį. Kiti — rinkitės pirmą liniją ir judėkit!', en: 'Kernius, show us their thread. The rest — pick your first line and move!' },
      holdMs: 700, // UI iškart prašo pasirinkti rezervo dislokaciją
    }),
  ],
}

export const m04post: MotionComicDef = {
  version: 1, musicUrl: null, ambientUrl: null, typewriter: true, autoAdvanceAfterVoice: false,
  characters: CAST,
  shots: [
    // 01 — Ką išsaugojome (lėti kadrai)
    S('p01', `${A}/bg-miesto-gatve.svg`, {
      transition: { type: 'cut' },
      tint: 'rgba(240,180,41,0.05)',
      effects: [{ kind: 'smoke', intensity: 0.25 }],
      camera: { startScale: 1, endScale: 1.05, duration: 7 },
      text: null, holdMs: 1600,
    }),
    // 02 — Mergaitės varnas (be dialogo)
    C('p02', `${A}/bg-miesto-gatve.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 36, height: 88, depth: 12 },
        { characterId: 'mergaite', pose: 'neutral', x: 62, height: 50, bottom: -6, depth: 10 },
      ],
      tint: 'rgba(240,220,180,0.05)',
      text: null, holdMs: 1500,
    }),
    // 03 — Kerniaus kaltė
    C('p03a', `${A}/bg-miesto-gatve.svg`, {
      characters: [{ characterId: 'kernius', pose: 'akis', x: 46, height: 90, depth: 12 }],
      speakerId: 'kernius', text: { lt: 'Jie rado tas vietas per mane.', en: 'They found those places through me.' },
    }),
    C('p03b', `${A}/bg-miesto-gatve.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 40, height: 92, depth: 12 }],
      speakerId: 'prazaras',
      text: { lt: 'Ir mes per tave radom jų jungtį. Abu faktai tikri.', en: 'And through you we found their thread. Both facts are true.' },
      holdMs: 800,
    }),
    // 04 — Ne pasitraukimas
    C('p04a', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'vartu-kapitonas', pose: 'neutral', x: 60, height: 86, depth: 12, flip: true }],
      speakerId: 'vartu-kapitonas', text: { lt: 'Demonai atsitraukė nuo paviršiaus.', en: 'The demons have pulled back from the surface.' },
    }),
    C('p04b', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 36, height: 90, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Jie nesitraukia. Jie jau sužinojo, kur reikia smogti.', en: 'They are not retreating. They already learned where to strike.' },
      holdMs: 500,
    }),
    // 05 — Trys gijos
    C('p05', `${A}/bg-karo-kambarys.svg`, {
      effects: [{ kind: 'magic', intensity: 0.4, color: 'rgba(138,92,246,0.32)' }],
      characters: [{ characterId: 'kernius', pose: 'akis', x: 52, height: 92, depth: 12 }],
      speakerId: 'kernius', text: { lt: 'Visos eina žemyn.', en: 'All of them run downward.' },
    }),
    // 06 — Senas planas (be žodžių: katakombų brėžinys ant stalo)
    S('p06', `${A}/bg-karo-kambarys.svg`, {
      tint: 'rgba(240,220,180,0.06)',
      camera: { startScale: 1.04, endScale: 1.1, duration: 5, punchIn: true },
      text: null, holdMs: 1400,
    }),
    // 07 — Kas ten palaidota
    C('p07', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'vartu-kapitonas', pose: 'neutral', x: 58, height: 88, depth: 12, flip: true }],
      speakerId: 'vartu-kapitonas',
      text: { lt: 'Ten pirmųjų miesto šeimų kapai. Ir apgulties vardų knygos.', en: 'The graves of the city’s first families. And the siege name-books.' },
      holdMs: 500,
    }),
    // 08 — Ką priešas matavo
    C('p08', `${A}/bg-karo-kambarys.svg`, {
      effects: [{ kind: 'magic', intensity: 0.45, color: 'rgba(200,30,30,0.32)' }],
      tint: 'rgba(200,30,30,0.06)',
      characters: [{ characterId: 'kernius', pose: 'akis', x: 52, height: 94, depth: 12 }],
      camera: { startScale: 1.05, endScale: 1.1, duration: 3, punchIn: true },
      speakerId: 'kernius',
      text: { lt: 'Jie matavo ne pastatus. Jie ieškojo kelio iki mirusiųjų.', en: 'They were not measuring buildings. They were looking for a way to the dead.' },
      holdMs: 800,
    }),
    // 09 — Prazaras eina kartu
    C('p09', `${A}/bg-karo-kambarys.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 32, height: 90, depth: 12 },
        { characterId: 'kernius', pose: 'neutral', x: 68, height: 86, depth: 11, flip: true },
      ],
      speakerId: 'prazaras',
      text: { lt: 'Tu rodysi, ką mato akis. Aš spręsiu, kur einam.', en: 'You will say what the eye sees. I will decide where we go.' },
      holdMs: 800,
    }),
    // 10 — Laiptai apačioje
    S('p10', `${A}/bg-katakombos.svg`, {
      effects: [{ kind: 'fog', intensity: 0.3 }, { kind: 'magic', intensity: 0.25, color: 'rgba(200,30,30,0.25)' }],
      camera: { startScale: 1, endScale: 1.07, startY: -1, endY: 1, duration: 7 },
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 32, height: 84, depth: 11 },
        { characterId: 'kernius', pose: 'akis', x: 62, height: 82, depth: 11, flip: true },
      ],
      sfxUrl: null, // PLACEHOLDER: žibintai uždegami, žingsniai žemyn
      text: null, holdMs: 1600, // perėjimas į 5 misiją
    }),
  ],
}

export const m04fail = [
  { characterName: 'Prazaras', text: 'Dar turim dvi vietas ir vieną rezervą. Stabilizuojam silpniausią, tada grįžtam.' },
]
