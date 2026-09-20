# Ravenof — FX rollback (705/706) ir kovos efektų sistemų aprašas

**Data:** 2026-09-20 · **Repo:** `ravenof-portal` · **Šakos būsena rašant:** `main` @ `1e53b1a` (706)

Dokumentas dviem dalims:

1. **A dalis** — ką padaryti, kad grįžtum į 703 būseną (rollback).
2. **B dalis** — kaip veikia esami kovos efektai (prakeiksmai, reakcijos, AoE, projektiliai). Skirta perduoti kitam modeliui/žmogui, kad jis dirbtų su tikra sistema, o ne spėliotų.

---

## A DALIS — ROLLBACK

### A0. Kas dabar yra

| Commit | Kas jame | Būsena |
|---|---|---|
| `01d71bc` | **703** — botai (avatarai, sunkumas pagal rangą, 50–110 s laukimas, botų chat) | ✅ veikia |
| `a31e914` | **704** — naujos kortos (NAUJA ženklas + kolekcijos filtras) + migracija `20260926` | ✅ veikia |
| `d0d8ec3` | **705** — ŽMK skrydis + raktažodžių FX (`KeywordFxLayer`) | ❌ blogai |
| `1e53b1a` | **706** — ŽMK nugarėlė/flip/1,5 s + raktažodžių chronologija + žalos delsa | ❌ blogai |

Publikuotas bundle: **706** (`apps/digital/dist/version.json`). `APP_VERSION` darbiniame kataloge: **706**.

### A1. Greičiausias kelias žaidėjams (be kodo) — kanalo grąžinimas

Bundle'ai nekeičiami, bet kanalas rodo į bundle'ą, tad jį galima pervesti atgal:

1. Eik į **`/admin/releases`**.
2. Kanalui `tester` (ir `stable`, jei ten jau buvo 705/706) parink bundle **703** ir patvirtink.
3. Klientai kitą kartą atsidarę appsą parsisiųs 703.

DB pusė: `app_channels` lentelė laiko po vieną rodyklę kanalui (`supabase/migrations/20260918_app_releases.sql`). Jei UI neleidžia pasirinkti senesnio bundle'o, naudok A2 (kodo revert) — rezultatas toks pat, tik reikės naujo bundle'o.

### A2. Kodo rollback — rekomenduoju (pašalina TIK FX, palieka 704)

`git revert` sukuria naują commit'ą, kuris atšaukia 705 ir 706. Istorija lieka, nieko netrinam:

```powershell
cd "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
```

```powershell
git revert --no-edit 1e53b1a d0d8ec3
```

