# Ravenof Digital — optimizacijos (2026-07-02)

## Padaryta (commit336)
1. **Flames fonas** — didžiausias baterijos vartotojas: buvo 5 dideli blur(40px) +
   `mix-blend-mode: screen` sluoksniai su 1.6–3.6 s animacijom → dabar 3 sluoksniai,
   be blend mode, 2.6–5.2 s animacijos, `will-change`, gerbiamas
   `prefers-reduced-motion`, ir naujas **Nustatymai → „Fono efektai"** jungiklis
   (išjungus — statinis gradientas, ~0 GPU).
2. **Muzika fone** — `musicManager` dabar pristabdo grojimą, kai app/tab pereina
   į foną (`visibilitychange`), grįžus tęsia. Anksčiau muzika grojo visą laiką.
3. **Notifikacijų polling** — kas 12 s tinklo užklausa nebedaroma, kai app fone.
4. **Header backdrop-blur** — nuolatinis `backdrop-filter: blur(10px)` (brangus
   mobiliame GPU, perkomponuojamas kiekvieną scroll kadrą) pakeistas tankesniu
   pusiau permatomu fonu.
5. **`.rvn-glow`** — animavo `box-shadow` (paint kiekvieną kadrą). Dabar statinis
   šešėlis ant `::after`, animuojama tik `opacity` (kompozitorius, GPU-cheap).
6. **Užklausų mažinimas** — profilio užklausa nebe kiekvieną route pakeitimą, o tik
   mount + window focus; route keitimas daro tik pigią head-count užklausą.
7. **Vaizdai** — sunkūs sąrašų thumb'ai su `loading="lazy"` + `decoding="async"`
   (kolekcijos knyga jau montuoja tik 9 kortas vienu metu).

## Rekomendacijos ateičiai (nedaryta)
- **Kortų vaizdų dydžiai**: Supabase Storage transformacijos (`?width=200`) thumb'ams —
  dabar pilno dydžio vaizdai traukiams į 38–92 px langelius. Didžiausias likęs laimėjimas
  tinklui/atminčiai.
- **Battle FX**: kovose BattleFxLayer canvas — patikrinti, ar rAF ciklas sustoja, kai
  nėra aktyvių efektų (idle metu turi būti 0 darbo).
- **PremiumCinematics video**: `preload="none"` kol nepaleistas.
- **Low battery režimas**: `navigator.getBattery()` → automatiškai išjungti Flames/
  cinematics kai <20 %.
- **Supabase realtime vietoj polling** notifikacijoms (1 websocket vietoj kas 12 s query).
- **next/image** su remote loader kortų vaizdams (dabar raw <img>).

## Backup / revert
`backup-now.bat` — sukuria: backup commit (visi nepakomituoti failai), šaką
`backup/<data>`, tag'ą `backup-<data>`, push'ina ir padaro zip kopiją
`..\ravenof-backup-<data>.zip` (src/public/supabase).
Revert: `git reset --hard backup-<data>` arba `git checkout backup/<data>`.
