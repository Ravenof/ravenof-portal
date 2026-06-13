# Virtualus Ravenof žaidimas — gameplay v1 santrauka

Data: 2026-06-13. Pilnas gameplay / UI / efektų sistemos atnaujinimas.

## SVARBU prieš deploy

**Paleisk `supabase/gameplay_v1.sql`** Supabase SQL editor'iuje. Ji prideda:
- `cards.gameplay` JSONB stulpelį (admin efektų mapping'as),
- `zmk_cards` lentelę su oficialia 20 kortų sudėtimi.

Nepaleidus migracijos žaidimas veikia fallback režimu (efektai iš teksto parserio,
ŽMK – numatytoji sudėtis), bet admin ŽMK puslapis rodys klaidą.

## Architektūra (src/lib/game/)

| Modulis | Atsakomybė |
|---|---|
| `types.ts` | GameplayConfig modelis: TargetType (19), EffectType (27), TriggerType (19), projectile/garsai, curse trigger config, field config, ŽMK defs |
| `targetResolver.ts` | TargetType → konkretūs taikiniai; auto-pick deterministinis (be random, nebent `allowRandomTarget`) |
| `effectEngine.ts` | Vykdo EffectMapping'us per GameApi (dependency injection – be ciklinių importų); nežinomi efektai praleidžiami su warning log |
| `triggerSystem.ts` | onTurnStart/End, onSummon, onCast, onAttack(ed), onDeath, onDraw... – padarai, artefaktai, laukas |
| `curseEngine.ts` | Prakeiksmų side deck; aktyvacija nuo efektų; caster/opponent/targetOwner taikymas |
| `zmkEngine.ts` | ŽMK kaladė iš `zmk_cards` (auto/draw režimai), fallback į oficialią sudėtį |
| `fieldEngine.ts` | Lauko pasyvai: spell/unit kainų delta, ATK delta, atakų limitas, pirmos žalos mažinimas, aukso bonusas + trigger'iai |
| `soundManager.ts` | Failas-pirma: `public/sounds/battle/*.mp3` → fallback į sintezuotus ui-sound garsus |

`src/lib/tutorial/engine.ts` – žaidimo state machine, naudoja visus modulius.
`src/lib/tutorial/ai.ts` – AI oponentas. `script.ts` – tutorial žingsniai.

## Kas veikia

- **Mapped efektai**: damage/heal/destroy/būsenos/buff/debuff/draw/discard/summon(hand/deck/graveyard)/return/gold/triggerCurse/triggerZmk — visiems trigger'iams.
- **Curse side deck**: statomas iš `Prakeiksmas` tipo kortų; aktyvuojamas iš efektų (`triggersCurse` mapping'e) ir ištraukus iš pagrindinės kaladės; UI overlay + garsas.
- **ŽMK**: iš admin lentelės; `auto` – animuotas flash; `draw` – žaidėjas pats atverčia modale.
- **Field**: vienas bendras, keičiamas (senas → krūva), pasyvai + onTurnStart/End/onSummon/onCast/onFieldEnter/Leave trigger'iai, matosi loge.
- **Projectile animacijos**: 🔥🟣✨❄️💫⚔️🏹⚡☣️ pagal mapping/efekto tipą, skrenda nuo šaltinio iki taikinio + 💥 impact + garsai.
- **Targeting**: kursorius keičiasi (emoji projectile / kardai), galimi taikiniai – raudonas apvadas, negalimi pritemdomi (grayscale).
- **Tutorial fallback**: jei žingsnis neįvykdomas – suteikiamas auksas (1×) arba žingsnis praleidžiamas; popup mobile rodomas VIRŠUJE (neuždengia rankos), turi „− Sutraukti" (žaidimas atblokuojamas, 🎓 mygtukas grąžina).
- **Hand zoom**: 🔍 mygtukas – ranka išsiskleidžia (kortos 104–140px, wrap + scroll), kortos žaidžiamos tiesiai iš ten.
- **Desktop scale**: kortos 96/90px (buvo 78/72), didesnės krūvos, HP/auksas, zonos.

## Admin

- `/admin/zmk` – ŽMK kortų CRUD (pavadinimas, aprašymas, reikšmė, kiekis, auto/draw, trigger pastaba, paveikslėlis).
- Kortos redagavime – **„🎮 Virtualaus žaidimo efektai"** blokas: dropdown'ais trigger/efektas/taikinys/reikšmė/projectile/garsas, requiresSelection, optional, allowRandomTarget, „aktyvuoja prakeiksmą" (kiekis + kam), lauko pasyvai (Field tipo kortoms), JSON režimas pažengusiems. Išsaugoma į `cards.gameplay`.
- `needsEffectMapping` skaičiuojamas automatiškai: korta su efekto tekstu be mapping'ų rodo ⚠ ženklelį editoriuje.

## Prielaidos (padarytos pagal taisykles/aprašymus)

1. Kortos be mapping'ų veikia LEGACY režimu – efektas spėjamas iš lietuviško teksto (parseEffect regex: žala/gydymas/traukimas/auksas/būsenos). Tai sąmoningas fallback, kad realios kortos veiktų iš karto.
2. ŽMK `draw` režimas: modifikatorius mechaniškai jau pritaikytas (engine sinchroninis), modalas su atvertimu – prezentacinis. Pilnas „pause-resume" engine refactor – vėliau.
3. Curse mapping'uose `appliesTo:'random'` veikia tik su `allowRandomTarget:true`, kitaip – opponent.
4. Čempiono gebėjimo galia: mapping `value` + (fazė − 1).
5. Reakcijos lieka supaprastintos (suveikia prieš ataką) – pilnas sąlygų mapping'as dar nepadarytas.

## Testavimas

- `scripts/simulate-virtual-game.ts` – 29 automatiniai testai (visi ✓): atakos, mapped spell'ai, draw+curse trigger, curse nuo efekto, field pakeitimas/limitas/kainos/turn-start, čempiono skill, artefakto onTurnStart, onDeath/onAttacked, nesumapinta korta necrashina, custom ŽMK, 20 pilnų AI partijų stabilumas.
- Manual checklist (mobile): tutorial popup viršuje neuždengia rankos; 🔍 hand zoom; ŽMK draw modalas; curse overlay; projectile animacijos; „− Sutraukti".

## Kas liko vėliau (TODO)

- Admin kortų SĄRAŠE filtras/stulpelis „needsEffectMapping" (dabar matosi tik atidarius kortą).
- Reakcijų sąlygų mapping'as (on spell cast / on damage ir t.t.).
- `reduceCost/increaseCost/searchDeck/revealCards/copyEffect` efektai (modelyje yra, varikliuke praleidžiami su warning).
- ŽMK draw režimo tikras engine pause (async resolution).
- Tikri mp3 garsai į `public/sounds/battle/` (struktūra paruošta, README viduje).
- 2v2 režimas.
