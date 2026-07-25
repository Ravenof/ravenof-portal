# Ravenof — Progression v2 duomenų kontraktas

**Apimtis:** Daily Login Rewards · Season Path · Daily Quests
**Statusas:** backendas paruoštas, UI laukiamas iš Claude Design handoff'o.
**TypeScript šaltinis:** `src/lib/progression/types.ts` (šis dokumentas – jo paaiškinimas)
**Veiksmai:** `src/lib/progression/client.ts`

> **Pagrindinė taisyklė.** UI **neskaičiuoja nieko**: nei claim eligibility, nei reset
> laikų, nei atlygio sumų, nei reroll kainos, nei sezono lygio, nei boosterio turinio,
> nei dublikato kompensacijos, nei pasirinkimų sekos. Visa tai ateina iš serverio DTO.

---

## 1. Valiutos

| Kodas | Reikšmė | DB stulpelis | Kur naudojama |
|---|---|---|---|
| `silver` | Sidabras — pagrindinė nemokama meta valiuta | `profiles.gold` | login, quests, season, reroll |
| `essence` | Esencija — kortų kūrimui | `profiles.essence` | login, skrynia, season, dublikatų kompensacija |
| `rubies` | Rubinai — reta premium/uždirbama | `profiles.rubies` | login 30 d., season pass pirkimas |
| `season_xp` | Tik Season Path progresui | `user_season_pass.xp` | quests + daily chest |

**Combat Gold meta progresijai nenaudojamas.** `profiles.gold` istoriškai vadinamas
„gold", bet produktiškai tai **Sidabras**; kovos aukso ekonomika lieka kovos viduje.

## 2. Reward tipai

```ts
type RewardDefinition =
  | { type: 'silver';   amount: number }
  | { type: 'essence';  amount: number }
  | { type: 'rubies';   amount: number }
  | { type: 'season_xp'; amount: number }
  | { type: 'faction_booster_choice'; quantity: number }
  | { type: 'card_choice'; rarity: 'rare' | 'epic' | 'legendary' }
  | { type: 'card_back';     cosmeticId: string }
  | { type: 'player_avatar'; cosmeticId: string }
```

Compound atlygis = masyvas, pvz.:

```json
[{"type":"faction_booster_choice","quantity":1},{"type":"essence","amount":150}]
[{"type":"player_avatar","cosmeticId":"av_..."},{"type":"faction_booster_choice","quantity":2}]
```

`faction_booster_choice` ir `card_choice` **niekada nesuteikiami automatiškai** —
claim'as sukuria `reward_choices` įrašą ir grąžina `status: "choice_required"`.

## 3. Claim rezultatas

```ts
type ClaimResult =
  | { status: 'completed';       grantedRewards: GrantedReward[]; snapshot: ProgressionSnapshot }
  | { status: 'choice_required'; pendingChoices: PendingRewardChoice[];
      grantedRewards: GrantedReward[]; snapshot: ProgressionSnapshot }
```

`grantedRewards` = tik tai, kas realiai jau įskaityta į balansą.
`pendingChoices` = deterministinė eilė (rikiuojama pagal `createdAt, sourceId, seq`).

Klaidos grąžinamos kaip `{ error: string, ... }` — žr. `isProgressionError()`.

Žinomi klaidų kodai:

| Kodas | Reikšmė |
|---|---|
| `no_auth` | nėra autentifikuoto vartotojo |
| `already_claimed_today` | login: šiandien jau atsiimta |
| `cycle_completed_today` | login: 31-a diena atsiimta šiandien, naujas ciklas rytoj |
| `level_not_reached` | season: lygis dar nepasiektas |
| `no_pass` | season: premium takelis be Season Pass |
| `already_claimed` / `already` | pakartotinis claim |
| `not_claimable` | questas neužbaigtas / jau atsiimtas / svetimas |
| `not_all_completed` | skrynia: neužbaigti visi trys questai |
| `confirmation_required` | reroll: questas turi progresą, reikia patvirtinimo |
| `reroll_limit_reached` | reroll: dienos limitas (3) išnaudotas |
| `not_enough_silver` / `not_enough` | nepakanka valiutos |
| `choice_not_found` | pasirinkimas neegzistuoja arba priklauso kitam vartotojui |
| `card_not_in_pool` | bandyta pasirinkti kortą ne iš serverio pool'o |
| `faction_not_selectable` | frakcija nėra viena iš 8 pasirenkamų |

