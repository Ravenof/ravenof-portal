# Fono muzika (background music)

Įkelk šiuos failus į šį katalogą (`public/sounds/music/`). Kodo keisti nereikia —
`src/lib/game/musicManager.ts` juos pasiima automatiškai.

## Reikalingi failai
- `menu-theme.mp3` — viena main menu (`/digital`) tema, looping.
- `battle-1.mp3`
- `battle-2.mp3`
- `battle-3.mp3`
- `battle-4.mp3`
- `battle-5.mp3`
  → kovos metu grojami atsitiktine tvarka, vienas po kito (be pasikartojimo iš eilės).

## Rekomendacijos (kad nevalgytų resurso / neliūdintų mobilių)
- Formatas: **MP3** (universaliausia) arba OGG/Opus.
- Bitrate: **128–160 kbps** stereo pakanka fono muzikai.
- Trukmė: 1–3 min vienam kovos trekui; menu tema gali būti trumpesnė (looping).
- Pasidaryk „švarius" loop taškus menu temai, kad kartojimas neturėtų spragtelėjimo.
- Naudojama HTMLAudio streaming, tad failo dydis ≠ RAM — bet didesni failai = ilgesnis pirmas užkrovimas. Laikyk kiekvieną <4–5 MB.

Garsumas valdomas konstantoje `MUSIC_VOLUME` (musicManager.ts, dabar 0.32) ir paiso
globalaus garso jungiklio (header'io garso mygtukas).
