'use client'

// ══════════════════════════════════════════════════════════════════════════════
// Parduotuvė → avataro „pack" peržiūra: žmogus prieš pirkdamas pamato IR išgirsta,
// ką gauna – veido išraiškas, reakcijas su balsu (žala, burtas, pergalė…),
// emocijų ratą su frazėmis ir „Pakalbinti" mygtuką (atsitiktinė replika).
// Būsena keliama į ShopModal: <AvatarPackStage> (portretas) ir <AvatarPackControls>
// (mygtukai) dalinasi tuo pačiu `AvatarPreviewState`.
// ══════════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react'
import { useT, useLocale } from '@/lib/i18n/react'
import { playUiClick } from '@/lib/ui-sound'
import { getSfxVolume } from '@/lib/settings'
import { packVoiceMap, avatarSlug, avatarFxFor, EMOTE_KEYS, EMOTE_DEF } from '@/lib/game/avatarPacks'
import type { AvatarAudioEvent, AvatarEmotions } from '@/lib/cosmetics'

type Face = 'neutral' | 'angry' | 'happy' | 'sad' | 'shock' | 'wounded' | 'smug'
export type AvatarPreviewState = { face: Face; line: string | null; n: number; fx: 'hit' | 'cast' | 'win' | 'lose' | 'talk' | null }
export const AVATAR_PREVIEW_IDLE: AvatarPreviewState = { face: 'neutral', line: null, n: 0, fx: null }

/** Reakcijos, kurias galima išbandyti: įvykis → veidas + efektas + ikona. */
const REACTIONS: { ev: AvatarAudioEvent; key: string; icon: string; face: Face; fx: AvatarPreviewState['fx'] }[] = [
  { ev: 'fightStart', key: 'fightStart', icon: '⚔️', face: 'smug',    fx: 'talk' },
  { ev: 'attack',     key: 'attack',     icon: '🗡️', face: 'angry',   fx: 'talk' },
  { ev: 'spellCast',  key: 'spellCast',  icon: '✨', face: 'smug',    fx: 'cast' },
  { ev: 'hit',        key: 'hit',        icon: '💥', face: 'angry',   fx: 'hit' },
  { ev: 'bigHit',     key: 'bigHit',     icon: '😵', face: 'shock',   fx: 'hit' },
  { ev: 'lowHp',      key: 'lowHp',      icon: '🩸', face: 'wounded', fx: 'hit' },
  { ev: 'kill',       key: 'kill',       icon: '💀', face: 'smug',    fx: 'talk' },
  { ev: 'victory',    key: 'victory',    icon: '🏆', face: 'happy',   fx: 'win' },
  { ev: 'defeat',     key: 'defeat',     icon: '🥀', face: 'sad',     fx: 'lose' },
  { ev: 'timer',      key: 'timer',      icon: '⏳', face: 'angry',   fx: 'talk' },
]
const FACES: Face[] = ['neutral', 'happy', 'smug', 'angry', 'shock', 'sad', 'wounded']
const TALK_EVENTS: AvatarAudioEvent[] = ['idle', 'selected', 'fightStart', 'kill', 'timer']

type Script = { lines: Record<string, Record<string, [string, string]>> }
let scriptCache: Script | null = null
const strip = (t: string) => t.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim()

/** Ar šis kosmetikos id yra naujas avataro „pack" (turi efektų profilį arba balsus). */
export function isAvatarPack(id: string | null | undefined): boolean {
  if (!id) return false
  return !!avatarFxFor(id) || Object.keys(packVoiceMap([id], 'lt')[id] ?? {}).length > 0
}

function faceUrl(id: string, face: Face, base: string | null, emotions?: AvatarEmotions | null): string | null {
  if (face === 'neutral') return base
  return emotions?.[face] || `/avatars/v2/${avatarSlug(id)}/face-${face}.webp`
}

