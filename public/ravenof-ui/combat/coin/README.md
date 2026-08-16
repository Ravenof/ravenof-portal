# Monetos metimo (coin toss) asset specifikacija

## Failai (file-first: įdėjus naudojami automatiškai, kodo keisti nereikia)

| Failas | Pusė | Reikšmė |
|---|---|---|
| `coin-green.png` | ŽALIA | Tu pradedi pirmas |
| `coin-red.png`   | RAUDONA | Priešininkas pradeda pirmas |

## Techniniai reikalavimai

- **Formatas:** PNG su permatomu fonu (arba WebP; tada pakeisk plėtinį kode).
- **Dydis:** 512×512 px (min. 256×256). KVADRATAS – abu failai vienodo dydžio.
- **Forma:** monetos diskas turi UŽPILDYTI beveik visą drobę (rekomenduojama
  ~96–100 % pločio). Kodas apkerpa į apskritimą (`border-radius: 50%` +
  `object-fit: cover`) – kas už apskritimo ribų, bus nukirpta, o per mažas
  diskas paliks permatomus kampus su keista apkarpymo riba.
- **Centravimas:** disko centras = drobės centras (abiejuose failuose identiškai,
  kitaip flip'o metu moneta „šokinės").
- **Orientacija:** ABU vaizdai piešiami normaliai („viršus viršuje"). Vertimas
  vyksta 3D rotateX – kodas pats pasuka nugarėlę, veidrodinti nereikia.

## Dizaino gairės (kad gerai atrodytų žaidime)

- Ekrane moneta rodoma ~132 px skersmens – **stambus, aiškus centrinis
  simbolis/herbas**, jokių smulkių detalių ar teksto.
- Metalinis rėmelis/kraštas pageidautinas (dark-fantasy stilius, dera prie
  aukso #f0b429 akcentų).
- Spalvinis kodas turi būti akivaizdus iš pirmo žvilgsnio: žalia pusė –
  žalsvi tonai (žaidėjo spalva #4ade80 kryptis), raudona – raudoni (#ef4444).
- **Nekepti išorinio glow/šešėlio į patį failą** – žaidimas pats prideda
  žalią/raudoną švytėjimą ir šešėlį po moneta.
- Apšvietimas: švelnus highlight viršuje-kairėje dera su fallback'o stiliumi.

## Kur naudojama

Kovos pradžios monetos metimo overlay (TutorialGame). Trukmės – `COIN_TOSS`
konstantos `src/lib/game/timing.ts`. Failų nesant rodomas sintezuotas
fallback'as (žalias ⚔ / raudonas ☠ diskas).
