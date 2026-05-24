export default function EventsLoading() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <style>{`
        @keyframes rvn-pulse { 0%,100%{opacity:.45} 50%{opacity:.8} }
        .rvn-skel { animation: rvn-pulse 1.6s ease-in-out infinite; background: var(--bg-surface); border-radius: 8px; }
      `}</style>
      <div className="max-w-screen-lg mx-auto px-4 py-8 space-y-4">
        <div className="rvn-skel" style={{ width: 180, height: 32, marginBottom: 8 }} />
        {[0, 80, 160, 240, 320].map((d) => (
          <div key={d} style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 12, padding: 20, display: 'flex', gap: 16 }}>
            <div className="rvn-skel" style={{ width: 56, height: 56, borderRadius: 10, flexShrink: 0, animationDelay: d + 'ms' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="rvn-skel" style={{ width: '55%', height: 18, animationDelay: (d + 40) + 'ms' }} />
              <div className="rvn-skel" style={{ width: '35%', height: 13, animationDelay: (d + 80) + 'ms' }} />
              <div className="rvn-skel" style={{ width: '45%', height: 13, animationDelay: (d + 120) + 'ms' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
