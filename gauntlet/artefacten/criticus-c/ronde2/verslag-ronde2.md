# Criticus C — verslag ronde 2 (§6C Samenhang tutorial en race)

Beoordeeld: `index.html` op branch `claude/optimistic-franklin-vk86yy`, commit 0fa4bc2. `index.html` is byte-voor-byte gelijk aan een eigen nabouw van de build uit `src/` (`c1-build-check.mjs`: identiek, 209.716 tekens). Alles is zelf gemeten in Chromium met telefoon-emulatie (isMobile, hasTouch, `page.touchscreen.tap`) in 375 × 667 en 390 × 844. Zonder `?speed`, behalve in `c5-intro2.mjs` (alleen om race 1 door te spoelen). Buiten deze map is niets gewijzigd. Het verslag van ronde 1 is pas gelezen na de eigen metingen voor C1, C2 en C4.

| Criterium | Oordeel |
|---|---|
| C1 Eén tekencode | PASS |
| C2 Nul zichtbare verschillen | PASS (0 in de genoemde onderdelen; 1 kanttekening) |
| C3 Volledig en niets extra | **FAIL (weging)**: de letterlijke tekst van §6C3 is gehaald, de FAIL rust op gebrek 1 bij onderdeel (c) |
| C4 Te volgen zonder hulp | PASS (65,5 s in beide maten) |
| C5 Race 2 sluit aan | PASS (2 kleine gebreken) |
| Getallen en beweringen | 0 afwijkingen van het casusblad op het voorgeschreven pad; 1 probleem bij afwijkend spel (zie C3 gebrek 1) |

Bewijs in deze map: `lib.mjs`, `c1-build-check.mjs`, `c4-bot.mjs` (+ `c4-bot-uitvoer.txt`, `c4-bot-uitkomst.json`), `c2-vergelijk.mjs` (+ `c2-uitvoer.txt`, `*/c2-dom.json`), `c2-naast-elkaar.mjs` (+ `*/c2-paar-*.png`), `c3-knoppen.mjs` (+ `c3-knoppen-uitvoer.txt`), `c3-afwijken.mjs` (+ `c3-afwijken-uitvoer.txt`), `c5-intro2.mjs` (+ `c5-uitvoer.txt`), schermafbeeldingen in `375x667/` en `390x844/`.

---

## C1 Eén tekencode — PASS

- Oefenronde: `startRace(0, SoS.tutorial)` (`src/app.js:275`); race: `startRace(i)` (`:1439`, `:1353`). Eén `startRace` (`:372`), één `bouwRaceUi` (`:414`), één `teken` (`:794-1099`), één `tekenPoortjes` (`:716-792`), één `werkKopBij` (`:1270-1299`, klok, QALY-stand, dagteller, levermeter), één `lus` (`:1102`).
- `src/tutorial.js` (54 regels) is alleen een draaiboek: klokmoment, zin, knop, poortje, zin daarna, tekst eindkaartje.
- Alle plekken met `R.gids` nagelopen (`:375`, `:378`, `:405`, `:409`, `:424-426`, `:457`, `:491`/`:536`, `:541-566`, `:594`, `:1109-1117`, `:1137`, `:1197-1203`, `:1211`, `:1220`, `:1307`, `:1325`). Geen ervan tekent tijdlijn, curve, zone, poortjes, knoppen, klok, QALY-stand, dagteller of levermeter. In `teken` en `tekenPoortjes` komt `gids` niet voor.
- CSS: alleen de markering `.actie.wijs` (`src/style.css:315-316`, `:330`). Geen eigen tutorialscherm in de template (`src/index.template.html:35` is commentaar).
- DOM-structuur van `#scherm-race` is in tutorial en race gelijk op alle 16 momenten × 2 maten (veld `structuur` in `c2-dom.json`: 0 verschillen).

Gebreken: geen.

## C2 Nul zichtbare verschillen — PASS

