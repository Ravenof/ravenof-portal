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
   Iki tol modalai buvo paprastas rounded-2xl su 1px linija — jie „neturėjo
   rėmo" ir iškrisdavo iš dark-fantasy chrome'o. Čia — CSS-only ornamentas
   (jokių naujų assetų): dviguba kraštinė, vidinis šešėlis ir keturi kampų
   kabliukai. Akcento spalva keičiama per --plate-accent. */
.combat-plate {
  --plate-accent: rgba(240, 180, 41, 0.55);
  position: relative;
  background: linear-gradient(145deg, #1e1729, #120d1c);
  border: 1px solid var(--plate-accent);
  border-radius: 14px;
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.9),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05),
    inset 0 2px 20px rgba(0, 0, 0, 0.75),
    0 18px 46px rgba(0, 0, 0, 0.75);
}
/* Keturi kampų kabliukai vienu pseudo-elementu (8 gradientai = 8 brūkšniai). */
.combat-plate::before {
  content: ''; position: absolute; inset: 5px; pointer-events: none; border-radius: 10px;
  background:
    linear-gradient(var(--plate-accent), var(--plate-accent)) top left,
    linear-gradient(var(--plate-accent), var(--plate-accent)) top left,
    linear-gradient(var(--plate-accent), var(--plate-accent)) top right,
    linear-gradient(var(--plate-accent), var(--plate-accent)) top right,
    linear-gradient(var(--plate-accent), var(--plate-accent)) bottom left,
    linear-gradient(var(--plate-accent), var(--plate-accent)) bottom left,
    linear-gradient(var(--plate-accent), var(--plate-accent)) bottom right,
    linear-gradient(var(--plate-accent), var(--plate-accent)) bottom right;
  background-repeat: no-repeat;
  background-size:
    14px 2px, 2px 14px,
    14px 2px, 2px 14px,
    14px 2px, 2px 14px,
    14px 2px, 2px 14px;
}
/* Viršutinis šviesos atspindys — plokštė atrodo metalinė, ne plokščia. */
.combat-plate::after {
  content: ''; position: absolute; inset: 1px 1px auto 1px; height: 38%;
  pointer-events: none; border-radius: 13px 13px 0 0;
  background: linear-gradient(180deg, rgba(255,255,255,0.055), transparent);
}
/* Akcentų variantai */
.combat-plate.is-danger { --plate-accent: rgba(239, 68, 68, 0.7); }
.combat-plate.is-arcane { --plate-accent: rgba(167, 139, 250, 0.6); }

/* Klaidos / įspėjimo juostelė (toast). Tas pats rėmas, raudonas akcentas. */
.combat-toast {
  --plate-accent: rgba(239, 68, 68, 0.7);
  background: linear-gradient(145deg, #2a1119, #170a10);
  border-radius: 12px;
}
.combat-toast::before { inset: 4px; border-radius: 8px; }
.combat-toast::after { border-radius: 11px 11px 0 0; }

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
