export default function ProfileLoading() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <style>{`
        @keyframes rvn-pulse { 0%,100%{opacity:.45} 50%{opacity:.8} }
        .rvn-skel { animation: rvn-pulse 1.6s ease-in-out infinite; background: var(--bg-surface); border-radius: 8px; }
      `}</style>

      {/* Header */}
      <header style={{ background: 'rgba(10,10,15,0.95)', borderBottom: '1px solid rgba(212,175,55,0.1)', padding: '12px 16px' }}>
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <div className="rvn-skel" style={{ width: 60, height: 24 }} />
          <div className="rvn-skel" style={{ width: 100, height: 24, animationDelay: '80ms' }} />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Avatar + name block */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 16, padding: 24, display: 'flex', gap: 20, alignItems: 'center' }}>
          <div className="rvn-skel" style={{ width: 80, height: 80, borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="rvn-skel" style={{ width: '55%', height: 24, animationDelay: '60ms' }} />
            <div className="rvn-skel" style={{ width: '35%', height: 16, animationDelay: '120ms' }} />
            <div className="rvn-skel" style={{ width: '45%', height: 16, animationDelay: '180ms' }} />
          </div>
        </div>

        {/* XP bar */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="rvn-skel" style={{ width: '40%', height: 16 }} />
          <div className="rvn-skel" style={{ width: '100%', height: 8, borderRadius: 4, animationDelay: '80ms' }} />
          <div className="rvn-skel" style={{ width: '60%', height: 14, animationDelay: '120ms' }} />
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[0, 60, 120].map((d) => (
            <div key={d} style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="rvn-skel" style={{ width: '60%', height: 28, animationDelay: d + 'ms' }} />
              <div className="rvn-skel" style={{ width: '80%', height: 12, animationDelay: (d + 60) + 'ms' }} />
            </div>
          ))}
        </div>

        {/* Settings block */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[0, 80, 160].map((d) => (
            <div key={d} className="rvn-skel" style={{ width: '100%', height: 40, borderRadius: 8, animationDelay: d + 'ms' }} />
          ))}
        </div>
      </div>
    </div>
  )
}
