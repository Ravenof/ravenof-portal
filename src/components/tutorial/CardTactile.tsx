'use client'

// ── Kortų tactile sluoksnis (game-feel fazė 2) ───────────────────────────────
// Tier 0 pojūtis: paspaudimo kompresija, negalimo veiksmo pulsas, „atsisėdimas"
// į slotą, grįžimas į ranką. Viskas — CSS transform/opacity + imperatyvios
// klasės (jokio canvas, jokio layout thrash).
//
// Trukmės ateina TIK iš `timing.ts` (CARD_TACTILE) — jokių magic numbers čia.
// `prefers-reduced-motion`: animacijos nutildomos (žr. CSS media query).

import React from 'react'
import { CARD_TACTILE as T } from '@/lib/game/timing'
import { dragFollowAt, withinSnapRect, prefersReducedMotion } from '@/lib/game/tactile'

const CSS = `
/* SVARBU: naudojam NEPRIKLAUSOMAS \`scale\` / \`translate\` savybes, o ne \`transform\`.
   Rankos kortos ir padarų plytelės yra framer-motion valdomos — CSS animacija ant
   \`transform\` perrašytų jų inline transformą (kortos „šoktelėtų"). Nepriklausomos
   savybės su ja komponuojasi, tad pojūtis sluoksniuojasi be konflikto. */
@keyframes rvnTacPress {
  0%   { scale: 1; }
  55%  { scale: ${T.pressScale}; }
  100% { scale: 1; }
}
@keyframes rvnTacInvalid {
  0%   { filter: none; }
  40%  { filter: drop-shadow(0 0 10px rgba(239,68,68,0.95)) saturate(1.4); }
  100% { filter: none; }
}
@keyframes rvnTacSnap {
  0%   { scale: 1.06; }
  60%  { scale: 0.985; }
  100% { scale: 1; }
}
@keyframes rvnTacReturn {
  0%   { translate: 0 -10px; scale: 1.04; opacity: 0.85; }
  100% { translate: 0 0; scale: 1; opacity: 1; }
}
@keyframes rvnTacSlotPulse {
  0%, 100% { box-shadow: 0 0 0 1px rgba(240,180,41,0.35), inset 0 0 18px rgba(240,180,41,0.10); }
  50%      { box-shadow: 0 0 0 2px rgba(240,180,41,0.75), inset 0 0 26px rgba(240,180,41,0.22); }
}
.rvn-tac-press  { animation: rvnTacPress ${T.pressMs * 2}ms ease-out; }
.rvn-tac-invalid{ animation: rvnTacInvalid ${T.invalidPulseMs * 2}ms ease-out; }
.rvn-tac-snap   { animation: rvnTacSnap ${T.snapMs}ms cubic-bezier(.2,.9,.3,1.25); }
.rvn-tac-return { animation: rvnTacReturn ${T.returnMs}ms cubic-bezier(.25,1.4,.4,1); }
/* Aktyvi (galima) numetimo zona, kol tempiama korta. */
.rvn-tac-slot-live { animation: rvnTacSlotPulse 900ms ease-in-out infinite; border-radius: 10px; }
/* Žymeklis virš snap zonos — slotas „traukia". */
.rvn-tac-slot-hot {
  box-shadow: 0 0 0 2px rgba(240,180,41,0.95), inset 0 0 30px rgba(240,180,41,0.28) !important;
  animation: none !important;
  scale: 1.04;
  transition: scale ${T.snapMs}ms cubic-bezier(.2,.9,.3,1.25);
}
/* ── Kovos plokštė: vieningas rėmas visiems kovos dialogams ir pranešimams ───
   Naudojam TIKRUS asset'us, o ne CSS ornamentą: /ravenof-ui/combat/panels/
   plate-iron*.png yra apkarpytas UI paketo panel-iron.png (nuimtos permatomos
   paraštės, kad 9-slice pjūvis eitų per patį rėmą). Kampų smaigalys telpa į
   130 px originalo, sumažinto 0.5x -> 65 px pjūvis iš visų pusių, plius raktažodis
   fill, kad centrinė tamsiai mėlyna plokštuma nupieštų dialogo foną.
   Tas pats rėmas trimis atspalviais: geležis (default), kraujas (.is-danger),
   ametistas (.is-arcane) — atskiri PNG, kad metalo faktūra išliktų. */
.combat-plate {
  --plate-glow: rgba(240, 180, 41, 0.30);
  background: transparent;
  border: 22px solid transparent;
  border-image: url('/ravenof-ui/combat/panels/plate-iron.png') 65 fill / 22px stretch;
  border-radius: 0;
  box-shadow:
    0 0 26px -6px var(--plate-glow),
    0 22px 52px rgba(0, 0, 0, 0.8);
}
/* Poziciją dedam per :where() (specifiskumas 0), kad Tailwind fixed/absolute
   ant to paties elemento NEBUTU perrasytas: injektuotas <style> yra PO Tailwind
   stiliais, tad lygaus specifiskumo taisykle laimetu ir klaidos pranesimas
   (fixed top-14) taptu relative - dingtu is ekrano virsaus. */
:where(.combat-plate) { position: relative; }

/* Akcentų variantai — kitas metalas, ne tik kita linija. */
.combat-plate.is-danger {
  --plate-glow: rgba(239, 68, 68, 0.45);
  border-image-source: url('/ravenof-ui/combat/panels/plate-iron-danger.png');
}
.combat-plate.is-arcane {
  --plate-glow: rgba(167, 139, 250, 0.42);
  border-image-source: url('/ravenof-ui/combat/panels/plate-iron-arcane.png');
}

/* Klaidos / įspėjimo juostelė (toast). Tas pats rėmas, plonesnis ir raudonas. */
.combat-toast {
  --plate-glow: rgba(239, 68, 68, 0.45);
  border-width: 15px;
  border-image-source: url('/ravenof-ui/combat/panels/plate-iron-danger.png');
  border-image-width: 15px;
}

/* Telefone 22 px rėmas iš 92vw dialogo atimtų per daug turinio ploto. */
@media (max-width: 480px) {
  .combat-plate { border-width: 16px; border-image-width: 16px; }
  .combat-toast { border-width: 12px; border-image-width: 12px; }
}

@media (prefers-reduced-motion: reduce) {
  .rvn-tac-press, .rvn-tac-invalid, .rvn-tac-snap, .rvn-tac-return { animation: none !important; }
  .rvn-tac-slot-live { animation: none !important; box-shadow: 0 0 0 1px rgba(240,180,41,0.55) !important; }
  .rvn-tac-slot-hot { scale: 1 !important; }
}
`

