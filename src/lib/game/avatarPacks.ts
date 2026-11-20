// ── Avatarų „pack" duomenys: parašo efektų profiliai (819) ───────────────────
// Kiekvienas naujas avataras turi profilį: paletė + dalelės + įėjimas + pabaiga + žemo HP aura.
// Efektai surenkami iš bendros bibliotekos (components/tutorial/AvatarFx.tsx) – čia tik duomenys.
// Seni generiniai avatarai profilio neturi → lieka bendri efektai (subyrėjimas į šukes ir t. t.).
// Planas: project doc „avataru-emocijos-ir-fx-planas".

export type AvParticle = 'ember' | 'ash' | 'feather' | 'bone' | 'wisp' | 'ray' | 'spark' | 'glyph' | 'coin' | 'bubble' | 'leaf' | 'bird'
export type AvEntrance = 'embers' | 'mist' | 'pillar' | 'assemble' | 'shadow' | 'flash'
export type AvDefeat = 'shatter' | 'ash' | 'mist' | 'birds' | 'melt' | 'light'
export type AvAura = 'flame' | 'cracks' | 'drip' | 'flicker'

export type AvatarFxProfile = {
  /** Pagrindinė ir antrinė paletės spalva (#rrggbb). */
  c1: string; c2: string
  particle: AvParticle
  /** Simboliai 'glyph' dalelėms (runos, natos). */
  glyphs?: string
  entrance: AvEntrance
  defeat: AvDefeat
  aura: AvAura
  /** Legendiniai: platesnis ir ilgesnis įėjimas bei pabaiga. */
  grand?: boolean
}

const P = (c1: string, c2: string, particle: AvParticle, entrance: AvEntrance, defeat: AvDefeat, aura: AvAura, extra: Partial<AvatarFxProfile> = {}): AvatarFxProfile =>
  ({ c1, c2, particle, entrance, defeat, aura, ...extra })

export const AVATAR_FX: Record<string, AvatarFxProfile> = {
  av_nekronautas:           P('#7fd6a0', '#e9e2cf', 'bone',    'assemble', 'mist',    'drip'),
  av_korvas:                P('#9d7bff', '#8f8a9c', 'feather', 'shadow',   'birds',   'cracks'),
  av_zariju_kalvis:         P('#ff8a2a', '#ff3b2f', 'ember',   'embers',   'ash',     'flame'),
  av_sutarciu_ragana:       P('#ff3b4e', '#3a0a14', 'glyph',   'mist',     'melt',    'cracks', { glyphs: 'ᚱᛟᚦᛉᛞ' }),
  av_vyriausiasis_teisejas: P('#f2c45a', '#2a2118', 'spark',   'pillar',   'shatter', 'flicker'),
  av_gelezine_sesuo:        P('#cfd8e6', '#ffffff', 'spark',   'flash',    'shatter', 'flicker'),
  av_kapu_giedotoja:        P('#a9c8ff', '#8a93a8', 'wisp',    'mist',     'mist',    'drip'),
  av_marso_bugnininkas:     P('#9bd66a', '#e9e2cf', 'bone',    'assemble', 'shatter', 'drip'),
  av_stygu_mage:            P('#b57bff', '#ff8ad8', 'glyph',   'flash',    'light',   'flicker', { glyphs: '♪♫♩♬' }),
  av_tylos_mokinys:         P('#7fe3ff', '#ffffff', 'ray',     'pillar',   'light',   'flicker'),
  av_kapitone:              P('#4a8dff', '#f2c45a', 'coin',    'mist',     'ash',     'flame'),
  av_seseliu_kisenvagis:    P('#8a5cff', '#1a1026', 'wisp',    'shadow',   'mist',    'cracks'),
  av_ausros_riteris:        P('#ffd66b', '#ffffff', 'ray',     'pillar',   'light',   'flicker'),
  av_varpu_gydytoja:        P('#f2c45a', '#fff3d6', 'spark',   'pillar',   'light',   'flicker'),
  av_gaujos_vadas:          P('#8fe04a', '#8a5a2a', 'ember',   'embers',   'shatter', 'flame'),
  av_pelkiu_ziniuone:       P('#a6e22e', '#e6d84a', 'bubble',  'mist',     'melt',    'drip'),
  av_arenos_cempionas:      P('#ff4a3d', '#d7dbe2', 'leaf',    'flash',    'shatter', 'flame',  { grand: true }),
  av_varnu_pranase:         P('#9d6bff', '#0b0910', 'feather', 'shadow',   'birds',   'cracks', { grand: true }),
}

export function avatarFxFor(id: string | null | undefined): AvatarFxProfile | null {
  return id ? AVATAR_FX[id] ?? null : null
}

// ── Balsai (820) ─────────────────────────────────────────────────────────────
// Klipai guli public/avatars/v2/<slug>/vo/<lt|en>/<įvykis>-<nr>.mp3 (po 5 variantus),
// dialogų eilutės – dlg-<kitas>-<nr>-<eil>.mp3. Kas realiai įkelta, sako manifestas
// (tools/gen-avatar-vo-manifest.py) – todėl avatarai be klipų lieka tylūs, be 404.
import voManifest from './avatarVoManifest.json'
import type { AvatarAudioMap, AvatarAudioEvent } from '@/lib/cosmetics'

type VoManifest = { voices: Record<string, Partial<Record<'lt' | 'en', Record<string, number>>>>; dialogs: { a: string; b: string; n: number; langs: string[]; lines: [string, string][] }[] }
const VO = voManifest as unknown as VoManifest

/** 'av_gelezine_sesuo' → 'gelezine-sesuo' */
export const avatarSlug = (id: string) => id.replace(/^av_/, '').replace(/_/g, '-')
const voLang = (locale: string): 'lt' | 'en' => (locale === 'lt' ? 'lt' : 'en')

/** Statinis balsų žemėlapis avatarams, kurių klipai įkelti. Perrašo DB balsus tiems patiems avatarams. */
export function packVoiceMap(ids: (string | null | undefined)[], locale: string): AvatarAudioMap {
  const out: AvatarAudioMap = {}
  const lang = voLang(locale)
  for (const id of ids) {
    if (!id) continue
    const slug = avatarSlug(id)
    const v = VO.voices[slug]
    const evs = v?.[lang] ?? v?.lt ?? v?.en
    if (!evs) continue
    const used = v?.[lang] ? lang : v?.lt ? 'lt' : 'en'
    const m: AvatarAudioMap[string] = {}
    for (const [ev, n] of Object.entries(evs)) {
      m[ev as AvatarAudioEvent] = Array.from({ length: n }, (_, i) => ({ url: `/avatars/v2/${slug}/vo/${used}/${ev}-${i + 1}.mp3`, weight: 1 }))
    }
    out[id] = m
  }
  return out
}

/** Mini dialogas šiai avatarų porai (atsitiktinis iš turimų) arba null. Grąžina klipų eilę. */
export function packDialogue(idA: string | null | undefined, idB: string | null | undefined, locale: string): string[] | null {
  if (!idA || !idB) return null
  const a = avatarSlug(idA), b = avatarSlug(idB), lang = voLang(locale)
  const opts = VO.dialogs.filter((d) => ((d.a === a && d.b === b) || (d.a === b && d.b === a)) && d.langs.includes(lang))
  if (!opts.length) return null
  const d = opts[Math.floor(Math.random() * opts.length)]
  return d.lines.map(([slug, file]) => `/avatars/v2/${slug}/vo/${lang}/${file}`)
}
