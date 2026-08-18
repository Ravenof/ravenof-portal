# TUTORIAL V3 — balso scenarijus (ElevenLabs)

> Auto-generuota: `npm run tutorial:voice`. Šaltinis — `src/data/tutorialLessons/lessonSeeds.ts`.
> Balsas: **Senasis Korvas** (Eleven Multilingual v2; Stability 45–55, Similarity 75, Style 25–35,
> Speaker boost ON, Speed 0.95). Failai: mp3 44.1 kHz, mono, ~96–128 kbps, −16 LUFS.
> Įkėlimas: Supabase `card-audio` → aplankas `tutorial/`.

**Iš viso eilučių: 87**


## 1. Mūšio laukas

| Failas | Tekstas (kopijuoti į ElevenLabs) |
|---|---|
| `tut-l1-s01.mp3` | Sveikas atvykęs į Ravenof, mokiny. Aš — Senasis Korvas. Kadaise vedžiau kariuomenes per šiuos prakeiktus kraštus... o dabar vesiu tave. Nebijok — pradėsime nuo pačių pamatų. |
| `tut-l1-s02.mp3` | Štai tavo gyvybės. Keturiasdešimt. Kai jos pasieks nulį — kova baigta. Saugok jas labiau nei auksą. |
| `tut-l1-s03.mp3` | O čia — priešininko gyvybės. Mūsų tikslas paprastas: nukalti jas iki nulio. |
| `tut-l1-s04.mp3` | Tai tavo aukso atsargos. Auksas čia — ne turtas, o kvėpavimas. Kiekviena korta kainuoja aukso. |
| `tut-l1-s05.mp3` | Tavo kaladė. Iš jos kas ėjimą trauksi po vieną kortą. Kai kaladė ištuštės... apie tai vėliau. Tai nemaloni istorija. |
| `tut-l1-s06.mp3` | Kapinynas. Žuvusios kortos gula čia. Kai kurios jėgos moka jas prikelti — bet tai gilesnė magija. |
| `tut-l1-s07.mp3` | Šita maža kaladė — Žalos Modifikavimo Kortos. Likimo pirštai. Kol kas jų neliesk — supažindinsiu, kai ateis laikas kautis. |
| `tut-l1-s08.mp3` | Dabar įsidėmėk aukso taisyklę. Pirmą ėjimą gauni šimtą. Antrą — du šimtus. Trečią — tris. Ir taip iki tūkstančio. Bet klausyk atidžiai: ėjimo pabaigoje nepanaudotas auksas pradingsta. Neišleisi — prarasi. |
| `tut-l1-s09.mp3` | Pažvelk į kortą iš arčiau. Šis skaičius kampe — jos kaina auksu. |
| `tut-l1-s10.mp3` | Kardas — atakos jėga. Tiek žalos ji kirs priešui. |
| `tut-l1-s11.mp3` | Širdis — gyvybės. Tiek žalos korta atlaikys, kol žus. |
| `tut-l1-s12.mp3` | O tekstas apačioje — jos galia. Kortos tekstas Ravenof'e visada svarbesnis už skaičius. Visada. |
| `tut-l1-s13.mp3` | Nori apžiūrėti kortą? Palaikyk ant jos pirštą — ji priartės. Atleisi pirštą — dings. Paprasta. Pabandyk dabar. |
| `tut-l1-s14.mp3` | Metas pirmai kortai. Paimk ją pirštu ir tempk aukštyn, į mūšio lauką. Drąsiai. |
| `tut-l1-s15.mp3` | Puiku! Bet pastebėk — tavo padaras dar apsvaigęs nuo iškvietimo. Šį ėjimą jis pulti negali. Kariai tai vadina iškvietimo liga. |
| `tut-l1-s16.mp3` | Daugiau aukso neturi, tad baik ėjimą. Prisimink — auksas nepersikelia. Spausk „Baigti ėjimą". |
| `tut-l1-s17.mp3` | Dabar eina priešininkas. Stebėk. Kartais geriausia pamoka — žiūrėti, ką daro priešas. |
| `tut-l1-s18.mp3` | Matai? Antras ėjimas — du šimtai aukso. Kas ėjimą vis daugiau. Vėliau galėsi žaisti po kelias kortas iš karto. |
| `tut-sys-good-2.mp3` | Būtent taip. |
| `tut-l1-s19.mp3` | Užtenka pirmam kartui. Įsimink: auksas kvėpuoja, kortos kainuoja, padarai serga iškvietimo liga. Kitoje pamokoje — kaip kautis. Eik pailsėk, mokiny. |