Methode (`c2-vergelijk.mjs`): per tutorialstap drie momenten (a = klok stil vóór de tik, b = 0,15 s na de tik, c = 0,25 uur na het poortje) plus uur 15,5, naast hetzelfde klokmoment in race 1 met dezelfde keuzes (tablet 0, niets 2, spuit 5, tablet 9, zetpil 13). 16 paren × 2 maten. Per paar: DOM-meting (plaats, lettertype, grootte, gewicht, kleur, tekst van klok, QALY, dagteller, levermeter, portret, knoppen met icoon, keuzeregel, dempknop) en een naast-elkaar-beeld. Spiegel, dagteller en QALY-stand zijn op gelijke klok gelijk (bv. m3c: 18,66 mg/L, 2 g, 172 in beide).

DOM-verschillen, alle 32 paren (`c2-uitvoer.txt`):
- klasse `wijs` en de bijbehorende witte rand en ring op de gevraagde knop: toegestaan;
- tekst en hoogte van de uitlegzin: toegestaan;
- vanaf m4c: knop "Misselijk" (geblokkeerd), groen portretje, melding "Opa is misselijk na de narcose.": plotwending, uitzondering §3;
- keuzeregel 0,2 px hoger of lager en QALY 1–2 punten verschil op de b-momenten: de race loopt door tijdens de foto.
Verder 0.

Zelf geopend en bekeken (7 van de 32 paren): `375x667/c2-paar-m1b-gekozen.png`, `m2a-voor`, `m3c-na-poortje`, `m4a-voor`, `m5a-voor`; `390x844/c2-paar-m1a-voor.png`, `m5c-na-poortje`. Richting van de tijd, achtergrond, zone, streep, curve (zelfde kleurwissel blauw/groen), poortjes, knoppen, klok, QALY, dagteller en levermeter: geen verschil gezien buiten de toegestane.

Kanttekening (geen FAIL, weging):
1. Omdat de zin in de tutorial blijft staan, worden poortlabels die eronder schuiven (met het icoontje van wat je gaf) daar niet getekend; in de race alleen zolang er een melding staat. Zie `375x667/c2-paar-m2a-voor.png` ("Uur 0 + tablet" rechts wel, links niet), `m3c` ("Uur 4"), `m4a` ("Uur 7"). Code `app.js:609` (`tot: Infinity`), `:759`. Ik reken dit tot de uitlegzin (zelfde code als elke racemelding); een strengere lezer telt het als verschil in "poortjes".

Bewijs dun: pixel-exact vergelijken lukt niet (sterren twinkelen, race schuift door); de pixelbanden in `c2-uitvoer.txt` zijn daardoor ruis. Het oordeel steunt op de DOM-meting (alle 32 paren) en 7 geopende beelden. In `390x844/c2-paar-m1a-voor.png` is rechts het introkaartje nog aan het uitfaden: mijn foto was te vroeg, geen verschil in het spel.

## C3 Volledig en niets extra — FAIL (weging)

### (a) Doet elke knop hetzelfde als in race 1? Ja.
`c3-knoppen.mjs`: 12 tikken in dezelfde volgorde in tutorial en race 1, beide maten. Keuzeregel (tekst en klasse), knopstanden (gekozen, aria-pressed, vinkje) en doelpoortje letterlijk vergeleken: **24 van 24 gelijk** (`c3-knoppen-uitvoer.txt`).
- eerste tik: "Zetpil voor uur 0";
- tweede tik zelfde knop: "Keuze gewist voor uur 0: niets kiezen is overslaan.";
- wisselen: "Niets voor uur 0";
- tik 0,03 uur na poortje 0: "Te laat voor uur 0. Kies opnieuw voor uur 1.";
- tik terwijl de klok loopt: "Spuit voor uur 1", wisselen en wissen idem.
De oude tutorialteksten "Kies nu Tablet." en "Even kijken wat er gebeurt." bestaan niet meer (gezocht in `src/`).

### (b) Iets extra in de tutorial? Nee.
Buiten de uitlegzin, de stilstaande klok en de markering: niets. Zelfde DOM-structuur, zelfde keuzeregel. Het eindkaartje "Klaar? / QALY-punten in de oefenronde / Race!" is hetzelfde kaartje als "Race klaar" met de tekst van §3 stap 6.

