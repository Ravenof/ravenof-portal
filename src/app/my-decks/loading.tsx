export default function MyDecksLoading() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <style>{`
        @keyframes rvn-pulse { 0%,100%{opacity:.45} 50%{opacity:.8} }
        .rvn-skel { animation: rvn-pulse 1.6s ease-in-out infinite; background: var(--bg-surface); border-radius: 8px; }
      `}</style>

      <header style={{ background: 'rgba(10,10,15,0.95)', borderBottom: '1px solid rgba(212,175,55,0.1)', padding: '12px 16px' }}>
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <div className="rvn-skel" style={{ width: 60, height: 24 }} />
          <div className="rvn-skel" style={{ width: 120, height: 24, animationDelay: '80ms' }} />
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="rvn-skel" style={{ width: '60%', height: 20, animationDelay: `${i * 60}ms` }} />
              <div className="rvn-skel" style={{ width: '40%', height: 14, animationDelay: `${i * 60 + 40}ms` }} />
              <div className="rvn-skel" style={{ width: '100%', height: 36, animationDelay: `${i * 60 + 80}ms` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
