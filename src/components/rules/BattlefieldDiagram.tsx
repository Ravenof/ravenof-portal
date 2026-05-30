'use client'

// Battlefield layout pagal doodle:
// Priešininkas (viršus, apverstas):
//   [Reakcijos x6] ..... [Lauko korta]
//   [Padarai x5 + Čempionas]
//   [Artefaktai x2]
//   ─── KOVOS LAUKAS ───
//   [Artefaktai x2]
//   [Padarai x5 + Čempionas]
//   [Kaladė][ŽMK][Kapinynas][ŽMK disc]  [Reakcijos x6]

interface SlotProps {
  label: string
  icon: string
  accent?: boolean
  dim?: boolean
  small?: boolean
}

function Slot({ label, icon, accent, dim, small }: SlotProps) {
  return (
    <div
      className={`rounded-lg flex flex-col items-center justify-center gap-1 ${small ? 'p-1.5' : 'p-2'}`}
      style={{
        border: `1px dashed rgba(240,180,41,${dim ? '0.12' : accent ? '0.4' : '0.22'})`,
        background: accent ? 'rgba(240,180,41,0.05)' : dim ? 'rgba(255,255,255,0.01)' : 'rgba(240,180,41,0.02)',
        minHeight: small ? 38 : 48,
      }}
    >
      <span style={{ fontSize: small ? 14 : 18, lineHeight: 1 }}>{icon}</span>
      <span
        style={{
          color: dim ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)',
          fontFamily: 'var(--rvn-font-display)',
          fontSize: 8,
          letterSpacing: '0.04em',
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        {label}
      </span>
    </div>
  )
}

function Separator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 my-1">
      <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(240,180,41,0.35))' }} />
      <span
        className="text-xs px-3 py-1 rounded-full"
        style={{
          background: 'rgba(240,180,41,0.08)',
          color: 'var(--gold)',
          border: '1px solid rgba(240,180,41,0.25)',
          fontFamily: 'var(--rvn-font-display)',
          letterSpacing: '0.1em',
          fontSize: 9,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, rgba(240,180,41,0.35))' }} />
    </div>
  )
}

export function BattlefieldDiagram() {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid rgba(240,180,41,0.2)', background: 'var(--bg-surface)' }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{ background: 'rgba(240,180,41,0.06)', borderBottom: '1px solid rgba(240,180,41,0.15)' }}
      >
        <span>🗺</span>
        <p className="text-xs font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
          Kovos lauko schema
        </p>
      </div>

      <div className="p-3 flex flex-col gap-1.5">

        {/* ── PRIEŠININKAS (viršus, apverstas) ─────────── */}
        <p className="text-xs text-center font-semibold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-muted)', fontSize: 9, letterSpacing: '0.1em' }}>
          PRIEŠININKAS
        </p>

        {/* Priešininko reakcijos */}
        <div className="grid grid-cols-6 gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Slot key={i} label="Reakcija" icon="⚡" dim />
          ))}
        </div>

        {/* Priešininko padarai + čempionas */}
        <div className="grid grid-cols-5 gap-1">
          <Slot label="Čempionas" icon="👑" accent />
          <Slot label="Padaras" icon="⚔" />
          <Slot label="Padaras" icon="⚔" />
          <Slot label="Padaras" icon="⚔" />
          <Slot label="Padaras" icon="⚔" />
        </div>

        {/* Priešininko artefaktai */}
        <div className="grid grid-cols-2 gap-1">
          <Slot label="Artefaktas" icon="⚗" dim />
          <Slot label="Artefaktas" icon="⚗" dim />
        </div>

        <Separator label="⚔ KOVOS LAUKAS ⚔" />

        {/* Bendra lauko korta */}
        <div className="flex justify-center">
          <div className="w-1/3">
            <Slot label="Lauko korta (bendra)" icon="🌍" accent />
          </div>
        </div>

        <Separator label="" />

        {/* Mano artefaktai */}
        <div className="grid grid-cols-2 gap-1">
          <Slot label="Artefaktas" icon="⚗" dim />
          <Slot label="Artefaktas" icon="⚗" dim />
        </div>

        {/* Mano padarai + čempionas */}
        <div className="grid grid-cols-5 gap-1">
          <Slot label="Čempionas" icon="👑" accent />
          <Slot label="Padaras" icon="⚔" />
          <Slot label="Padaras" icon="⚔" />
          <Slot label="Padaras" icon="⚔" />
          <Slot label="Padaras" icon="⚔" />
        </div>

        {/* Mano kaladė / ŽMK / kapinynas */}
        <div className="grid grid-cols-4 gap-1">
          <Slot label="Kaladė" icon="🂠" dim />
          <Slot label="ŽMK" icon="🎴" dim />
          <Slot label="Kapinynas" icon="💀" dim />
          <Slot label="ŽMK discard" icon="📤" dim />
        </div>

        {/* Mano reakcijos */}
        <div className="grid grid-cols-6 gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Slot key={i} label="Reakcija" icon="⚡" dim />
          ))}
        </div>

        <p className="text-xs text-center font-semibold mt-1" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-muted)', fontSize: 9, letterSpacing: '0.1em' }}>
          TU
        </p>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {[
            { icon: '👑', label: 'Čempionas' },
            { icon: '⚔', label: 'Padaras (iki 5 su Čempion.)' },
            { icon: '⚗', label: 'Artefaktas (maks. 2)' },
            { icon: '⚡', label: 'Reakcija (neribota)' },
            { icon: '🌍', label: 'Lauko korta (bendra, maks. 1)' },
            { icon: '🎴', label: 'ŽMK – Žalos modifikatorių kaladė' },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)', fontSize: 10 }}>
              <span>{l.icon}</span>
              <span>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
