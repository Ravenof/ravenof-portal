# SOUND-TODO.md — ko trūksta garsuose ir kur įkelti

**Data:** 2026-08-10 · būsena po commit577

## Kaip veikia sistema (kad nereikėtų liesti kodo)

Visi garsai yra **file-first**: kodas pirma ieško mp3, o jei jo nėra — groja sintezuotą
fallback'ą. Įkėlus failą sintezė nustoja groti **automatiškai**, kodo keisti nereikia.

- **Variantai:** kiekvienam garsui galima dėti `vardas.mp3` **arba** `vardas-1.mp3` … `vardas-6.mp3`.
  Grojamas atsitiktinis, su apsauga „nekartok to paties iš eilės" (iki 3 bandymų).
  Daugiau variantų = mažiau kartojimosi nuovargio.
- **Neveikiantis URL** įsimenamas (`dead` Set) ir daugiau nebandomas — tad blogas failas
  nekainuoja našumo, bet ir nebegros iki perkrovimo.
- **Garsumas** nustatomas kode (`playBattleSound(key, volume)`), failai turėtų būti
  normalizuoti į panašų lygį, kad kodinis balansas veiktų.

---

## 1. NEMOKAMAS LAIMĖJIMAS (0 min darbo)

`public/sounds/battle/impact (2).mp3` **jau yra repozitorijoje**, bet kodas jo
**niekada nekrauna** — kandidatų sąraše yra tik `impact.mp3` ir `impact-1..-6.mp3`,
o failo varde yra tarpas ir skliaustai.

```
pervadink:  public/sounds/battle/impact (2).mp3  →  public/sounds/battle/impact-1.mp3
```

`impact` yra **dažniausiai grojamas kovos garsas** (kiekvienas žalos įvykis), o dabar
turi tik 1 variantą. Šis pervadinimas iškart padvigubina variaciją.

---

## 2. PRIORITETAS A — girdima dažniausiai

| Failas | Katalogas | Kas groja dabar | Charakteris |
|---|---|---|---|
| `impact-2.mp3` … `impact-4.mp3` | `public/sounds/battle/` | `impact.mp3` (1 vnt) | Trumpas smūgio transientas. Reikia 3–4 variantų, nes skamba kiekvienam žalos taikiniui. Skirtingas „svoris": lengvas / vidutinis / sunkus |
| `summon.mp3` (+ `-1`, `-2`) | `public/sounds/battle/` | **sintezė** (`playCardPlace`) | Padaro iškvietimas. Groja kiekvieną kartą, kai korta atsiranda lentoje — dabar tai tiesiog „pokštelėjimas" |

> `impact` ir `summon` yra du dažniausi kovos garsai. Jei darysi tik dalį sąrašo — daryk šiuos.

---

## 3. PRIORITETAS B — nauji šio sprinto garsai (6 failai)

Šiuos deklaravo game-feel sprintas; visi šiuo metu groja sintezę.

### Reakcijų grandinė → `public/sounds/reaction/`

| Failas | Fazė | Trukmė | Charakteris |
|---|---|---|---|
| `launch.mp3` (+ `-1`, `-2`) | detect (350 ms) | ≤ 400 ms | Platus swoosh — grandinė paleidžiama. Kylantis, be smūgio |
| `impact.mp3` (+ `-1`, `-2`) | wrap (650 ms) | ≤ 250 ms | Metalinis transientas — grandinė pataiko. Aštrus, trumpas |
| `tighten.mp3` (+ `-1`) | wrap | ≤ 450 ms | Kylantis girgždesys — grandys įsitempia aplink kortą |
| `shatter.mp3` (+ `-1`, `-2`) | effect (700 ms) | ≤ 700 ms | Sudužimas + ilgesnis gesimas. **Čia muzika automatiškai nutildoma −3 dB 80 ms**, tad transientas turi vietos |

> Dėmesio: `reaction/impact.mp3` yra **kitas failas** nei `battle/impact.mp3`. Skirtingi katalogai, skirtingas charakteris (metalas vs kūniškas smūgis).

### ŽMK → `public/sounds/battle/`

| Failas | Kada | Trukmė | Charakteris |
|---|---|---|---|
| `zmk-crit.mp3` (+ `-1`) | ŽMK ×2 „Kritinis smūgis" | ≤ 900 ms | Žemas „slam" + kylantis blyksnis. **Prieš jį muzika nutildoma −12 dB** (anticipacijos tyla), tad garsas turi būti pilnas ir nešti visą momentą |
| `zmk-fizzle.mp3` | ŽMK ×0 „Visiška nesėkmė" | ≤ 600 ms | Užgesimas, ne smūgis. Tylus, blėstantis — kontrastas ×2 atžvilgiu |

---

## 4. PRIORITETAS C — UI garsai (22 failai, katalogas visiškai tuščias)

`public/sounds/ui/` turi **tik README.md**. Visas UI skamba sintezuotai — visame
portale, ne tik kovoje. Sintezė čia pakenčiama (todėl C prioritetas), bet tai
didžiausias vienetų skaičius.

| Efektas | Failai | Trukmė |
|---|---|---|
| Užvedimas ant kortos | `hover-1.mp3`, `hover-2.mp3` | ≤ 60 ms, labai tylus |
| Kortos paėmimas | `card-pick-1.mp3` … `-3.mp3` | ≤ 150 ms |
| Kortos padėjimas | `card-place-1.mp3` … `-3.mp3` | ≤ 200 ms, su žemu „bumbt" |
| Kortos apvertimas | `card-flip-1.mp3`, `-2.mp3` | ≤ 200 ms |
| UI paspaudimas | `ui-click-1.mp3`, `-2.mp3` | ≤ 60 ms |
| Sėkmė | `success.mp3` | ≤ 300 ms |
| Klaida | `error.mp3` | ≤ 250 ms |
| Žemėlapio zoom | `map-zoom.mp3` | ≤ 150 ms |
| Panelės atidarymas | `panel-open.mp3` | ≤ 200 ms |
| Atradimas | `discovery.mp3` | ≤ 500 ms |
| Kaladės maišymas | `shuffle-1.mp3`, `-2.mp3` | ≤ 500 ms |
| Kortos traukimas | `card-draw-1.mp3` … `-3.mp3` | ≤ 200 ms |

