# Reakcijų grandinės garsai

Šiame kataloge laukiami mp3 failai. Kol jų nėra, `soundManager` groja
sintezuotus fallback'us iš `src/lib/ui-sound.ts` (žaidimas skamba ir be assetų).

| Failas | Fazė | Charakteris |
|---|---|---|
| `launch.mp3` (`launch-1..2`) | detect | platus swoosh, grandinė paleidžiama |
| `impact.mp3` (`impact-1..2`) | wrap | metalinis smūgis, trumpas transientas |
| `tighten.mp3` (`tighten-1`) | wrap | kylantis girgždesys, grandinė įsitempia |
| `shatter.mp3` (`shatter-1..2`) | effect | sudužimas, ilgesnis gesimas + žemas bumbtelėjimas |

Rekomendacijos: 44.1 kHz mono, −6 dBFS peak, be tylos pradžioje (transientas
turi sutapti su fazės pradžia). Trukmės: launch ≤ 400 ms, impact ≤ 250 ms,
tighten ≤ 450 ms, shatter ≤ 700 ms.

`effect` fazėje muzika automatiškai nutildoma −3 dB 80 ms (`duckMusic`).
