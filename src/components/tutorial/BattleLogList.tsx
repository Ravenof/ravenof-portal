'use client'

// ── Kovos žurnalas v2 — vienas komponentas trims vietoms ─────────────────────
// Peržiūra: ravenof-log-preview.html · planas: KOVOS-ZURNALAS-V2-PLANAS.md
//   mode='panel'  – desktop šoninis skydelis (~215 px)
//   mode='drawer' – mobilus platus drawer (~340 px)
//   mode='strip'  – mobilus rail'o strip (paskutiniai 3 veiksmai, be teksto)
// 1 kortelė = 1 veiksmas (groupLog). Rezultatai – žetonai, ŽMK – žymė ant žalos
// (VISADA, ir „+0"), ėjimas – lipnus skirtukas su auksu/traukimais. Bakstelėjus
// kortelę – išsiskleidžia senieji pilni sakiniai (eventText) – nieko neprarandama.
// Filtras „Svarbu" (numatytas) slepia veiksmus be efekto (paprastas iškvietimas).

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { TutCard, GameEvent, Side } from '@/lib/tutorial/engine'
import { STATUS_META, type TutStatus } from '@/lib/tutorial/engine'
import { eventText } from '@/lib/tutorial/logText'
import { groupLog, lastActions, type LogHit, type LogTarget, type LogKeyword } from '@/lib/game/logGroups'
import type { TParams } from '@/lib/i18n/core'

export type LogFilter = 'all' | 'important'
type TFn = (key: string, params?: TParams) => string

export type BattleLogListProps = {
  log: GameEvent[]
  mode: 'panel' | 'drawer' | 'strip'
  t: TFn
  findCard: (name?: string) => TutCard | null
  renderMini: (card: TutCard, w: number) => ReactNode
  onInspect: (card: TutCard) => void
  onHover?: (card: TutCard | null, x: number, y: number) => void
  filter: LogFilter
  onFilter?: (f: LogFilter) => void
  /** 2v2: seat'ų spalvos; 1v1 – you/ai. */
  sideOf?: (s: Side) => 'you' | 'ai'
  /** Kiek kortelių render'inti nuo galo (likusios – „Rodyti senesnius"). */
  limit?: number
  /** Strip'e: kiek veiksmų. */
  stripCount?: number
  onStripTap?: () => void
}

const YOU = '#4ade80', AI = '#f87171'
const KW_COLOR: Record<LogKeyword, string> = { battlecry: '#f0b429', lastwish: '#a78bfa', trigger: '#38bdf8', reaction: '#8b5cf6', curse: '#a855f7' }
const KIND_ICON: Record<string, string> = { attack: '⚔', play: '✦', spell: '✧', artifact: '⛨', field: '⌂', champion: '⚜', skill: '⚜', battlecry: '📣', lastwish: '🕯', trigger: '⟳', reaction: '⚡', curse: '🕸', other: '·' }
const STATUS_ICON: Record<string, string> = { shield: '✦★', stealth: '◑', taunt: '⊙', sprint: '▶', control: '🧠', cantAttack: '🔗', immortal: '♾', curse: '🕸' }

const zmkTag = (v: string): { text: string; color: string } => {
  if (v === 'x2') return { text: '×2', color: '#ff6a3d' }
  if (v === 'x0') return { text: '×0', color: '#9aa0ad' }
  const col = v === '+0' ? '#8e84ab' : v.startsWith('+') ? YOU : AI
  return { text: 'ŽMK ' + v.replace('-', '−'), color: col }
}

