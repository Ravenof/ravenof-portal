# Mūšio garso efektai (mp3)

Įkelk mp3 čia (`public/sounds/battle/`). FILE-FIRST su variantais: kiekvienam garsui
gali padėti vieną failą (`attack.mp3`) ARBA kelis variantus (`attack-1.mp3`,
`attack-2.mp3`, `attack-3.mp3`) — grojamas atsitiktinis. Failo nesant — sintezuotas
fallback (kodo keisti nereikia).

## Failų vardai (base ARBA -1..-6 variantai)
- `attack` — ataka
- `spell-cast` — burto metimas
- `impact` — smūgis/žala
- `draw` — kortos traukimas
- `curse` — prakeiksmas
- `field` — lauko korta
- `heal` — gydymas
- `freeze` — užšaldymas
- `death` — padaro mirtis
- `summon` — padaro iškvietimas
- `zmk-flip` — ŽMK apvertimas
- `champion-skill` — čempiono gebėjimas
- `explosion` — sprogimas (DEVASTATING smūgiai)
- `zmk-crit` — ŽMK ×2 „Kritinis smūgis" (game-feel fazė 7)
- `zmk-fizzle` — ŽMK ×0 „Visiška nesėkmė" (game-feel fazė 7)

> Reakcijų grandinės garsai gyvena ATSKIRAME kataloge: `public/sounds/reaction/`.
> Pilnas trūkstamų garsų sąrašas su prioritetais — `SOUND-TODO.md` repo šaknyje.

Pvz.: `attack.mp3` arba `attack-1.mp3` + `attack-2.mp3` + `attack-3.mp3`.

## Rekomendacijos
Trumpi (0.2–1 s), mono, ~96–128 kbps. Pastaba: kortų **summon balsai** (per-kortos,
įkeliami per admin) tvarkomi atskirai — žr. voiceManager / VoiceLinesUpload.

---

## 757 papildymas (2026-11-11) — manifestas ir nauji raktai

**Svarbu:** garso variklis nebespėlioja failų vardų. Esamų failų sąrašas sugeneruojamas į
`src/lib/game/soundManifest.json` (`tools/gen-sound-manifest.mjs`) — automatiškai prieš
`npm run dev / build / app:build`. Įkėlus naują mp3 rankiniu būdu: `npm run sounds:manifest`
ir **įtrauk į git ir mp3, ir manifestą**. Patikra: `npm run game:test:sounds` (parodo, kurie raktai dar be savo failo).

Variantai kaip anksčiau: `vardas.mp3` ARBA `vardas-1.mp3`, `vardas-2.mp3`, … (skaičius neribojamas).

Nauji raktai (kol failo nėra — skamba nurodytas pakaitalas):

| Failas (battle/) | Įvykis | Kol nėra failo |
|---|---|---|
| `puff.mp3` ✅ yra | 0 žalos smūgis (skydas, imunitetas, ŽMK ×0) | — |
| `gold-1..3.mp3` ✅ yra | auksas iš efekto | — |
| `buff.mp3` | +ATK / +HP | tyli sintezė |
| `debuff.mp3` | −ATK / −HP, aukso praradimas | tyli sintezė |
| `turn-start.mp3` | tavo ėjimo pradžia | tyli sintezė |
| `turn-start-enemy.mp3` | priešininko ėjimo pradžia | tyli sintezė |
| `turn-end.mp3` | „Baigti ėjimą" mygtukas | tyli sintezė |
| `return-hand.mp3` | padaras grįžta į ranką | tyli sintezė |
| `shield-up.mp3` | Magiško skydo uždėjimas | tyli sintezė |
| `shield-break.mp3` | skydas sugeria smūgį | `freeze` |
| `status-burn.mp3` | padegimas | `impact` |
| `status-stun.mp3` | apsvaiginimas | `impact` |
| `status-poison.mp3` | apnuodijimas | `curse` |
| `status-silence.mp3` | nutildymas | `curse` |
| `reaction-set.mp3` | reakcija padedama į vietą | `impact` |
| `battlecry-sting.mp3` | Kovos šūksnio scena | `summon` |
| `lastwish-sting.mp3` | Paskutinio noro scena | `curse` |
| `trigger-sting.mp3` | trigerio scena | `spell-cast` |
| `fatigue.mp3` | nuovargio žala (tuščia kaladė) | `impact` |

Techninė pusė: garsai grojami per WebAudio buferius — tas pats garsas gali persidengti,
o kiekvienas grojimas gauna ±5 % aukščio variaciją (išskyrus sting'us ir ėjimo signalus).
