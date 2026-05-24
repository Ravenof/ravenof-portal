export default function CommunityDecksLoading() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <style>{`
        @keyframes rvn-pulse { 0%,100%{opacity:.45} 50%{opacity:.8} }
        .rvn-skel { animation: rvn-pulse 1.6s ease-in-out infinite; background: var(--bg-surface); border-radius: 8px; }
      `}</style>
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        <div className="rvn-skel" style={{ width: 200, height: 32, marginBottom: 24 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 130 }}>
              <div className="rvn-skel" style={{ width: '70%', height: 18, animationDelay: (i * 50) + 'ms' }} />
              <div className="rvn-skel" style={{ width: '45%', height: 14, animationDelay: (i * 50 + 60) + 'ms' }} />
              <div style={{ height: 8 }} />
              <div className="rvn-skel" style={{ width: '30%', height: 14, animationDelay: (i * 50 + 120) + 'ms' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
