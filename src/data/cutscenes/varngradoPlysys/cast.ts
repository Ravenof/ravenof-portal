// ════════════════════════════════════════════════════════════════════════════
// Kampanija „Varngrado plyšys" — bendras veikėjų CAST'as ir kadro helper'is.
// Asset'ai kuriami KAMPANIJAI, ne po vieną misijai (žr. MASTER PLAN):
// tas pats fonas naudojamas kitu tint'u/crop'u, pozos pernaudojamos visur.
// Placeholder SVG: public/campaign/raudonasis-signalas/ (M1) ir
// public/campaign/varngrado-plysys/ (bendri M2–M10).
// ════════════════════════════════════════════════════════════════════════════

import type { MCCharacterDef, MCShot } from '@/lib/campaign/motionComic'

export const A1 = '/campaign/raudonasis-signalas'   // M1 asset'ai (pernaudojami)
export const A = '/campaign/varngrado-plysys'       // bendri kampanijos asset'ai

/** Visos kampanijos veikėjai — kiekviena scena ima šį sąrašą (nenaudojami netrukdo). */
export const CAST: MCCharacterDef[] = [
  {
    id: 'prazaras', name: { lt: 'Maršalas Prazaras', en: 'Marshal Prazaras' }, accentColor: 'rgb(240,180,41)',
    poses: { neutral: `${A}/prazaras-neutral.svg`, isako: `${A}/prazaras-isako.svg`, kalavijas: `${A}/prazaras-kalavijas.svg` },
  },
  {
    id: 'kernius', name: { lt: 'Kernius', en: 'Kernius' }, accentColor: 'rgb(200,150,60)',
    poses: {
      neutral: `${A1}/kernius-neutral.svg`, battle: `${A1}/kernius-battle.svg`, ragas: `${A1}/kernius-ragas.svg`,
      begantis: `${A}/kernius-begantis.svg`, akis: `${A}/kernius-akis.svg`, knyga: `${A}/kernius-knyga.svg`,
    },
  },
  {
    id: 'dargis', name: { lt: 'Dargis', en: 'Dargis' }, accentColor: 'rgb(168,160,160)',
    poses: { neutral: `${A1}/dargis-speaking.svg`, profile: `${A1}/dargis-profile.svg`, kalavijas: `${A1}/dargis-kalavijas.svg`, nugara: `${A1}/dargis-nugara.svg` },
  },
  {
    id: 'tomas', name: { lt: 'Tomas', en: 'Tomas' }, accentColor: 'rgb(120,150,190)',
    poses: { neutral: `${A1}/tomas-neutral.svg`, lankas: `${A1}/tomas-lankas.svg` },
  },
  {
    id: 'kapitonas', name: { lt: 'Ordino kapitonas', en: 'Captain of the Order' }, accentColor: 'rgb(90,140,220)',
    poses: { neutral: `${A}/kapitonas-neutral.svg`, kovinis: `${A}/kapitonas-kovinis.svg` },
  },
  {
    id: 'inkvizitorius', name: { lt: 'Vyresnysis inkvizitorius', en: 'Senior Inquisitor' }, accentColor: 'rgb(220,215,200)',
    poses: { neutral: `${A}/inkvizitorius-neutral.svg`, antspaudas: `${A}/inkvizitorius-antspaudas.svg` },
  },
  {
    id: 'pasiuntinys', name: { lt: 'Inkvizicijos pasiuntinys', en: 'Inquisition envoy' }, accentColor: 'rgb(200,196,186)',
    poses: { neutral: `${A}/pasiuntinys.svg` },
  },
  {
    id: 'vartu-kapitonas', name: { lt: 'Vartų kapitonas', en: 'Gate captain' }, accentColor: 'rgb(150,140,120)',
    poses: { neutral: `${A}/vartu-kapitonas.svg` },
  },
  {
    id: 'gydytoja', name: { lt: 'Gydytoja', en: 'Healer' }, accentColor: 'rgb(190,170,150)',
    poses: { neutral: `${A}/gydytoja.svg` },
  },
  {
    id: 'intendantas', name: { lt: 'Intendantas', en: 'Quartermaster' }, accentColor: 'rgb(160,150,130)',
    poses: { neutral: `${A}/intendantas.svg` },
  },
  {
    id: 'archyvare', name: { lt: 'Archyvarė', en: 'Archivist' }, accentColor: 'rgb(190,175,200)',
    poses: { neutral: `${A}/archyvare.svg` },
  },
  {
    id: 'sargybinis', name: { lt: 'Sargybinis', en: 'Watchman' }, accentColor: 'rgb(110,120,140)',
    poses: { neutral: `${A1}/sargybinis.svg` },
  },
  {
    id: 'belzatoras', name: { lt: 'Belzatoras', en: 'Belzataras' }, accentColor: 'rgb(200,30,30)',
    poses: { neutral: `${A}/belzatoras.svg`, demonas: `${A1}/demonas.svg` },
  },
  { // pasikartojantis civilio motyvas (V3): mergaitė su mediniu varnu — M3, M4, M8, M10
    id: 'mergaite', name: { lt: 'Mergaitė', en: 'Girl' }, accentColor: 'rgb(220,190,150)',
    poses: { neutral: `${A}/mergaite.svg` },
  },
]

/** Kadrą kuriantis helper'is: numatytas fade perėjimas + lėtas push. */
export function S(id: string, background: string, over: Partial<MCShot> = {}): MCShot {
  return {
    id, background,
    transition: { type: 'fade', duration: 420 },
    camera: { startScale: 1, endScale: 1.05, duration: 6 },
    voiceUrl: null, // PLACEHOLDER: VO įkeliamas per admin
    ...over,
  }
}

/** Tos pačios kompozicijos tęsinys — kietas cut, kamera tęsia. */
export function C(id: string, background: string, over: Partial<MCShot> = {}): MCShot {
  return S(id, background, { transition: { type: 'cut' }, camera: { startScale: 1.04, endScale: 1.06, duration: 4 }, ...over })
}
