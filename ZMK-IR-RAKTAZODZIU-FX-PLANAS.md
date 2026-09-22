# Ravenof — ŽMK skrydis + Kovos šūksnio / Paskutinio noro / Trigerio scenos

**Data:** 2026-09-22 · **Būsena:** planas + HTML peržiūra, KODO KOVOJE DAR NĖRA
**Peržiūra:** `ravenof-fx-preview-zmk-keywords.html` (repo šaknyje; atidaryti iš ten, kad matytų `public/` paveikslėlius)
**Kontekstas:** `FX-ROLLBACK-IR-EFEKTU-SISTEMOS.md` (kodėl 705–707 atšaukti), `KOVOS-TEMPO-IR-AISKUMO-PLANAS.md` (taktų modelis)

---

## 0. Ko prašoma

1. **ŽMK (modifikatoriaus) korta traukiama iš ŽMK kaladės ir nuskrenda prie taikinio**, ten apsiverčia, rezultatas rodomas **2,5 s** (dabar miniatiūra tiesiog atsiranda prie taikinio ir kabo 2,0 s → +0,5 s). Žala ir HP krenta **tik po apsivertimo**.
2. **Kovos šūksnis, Paskutinis noras, Trigeris** gauna savo scenas — kokybė kaip reakcijų grandinės (`ReactionChainLayer`) ir prakeiksmų demono.
3. **Pirma peržiūra ir suderinimas, tik tada kodas kovoje ir release.**

## 1. Kodėl 705–707 nepavyko ir kas šįkart kitaip

