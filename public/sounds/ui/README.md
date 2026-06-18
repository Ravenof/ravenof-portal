# UI garso efektai (mp3)

Įkelk mp3 failus čia (`public/sounds/ui/`). Kiekvienas garsas pirma ieško mp3;
jei failo nėra — automatiškai grojamas sintezuotas fallback (kodo keisti nereikia).
Failai su keliais variantais (`-1`, `-2`, `-3`) grojami **atsitiktinai** — gyviau,
mažiau kartojasi. Gali įdėti ir tik vieną variantą (pvz. tik `card-place-1.mp3`).

## Failų vardai
| Efektas | Failai (bet kuris/visi) |
|---|---|
| Užvedimas ant kortos (hover) | `hover-1.mp3`, `hover-2.mp3` |
| Kortos paėmimas | `card-pick-1.mp3`, `card-pick-2.mp3`, `card-pick-3.mp3` |
| Kortos padėjimas | `card-place-1.mp3`, `card-place-2.mp3`, `card-place-3.mp3` |
| Kortos apvertimas | `card-flip-1.mp3`, `card-flip-2.mp3` |
| UI paspaudimas (mygtukai) | `ui-click-1.mp3`, `ui-click-2.mp3` |
| Sėkmė | `success.mp3` |
| Klaida | `error.mp3` |
| Žemėlapio zoom | `map-zoom.mp3` |
| Panelės atidarymas | `panel-open.mp3` |
| Lokacijos atradimas | `discovery.mp3` |
| Kaladės maišymas | `shuffle-1.mp3`, `shuffle-2.mp3` |
| Kortos traukimas | `card-draw-1.mp3`, `card-draw-2.mp3`, `card-draw-3.mp3` |

## Rekomendacijos
- Trumpi (0.1–0.6 s), mono, ~96–128 kbps MP3. Vienas failas dažniausiai <50 KB.
- UI paspaudimas/hover skamba labai dažnai — laikyk juos tylius ir trumpus.
- Garsumas nustatytas kode (ui-sound.ts) ir paiso globalaus garso jungiklio.