## 2. Ataka ir gynyba

| Failas | Tekstas (kopijuoti į ElevenLabs) |
|---|---|
| `tut-l2-s01.mp3` | Grįžai. Gerai. Šiandien išmoksi svarbiausio — kaip liejamas kraujas. |
| `tut-l2-s02.mp3` | Ataka paprasta: paimk savo padarą pirštu ir tempk ant priešo. Rodyklė parodys taikinį. Pabandyk — pulk silpnąjį. |
| `tut-l2-s03.mp3` | Švarus kirtis. Priešas žuvo nespėjęs atsakyti — nes tavo smūgis jį pribaigė. |
| `tut-l2-s04.mp3` | Bet dabar klausyk atidžiai, nes čia žūsta naujokai. Kai puoli gyvą padarą — jis kerta atgal. Tu gauni jo atakos žalą. Kiekviena ataka yra mainai. |
| `tut-l2-s05.mp3` | Pažvelk: jo ataka trys, gyvybės trys. Tavo — trys ir keturi. Pulsi — jis žus, bet tau liks viena gyvybė. Verta? Dažnai — taip. Bet visada skaičiuok. |
| `tut-l2-s06.mp3` | Pulk. Pajusk mainus savo kailiu. |
| `tut-l2-s07.mp3` | O dabar... Žalos Modifikavimo Kortos. Likimas. Kiekvieną kartą, kai kertama žala, traukiama viena šių kortų. |
| `tut-l2-s08.mp3` | Pliusas — žala didesnė. Minusas — mažesnė. Kryžius du — žala dviguba. O kryžius nulis... smūgis nueina vėjais. Todėl Ravenof'e net tikras kirtis niekada nėra tikras. |
| `tut-l2-s09.mp3` | Nuo šiol likimo kortos maišosi į kiekvieną tavo smūgį. Priprask prie netikrumo — jis čia amžinas. |
| `tut-l2-s10.mp3` | Kai priešo lenta tuščia — kirsk tiesiai į veidą. Tempk padarą ant priešo herbo. Tai kelias į pergalę. |
| `tut-sys-turn-enemy.mp3` | Priešo ėjimas. Stebėk. |
| `tut-l2-s11.mp3` | Skauda? Gerai. Dabar žinai, ką jaučia priešas. Žala veidan artina pabaigą — bet palikta priešo lenta artina tavo pabaigą. Balansas, mokiny. |
| `tut-l2-s12.mp3` | Priešo gyvybės senka. Užbaik. Nukalk jas iki nulio. |
| `tut-sys-victory.mp3` | Pergalė! Ravenof tavimi patenkintas. |

## 3. Burtai ir reakcijos

| Failas | Tekstas (kopijuoti į ElevenLabs) |
|---|---|
| `tut-l3-s01.mp3` | Kardai — ne vienintelis kelias. Šiandien — magija. |
| `tut-l3-s02.mp3` | Burtai suveikia iškart ir gula į kapinyną. Vieni reikalauja taikinio, kiti — ne. Šis reikalauja. Tempk jį ant priešo padaro. |
| `tut-l3-s03.mp3` | Pastebėjai? Kol tempi, kortos aprašymas lieka kairiajame krašte. Skaityk jį rinkdamasis taikinį — tekstas visada svarbiau už atmintį. |
| `tut-l3-s04.mp3` | O šis burtas — audra. Taikinių nesirenka: kerta visus priešo padarus iš karto. Tokie burtai brangūs, bet apverčia kovą. Paleisk. |
| `tut-l3-s05.mp3` | Gražu, tiesa? Bet įsimink — audros nešvaisto tuščiai lentai. Lauk, kol priešas išsistatys. |
| `tut-l3-s06.mp3` | Dabar — spąstai. Reakcijos. Jos žaidžiamos užverstos į šitą zoną. Priešas jų nemato. Ir nežino, kada suveiks. |
| `tut-l3-s07.mp3` | Padėk reakciją. Tegul laukia tamsoje. |
| `tut-l3-s08.mp3` | Dabar lauk. Priešas puls. Ir tada... |
| `tut-l3-s09.mp3` | Štai! Spąstai užsitrenkė! Reakcija smogė tam, kuris ją pažadino. Priešas dabar dukart pagalvos prieš puldamas. |
| `tut-l3-s10.mp3` | Reakcijos — tavo nematoma ranka. Gera kaladė visada turi bent porą. Užbaik kovą, mokiny. |

