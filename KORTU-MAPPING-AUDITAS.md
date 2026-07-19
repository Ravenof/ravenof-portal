# Kortų mappingų auditas (2026-07-18)

Peržiūrėta: **456 aktyvių kortų** (391 su gameplay konfigūracija). Tikrinta pagal variklio
taisykles: negyvi trigger'iai, scope klaidos, trūkstamos reikšmės, tuščios auros, konfliktai.

## 🔴 Tikri bug'ai (efektas neveikia arba veikia priešingai)

| Korta | Problema | Rekomendacija |
|---|---|---|
| **Gazzaros žymė** (Prakeiksmas) | Mapping `onAnyStatus` – prakeiksmo aktyvacija vyksta TIK per `onCurseDrawn`; dabar niekada nesuveikia | Pakeisti trigger į „Kai auka ištraukia šį prakeiksmą" |
| **Belzatoro akis** (Prakeiksmas) | `onPlay` – prakeiksmai nežaidžiami, tik ištraukiami; nesuveikia. Be to `revealOwnDeck` rodo KERĖTOJO kaladę, ne aukos | Trigger → `onCurseDrawn`; efektą peržiūrėti (gal `revealEnemyDeck`?) |
| **Pikti liežuviai** (Prakeiksmas) | Nėra `onCurseDrawn` mapping'o – aktyvacija neįvyks | Trigger → `onCurseDrawn` |
| **Juodieji pirštai** (Burtas) | `chooseEffect` be variantų (chooseOne tuščias) – pasirinkimas nieko nedaro, iškart vykdo `then` (parodo 6 SAVO kaladės kortas) | Admin'e supildyti „Pasirink 1 iš kelių" variantus |
| **Laivo apskaita** (Burtas) | `passiveAura.auraCostReduction: 100` – burtas niekada nebūna lauke, aura NEGYVA | Pakeisti į naują efektą **turnCostDiscount** (šį ėjimą kortos −100, min Y) |
| **Ugninė valia** (Burtas) | `extraAttacks: {base: 2}` – tai statinis PADARO laukas, burtui negyvas; mappingų nėra | Reikia sumapinti; „taikinys gauna +2 atakas šį ėjimą" efekto variklyje NĖRA – jei reikia, pridėsiu |
| **Gynybiniai įtvirtinimai** (Laukas) | `passiveAura.auraKeywords: [taunt] scope=all` – auros skenuojamos tik iš PADARŲ/ARTEFAKTŲ lauke, lauko kortos aura NEGYVA | Intencija „visi padarai gauna taunt"? Reikėtų lauko pasyvo variklyje – galiu pridėti |
| **Svantonas Lazaras** | `auraCostReduction: 100 scope=enemy` (pigina PRIEŠO kortas) | Sutvarko `supabase/patch_svantonas_lazaras.sql` |

## 🟡 Įtartina (peržiūrėk – gali būti tyčia)

- **Skrajūnas Gaggar'as** – `damage` į VISUS SAVUS padarus (aoe self-damage; tyčia?)
- **Demoniška akistata** – destroy savo padarą + heal 5 → panašu į TYČINĘ auką, OK
- **Kryžkėlės Demonas**, **Doriana Ugningoji** – `then` grandinėje žala/destroy savam (gali būti kaina, patikrink)
- **Guknuk'as Baliauninkas** – coinFlip šakose `drawCards`/`discard` be value (naudos default 1; jei norėta daugiau – supildyk)
- **Nepailstantysis Zird'as** – coinFlip raudonoje šakoje `discard` be value
- **Keistos šviesos** – atrodo kaip „buffAttack priešui", bet turi `targetTypes: [ownUnit]`, kuris PERRAŠO target – realiai buffina savą. Veikia OK, bet `target: enemyUnit` laukas klaidinantis – verta išsivalyti admin'e

## 🧹 Tuščios auros (šiukšlės, poveikio nulis – verta išvalyti)

Tėvas Konstancijus, Ginklų sandėlis, Bernardas Gynėjas, Kapitonas Arnulfas, Ugninė valia,
Platusus laukas, Atgalinis smūgis, Oglor'as Klaidintojas — `passiveAura` objektas be jokio
aktyvaus lauko (dažniausiai liko `{}` arba tik `auraScope`). Nekenkia, bet klaidina admin'e.

## 📋 Pažymėtos „reikia sumapinti" (needsEffectMapping=true, bet tuščios) — 11

Raiden, Užnugario ataka (Reakcija), Skausmo šauklys, Harpija, Sunkusis riteris, Toguchi,
Kūnų rijikas, Velnio advokatas, Oriko, Keihito, Zordakas Brutalusis

## ℹ️ Be gameplay konfigūracijos — 65 kortos

Daugiausia paprasti padarai be efektų (normalu vanilla kortoms) + keli Čempionai
(Inžinierius Skrag'as ×3, Kapitonas Juodasmakris ×3) ir Plėšikų nakties burtai/artefaktai
(Kapitono Paslaptis, Prakeiktas auksas, Grobio dalybos, Jūros šmėklos lobis ir kt.) —
jei šie turi tekstinius efektus, juos reikės sumapinti.
