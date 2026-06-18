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

Pvz.: `attack.mp3` arba `attack-1.mp3` + `attack-2.mp3` + `attack-3.mp3`.

## Rekomendacijos
Trumpi (0.2–1 s), mono, ~96–128 kbps. Pastaba: kortų **summon balsai** (per-kortos,
įkeliami per admin) tvarkomi atskirai — žr. voiceManager / VoiceLinesUpload.
