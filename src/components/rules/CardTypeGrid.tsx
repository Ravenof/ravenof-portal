'use client'

// Lucide icons naudojami kaip kortu tipu ikonos
function IconCreature() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z"/>
      <path d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
      <path d="M9.5 14.5v-5c0-.83-.67-1.5-1.5-1.5S6.5 8.67 6.5 9.5v5"/>
      <path d="M3.5 10H5v-1.5C5 7.67 4.33 7 3.5 7S2 7.67 2 8.5 2.67 10 3.5 10z"/>
      <path d="M7 19.4C7 21.4 8.6 23 10.6 23h2.8c2 0 3.6-1.6 3.6-3.6V18H7v1.4z"/>
      <path d="M7 18v-4.5C7 12.12 8.12 11 9.5 11h5c1.38 0 2.5 1.12 2.5 2.5V18"/>
    </svg>
  )
}
function IconSpell() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/>
      <path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8H3"/><path d="M21 16h-4"/><path d="M11 3H9"/>
    </svg>
  )
}
function IconArtifact() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )
}
function IconCurse() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 8v4"/><path d="M12 16h.01"/>
    </svg>
  )
}
function IconReaction() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  )
}
function IconField() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  )
}
function IconChampion() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/>
    </svg>
  )
}

const CARD_TYPES = [
  { id: 'creature',  Icon: IconCreature,  label: 'Padaras',     desc: 'Kovos lauko vienetas',               atk: true,  hp: true,  stays: true  },
  { id: 'spell',     Icon: IconSpell,     label: 'Burtas',      desc: 'Vienkartinis efektas',               atk: false, hp: false, stays: false },
  { id: 'artifact',  Icon: IconArtifact,  label: 'Artefaktas',  desc: 'Ilgalaikis efektas su HP',           atk: false, hp: true,  stays: true  },
  { id: 'curse',     Icon: IconCurse,     label: 'Prakeiksmas', desc: 'Įmaišomas į priešininko kaladę',     atk: false, hp: false, stays: false },
  { id: 'reaction',  Icon: IconReaction,  label: 'Reakcija',    desc: 'Užversta, aktyvuojasi sąlygiškai',   atk: false, hp: false, stays: true  },
  { id: 'field',     Icon: IconField,     label: 'Laukas',      desc: 'Globalus aplinkos efektas',          atk: false, hp: false, stays: true  },
  { id: 'champion',  Icon: IconChampion,  label: 'Čempionas',   desc: 'Galingas su fazėmis ir gebėjimais',  atk: false, hp: true,  stays: true  },
]

type CardType = typeof CARD_TYPES[number]

function CardTypeItem({ ct }: { ct: CardType }) {
  return (
    <div className="rounded-xl overflow-hidden flex flex-col" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
      <div className="h-28 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#12121e,#1a1a2e)', color: 'rgba(240,180,41,0.6)' }}>
        <ct.Icon />
      </div>
      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="text-sm font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
          {ct.label}
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{ct.desc}</p>
        <div className="flex flex-wrap gap-1 mt-auto">
          {ct.atk && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)', fontSize: 10 }}>⚔ ATK</span>}
          {ct.hp  && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(74,222,128,0.1)',  color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)',  fontSize: 10 }}>♥ HP</span>}
          {ct.stays && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(240,180,41,0.08)', color: 'rgba(240,180,41,0.7)', border: '1px solid rgba(240,180,41,0.15)', fontSize: 10 }}>Lieka lauke</span>}
        </div>
      </div>
    </div>
  )
}

export function CardTypeGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {CARD_TYPES.map((ct) => <CardTypeItem key={ct.id} ct={ct} />)}
    </div>
  )
}
