# PERRAŠYTI 7 BALSO FAILUS (Tutorial V3, commit638)

> Balsas: **Senasis Korvas** — Eleven Multilingual v2, Stability 50, Similarity 75,
> Style 30, Speaker boost ON, Speed 0.95. Formatas: **mp3, mono, 44.1 kHz, 96 kbps**
> (kaip ir kiti 80 failų). Įkelti: Supabase Storage → bucket `card-audio` → aplankas `tutorial/`,
> perrašant senus (upsert). Failo vardas — BE `tut-` prefikso.

Kiti 80 failų NEKEIČIAMI — jų tekstas nepasikeitė.

---

## `l1-s10.mp3`

*Kodėl keičiam:* ATK simbolis: kardas -> ZVAIGZDE

Tekstas (kopijuoti į ElevenLabs):

> Žvaigždė — atakos jėga. Tiek žalos ji kirs priešui.

---

## `l2-s03.mp3`

*Kodėl keičiam:* Zuves padaras VIS TIEK kerta atgal (zala vienu metu)

Tekstas (kopijuoti į ElevenLabs):

> Priešas krito. Bet pažvelk į savo karį — jis irgi kruvinas. Ravenof'e smūgiai kertami vienu metu: net mirdamas gynėjas spėja atsakyti. Vienintelis, kuris neatsako — sušaldytas.

---

## `l2-s04.mp3`

*Kodėl keičiam:* "gyva padara" -> bet kuri padara, nesvarbu ar isgyvena

Tekstas (kopijuoti į ElevenLabs):

> Bet dabar klausyk atidžiai, nes čia žūsta naujokai. Kai puoli padarą — jis kerta atgal. Tu gauni jo atakos žalą, nesvarbu, ar jis išgyvena. Kiekviena ataka yra mainai.

---

## `l4-s02.mp3`

*Kodėl keičiam:* Auka: 2 kortos is rankos ARBA 1 padaras nuo lentos

Tekstas (kopijuoti į ElevenLabs):

> Čempionas — ne eilinis karys. Jis reikalauja aukos: dvi kortos iš rankos arba vienas tavo padaras nuo lentos. Rinkis atsargiai... arba atšauk, jei suabejosi — mygtukas apačioje.

---

## `l4-s05.mp3`

*Kodėl keičiam:* Faze = atskira korta; 1 faze privalo stoveti lentoje

Tekstas (kopijuoti į ElevenLabs):

> Čempionas auga ne pats. Antra fazė — atskira korta iš rankos: sumoki jos auksą ir vėl paaukoji. Bet įsidėmėk: pirmoji fazė privalo stovėti lentoje, kitaip antroji neateis. Trečioji — lygiai taip pat. Sužaisk antrąją fazę.

---

## `l4-s08.mp3`

*Kodėl keičiam:* Fazes TIK aukstyn; keitimas i zemesne veikia TIK rankoje

Tekstas (kopijuoti į ElevenLabs):

> Ir dar viena gudrybė. Ištraukei trečią fazę, o čempiono lentoje dar nėra? Rankoje tą kortą gali iškeisti į žemesnę tos pačios giminės fazę — ji ateina iš kaladės ar kapinyno, kad išvis galėtum jį pašaukti. Bet įsidėmėk: jau stovinčio lentoje čempiono nuleisti žemyn negali. Fazės eina tik aukštyn.

---

## `l6-s04.mp3`

*Kodėl keičiam:* Nuodai dar ir NEPALANKI ataka (2 ZMK, galioja blogesne)

Tekstas (kopijuoti į ElevenLabs):

> Nuodai ir ugnis ėda gyvybes kas ėjimą, po truputį. Bet nuodai kerta dukart: apnuodytas padaras dar ir puola nepalankiai — jam traukiamos dvi likimo kortos, o galioja blogesnė. Lėta mirtis — bet mirtis.

---

## Automatinis kelias (jei turi API raktą)

```
node tools/tutorial-voice-generate.mjs --only l1-s10,l2-s03,l2-s04,l4-s02,l4-s05,l4-s08,l6-s04 --force --upload
```