### (d) Elke knop zelf gebruikt via het poortje? Ja.
`gegeven = slik, leeg, niets, leeg, leeg, spuit, leeg, leeg, leeg, slik, leeg, leeg, leeg, zetpil` (`c4-bot-uitvoer.txt`), dagteller 1 → 2 → 3 → 4 g.

### (c) Afwijken van de aanwijzing (`c3-afwijken.mjs`, `c3-afwijken-uitvoer.txt`)
Vastlopen: **nee**. Drie foute knoppen plus 2,5 s wachten: klok blijft staan, markering blijft op de goede knop. Goede knop kiezen en 0,1 uur voor het poortje wisselen of wissen: klok stopt weer (bv. op 4,893 vóór poortje 5), markering komt terug, daarna goed kiezen loopt door. Alle vijf stappen, beide maten, 0 consolefouten. Tutorial met al dat gedoe: 92,5 s.

Gebreken:
1. **Eén extra dosis en de tutorial dwingt de speler over het dagmaximum.** De vier gevraagde doses zijn samen precies 4 g. Geeft de speler ergens één keer iets extra (dat kan nu, de knoppen werken als in de race), dan staat de dagteller bij stap 5 op "4 g van max. 4 g" en zegt de tutorial "Slikken lukt niet altijd: kies nu een zetpil." De klok wacht tot de speler dat doet; een andere uitweg is er niet. Gemeten in S1 (extra spuit op poortje 1, 375 × 667) en S2 (extra zetpil op poortje 7, 390 × 844): op uur 13 dagteller "5 g van max. 4 g", levermeter vol, lijn en stip rood, portret misselijk, QALY van +507 naar −713, eindkaartje "Klaar? −601". In beeld staat dan "Een zetpil: soms goed, soms nauwelijks. Daar kun je niet van op aan." (`375x667/c3-S1-klok13.3.png`, `390x844/c3-S2-klok13.3.png`). De zin past niet bij wat er gebeurt, en de tutorial heeft één stap eerder gezegd "Meer is niet beter: boven 4 gram per dag raakt de lever beschadigd." De speler krijgt dus leverschade door de aanwijzing te volgen. Oorzaak: `tutorial.js:27-28` gaat uit van precies vier doses; `app.js:558` wacht hoe dan ook op de gevraagde knop.
2. **De casusbladzin bij leverschade valt weg als de overdosis op een gevraagd poortje valt.** `pasPoortjeToe` toont eerst "Te veel paracetamol beschadigt de lever." (`app.js:1179`) en overschrijft die in dezelfde tik met de "daarna"-zin (`:1199`). Gemeten: S1 en S2 op uur 13, S3 op uur 5 (5 g, zin "Een prik werkt meteen, maar zakt net zo hard."). Op een niet-gevraagd poortje verschijnt de leverzin wel (S3, uur 6, 10, 14). In race 1 verschijnt hij altijd.
3. Bij veel extra doses blijft de tutorial om nog een dosis vragen terwijl de lever al vol is: S3, uur 8,5, "8 g van max. 4 g", zin "Elke gram telt mee in de dagteller linksboven: kies weer een tablet." (`375x667/c3-S3-klok8.6.png`). Zelfde oorzaak als 1, extremer spel.
4. Klein: heeft de speler de gevraagde knop al vóór de stap gekozen (S4: Niets voor poortje 2 op klok 1,16), dan stopt de klok niet en staat de zin "De pijn is weg: kies Niets om een poortje over te slaan." maar ±1,9 s in beeld. Niet onjuist, wel kort.
5. Uit ronde 1, nog open: op het voorgeschreven pad ziet de speler de stand "levermeter vol" niet (hij eindigt op precies 4 g).

Zinnen die bij afwijken wél blijven kloppen: "De pijn is weg" (tablet op uur 0 is altijd gegeven; spiegel ≥ 9,2 mg/L), stap 3 wisselt naar "Kies nu de spuit." als de spiegel niet onder de streep staat (S1: 11,05 mg/L; S3: 26,14 mg/L).

