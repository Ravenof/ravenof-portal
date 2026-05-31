'use client'

// SVG ikonos vietoj emoji
function IcoCreature({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z"/><path d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/><path d="M9.5 14.5v-5c0-.83-.67-1.5-1.5-1.5S6.5 8.67 6.5 9.5v5"/><path d="M3.5 10H5v-1.5C5 7.67 4.33 7 3.5 7S2 7.67 2 8.5 2.67 10 3.5 10z"/><path d="M7 19.4C7 21.4 8.6 23 10.6 23h2.8c2 0 3.6-1.6 3.6-3.6V18H7v1.4z"/><path d="M7 18v-4.5C7 12.12 8.12 11 9.5 11h5c1.38 0 2.5 1.12 2.5 2.5V18"/></svg>
}
function IcoChampion({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/></svg>
}
function IcoArtifact({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
}
function IcoReaction({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
}
function IcoDeck({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
}
function IcoZmk({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 12h4l2-3 2 6 2-3h2"/></svg>
}
function IcoGrave({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a8 8 0 0 1 8 8v12H4V10a8 8 0 0 1 8-8z"/><path d="M12 7v5"/><path d="M10 9h4"/></svg>
}
function IcoField({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
}

interface SlotProps {
  label: string
  icon: React.ReactNode
  accent?: boolean
  dim?: boolean
}

function Slot({ label, icon, accent, dim }: SlotProps) {
  return (
    <div
      className="rounded-lg flex flex-col items-center justify-center gap-1 p-2 text-center"
      style={{
        border: `1px dashed rgba(240,180,41,${dim ? '0.12' : accent ? '0.4' : '0.22'})`,
        background: accent ? 'rgba(240,180,41,0.05)' : dim ? 'rgba(255,255,255,0.01)' : 'rgba(240,180,41,0.02)',
        minHeight: 48,
        color: dim ? 'rgba(255,255,255,0.25)' : accent ? 'var(--gold)' : 'rgba(255,255,255,0.55)',
      }}
    >
      {icon}
      <span style={{ fontFamily: 'var(--rvn-font-display)', fontSize: 8, letterSpacing: '0.04em', textAlign: 'center', lineHeight: 1.2 }}>
        {label}
      </span>
    </div>
  )
}

function SideZones({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-1 shrink-0">
      <p className="text-center" style={{ fontSize: 7, color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.05em' }}>{label}</p>
      <Slot label="Kaladė"     icon={<IcoDeck size={13} />}     dim />
      <Slot label="ŽMK"        icon={<IcoZmk  size={13} />}     dim />
      <Slot label="Kapinynas"  icon={<IcoGrave size={13} />}    dim />
      <Slot label="ŽMK kap."  icon={<IcoGrave size={13} />}    dim />
    </div>
  )
}

function Separator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 my-1">
      <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(240,180,41,0.35))' }} />
      {label && (
        <span className="text-xs px-3 py-1 rounded-full" style={{
          background: 'rgba(240,180,41,0.08)', color: 'var(--gold)',
          border: '1px solid rgba(240,180,41,0.25)', fontFamily: 'var(--rvn-font-display)',
          letterSpacing: '0.1em', fontSize: 9, whiteSpace: 'nowrap',
        }}>
          {label}
        </span>
      )}
      <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, rgba(240,180,41,0.35))' }} />
    </div>
  )
}

import React from 'react'

function PlayerBoard({ label, flipped }: { label: string; flipped?: boolean }) {
  const reactions = (
    <div className="flex flex-col gap-1">
      <p style={{ fontSize: 7, color: 'rgba(240,180,41,0.4)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.06em', textAlign: 'center' }}>REAKCIJOS (maks. 3)</p>
      <div className="grid grid-cols-3 gap-1">
        <Slot label="Reakcija" icon={<IcoReaction size={13} />} dim />
        <Slot label="Reakcija" icon={<IcoReaction size={13} />} dim />
        <Slot label="Reakcija" icon={<IcoReaction size={13} />} dim />
      </div>
    </div>
  )
  const creatures = (
    <div className="flex flex-col gap-1">
      <p style={{ fontSize: 7, color: 'rgba(240,180,41,0.4)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.06em', textAlign: 'center' }}>PADARAI / ČEMPIONAS (maks. 5)</p>
      <div className="grid grid-cols-5 gap-1">
        <Slot label="Čempionas" icon={<IcoChampion size={13} />} accent />
        <Slot label="Padaras"   icon={<IcoCreature size={13} />} />
        <Slot label="Padaras"   icon={<IcoCreature size={13} />} />
        <Slot label="Padaras"   icon={<IcoCreature size={13} />} />
        <Slot label="Padaras"   icon={<IcoCreature size={13} />} />
      </div>
    </div>
  )
  const artifacts = (
    <div className="flex flex-col gap-1">
      <p style={{ fontSize: 7, color: 'rgba(240,180,41,0.4)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.06em', textAlign: 'center' }}>ARTEFAKTAI (maks. 2)</p>
      <div className="grid grid-cols-2 gap-1">
        <Slot label="Artefaktas" icon={<IcoArtifact size={13} />} dim />
        <Slot label="Artefaktas" icon={<IcoArtifact size={13} />} dim />
      </div>
    </div>
  )
  const zones = flipped ? [reactions, creatures, artifacts] : [artifacts, creatures, reactions]
  return (
    <div className="flex gap-2 items-start">
      <SideZones label={flipped ? 'PRIEŠININKAS' : 'TU'} />
      <div className="flex-1 flex flex-col gap-1.5">
        <p className="text-center text-xs font-semibold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-muted)', fontSize: 9, letterSpacing: '0.1em' }}>
          {label}
        </p>
        {zones}
      </div>
    </div>
  )
}

export function BattlefieldDiagram() {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(240,180,41,0.2)', background: 'var(--bg-surface)' }}>
      <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'rgba(240,180,41,0.06)', borderBottom: '1px solid rgba(240,180,41,0.15)' }}>
        <IcoField size={16} />
        <p className="text-xs font-bold ml-1" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>Kovos lauko schema</p>
      </div>
      <div className="p-3 flex flex-col gap-2">
        <PlayerBoard label="PRIEŠININKAS" flipped />
        <Separator label="⚔ KOVOS LAUKAS ⚔" />
        <div className="flex justify-center">
          <div className="w-40">
            <Slot label="Lauko korta - bendra abiem (maks. 1)" icon={<IcoField size={14} />} accent />
          </div>
        </div>
        <Separator label="" />
        <PlayerBoard label="TU" />
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {[
            { ico: <IcoChampion size={11} />, label: 'Čempionas (1 iš 5)' },
            { ico: <IcoCreature size={11} />, label: 'Padaras (maks. 5)' },
            { ico: <IcoArtifact size={11} />, label: 'Artefaktas (maks. 2)' },
            { ico: <IcoReaction size={11} />, label: 'Reakcija (maks. 3)' },
            { ico: <IcoField    size={11} />, label: 'Lauko korta (maks. 1)' },
            { ico: <IcoZmk     size={11} />, label: 'ŽMK kaladė' },
          ].map((l, i) => (
            <div key={i} className="flex items-center gap-1" style={{ color: 'var(--text-muted)', fontSize: 10 }}>
              <span style={{ color: 'rgba(240,180,41,0.5)' }}>{l.ico}</span><span>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
