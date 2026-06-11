'use client'

// ── Įvykio soundtrack — automatiškai groja atidarius puslapį ──────────────────
// Sustoja išėjus iš puslapio. Jei naršyklė blokuoja autoplay (nebuvo user
// gesture), rodomas grojimo mygtukas, kurį paspaudus muzika paleidžiama.

import { useEffect, useState } from 'react'
import { Music, Square } from 'lucide-react'
import { playLoreTrack, stopLoreTrack, subscribeLoreTrack } from '@/lib/lore-audio'

export function EventSoundtrack({ url, title }: { url: string; title?: string }) {
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    playLoreTrack(url, { loop: true })
    const unsub = subscribeLoreTrack((now) => setPlaying(now?.url === url))
    return () => {
      unsub()
      stopLoreTrack()
    }
  }, [url])

  return (
    <button
      onClick={() => { if (playing) stopLoreTrack(); else playLoreTrack(url, { loop: true }) }}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-all hover:opacity-85"
      style={{
        background: playing ? 'rgba(240,180,41,0.15)' : 'var(--bg-elevated)',
        border: '1px solid ' + (playing ? 'rgba(240,180,41,0.5)' : 'var(--bg-border)'),
        color: playing ? 'var(--gold)' : 'var(--text-muted)',
        fontFamily: 'var(--rvn-font-display)',
        letterSpacing: '0.04em',
      }}
      title={playing ? 'Stabdyti muziką' : 'Groti muziką'}
    >
      {playing ? (
        <>
          <span className="relative flex items-center" aria-hidden>
            <Music className="w-3.5 h-3.5" />
            <span className="absolute -inset-1 rounded-full animate-ping" style={{ background: 'rgba(240,180,41,0.25)' }} />
          </span>
          {title ?? 'Muzika groja'}
          <Square className="w-2.5 h-2.5" />
        </>
      ) : (
        <>
          <Music className="w-3.5 h-3.5" />
          {title ?? 'Groti muziką'}
        </>
      )}
    </button>
  )
}