/**
 * Vienkartinis kovos stilių įpurškimas (renderinti kovos ekrane vieną kartą).
 * Čia gyvena ir `.combat-plate` / `.combat-toast` — kovos dialogų ir pranešimų
 * rėmas. SVARBU: jie NEGALI gyventi `ravenof-ui.css`, nes tas failas kraunamas
 * tik po `/digital`, o kovos ekranas atidaromas ir iš /rules, /my-decks bei
 * /community-decks — ten modalai liktų visai be rėmo.
 */
export function TactileStyles() {
  return <style>{CSS}</style>
}

const reduced = prefersReducedMotion

/** Bendras vienkartinės klasės pridėjimas su automatiniu nuėmimu. */
function once(el: Element | null | undefined, cls: string, ms: number): void {
  if (!el || reduced()) return
  el.classList.remove(cls)
  void (el as HTMLElement).offsetWidth   // reflow — kad animacija persileistų
  el.classList.add(cls)
  window.setTimeout(() => el.classList.remove(cls), ms + 40)
}

/** Paspaudimo kompresija (pointer-down ant kortos). */
export function pressPulse(el: Element | null | undefined): void {
  once(el, 'rvn-tac-press', T.pressMs * 2)
}

/** Negalimas veiksmas: raudonas pulsas (be layout pokyčio). */
export function invalidPulse(el: Element | null | undefined): void {
  once(el, 'rvn-tac-invalid', T.invalidPulseMs * 2)
}

/** Korta „atsisėdo" į slotą (sėkmingas drop). */
export function snapSettle(el: Element | null | undefined): void {
  once(el, 'rvn-tac-snap', T.snapMs)
}

/** Korta grįžo į ranką (nesėkmingas drop). */
export function returnSpring(el: Element | null | undefined): void {
  once(el, 'rvn-tac-return', T.returnMs)
}

/**
 * Magnetinis snap: ar žymeklis pakankamai arti elemento, kad slotas „trauktų".
 * Naudojama tik VIZUALIAI — kas yra teisėtas taikinys, sprendžia variklis.
 */
export function withinSnap(el: Element | null | undefined, x: number, y: number): boolean {
  if (!el) return false
  return withinSnapRect(el.getBoundingClientRect(), x, y)
}

/** Tempimo inercija (žr. `lib/game/tactile.ts`). */
export function dragFollow(cur: { x: number; y: number }, target: { x: number; y: number }): { x: number; y: number } {
  return dragFollowAt(cur, target, reduced())
}
