# Ravenof rules fixtures — „aukso etalonas" C# portui

Šie JSON failai įrašyti TypeScript varikliu (`src/lib/tutorial/engine.ts` + `src/lib/game/*`)
per `npm run fixtures:record`. Godot/C# variklis (`Ravenof.Rules`) turi replay'inti
tuos pačius veiksmus su tuo pačiu seed'u ir gauti **identiškas** momentines nuotraukas.

## Determinizmas

Visas atsitiktinumas eina per `src/lib/game/rng.ts` (`rng()`), kuris fixture įrašymo metu
yra **mulberry32(seed)**. C# pusėje `Ravenof.Rules.Rng` – tas pats algoritmas (uint32
aritmetika, `Math.imul` = `unchecked` uint mul). Kvietimų tvarka turi sutapti 1:1:
1. `createGame` → kaladžių shuffle (you, ai), ŽMK kaladžių shuffle, pradinės rankos.
2. Kiekvienas veiksmas → tik tiek `rng()` kvietimų, kiek TS.

Jei kada TS variklyje keičiasi `rng()` kvietimų tvarka ar taisyklė – fixture'ai
perrašomi **sąmoningai** (`npm run fixtures:record`) ir commit'inami kartu su pakeitimu.

## Failo struktūra

```
version      1
name         gameNN-seedS-<difficulty>
source       "synthetic" | "cards.json (N kortų)"
seed         mulberry32 seed (rng)                  ← kaladės renkamos iš mulberry32(seed*7919+17)
first        'you' | 'ai'
difficulty   easy | normal | hard  (DI žaidžia 'ai' puse)
opts         { mulligan: true, zmkDefs: null }      ← null = oficiali ŽMK sudėtis (zmkEngine DEFAULT)
decks        { you: TutCard[], ai: TutCard[] }      ← pilnos kortos su mappings (uid unikalus)
initial      snapshot PRIEŠ pirmą veiksmą (po createGame)
steps[]      { i, action: NetAction, ok, reason?, snapshot }
final        { winner, globalTurn, steps, youHp, aiHp }
```

`snapshot`: `active, globalTurn, winner, logLen, field, pending{...}, you{...}, ai{...}, hash`.
`hash` = sha256(JSON.stringify(snapshot be hash)) pirmi 16 hex — patogumui; C# testai lygina
**laukus**, ne hash'ą (JSON serializacija skiriasi).

`ok:false` žingsniai irgi svarbūs: C# privalo juos **atmesti** taip pat (validacijos paritetas).
`reason` – i18n raktas, C# lygina tik `ok`.

## Politikos

- `ai` pusė: tikras DI (`decideAiTurn`) → veiksmas verčiamas į `NetAction`.
- `you` pusė: deterministinė „žaisk ką gali, atakuok ką gali" politika (recorder'yje).
- Laukiantys pasirinkimai (summon/peek/choice/copy/battlecry/lastwish…) – visada pirmas variantas.

C# testams politikos NEREIKIA – jie tik replay'ina `steps[].action`.

## Realios kortos

`npm run fixtures:export-cards` (Windows, su `.env.local`) → `fixtures/cards.json`, tada
`npm run fixtures:record -- --real --games 30`. v1 pool'e nėra čempionų ir prakeiksmų –
jiems bus atskiri scenarijų fixture'ai.
