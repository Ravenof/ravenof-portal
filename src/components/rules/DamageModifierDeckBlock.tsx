import Image from 'next/image'

// Kai įdėsi realias kortų nuotraukas į public/rules/zmk/
// jos automatiškai atsiras vietoj emoji.
// Failų pavadinimai: card-plus0.png, card-plus1.png, card-minus1.png,
//   card-plus2.png, card-minus2.png, card-x2.png, card-x0.png

const DMD_CARDS = [
  { value: '+0', count: 6, desc: 'Žala nekinta',  color: '#64748b', img: '/rules/zmk/card-plus0.png'  },
  { value: '+1', count: 5, desc: 'Žala +1',       color: '#22c55e', img: '/rules/zmk/card-plus1.png'  },
  { value: '−1', count: 5, desc: 'Žala −1',       color: '#ef4444', img: '/rules/zmk/card-minus1.png' },
  { value: '+2', count: 1, desc: 'Žala +2',       color: '#4ade80', img: '/rules/zmk/card-plus2.png'  },
  { value: '−2', count: 1, desc: 'Žala −2',       color: '#f87171', img: '/rules/zmk/card-minus2.png' },
  { value: '×2', count: 1, desc: 'Žala × 2',      color: '#f0b429', img: '/rules/zmk/card-x2.png',    special: true },
  { value: '×0', count: 1, desc: 'Žala = 0',      color: '#94a3b8', img: '/rules/zmk/card-x0.png',    special: true },
]

type CardEntry = typeof DMD_CARDS[number]

function MiniCard({ card, hasImage }: { card: CardEntry; hasImage: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="w-full aspect-[2.5/3.5] rounded-lg overflow-hidden relative flex items-center justify-center"
        style={{
          background: card.special ? 'rgba(240,180,41,0.08)' : 'var(--bg-elevated)',
          border: `1px solid ${card.color}40`,
          boxShadow: card.special ? `0 0 12px ${card.color}30` : undefined,
        }}
      >
        {hasImage ? (
          <Image
            src={card.img}
            alt={`ŽMK korta ${card.value}`}
            fill
            className="object-cover rounded-lg"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        ) : null}
        {/* Vertės tekstas rodomas TIK kai nėra nuotraukos */}
        {!hasImage && (
          <span
            className="text-base font-black z-10 relative"
            style={{ color: card.color, fontFamily: 'var(--rvn-font-display)' }}
          >
            {card.value}
          </span>
        )}
        {card.special && (
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full z-10" style={{ background: 'var(--gold)' }} />
        )}
      </div>
      <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
        ×{card.count}
      </span>
      <span className="text-xs text-center leading-tight" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
        {card.desc}
      </span>
    </div>
  )
}

export function DamageModifierDeckBlock() {
  // hasImage: pakeisk į true kai įdėsi realias nuotraukas į public/rules/zmk/
  const hasImage = true

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(240,180,41,0.2)', background: 'var(--bg-surface)' }}>
      <div className="px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(240,180,41,0.06)', borderBottom: '1px solid rgba(240,180,41,0.15)' }}>
        <span className="text-lg">🎴</span>
        <div>
          <p className="text-xs font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
            Žalos modifikatorių kaladė (ŽMK)
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>20 kortų · viena kiekvienam žaidėjui</p>
        </div>
      </div>

      <div className="p-4 grid grid-cols-4 sm:grid-cols-7 gap-2">
        {DMD_CARDS.map((card) => (
          <MiniCard key={card.value} card={card} hasImage={hasImage} />
        ))}
      </div>

      <div className="px-4 pb-4 flex flex-col gap-2">
        {[
          'Žalos modifikatorių korta traukiama kiekvienam žalos šaltiniui arba kiekvienam taikiniui pagal taisykles.',
          'Jei efektas daro žalą keliems taikiniams — kiekvienam taikiniui traukiama atskira korta.',
          'Panaudotos ŽMK kortos keliauja į panaudotų ŽMK kortų krūvą.',
          'Jei ŽMK kaladė tuščia — panaudotų ŽMK kortų krūva permaišoma ir suformuojama nauja ŽMK kaladė.',
          'Ištraukus ×2 arba ×0 — ŽMK permaišoma su panaudotų kortų krūva nedelsiant po žalos išsprendimo.',
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
