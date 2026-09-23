# Kortų mappingų auditas (2026-09-23)

Šaltinis: gyva prod DB (`cards`, 568 kortos: 527 active, 41 hidden), patikrinta pagal `src/lib/game/types.ts` ir variklio elgesį (`triggerSystem.ts`, `fieldEngine.ts`, `tutorial/engine.ts`).
Rekursiškai tikrinti visi mappingai: effectMappings, fieldEffectConfig.triggers, artifactEffectConfig, championSkillConfig, then / noTargetThen / chooseOne / chooseAlt / coinGreen / coinRed.

## 🔴 Sulaužyti mappingai (efektas neveikia)

| Korta | Problema |
|---|---|
| **Pikti liežuviai** (Prakeiksmas) | Vienintelis mappingas `onPlay` → prakeiksmai nežaidžiami, niekada nesuveiks. Reikia `onCurseDrawn`. *(buvo ir liepos audite)* |
| **Klykianti siela** (Prakeiksmas) | eM[1] „iškviečia Impą" ant `onPlay` → niekada nesuveiks. Reikia `onCurseDrawn` (+ sąlyga: aukos rankoje ≥3). |
| **Juodieji pirštai** (Prakeiksmas) | `chooseEffect` be variantų — pasirinkimas tuščias. *(buvo liepos audite)* |
| **Inžinierius Skrag’as** (Čempionas) | 1 gebėjimo `coinFlip` raudonoje šakoje mappingas be `effect` (tik target/trigger). |
| **Didžioji Aelotės menė** (Laukas) | Mappingas `effectMappings` masyve — lauko kortoms variklis jo nevykdo (skaito tik `fieldEffectConfig`). Tikrasis efektas („burtai/prakeiksmai įmaišomi atgal") nesumapintas. |
| **Gynybiniai įtvirtinimai** (Laukas) | `passiveAura.auraKeywords` lauko kortai — negyva. *(liepos audite)* |
| **Tylos katedra** (Laukas) | `passiveAura.auraSilence` lauko kortai — negyva. Turėtų būti `fieldEffectConfig.passive.globalSilence`. |
| **Ugninė valia** (Burtas) | `extraAttacks` burtui — negyva. *(liepos audite)* |
| **Magmos širdis** (Artefaktas) | `extraAttacks` artefaktui — tikriausiai negyva (skaitoma padarams). |

## 📋 Be mappingų, nors kortoje yra efektas

**Pažymėtos „reikia sumapinti", mappingų nėra (45):**
Aidų tarpeklis, Alchemikų fortas, Eldoras sielų meistras, Fururuno, Gilez’as*, Ginklų sandėlis, Griausminė Grikštė, Gydūnė Džilė, Gynybiniai įtvirtinimai, Harpija, Helga, Isekono, Isodera, Jarot’as, Jungos plunksna, Kapitono Teleskopas, Keihito, Kenji, Kenjutsu, Klausas, Kūnų rijikas, Ledo kristalas, Meistras Domura, Mirties Pelkė, Narigawa, Oriko (BASE-043), Platusus laukas, Raiden, Rinso, Senasis golemas, Seras Goldbergeris, Šėšėlio batai, Siauras skersgatvis, Skausmo šauklys, Sunkusis riteris, Toguchi, Tomis Svyids, Tylos katedra, Ugninė valia, Uramami, Užmirštųjų miškas, Velnio advokatas, Yoruichi Paslaptingoji, Zabelx’as, Zordakas Brutalusis.

\* Kai kurios (pvz. Gilez’as) jau turi pasyvą (`secondAttackVsShield`) — joms tiesiog liko nenuimta varnelė „reikia sumapinti".

**Visai be gameplay konfigūracijos, bet su efekto tekstu:** Apgaulingos taktikos (Burtas), Lignag’as garsusis (Padaras), Sprogmenų dėžutė (Artefaktas), [hidden] Vėliavnešys Aurėjas (turi `gameplay.passive` ne vietoje).

## 🟡 Patikrink (gali būti klaida)

- **value = 0:** Gunteris Narsusis (`buffHealth 0`), Leisk man! (`then: debuffHealth 0`), Morganas Greivsas (`then: buffAttack 0`).
- **Be value (naudos default 1):** Guknuk’as Baliauninkas (coinGreen drawCards, coinRed discard), Nepailstantysis Zird’as (coinRed discard), Paslaptinga skrynelė (coinRed drawCards), [hidden] Tamsos ženklas (triggerCurse).
- **Žala saviems (tikriausiai tyčia):** Atgalinis smūgis, Jungos agonija, Kryžkėlės Demonas, Skrajūnas Gaggar’as.

## 🧹 Šiukšlės (poveikio nėra, bet klaidina admin'e)

- `gameplay` šaknyje likę `trigger/effect/target/then` laukai (tikri mappingai yra `effectMappings`): Oglor’as Klaidintojas, Rajūnas Pak-erael’is, Regnaras Mėgdžiotojas, Zorzok’as Alkanasis.
- Aukso kasykla (Laukas): negyvas `shield onAttack` mappingas + `keywords`.
- `keywords` ne padarų kortoms: Kabum!, Keistos šviesos, Kojos spastai.
- Tuščios `passiveAura`: Ginklų sandėlis, Isekono, Oglor’as Klaidintojas.
- **74 burtai be `spellType`** — `onAnyCast` filtrai su `triggerSpellType` jų nemato.

## ℹ️ Kita

- Pasikartojantys pavadinimai (ne čempionų fazės): Oriko ×2, Pelkių velnias ×2, Jakz’as ×2, Liepsnos antspaudas ×2, Dorianos golemas ×2 — verta patikrinti, ar ne dublikatai.
- 20 kortų su `gameplay = null`; dauguma — vanilla padarai be efekto (OK).
