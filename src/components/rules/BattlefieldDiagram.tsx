function Zone({ label, icon, dim }: { label: string; icon: string; dim?: boolean }) {
  return (
    <div
      className="rounded-lg flex flex-col items-center justify-center gap-1 p-2 text-center"
      style={{
        border: `1px dashed rgba(240,180,41,${dim ? '0.12' : '0.25'})`,
        background: dim ? 'rgba(240,180,41,0.02)' : 'rgba(240,180,41,0.04)',
        minHeight: 52,
      }}
    >
      <span className="text-base">{icon}</span>
      <span className="text-xs leading-tight" style={{ color: dim ? 'var(--text-muted)' : 'var(--text-secondary)', fontFamily: 'var(--rvn-font-display)', fontSize: '9px', letterSpacing: '0.04em' }}>
        {label}
      </span>
    </div>
  )
}

function PlayerZone({ label, flipped }: { label: string; flipped?: boolean }) {
  const mainZones = (
    <div className="grid grid-cols-4 gap-1.5">
      <Zone label="Čempionas" icon="👑" />
      <Zone label="Padaras 1" icon="⚔" />
      <Zone label="Padaras 2" icon="⚔" />
      <Zone label="Padaras 3" icon="⚔" />
    </div>
  )

  const sideZones = (
    <div className="grid grid-cols-4 gap-1.5">
      <Zone label="Artefaktai" icon="⚗" dim />
      <Zone label="Reakcijos" icon="⚡" dim />
      <Zone label="Kaladė" icon="🂠" dim />
      <Zone label="Kapinynas" icon="💀" dim />
    </div>
  )

  const dmdZones = (
    <div className="grid grid-cols-2 gap-1.5">
      <Zone label="DMD" icon="🎴" dim />
      <Zone label="DMD discard" icon="📤" dim />
    </div>
  )

  return (
    <div className="flex flex-col gap-1.5">
      {/* Player label */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1" style={{ background: 'rgba(240,180,41,0.15)' }} />
        <span className="text-xs font-semibold px-2" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-muted)', fontSize: '9px', letterSpacing: '0.1em' }}>
          {label}
        </span>
        <div className="h-px flex-1" style={{ background: 'rgba(240,180,41,0.15)' }} />
      </div>
      {flipped ? (
        <>
          {dmdZones}
          {sideZones}
          {mainZones}
        </>
      ) : (
        <>
          {mainZones}
          {sideZones}
          {dmdZones}
        </>
      )}
    </div>
  )
}

export function BattlefieldDiagram() {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid rgba(240,180,41,0.2)', background: 'var(--bg-surface)' }}
    >
      <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'rgba(240,180,41,0.06)', borderBottom: '1px solid rgba(240,180,41,0.15)' }}>
        <span>🗺</span>
        <p className="text-xs font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
          Kovos lauko schema
        </p>
      </div>

      <div className="p-4 flex flex-col gap-2">
        <PlayerZone label="PRIEŠININKAS" flipped />

        {/* Battle separator */}
        <div className="flex items-center gap-2 my-1">
          <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(240,180,41,0.4))' }} />
          <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'rgba(240,180,41,0.1)', color: 'var(--gold)', border: '1px solid rgba(240,180,41,0.3)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.1em', fontSize: '9px' }}>
            ⚔ KOVOS LAUKAS ⚔
          </span>
          <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, rgba(240,180,41,0.4))' }} />
        </div>

        {/* Shared field card zone */}
        <div className="mx-auto w-1/2">
          <Zone label="Lauko korta (bendra)" icon="🌍" />
        </div>

        <PlayerZone label="TU" />
      </div>
    </div>
  )
}
