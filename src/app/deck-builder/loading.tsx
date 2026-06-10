export default function DeckBuilderLoading() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <style>{`
        @keyframes rvn-pulse { 0%,100%{opacity:.45} 50%{opacity:.8} }
        .rvn-skel { animation: rvn-pulse 1.6s ease-in-out infinite; background: var(--bg-surface); border-radius: 8px; }
      `}</style>

      <header style={{ background: 'rgba(10,10,15,0.95)', borderBottom: '1px solid rgba(212,175,55,0.1)', padding: '12px 16px' }}>
        <div className="max-w-screen-2xl mx-auto flex items-center gap-3">
          <div className="rvn-skel" style={{ width: 60, height: 24 }} />
          <div className="rvn-skel" style={{ width: 160, height: 24, animationDelay: '80ms' }} />
        </div>
      </header>

      <div className="max-w-screen-2xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="rvn-skel" style={{ width: '100%', height: 44 }} />
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rvn-skel" style={{ width: '100%', height: 48, animationDelay: `${i * 50}ms` }} />
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="rvn-skel" style={{ width: '100%', height: 60 }} />
          <div className="rvn-skel" style={{ width: '100%', height: 320, animationDelay: '100ms' }} />
          <div className="rvn-skel" style={{ width: '100%', height: 44, animationDelay: '200ms' }} />
        </div>
      </div>
    </div>
  )
}