**Weging.** De drie zinnen van §6C3 zelf zijn gehaald: alles komt voor, elke knop is via het poortje gebruikt, niets extra. Wie alleen die tekst toetst, komt op PASS. Ik geef FAIL om gebrek 1: de opdracht vroeg uitdrukkelijk of een afwijkende speler een zin kan krijgen die niet klopt met het scherm, en dat kan met één enkele nieuwsgierige tik, waarna de tutorial zelf de overdosis afdwingt. Dat botst met het hoofddoel "meer is niet beter". Het is een oordeel, geen meetdrempel; de bouwer of Bart kan er anders over denken.

Per gebrek uit ronde 1 (C3):
| Ronde 1 | Nu |
|---|---|
| 1. Tweede tik deed in de tutorial iets anders ("Even kijken wat er gebeurt.") | Verholpen: wist de keuze, tekst gelijk aan race 1 |
| 2. Knoppen op slot, eigen teksten "Kies nu Tablet." | Verholpen: teksten weg, elke tik telt |
| 3. Wissen en wisselen nergens te oefenen | Deels: het kan nu en werkt gelijk, maar de tutorial vraagt er niet om; een speler die alleen de aanwijzing volgt doet het niet |
| 4. "Te laat" alleen in de race | Verholpen: gemeten in de tutorial, zelfde tekst |
| 5. Levermeter vol niet te zien | Open op het voorgeschreven pad; bij afwijken juist ongewild wel (gebrek 1) |

## C4 Te volgen zonder hulp — PASS

`c4-bot.mjs`: tikt alleen op de knop met `data-wijs="1"`, plus Start en Race!. Zonder `?speed`.

| Maat | Door de tutorial | Duur volgens spel | Start tot introkaartje race 1 | Tikken | Consolefouten |
|---|---|---|---|---|---|
| 375 × 667 | ja | 65,5 s | 65,8 s | 7 | 0 |
| 390 × 844 | ja | 65,5 s | 65,8 s | 7 | 0 |

Drempel 120 s gehaald met 54 s over. Steeds precies één gemarkeerde knop (`375x667/tut-stap1-voor-slik.png` t/m `tut-stap5-voor-zetpil.png`).

Kanttekeningen:
1. Stap 3: de zin is "Au. De pijn komt terug." en noemt de spuit niet; alleen de markering wijst hem aan (ronde 1, nog open).
2. Ronde 1 meldde dat de markering eerder kwam dan de zin. Nu wacht de markering op de zin (`app.js:548`, `wijsVanaf`); in het logboek staan zin en tik op hetzelfde klokmoment. Verholpen.
3. Laatste zin loopt in 375 × 667 over drie regels met los "aan." (smaak, voor Bart).

## C5 Race 2 sluit aan — PASS

Introkaartje race 2, uitgelezen in het draaiende spel, beide maten gelijk (`c5-uitvoer.txt`, `*/c5-intro-race2.png`); past zonder scrollen (onderkant knop 597 van 667 en 812 van 844):

1. Het groene vlak heeft nu ook een bovenkant: 0,6–1,0 mmol/L.
2. Boven 1,5 mmol/L is het giftig.
3. De klok telt in dagen: de race duurt 10 dagen.
4. Poortjes komen 3× per dag: om 0, 8 en 16 uur.
5. Niets heet hier Overslaan.
6. Tik twee keer op Tablet voor 2 tabletten op één poortje.
7. Er is geen zetpil.
8. Er is geen dagteller.

De twee verschillen die §6C5 noemt staan er elk in één zin (5 en 6). In race 2 gezien: knoppen Tablet / Overslaan / Spuit, klok "Dag 0 · 0 u", dagteller verborgen, "2× Tablet voor dag 0", "Overslaan voor dag 0 · 8 u", "Lithium bestaat niet als prik. Slikken of stikken!".

Per gebrek uit ronde 1 (C5):
| Ronde 1 | Nu |
|---|---|
| 1. Drie verschillen in één zin | Verholpen: één zin per verschil |
| 2. Klok in dagen stond er niet | Verholpen: zin 3 |
| 3. Knopvolgorde en wissen op de derde tik staan er niet | Open |

