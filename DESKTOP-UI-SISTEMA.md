# Ravenof Digital — desktop UI sistema (commit735)

Meniu ekranai po `/digital` (ne kova). Mobile išdėstymas nekeistas — visi desktop pakeitimai
įjungiami tik per `useDesktopUi().desktop` arba CSS `html[data-rvn-desk="1"]`.

## Kaip įsijungia
- `src/components/digital/ui/useDesktopUi.ts` → `{ desktop, compact, hover, vw, vh }`.
  - `desktop` = plotis ≥ 1024 ir aukštis ≥ 600 (arba pelė + plotis ≥ 900). Išdėstymas pagal plotį, hover — atskirai.
  - `compact` = desktop, bet aukštis < 780 arba plotis < 1280.
  - **Hidratacijos klaida ištaisyta:** anksčiau `useState(() => calc())` klientui iškart grąžindavo desktop=true,
    React atributų po hidratacijos neperrašo → gyvai desktop režimas faktiškai niekada neįsijungdavo pirmo
    užkrovimo metu (likdavo ištemptas mobile). Dabar `useSyncExternalStore` su SSR snapshot'u.
- `layout.tsx` uždeda `<html data-rvn-desk="1">` (+ `data-rvn-desk-compact`) — todėl tokenai veikia ir portaluose.
- Senas `k` mastelio koeficientas (1.35–1.8) pašalintas.

## Tokenai
- TS: `src/components/digital/ui/deskTokens.ts` (`DT`, `dz()`, `deskGrid()`).
- CSS: `src/components/digital/ui/desktop-ui.css` — `--rvn-rail-w` (mobile calc / desktop 112px), `--rvn-header-h` 72,
  `--rvn-content-max` 1440, `--rvn-wide-max` 1760 (kolekcija, kaladės), `--rvn-page-px`, `--d-fs-*`, `--d-ctl` 42, `--d-cta` 46.
- Šriftai: h1 26 · h2 19 · h3 16 · body 15 · help 13.5 · label ≥ 12. Tarpai 4/8/12/16/24/32.
- Klasės: `.rvn-d-h1/.rvn-d-h2/.rvn-d-body/.rvn-d-help/.rvn-d-label`, `.rvn-clamp2`, `.rvn-d-grid` (`--min`),
  `.rvn-d-btn(-primary|-ghost|-danger)`, `.rvn-d-trackbtn`, `.rvn-dlg*`.
- Grid: `repeat(auto-fill, minmax(min, 1fr))` — stulpelių skaičius iš realaus konteinerio pločio, kortelė neauga be ribos.
  Orientyrai: kolekcija 168+, builderis 140+, parduotuvė 210+, avatarai 180+, kaladės 180+, pasiekimai 260+.

## Komponentai
- `DeskKit.tsx`: `DeskDialog` (header/body/footer, ×, Escape, fokuso gaudyklė ir grąžinimas, portalas), `useDialogFocus`,
  `DeskPageHeader`.
- Fiksuoti sluoksniai šalia rail naudoja `left: var(--rvn-rail-w)` (Parduotuvė, Nustatymai).
- „Pasuk telefoną" rodomas tik lietimo įrenginiams (pointer: coarse be jokios pelės) — siauras kompiuterio langas jo neberodo.

## Dev patikra (Windows)
- `$env:WATCHPACK_POLLING="true"; npm run dev` — kitaip Next nemato failų, įrašytų per Cowork VM mount'ą.
- `public/sw.js` `/_next/static/` aptarnauja cache-first → dev režime (be hash'ų) naršyklė gauna SENUS chunk'us.
  Prieš tikrinant: DevTools → Application → Service workers → Unregister ir išvalyti `ravenof-pwa-v4` cache.
- `public/__desk-harness.html` (NEKOMITINTI) — iframe peržiūra konkrečiu dydžiu: `/__desk-harness.html?p=/digital/collection&w=1366&h=768`.