---

## 4. Daily Login Rewards

**Modelis:** rolling **31 prisijungimo** ciklas.
Praleista diena progreso **nenutraukia** — ciklo pozicija juda **tik atsiėmus**.
Per vieną **UTC parą** — vienas atlygis. 31-os dienos atsiėmimas užbaigia ciklą;
naujas ciklas gali prasidėti tik **kitą UTC parą**.

```ts
type LoginRewardState = {
  cycleId: string | null
  cycleIndex: number
  economyVersion: number
  cyclePosition: number        // 0..31 — kiek dienų jau atsiimta
  cycleLength: 31
  claimedToday: boolean
  claimableDay: number | null  // null ⇒ šiandien claiminti negalima
  nextClaimAt: string | null   // ISO; kai claimableDay === null
  cycleCompleted: boolean      // true tik kol blokuojama iki kitos paros
  claimedDays: number[]
  rewards: LoginRewardDay[]    // visos 31 dienos su claimed flag'ais
  pendingChoices: PendingRewardChoice[]
  balances: Balances
  serverTime: string
}
```

### Patvirtinta 31 dienos lentelė

| D | Atlygis | D | Atlygis |
|--:|---|--:|---|
| 1 | 100 Silver | 17 | 350 Silver |
| 2 | 25 Essence | 18 | 100 Essence |
| 3 | 150 Silver | 19 | 400 Silver |
| 4 | 150 Silver | 20 | 500 Silver |
| 5 | 50 Essence | 21 | **1 iš 2 Rare kortų** |
| 6 | 200 Silver | 22 | 450 Silver |
| 7 | **1 frakcijos boosteris** | 23 | 100 Essence |
| 8 | 200 Silver | 24 | 500 Silver |
| 9 | 50 Essence | 25 | 125 Essence |
| 10 | 250 Silver | 26 | 600 Silver |
| 11 | 250 Silver | 27 | 750 Silver |
| 12 | 75 Essence | 28 | **1 boosteris + 150 Essence** |
| 13 | 300 Silver | 29 | 1000 Silver |
| 14 | **1 boosteris + 100 Silver** | 30 | 25 Rubies |
| 15 | 300 Silver | 31 | **2 boosteriai + 200 Essence** |
| 16 | 75 Essence | | |

### Veiksmai

```ts
getLoginRewards(): Promise<LoginRewardState | ProgressionError | null>
claimLoginReward(): Promise<ClaimResult<LoginRewardState> | ProgressionError | null>
```

---

## 5. Season Path

20 lygių · **1000 Season XP** lygiui · **20 000 XP** visam keliui · Free + Pass takeliai.
Sezono trukmė – iš DB (`season_pass_seasons.starts_at/ends_at`), numatyta 3 mėn.
**Pass kaina imama iš serverio** (`pass_price_silver` / `pass_price_rubies`) — UI jos nesugalvoja.
**Retroaktyvumas:** nusipirkus pass vėliau, visi jau pasiekti premium atlygiai tampa
claimable (claim tikrina tik `xp` ir `has_season_pass`, ne pirkimo laiką).

```ts
type SeasonPathState = {
  season: { id, title, theme, startsAt, endsAt, economyVersion }
  xp: number; level: number; levels: 20; xpPerLevel: 1000; totalXp: 20000
  hasPass: boolean
  passPrice: { silver: number; rubies: number }
  rows: {
    level: number; xpRequired: number; reached: boolean
    free: { rewards: RewardDefinition[]; claimed: boolean; claimable: boolean }
    pass: { rewards: RewardDefinition[]; claimed: boolean; claimable: boolean }
  }[]
  pendingChoices: PendingRewardChoice[]
  balances: Balances
  serverTime: string
}
```

