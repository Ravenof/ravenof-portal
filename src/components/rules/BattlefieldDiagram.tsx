'use client'

// Kovos lauko zonų išdėstymas (nuo priešininko pusės žiūrint):
//   [Priešininko] 3 Reakcijos | 5 Padarai+Čempionas | 2 Artefaktai
//   [Bendra viduryje]                Lauko korta
//   [Žaidėjo]      2 Artefaktai | 5 Padarai+Čempionas | 3 Reakcijos
// Šone abiejų: Kaladė | ŽMK kaladė | Kapinynas | ŽMK kapinynas

interface SlotProps {
  label: string
  icon: string
  accent?: boolean
  dim?: boolean
  small?: boolean
  wide?: boolean
}

function Slot({ label, icon, accent, dim, wide }: SlotProps) {
  return (
    <div
      className={`rounded-lg flex flex-col items-center justify-center gap-1 p-2 text-center ${wide ? 'col-span-2' : ''}`}
      style={{
        border: `1px dashed rgba(240,180,41,${dim ? '0.12' : accent ? '0.4' : '0.22'})`,
        background: accent ? 'rgba(240,180,41,0.05)' : dim ? 'rgba(255,255,255,0.01)' : 'rgba(240,180,41,0.02)',
        minHeight: 48,
      }}
    >
      <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
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

function SideZones({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-1 shrink-0">
      <p className="text-center" style={{ fontSize: 7, color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.05em' }}>{label}</p>
      <Slot label="Kaladė"       icon="🂠"  dim />
      <Slot label="ŽMK kaladė"  icon="🎴"  dim />
      <Slot label="Kapinynas"    icon="💀"  dim />
      <Slot label="ŽMK kap."    icon="📤"  dim />
    </div>
  )
}

function Separator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 my-1">
      <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(240,180,41,0.35))' }} />
      {label && (
        <span className="text-xs px-3 py-1 rounded-full" style={{
          background: 'rgba(240,180,41,0.08)', color: 'var(--gold)',
          border: '1px solid rgba(240,180,41,0.25)', fontFamily: 'var(--rvn-font-display)',
          letterSpacing: '0.1em', fontSize: 9, whiteSpace: 'nowrap',
        }}>
          {label}
        </span>
      )}
      <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, rgba(240,180,41,0.35))' }} />
    </div>
  )
}

function PlayerBoard({ label, flipped }: { label: string; flipped?: boolean }) {
  const reactions = (
    <div className="flex flex-col gap-1">
      <p style={{ fontSize: 7, color: 'rgba(240,180,41,0.4)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.06em', textAlign: 'center' }}>
        REAKCIJOS (maks. 3)
      </p>
      <div className="grid grid-cols-3 gap-1">
        <Slot label="Reakcija" icon="⚡" dim />
        <Slot label="Reakcija" icon="⚡" dim />
        <Slot label="Reakcija" icon="⚡" dim />
      </div>
    </div>
  )
  const creatures = (
    <div className="flex flex-col gap-1">
      <p style={{ fontSize: 7, color: 'rgba(240,180,41,0.4)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.06em', textAlign: 'center' }}>
        PADARAI / ČEMPIONAS (maks. 5)
      </p>
      <div className="grid grid-cols-5 gap-1">
        <Slot label="Čempionas" icon="👑" accent />
        <Slot label="Padaras"   icon="⚔" />
        <Slot label="Padaras"   icon="⚔" />
        <Slot label="Padaras"   icon="⚔" />
        <Slot label="Padaras"   icon="⚔" />
      </div>
    </div>
  )
  const artifacts = (
    <div className="flex flex-col gap-1">
      <p style={{ fontSize: 7, color: 'rgba(240,180,41,0.4)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.06em', textAlign: 'center' }}>
        ARTEFAKTAI (maks. 2)
      </p>
      <div className="grid grid-cols-2 gap-1">
        <Slot label="Artefaktas" icon="⚗" dim />
        <Slot label="Artefaktas" icon="⚗" dim />
      </div>
    </div>
  )

  const zones = flipped ? [reactions, creatures, artifacts] : [artifacts, creatures, reactions]

  return (
    <div className="flex gap-2 items-start">
      <SideZones label={flipped ? "PRIEŠININKAS" : "TU"} />
      <div className="flex-1 flex flex-col gap-1.5">
        <p className="text-center text-xs font-semibold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-muted)', fontSize: 9, letterSpacing: '0.1em' }}>
          {label}
        </p>
        {zones}
      </div>
    </div>
  )
}

export function BattlefieldDiagram() {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(240,180,41,0.2)', background: 'var(--bg-surface)' }}>
      <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'rgba(240,180,41,0.06)', borderBottom: '1px solid rgba(240,180,41,0.15)' }}>
        <span>🗺</span>
        <p className="text-xs font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
          Kovos lauko schema
        </p>
      </div>

      <div className="p-3 flex flex-col gap-2">
        <PlayerBoard label="PRIEŠININKAS" flipped />
        <Separator label="⚔ KOVOS LAUKAS ⚔" />
        {/* Shared field card — centre between players */}
        <div className="flex justify-center">
          <div className="w-40">
            <Slot label="Lauko korta — bendra abiem (maks. 1)" icon="🌍" accent />
          </div>
        </div>
        <Separator label="" />
        <PlayerBoard label="TU" />

        {/* Legend */}
        <div className="flex flex-wrap gap-2 mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {[
            { icon: '👑', label: 'Čempionas (1 iš 5 vietų)' },
            { icon: '⚔',  label: 'Padaras (iki 5 su Čempion.)' },
            { icon: '⚗',  label: 'Artefaktas (maks. 2)' },
            { icon: '⚡',  label: 'Reakcija (maks. 3)' },
            { icon: '🌍',  label: 'Lauko korta (bendra, maks. 1)' },
            { icon: '🎴',  label: 'ŽMK — Žalos modifikatorių kaladė' },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1" style={{ color: 'var(--text-muted)', fontSize: 10 }}>
              <span>{l.icon}</span><span>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