Jei `git revert` praneša apie konfliktą `TutorialGame.tsx` faile (gali būti, nes abu commit'ai lietė tas pačias vietas) — nutrauk ir naudok A3 variantą:

```powershell
git revert --abort
```

Po sėkmingo revert'o:

```powershell
# APP_VERSION turi būti NAUJAS numeris (bundle'ai nekeičiami!)
notepad src\lib\version.ts     # pakeisk '706' -> '707'
```

```powershell
git add src/lib/version.ts; git commit -m "707: rollback - ZMK ir raktazodziu FX (705, 706) atsaukti"; git push
```

```powershell
.\release.bat --notes-lt "Grazinta ankstesne kovos efektu versija" --notes-en "Reverted combat effect changes"
```

Tada **`/admin/releases`** → 707 → „Patvirtinti → tester".

### A3. Alternatyva, jei revert konfliktuoja — failų grąžinimas iš 704

Paima tiksliai tuos failus, kuriuos lietė 705/706, iš 704 commit'o:

```powershell
cd "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
```

```powershell
git checkout a31e914 -- src/components/tutorial/TutorialGame.tsx src/lib/game/timing.ts src/locales/lt/battle.json src/locales/en/battle.json
```

```powershell
git rm -r --cached src/components/tutorial/KeywordFxLayer.tsx src/app/dev/keyword-fx; Remove-Item -Recurse -Force src\components\tutorial\KeywordFxLayer.tsx, src\app\dev\keyword-fx
```

```powershell
notepad src\lib\version.ts     # '706' -> '707'
```

```powershell
git add -A src/components/tutorial src/app/dev src/lib; git commit -m "707: rollback - ZMK ir raktazodziu FX pasalinti, grazinta 704 busena"; git push
```

Tada `release.bat` kaip A2 punkte.

### A4. Jei nori tikrai iki 703 (be „naujų kortų")

Papildomai atšauk 704:

```powershell
git revert --no-edit a31e914
```

⚠️ **Svarbu:** migracija `20260926_collection_new_cards.sql` jau paleista DB ir lieka. Ji nekenkia (stulpeliai `is_new`, `first_obtained_at` tiesiog nebus naudojami), bet jei nori visiško švarumo:

```sql
drop trigger if exists trg_collection_mark_new on public.user_collections;
drop function if exists public.rvn__collection_mark_new();
drop function if exists public.rvn_mark_collection_seen(uuid[]);
-- stulpelių NETRINK, jei nesi tikras – jie nieko negadina
```

### A5. Ką tiksliai pašalins rollback'as

| Failas | Kas |
|---|---|
| `src/components/tutorial/KeywordFxLayer.tsx` | **naujas** — raktažodžių canvas sluoksnis (dingsta) |
| `src/app/dev/keyword-fx/page.tsx` | **naujas** — dev peržiūra (dingsta) |
| `src/lib/game/timing.ts` | `ZMK_DRAW`, `KEYWORD_FX*` konstantos (dingsta) |
| `src/components/tutorial/TutorialGame.tsx` | ŽMK skrydžio render'is, `presentDelay` žalos delsa, `data-pile="zmk-*"`, raktažodžių FX kabliukai |
| `src/locales/{lt,en}/battle.json` | `game.kwBattlecry/kwLastwish/kwTrigger` raktai |
| `ravenof-fx-preview-keywords.html` | peržiūra (gali likti — nieko neveikia) |

---

## B DALIS — KOVOS EFEKTŲ SISTEMOS (perdavimui)

### B0. Bendra architektūra

```
variklis (src/lib/tutorial/engine.ts + src/lib/game/*)
        │  loguoja GameEvent[] į game.log  (struktūrinis: t, side, key, params, src, tgt, value…)
        ▼
TutorialGame.tsx „šviežių įvykių" ciklas  (fresh = log.slice(seenRef.current))
        │  paverčia įvykius į FX komandas, sudeda laiko juostą (SETTLE + fxSeq)
        ▼
FX sluoksniai:  BattleFxLayer (canvas)  ·  ReactionChainLayer (canvas + vartai)
                CardStatusVfxLayer (DOM/CSS, prie kortos)  ·  SummonBurst (canvas)
```

**Taisyklės, galiojančios visiems sluoksniams:**

- Koordinatės — **viewport CSS px** iš `getBoundingClientRect()`. PvP svečio pusėje logas eina per `swapPerspective`, tad pozicijas visada imk iš DOM, ne iš būsenos.
- Vienas `<canvas>` + **vienas** `requestAnimationFrame` ciklas sluoksniui; rAF sukasi tik kol yra ką piešti.
- **Jokio `ctx.shadowBlur`** ir `ctx.filter` — tai pagrindinė telefonų stabdymo priežastis (žr. `PackOpen.tsx` istoriją, commit 702). Švytėjimas = radialinis gradientas arba iš anksto paruoštas sprite'as.
- `prefers-reduced-motion` → sutrumpintas kelias (dažniausiai vienas blyksnis).
- Dalelių biudžetas pagal įrenginį: `navigator.hardwareConcurrency <= 4 || deviceMemory <= 3` → ~45 %.
- Dedup per `seq` (absoliutus log indeksas), kad rerender/reconnect nepergrotų to paties efekto.

### B1. `BattleFxLayer` — pagrindinis FX variklis

**Failas:** `src/components/tutorial/BattleFxLayer.tsx` · naudojamas per `fxRef.current?.…`

```ts
type BattleFxHandle = {
  spawn(fx: SpawnFx): void
  floatNumber(x, y, text, color, style?: 'small'|'normal'|'big'|'critical'): void
  shakeBoard(kind: 'soft'|'hard'): void
  shakeUnit(uid: string, kind): void
  hitFlash(x, y, color): void
  impactFrame(severity): Promise<void>   // vizualinis hit-stop, variklio NESTABDO
}

type SpawnFx = {
  kind: FxKind
  variant?: AoeVariant
  from?: {x,y}; to?: {x,y}
  rect?: {x,y,w,h}        // aoeWave: riboja efektą zonai
  color: string; color2?: string
  intensity?: 'small'|'big'
  duration?: number       // sekundės
}
```

**`FxKind` (visi piešiami tame pačiame canvas):**
`projectile` · `slash` · `beam` · `healStream` · `buffSurge` · `debuffDrain` · `aoeWave` · `curseMark` · `curseDemon` · `disintegrate` · `shield` · `freeze` · `summonPortal` · `graveRise` · `drawStream` · `stealthFade` · `goldSteal` · `burn` · `poison` · `dustPuff` · `sparkBurst`

**`AoeVariant`:** `fire · lightning · ice · poison · arcane · holy · generic · heal · necrotic · curse · arrow`

Skaičiai (`floatNumber`) — DOM, ne canvas (CSS klasė `rvnFnum`). Purtymas — CSS klasės ant `[data-fx-root]` / `[data-unit-uid]`, kad nereikėtų perrenderinti didelio komponento.

### B2. `effectAnimations.ts` — efekto tipo → animacijos žemėlapis

**Failas:** `src/lib/game/effectAnimations.ts`

| effect | animation | trukmė | origin | taikinio reakcija | garsas |
|---|---|---|---|---|---|
| `damage` | projectile | 1.3 | sourceCard | shakeFlash | impact |
| `burn` | projectile | 1.4 | sourceCard | shakeFlash | impact |
| `destroy` | slash | 1.6 | sourceCard | crackDissolve | death |
| `heal` | healStream | 1.4 | sourceCard | glow | heal |
| `cleanse` | healStream | 1.2 | sourceCard | glow | heal |
| `buff` | buffSurge | 1.2 | sourceCard | pop | heal |
| `debuff` | debuffDrain | 1.3 | sourceCard | darken | freeze |
| `curse` | curseMark | 1.5 | sourceCard | darken | curse |
| `aoeDamage` | aoeWave | 1.8 | sourceCard | multiShake | impact |
| `attack` | slash | 1.0 | sourceCard | shakeFlash | attack |
| `spell` | projectile | 1.3 | sourceCard | shakeFlash | spellCast |
| `shield` | shield | 1.2 | target | glow | heal |
| `freeze` | freeze | 1.4 | sourceCard | frost | freeze |
| `draw` | drawStream | 1.2 | deck | none | draw |
| `summon` | summonPortal | 1.4 | board | pop | summon |
| `revive` | graveRise | 1.8 | board | pop | summon |

**Frakcijų paletės** (`factionPalette(name)`): Mirties maršas `#5ef0c0` · Mistikos melodija `#a78bfa` · Inkvizicija `#ffe08a` · Šviesos pulkas `#7cc4ff` · Demonų orda `#ff5a4a` · Goblinai `#ffd24a` · Plėšikai `#d4af37` · Rytų vėjas `#9fe8d0`.

**Projektilių spalvos** (`PROJECTILE_COLOR`): `fireball #ff7a1a` · `darkCurse #a855f7` · `healingGlow #5ef0c0` · `freezeBurst #7cc4ff` · `stunBurst #ffd24a` · `destroyStrike #ff4a4a` · `arrow #e8e0c8` · `lightning #9fc4ff` · `poisonGlob #84cc16`.

**`factionDirectionalKind(frakcija)`** → kokia forma skrenda: Šviesos pulkas / Plėšikai / Rytų vėjas → `slash`; Inkvizicija → `beam`; visi kiti → `projectile`.

### B3. PROJEKTILIAI (žala vienam taikiniui)

**Kur:** `TutorialGame.tsx`, `case 'damage'` (~2432 eil.).

Seka vienam žalos įvykiui:

1. **Spalva:** `e.projectile` (batch'o elementas) > kortos `gameplay.projectileType` > frakcijos paletė.
2. **HP prilaikymas:** `setHpHold({[uid]: dabartinisHP + val})` — HP skaičius kortoje lieka senas, kol projektilas nenusileido; atleidžiamas smūgio callback'e. Tai vienintelis būdas „žala po efekto".
3. **Delsa:** `const base = SETTLE + fxSeq; fxSeq += 120` — visi to paties paketo efektai eina eilute, ne vienu metu. `SETTLE = 800 ms`, kai paketas turi `play/champion/artifact` (korta turi nusėsti).
4. **Skrydis:** `fxRef.spawn({ kind: factionDirectionalKind(...), from, to, color, duration: 1.0, variant: projVariant(...) })`.
5. **Smūgis:** `impactProfile(e.severity)` duoda hit-stop, purtymo lygį, skaičiaus stilių ir muzikos duck; tada `hitFlash` + `floatNumber('-N')`.

**Dublikatų prevencija (svarbu!):**
- `projVictims: Set<uid>` — mirties FX nešaus antro projektilo į tą patį taikinį (mirtis tada tik „susprogdina").
- `projFired` — blokuoja ability/attack dublius.
- `zoneAoe` (iš `fxSource.aoe`) — tikras AoE, projektilų **nėra** visai.
- `e.viaReaction` — reakcijos efektas, projektilas nešaunamas (jį piešia grandinė).

### B4. AoE

Trys keliai:

1. **`zoneAoe`** — variklis pažymi `fxSource` su `aoe: true` (mapping'as taiko visą zoną). Tada: vienas `aoeWave` su `rect` (zonos stačiakampis iš `[data-tut="units-<side>"]`), be projektilų, `multiShake`.
2. **`aoeMode`** — paketas turi ≥ 2 `damage` įvykius: projektiliai vis tiek šaunami kiekvienam, bet papildomai paleidžiama viena bendra `aoeWave` banga (kad nebūtų 5 atskirų blyksnių).
3. **`field` įvykis** — lauko korta: auksinė banga nuo centro.

Kvietimas: `spawn({ kind: 'aoeWave', from, rect, color, duration: 1.7, variant: aoeVariant() })`, kur `aoeVariant()` verčia `projectileType` → `AoeVariant` (`fireball→fire`, `lightning→lightning`, `freezeBurst→ice`, `poisonGlob→poison`, `darkCurse→curse`, `arrow→arrow`, `healingGlow→heal`, kitaip `generic`).

Gydymo AoE — atskiras iškvietimas su `variant:'heal'`, spalva `#5ef0c0`.

### B5. PRAKEIKSMAI (curse)

**Kur:** `TutorialGame.tsx`, `case 'curse'` (~2405 eil.) · demono piešimas `src/lib/game/curseDemonFx.ts`.

Du skirtingi dalykai (nesupainioti):
- **Injekcija** (`triggerCurse`) — prakeiksmas įmetamas į aukos kaladę. FX: `curseMark` skrenda nuo šaltinio kortos į **aukos kaladę** (`[data-pile="deck-<opp>"]`), violetinė `#a855f7`, 1.4 s.
- **Aktyvacija** (`onCurseDrawn`, log raktas `battleLog.curseDrawn*` arba `curseForced`) — prakeiksmas ištrauktas ir suveikia. FX seka:
  1. **Showcase**: prakeiksmo korta atskrenda nuo aukos kaladės ir rodoma **2200 ms** (`showcaseHold = SETTLE + fxSeq + 2200`). `showcaseHold` — svarbiausias mechanizmas: visi kiti to paketo efektai (ŽMK, projektiliai, pop-up'ai) atidedami tiek pat.
  2. **Prakeiksmo demonas** ant taikinio: `spawn({ kind:'curseDemon', to, rect, color:'#a855f7', duration: 2.5 })` — juodi dūmai + besijuokiantis ugnies veidas.
  3. **Zonos euristika** — kur dėti demoną: žiūrima į tolesnius paketo įvykius (aukos padarų uid'ai) ir į kortos `onCurseDrawn` mapping'ų `target`; rezultatas `aoe | unit | hand | deck | grave | avatar`.

Šoninė prakeiksmų kaladė, jos kūrimas ir taisyklės — `supabase` pusėje + `is_side_deck` kortose (žr. atmintį „curse side deck").

### B6. REAKCIJOS — vienintelis sluoksnis su GAMEPLAY VARTAIS

**Failas:** `src/components/tutorial/ReactionChainLayer.tsx` · trukmės `src/lib/game/timing.ts`.

```ts
play(opts): Promise<void>   // Promise išsisprendžia, kai LEIDŽIAMA taikyti žaidimo būseną
cancel(): void              // promise vis tiek išsisprendžia – eilė neužstringa
busy(): boolean
```

**Fazės (`REACTION_CHAIN_PHASES`, ms):**

| fazė | ms | kas |
|---|---|---|
| `detect` | 350 | reakcijos korta atsiverčia, rune flare, taikinys pradeda švytėti |
| `chain` | 1000 | strėlės antgalis priekyje, grandys velkasi Bezier trajektorija |
| `wrap` | 650 | smūgis, 2 kilpos apsivynioja, susiveržimas (kortos squash 0.94) |
| `showcase` | 1200 | reakcijos kortos parodymas; **būsena DAR netaikoma** |
| `effect` | 700 | grandinė subyra; **ČIA** taikoma būsena + efekto VFX |

`REACTION_CHAIN_GATE_MS = 3200` (detect+chain+wrap+showcase) — iki šio momento gameplay laukia.
`REACTION_CHAIN_TOTAL_MS = 3900`. Kompaktas (2-a ir vėlesnės tos pačios kovos reakcijos) ~2400 ms. Reduced-motion → 900 ms.

**Kritiniai dalykai:**
- Keli taikiniai → kiekvienas gauna **savo** grandinę su savo trajektorija (stagger'is, bet kilpų mastelis ribojamas kortos dydžiu).
- `ReactionChainTarget.track?: () => box` — gyvas pozicijos getter'is; sluoksnis persimatuoja **kiekvieną kadrą**, nes ką tik iškviesta korta dar juda (framer-motion spring). Be to outline lieka šalia kortos.
- Variantai: `shadow` (violetinis) ir `infernal` (raudonas — demonų/ugnies frakcijoms).
- Reakcijos vieno taikinio efektas be rankinio pasirinkimo pirmiausia taikomas **trigerio šaltiniui**, jei jis patenka į mapping'o taikinių aibę (`ctx.triggerSource`).

### B7. Kiti sluoksniai (kontekstui)

- **`CardStatusVfxLayer`** (`src/components/tutorial/CardStatusVfxLayer.tsx`) — 13 statusų (shield, frozen, burning, poisoned, silenced, blessed, stealth, taunt, sprint, control, cantAttack, immortal, stunned), idle + one-shot (`apply/trigger/remove/destroy`), registras `src/lib/game/statusVfx.ts`, dev peržiūra **`/dev/status-vfx`**, e2e `e2e/status-vfx.spec.ts`. Limitas 2 idle efektai vienu metu pagal prioritetą.
- **`SummonBurst`** (`src/components/tutorial/SummonBurst.tsx`) — ~25 unikalių iškvietimo scenų (eclipse, voidRip, frostNova, bloodRitual…), kiekviena 2,0–2,4 s, anticipation→impact→aftermath. Etalonas, kaip atrodo „gera" scena šiame projekte.
- **`ZmkSpecial`** (`src/components/tutorial/ZmkSpecial.tsx`) — ×2 „kritinis" ir ×0 „nesėkmė" prezentacijos (`ZMK_PRESENT` trukmės).

### B8. Laiko juosta viename pakete (kaip viskas sustoja į eilę)

```
showcaseHold   – prakeiksmo/burto showcase (2200 ms) – atideda VISKĄ po savęs
SETTLE         – 800 ms, kai pakete yra play/champion/artifact (korta nusėda)
fxSeq          – didėjantis poslinkis (80–120 ms) kiekvienam efektui, kad neitų vienu metu
hpHold         – HP skaičius kortoje laikomas senas iki smūgio callback'o
```

Jei reikia „parodymas → tik tada žala", **nedaryk naujų setTimeout'ų gameplay pusėje** — arba naudok reakcijų grandinės Promise vartus, arba pridėk delsą prie `SETTLE` (taip buvo daroma 706, kuris atšaukiamas) ir leisk `hpHold` prilaikyti skaičius.

### B9. Kas žinotina apie ŽMK (modifikatorių kaladė)

- Kiekviena žala eina per ŽMK — tai Ravenof kovos parašas. 20 kortų kaladė, reikšmės `+0 +1 +2 -1 -2 x2 x0` (`zmk_cards` lentelė, `ZMK_IMG` fallback `/rules/zmk/*.webp`).
- `zmkFlash` state'as laiko `{ placed: [{v, side, x, y}], n }` — pozicija (`x,y`) užpildoma **žalos** case'e (`if (dp && pendingZmk.length)`), t. y. ŽMK visada rodomas prie realaus taikinio.
- `zmkRoll` — pranašumo/nepalankumo traukimas (2 kortos, nepanaudota subyra), 1900 ms.
- ×2/×0 → `ZmkSpecial` + `ZmkReshuffleFlash` (kaladė permaišoma).
- Kaladės DOM: `renderPile(... { back: 'zmk' })`. **706 buvo pridėjęs `data-pile="zmk-you"/"zmk-ai"`** — po rollback'o to nebeliks; jei naujam darbui reikia kaladės pozicijos, selektorių teks pridėti iš naujo.

### B10. Patikros ir paleidimas

```powershell
npx tsc -p tsconfig.json --noEmit          # turi būti švaru (išskyrus senus _to_delete/ triukšmus)
npx eslint src/components/tutorial/<failas>.tsx
npm run progression:check                   # ekonomikos/progresijos validatorius
.\check-build.bat                           # pilnas build
```

Release: `APP_VERSION` (`src/lib/version.ts`) **privalo** būti naujas skaičius — bundle'ai nekeičiami → `.\release.bat --notes-lt "…" --notes-en "…"` → `/admin/releases` → „Patvirtinti → tester".

Peržiūros failai (HTML, atidaromi naršyklėje, be build'o):
`ravenof-fx-preview-reaction-chain.html` (aprobuotas reakcijų etalonas) · `fx-summon-preview.html` · `ravenof-fx-preview-keywords.html` (705/706 darbas).

---

## C. Ką pasakyti kitam modeliui

Trumpas brief'as, jei perduodi užduotį toliau:

> Ravenof — LT kortų žaidimas (Next.js + Supabase, mobile-first, Android WebView per Capacitor). Kovos ekranas: `src/components/tutorial/TutorialGame.tsx` (~6000 eil., liesti atsargiai). Efektai piešiami canvas sluoksniuose, koordinatės iš DOM. **Našumas kritinis** — jokio `shadowBlur`, vienas rAF sluoksniui, dalelių biudžetas pagal įrenginį.
>
> Reikia (tai, kas nepavyko 705/706):
> 1. **ŽMK traukimas:** nugarėlė atskrenda nuo ŽMK kaladės prie taikinio → flip ties taikiniu → rezultatas rodomas 1,5 s → **tik tada** skaičiuojama ir rodoma žala bei krenta gyvybės.
> 2. **Kovos šūksnis / Paskutinis noras / Trigeris:** vienoda chronologija, efekto pavadinimas rodomas **prie taikinio** (ne prie kasterio) ~2 s, po to žala. Kokybės kartelė — `ReactionChainLayer` ir prakeiksmų efektai.
>
> Ankstesnis bandymas atšauktas, nes kovoje atrodė padrikai ir per lėtai. Prieš rašant kodą — padaryti standalone HTML peržiūrą (kaip `ravenof-fx-preview-reaction-chain.html`) ir suderinti ją su savininku.

---

*Parengta 2026-09-20. Eilučių numeriai apytiksliai — po rollback'o pasislinks.*
