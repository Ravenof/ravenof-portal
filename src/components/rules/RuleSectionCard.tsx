import type { RuleSection, RuleBlock } from '@/data/rules'
import { DamageModifierDeckBlock } from './DamageModifierDeckBlock'
import { CardAnatomyBlock } from './CardAnatomyBlock'
import { CardTypeGrid } from './CardTypeGrid'
import { TokenGrid } from './TokenGrid'
import { BattlefieldDiagram } from './BattlefieldDiagram'
import { ChampionRulesBlock } from './ChampionRulesBlock'
import { GoldProgressionBlock } from './GoldProgressionBlock'

const CALLOUT_STYLES: Record<string, { border: string; bg: string; labelColor: string }> = {
  important: { border: 'rgba(240,180,41,0.4)',  bg: 'rgba(240,180,41,0.06)',  labelColor: 'var(--gold)'   },
  warning:   { border: 'rgba(239,68,68,0.4)',   bg: 'rgba(239,68,68,0.06)',   labelColor: '#f87171'       },
  example:   { border: 'rgba(139,92,246,0.35)', bg: 'rgba(139,92,246,0.06)',  labelColor: '#a78bfa'       },
  quick:     { border: 'rgba(34,197,94,0.3)',   bg: 'rgba(34,197,94,0.05)',   labelColor: '#4ade80'       },
}

const CALLOUT_ICONS: Record<string, string> = {
  important: '⚠',
  warning:   '🚫',
  example:   '📖',
  quick:     '⚡',
}

function Block({ block }: { block: RuleBlock }) {
  switch (block.type) {
    case 'paragraph':
      return (
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {block.text}
        </p>
      )

    case 'list':
      return (
        <ul className="flex flex-col gap-1.5">
          {block.items?.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span className="shrink-0 mt-0.5" style={{ color: 'var(--gold)', opacity: 0.6 }}>▸</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )

    case 'table':
      return (
        <div>
          {block.label && (
            <p className="text-xs font-semibold mb-2" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
              {block.label}
            </p>
          )}
          <div className="rounded-lg" style={{ border: '1px solid var(--bg-border)', overflowX: 'auto' }}>
            <table className="min-w-full text-xs" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ background: 'rgba(240,180,41,0.06)', borderBottom: '1px solid rgba(240,180,41,0.15)' }}>
                  {block.headers?.map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-semibold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.04em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows?.map((row, ri) => (
                  <tr key={ri} style={{ borderBottom: ri < (block.rows?.length ?? 0) - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined, background: ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-2" style={{ color: ci === 0 ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: ci === 0 ? 600 : 400, verticalAlign: 'top', wordBreak: 'break-word' }}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )

    case 'callout':
    case 'example':
    case 'warning': {
      const variant = block.calloutVariant ?? (block.type === 'warning' ? 'warning' : block.type === 'example' ? 'example' : 'important')
      const style = CALLOUT_STYLES[variant] ?? CALLOUT_STYLES.important
      return (
        <div className="rounded-lg p-3 flex gap-2.5" style={{ background: style.bg, border: `1px solid ${style.border}` }}>
          <span className="shrink-0 text-sm mt-0.5">{CALLOUT_ICONS[variant]}</span>
          <div className="flex-1 min-w-0">
            {block.label && (
              <p className="text-xs font-bold mb-1" style={{ fontFamily: 'var(--rvn-font-display)', color: style.labelColor }}>
                {block.label}
              </p>
            )}
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{block.text}</p>
          </div>
        </div>
      )
    }

    case 'dmdBlock':     return <DamageModifierDeckBlock />
    case 'cardAnatomy':  return <CardAnatomyBlock />
    case 'cardTypeGrid': return <CardTypeGrid />
    case 'tokenGrid':    return <TokenGrid />
    case 'battlefieldDiagram': return <BattlefieldDiagram />
    case 'championBlock':      return <ChampionRulesBlock />
    case 'goldProgression':    return <GoldProgressionBlock />

    default:
      return null
  }
}

interface Props {
  section: RuleSection
  searchQuery: string
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} style={{ background: 'rgba(240,180,41,0.35)', color: 'var(--text-primary)', borderRadius: 2, padding: '0 2px' }}>{part}</mark>
      : part
  )
}

export function RuleSectionCard({ section, searchQuery }: Props) {
  const id = section.id

  const copyLink = () => {
    const url = `${window.location.origin}/rules#${id}`
    navigator.clipboard.writeText(url).catch(() => {})
  }

  return (
    <section
      id={id}
      className="rounded-xl overflow-hidden scroll-mt-24"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
    >
      {/* Section header */}
      <div
        className="px-4 py-3 flex items-start gap-3"
        style={{ background: 'rgba(240,180,41,0.04)', borderBottom: '1px solid var(--bg-border)' }}
      >
        {/* Number */}
        <span
          className="shrink-0 text-sm font-black w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', background: 'rgba(240,180,41,0.1)', border: '1px solid rgba(240,180,41,0.2)' }}
        >
          {section.number}
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold leading-tight" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)' }}>
            {highlight(section.title, searchQuery)}
          </h2>
          {section.summary && (
            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {highlight(section.summary, searchQuery)}
            </p>
          )}
        </div>
        {/* Anchor link */}
        <button
          onClick={copyLink}
          className="shrink-0 w-6 h-6 rounded flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--text-muted)' }}
          title="Kopijuoti nuorodą"
          aria-label="Kopijuoti nuorodą į skyrių"
        >
          🔗
        </button>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-4">
        {section.content.map((block, i) => (
          <Block key={i} block={block} />
        ))}
      </div>
    </section>
  )
}
