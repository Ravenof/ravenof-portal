// Skeleton rodomas iš karto kol /cards server component krauna duomenis
export default function CardsLoading() {
  const skeletonCard = (i: number) => (
    <div key={i} style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--bg-border)',
      borderRadius: 12,
      overflow: 'hidden',
      aspectRatio: '3/4',
      animation: 'rvn-pulse 1.6s ease-in-out infinite',
      animationDelay: (i * 40) + 'ms',
    }} />
  )

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <style>{`
        @keyframes rvn-pulse { 0%,100%{opacity:.45} 50%{opacity:.8} }
      `}</style>

      {/* Header skeleton */}
      <header style={{ background: 'rgba(10,10,15,0.95)', borderBottom: '1px solid rgba(212,175,55,0.1)', padding: '12px 16px' }}>
        <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-3">
          <div style={{ width: 120, height: 28, borderRadius: 6, background: 'rgba(212,175,55,0.12)', animation: 'rvn-pulse 1.6s ease-in-out infinite' }} />
          <div style={{ width: 80, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.05)', animation: 'rvn-pulse 1.6s ease-in-out infinite' }} />
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-3 py-4">
        {/* Filter bar skeleton */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {[100, 80, 90, 70, 85].map((w, i) => (
            <div key={i} style={{ width: w, height: 36, borderRadius: 8, background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', animation: 'rvn-pulse 1.6s ease-in-out infinite', animationDelay: (i * 60) + 'ms' }} />
          ))}
        </div>

        {/* Cards grid skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
          {Array.from({ length: 24 }, (_, i) => skeletonCard(i))}
        </div>
      </div>
    </div>
  )
}