| 705–707 | Dabar |
|---|---|
| Delsa klijuota ant `SETTLE` — pusė efektų pajudėjo, kita pusė (ŽMK, mirtys, statusai) liko senuose laikmačiuose → padrikumas | **Jokių naujų delsų animatoriuje.** Scenos eina per **tuos pačius vartus kaip reakcijos** (`reactionGates` → snapshot → `await play()` → būsena). Tai vienintelis mechanizmas, kuris kovoje jau įrodytas. |
| Raktažodžio plokštelė 2 s per visą ekraną | Juostelė **prie šaltinio kortos** (ne modalas, nieko nepritemdo), ~0,65 s paskelbimas + lieka iki efekto |
| ŽMK skrydis 1,5 s + rezultatas 1,5 s = 3 s laukimo | Skrydis **0,55 s** + flip 0,3 s → žala. **Vartai atsidaro ties smūgiu** (~1,3 s), o 2,5 s rezultato laikymas yra dekoratyvi uodega — kova NELAUKIA jos |
| Dekoratyvus sluoksnis be signalo | `play()` grąžina **Promise** = vienintelis autoritetinis signalas (kaip `ReactionChainLayer`) |
| Įjungta visiems iš karto | **Vėliava** `rvn-scene-fx` (Nustatymai → „Kovos scenos"; default įjungta tester kanale). Rollback = išjungti, ne revert'as |

## 2. Chronologija (kas ką ir kada mato)

Vienas žalos smūgis su Kovos šūksniu, tempo 1.0:

```
korta nusileidžia (420)                                     ← esamas cardLand
│
├─ B PASKELBIMAS 650  ženklas + juostelė PRIE ŠALTINIO   ┐
├─ C KELIAS       450  energija šaltinis → taikinys        │ KeywordFx scena (vartai)
├─ C' ANTSPAUDAS  350  ženklas ANT TAIKINIO, HP dar senas ┘
│
├─ D ŽMK kyla     200  nugarėlė pakyla nuo ŽMK kaladės     ┐
├─ D ŽMK skrydis  550  lankas kaladė → virš taikinio       │ ZmkFlight scena (vartai
├─ D ŽMK flip     300  apsivertimas, spalvos blyksnis      │  iki SMŪGIO)
├─ D smūgis      +250  ČIA skaičius, HP, purtymas, hpHold  ┘
│                       (rezultatas prie taikinio lieka dar 2500, gęsta 250 — be vartų)
└─ F pasekmės          mirtis → kapinynas, statusai (esami FX)
```

Iki žalos: **~2,4 s** (be kortos nusileidimo). Kompaktas (antras+ tos pačios kovos kartas, ×0,55, be juostelės): ~1,9 s. Reduced-motion: 420 ms blyksnis + ŽMK flip vietoje.

**ŽMK be raktažodžio** (paprasta ataka): ataka 380 → ŽMK 200+550+300+250 = **1,7 s iki žalos** (dabar ~1,0 s). Rutina „+0" gauna tą patį kelią — skrydis yra pats mechanikos parodymas, todėl jo netrumpinam; trumpinam tik pakartojimų juosteles.

**AoE:** N kortų kyla iš kaladės su 80 ms stagger'iu, kiekviena virš SAVO taikinio, vieni vartai visam paketui.

**×2 / ×0:** po flip'o įsijungia esamas `ZmkSpecial` (slam / fizzle) — vartai laukia ir jo; permaišymas (`ZmkReshuffleFlash`) po to kaip dabar.

**Pranašumas / nepalankumas (`zmkPair`):** iš kaladės kyla DVI kortos, abi apsiverčia, nepanaudota subyra (esamas `ZmkRoll` vizualas perkeliamas prie taikinio).

## 3. Vizualinė kalba (iš peržiūros)

| Raktažodis | Spalva | Šaltinis (B) | Kelias (C) | Antspaudas (C') |
|---|---|---|---|---|
| Kovos šūksnis | `#f0b429` auksinė | garso bangos žiedai iš kortos, kortos „įkvėpimas" 1.06 | kometa su auksine uodega | 6-spindulių sigilas „!" virš taikinio |
| Paskutinis noras | `#a78bfa` violetinė | vėlė (žvakės liepsna) kyla iš mirštančios kortos | vėlė plaukia lanku | vėlė nusileidžia + žiedas |
| Trigeris | `#38bdf8` žydra | runų ratas sukasi aplink kortą | laužytas runų žaibas | besisukanti runų plomba |

Juostelė: `KOVOS ŠŪKSNIS · Kortos vardas`, 22 px aukščio, prie šaltinio kortos viršaus, gęsta 600 ms po efekto. **Niekada** per visą ekraną, **niekada** nepritemdo lentos.

ŽMK: tikros kortos (`/rules/zmk/card-*-sm.webp`, nugarėlė `/card-backs/zmk.webp`), 52×72, virš taikinio; ženkliukas su reikšme po korta (`+1` žalia / `-1` raudona / `+0` smėlinė / `×2` oranžinė su „KRITINIS SMŪGIS" / `×0` pilka su „VISIŠKA NESĖKMĖ").

## 4. Architektūra

### 4.1 Variklis — vartai apibendrinami

`ReactionGate` → `PresentGate` (tas pats `g.reactionGates` masyvas, kad `startGateRun`/`gateCommit`/PvP kelias nesikeistų):

```ts
type PresentGate = {
  id: number; snapshotId: number; atLog: number; side: Side
  kind: 'reaction' | 'battlecry' | 'lastwish' | 'trigger' | 'zmk'
  // reaction (kaip dabar): reactionUid, reactionCardName, target, targets
  // battlecry/lastwish/trigger: sourceUid, sourceName, targets
  // zmk: draws: { target: TargetRef; value: ZmkValue; dmg: number; pair?: [ZmkValue,ZmkValue] }[]
}
```

Kur variklis rašo vartus (visur — log'as PRIEŠ snapshot'ą, kaip reakcijose):

| kind | vieta | kada |
|---|---|---|
| `battlecry` | `engine.ts` playCard (~3429, `t:'battlecry'`) ir `fireEntryMappings` (effect-summon šūksnis) | prieš `applyTargetedEffect/applyAutoEffect/applyMappings` |
| `lastwish` | `engine.ts` mirties kelias (~1289) + `onDeath` mapping'ai | prieš efektą; snapshot'e mirštanti korta DAR lentoje (scena ją naudoja kaip šaltinį) |
| `trigger` | `triggerSystem.ts:26` (ten, kur rašomas `fxSource`) — tik `onTurnStart/onTurnEnd/onAttack/...`, ne onSummon/onPlay | prieš `applyMappings` |
| `zmk` | `rollDamage()` (`engine.ts` ~730) | snapshot prieš pirmą traukimą; jei aktyvus AoE capture (`beginTargetCapture`) — vieni vartai su visais `draws` |

Snapshot'ų limitas `MAX_SNAPSHOTS` 12 → 24 (AoE + šūksnis + mirtys viename pakete). Snapshot'as = `cloneState` — pamatuoti su F0 overlay, kad 5 snapshot'ai pakete netrunka >10 ms telefone.

**Pakartojimų kompresija variklyje nesprendžiama** — UI skaičiuoja `seenKeywords` per kovą (modulyje, kaip `nextReactionIsCompact()`).

### 4.2 UI — vienas scenų sluoksnis

`KeywordFxLayer.tsx` (jau yra, neįjungtas) → pervadinti `SceneFxLayer.tsx`: vienas canvas z-128 (virš `BattleFxLayer`, po `ReactionChainLayer`), vienas rAF, be `shadowBlur`.

```ts
type SceneFxHandle = {
  playKeyword(o: { kind; from: Box; targets: TrackedBox[]; cardName; compact; reduced }): Promise<void>  // resolve = po antspaudo
  playZmk(o: { pile: Box; draws: { target: TrackedBox; value; dmg; pair? }[]; reduced }): Promise<void>   // resolve = SMŪGIO momentu
  cancel(): void; busy(): boolean
}
```

`startGateRun` dispatch'ina pagal `gate.kind`; `zmk` vartai smūgio momentu: resolve → `finishGateRun` commit'ina būseną (HP krenta iš tikros būsenos, `hpHold` nebereikia) → sluoksnis dar 2,5 s rodo rezultatą **be vartų**. Pozicijos: `boxFor(tr)` su `track` getter'iu (kaip reakcijose — ką tik iškviesta korta dar juda); ŽMK kaladė per `[data-pile="zmk-you"|"zmk-ai"]` (selektorius reikia pridėti `renderPile` — 708 jį išėmė, BattleLayout/DesktopBattleLayout/2v2 visuose 4 renderPile kvietimuose).

Kas išjungiama animatoriuje, kai vėliava įjungta: `zmkFlash` miniatiūra (2000 ms), `pendingZmk` ir `fxSeq += 800` ŽMK šaka, `SETTLE`-delsa žalai po showcase (lieka prakeiksmams). `projVictims`/`viaReaction` dedup logika lieka — projektilas po antspaudo NEBEšaunamas (antspaudas jau parodė taikymą; kaip `viaReaction`), rodomas tik rezultatas.

### 4.3 Konstantos (`src/lib/game/timing.ts`)

```ts
export const ZMK_DRAW = { liftMs: 200, flightMs: 550, flipMs: 300, impactDelayMs: 250, holdMs: 2500, fadeMs: 250, fanStaggerMs: 80 } as const
export const KEYWORD_FX = { announceMs: 650, travelMs: 450, sealMs: 350, ribbonLingerMs: 600 } as const
export const KEYWORD_FX_COMPACT_SCALE = 0.55
export const KEYWORD_FX_REDUCED_MS = 420
export const BATTLE_TEMPO_DEFAULT = 1.0   // visos scenų trukmės × tempo
```

Galutines reikšmes duoda peržiūros mygtukas **„⧉ Konstantos"** — įklijuoti tiesiai.

### 4.4 PvP

Vartai keliauja `GameState.reactionGates` kaip dabar — svečias gauna tą patį kelią per `swapPerspective`. **Patikrinti F2 metu**, kad svečio pusėje `consumeReactionSnapshot` grąžina snapshot'ą (snapshot'ai laikomi modulyje toje pusėje, kur sukasi variklis) — jei svečias vartus gauna be snapshot'o, scena groja ant JAU pritaikytos būsenos (HP nukritęs prieš skrydį). Jei taip — svečiui reikės `hpHold` fallback'o iš `draws[].dmg` (paprasta: `hpHold[target] = hp + dmg` iki resolve).

## 5. Fazės (kiekviena — atskiras commit + tester bundle)

| Fazė | Kas | Rizika | Kaip patikrinti |
|---|---|---|---|
| **F0 · Peržiūra** (ŠIS ŽINGSNIS) | Donatas suderina `ravenof-fx-preview-zmk-keywords.html`: trukmės, spalvos, ar juostelė tinkamoje vietoje. Eksportuoja konstantas. | 0 | akimis |
| **F1 · Sluoksnis + dev puslapis** | `SceneFxLayer` pagal peržiūrą; `/dev/keyword-fx` → `/dev/scene-fx` su ŽMK scenomis ir visais raktažodžiais; `[data-pile="zmk-*"]` selektoriai. Kovos kodas NELIEČIAMAS. | maža | dev puslapis telefone (Chrome preview), FPS, `npx tsc` |
| **F2 · Raktažodžių vartai** | `PresentGate.kind`, 3 variklio taškai, `startGateRun` dispatch, vėliava `rvn-scene-fx`. | **vidutinė** (variklis) | `npm run game:test:chain` 78 patikrų + naujos (vartai rašomi PRIEŠ efektą; snapshot'e mirštanti korta yra; silenced → vartų nėra); PvP svečias |
| **F3 · ŽMK vartai** | `rollDamage` snapshot + `draws`, AoE grupavimas, `zmkFlash` išjungimas, ×2/×0/pair integracija. | vidutinė | 8 scenarijai žemiau; `game:test:feel` |
| **F4 · Šlifas** | garsai (ŽMK whoosh/flip, 3 raktažodžių stingeriai — `SOUND-TODO.md`), kompaktas, reduced-motion, silpno telefono biudžetas, `feelTelemetry` lock laikas, Nustatymų jungiklis + tempo. | maža | telemetrija kovos gale |

Kiekviena fazė: naujas `APP_VERSION`, `release.bat`, `/admin/releases` → tester. F2 ir F3 su vėliava išjungta stable kanale, kol tester'iai nepatvirtina.

## 6. Privalomi testų scenarijai (tie patys, kurie sulaužė 705–707)

1. AoE artefaktas — 3+ padarai, du miršta (viena ŽMK vėduoklė, dvi mirtys PO smūgio).
2. Ataka su atgaline žala — dvi ŽMK (abiejų pusių) viename pakete, iš skirtingų kaladžių.
3. Kovos šūksnis su taikiniu + mirtis nuo to paties efekto (šūksnis → ŽMK → mirtis, tvarka).
4. Prakeiksmas + ŽMK viename pakete — prakeiksmo showcase (2200) turi baigtis PRIEŠ ŽMK vartus.
5. Reakcija grandinėje po šūksnio — du vartų tipai iš eilės, be persidengimo.
6. Paskutinis noras iš efekto-iškviesto padaro (`fireEntryMappings` kelias).
7. Trigeris priešo ėjimo pradžioje (Belzatoras) — šaltinis priešo pusėje, ŽMK iš priešo kaladės.
8. PvP svečias — pozicijos iš DOM, snapshot'ų buvimas, reconnect (seenRef = pilnas log'as → scenų nepergroja).
Plius: `prefers-reduced-motion`, 4 branduolių telefonas (FPS ≥ 50 skrydžio metu), 2v2 (vėliava ten išjungta — be grandinės/scenų, kaip dabar).

## 7. Ko NEdaryti

- Jokio `setTimeout` gameplay pusėje scenoms — tik `Promise` iš sluoksnio.
- Nepridėti ŽMK laikymo (2,5 s) į vartus — laikymas dekoratyvus, kova eina toliau.
- Nekeisti `SETTLE`, `fxSeq`, `showcaseHold` semantikos — prakeiksmai/burtai lieka kaip yra.
- Ne `transform` ant kortų (framer-motion) — scenos piešiamos canvas'e virš kortų, kortos tik `scale`/`translate` per esamas klases.
- Neįjungti vėliavos stable kanale be tester'ių patvirtinimo.

## 8. Kaip peržiūrėti (Donatui)

Atidaryti peržiūrą (PowerShell):

```powershell
start "" "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal\ravenof-fx-preview-zmk-keywords.html"
```

Peržiūroje: pasirinkti scenarijų (9 vnt.), greitį 0.4× detalėms, pastumdyti slankiklius (ŽMK laikymas, skrydis, paskelbimas…), „silpnas telefonas" — dalelių biudžetas. Kai tinka — „⧉ Konstantos" ir atsiųsti bloką (arba tiesiog pasakyti, kurios reikšmės). Tada F1.