Gebreken:
1. Niet op het kaartje: Overslaan staat op de tweede plaats (Niets stond op de vierde), en de keuze wist bij de derde tik op Tablet in plaats van de tweede.
2. Niet op het kaartje: de spiegel begint al in het groene vlak (alleen af te leiden uit "al jaren"), en een tablet is hier 400 mg in plaats van 1 g.
De spuit die niets doet en de ibuprofen zijn plotwendingen en horen er niet op.

---

## Getallen en beweringen

Voorgeschreven pad: **0 afwijkingen**. Nagelopen tegen §3 en §5, uit het draaiende spel:

Oefenronde (`c4-bot-uitvoer.txt`)
- "Opa Jan heeft pijn: kies een tablet voor het eerste poortje." Spiegel 0.
- "Een pil moet eerst door je maag." Letterlijk §3. Op klok 0,25 pas 4,07 mg/L, "onderweg"-bolletje in beeld.
- "De pijn is weg: kies Niets om een poortje over te slaan." Op uur 1,5: 9,18 mg/L (casusblad piek 9,21 na 1,38 u; zone ≥ 5).
- "Je lichaam ruimt het op: elke 2,5 uur is de helft weg." Letterlijk §3, T½ 2,5 u.
- "Au. De pijn komt terug." Letterlijk casusblad; verschijnt bij 4,9 mg/L op klok 4,30–4,37 (casusblad 4,29 u).
- "Een prik werkt meteen, maar zakt net zo hard." Letterlijk §3. Sprong op uur 5: 4,1 → 20,0 mg/L, dus 15,9 (casusblad 15,9).
- "Elke gram telt mee in de dagteller linksboven: kies weer een tablet." Dagteller staat linksboven en telde de spuit mee (2 g).
- "Meer is niet beter: boven 4 gram per dag raakt de lever beschadigd." Letterlijk §3.
- "Slikken lukt niet altijd: kies nu een zetpil." Geen getal, geen onjuiste bewering.
- "Een zetpil: soms goed, soms nauwelijks. Daar kun je niet van op aan." Letterlijk §3. Zetpil poortje 13: F 0,35, ka 0,3 /u, binnen 0,3–0,9 en 0,3–1,0.
- Dagteller "0/1/2/3/4 g van max. 4 g"; as 0, 5, 10, 15, 20 mg/L; "pijnstilling (vereenvoudigd)"; poortjes elk uur; eindkaartje "Klaar?" / "Race!"; totaal 4 g.

Introkaartje race 1: verhaal letterlijk casusblad; "Maximaal 4 gram per dag: daarboven raakt de lever beschadigd." (casusblad 4 g per 24 uur); knoppen Tablet, Zetpil, Spuit, Niets; QALY-zin letterlijk §3 plus "Het zijn spelpunten, geen echte QALY's."

Introkaartje race 2: verhaal letterlijk casusblad; 0,6–1,0 mmol/L; giftig boven 1,5 mmol/L; 10 dagen; 3× per dag om 0, 8 en 16 uur. Startspiegel in race 2: 0,764 mmol/L (casusblad ±0,76–0,87).

Bij afwijkend spel: geen fout getal, wel de aanwijzing die over het maximum heen stuurt (C3 gebrek 1) en de wegvallende casusbladzin (C3 gebrek 2).

## Niet gecontroleerd

- Echte telefoon (iOS Safari, Android Chrome); alleen Chromium-emulatie. Geluid. "Beweging verminderen" (alleen CSS gelezen).
- Van de 32 C2-paren zijn er 7 als beeld geopend; de rest alleen via de DOM-meting.
- Race 2: de derde tik op Tablet (wissen) alleen in de code gelezen (`app.js:525`); mijn meting liep op `?speed=20` en de poortjes schoven te snel voorbij. Ibuprofen op dag 5 niet gespeeld.
- `tests/bots.mjs` en `tools/schermen.mjs` niet gedraaid; schermafbeeldingen van de bouwer niet gebruikt.
