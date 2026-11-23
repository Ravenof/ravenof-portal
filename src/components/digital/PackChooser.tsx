'use client'

// ══════════════════════════════════════════════════════════════════════════════
// Pakų pasirinkimas + atplėšimo srautas (bendras Kolekcijai ir Parduotuvei).
// • PackChooser — modalas su pakų paveikslėliais (plytelės: art + ×kiekis + vardas).
// • PackOpenFlow — pats užsikrauna pakus/inventorių: 1 pakas → iškart PackOpen,
//   keli → PackChooser → PackOpen. Portal'inamas į body (veikia ir virš Parduotuvės).
// ══════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { playUiClick } from '@/lib/ui-sound'
import { useT, useContent } from '@/lib/i18n/react'
import { getActivePacks, getPackInventory, type Pack } from '@/lib/economy'
import { useDesktopUi } from './ui/useDesktopUi'
import { DT } from './ui/deskTokens'
import { DeskDialog } from './ui/DeskKit'
import { PackOpen } from './PackOpen'

function PackTile({ pk, name, count, onPick, desk }: { pk: Pack; name: string; count: number; onPick: () => void; desk: boolean }) {
  const [bad, setBad] = useState(false)
  const artH = desk ? 236 : 'min(44vh, 188px)'
  return (
    <button type="button" onClick={onPick} aria-label={`${name} ×${count}`}
      className="ravenof-press rvn-pack-tile relative flex flex-col items-center w-full"
      style={{ gap: desk ? 10 : 6, padding: desk ? '14px 10px 12px' : '8px 6px 8px', cursor: 'pointer',
        background: 'radial-gradient(90% 70% at 50% 40%, rgba(212,163,59,0.14) 0%, rgba(20,14,30,0.6) 70%)',
        border: '1px solid var(--ravenof-border-accent)' }}>
      <span className="relative flex items-center justify-center" style={{ height: artH, aspectRatio: '220 / 300' }}>
        {pk.image_url && !bad ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pk.image_url} alt="" draggable={false} onError={() => setBad(true)} className="rvn-pack-tile-art"
            style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 8px 18px rgba(0,0,0,0.6)) drop-shadow(0 0 14px rgba(212,163,59,0.22))' }} />
        ) : (
          <span className="flex items-center justify-center text-center w-full h-full" style={{ padding: 10, border: '1px solid var(--ravenof-border-strong)', background: 'linear-gradient(180deg,#221a30,#0e0a16)', font: `700 ${desk ? 16 : 12}px var(--ravenof-font-display)`, color: 'var(--ravenof-gold-bright)' }}>{name}</span>
        )}
        <span className="absolute" style={{ top: -6, right: -10, minWidth: desk ? 38 : 30, padding: desk ? '3px 8px' : '2px 6px', textAlign: 'center',
          font: `800 ${desk ? 13 : 11}px var(--ravenof-font-display)`, color: 'var(--ravenof-on-gold)', background: 'var(--ravenof-grad-gold)',
          border: '1px solid rgba(0,0,0,0.5)', boxShadow: '0 2px 8px rgba(0,0,0,0.55)' }}>×{count}</span>
      </span>
      <span className="w-full text-center truncate" style={{ font: `700 ${desk ? DT.fs.h3 : 12}px var(--ravenof-font-display)`, color: 'var(--ravenof-gold-bright)', letterSpacing: '0.03em' }}>{name}</span>
    </button>
  )
}

export function PackChooser({ packs, inv, onPick, onClose }: { packs: Pack[]; inv: Record<string, number>; onPick: (pk: Pack) => void; onClose: () => void }) {
  const t = useT()
  const tc = useContent()
  const { desktop } = useDesktopUi()
  const n = Math.max(1, Math.min(packs.length, 4))
  const pick = (pk: Pack) => { playUiClick(); onPick(pk) }
  const grid = (
    <div className="grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, ${desktop ? 220 : 170}px))`, justifyContent: 'center', gap: desktop ? 16 : 10 }}>
      {packs.map((pk) => (
        <PackTile key={pk.id} pk={pk} name={tc('card_pack', pk.id, 'name', pk.name)} count={inv[pk.id] ?? 0} desk={desktop} onPick={() => pick(pk)} />
      ))}
    </div>
  )
  const style = <style>{`.rvn-pack-tile{transition:border-color .15s ease, box-shadow .15s ease}.rvn-pack-tile-art{transition:transform .18s ease}.rvn-pack-tile:hover,.rvn-pack-tile:focus-visible{border-color:var(--ravenof-gold-bright)!important;box-shadow:0 0 18px rgba(212,163,59,0.3)}.rvn-pack-tile:hover .rvn-pack-tile-art,.rvn-pack-tile:focus-visible .rvn-pack-tile-art{transform:translateY(-4px) scale(1.03)}`}</style>

  if (desktop) {
    return (
      <DeskDialog onClose={onClose} title={t('collection.whichPack')} width={packs.length > 2 ? DT.modal.md : DT.modal.sm} zIndex={160} closeLabel={t('common.close')}
        footer={<button onClick={() => { playUiClick(); onClose() }} className="rvn-d-btn rvn-d-btn-ghost">{t('common.cancel')}</button>}>
        {style}{grid}
      </DeskDialog>
    )
  }
  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-3" style={{ background: 'rgba(4,3,8,0.9)' }} onClick={onClose}>
      {style}
      <div className="ravenof-panel p-4 max-w-[94vw] max-h-[94vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <p className="text-center" style={{ font: '700 14px var(--ravenof-font-display)', color: 'var(--ravenof-gold-bright)', letterSpacing: '0.06em', marginBottom: 10 }}>{t('collection.whichPack')}</p>
        {grid}
        <button onClick={() => { playUiClick(); onClose() }} className="mt-3 w-full ravenof-btn ravenof-btn-secondary" style={{ minHeight: 34, fontSize: 10 }}>{t('common.cancel')}</button>
      </div>
    </div>
  )
}

/** Visas atplėšimo srautas iš bet kur (pvz. Parduotuvės „Atplėšti pakuotes"). */
export function PackOpenFlow({ onClose, onChanged }: { onClose: () => void; onChanged?: () => void }) {
  const [packs, setPacks] = useState<Pack[] | null>(null)
  const [inv, setInv] = useState<Record<string, number>>({})
  const [opening, setOpening] = useState<Pack | null>(null)
  const [mounted, setMounted] = useState(false)
  const load = useCallback(async () => {
    const [ps, iv] = await Promise.all([getActivePacks(), getPackInventory()])
    const owned = ps.filter((p) => (iv[p.id] ?? 0) > 0)
    setInv(iv); setPacks(owned)
    return owned
  }, [])
  useEffect(() => {
    setMounted(true)
    void load().then((owned) => { if (owned.length === 0) onClose(); else if (owned.length === 1) setOpening(owned[0]) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  if (!mounted || !packs) return null
  const body = opening ? (
    <PackOpen packId={opening.id} packName={opening.name} packImage={opening.image_url}
      onClose={() => {
        setOpening(null); onChanged?.()
        // Grįžtam į pasirinkimą, jei dar liko kelių rūšių pakų; kitaip – uždarom srautą
        void load().then((owned) => { if (owned.length <= 1) onClose() })
      }}
      onOpened={() => onChanged?.()} />
  ) : (
    <PackChooser packs={packs} inv={inv} onPick={setOpening} onClose={onClose} />
  )
  return createPortal(body, document.body)
}