### Patvirtinta lentelė

| Lygis | Free | Pass |
|---:|---|---|
| 1 | 250 Silver | 50 Essence |
| 2 | 50 Essence | 350 Silver |
| 3 | 350 Silver | 1 boosteris |
| 4 | 400 Silver | 75 Essence |
| 5 | 1 boosteris | 500 Silver |
| 6 | 500 Silver | 1 boosteris |
| 7 | 1 iš 2 Rare kortų | 125 Essence |
| 8 | 100 Essence | 1 boosteris |
| 9 | 650 Silver | 750 Silver |
| 10 | 1 boosteris | 2 boosteriai |
| 11 | 750 Silver | 150 Essence |
| 12 | 150 Essence | Sezoninis Card Back |
| 13 | 850 Silver | 1 boosteris |
| 14 | 1 boosteris | 1000 Silver |
| 15 | 1 iš 2 Epic kortų | 2 boosteriai |
| 16 | 1000 Silver | 250 Essence |
| 17 | 200 Essence | 1 boosteris + 500 Silver |
| 18 | 1 boosteris | 1500 Silver |
| 19 | 1250 Silver | 2 boosteriai |
| 20 | 1 iš 2 Legendary kortų | Sezoninis Avataras + 2 boosteriai |

Gameplay kortos **nėra** išskirtinės premium takeliui (Rare/Epic/Legendary
pasirinkimai yra **Free** takelyje). Kosmetika — tik **Card Back** ir **Player Avatar**.

### Veiksmai

```ts
getSeasonPathV2()
claimSeasonRewardV2(level: number, track: 'free' | 'pass')
claimAllSeasonRewards()          // sustoja ties pirmu pasirinkimu
unlockSeasonPassV2('silver' | 'rubies')
continuePendingClaims()          // tęsia Claim All po pasirinkimo
```

**Claim All elgsena.** Deterministinė tvarka: lygis didėjančiai, `free` prieš `pass`.
Suteikia visus iš karto suteikiamus atlygius; radęs `card_choice` / `faction_booster_choice`
sukuria pending choice, **užfiksuoja claim'ą** ir sustoja, grąžindamas `choice_required`.
Kol yra neišspręstų pasirinkimų, pakartotinis `claimAllSeasonRewards()` **nieko naujo
neclaimina** ir grąžina tą pačią eilę.

---

## 6. Daily Quests

Kiekvieną **UTC parą** tiksliai **1 easy + 1 medium + 1 hard**.

| Sudėtingumas | Silver | Season XP |
|---|---:|---:|
| Easy | 100 | 80 |
| Medium | 150 | 100 |
| Hard | 200 | 120 |
| **Daily Chest** (visi trys) | — | 100 + **50 Essence** |
| **Dienos maksimumas** | **450** | **400** (+50 Essence) |

```ts
type DailyQuestsState = {
  dateKey: string        // UTC data
  resetAt: string        // kito UTC vidurnakčio ISO laikas
  quests: DailyQuest[]
  allCompleted: boolean
  chest: { rewards: RewardDefinition[]; claimable: boolean; claimed: boolean }
  reroll: { used: number; max: 3; freeRemaining: number; nextCostSilver: number | null }
  dailyMax: { silver: 450; essence: 50; season_xp: 400 }
  pendingChoices: PendingRewardChoice[]
  balances: Balances
  serverTime: string
}

type DailyQuest = {
  id: number
  difficulty: 'easy' | 'medium' | 'hard'
  templateCode: string
  objectiveType: string
  titleKey: string; descKey: string   // i18n raktai (quests.v2.*), param `target`
  target: number; progress: number
  factionId: number | null
  rewards: RewardDefinition[]
  completed: boolean; claimed: boolean
  rerollable: boolean
  rerollCostSilver: number | null      // 0 = nemokamas; null = nebegalima
}
```