function Chip({ kind, children, tag, tagColor, title }: { kind?: 'dmg' | 'heal' | 'gold' | 'dead' | 'zero' | 'buff' | 'debuff' | 'status' | 'plain'; children: ReactNode; tag?: string; tagColor?: string; title?: string }) {
  const c = kind === 'dmg' ? { color: '#ff8a7a', border: 'rgba(255,90,74,0.5)', bg: 'rgba(8,6,12,0.9)' }
    : kind === 'heal' ? { color: '#5ef0c0', border: 'rgba(94,240,192,0.5)', bg: 'rgba(8,6,12,0.9)' }
    : kind === 'gold' ? { color: '#ffd97a', border: 'rgba(240,180,41,0.5)', bg: 'rgba(8,6,12,0.9)' }
    : kind === 'dead' ? { color: '#ffb0a0', border: 'rgba(255,120,90,0.6)', bg: 'rgba(120,20,10,0.35)' }
    : kind === 'zero' ? { color: '#9aa0ad', border: 'rgba(120,120,140,0.5)', bg: 'rgba(8,6,12,0.9)' }
    : kind === 'buff' ? { color: '#ffd24a', border: 'rgba(255,210,74,0.45)', bg: 'rgba(8,6,12,0.9)' }
    : kind === 'debuff' ? { color: '#8b93a7', border: 'rgba(139,147,167,0.5)', bg: 'rgba(8,6,12,0.9)' }
    : kind === 'status' ? { color: '#c4b5fd', border: 'rgba(167,139,250,0.45)', bg: 'rgba(8,6,12,0.9)' }
    : { color: '#e8dcb5', border: 'rgba(42,36,56,1)', bg: 'rgba(8,6,12,0.9)' }
  return (
    <span title={title} className="inline-flex items-center gap-1 rounded whitespace-nowrap" style={{ font: '800 10.5px system-ui, sans-serif', padding: '1px 6px', background: c.bg, border: '1px solid ' + c.border, color: c.color, fontVariantNumeric: 'tabular-nums' }}>
      {children}
      {tag && <span style={{ fontSize: 8, fontWeight: 700, color: tagColor ?? '#8e84ab', paddingLeft: 3, borderLeft: '1px solid rgba(42,36,56,1)', letterSpacing: '-0.01em' }}>{tag}</span>}
    </span>
  )
}

function HitChips({ hits, t }: { hits: LogHit[]; t: TFn }) {
  return (
    <>
      {hits.map((h, i) => {
        if (h.t === 'dmg') {
          const z = h.zmk ? zmkTag(h.zmk) : null
          const zero = (h.value ?? 0) === 0
          return (
            <span key={i} className="inline-flex items-center gap-1">
              <Chip kind={zero ? 'zero' : 'dmg'} tag={z?.text} tagColor={z?.color}>{zero ? '0' : '−' + h.value}</Chip>
              {h.hpAfter && <Chip kind="plain">{h.hpAfter}</Chip>}
              {h.left != null && <Chip kind="plain">{h.left} HP</Chip>}
            </span>
          )
        }
        if (h.t === 'heal') return <Chip key={i} kind="heal">+{h.value}</Chip>
        if (h.t === 'death') return <Chip key={i} kind="dead" title={t('battleLogShort.hit.death')}>☠</Chip>
        if (h.t === 'block') return <Chip key={i} kind="status" title={t('battleLogShort.hit.block')}>✦★ {t('battleLogShort.hit.block')}</Chip>
        if (h.t === 'buff') { const v = h.value ?? 0; return <Chip key={i} kind={v >= 0 ? 'buff' : 'debuff'}>{v >= 0 ? '+' : ''}{v}{h.label ? ' ' + h.label : ''}</Chip> }
        if (h.t === 'gold') { const v = h.value ?? 0; return <Chip key={i} kind="gold">{v >= 0 ? '+' : ''}{v} 🪙</Chip> }
        if (h.t === 'summon') return <Chip key={i} kind="plain">✦ {t('battleLogShort.hit.summon')}</Chip>
        if (h.t === 'return') return <Chip key={i} kind="plain">↩ {t('battleLogShort.hit.return')}</Chip>
        if (h.t === 'status') {
          const id = h.statusId ?? ''
          const icon = (STATUS_META as Record<string, { icon: string }>)[id]?.icon ?? STATUS_ICON[id] ?? '◈'
          const name = h.label ?? ((STATUS_META as Record<string, { name: string }>)[id as TutStatus]?.name ?? id)
          const off = h.statusEvt === 'remove' || h.statusEvt === 'destroy'
          return <Chip key={i} kind="status" title={name}>{icon}{off ? ' ✕' : ''}</Chip>
        }
        return null
      })}
    </>
  )
}

