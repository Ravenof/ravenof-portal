'use client'
// Emocijų ratas (823): 5 vardinės emocijos aplink centrą; centre – varžovo emocijų nutildymas.
// Tėvas duoda 150×150 konteinerį (pozicija priklauso nuo išdėstymo); čia tik turinys.
import React from 'react'

export type WheelEmote = { k: string; icon: string; label: string }

export default function EmoteWheel({ emotes, cdUntil = 0, muted = false, onToggleMute, onPick, muteTitle }: {
  emotes: WheelEmote[]; cdUntil?: number; muted?: boolean; onToggleMute?: () => void; onPick: (k: string) => void; muteTitle?: string
}) {
  const cd = cdUntil > Date.now()
  return (
    <>
      {emotes.map((e, i) => {
        const ang = (-90 + i * (360 / emotes.length)) * Math.PI / 180
        const x = 75 + Math.cos(ang) * 66 - 31, y = 75 + Math.sin(ang) * 62 - 24
        return (
          <button key={e.k} disabled={cd} onClick={() => { if (!cd) onPick(e.k) }} title={e.label}
            className="absolute flex flex-col items-center justify-center transition-transform hover:scale-110 active:scale-95"
            style={{ left: x, top: y, width: 62, height: 48, borderRadius: 12, background: 'linear-gradient(180deg, rgba(34,25,48,0.97), rgba(16,12,24,0.97))', border: '1px solid rgba(240,180,41,0.5)', boxShadow: '0 4px 12px rgba(0,0,0,0.65)', opacity: cd ? 0.4 : 1, cursor: cd ? 'default' : 'pointer' }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>{e.icon}</span>
            <span style={{ fontSize: 8.5, lineHeight: 1.1, marginTop: 3, color: '#f3ead8', fontWeight: 700, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>{e.label}</span>
          </button>
        )
      })}
      {onToggleMute && (
        <button onClick={onToggleMute} title={muteTitle}
          className="absolute rounded-full flex items-center justify-center text-sm transition-transform hover:scale-110 active:scale-95"
          style={{ left: 75 - 17, top: 75 - 17, width: 34, height: 34, background: muted ? 'rgba(239,68,68,0.22)' : 'rgba(240,180,41,0.16)', border: `1px solid ${muted ? 'rgba(239,68,68,0.6)' : 'rgba(240,180,41,0.4)'}` }}>
          {muted ? '🔇' : '🔔'}
        </button>
      )}
    </>
  )
}
