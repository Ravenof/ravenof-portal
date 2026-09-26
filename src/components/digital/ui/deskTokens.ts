// ── Ravenof Digital — DESKTOP semantiniai dydžiai (vienas šaltinis) ───────────
// Naudojami TIK kai useDesktopUi().desktop === true. Mobile dydžiai nekeičiami.
// Tie patys skaičiai yra CSS kintamieji html[data-rvn-desk="1"] (desktop-ui.css),
// todėl portalais į document.body renderinami langai juos irgi paveldi.
// Taisyklė: jokio zoom / transform: scale / k-daugiklio — tik šie dydžiai.
import type { CSSProperties } from 'react'

export const DT = {
  /** Šriftų skalė (px). */
  fs: {
    h1: 26,        // puslapio antraštė
    h2: 19,        // sekcijos antraštė
    h3: 16,        // kortelės / eilutės pavadinimas
    body: 15,      // pagrindinis tekstas
    help: 13.5,    // pagalbinis tekstas
    label: 12,     // mažos etiketės (uppercase kickeriai, žymos) – ne mažiau
    stat: 22,      // didelis skaičius (statistika)
  },
  /** Valdiklių aukščiai. */
  ctl: 42,         // įprastas mygtukas / input / select / tab
  ctlSm: 36,       // tankus (filtrų čipai) – vis dar spaudžiamas pele
  cta: 46,         // pagrindinis veiksmas
  icon: 20,
  /** Tarpų skalė 4/8/12/16/24/32. */
  sp: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  /** Karkasas. */
  railW: 112,      // kairysis nav rail (desktop)
  headerH: 72,
  contentMax: 1440,
  wideMax: 1760,   // katalogai / builderis
  pagePadX: 32,
  /** Kortelių pločio orientyrai (min/max) – stulpelių skaičius iš konteinerio pločio. */
  card: {
    collection: [168, 196] as const,
    builder: [140, 168] as const,
    product: [210, 260] as const,
    avatar: [150, 180] as const,
    deck: [180, 220] as const,
    achievement: [260, 340] as const,
  },
  /** Šoninės panelės. */
  side: { deck: 352, list: 300, filter: 260 },
  modal: { sm: 520, md: 760, lg: 1080 },
} as const

/** Mobile/desktop reikšmė vienoje vietoje: dz(desktop, 11, DT.fs.body). */
export function dz<T>(desktop: boolean, mobile: T, desk: T): T { return desktop ? desk : mobile }

/**
 * Grid stulpeliai iš REALAUS konteinerio pločio: stulpelių skaičius = kiek telpa `min`,
 * likutis paskirstomas (1fr), todėl kortelė niekada neauga daugiau nei ~min + (min+gap)/N.
 * `max` – papildomas saugiklis (kortelės max-width), kai stulpelių mažai (siauras konteineris).
 */
export function deskGrid([min, max]: readonly [number, number], gap: number = DT.sp.lg): CSSProperties {
  return { display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`, gap, alignContent: 'start', ['--max' as string]: `${max}px` } as CSSProperties
}
