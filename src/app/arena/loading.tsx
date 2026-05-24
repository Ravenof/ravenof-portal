export default function ArenaLoading() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <style>{`
        @keyframes rvn-pulse { 0%,100%{opacity:.45} 50%{opacity:.8} }
        .rvn-skel { animation: rvn-pulse 1.6s ease-in-out infinite; background: var(--bg-surface); border-radius: 8px; }
      `}</style>

      <header style={{ background: 'rgba(10,10,15,0.95)', borderBottom: '1px solid rgba(212,175,55,0.1)', padding: '12px 16px' }}>
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <div className="rvn-skel" style={{ width: 60, height: 24 }} />
          <div className="rvn-skel" style={{ width: 80, height: 24, animationDelay: '80ms' }} />
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto px-4 py-10 space-y-6">
        {/* Title */}
        <div className="text-center space-y-3 mb-8">
          <div className="rvn-skel mx-auto" style={{ width: 200, height: 36 }} />
          <div className="rvn-skel mx-auto" style={{ width: 300, height: 16, animationDelay: '80ms' }} />
        </div>

        {/* Section cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {[0, 100, 200, 300].map((d) => (
            <div key={d} style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 160 }}>
              <div className="rvn-skel" style={{ width: 40, height: 40, borderRadius: 10, animationDelay: d + 'ms' }} />
              <div className="rvn-skel" style={{ width: '65%', height: 20, animationDelay: (d + 60) + 'ms' }} />
              <div className="rvn-skel" style={{ width: '90%', height: 14, animationDelay: (d + 120) + 'ms' }} />
              <div className="rvn-skel" style={{ width: '75%', height: 14, animationDelay: (d + 160) + 'ms' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
