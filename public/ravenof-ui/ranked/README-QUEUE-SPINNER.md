# Ranked matchmaking rato asset'as — `queue-spinner.png`

Kelias: `public/ravenof-ui/ranked/queue-spinner.png`
Kol failo nėra — UI rodo seną generinį spinner'į (onError fallback). Įdėjus failą, jis
automatiškai sukasi su motion blur, kibirkštimis ir dūmais (RankedQueue.tsx `QueueSpinner`).

## Specifikacija
- **Formatas:** PNG su PERMATOMU fonu (be jokio fono!)
- **Dydis:** 512×512 px (UI rodo ~76 px, bet reikia atsargos retina ekranams)
- **Kompozicija:** TOBULAI centruotas apskritas emblemos ratas, užimantis ~92 % drobės
- **KRITIŠKAI SVARBU — sukimuisi:**
  - apšvietimas be krypties (jokio „šviesa iš viršaus" šešėlio — ratas suksis!)
  - radialiai simetriškas ornamentas (runos/dantys ratu), kad sukimasis atrodytų tolygus
  - jokio teksto, jokių vandens ženklų
- **Stilius:** dark fantasy, kaip Ravenof monetos asset'ai — sendintas tamsus metalas
  (juodintas plienas / bronza), AUKSINIS varno siluetas centre, rune-graviruotas žiedas,
  vos rusenančios žarijos grioveliuose. Aukso akcentas #F0B429 / #D4A33B, fonas — skaidrus.

## ChatGPT / DALL-E promptas (kopijuok visą)

Create a single game asset: an ornate circular dark-fantasy emblem wheel, PNG with fully
TRANSPARENT background, 512x512, perfectly centered, the circular emblem filling ~92% of
the canvas. Style: grim dark fantasy card game (like a premium Hearthstone-quality prop),
aged blackened steel and bronze ring engraved with small angular runes arranged RADIALLY
and EVENLY around the rim (radial symmetry, repeating pattern), with faint smoldering
ember glow (deep orange) inside the engraved grooves. In the center: a stylized GOLDEN
RAVEN head silhouette in profile (elegant, sharp beak, ornamental), gold color #F0B429
with darker gold #D4A33B shading. CRITICAL: absolutely NO directional lighting or
drop shadows (the wheel will be rotated in-game, lighting must look identical at any
angle) — use flat/ambient metallic shading only. NO text, NO watermark, NO background,
crisp clean edges, high contrast, centered composition, video-game UI asset quality.