### Generavimo taisyklės (serveryje)

- **PvP questai** negeneruojami, kol PvP žaidėjui neprieinamas
  (`profiles.digital_onboarded_at is null` ⇒ be PvP; konfigūruojama).
- **Frakcijos questas** tik jei žaidėjas turi galiojančią (≥ 30 kortų) tos frakcijos kaladę.
- Nėra dviejų questų iš tos pačios **konfliktų grupės** ir nėra vienodų šablonų.
- **Nėra win-streak** reikalavimų.
- Questai „atplėšk pakuotę" **išjungti** (ir v1, ir v2 šablonuose).
- Progresas **tik iš galiojančių kovų** (`matches.valid_for_rewards = true`).

### Reroll

| Reroll | Kaina |
|---|---|
| 1-as | **nemokamas** |
| 2-as | 100 Silver |
| 3-ias | 100 Silver |
| 4-as | **neleidžiamas** (`reroll_limit_reached`) |

- Rerollinamas **vienas** questas; užbaigto ar atsiimto – negalima.
- Questas su progresu keičiamas tik su `confirmProgressLoss = true`
  (pirmas kvietimas grąžina `confirmation_required`); progresas prarandamas.
- Naujas questas – **tos pačios difficulty**, atlygio vertė **nesikeičia**.
- Ką tik pašalintas ir šiuo metu aktyvūs questai iškart negrąžinami.
- Sidabras nuskaitomas **toje pačioje transakcijoje** kaip naujo questo sukūrimas.

### Veiksmai

```ts
getDailyQuests()
claimDailyQuest(questId: number)
claimDailyChestV2()
rerollDailyQuest(questId: number, confirmProgressLoss = false)
```

---

## 7. Atlygio pasirinkimai

```ts
type PendingRewardChoice = {
  choiceId: string
  choiceType: 'faction_booster' | 'card'
  sourceType: 'login' | 'season' | 'daily_quest' | 'daily_chest'
  sourceId: string
  seq: number
  rarity: 'rare' | 'epic' | 'legendary' | null
  options: FactionOption[] | CardChoiceOption[]
  createdAt: string
}
```

### Frakcijos boosteris

`options` = **8 pasirenkamos frakcijos** (Universalus **nėra** pasirenkamas):

| Light | Dark |
|---|---|
| Šviesos pulkas | Mirties maršas |
| Inkvizicijos legionas | Demonų orda |
| Mistikos melodija | Vryhioko gauja |
| Rytų vėjas | Plėšikų naktis |

Kai `quantity = 2` — sukuriami **du atskiri** pasirinkimai (`seq` 1 ir 2);
galima rinktis tą pačią arba skirtingas frakcijas; kiekvienas finalizuojamas atskirai.

```ts
resolveFactionBoosterChoice(choiceId: string, factionId: number)
```

### Kortos pasirinkimas

```ts
type CardChoiceOption = {
  cardId, nameLt, nameEn, factionId, alignment: 'light' | 'dark',
  rarity: 'rare' | 'epic' | 'legendary', imageUrl,
  effectTextLt, effectTextEn, goldCost,
  ownedCount, copyLimit, duplicateEssence,
  disabled: boolean            // copy limit pasiektas
}
```

Pool'ą **kuria serveris**: lygiai 2 variantai — **1 Light + 1 Dark**, reikiamo rarity;
pool užšaldomas `reward_choices.choice_pool` (klientas negali jo perrinkti).
Copy limit: Rare **2**, Epic **1**, Legendary **1**.
Pasirinkus kortą, kurios copy limit jau pasiektas, serveris skiria **esencijos
kompensaciją** (`duplicateEssence`) vietoje kortos.

