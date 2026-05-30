const DMD_CARDS = [
  { value: '+0', count: 6, desc: 'Žala nekinta',  color: '#64748b' },
  { value: '+1', count: 5, desc: 'Žala +1',       color: '#22c55e' },
  { value: '−1', count: 5, desc: 'Žala −1',       color: '#ef4444' },
  { value: '+2', count: 1, desc: 'Žala +2',       color: '#4ade80' },
  { value: '−2', count: 1, desc: 'Žala −2',       color: '#f87171' },
  { value: '×2', count: 1, desc: 'Žala × 2',      color: '#f0b429', special: true },
  { value: '×0', count: 1, desc: 'Žala = 0',      color: '#94a3b8', special: true },
]

export function DamageModifierDeckBlock() {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(240,180,41,0.2)', background: 'var(--bg-surface)' }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(240,180,41,0.06)', borderBottom: '1px solid rgba(240,180,41,0.15)' }}>
        <span className="text-lg">🎴</span>
        <div>
          <p className="text-xs font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
            Damage Modifier Deck — sudėtis
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Žalos modifikatorių kaladė · 20 kortų</p>
        </div>
      </div>

      {/* Cards grid */}
      <div className="p-4 grid grid-cols-4 sm:grid-cols-7 gap-2">
        {DMD_CARDS.map((card) => (
          <div key={card.value} className="flex flex-col items-center gap-1.5">
            {/* Mini card */}
            <div
              className="w-full aspect-[3/4] rounded-lg flex flex-col items-center justify-center gap-1 relative"
              style={{
                background: card.special ? 'rgba(240,180,41,0.08)' : 'var(--bg-elevated)',
                border: `1px solid ${card.color}40`,
                boxShadow: card.special ? `0 0 12px ${card.color}30` : undefined,
              }}
            >
              <span className="text-base font-black" style={{ color: card.color, fontFamily: 'var(--rvn-font-display)' }}>
                {card.value}
              </span>
              {card.special && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--gold)' }} />
              )}
            </div>
            {/* Count badge */}
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
              ×{card.count}
            </span>
            <span className="text-xs text-center leading-tight" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
              {card.desc}
            </span>
          </div>
        ))}
      </div>

      {/* Rules */}
      <div className="px-4 pb-4 flex flex-col gap-2">
        {[
          'Traukiama kiekvieną kartą, kai daroma žala.',
          'Jei efektas daro žalą keliems taikiniams, kiekvienam taikiniui traukiama atskira korta.',
          'Ištraukus ×2 arba ×0 — DMD permaišoma su discard pila.',
        ].map((t, i) => (
          <div key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--gold)', marginTop: 1 }}>▸</span>
            <span>{t}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
