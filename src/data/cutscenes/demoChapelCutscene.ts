// ════════════════════════════════════════════════════════════════════════════
// DEMO motion-comic cutscene — "Vadas įžengia į sugriautą koplyčią ir įspėja,
// kad už Varngrado mirusieji pradėjo vaikščioti."
// All artwork/audio = clearly labelled PLACEHOLDERS (public/cutscene-demo/*).
// Preview: /dev/cutscene. This object is exactly what the admin editor will
// author into campaign_cutscenes.metadata.motionComic.
// ════════════════════════════════════════════════════════════════════════════

import type { MotionComicDef } from '@/lib/campaign/motionComic'

const A = '/cutscene-demo'

export const demoChapelCutscene: MotionComicDef = {
  version: 1,
  // PLACEHOLDER audio: leave null until real files exist (player skips silently)
  musicUrl: null,      // e.g. `${A}/music-dread.mp3`
  ambientUrl: null,    // e.g. `${A}/amb-wind-chapel.mp3`
  typewriter: true,
  autoAdvanceAfterVoice: false,
  characters: [
    {
      id: 'commander',
      name: { lt: 'Vadas Regnaras', en: 'Commander Regnar' },
      accentColor: 'rgb(200,150,60)',
      poses: {
        neutral: `${A}/commander-neutral.svg`,
        speaking: `${A}/commander-speaking.svg`,
        closeup: `${A}/commander-closeup.svg`,
      },
    },
    {
      id: 'hero',
      name: { lt: 'Herojus', en: 'The Protagonist' },
      accentColor: 'rgb(159,180,216)',
      poses: {
        neutral: `${A}/protagonist-neutral.svg`,
        shocked: `${A}/protagonist-shocked.svg`,
      },
    },
  ],
  shots: [
    // 1 — establishing: ruined chapel, slow push, fog + dust
    {
      id: 'establish',
      background: `${A}/chapel-wide.svg`,
      foreground: `${A}/fg-arch.svg`,
      effects: [{ kind: 'fog', intensity: 0.6 }, { kind: 'dust', intensity: 0.4 }],
      camera: { startScale: 1, endScale: 1.06, endY: -1.5, duration: 7 },
      transition: { type: 'cut' },
      speakerId: null,
      text: {
        lt: 'Varngrado pakraštys. Sena koplyčia — jos skliautai seniai įgriuvę, o žvakės čia nebedega.',
        en: 'The outskirts of Varngrad. An old chapel — its vaults long collapsed, its candles long dead.',
      },
      voiceUrl: null, // PLACEHOLDER: narrator VO
      holdMs: 400,
    },
    // 2 — commander enters from the foreground
    {
      id: 'enter',
      background: `${A}/chapel-wide.svg`,
      characters: [
        { characterId: 'hero', pose: 'neutral', x: 26, height: 78, depth: 8 },
        { characterId: 'commander', pose: 'neutral', x: 82, height: 100, bottom: -12, depth: 16, flip: true, entrance: 'slide-right' },
      ],
      effects: [{ kind: 'fog', intensity: 0.4 }],
      camera: { startScale: 1.03, endScale: 1.05, startX: 1, endX: -1, duration: 6 },
      transition: { type: 'fade', duration: 420 },
      sfxUrl: null, // PLACEHOLDER: heavy door + armour footsteps
      speakerId: 'commander',
      text: {
        lt: 'Tu dar čia. Gerai. Neturime laiko maldoms.',
        en: 'You are still here. Good. There is no time left for prayers.',
      },
      voiceUrl: null,
    },
    // 3 — two-character conversation, hero answers (active-speaker swap)
    {
      id: 'talk',
      background: `${A}/chapel-wide.svg`,
      characters: [
        { characterId: 'hero', pose: 'neutral', x: 28, height: 84, depth: 10 },
        { characterId: 'commander', pose: 'speaking', x: 74, height: 88, depth: 12, flip: true },
      ],
      effects: [{ kind: 'fog', intensity: 0.35 }, { kind: 'embers', intensity: 0.25 }],
      camera: { startScale: 1, endScale: 1.04, duration: 6 },
      transition: { type: 'fade', duration: 400 },
      speakerId: 'hero',
      text: {
        lt: 'Vade... tu atjojai naktį, per lietų. Kas nutiko prie sienų?',
        en: 'Commander... you rode through the night, through the rain. What happened at the walls?',
      },
      voiceUrl: null,
    },
    // 4 — close-up during the warning (punch-in, candlelight)
    {
      id: 'warning',
      background: `${A}/chapel-close.svg`,
      characters: [
        { characterId: 'commander', pose: 'closeup', x: 50, height: 100, bottom: -6, depth: 12 },
      ],
      effects: [{ kind: 'smoke', intensity: 0.3 }],
      tint: 'rgba(120,60,20,0.08)',
      camera: { startScale: 1.02, endScale: 1.07, duration: 5, punchIn: true },
      transition: { type: 'wipe-diagonal', duration: 480 },
      speakerId: 'commander',
      text: {
        lt: 'Klausyk manęs. Už Varngrado mirusieji pradėjo vaikščioti. Ne vienas. Ne du. Visos kapinės.',
        en: 'Listen to me. Outside Varngrad, the dead have begun to walk. Not one. Not two. The whole graveyard.',
      },
      voiceUrl: null, // PLACEHOLDER: commander VO (autoAdvanceAfterVoice honours this)
      holdMs: 600,
    },
    // 5 — final wide: movement outside the chapel windows (ink cut + shake)
    {
      id: 'reveal',
      background: `${A}/chapel-windows.svg`,
      characters: [
        { characterId: 'hero', pose: 'shocked', x: 18, height: 74, depth: 14, dim: 0.25 },
      ],
      effects: [{ kind: 'fog', intensity: 0.5 }, { kind: 'ash', intensity: 0.35 }, { kind: 'magic', intensity: 0.35, color: 'rgba(90,130,190,0.3)' }],
      tint: 'rgba(40,60,110,0.1)',
      camera: { startScale: 1.05, endScale: 1, duration: 8, shake: 'light' },
      transition: { type: 'ink', duration: 520 },
      sfxUrl: null, // PLACEHOLDER: distant bell + wind stinger
      speakerId: 'hero',
      text: {
        lt: 'Šviesos pulke... jie jau čia.',
        en: 'By the Legion of Light... they are already here.',
      },
      voiceUrl: null,
      holdMs: 500,
    },
  ],
}
