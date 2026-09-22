# Ravenof — Kovos žurnalas v2 (planas + peržiūra)

**Data:** 2026-09-23 · **Būsena:** PLANAS, kodo dar nėra
**Peržiūra:** `ravenof-log-preview.html` (repo šaknyje; atidaryti iš ten) · dabartinės būklės nuotrauka: `kovos-zurnalas-dabar.png`
**Liečia:** `TutorialGame.tsx` (`renderLogH`, `renderLogStripH`, portrait/legacy log'ai ~5111/5422), `BattleLayout.tsx` (drawer + strip), `DesktopBattleLayout.tsx` (rvn-desk-log), `logText.ts`, `locales/*/battleLog.json`

---

## 1. Kas negerai dabar (iš tikros kovos, 2026-09-23)

Vienas priešo veiksmas — Sadakumo puola Gorgonę — žurnale užima **7 eilutes**:

```
„Gorgonė" žalos negauna (0).                          ← dar ankstesnio šūksnio uodega
⚔ „Sadakumo" (4 ATK) atakuoja „Gorgonė" – abu traukia po ŽMK!
ŽMK: +0 → 4 bazinė žala tampa 4.
„Gorgonė" gauna 4 žalos (0/4).
ŽMK: −1 → 5 bazinė žala tampa 4.
Atgalinė žala: „Sadakumo" gauna 4 (0/5).
„Gorgonė" žūsta ir keliauja į kapinyną.
„Sadakumo" žūsta ir keliauja į kapinyną.
```

Konkrečios problemos:

| # | Problema | Pasekmė žaidėjui |
|---|---|---|
| 1 | **1 eilutė = 1 variklio įvykis**, ne 1 veiksmas | Turi pats sudėlioti, kurios 7 eilutės yra „viena ataka" |
| 2 | **Sakiniai, ne skaičiai** — „gauna 4 žalos (0/4)", „bazinė žala tampa 4" | Skaičius reikia išrankioti iš teksto; 11 px šriftas 215 px skydelyje = 3 eilutės vienam sakiniui |
| 3 | **ŽMK atskira eilute** prieš kiekvieną žalą | Dvigubina eilučių skaičių; ŽMK ir žala nesusieti vizualiai |
| 4 | **Triukšmas**: traukimai, auksas, „baigia ėjimą. Nepanaudotas auksas dingsta" | ~40 % eilučių — informacija, kurios niekas neskaito antrą kartą |
| 5 | **Nėra hierarchijos**: ėjimo skirtukas („— Tu pradedi 5-ą ėjimą —") — tokia pati eilutė kaip visos | Akis neturi kur užsikabinti sukant atgal |
| 6 | **Kortų vardai kabutėse tekste**, miniatiūra tik kairėje | „Grafas Liuteris atakuoja tave" — kas, ką, kiek — trys skirtingi žvilgsniai |
| 7 | Mobilus strip: 4 sakiniai **8,5 px** su 3 eilučių clamp'u | Praktiškai neįskaitoma — tik „kažkas vyko" |
| 8 | Emoji kaip semantinis ženklas (⚔ 📣 🕯 🌍 ☠), nevienodai (žala neturi ženklo) | Ženklas neatpažįstamas iš pirmo žvilgsnio |

**Kas gerai ir lieka:** kairysis brūkšnys pagal pusę, miniatiūra → kortos apžiūra, struktūrinis log'as (`key+params`), kortos asmeninis žurnalas apžiūroje (712), drawer/strip mechanika su braukimu.

## 2. Principai (v2)

1. **Vienetas = veiksmas.** Šakninis įvykis (ataka, iškvietimas, burtas, šūksnis, noras, trigeris, reakcija, prakeiksmas, artefaktas, laukas, čempiono gebėjimas) + visos jo pasekmės (ŽMK, žala, gydymas, buff, statusas, žūtis, traukimai) = **viena kortelė**.
2. **Skaičiai, ne sakiniai.** Rezultatai — žetonai: `−4 ŽMK+0`, `+3`, `+2 ATK`, `☠`, `❄`, `29 HP`. ŽMK — žymė ANT žalos žetono (žalia +, raudona −, `×2` oranžinė, `×0` pilka), ne atskira eilutė.
3. **Kas → ką.** Antraštėje: miniatiūra šaltinio → rodyklė → miniatiūra/avataras taikinio. Vardas — tik kai telpa; miniatiūra visada.
4. **Ėjimas = lipnus skirtukas** („5 ėj. · PRIEŠAS  +600 🪙 · 1 korta"), į kurį sutraukti traukimai, auksas ir „baigia ėjimą". Sukant atgal visada matai, kuriame ėjime esi.
5. **Nieko neprarandam.** Bakstelėjus kortelę — išsiskleidžia senieji pilni sakiniai (tas pats `eventText`). Tai ir yra „detalės".
6. **Filtras „Svarbu".** Rodo tik veiksmus su žala/gydymu/žūtimi/statusu; iškvietimai be efekto ir pan. slepiami. Būsena — localStorage.
7. **Naujų įvykių valdymas.** Auto-scroll tik kai žaidėjas yra apačioje; pasukęs aukštyn mato „↓ N nauji" mygtuką.
8. **Vienas komponentas trims vietoms.** Desktop skydelis (215 px), mobilus drawer (340 px), mobilus strip (paskutiniai 3 veiksmai be teksto). Legacy portrait log'ai (5111/5422) — tas pats komponentas.

## 3. Vizualinė kalba

| Veiksmas | Ženklas | Antraštė | Spalva |
|---|---|---|---|
| Ataka | ⚔ | `[src] → [tgt]` (abipusė: `⇄`) | pusės |
| Iškvietimas / burtas / artefaktas / laukas | ✦ / ✧ / ⛨ / ⌂ | `[avataras] ▸ [korta] 400 🪙` | pusės |
| Kovos šūksnis | juostelė `KOVOS ŠŪKSNIS` | po iškvietimo antrašte | auksinė `#f0b429` |
| Paskutinis noras | `PASKUTINIS NORAS` | `[mirusi korta ☠]` | violetinė `#a78bfa` |
| Trigeris | `TRIGERIS` | `[korta] ⟳` | žydra `#38bdf8` |
| Reakcija | `REAKCIJA` | `[reakcija] ⚡ [sukėlėjas]` | `#8b5cf6` |
| Prakeiksmas | `PRAKEIKSMAS` | `[korta] 🕸 [auka]` | `#a855f7` |
| Čempiono gebėjimas | ⚜ | `[čempionas] · gebėjimas` | auksinė |

Spalvos sutampa su scenų FX (`SceneFxLayer` PAL) ir `KOVOS-TEMPO` „efektų kalba" — žaidėjas mato tą pačią spalvą lentoje ir žurnale.

Taikinių eilutės (AoE, keli taikiniai): po antrašte, po vieną — `[mini] Vardas  −2 ŽMK+1  3/5`. Iki 6; daugiau — „+N".

## 4. Architektūra

### 4.1 `src/lib/game/logGroups.ts` — grynas grupavimas (be React, be i18n)

```ts
export type LogAction = {
  kind: 'turn' | 'attack' | 'play' | 'spell' | 'artifact' | 'field' | 'champion' | 'skill'
      | 'battlecry' | 'lastwish' | 'trigger' | 'reaction' | 'curse' | 'other'
  side: Side
  atLog: number                 // šakninio įvykio indeksas (raktas React'ui, dedup)
  root: GameEvent
  source?: { name?: string; uid?: string; player?: Side }
  targets: { name?: string; uid?: string; player?: Side; hits: Hit[] }[]
  keyword?: 'battlecry' | 'lastwish' | 'trigger' | 'reaction' | 'curse'
  turn?: { n: number; side: Side; gold: number; draws: number }   // kind='turn'
  events: GameEvent[]           // visi įvykiai kortelėje (detalėms)
  important: boolean            // filtrui „Svarbu"
}
export type Hit = { t: 'dmg' | 'heal' | 'buff' | 'status' | 'death' | 'gold'; value?: number; zmk?: ZmkValue; hpAfter?: string; statusId?: string }
export function groupLog(log: GameEvent[]): LogAction[]
```

Taisyklės: šakniniai `t` — `startTurn` (naujas `turn` + sugeria `draw`/`gold`/`endTurn` iki kito šakninio), `attack`, `play`, `spell`, `artifact`, `field`, `champion`, `ability`, `battlecry` (killEffect / effect-summon), `lastwish`, `fxSource` su `kw:'trigger'`, `reactionTrigger`, `curse` (drawn/forced). Visi kiti (`zmk`, `damage`, `heal`, `buff`, `status`, `death`, `returnHand`, `fxSource` be kw, `zmkReshuffle`…) — prilipdomi prie paskutinio šakninio. `zmk` įvykis įsimenamas ir priklijuojamas prie **kito** `damage` kaip `hit.zmk` (tvarka variklyje: zmk → damage, visada). Šūksnis po `play` — NE atskira kortelė, o `keyword` ant tos pačios `play` kortelės (kaip peržiūroje). `battlecry` po `play` to paties uid = ta pati kortelė.

`important` = turi bent vieną `dmg/heal/death/status` hit'ą arba keyword.

Testai: `scripts/simulate-log-groups.ts` — realūs log'ai iš `simulate-scene-gates` scenarijų (ataka su atgaline = 1 kortelė 2 taikiniai; šūksnis AoE = 1 kortelė 4 taikiniai; noras = kortelė su keyword; ėjimo antraštė sugeria draw/gold). ~25 patikros.

### 4.2 `src/components/tutorial/BattleLogList.tsx` — vienas komponentas

Props: `actions: LogAction[]`, `mode: 'panel' | 'drawer' | 'strip'`, `findCard`, `onInspect`, `onHover`, `t`, `filter`, `onFilter`. Virtualizacija nereikalinga (≤ 200 kortelių per kovą; render'inam paskutines 60 + „rodyti senesnius").

- **panel / drawer** — kortelės + lipnūs ėjimo skirtukai + „↓ N nauji" + filtro skirtukai antraštėje (drawer'yje filtro skirtukai persikelia į esamą `hdr`).
- **strip** — paskutiniai 3 veiksmai: miniatiūra(-os) + ženklas + 1–2 žetonai, be teksto; bakstelėjimas atidaro drawer (kaip dabar).
- Detalės: `expanded: Set<atLog>` lokaliai; išskleista kortelė rodo `events.map(eventText)`.
- Auto-scroll: `IntersectionObserver` ant apatinio sentinel'io; jei nematomas — nauji nescrollina, rodoma piliulė.

### 4.3 i18n

Naujas namespace `battleLogShort.json` (~30 raktų): veiksmų antraštės (`attack`, `attackYou`, `play`, `cast`…), keyword juostelės (`battlecry`, `lastwish`, `trigger`, `reaction`, `curse`), ėjimo antraštė (`turn: "{{n}} ėj."`, `you`, `foe`, `foeShort: "DI"`), filtras (`all`, `important`), `newItems: "↓ {{n}} nauji"`, `showOlder`. Senieji `battleLog.*` lieka detalėms nepakitę.

### 4.4 Kas išimama

`renderLogH` / `renderLogStripH` / du legacy log render'iai TutorialGame'e → keičiami `<BattleLogList>` kvietimais (4 vietos). `visibleLog` (logCut) lieka — `groupLog(visibleLog)` memo'inamas pagal `log.length`.

## 5. Fazės

| Fazė | Kas | Rizika | Patikra |
|---|---|---|---|
| **F0 · Peržiūra** (ŠIS ŽINGSNIS) | `ravenof-log-preview.html` — suderinti kortelės formą, žetonus, ėjimo antraštę, strip'ą | 0 | akimis |
| **F1 · Grupavimas** | `logGroups.ts` + `simulate-log-groups.ts` | maža (grynas modulis) | testai |
| **F2 · Komponentas desktop + drawer** | `BattleLogList` panel/drawer režimai, detalės, filtras, auto-scroll piliulė; i18n | vidutinė (UI) | Chrome 1366×768 + telefonas |
| **F3 · Strip + legacy vietos** | strip režimas rail'e; portrait/legacy log'ai per tą patį komponentą; seni render'iai išimami | maža | telefonas |
| **F4 · Šlifas** | kortelės atsiradimo animacija (fade+slide 180 ms), „Svarbu" atmintis, 2v2 (komandos spalvos), reduced-motion | maža | — |

F1+F2 — vienas tester bundle, F3+F4 — antras. Vėliavos nereikia: senas render'is lieka git'e; UI-only pakeitimas, variklio neliečia.

## 6. Testų scenarijai

1. Ataka su atgaline žala ir dviguba žūtimi → 1 kortelė, `⇄`, du hit'ai su ŽMK žymėmis, abi miniatiūros su ☠.
2. Šūksnis AoE per 4 taikinius (tarp jų savi) → 1 kortelė, juostelė, 4 taikinių eilutės, ×0 = pilkas `0 ×0`.
3. Prakeiksmas ištrauktas + jo žala → 1 kortelė PRAKEIKSMAS.
4. Reakcija atakos metu → reakcijos kortelė TARP atakos antraštės ir atakos žalos (chronologija!). Sprendimas: reakcijos kortelė atskira, atakos kortelė lieka viena (hit'ai po reakcijos vis tiek priklauso atakai).
5. Ėjimo antraštė: 2 traukimai + auksas + lauko bonusas → „+600 🪙 · 2 kortos"; `endTurn` nesukuria eilutės.
6. PvP svečias (`swapPerspective`) — pusių spalvos teisingos.
7. 200+ įvykių kova — scroll'as nesusidaro laggo (be virtualizacijos, tik paskutinės 60).
8. Kalbos perjungimas kovos metu — kortelės persirenderuoja (i18n per `t`, ne cache).

## 7. Kaip peržiūrėti

```powershell
start "" "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal\ravenof-log-preview.html"
```

Trys stulpeliai: **Dabar** (tikri įvykiai, tikras plotis) · **Desktop skydelis 215 px** · **Mobilus drawer 340 px** + strip. Spustelėk bet kurią kortelę — detalės. „Svarbu" — filtras. Pasakyk, kas tinka / ką keisti (žetonų forma, ar rodyti ŽMK žymę visada, ar reikia laiko žymų, ar „Svarbu" turi būti numatytas) — tada F1.