// ── Portretas: veido išraiška, frazės kaspinas, efektas ──────────────────────
export function AvatarPackStage({ id, base, emotions, state, desktop: D }: { id: string; base: string | null; emotions?: AvatarEmotions | null; state: AvatarPreviewState; desktop: boolean }) {
  const fx = avatarFxFor(id)
  const c1 = fx?.c1 ?? '#d4a33b'
  const src = faceUrl(id, state.face, base, emotions) ?? base
  const [broken, setBroken] = useState<Record<string, boolean>>({})
  const show = src && !broken[src] ? src : base
  return (
    <span className="absolute inset-0" style={{ ['--c' as string]: c1 }}>
      <style>{`
@keyframes rvnApHit{0%{transform:translateX(0)}20%{transform:translateX(-7px) rotate(-1deg)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(2px)}100%{transform:none}}
@keyframes rvnApFlash{0%{opacity:.75}100%{opacity:0}}
@keyframes rvnApPulse{0%{opacity:0;transform:scale(.85)}35%{opacity:.9}100%{opacity:0;transform:scale(1.25)}}
@keyframes rvnApLine{0%{opacity:0;transform:translate(-50%,8px)}12%{opacity:1;transform:translate(-50%,0)}85%{opacity:1}100%{opacity:0}}
@keyframes rvnApTalk{0%,100%{transform:none}30%{transform:translateY(-3px) scale(1.01)}60%{transform:translateY(1px)}}
`}</style>
      <span key={'img' + state.n} className="absolute inset-0" style={{ animation: state.fx === 'hit' ? 'rvnApHit .45s ease' : state.fx === 'talk' || state.fx === 'cast' ? 'rvnApTalk .6s ease' : undefined }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {show && <img src={show} alt="" draggable={false} onError={() => src && setBroken((b) => ({ ...b, [src]: true }))}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 25%', filter: state.fx === 'lose' ? 'grayscale(.6) brightness(.75)' : undefined, transition: 'filter .4s' }} />}
      </span>
      {state.fx === 'hit' && <span key={'hf' + state.n} className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,40,40,.55), rgba(120,0,0,.5))', animation: 'rvnApFlash .5s ease-out forwards' }} />}
      {(state.fx === 'cast' || state.fx === 'win') && <span key={'cf' + state.n} className="absolute inset-0 pointer-events-none" style={{ borderRadius: '50%', boxShadow: `inset 0 0 60px ${c1}, 0 0 40px ${c1}`, animation: 'rvnApPulse .9s ease-out forwards' }} />}
      {state.line && (
        <span key={'ln' + state.n} className="absolute pointer-events-none text-center" style={{ left: '50%', bottom: D ? 14 : 8, width: '92%', padding: D ? '7px 12px' : '5px 8px', borderRadius: 8,
          font: `600 ${D ? 13.5 : 11}px/1.3 var(--ravenof-font-body)`, color: '#f6ecd6', background: 'rgba(10,7,14,.88)', border: `1px solid ${c1}88`, boxShadow: `0 6px 18px rgba(0,0,0,.6), 0 0 14px ${c1}44`,
          animation: 'rvnApLine 4.2s ease forwards' }}>
          „{state.line}"
        </span>
      )}
    </span>
  )
}

// ── Valdymas: reakcijos, emocijos, „Pakalbinti", veido išraiškos ─────────────
export function AvatarPackControls({ id, base, emotions, onState, desktop: D }: { id: string; base: string | null; emotions?: AvatarEmotions | null; onState: (s: AvatarPreviewState) => void; desktop: boolean }) {
  const t = useT()
  const locale = useLocale()
  const audio = useRef<HTMLAudioElement | null>(null)
  const nRef = useRef(0)
  const [script, setScript] = useState<Script | null>(scriptCache)
  const voices = packVoiceMap([id], locale)[id] ?? {}
  const slug = avatarSlug(id)
  const lang = locale === 'lt' ? 0 : 1

  useEffect(() => {
    if (scriptCache) return
    let alive = true
    import('@/lib/game/avatarVoScript.json').then((m) => { scriptCache = (m.default ?? m) as unknown as Script; if (alive) setScript(scriptCache) }).catch(() => {})
    return () => { alive = false }
  }, [])
  useEffect(() => () => { audio.current?.pause() }, [])
  useEffect(() => { onState(AVATAR_PREVIEW_IDLE) }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const lineOf = (ev: string, variant: number): string | null => {
    const row = script?.lines?.[slug]?.[`${ev}-${variant}`]
    return row ? strip(row[lang] || row[0]) || null : null
  }
  const play = (ev: AvatarAudioEvent, face: Face, fx: AvatarPreviewState['fx']) => {
    const clips = voices[ev] ?? []
    let line: string | null = null
    if (clips.length) {
      const c = clips[Math.floor(Math.random() * clips.length)]
      const m = c.url.match(/-(\d+)\.mp3$/)
      line = m ? lineOf(ev, Number(m[1])) : null
      try {
        audio.current?.pause()
        const a = new Audio(c.url); a.volume = Math.max(0.2, Math.min(1, getSfxVolume())); audio.current = a; void a.play().catch(() => {})
      } catch { /* */ }
    } else playUiClick()
    nRef.current += 1
    onState({ face, line, n: nRef.current, fx })
  }
  const has = (ev: AvatarAudioEvent) => (voices[ev]?.length ?? 0) > 0
  const lineCount = Object.values(voices).reduce((s, a) => s + (a?.length ?? 0), 0)

  const title = (txt: string) => (
    <div style={{ font: `600 ${D ? 12 : 9.5}px var(--ravenof-font-body)`, letterSpacing: 1.4, textTransform: 'uppercase', color: 'var(--ravenof-gold)', marginBottom: D ? 8 : 5 }}>{txt}</div>
  )
  const chip = (txt: string) => (
    <span style={{ font: `700 ${D ? 11.5 : 9.5}px var(--ravenof-font-body)`, padding: D ? '3px 10px' : '2px 7px', borderRadius: 999, color: 'var(--ravenof-text-primary)', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)', whiteSpace: 'nowrap' }}>{txt}</span>
  )
  const btn = (key: string, icon: string, label: string, onClick: () => void, disabled = false, accent = false) => (
    <button key={key} type="button" onClick={onClick} disabled={disabled} className="ravenof-press flex items-center"
      style={{ gap: D ? 8 : 5, padding: D ? '8px 10px' : '5px 7px', borderRadius: 7, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1, textAlign: 'left',
        background: accent ? 'linear-gradient(180deg, rgba(212,163,59,.28), rgba(212,163,59,.12))' : 'rgba(255,255,255,.04)',
        border: `1px solid ${accent ? 'rgba(212,163,59,.7)' : 'rgba(255,255,255,.1)'}`, color: 'var(--ravenof-text-primary)', font: `600 ${D ? 13 : 10.5}px var(--ravenof-font-body)`, minWidth: 0 }}>
      <span style={{ fontSize: D ? 17 : 13, lineHeight: 1 }}>{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  )

  return (
    <div className="flex flex-col" style={{ gap: D ? 16 : 10 }}>
      <div className="flex flex-wrap items-center" style={{ gap: 6 }}>
        {chip(t('shop.avatarPack.faces', { count: FACES.length }))}
        {chip(t('shop.avatarPack.emotes', { count: EMOTE_KEYS.length }))}
        {lineCount > 0 && chip(t('shop.avatarPack.voiceLines', { count: lineCount }))}
        {avatarFxFor(id) && chip(t('shop.avatarPack.fx'))}
      </div>

      <div>
        {title(t('shop.avatarPack.talkTitle'))}
        <div className="grid" style={{ gridTemplateColumns: '1fr', gap: 6 }}>
          {btn('talk', '💬', t('shop.avatarPack.talk'), () => {
            const evs = TALK_EVENTS.filter(has); const ev = evs[Math.floor(Math.random() * evs.length)] ?? 'idle'
            play(ev, ev === 'kill' ? 'smug' : ev === 'timer' ? 'angry' : 'happy', 'talk')
          }, lineCount === 0, true)}
        </div>
      </div>

      <div>
        {title(t('shop.avatarPack.reactionsTitle'))}
        <div className="grid" style={{ gridTemplateColumns: `repeat(${D ? 2 : 2}, minmax(0,1fr))`, gap: 6 }}>
          {REACTIONS.map((r) => btn(r.key, r.icon, t(`shop.avatarPack.ev.${r.key}`), () => play(r.ev, r.face, r.fx), !has(r.ev)))}
        </div>
      </div>

      <div>
        {title(t('shop.avatarPack.emotesTitle'))}
        <div className="grid" style={{ gridTemplateColumns: `repeat(${D ? 3 : 2}, minmax(0,1fr))`, gap: 6 }}>
          {EMOTE_KEYS.map((k) => { const d = EMOTE_DEF[k]; return btn(k, d.icon, locale === 'lt' ? d.lt : d.en, () => play(d.ev, d.face, 'talk'), !has(d.ev)) })}
        </div>
      </div>

      <div>
        {title(t('shop.avatarPack.facesTitle'))}
        <div className="flex flex-wrap" style={{ gap: D ? 8 : 5 }}>
          {FACES.map((f) => {
            const u = faceUrl(id, f, base, emotions)
            return (
              <button key={f} type="button" title={t(`shop.avatarPack.face.${f}`)} onClick={() => { playUiClick(); nRef.current += 1; onState({ face: f, line: null, n: nRef.current, fx: null }) }}
                className="ravenof-press relative overflow-hidden" style={{ width: D ? 48 : 34, height: D ? 48 : 34, borderRadius: '50%', border: '1.5px solid rgba(212,163,59,.55)', background: '#120d1a', cursor: 'pointer', padding: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {u && <img src={u} alt={t(`shop.avatarPack.face.${f}`)} draggable={false} onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden' }} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 25%' }} />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
