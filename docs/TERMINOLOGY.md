# Ravenof Digital — kanoninis terminų žodynas (LT / EN)

Vienintelis terminologijos šaltinis UI tekstams. Nauji tekstai — TIK per
`src/locales/{lt,en}/*.json`; jokių maišytų kalbų komponentuose.

| Sąvoka | LT (kanoninis) | EN (kanoninis) | Draudžiama LT UI |
|---|---|---|---|
| Dirbtinis intelektas (varžovas) | DI | AI | „AI", „botas" |
| Kaladė | kaladė | deck | „deck" |
| Burtai / kerai | burtai | spells | „spells" |
| Reitinguotas režimas | Reitingo kova / reitinguota | Ranked | „Ranked" LT tekste |
| Rangas (pozicija: 50→1) | rangas | rank | — |
| Reitingas (režimo pavadinimas) | reitingas | ranked (mode) | nevartoti vietoje „rangas" |
| „Rank does not change" | **Rangas nesikeičia** | Rank does not change | „Reitingas nesikeičia" |
| Etapas (milestone) | Etapas | Milestone | „Milestone" LT tekste |
| Reakcija (mechanika) | Reakcija / Reakcijos korta | Reaction | „Reaction" |
| Kovos šūksnis (mechanika) | Kovos šūksnis | Battlecry | „Battlecry", „šauksmas" |
| Sezonas | Sezonas (DB pavadinime jau yra žodis — nedubliuoti: ne „Sezonas Sezonas 1") | Season | — |
| Nereitinginė vieša kova | Nereitinginė kova | Casual match | „Draugiška kova" (dviprasmiška) |
| Privati kova (kambarys/kodas/draugas) | Privati kova | Private battle | — |

## Valiutos (paskyros — NE kovos auksas!)

| Valiuta | LT | EN | DB |
|---|---|---|---|
| Pagrindinė | sidabras | silver | `profiles.gold` (istorinis stulpelio pavadinimas!) |
| Premium | rubinai | rubies | `profiles.rubies` |
| Kūrimo | esencija | essence | `profiles.essence` |

* Visi KOVŲ atlygiai (DI, nereitinginės, reitingo) — **sidabras** (žr.
  `economy_config.match_rewards`). Niekada nerašyti „aukso" prie atlygių.
* KOVOS VIDUJE resursas („100 aukso per ėjimą") — atskira sąvoka, lieka „auksas".

## Rango atvaizdavimas

Vienintelis šaltinis — `src/lib/ranked/rank.ts`:
* `formatRank(step)` → „Sidabras L" (trumpas, visur vienodas)
* `rankDisplay(step).full` → „50 rangas · Atvykėlis · Sidabras" (pilnas)
* `toRoman(n)` — vienintelė romėniškų skaičių kopija.
Draudžiama komponentuose kurti savo rangų formatavimą ar kopijuoti `toRoman`.

## Kortų kiekio atvaizdavimas

Vienintelis šaltinis — `src/lib/deck-validation.ts`:
* `formatDeckCount(n)` → „39 kortos · leidžiama 30–40".
Draudžiama „39/30", „39/40" formos.

## Kainos skalė

DB `gold_cost` — šimtais (100–900). Kreivėms/vidurkiams naudoti TIK
`src/lib/cards/cost.ts` (`costCurve`, `displayCost`, `displayAvgCost`).