export function BattleLogList(p: BattleLogListProps) {
  const { log, mode, t, findCard, renderMini, onInspect, onHover, filter, onFilter, limit = 60, stripCount = 3 } = p
  const sideOf = p.sideOf ?? ((s: Side) => (s === 'you' || s === 'ally' ? 'you' : 'ai'))
  const actions = useMemo(() => groupLog(log), [log])
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set())
  const [showAll, setShowAll] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const atBottomRef = useRef(true)
  const [unseen, setUnseen] = useState(0)
  const lastLenRef = useRef(0)

  const colorOf = (s: Side) => (sideOf(s) === 'you' ? YOU : AI)
  const toggle = useCallback((k: number) => setExpanded((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n }), [])

  // ── auto-scroll tik kai žaidėjas apačioje; kitaip – „↓ N nauji" ──
  const onScroll = useCallback(() => {
    const el = scrollRef.current; if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24
    atBottomRef.current = atBottom
    if (atBottom) setUnseen(0)
  }, [])
  useEffect(() => {
    if (mode === 'strip') return
    const el = scrollRef.current; if (!el) return
    const added = actions.length - lastLenRef.current
    lastLenRef.current = actions.length
    if (atBottomRef.current) { el.scrollTop = el.scrollHeight }
    else if (added > 0) setUnseen((n) => n + added)
  }, [actions.length, mode, filter])
  const jumpDown = () => { const el = scrollRef.current; if (el) { el.scrollTop = el.scrollHeight; atBottomRef.current = true; setUnseen(0) } }

  // ── kortos elementai ──
  const thumb = ({ name, dead, w = 22 }: { name?: string; dead?: boolean; w?: number }): ReactNode => {
    const card = findCard(name)
    const h = Math.round(w * 4 / 3)
    return (
      <span className="relative shrink-0 rounded overflow-hidden" style={{ width: w, height: h, outline: '1.5px solid rgba(255,255,255,0.18)', background: '#1a1426', cursor: card ? 'pointer' : 'default' }}
        onClick={card ? (e) => { e.stopPropagation(); onInspect(card) } : undefined}
        onMouseEnter={card && onHover ? (e) => onHover(card, e.clientX, e.clientY) : undefined}
        onMouseLeave={card && onHover ? () => onHover(null, 0, 0) : undefined}
        title={name}>
        {card ? renderMini(card, w) : <span className="flex items-center justify-center" style={{ width: w, height: h, color: '#8e84ab', fontSize: 10 }}>?</span>}
        {dead && <>
          <span className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.55)' }} />
          <span className="absolute inset-0 flex items-center justify-center" style={{ color: '#ffb0a0', fontSize: 13 }}>☠</span>
        </>}
      </span>
    )
  }
  const avatar = ({ side }: { side: Side }): ReactNode => {
    const me = sideOf(side) === 'you'
    return <span className="shrink-0 rounded-full flex items-center justify-center" style={{ width: 22, height: 22, outline: '1.5px solid ' + (me ? YOU : AI), background: me ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)', fontSize: 9, fontWeight: 800, color: me ? YOU : AI }} title={t(me ? 'battleLogShort.youShort' : 'battleLogShort.foeShort')}>{me ? t('battleLogShort.youShort').slice(0, 2) : t('battleLogShort.foeShort').slice(0, 2)}</span>
  }
  const name = ({ children, sub, w }: { children: ReactNode; sub?: ReactNode; w?: number }): ReactNode => (
    <span className="min-w-0 truncate" style={{ font: '700 11px Georgia, serif', color: '#e8dcb5', flex: w ? `0 1 ${w}px` : '1 1 auto' }}>{children}{sub && <span style={{ font: '600 9.5px system-ui', color: '#8e84ab' }}> {sub}</span>}</span>
  )
  const refEl = ({ r, dead, w }: { r: { name?: string; player?: Side; side?: Side }; dead?: boolean; w?: number }): ReactNode => (
    r.player ? <>{avatar({ side: r.player })}{name({ w, children: t(sideOf(r.player) === 'you' ? 'battleLogShort.youShort' : 'battleLogShort.foeShort') })}</>
      : <>{thumb({ name: r.name, dead })}{name({ w, children: r.name ?? '?' })}</>
  )
  const isDead = (tg: LogTarget) => tg.hits.some((h) => h.t === 'death')

  // ── STRIP ──
  if (mode === 'strip') {
    const last = lastActions(actions, stripCount, filter)
    if (last.length === 0) return <span className="text-[8px] text-center" style={{ color: 'var(--text-muted)' }}>—</span>
    return (
      <div className="flex flex-col gap-1 w-full" onClick={p.onStripTap}>
        {last.map((a, i) => {
          const col = colorOf(a.side)
          const lastOne = i === last.length - 1
          const tg = a.targets.filter((x) => !x.player)
          const hits = a.targets.flatMap((x) => x.hits).filter((h) => h.t === 'dmg' || h.t === 'heal' || h.t === 'death').slice(0, 2)
          return (
            <div key={a.atLog} className="flex items-center gap-1 rounded-md px-0.5 py-0.5" style={{ borderLeft: '3px solid ' + col, background: lastOne ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)', opacity: lastOne ? 1 : 0.8, cursor: 'pointer' }}>
              {a.source?.name ? thumb({ name: a.source.name, w: 18, dead: a.kind === 'lastwish' }) : null}
              {tg[0]?.name && a.kind === 'attack' ? thumb({ name: tg[0].name, w: 18, dead: isDead(tg[0]) }) : null}
              <span className="shrink-0" style={{ fontSize: 11, color: a.keyword ? KW_COLOR[a.keyword] : '#bfb4dd' }}>{KIND_ICON[a.kind] ?? '·'}</span>
              <span className="flex flex-wrap gap-0.5 min-w-0" style={{ transform: 'scale(0.85)', transformOrigin: 'left center' }}><HitChips hits={hits} t={t} /></span>
            </div>
          )
        })}
      </div>
    )
  }

  // ── PANEL / DRAWER ──
  const wide = mode === 'drawer'
  const visible = actions.filter((a) => a.kind === 'turn' || filter === 'all' || a.important)
  const start = showAll ? 0 : Math.max(0, visible.length - limit)
  const shown = visible.slice(start)

  return (
    <div className="flex flex-col h-full min-h-0">
      {onFilter && (
        <div className="shrink-0 flex items-center gap-1 px-1 pb-1">
          {(['all', 'important'] as LogFilter[]).map((f) => (
            <button key={f} onClick={() => onFilter(f)} className="rounded-full" style={{ font: '700 9px system-ui', padding: '2px 8px', border: '1px solid ' + (filter === f ? 'rgba(240,180,41,0.5)' : 'rgba(42,36,56,1)'), background: filter === f ? 'rgba(240,180,41,0.15)' : 'transparent', color: filter === f ? '#ffd97a' : '#8e84ab' }}>
              {t('battleLogShort.filter.' + f)}
            </button>
          ))}
        </div>
      )}
      <div ref={scrollRef} onScroll={onScroll} className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1 pr-0.5" style={{ overscrollBehavior: 'contain' }}>
        {start > 0 && (
          <button onClick={() => setShowAll(true)} className="shrink-0 self-center rounded-full" style={{ font: '700 9px system-ui', padding: '2px 9px', border: '1px solid rgba(42,36,56,1)', color: '#8e84ab' }}>{t('battleLogShort.showOlder', { n: start })}</button>
        )}
        {shown.length === 0 && <span className="text-[10px] text-center py-3" style={{ color: '#6f6590' }}>{t('battleLogShort.empty')}</span>}
        {shown.map((a) => {
          if (a.kind === 'turn' && a.turn) {
            const me = sideOf(a.turn.side) === 'you'
            return (
              <div key={'t' + a.atLog} className="sticky top-0 z-10 flex items-center gap-2 -mx-0.5 px-2 py-1" style={{ background: 'rgba(8,6,12,0.96)', borderTop: '1px solid rgba(42,36,56,1)', borderBottom: '1px solid rgba(42,36,56,1)', font: '700 9.5px system-ui', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                <span style={{ color: me ? YOU : AI }}>{t('battleLogShort.turn', { n: a.turn.n })} · {t(me ? 'battleLogShort.you' : 'battleLogShort.foe')}</span>
                <span className="ml-auto" style={{ color: '#8e84ab', fontWeight: 600, letterSpacing: 0, textTransform: 'none' }}>{a.turn.gold > 0 && <>+{a.turn.gold} 🪙</>}{a.turn.draws > 0 && <> · {t('battleLogShort.draws', { n: a.turn.draws })}</>}</span>
              </div>
            )
          }
          const col = colorOf(a.side)
          const open = expanded.has(a.atLog)
          const kw = a.keyword
          const src = a.source
          const others = a.targets
          // antraštė
          let head: ReactNode
          if (a.kind === 'attack' && src) {
            const tgt = others.find((x) => x.player || (src.uid ? x.uid !== src.uid : x.name !== src.name))
            const srcT = others.find((x) => !x.player && (src.uid ? x.uid === src.uid : x.name === src.name))
            head = <>{thumb({ name: src.name, dead: !!srcT && isDead(srcT) })}{name({ children: src.name })}<span className="shrink-0" style={{ color: '#8e84ab', fontSize: 11 }}>{a.mutual ? '⇄' : '→'}</span>{tgt ? refEl({ r: tgt, dead: isDead(tgt) }) : null}</>
          } else if ((a.kind === 'play' || a.kind === 'spell' || a.kind === 'artifact' || a.kind === 'field' || a.kind === 'champion') && src) {
            head = <>{avatar({ side: a.side })}<span className="shrink-0" style={{ color: '#8e84ab', fontSize: 11 }}>▸</span>{thumb({ name: src.name })}{name({ children: src.name, sub: a.cost ? <>{a.cost} 🪙</> : undefined })}</>
          } else if (src?.name) {
            head = <>{thumb({ name: src.name, dead: a.kind === 'lastwish' })}{name({ children: src.name })}</>
          } else {
            head = <span className="min-w-0" style={{ font: '600 10.5px system-ui', color: '#d8cfc0' }}>{eventText(a.root, t)}</span>
          }
          // taikinių eilutės (atakai – tik kai daugiau nei 1 taikinys arba abipusė; kitiems – visi)
          const hitRows: LogTarget[] = a.kind === 'attack'
            ? (a.mutual || others.length > 1 ? others : [])
            : others.filter((x) => x.hits.length > 0)
          const attackSingle = a.kind === 'attack' && hitRows.length === 0 ? others[0] : null
          return (
            <div key={a.atLog} onClick={() => toggle(a.atLog)} className="rounded-lg cursor-pointer" style={{ display: 'grid', gridTemplateColumns: '3px 1fr', columnGap: 7, padding: '4px 6px 4px 4px', background: 'rgba(255,255,255,0.025)' }}>
              <span style={{ background: col, borderRadius: 2 }} />
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="shrink-0 text-center" style={{ width: 14, fontSize: 12, lineHeight: 1, color: kw ? KW_COLOR[kw] : '#bfb4dd' }}>{KIND_ICON[a.kind] ?? '·'}</span>
                  {head}
                </div>
                {kw && <span className="self-start rounded" style={{ font: '800 8.5px system-ui', letterSpacing: '0.12em', padding: '1px 5px', border: '1px solid ' + KW_COLOR[kw] + '8c', color: KW_COLOR[kw] }}>{t('battleLogShort.kw.' + kw)}</span>}
                {attackSingle && attackSingle.hits.length > 0 && <div className="flex flex-wrap gap-1 items-center"><HitChips hits={attackSingle.hits} t={t} /></div>}
                {hitRows.map((tg, i) => (
                  <div key={i} className="flex items-center gap-1.5 min-w-0 pl-0.5">
                    {tg.player ? avatar({ side: tg.player }) : thumb({ name: tg.name, dead: isDead(tg), w: wide ? 22 : 20 })}
                    <span className="min-w-0 truncate" style={{ font: '600 10.5px Georgia, serif', color: '#e8dcb5', flex: wide ? '0 1 auto' : '0 1 64px' }}>{tg.player ? t(sideOf(tg.player) === 'you' ? 'battleLogShort.youShort' : 'battleLogShort.foeShort') : tg.name}</span>
                    <span className="flex flex-wrap gap-1 items-center"><HitChips hits={tg.hits} t={t} /></span>
                  </div>
                ))}
                {open && (
                  <div className="mt-0.5 rounded" style={{ padding: '5px 6px', background: 'rgba(0,0,0,0.35)', fontSize: 10, lineHeight: 1.35, color: '#bfb4dd' }}>
                    {a.events.filter((e) => !!e.key || !!e.msg).map((e, i) => <div key={i}><span style={{ color: '#8e84ab' }}>· </span>{eventText(e, t)}</div>)}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {unseen > 0 && (
        <button onClick={jumpDown} className="shrink-0 self-center rounded-full mt-1" style={{ font: '700 9.5px system-ui', padding: '3px 9px', background: 'rgba(240,180,41,0.18)', border: '1px solid rgba(240,180,41,0.5)', color: '#ffd97a' }}>{t('battleLogShort.newItems', { n: unseen })}</button>
      )}
    </div>
  )
}