## 4. Čempionas

| Failas | Tekstas (kopijuoti į ElevenLabs) |
|---|---|
| `tut-l4-s01.mp3` | Šiandien ypatinga diena. Šiandien tu pašauksi ČEMPIONĄ. |
| `tut-l4-s02.mp3` | Čempionas — ne eilinis karys. Jis reikalauja aukos: dvi kortos iš rankos mainais už jo atėjimą. Rinkis atsargiai... arba atšauk, jei suabejosi — mygtukas apačioje. |
| `tut-l4-s03.mp3` | Paaukok dvi kortas. Tegul ateina. |
| `tut-l4-s04.mp3` | Štai jis. Pažvelk į žvaigždes po juo — tai fazės. Pirma fazė — tik pradžia. |
| `tut-l4-s05.mp3` | Už auksą čempionas auga: trys šimtai — antra fazė, dar daugiau — trečia. Kiekviena fazė atrakina naują galią. Spausk ant jo ir pakelk į antrą fazę. |
| `tut-l4-s06.mp3` | Dabar jo galios. Pirmas įgūdis atrakintas nuo pradžių. Antras — nuo antros fazės. Trečias — tik pilnai užaugus. Užrakintos galios pilkos — jų laikas dar ateis. |
| `tut-l4-s07.mp3` | Kai kurios galios kainuoja aukso. Kai kurios reikalauja taikinio — korta švytės, kol pasirinksi. Panaudok pirmąją galią dabar. |
| `tut-l4-s08.mp3` | Įsimink ir tai: prireikus čempioną gali nuleisti į žemesnę fazę — kartais silpnesnė forma turi reikalingesnę galią. Bet tai jau meistrų žaidimas. |
| `tut-l4-s09.mp3` | Čempionas krenta — kova nesibaigia, bet jo netektis skaudi. Saugok jį. Užbaik priešą. |

## 5. Artefaktai ir laukas

| Failas | Tekstas (kopijuoti į ElevenLabs) |
|---|---|
| `tut-l5-s01.mp3` | Ne viskas kaunasi. Kai kas... tiesiog stovi ir keičia pasaulį. |
| `tut-l5-s02.mp3` | Artefaktai gula į savo zoną ir veikia kas ėjimą — patys. Bet įsidėmėk: jie turi gyvybes, ir priešas gali juos sudaužyti. Padėk artefaktą. |
| `tut-l5-s03.mp3` | Matai? Kiekvieno tavo ėjimo pradžioje jis dirbs tau. Nemokamai. Amžinai — arba kol stovi. |
| `tut-l5-s04.mp3` | LAUKO korta keičia patį mūšio lauką. Žaisk ją ir žiūrėk atidžiai. |
| `tut-l5-s05.mp3` | Pati arena pasikeitė... Lauko kortos galia veikia abu žaidėjus. Ir tave. Rinkis lauką, kuris tavo kaladei naudingesnis nei priešo. |
| `tut-l5-s06.mp3` | Naujas laukas išstumia senąjį. Vienu metu — tik vienas pasaulis. |
| `tut-l5-s07.mp3` | Dar viena tyli jėga — auros. Kai kurie padarai vien būdami lentoje stiprina savus... ar nuodija priešus. Aura dingsta kartu su nešėju — todėl auros nešėjai visada pirmi taikiniai. |
| `tut-sys-good-1.mp3` | Puiku. |

## 6. Būsenos ir raktažodžiai

| Failas | Tekstas (kopijuoti į ElevenLabs) |
|---|---|
| `tut-l6-s01.mp3` | Šiandien išmoksi skaityti ženklus ant kortų. Būsenos. Jos laimi kovas dažniau nei kardai. |
| `tut-l6-s02.mp3` | Šaltis. Užšaldytas padaras neatsako į smūgius. Pulk jį — jis tylės. Ledo magai tuo ir gyvena. |
| `tut-sys-good-3.mp3` | Gerai, mokiny. |
| `tut-l6-s03.mp3` | Apsvaigimas. Apsvaigintas padaras praleidžia savo ėjimą — nei puola, nei ginasi protingai. Nukalk jo sargą, kol miega. |
| `tut-l6-s04.mp3` | Nuodai ir ugnis. Ėda gyvybes kas ėjimą, po truputį. Lėta mirtis — bet mirtis. |
| `tut-l6-s06.mp3` | Skydas sugeria vieną smūgį pilnai. Sėlinimas slepia padarą nuo taikymosi, kol jis pats nesmogia. |
| `tut-l6-s07.mp3` | Ir provokacija. Kol lentoje stovi provokuojantis padaras — privalai pulti jį pirmiausia. Jis — siena. Statyk sienas savo silpniems, griauk priešo sienas pirmas. |
| `tut-l6-s05.mp3` | Nutildymas. Baisiausias iš visų. Nuima nuo kortos viską — tekstą, buffus, galias. Lieka tik kūnas ir skaičiai. Prieš galingą efektą — nutildymas. |
| `tut-l6-s08.mp3` | Sprintas leidžia pulti tą patį ėjimą, kai iškviestas — jokios iškvietimo ligos. Greitis kainuoja, bet stebina. |

