# Ravenof Digital — savo ikonų įkėlimas

Įdėk savo ikonų failus **į šį aplanką** tiksliais pavadinimais (žemiau).
Jie atsiras automatiškai. Jei failo nėra — UI naudoja įmontuotą (lucide) ikoną,
tad gali dėti palaipsniui. Kodo keisti **nereikia**.

## Formatas
- **PNG su permatomu fonu (RGBA)** — numatytasis. (Galima ir SVG ar WEBP, žr. apačioje.)
- Kvadratinė drobė, ikona centre, ~8–12% tarpas nuo kraštų, apkarpyta.
- Permatomas fonas (ne juodas).
- Vienodas stilius/storis, aukso/frakcijų paletė.
- Patarimas: daryk 3–4× didesnį nei rodoma (retina ryškumui).

## Failų pavadinimai ir dydžiai (kvadratas)

| Failas | Kur naudojama | Rekomenduojamas dydis | Rodoma ~ |
|---|---|---|---|
| `mode-pve.png` | Hero režimas „Treniruotė" | 96×96 | 22px |
| `mode-ranked.png` | Hero režimas „Ranginė" | 96×96 | 22px |
| `mode-free.png` | Hero režimas „Draugiška" | 96×96 | 22px |
| `qa-decks.png` | Greita: Kaladės | 96×96 | 24px |
| `qa-collection.png` | Greita: Kolekcija | 96×96 | 24px |
| `qa-quests.png` | Greita: Užduotys | 96×96 | 24px |
| `qa-shop.png` | Greita: Parduotuvė | 96×96 | 24px |
| `emblem-season.png` | Sezono kelio emblema | 128×128 | 30px |
| `emblem-tutorial.png` | Mokymų emblema | 128×128 | 30px |
| `flame.png` | Prisijungimo serijos liepsna | 96×96 | 28px |
| `avatar.png` | Numatytasis žaidėjo avataras | 128×128 (apvalus subjektas centre) | 38px (apvalus) |
| `bell.png` | Pranešimų mygtukas | 72×72 | 18px |
| `settings.png` | Nustatymų mygtukas | 72×72 | 18px |
| `nav-home.png` | Apatinė juosta: Pradžia | 96×96 | 24px |
| `nav-collection.png` | Apatinė juosta: Kolekcija | 96×96 | 24px |
| `nav-decks.png` | Apatinė juosta: Kaladės | 96×96 | 24px |
| `nav-shop.png` | Apatinė juosta: Parduotuvė | 96×96 | 24px |
| `nav-more.png` | Apatinė juosta: Daugiau | 96×96 | 24px |

## Pastabos
- Pavadinimai turi būti **tiksliai** tokie (mažosios raidės). Dėk į `public/digital/icons/`.
- Po įkėlimo: commit/deploy + hard refresh (telefone išvalyk cache).
- Trūkstamas failas = automatinis fallback į įmontuotą ikoną (jokios klaidos).

## Nori SVG arba WEBP vietoj PNG?
Pakeisk vieną eilutę: `src/components/digital/ui/RvnIcon.tsx` →
`export const ICON_EXT = 'svg'`  (arba `'webp'`).
Tada visi failai turi būti to formato (pvz. `mode-ranked.svg`).
SVG rekomenduojamas (ryškus bet kokiame dydyje); jei SVG — dydis drobės nesvarbus,
bet vis tiek daryk kvadratinį `viewBox` su centruota ikona.
