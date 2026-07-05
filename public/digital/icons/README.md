# Ravenof Digital — savo ikonų įkėlimas

Įdėk PNG failus **į šį aplanką** (`public/digital/icons/`) tiksliais pavadinimais
(žemiau). Jie atsiras automatiškai. Jei failo nėra — rodoma įmontuota atsarginė
ikona (emoji/lucide), tad gali dėti palaipsniui. Kodo keisti **nereikia**.

## Formatas (visoms ikonoms)
- **PNG su permatomu fonu (RGBA).** (Nori SVG/WEBP? `src/components/digital/ui/RvnIcon.tsx` → `ICON_EXT`.)
- **Kvadratinė** drobė, ikona centre, ~8–12 % tarpas nuo kraštų.
- Daryk **3–4× didesnę** nei rodoma (retina ryškumui).
- Vientisas stilius, aukso/frakcijų paletė, permatomas fonas (ne juodas).

## Failų sąrašas (pavadinimas → kur → dydis)

### Valiutos (viršutinė juosta)
| Failas | Valiuta | Dydis |
|---|---|---|
| cur-silver.png  | Sidabras  | 96×96 |
| cur-rubies.png  | Rubinai   | 96×96 |
| cur-essence.png | Esencija  | 96×96 |

### 3 segmentai (po valiutomis)
| Failas | Segmentas | Dydis |
|---|---|---|
| seg-quests.png | Užduotys             | 96×96 |
| seg-season.png | Sezono kelias        | 96×96 |
| seg-login.png  | Prisijungimo dovanos | 96×96 |

### Kovos režimai („Žaisti" kortoje)
| Failas | Režimas | Dydis |
|---|---|---|
| fi-pve.png    | Treniruočių kova | 96×96 |
| fi-ranked.png | Reitinginė kova  | 96×96 |
| fi-pvp.png    | Draugiška kova   | 96×96 |

### Apatinė navigacija (bottom nav)
| Failas | Skiltis | Dydis |
|---|---|---|
| nav-home.png       | Pradžia    | 96×96 |
| nav-collection.png | Kolekcija  | 96×96 |
| nav-decks.png      | Kaladės    | 96×96 |
| nav-shop.png       | Parduotuvė | 96×96 |
| nav-more.png       | Daugiau    | 96×96 |

### Kita
| Failas | Kur | Dydis |
|---|---|---|
| pack.png     | Booster pakuotė (parduotuvė/albumas) | 96×96 |
| bell.png     | Pranešimų mygtukas | 72×72 |
| settings.png | Nustatymų mygtukas | 72×72 |
| avatar.png   | Numatytasis avataras (apvalus subjektas) | 128×128 |
| flame.png    | Prisijungimo serijos liepsna | 96×96 |

## Pastabos
- Pavadinimai **tiksliai** tokie (mažosios raidės). Po įkėlimo: commit/deploy + hard refresh.
- Trūkstamas failas = automatinis fallback (jokios klaidos), tad gali dėti po vieną.
- Bottom nav aktyvi skiltis paryškinama auksu automatiškai — daryk **neutralios/šviesios** spalvos ikonas.
