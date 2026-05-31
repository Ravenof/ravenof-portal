'use client'

import Image from 'next/image'
import React from 'react'

interface SlotProps {
  label: string
  img: string
  fallback?: string
  accent?: boolean
  dim?: boolean
}

function Slot({ label, img, fallback = '-', accent, dim }: SlotProps) {
  return (
    <div className="rounded-lg flex flex-col items-center justify-center gap-1 p-1.5 text-center"
      style={{
        border: `1px dashed rgba(240,180,41,${dim ? '0.12' : accent ? '0.4' : '0.22'})`,
        background: accent ? 'rgba(240,180,41,0.05)' : dim ? 'rgba(255,255,255,0.01)' : 'rgba(240,180,41,0.02)',
        minHeight: 48,
      }}>
      <div className="relative w-7 h-7 shrink-0">
        <Image src={img} alt={label} fill className="object-contain"
          style={{ opacity: dim ? 0.35 : accent ? 1 : 0.65 }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-xs img-fallback" style={{ display: 'none', color: 'var(--text-muted)' }}>{fallback}</span>
      </div>
      <span style={{
        color: dim ? 'rgba(255,255,255,0.2)' : accent ? 'var(--gold)' : 'rgba(255,255,255,0.5)',
        fontFamily: 'var(--rvn-font-display)', fontSize: 8, letterSpacing: '0.04em', textAlign: 'center', lineHeight: 1.2,
      }}>
        {label}
      </span>
    </div>
  )
}

function SideZones({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-1 shrink-0">
      <p className="text-center" style={{ fontSize: 7, color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.05em' }}>{label}</p>
      <Slot label="Kaladė"     img="/rules/zones/deck.png"      dim />
      <Slot label="ŽMK"        img="/rules/zones/zmk.png"       dim />
      <Slot label="Kapinynas"  img="/rules/zones/graveyard.png" dim />
      <Slot label="ŽMK kap."  img="/rules/zones/graveyard.png" dim />
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

function PlayerBoard({ label, flipped }: { label: string; flipped?: boolean }) {
  const reactions = (
    <div className="flex flex-col gap-1">
      <p style={{ fontSize: 7, color: 'rgba(240,180,41,0.4)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.06em', textAlign: 'center' }}>REAKCIJOS (maks. 3)</p>
      <div className="grid grid-cols-3 gap-1">
        {[0,1,2].map(i => <Slot key={i} label="Reakcija" img="/rules/zones/reaction.png" dim />)}
      </div>
    </div>
  )
  const creatures = (
    <div className="flex flex-col gap-1">
      <p style={{ fontSize: 7, color: 'rgba(240,180,41,0.4)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.06em', textAlign: 'center' }}>PADARAI / ČEMPIONAS (maks. 5)</p>
      <div className="grid grid-cols-5 gap-1">
        <Slot label="Čempionas" img="/rules/zones/champion.png" accent />
        {[0,1,2,3].map(i => <Slot key={i} label="Padaras" img="/rules/zones/creature.png" />)}
      </div>
    </div>
  )
  const artifacts = (
    <div className="flex flex-col gap-1">
      <p style={{ fontSize: 7, color: 'rgba(240,180,41,0.4)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.06em', textAlign: 'center' }}>ARTEFAKTAI (maks. 2)</p>
      <div className="grid grid-cols-2 gap-1">
        {[0,1].map(i => <Slot key={i} label="Artefaktas" img="/rules/zones/artifact.png" dim />)}
      </div>
    </div>
  )
  const zones = flipped ? [reactions, creatures, artifacts] : [artifacts, creatures, reactions]
  return (
    <div className="flex gap-2 items-start">
      <SideZones label={flipped ? 'PRIEŠININKAS' : 'TU'} />
      <div className="flex-1 flex flex-col gap-1.5">
        <p className="text-center text-xs font-semibold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-muted)', fontSize: 9, letterSpacing: '0.1em' }}>{label}</p>
        {zones}
      </div>
    </div>
  )
}

export function BattlefieldDiagram() {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(240,180,41,0.2)', background: 'var(--bg-surface)' }}>
      <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'rgba(240,180,41,0.06)', borderBottom: '1px solid rgba(240,180,41,0.15)' }}>
        <p className="text-xs font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>Kovos lauko schema</p>
      </div>
      <div className="p-3 flex flex-col gap-2">
        <PlayerBoard label="PRIEŠININKAS" flipped />
        <Separator label="⚔ KOVOS LAUKAS ⚔" />
        <div className="flex justify-center">
          <div className="w-40">
            <Slot label="Lauko korta - bendra (maks. 1)" img="/rules/zones/field.png" accent />
          </div>
        </div>
        <Separator label="" />
        <PlayerBoard label="TU" />
      </div>
    </div>
  )
}