## 7. Demonų prakeiksmai

| Failas | Tekstas (kopijuoti į ElevenLabs) |
|---|---|
| `tut-l7-s01.mp3` | Dabar... tamsioji pusė. Demonų menas. Prakeiksmai. |
| `tut-l7-s02.mp3` | Demonų kaladė turi šešėlį — šoninę prakeiksmų kaladę. Iki dvidešimties. Jie ne tavo rankoje — jie laukia savo valandos šalia. |
| `tut-l7-s03.mp3` | Demonų efektai įmaišo prakeiksmus į priešo kaladę. Žiūrėk — štai jis, šliaužia į svetimą kaladę... |
| `tut-l7-s04.mp3` | O dabar gražiausia. Priešas trauks kortas... ir vieną dieną ištrauks tavo prakeiksmą. Tada jis suveiks. Jo rankoje. Jo ėjime. |
| `tut-l7-s05.mp3` | Štai! Girdi? Tai prakeiksmo balsas. Priešas net kortos negavo — vien skausmą. |
| `tut-l7-s06.mp3` | Demonų meistrai stato kaladas aplink tai: vieni efektai maišo prakeiksmus, kiti stiprėja jiems suveikus, treti baudžia priešą už kiekvieną ištrauktą kortą. Tamsi simfonija. |

## 8. Kovos pradžia ir ekonomika

| Failas | Tekstas (kopijuoti į ElevenLabs) |
|---|---|
| `tut-l8-s01.mp3` | Paskutinė pamoka — apie tai, kas vyksta PRIEŠ kovą ir kas laukia jos gale. |
| `tut-l8-s02.mp3` | Kiekviena tikra kova prasideda monetos metimu. Likimas renkasi, kas eina pirmas. Žalia — tu. Raudona — priešas. |
| `tut-l8-s03.mp3` | Dabar — pirmoji ranka. Netinka? Pažymėk kortas, kurias nori keisti — jos grįš į kaladę, gausi naujas. Patarimas: brangios kortos pradžioje — balastas. Keisk jas. |
| `tut-l8-s04.mp3` | Prisimink kainos taisyklę: pirmais ėjimais teturėsi šimtą ar du. Ranka pilna brangenybių — ranka tuščia darbų. |
| `tut-l8-s05.mp3` | Užmiršau paminėti dar vieną monetą. Kartą per ėjimą gali parduoti kortą iš rankos už šimtą aukso. Nereikalinga korta virsta ankstyvu padaru. Meistrų triukas. |
| `tut-l8-s06.mp3` | Ir pabaiga, apie kurią žadėjau papasakoti. Kai kaladė ištuštėja, o tu privalai traukti — nuovargis. Pirmas tuščias traukimas — vienas skausmo. Antras — du. Trečias — trys... Ilga kova visada baigiasi — vienaip ar kitaip. |
| `tut-l8-s07.mp3` | Dar žinok: rankoje telpa dešimt kortų. Vienuolikta sudegtų. Netaupyk to, ko negali panešti. |
| `tut-l8-s08.mp3` | Tai viskas, ką galiu tau duoti žodžiais, mokiny. Likusio išmokys pralaimėjimai — jie geriausi mokytojai Ravenof'e. Eik. Kaunu tavimi didžiuotis. |

## Sisteminės frazės

| Failas | Tekstas (kopijuoti į ElevenLabs) |
|---|---|
| `tut-sys-wrong-1.mp3` | Ne čia. Pažvelk, kur rodau. |
| `tut-sys-wrong-2.mp3` | Dar ne. Sek rodyklę. |
| `tut-sys-wrong-3.mp3` | Kantrybės — pirmiau tai, ką rodau. |
