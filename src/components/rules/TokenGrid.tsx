const STATUS_TOKENS = [
  { symbol: '❄', label: 'Sušaldytas',     effect: 'Negali atakuoti 1 ėjimą',          color: '#60a5fa' },
  { symbol: '🔥', label: 'Degantis',       effect: 'Žala kiekvieno ėjimo pradžioje',   color: '#f97316' },
  { symbol: '☠',  label: 'Apnuodytas',     effect: 'Žala kiekvieno ėjimo pradžioje',   color: '#a3e635' },
  { symbol: '✦',  label: 'Apsvaigintas',   effect: 'Negali atakuoti 1 ėjimą',          color: '#c084fc' },
  { symbol: '🔇', label: 'Nutildytas',     effect: 'Efektai ir gebėjimai blokuojami',  color: '#94a3b8' },
]

const KEYWORD_TOKENS = [
  { symbol: '▶',  label: 'Sprintas',       effect: 'Puola iškvietimo ėjimą',           color: '#fbbf24' },
  { symbol: '⊙',  label: 'Pasišaipymas',   effect: 'Privalo būti taikinys',            color: '#f87171' },
  { symbol: '✦★', label: 'Mag. skydas',    effect: 'Pirmą žalą blokuoja',              color: '#818cf8' },
  { symbol: '◑',  label: 'Sėlinimas',      effect: 'Negali būti taikinys',             color: '#34d399' },
  { symbol: '🕊',  label: 'Palaiminimas',   effect: 'Traukia 2 DMD, renkasi geresnį',  color: '#f0b429' },
]

const BUFF_TOKENS = [
  { symbol: '±1', label: '±1 / ±2', effect: 'ATK arba HP modifikatorius', color: '#94a3b8' },
  { symbol: '±3', label: '±3 / ±4', effect: 'ATK arba HP modifikatorius', color: '#94a3b8' },
  { symbol: '±5', label: '±5 / ±6', effect: 'ATK arba HP modifikatorius', color: '#94a3b8' },
]

function TokenBubble({ symbol, label, effect, color }: { symbol: string; label: string; effect: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
        style={{ background: `${color}15`, border: `2px solid ${color}40`, boxShadow: `0 0 10px ${color}20` }}
      >
        {symbol}
      </div>
      <p className="text-xs font-semibold leading-tight" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)', fontSize: '10px' }}>
        {label}
      </p>
      <p className="text-xs leading-tight" style={{ color: 'var(--text-muted)', fontSize: '9px' }}>
        {effect}
      </p>
    </div>
  )
}

function TokenGroup({ title, tokens }: { title: string; tokens: typeof STATUS_TOKENS }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
      <p className="text-xs font-bold mb-4" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.08em' }}>
        {title}
      </p>
      <div className="flex flex-wrap gap-4 justify-start">
        {tokens.map((t) => <TokenBubble key={t.label} {...t} />)}
      </div>
    </div>
  )
}

export function TokenGrid() {
  return (
    <div className="flex flex-col gap-3">
      <TokenGroup title="STATUSŲ ŽETONAI" tokens={STATUS_TOKENS} />
      <TokenGroup title="RAKTAŽODŽIŲ ŽETONAI" tokens={KEYWORD_TOKENS} />
      <TokenGroup title="BUFF / DEBUFF ŽETONAI" tokens={BUFF_TOKENS} />
    </div>
  )
}