```ts
resolveCardChoice(choiceId: string, cardId: string)
```

---

## 8. Boosterio turinys

10 kortų: **8 pasirinktos frakcijos + 2 Universalus**.

| Slotai | Minimalus rarity | Pastaba |
|---|---|---|
| 1–6 | Common+ | 2 atsitiktiniai slotai iš 1–9 skiriami Universalus kortoms |
| 7–9 | Magic+ | |
| 10 | **Rare+** | **garantuotai pasirinktos frakcijos** |

Rarity „upgrade" tikimybės paimtos iš **esamos serverio drop lentelės**
(`rvn_open_pack_v3`, `20260629_booster_rarity_v2.sql`) ir perkeltos į
`economy_config.booster_v2` — nauja ekonomika nebuvo išgalvota.

Duplicate protection: renkamos tik kortos, kurių žaidėjas dar neturi iki `copy_limit`.
Jei tinkamų nebėra — skiriama **esencijos kompensacija** iš esamos
`economy_config.craft.disenchant` lentelės (tier pagal `rarities.sort_order`).
Visos 10 kortų ir inventoriaus pakeitimai — **viena transakcija**.

```ts
type BoosterResult = {
  factionId: number
  cards: { slot, cardId | null, name?, factionId, rarity, compensated, essence? }[]
  essenceCompensation: number
}
```

---

## 9. Idempotencija ir dvigubas paspaudimas

Kiekvienas mutuojantis veiksmas priima `p_idempotency_key`.
`src/lib/progression/client.ts` jį generuoja automatiškai ir **užrakina veiksmo scope'ą**,
kol vyksta užklausa — dvigubas paspaudimas fiziškai negali išsiųsti dviejų raktų.

Serveryje: `progression_idempotency (user_id, action, idempotency_key) → response`.
Pakartotas kvietimas su tuo pačiu raktu grąžina **tą patį atsakymą** ir **neduoda antro atlygio**.

Papildomai kiekvienas claim'as serializuojamas `select ... from profiles where id = auth.uid() for update`,
o unikalūs indeksai (žr. `PROGRESSION-BACKEND-IMPLEMENTATION.md` §4) yra galutinė apsauga.

---

## 10. Laikas

- Dienos keičiasi **00:00 UTC** (`rvn__utc_date()`).
- `resetAt` / `nextClaimAt` grąžinami kaip ISO timestamp — **frontend gali rodyti
  countdown vartotojo vietiniu laiku**, bet sprendimus priima serveris.
- Kiekvienas DTO turi `serverTime`, kad UI galėtų sinchronizuoti laikrodį.

---

## 11. Bendra būsena

```ts
getProgressionSnapshot(): FullProgressionSnapshot   // login + season + quests + choices
getProgressionConfig(): ProgressionConfig           // ekonomika tik skaitymui
getPendingChoices(): { pendingChoices: PendingRewardChoice[] }
```

## 12. Suderinamumo adapteriai

`@/lib/progression` eksportuoja ir senuosius pavadinimus, nukreiptus į v2 RPC:

| Senas pavadinimas | v2 funkcija |
|---|---|
| `getMonthlyLogin()` | `getLoginRewards()` |
| `claimMonthlyLogin()` | `claimLoginReward()` |
| `getSeasonPath()` | `getSeasonPathV2()` |
| `claimSeasonReward(level, track)` | `claimSeasonRewardV2()` |
| `unlockSeasonPass(currency)` | `unlockSeasonPassV2()` |
| `getDailyTasks()` | `getDailyQuests()` |
| `claimDailyTask(id)` | `claimDailyQuest(id)` |
| `claimDailyChest()` | `claimDailyChestV2()` |
| `rerollDailyTask(id)` | `rerollDailyQuest(id)` |

Senieji `@/lib/gamification/*` moduliai (v1 RPC) **palikti nepaliesti**, kad dabartinis
UI veiktų, kol bus prijungtas naujas dizainas.
