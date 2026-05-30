const ANATOMY_ITEMS = [
  { label: 'Iškvietimo kaina',  desc: 'Kiek aukso mokama. Viršuje dešinėje: aukso moneta.' },
  { label: 'Pavadinimas',       desc: 'Kortos identifikatorius.' },
  { label: 'Kortų tipas',       desc: 'Ikonėlė: Padaras, Burtas, Artefaktas ir kt.' },
  { label: 'Frakcija',          desc: 'Kuriai frakcijai priklauso korta.' },
  { label: 'Efekto tekstas',    desc: 'Kortų gebėjimai. Raktažodžiai paryškintu šriftu.' },
  { label: 'ATK (⚔)',           desc: 'Puolimo taškai – žalos kiekis atakuojant.' },
  { label: 'HP (♥)',            desc: 'Gyvybės taškai – kiek žalos atlaikoma.' },
  { label: 'Retumas',           desc: 'Nurodo kopijų limitą kaladėje.' },
]

export function CardAnatomyBlock() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(240,180,41,0.2)' }}>
      {/* Left: card mock */}
      <div className="flex items-center justify-center p-6" style={{ background: 'var(--bg-surface)' }}>
        <div
          className="w-36 aspect-[2.5/3.5] rounded-xl flex flex-col overflow-hidden relative"
          style={{ border: '2px solid rgba(240,180,41,0.4)', background: 'var(--bg-elevated)', boxShadow: '0 0 24px rgba(240,180,41,0.12)' }}
        >
          {/* Cost */}
          <div className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black" style={{ background: 'rgba(240,180,41,0.9)', color: '#0a0a0f', fontFamily: 'var(--rvn-font-display)' }}>
            6
          </div>
          {/* Illustration area */}
          <div className="flex-1 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#1a1030,#0d1a2e)', borderBottom: '1px solid rgba(240,180,41,0.2)' }}>
            <span className="text-3xl opacity-40">🃏</span>
          </div>
          {/* Bottom info */}
          <div className="p-2" style={{ background: 'rgba(0,0,0,0.6)' }}>
            <p className="text-xs font-bold truncate mb-0.5" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', fontSize: '9px' }}>
              Elvira Melvija
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)', fontSize: '8px' }}>◆ PADARAS · Mistikos Melodija</p>
            <div className="flex justify-between mt-1">
              <span className="text-xs" style={{ color: '#f87171', fontSize: '9px' }}>⚔ 6</span>
              <span className="text-xs" style={{ color: '#4ade80', fontSize: '9px' }}>♥ 3</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: anatomy list */}
      <div className="p-4 flex flex-col gap-2" style={{ background: 'rgba(240,180,41,0.03)' }}>
        <p className="text-xs font-bold mb-1" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.08em' }}>
          KORTOS ELEMENTAI
        </p>
        {ANATOMY_ITEMS.map((item, i) => (
          <div key={i} className="flex gap-2 text-xs">
            <span className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(240,180,41,0.1)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
              {i + 1}
            </span>
            <div>
              <span className="font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--rvn-font-display)' }}>{item.label}</span>
              <span style={{ color: 'var(--text-muted)' }}> — {item.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