---

## 5. PRIORITETAS D — plonos vietos (po 1 variantą)

Šie turi po vieną failą; pridėjus `-2`, `-3` sumažėtų kartojimosi nuovargis.
Visi → `public/sounds/battle/`.

`death` · `freeze` · `curse` · `draw` · `field` · `champion-skill` · `zmk-flip`

Palyginimui, jau padaryta gerai: `attack` (5 variantai), `spell-cast` (5), `heal` (3).

---

## 6. Techninės rekomendacijos

- **Formatas:** mp3, 44.1 kHz, mono, ~96–128 kbps (UI ir trumpiems SFX to visiškai pakanka).
- **Be tylos pradžioje** — transientas turi sutapti su fazės pradžia, kitaip garsas „vėluos".
- **Peak ~−6 dBFS**, normalizuoti visus į panašų lygį.
- **Trumpai.** Kovos garsai groja vienas ant kito; viskas ilgesnio nei ~1 s virsta koše.
- Failus dėti tiesiai į nurodytus katalogus ir **įtraukti į git** — netracked failas veiks
  lokaliai, bet Vercel'yje jo nebus (taip buvo su `explosion.mp3`, ištaisyta commit577).

## 7. Ko NEREIKIA daryti

- **Kortų balsai** (`voiceLines`) tvarkomi atskirai per admin UI ir Supabase `card-audio`
  bucket'ą — ne per šį katalogą.
- **Muzika** pilna: `menu-theme.mp3` + `battle-1..4.mp3` yra vietoje.
- **Šakninio `public/sounds/` garsai** (`applause`, `coin-*`, `damage-*`, `heal-*`,
  `sword-clash`) priklauso fiziniam žaidimui / life-tracker'iui, ne kovai. Nekliudyti.

---

# 8. Ką dar reikia padaryti (ne garsai)

Prioriteto tvarka. Detalės — `GAME-FEEL-REPORT.md` §6–§8.

| # | Darbas | Kas | Laikas |
|---|---|---|---|
| 1 | **Smoke patikra + telemetrijos baseline.** `npm run dev` → po vieną kovą tutorial / PvE / kampanija / ranked / PvP. Užsirašyti `animationLockMsTotal`, `animationLockMsPerTurn`, `inputToFirstFeedbackMs` (matomi `rvn_report_match_stats` payload'e Network tab'e). `TutorialGame.tsx` yra visų 5 režimų ekranas, tad tai vienintelė reali regresijos patikra | tu | ~30 min |
| 2 | **Admin: 3 prakeiksmų kortos + Juodieji pirštai.** *Gazzaros žymė* ir *Belzatoro akis* → trigerį į `onCurseDrawn` (Belzatorui dar `revealOwnDeck` → `revealEnemyDeck`); *Pikti liežuviai* → pridėti `onCurseDrawn` mapping'ą; *Juodieji pirštai* → užpildyti `chooseOne` arba pašalinti `chooseEffect`. **Daryti PRIEŠ punktą 1**, kitaip šios kortos kovose vis dar nieko nedarys | tu (admin UI) | ~15 min |
| 3 | **Severity ir hit-stop tiuningas** pagal tai, ką pajusi žaisdamas. Abi ribos vienoje vietoje: `SEVERITY_THRESHOLDS` (`impactProfiles.ts`) ir `HIT_STOP` (`timing.ts`). Jei per švelnu — mažinti `heavyAbs` 6→4 ir `hitAbs` 3→2; jei trūkčioja — mažinti HIT hit-stop 35→20 ms | kita sesija | ~20 min |
| 4 | **Užbaigti fazę 8.** Trūksta 2 variklio įvykių: „sušaldytas neatsikerta" ir „taunt privertė rinktis kitą taikinį". Varikliukas šių momentų į žurnalą neįrašo, tad UI jų parodyti negali. Liečia PvP žurnalo atkūrimą → reikia testų | kita sesija | ~1–2 val. |
| 5 | **Atnaujinti `simulate-virtual-game.ts`** prakeiksmų scenarijų prie dviejų fazių modelio (įmaišymas ≠ aktyvacija). 3 kritusios patikros yra pasenęs testas, ne regresija — patikrinta eksperimentu | kita sesija | ~30 min |
| 6 | **Fazė 11 — frakcijų štrichai.** Dabar tam gera vieta: `deathStyles.ts` jau turi frakcijos fallback'ą. Po 1–2 štrichus frakcijai per `ImpactProfile`/death style, **ne** atskira animacijų sistema | backlog | — |
| 7 | **Fazė 12 — lauko kortų ambience** (ambient loop, color grading, aplinkos dalelės). Atskiras sprintas | backlog | — |

## 9. Ko NEREIKIA (kad nebūtų dvigubo darbo)

- **Naujų summon/VFX efektų.** Jų 22 ir to pakanka — sprinto tikslas buvo Tier 0–1, ne daugiau spektaklio.
- **Migracijų.** Visa nauja telemetrija eina esamu `rvn_report_match_stats(p_stats jsonb)` keliu.
- **`EffectMapping.impact` override.** Severity skaičiuojama automatiškai; admin laukas prireiktų tik kortoms, kurių dramaturgija sąmoningai nesutampa su žala.
