# Bots-rapport §6B en §6C — Slikken of Stikken

Gegenereerd door `node tests/bots.mjs` op 2026-11-27 21:55:02 UTC. Looptijd: 15,0 min. Playwright 1.63.0, Chromium headless (browserversie van Playwright 1.63.0). index.html: 382.2 kB, sha256 92a05839ab93… (één keer ingelezen bij de start; alle runs spelen dezelfde build).

**Opzet.** Het echte `index.html` (lokale http-server op 127.0.0.1) in mobiele emulatie (isMobile, hasTouch, Pixel-5-UA): 375×667 @2x en 390×844 @3x. De bots handelen alleen via `page.touchscreen.tap` op het midden van een zichtbare knop (vooraf met `elementFromPoint` gecontroleerd). `SoS.debug` wordt alleen gelezen (doelpoortje, open/te laat, gekozen keuze, spiegel, fase). Scores komen van het scherm (finish-overlay en eindscherm); daarna wordt het gespeelde schema uit het rooster op het eindscherm nagerekend met `SoS.score.scoreSchema` (src/score.js, identiek aan de inline code). Strategie-runs op `?speed=4`; run n01 op normale snelheid (geen parameter). Elke run: start → oefenronde (vol, of "Oefenronde overslaan" op het startscherm) → race 1 → race 2 → eindscherm. In de oefenronde tikt de bot uitsluitend op de knop met de markering (data-wijs) en op de knop van het eindkaartje. Een run is geldig als elk poortje precies de keuze van de bot kreeg (debug.gegeven én rooster op het eindscherm); anders opnieuw (max. 3 pogingen).

## Samenvatting per eis

| eis | 375×667 | 390×844 |
|---|---|---|
| B1 paracetamol-rangorde, leverschade, echt ≥ 80% van hoogste | gehaald (echt 768 = 92,8% van 828) | gehaald (echt 768 = 92,8% van 828) |
| B2 lithium-rangorde (verlagen > overslaan > alles > niets), 2400 mg per dag giftig en laagst | gehaald | gehaald |
| B3 raceduur 60–120 s (normale snelheid) | gehaald | gehaald |
| B3 "Nog een keer" = 1 tik, race 1 loopt, zelfde naam | gehaald | gehaald |
| B3 tikken tot spelen | zie B3 per viewport (getallen) | zie B3 per viewport (getallen) |
| B4 knoppen ≥ 48×48, geen h-scroll, geen netwerk na laden | gehaald | gehaald |
| B5 naam en totaal ≥ 32 px | gehaald | gehaald |
| B6 0 consolefouten | gehaald | gehaald |
| C2 vaste onderdelen gelijk in oefenronde en race 1 (DOM-meting) | gehaald | gehaald |
| C3 alle knoppen van race 1 zelf gebruikt via een poortje | gehaald | gehaald |
| C4 oefenronde te volgen met alleen de aangewezen knop | gehaald | gehaald |
| C4 oefenronde ≤ 120 s (normale snelheid) | niet gehaald | niet gehaald |
| C5 introkaartje race 2: één zin per verschil | gehaald | gehaald |

## Viewport 375×667

| run | paracetamol-strategie | lithium-strategie | tutorial | snelheid | race 1 (scherm) | race 1 scoreSchema | race 2 (scherm) | race 2 scoreSchema | totaal (scherm) | geldig (pogingen) |
|---|---|---|---|---|---|---|---|---|---|---|
| r01 | echt schema (1 g om 0/6/18 slik, 12 spuit) | echt schema (ochtend 1200 mg, vanaf dag 6 800 mg; avond Overslaan) | vol | 4× | 768 | 768 | 952 | 952 | 1720 | ja (1) |
| r02 | spuit-variant (12 u spuit) | alles 1200 mg (ochtend) | Overslaan | 4× | 768 | 768 | 707 | 707 | 1475 | ja (1) |
| r03 | zetpil-variant (12 u zetpil) | niets (elk poortje "Overslaan") | vol | 4× | 736 | 736 | -788 | -788 | -52 | ja (1) |
| r04 | gemiste dosis (niets op 12 u) | beide poortjes 1200 mg (2400 mg per dag) | Overslaan | 4× | 418 | 418 | -1866 | -1866 | -1448 | ja (1) |
| r05 | niets (geen enkele tik: elk poortje "geen keuze") | spiegelwacht: 4 u vóór het poortje < 0,7 → 800 mg, < 0,8 → 400 mg, anders Overslaan | vol | 4× | -1480 | -1480 | 986 | 986 | -494 | ja (1) |
| r06 | elk uur slikken (waar het kan) | na de ibuprofen elke 3e ochtend overslaan (1200 mg) | Overslaan | 4× | -3518 | -3518 | 828 | 828 | -2690 | ja (1) |
| r07 | slim A: spuit 0, tablet 5, spuit 11, zetpil 16 | echt schema (ochtend 1200 mg, vanaf dag 6 800 mg; avond Overslaan) | vol | 4× | 828 | 828 | 952 | 952 | 1780 | ja (1) |
| r08 | slim B: tablet 0, tablet 5, zetpil 10, zetpil 16 | na de ibuprofen 400 mg (ochtend) | Overslaan | 4× | 805 | 805 | 661 | 661 | 1466 | ja (1) |
| r09 | greedy: doseer als spiegel over 1 u onder 5 zakt (≥3 u na vorige, max. 4 g/24 u) | na de ibuprofen elke 3e ochtend overslaan (1200 mg) | vol | 4× | 736 | 736 | 828 | 828 | 1564 | ja (1) |
| r10 | echt schema (1 g om 0/6/18 slik, 12 spuit) | echt schema (ochtend 1200 mg, vanaf dag 6 800 mg; avond Overslaan) | Overslaan | 4× | 768 | 768 | 952 | 952 | 1720 | ja (1) |
| n01 | echt schema (1 g om 0/6/18 slik, 12 spuit) | echt schema (ochtend 1200 mg, vanaf dag 6 800 mg; avond Overslaan) | vol | normaal (1×) | 768 | 768 | 952 | 952 | 1720 | ja (1) |

Controles: finish-overlay = eindscherm per race: ja; scherm = scoreSchema: ja (alle runs, Δ 0); totaal = race 1 + race 2: ja; getypte naam op eindscherm: ja.

### B1 Paracetamol

| strategie | race 1 (scherm) | tijd in zone (u, scoreSchema) | totale dosis | lever |
|---|---|---|---|---|
| echt schema (1 g om 0/6/18 slik, 12 spuit) | 768 | 18,70 van 24 (77,9%) | 4 g | heel |
| spuit-variant (12 u spuit) | 768 | 18,70 van 24 (77,9%) | 4 g | heel |
| zetpil-variant (12 u zetpil) | 736 | 17,96 van 24 (74,8%) | 4 g | heel |
| gemiste dosis (niets op 12 u) | 418 | 12,98 van 24 (54,1%) | 3 g | heel |
| niets (geen enkele tik: elk poortje "geen keuze") | -1480 | 0,00 van 24 (0,0%) | 0 g | heel |
| elk uur slikken (waar het kan) | -3518 | 23,67 van 24 (98,6%) | 18 g | beschadigd (-4500) |
| slim A: spuit 0, tablet 5, spuit 11, zetpil 16 | 828 | 20,01 van 24 (83,4%) | 4 g | heel |
| slim B: tablet 0, tablet 5, zetpil 10, zetpil 16 | 805 | 19,59 van 24 (81,6%) | 4 g | heel |
| greedy: doseer als spiegel over 1 u onder 5 zakt (≥3 u na vorige, max. 4 g/24 u) | 736 | 18,92 van 24 (78,8%) | 4 g | heel |

- echt (768) = spuit-variant (768) ≥ zetpil-variant (736) > gemist (418) > niets (-1480): **gehaald**
- elk uur slikken: leverschade zichtbaar op het scherm — tijdens de race levermeter class "vol"=true, zichtbaar=true, tekst "5 g van max. 4 g"; eindscherm dagteller "Per dag 18 g max. 1 g per keer, 4 g per dag. Lever in gevaar." (over=true), regel "lever / giftig" −4.500; score -3518 < echt 768: **gehaald**
- hoogste botscore race 1: 828 (r07, slim A: spuit 0, tablet 5, spuit 11, zetpil 16); echt = 768 = 92,8% (≥ 80%): **gehaald**
- **B1 375×667: gehaald**

### B2 Lithium

| strategie | race 2 (scherm) | in zone (u) | > 1,0 (u) | > 1,5 (u) | max. spiegel gezien | regel "lever / giftig" (scherm) |
|---|---|---|---|---|---|---|
| echt schema (ochtend 1200 mg, vanaf dag 6 800 mg; avond Overslaan) | 952 | 228,5 | 3,1 | 0,0 | 1,02 mmol/L | 0 |
| na de ibuprofen elke 3e ochtend overslaan (1200 mg) | 828 | 199,0 | 21,3 | 0,0 | 1,13 mmol/L | 0 |
| alles 1200 mg (ochtend) | 707 | 171,2 | 60,4 | 0,0 | 1,28 mmol/L | 0 |
| na de ibuprofen 400 mg (ochtend) | 661 | 161,6 | 3,1 | 0,0 | 1,02 mmol/L | 0 |
| niets (elk poortje "Overslaan") | -788 | 0,0 | 0,0 | 0,0 | 0,57 mmol/L | 0 |
| beide poortjes 1200 mg (2400 mg per dag) | -1866 | 13,4 | 226,5 | 157,3 | 2,33 mmol/L | −1.311 |
| spiegelwacht: 4 u vóór het poortje < 0,7 → 800 mg, < 0,8 → 400 mg, anders Overslaan | 986 | 236,7 | 0,0 | 0,0 | 0,88 mmol/L | 0 |

- dosis verlagen / echt schema (952) > elke 3e overslaan (828) > alles 1200 mg (707) > niets (-788): **gehaald**
- beide poortjes 1200 mg: max. spiegel 2,33 mmol/L (> 1,5), 157,3 u boven 1,5, regel "lever / giftig" op het eindscherm −1.311; score -1866 = laagste van alle lithiumruns (laagste: -1866, r04): **gehaald**
- **B2 375×667: gehaald**

### B3 Tikken, raceduur, "Nog een keer"

Tikken van openen tot de eerste speelhandeling (eerste tik op een raceknop in de oefenronde, "Tablet"):
- met naam typen (tik naamveld + typen + Start + Tablet): 3 tikken (run r01); zonder naam (veld leeg laten): 2 tikken.
Tikken van openen tot race 1 loopt (tik op "Start race" meegeteld):
- met "Overslaan", zonder naam typen: 2 tikken (run r02: [data-actie="start-over"] → [data-actie="start-race"])
- met "Overslaan", met naam typen: 3 tikken (run r04)
- volledige tutorial, met naam typen: 8, 8, 8, 8, 8, 8 tikken (runs r01, r03, r05, r07, r09, n01); waarvan in de tutorial: 5, 5, 5, 5, 5, 5
- tutorialhandelingen (stap:knop) in run r01: 8:slik, 9:niets, 11:spuit, 14:zetpil
Raceduur op normale snelheid (run n01, geen ?speed): race 1 84,1 s, race 2 66,1 s (klok van de bot: tik "Start race" → finish-overlay; spel zelf meet 83,8 s en 65,8 s, incl. 3 s aanloop). 60–120 s: **gehaald**
  Scores op normale snelheid: race 1 768, race 2 952 (zelfde strategie op 4× in r01: 768, 952).
"Nog een keer": 1 tik → fase race1, scherm scherm-race, klok loopt (-0,90 → -0,45 u), naam "Pilpiraat Zestig" (was "Pilpiraat Zestig"): **gehaald**
Tikken waarbij de knop > 0,6 s nog bedekt was (bv. tijdens een schermovergang van 0,35 s; de bot wacht dan tot de knop bovenop ligt): geen.
Knoppen die eerst in beeld gescrold moesten worden voor een tik: geen. Tikken die (volgens elementFromPoint) niet op de bedoelde knop zouden landen: geen.
- Samengevat (≤ 3 tikken van openen tot spelen): eerste speelhandeling 2 (zonder naam) / 3 (met naam); race 1 loopt na 2 (Overslaan, zonder naam) / 3 (Overslaan, met naam). Gehaald volgens de lezing "eerste speelhandeling ≤ 3": **gehaald**; race 1 loopt binnen 3 tikken (zonder naam, met Overslaan): **gehaald**.
- **B3 375×667: raceduur gehaald; "Nog een keer" gehaald; tikken: zie hierboven.**

### B4 Knoppen, scrollen, netwerk

- 174 schermmetingen (1127 knopmetingen) op: einde, intro1, intro2, race1, race2, start, tutorial stap 11, tutorial stap 14, tutorial stap 8, tutorial stap 9.
- Kleinste zichtbare knop: demp "Geluid uit" 48×48 px (min. breedte 48 px, min. hoogte 48 px). Knoppen < 48×48: geen: **gehaald**
- Horizontaal scrollen (scrollWidth > clientWidth op document, body of actief scherm): 0 van 174 metingen; grootste scrollWidth 375 px bij clientWidth 375 px: **gehaald**
- Netwerkverzoeken (11 runs, elk een verse pagina): vóór/tijdens het laden 11 in totaal (http://127.0.0.1:44471/index.html); ná het laden 0: **gehaald**
- **B4 375×667: gehaald**

### B5 Eindscherm

- naam: computed font-size 34 px (min. 34; langste naam "Pilpiraat Zestig" (16 tekens): 34 px); totaal: 58 px (min. 58). Nabespreekvraag op het scherm: "null".
- **B5 375×667: gehaald**

### B6 Console

- 11 volledige doorlopen (start → eindscherm, plus "Nog een keer"): consolefouten 0; waarschuwingen 0.
- **B6 375×667: gehaald**

### Determinisme

- r10 (4×, tutorial over) vs r01: race 1 768 vs 768, race 2 952 vs 952; toedieningen per poortje gelijk: ja.
- n01 (normale snelheid, tutorial vol) vs r01: race 1 768 vs 768, race 2 952 vs 952; toedieningen per poortje gelijk: ja.
- r01 toedieningen: 768 [slik,niets,niets,niets,niets,niets,slik,niets,niets,niets,niets,niets,spuit,niets,niets,niets,niets,niets,slik,niets,niets,niets,niets,niets] | 952 [slik×3,niets,slik×3,niets,slik×3,niets,slik×3,niets,slik×3,niets,slik×3,niets,slik×2,niets,slik×2,niets,slik×2,niets,slik×2,niets]

### C Samenhang tutorial en race (meetbare delen van §6C)

C2 (meting, run r01): plaats, maat, lettertype, lettergrootte, achtergrond, rand, tekst en icoon van 27 onderdelen (scherm, kop, klok, QALY-stand, dagteller, levermeter, portret, canvas, 4 knoppen, dempknop) in de oefenronde (derde knopstap, klok stil) tegenover race 1 (vlak na de start). Verschillen buiten de markering van de aangewezen knop: 0. Toegestaan verschil (rand van de gemarkeerde knop): 0. **gehaald**
  Knoppen oefenronde: Tablet, Zetpil, Spuit, Overslaan; race 1: Tablet, Zetpil, Spuit, Overslaan. Dit is een meting van de DOM; kleuren en vormen op het canvas beoordeelt de criticus op de schermafbeeldingen (gauntlet/schermen/).
C3 (meting): in de oefenronde getikt (stap:knop) 8:slik, 9:niets, 11:spuit, 14:zetpil; door het poortje uitgevoerd (poortje:keuze) 0:slik 1:niets 2:geen 3:geen 4:geen 5:spuit 6:geen 7:geen 8:geen 9:geen 10:geen 11:geen 12:geen 13:zetpil 14:geen 15:geen. Alle vier de knoppen van race 1 (Tablet, Zetpil, Spuit, Niets) getikt én op een poortje uitgevoerd: **gehaald**. Dagteller aan het eind: 3 g (maximum 4 g).
C4 (meting): 6 runs door de hele oefenronde met alleen tikken op de gemarkeerde knop (steeds precies 1 gemarkeerde knop, klok staat stil tot de tik) en de knop "Race!" op het eindkaartje "Klaar?": **gehaald** (runs r01, r03, r05, r07, r09, n01).
  Duur op normale snelheid (run n01, geen ?speed, bot reageert direct): 146,7 s van de tik op "Start" tot het eindkaartje (het spel zelf meet 146,7 s). Hoogstens 120 s: **niet gehaald**
  Zinnen in beeld (run r01), bij stilstaande klok: “Opa Jan heeft pijn: kies een tablet voor het eerste poortje.” · “Niets geven is ook een keuze: tik dan Overslaan. Geen keuze kost punten.” · “Au. De pijn komt terug.” · “Hier lukt slikken even niet: kies nu een zetpil.”
  Zinnen bij lopende klok: “Jij doseert de medicijnen van opa Jan: jij kiest wat hij krijgt, en wanneer.” · “Het is een race tegen de klok: die loopt linksboven, en de strook eronder toont hoe ver je bent.” · “tijdspiegelEen concentratie-tijdcurve, een kwartslag gedraaid: zo loopt de race over je scherm naar beneden.” · “Zijn gezicht staat op de spiegel: zoveel paracetamol zit er in zijn bloed.” · “Links van de streep heeft hij pijn, in het groene vlak niet: blijf binnen dat venster.” · “Een QALY is een jaar in goede gezondheid; hier zijn het spelpunten: in het groene vlak erbij, erbuiten eraf.” · “De lichte lijnen zijn poortjes: kies vóór élk poortje een knop, voordat de balk boven de knoppen vol is.” · “Opa Jan heeft pijn: kies een tablet voor het eerste poortje.” · “Een pil moet eerst door je maag.” · “Niets geven is ook een keuze: tik dan Overslaan. Geen keuze kost punten.” · “Nu jij: kies vóór elk poortje Tablet, Spuit, Zetpil of Overslaan.” · “Geen keuze: dat kost punten. Kies vóór elk poortje een knop, ook als het Overslaan is.” · “De curve zakt: je lichaam ruimt het op, elke 2,5 uur is de helft weg.” · “Geen keuze: dat kost punten. Kies vóór elk poortje een knop, ook als het Overslaan is.” · “Au. De pijn komt terug.” · “Een prik werkt meteen, maar zakt net zo hard.” · “Geen keuze: dat kost punten. Kies vóór elk poortje een knop, ook als het Overslaan is.” · “De dagteller telt elke gram: 1 g per keer, en boven 4 g per dag loopt de lever gevaar.” · “Geen keuze: dat kost punten. Kies vóór elk poortje een knop, ook als het Overslaan is.” · “Au. De pijn komt terug.” · “Geen keuze: dat kost punten. Kies vóór elk poortje een knop, ook als het Overslaan is.” · “Deel 2: in elke race verandert halverwege iets, en dan moet je plan mee.” · “Hier lukt slikken even niet: kies nu een zetpil.” · “Een zetpil: soms goed, soms nauwelijks. Daar kun je niet van op aan.” · “Geen keuze: dat kost punten. Kies vóór elk poortje een knop, ook als het Overslaan is.”
C5 (meting): introkaartje race 2 heeft 6 regels, elk één zin; knoppen in mg en "retard" staan erop: **gehaald**. Regels: “Blijf binnen het therapeutisch venster: het groene vlak heeft nu ook een bovenkant, 0,6–1,0 mmol/L.” · “Boven 1,5 mmol/L is het giftig.” · “De klok telt in dagen: de race duurt 10 dagen.” · “Twee poortjes per dag, ochtend (0 uur) en avond (12 uur): kies 400, 800 of 1.200 mg, of Overslaan.” · “Lithium is een tablet met vertraagde afgifte (retard): daardoor is één keer per dag genoeg.” · “Er is geen zetpil, geen spuit en geen dagteller.”

### Runs in detail

| run | poging(en) | duur | tikken totaal | tikken race 1 / race 2 | race 1 toedieningen (poortje:keuze) | race 2 toedieningen | praktijkzin race 1 | praktijkzin race 2 |
|---|---|---|---|---|---|---|---|---|
| r01 | 1✓ | 81 s | 57 | 25 / 21 | 0:slik 1:niets 2:niets 3:niets 4:niets 5:niets 6:slik 7:niets 8:niets 9:niets 10:niets 11:niets 12:spuit 13:niets 14:niets 15:niets 16:niets 17:niets 18:slik 19:niets 20:niets 21:niets 22:niets 23:niets | 0:slik×3 1:niets 2:slik×3 3:niets 4:slik×3 5:niets 6:slik×3 7:niets 8:slik×3 9:niets 10:slik×3 11:niets 12:slik×2 13:niets 14:slik×2 15:niets 16:slik×2 17:niets 18:slik×2 19:niets |  |  |
| r02 | 1✓ | 39 s | 51 | 25 / 21 | 0:slik 1:niets 2:niets 3:niets 4:niets 5:niets 6:slik 7:niets 8:niets 9:niets 10:niets 11:niets 12:spuit 13:niets 14:niets 15:niets 16:niets 17:niets 18:slik 19:niets 20:niets 21:niets 22:niets 23:niets | 0:slik×3 1:niets 2:slik×3 3:niets 4:slik×3 5:niets 6:slik×3 7:niets 8:slik×3 9:niets 10:slik×3 11:niets 12:slik×3 13:niets 14:slik×3 15:niets 16:slik×3 17:niets 18:slik×3 19:niets |  |  |
| r03 | 1✓ | 81 s | 57 | 25 / 21 | 0:slik 1:niets 2:niets 3:niets 4:niets 5:niets 6:slik 7:niets 8:niets 9:niets 10:niets 11:niets 12:zetpil 13:niets 14:niets 15:niets 16:niets 17:niets 18:slik 19:niets 20:niets 21:niets 22:niets 23:niets | 0:niets 1:niets 2:niets 3:niets 4:niets 5:niets 6:niets 7:niets 8:niets 9:niets 10:niets 11:niets 12:niets 13:niets 14:niets 15:niets 16:niets 17:niets 18:niets 19:niets |  |  |
| r04 | 1✓ | 39 s | 52 | 25 / 21 | 0:slik 1:niets 2:niets 3:niets 4:niets 5:niets 6:slik 7:niets 8:niets 9:niets 10:niets 11:niets 12:niets 13:niets 14:niets 15:niets 16:niets 17:niets 18:slik 19:niets 20:niets 21:niets 22:niets 23:niets | 0:slik×3 1:slik×3 2:slik×3 3:slik×3 4:slik×3 5:slik×3 6:slik×3 7:slik×3 8:slik×3 9:slik×3 10:slik×3 11:slik×3 12:slik×3 13:slik×3 14:slik×3 15:slik×3 16:slik×3 17:slik×3 18:slik×3 19:slik×3 |  |  |
| r05 | 1✓ | 81 s | 33 | 1 / 21 | 0:geen 1:geen 2:geen 3:geen 4:geen 5:geen 6:geen 7:geen 8:geen 9:geen 10:geen 11:geen 12:geen 13:geen 14:geen 15:geen 16:geen 17:geen 18:geen 19:geen 20:geen 21:geen 22:geen 23:geen | 0:slik×2 1:slik 2:slik×2 3:slik 4:slik 5:slik×2 6:slik 7:slik×2 8:slik 9:slik 10:slik×2 11:niets 12:slik×2 13:niets 14:slik×2 15:niets 16:slik×2 17:niets 18:slik×2 19:niets |  |  |
| r06 | 1✓ | 40 s | 52 | 25 / 21 | 0:slik 1:slik 2:slik 3:slik 4:slik 5:slik 6:slik 7:slik 8:slik 9:slik 10:niets 11:niets 12:niets 13:niets 14:niets 15:niets 16:slik 17:slik 18:slik 19:slik 20:slik 21:slik 22:slik 23:slik | 0:slik×3 1:niets 2:slik×3 3:niets 4:slik×3 5:niets 6:slik×3 7:niets 8:slik×3 9:niets 10:slik×3 11:niets 12:slik×3 13:niets 14:niets 15:niets 16:slik×3 17:niets 18:slik×3 19:niets |  |  |
| r07 | 1✓ | 81 s | 57 | 25 / 21 | 0:spuit 1:niets 2:niets 3:niets 4:niets 5:slik 6:niets 7:niets 8:niets 9:niets 10:niets 11:spuit 12:niets 13:niets 14:niets 15:niets 16:zetpil 17:niets 18:niets 19:niets 20:niets 21:niets 22:niets 23:niets | 0:slik×3 1:niets 2:slik×3 3:niets 4:slik×3 5:niets 6:slik×3 7:niets 8:slik×3 9:niets 10:slik×3 11:niets 12:slik×2 13:niets 14:slik×2 15:niets 16:slik×2 17:niets 18:slik×2 19:niets |  |  |
| r08 | 1✓ | 40 s | 52 | 25 / 21 | 0:slik 1:niets 2:niets 3:niets 4:niets 5:slik 6:niets 7:niets 8:niets 9:niets 10:zetpil 11:niets 12:niets 13:niets 14:niets 15:niets 16:zetpil 17:niets 18:niets 19:niets 20:niets 21:niets 22:niets 23:niets | 0:slik×3 1:niets 2:slik×3 3:niets 4:slik×3 5:niets 6:slik×3 7:niets 8:slik×3 9:niets 10:slik×3 11:niets 12:slik 13:niets 14:slik 15:niets 16:slik 17:niets 18:slik 19:niets |  |  |
| r09 | 1✓ | 81 s | 57 | 25 / 21 | 0:slik 1:niets 2:niets 3:niets 4:slik 5:niets 6:niets 7:niets 8:niets 9:slik 10:niets 11:niets 12:niets 13:niets 14:spuit 15:niets 16:niets 17:niets 18:niets 19:niets 20:niets 21:niets 22:niets 23:niets | 0:slik×3 1:niets 2:slik×3 3:niets 4:slik×3 5:niets 6:slik×3 7:niets 8:slik×3 9:niets 10:slik×3 11:niets 12:slik×3 13:niets 14:niets 15:niets 16:slik×3 17:niets 18:slik×3 19:niets |  |  |
| r10 | 1✓ | 40 s | 52 | 25 / 21 | 0:slik 1:niets 2:niets 3:niets 4:niets 5:niets 6:slik 7:niets 8:niets 9:niets 10:niets 11:niets 12:spuit 13:niets 14:niets 15:niets 16:niets 17:niets 18:slik 19:niets 20:niets 21:niets 22:niets 23:niets | 0:slik×3 1:niets 2:slik×3 3:niets 4:slik×3 5:niets 6:slik×3 7:niets 8:slik×3 9:niets 10:slik×3 11:niets 12:slik×2 13:niets 14:slik×2 15:niets 16:slik×2 17:niets 18:slik×2 19:niets |  |  |
| n01 | 1✓ | 301 s | 58 | 25 / 21 | 0:slik 1:niets 2:niets 3:niets 4:niets 5:niets 6:slik 7:niets 8:niets 9:niets 10:niets 11:niets 12:spuit 13:niets 14:niets 15:niets 16:niets 17:niets 18:slik 19:niets 20:niets 21:niets 22:niets 23:niets | 0:slik×3 1:niets 2:slik×3 3:niets 4:slik×3 5:niets 6:slik×3 7:niets 8:slik×3 9:niets 10:slik×3 11:niets 12:slik×2 13:niets 14:slik×2 15:niets 16:slik×2 17:niets 18:slik×2 19:niets |  |  |

Ongeldige pogingen (opnieuw gespeeld): geen.

## Viewport 390×844

| run | paracetamol-strategie | lithium-strategie | tutorial | snelheid | race 1 (scherm) | race 1 scoreSchema | race 2 (scherm) | race 2 scoreSchema | totaal (scherm) | geldig (pogingen) |
|---|---|---|---|---|---|---|---|---|---|---|
| r01 | echt schema (1 g om 0/6/18 slik, 12 spuit) | echt schema (ochtend 1200 mg, vanaf dag 6 800 mg; avond Overslaan) | vol | 4× | 768 | 768 | 952 | 952 | 1720 | ja (1) |
| r02 | spuit-variant (12 u spuit) | alles 1200 mg (ochtend) | Overslaan | 4× | 768 | 768 | 707 | 707 | 1475 | ja (1) |
| r03 | zetpil-variant (12 u zetpil) | niets (elk poortje "Overslaan") | vol | 4× | 736 | 736 | -788 | -788 | -52 | ja (1) |
| r04 | gemiste dosis (niets op 12 u) | beide poortjes 1200 mg (2400 mg per dag) | Overslaan | 4× | 418 | 418 | -1866 | -1866 | -1448 | ja (1) |
| r05 | niets (geen enkele tik: elk poortje "geen keuze") | spiegelwacht: 4 u vóór het poortje < 0,7 → 800 mg, < 0,8 → 400 mg, anders Overslaan | vol | 4× | -1480 | -1480 | 986 | 986 | -494 | ja (1) |
| r06 | elk uur slikken (waar het kan) | na de ibuprofen elke 3e ochtend overslaan (1200 mg) | Overslaan | 4× | -3518 | -3518 | 828 | 828 | -2690 | ja (1) |
| r07 | slim A: spuit 0, tablet 5, spuit 11, zetpil 16 | echt schema (ochtend 1200 mg, vanaf dag 6 800 mg; avond Overslaan) | vol | 4× | 828 | 828 | 952 | 952 | 1780 | ja (1) |
| r08 | slim B: tablet 0, tablet 5, zetpil 10, zetpil 16 | na de ibuprofen 400 mg (ochtend) | Overslaan | 4× | 805 | 805 | 661 | 661 | 1466 | ja (1) |
| r09 | greedy: doseer als spiegel over 1 u onder 5 zakt (≥3 u na vorige, max. 4 g/24 u) | na de ibuprofen elke 3e ochtend overslaan (1200 mg) | vol | 4× | 736 | 736 | 828 | 828 | 1564 | ja (1) |
| r10 | echt schema (1 g om 0/6/18 slik, 12 spuit) | echt schema (ochtend 1200 mg, vanaf dag 6 800 mg; avond Overslaan) | Overslaan | 4× | 768 | 768 | 952 | 952 | 1720 | ja (1) |
| n01 | echt schema (1 g om 0/6/18 slik, 12 spuit) | echt schema (ochtend 1200 mg, vanaf dag 6 800 mg; avond Overslaan) | vol | normaal (1×) | 768 | 768 | 952 | 952 | 1720 | ja (1) |

Controles: finish-overlay = eindscherm per race: ja; scherm = scoreSchema: ja (alle runs, Δ 0); totaal = race 1 + race 2: ja; getypte naam op eindscherm: ja.

### B1 Paracetamol

| strategie | race 1 (scherm) | tijd in zone (u, scoreSchema) | totale dosis | lever |
|---|---|---|---|---|
| echt schema (1 g om 0/6/18 slik, 12 spuit) | 768 | 18,70 van 24 (77,9%) | 4 g | heel |
| spuit-variant (12 u spuit) | 768 | 18,70 van 24 (77,9%) | 4 g | heel |
| zetpil-variant (12 u zetpil) | 736 | 17,96 van 24 (74,8%) | 4 g | heel |
| gemiste dosis (niets op 12 u) | 418 | 12,98 van 24 (54,1%) | 3 g | heel |
| niets (geen enkele tik: elk poortje "geen keuze") | -1480 | 0,00 van 24 (0,0%) | 0 g | heel |
| elk uur slikken (waar het kan) | -3518 | 23,67 van 24 (98,6%) | 18 g | beschadigd (-4500) |
| slim A: spuit 0, tablet 5, spuit 11, zetpil 16 | 828 | 20,01 van 24 (83,4%) | 4 g | heel |
| slim B: tablet 0, tablet 5, zetpil 10, zetpil 16 | 805 | 19,59 van 24 (81,6%) | 4 g | heel |
| greedy: doseer als spiegel over 1 u onder 5 zakt (≥3 u na vorige, max. 4 g/24 u) | 736 | 18,92 van 24 (78,8%) | 4 g | heel |

- echt (768) = spuit-variant (768) ≥ zetpil-variant (736) > gemist (418) > niets (-1480): **gehaald**
- elk uur slikken: leverschade zichtbaar op het scherm — tijdens de race levermeter class "vol"=true, zichtbaar=true, tekst "5 g van max. 4 g"; eindscherm dagteller "Per dag 18 g max. 1 g per keer, 4 g per dag. Lever in gevaar." (over=true), regel "lever / giftig" −4.500; score -3518 < echt 768: **gehaald**
- hoogste botscore race 1: 828 (r07, slim A: spuit 0, tablet 5, spuit 11, zetpil 16); echt = 768 = 92,8% (≥ 80%): **gehaald**
- **B1 390×844: gehaald**

### B2 Lithium

| strategie | race 2 (scherm) | in zone (u) | > 1,0 (u) | > 1,5 (u) | max. spiegel gezien | regel "lever / giftig" (scherm) |
|---|---|---|---|---|---|---|
| echt schema (ochtend 1200 mg, vanaf dag 6 800 mg; avond Overslaan) | 952 | 228,5 | 3,1 | 0,0 | 1,02 mmol/L | 0 |
| na de ibuprofen elke 3e ochtend overslaan (1200 mg) | 828 | 199,0 | 21,3 | 0,0 | 1,13 mmol/L | 0 |
| alles 1200 mg (ochtend) | 707 | 171,2 | 60,4 | 0,0 | 1,28 mmol/L | 0 |
| na de ibuprofen 400 mg (ochtend) | 661 | 161,6 | 3,1 | 0,0 | 1,02 mmol/L | 0 |
| niets (elk poortje "Overslaan") | -788 | 0,0 | 0,0 | 0,0 | 0,57 mmol/L | 0 |
| beide poortjes 1200 mg (2400 mg per dag) | -1866 | 13,4 | 226,5 | 157,3 | 2,33 mmol/L | −1.311 |
| spiegelwacht: 4 u vóór het poortje < 0,7 → 800 mg, < 0,8 → 400 mg, anders Overslaan | 986 | 236,7 | 0,0 | 0,0 | 0,88 mmol/L | 0 |

- dosis verlagen / echt schema (952) > elke 3e overslaan (828) > alles 1200 mg (707) > niets (-788): **gehaald**
- beide poortjes 1200 mg: max. spiegel 2,33 mmol/L (> 1,5), 157,3 u boven 1,5, regel "lever / giftig" op het eindscherm −1.311; score -1866 = laagste van alle lithiumruns (laagste: -1866, r04): **gehaald**
- **B2 390×844: gehaald**

### B3 Tikken, raceduur, "Nog een keer"

Tikken van openen tot de eerste speelhandeling (eerste tik op een raceknop in de oefenronde, "Tablet"):
- met naam typen (tik naamveld + typen + Start + Tablet): 3 tikken (run r01); zonder naam (veld leeg laten): 2 tikken.
Tikken van openen tot race 1 loopt (tik op "Start race" meegeteld):
- met "Overslaan", zonder naam typen: 2 tikken (run r02: [data-actie="start-over"] → [data-actie="start-race"])
- met "Overslaan", met naam typen: 3 tikken (run r04)
- volledige tutorial, met naam typen: 8, 8, 8, 8, 8, 8 tikken (runs r01, r03, r05, r07, r09, n01); waarvan in de tutorial: 5, 5, 5, 5, 5, 5
- tutorialhandelingen (stap:knop) in run r01: 8:slik, 9:niets, 11:spuit, 14:zetpil
Raceduur op normale snelheid (run n01, geen ?speed): race 1 84,1 s, race 2 66,1 s (klok van de bot: tik "Start race" → finish-overlay; spel zelf meet 83,9 s en 65,9 s, incl. 3 s aanloop). 60–120 s: **gehaald**
  Scores op normale snelheid: race 1 768, race 2 952 (zelfde strategie op 4× in r01: 768, 952).
"Nog een keer": 1 tik → fase race1, scherm scherm-race, klok loopt (-0,90 → -0,45 u), naam "Pilpiraat Zestig" (was "Pilpiraat Zestig"): **gehaald**
Tikken waarbij de knop > 0,6 s nog bedekt was (bv. tijdens een schermovergang van 0,35 s; de bot wacht dan tot de knop bovenop ligt): geen.
Knoppen die eerst in beeld gescrold moesten worden voor een tik: geen. Tikken die (volgens elementFromPoint) niet op de bedoelde knop zouden landen: geen.
- Samengevat (≤ 3 tikken van openen tot spelen): eerste speelhandeling 2 (zonder naam) / 3 (met naam); race 1 loopt na 2 (Overslaan, zonder naam) / 3 (Overslaan, met naam). Gehaald volgens de lezing "eerste speelhandeling ≤ 3": **gehaald**; race 1 loopt binnen 3 tikken (zonder naam, met Overslaan): **gehaald**.
- **B3 390×844: raceduur gehaald; "Nog een keer" gehaald; tikken: zie hierboven.**

### B4 Knoppen, scrollen, netwerk

- 174 schermmetingen (1121 knopmetingen) op: einde, intro1, intro2, race1, race2, start, tutorial stap 11, tutorial stap 14, tutorial stap 8, tutorial stap 9.
- Kleinste zichtbare knop: demp "Geluid uit" 48×48 px (min. breedte 48 px, min. hoogte 48 px). Knoppen < 48×48: geen: **gehaald**
- Horizontaal scrollen (scrollWidth > clientWidth op document, body of actief scherm): 0 van 174 metingen; grootste scrollWidth 390 px bij clientWidth 390 px: **gehaald**
- Netwerkverzoeken (11 runs, elk een verse pagina): vóór/tijdens het laden 11 in totaal (http://127.0.0.1:44471/index.html); ná het laden 0: **gehaald**
- **B4 390×844: gehaald**

### B5 Eindscherm

- naam: computed font-size 40 px (min. 40; langste naam "Pilpiraat Zestig" (16 tekens): 40 px); totaal: 80 px (min. 80). Nabespreekvraag op het scherm: "null".
- **B5 390×844: gehaald**

### B6 Console

- 11 volledige doorlopen (start → eindscherm, plus "Nog een keer"): consolefouten 0; waarschuwingen 0.
- **B6 390×844: gehaald**

### Determinisme

- r10 (4×, tutorial over) vs r01: race 1 768 vs 768, race 2 952 vs 952; toedieningen per poortje gelijk: ja.
- n01 (normale snelheid, tutorial vol) vs r01: race 1 768 vs 768, race 2 952 vs 952; toedieningen per poortje gelijk: ja.
- r01 toedieningen: 768 [slik,niets,niets,niets,niets,niets,slik,niets,niets,niets,niets,niets,spuit,niets,niets,niets,niets,niets,slik,niets,niets,niets,niets,niets] | 952 [slik×3,niets,slik×3,niets,slik×3,niets,slik×3,niets,slik×3,niets,slik×3,niets,slik×2,niets,slik×2,niets,slik×2,niets,slik×2,niets]

### C Samenhang tutorial en race (meetbare delen van §6C)

C2 (meting, run r01): plaats, maat, lettertype, lettergrootte, achtergrond, rand, tekst en icoon van 27 onderdelen (scherm, kop, klok, QALY-stand, dagteller, levermeter, portret, canvas, 4 knoppen, dempknop) in de oefenronde (derde knopstap, klok stil) tegenover race 1 (vlak na de start). Verschillen buiten de markering van de aangewezen knop: 0. Toegestaan verschil (rand van de gemarkeerde knop): 0. **gehaald**
  Knoppen oefenronde: Tablet, Zetpil, Spuit, Overslaan; race 1: Tablet, Zetpil, Spuit, Overslaan. Dit is een meting van de DOM; kleuren en vormen op het canvas beoordeelt de criticus op de schermafbeeldingen (gauntlet/schermen/).
C3 (meting): in de oefenronde getikt (stap:knop) 8:slik, 9:niets, 11:spuit, 14:zetpil; door het poortje uitgevoerd (poortje:keuze) 0:slik 1:niets 2:geen 3:geen 4:geen 5:spuit 6:geen 7:geen 8:geen 9:geen 10:geen 11:geen 12:geen 13:zetpil 14:geen 15:geen. Alle vier de knoppen van race 1 (Tablet, Zetpil, Spuit, Niets) getikt én op een poortje uitgevoerd: **gehaald**. Dagteller aan het eind: 3 g (maximum 4 g).
C4 (meting): 6 runs door de hele oefenronde met alleen tikken op de gemarkeerde knop (steeds precies 1 gemarkeerde knop, klok staat stil tot de tik) en de knop "Race!" op het eindkaartje "Klaar?": **gehaald** (runs r01, r03, r05, r07, r09, n01).
  Duur op normale snelheid (run n01, geen ?speed, bot reageert direct): 146,7 s van de tik op "Start" tot het eindkaartje (het spel zelf meet 146,7 s). Hoogstens 120 s: **niet gehaald**
  Zinnen in beeld (run r01), bij stilstaande klok: “Opa Jan heeft pijn: kies een tablet voor het eerste poortje.” · “Niets geven is ook een keuze: tik dan Overslaan. Geen keuze kost punten.” · “Au. De pijn komt terug.” · “Hier lukt slikken even niet: kies nu een zetpil.”
  Zinnen bij lopende klok: “Jij doseert de medicijnen van opa Jan: jij kiest wat hij krijgt, en wanneer.” · “Het is een race tegen de klok: die loopt linksboven, en de strook eronder toont hoe ver je bent.” · “tijdspiegelEen concentratie-tijdcurve, een kwartslag gedraaid: zo loopt de race over je scherm naar beneden.” · “Zijn gezicht staat op de spiegel: zoveel paracetamol zit er in zijn bloed.” · “Links van de streep heeft hij pijn, in het groene vlak niet: blijf binnen dat venster.” · “Een QALY is een jaar in goede gezondheid; hier zijn het spelpunten: in het groene vlak erbij, erbuiten eraf.” · “De lichte lijnen zijn poortjes: kies vóór élk poortje een knop, voordat de balk boven de knoppen vol is.” · “Opa Jan heeft pijn: kies een tablet voor het eerste poortje.” · “Een pil moet eerst door je maag.” · “Niets geven is ook een keuze: tik dan Overslaan. Geen keuze kost punten.” · “Nu jij: kies vóór elk poortje Tablet, Spuit, Zetpil of Overslaan.” · “Geen keuze: dat kost punten. Kies vóór elk poortje een knop, ook als het Overslaan is.” · “De curve zakt: je lichaam ruimt het op, elke 2,5 uur is de helft weg.” · “Geen keuze: dat kost punten. Kies vóór elk poortje een knop, ook als het Overslaan is.” · “Au. De pijn komt terug.” · “Een prik werkt meteen, maar zakt net zo hard.” · “Geen keuze: dat kost punten. Kies vóór elk poortje een knop, ook als het Overslaan is.” · “De dagteller telt elke gram: 1 g per keer, en boven 4 g per dag loopt de lever gevaar.” · “Geen keuze: dat kost punten. Kies vóór elk poortje een knop, ook als het Overslaan is.” · “Au. De pijn komt terug.” · “Geen keuze: dat kost punten. Kies vóór elk poortje een knop, ook als het Overslaan is.” · “Deel 2: in elke race verandert halverwege iets, en dan moet je plan mee.” · “Hier lukt slikken even niet: kies nu een zetpil.” · “Een zetpil: soms goed, soms nauwelijks. Daar kun je niet van op aan.” · “Geen keuze: dat kost punten. Kies vóór elk poortje een knop, ook als het Overslaan is.”
C5 (meting): introkaartje race 2 heeft 6 regels, elk één zin; knoppen in mg en "retard" staan erop: **gehaald**. Regels: “Blijf binnen het therapeutisch venster: het groene vlak heeft nu ook een bovenkant, 0,6–1,0 mmol/L.” · “Boven 1,5 mmol/L is het giftig.” · “De klok telt in dagen: de race duurt 10 dagen.” · “Twee poortjes per dag, ochtend (0 uur) en avond (12 uur): kies 400, 800 of 1.200 mg, of Overslaan.” · “Lithium is een tablet met vertraagde afgifte (retard): daardoor is één keer per dag genoeg.” · “Er is geen zetpil, geen spuit en geen dagteller.”

### Runs in detail

| run | poging(en) | duur | tikken totaal | tikken race 1 / race 2 | race 1 toedieningen (poortje:keuze) | race 2 toedieningen | praktijkzin race 1 | praktijkzin race 2 |
|---|---|---|---|---|---|---|---|---|
| r01 | 1✓ | 81 s | 57 | 25 / 21 | 0:slik 1:niets 2:niets 3:niets 4:niets 5:niets 6:slik 7:niets 8:niets 9:niets 10:niets 11:niets 12:spuit 13:niets 14:niets 15:niets 16:niets 17:niets 18:slik 19:niets 20:niets 21:niets 22:niets 23:niets | 0:slik×3 1:niets 2:slik×3 3:niets 4:slik×3 5:niets 6:slik×3 7:niets 8:slik×3 9:niets 10:slik×3 11:niets 12:slik×2 13:niets 14:slik×2 15:niets 16:slik×2 17:niets 18:slik×2 19:niets |  |  |
| r02 | 1✓ | 39 s | 51 | 25 / 21 | 0:slik 1:niets 2:niets 3:niets 4:niets 5:niets 6:slik 7:niets 8:niets 9:niets 10:niets 11:niets 12:spuit 13:niets 14:niets 15:niets 16:niets 17:niets 18:slik 19:niets 20:niets 21:niets 22:niets 23:niets | 0:slik×3 1:niets 2:slik×3 3:niets 4:slik×3 5:niets 6:slik×3 7:niets 8:slik×3 9:niets 10:slik×3 11:niets 12:slik×3 13:niets 14:slik×3 15:niets 16:slik×3 17:niets 18:slik×3 19:niets |  |  |
| r03 | 1✓ | 81 s | 57 | 25 / 21 | 0:slik 1:niets 2:niets 3:niets 4:niets 5:niets 6:slik 7:niets 8:niets 9:niets 10:niets 11:niets 12:zetpil 13:niets 14:niets 15:niets 16:niets 17:niets 18:slik 19:niets 20:niets 21:niets 22:niets 23:niets | 0:niets 1:niets 2:niets 3:niets 4:niets 5:niets 6:niets 7:niets 8:niets 9:niets 10:niets 11:niets 12:niets 13:niets 14:niets 15:niets 16:niets 17:niets 18:niets 19:niets |  |  |
| r04 | 1✓ | 39 s | 52 | 25 / 21 | 0:slik 1:niets 2:niets 3:niets 4:niets 5:niets 6:slik 7:niets 8:niets 9:niets 10:niets 11:niets 12:niets 13:niets 14:niets 15:niets 16:niets 17:niets 18:slik 19:niets 20:niets 21:niets 22:niets 23:niets | 0:slik×3 1:slik×3 2:slik×3 3:slik×3 4:slik×3 5:slik×3 6:slik×3 7:slik×3 8:slik×3 9:slik×3 10:slik×3 11:slik×3 12:slik×3 13:slik×3 14:slik×3 15:slik×3 16:slik×3 17:slik×3 18:slik×3 19:slik×3 |  |  |
| r05 | 1✓ | 81 s | 33 | 1 / 21 | 0:geen 1:geen 2:geen 3:geen 4:geen 5:geen 6:geen 7:geen 8:geen 9:geen 10:geen 11:geen 12:geen 13:geen 14:geen 15:geen 16:geen 17:geen 18:geen 19:geen 20:geen 21:geen 22:geen 23:geen | 0:slik×2 1:slik 2:slik×2 3:slik 4:slik 5:slik×2 6:slik 7:slik×2 8:slik 9:slik 10:slik×2 11:niets 12:slik×2 13:niets 14:slik×2 15:niets 16:slik×2 17:niets 18:slik×2 19:niets |  |  |
| r06 | 1✓ | 40 s | 52 | 25 / 21 | 0:slik 1:slik 2:slik 3:slik 4:slik 5:slik 6:slik 7:slik 8:slik 9:slik 10:niets 11:niets 12:niets 13:niets 14:niets 15:niets 16:slik 17:slik 18:slik 19:slik 20:slik 21:slik 22:slik 23:slik | 0:slik×3 1:niets 2:slik×3 3:niets 4:slik×3 5:niets 6:slik×3 7:niets 8:slik×3 9:niets 10:slik×3 11:niets 12:slik×3 13:niets 14:niets 15:niets 16:slik×3 17:niets 18:slik×3 19:niets |  |  |
| r07 | 1✓ | 81 s | 57 | 25 / 21 | 0:spuit 1:niets 2:niets 3:niets 4:niets 5:slik 6:niets 7:niets 8:niets 9:niets 10:niets 11:spuit 12:niets 13:niets 14:niets 15:niets 16:zetpil 17:niets 18:niets 19:niets 20:niets 21:niets 22:niets 23:niets | 0:slik×3 1:niets 2:slik×3 3:niets 4:slik×3 5:niets 6:slik×3 7:niets 8:slik×3 9:niets 10:slik×3 11:niets 12:slik×2 13:niets 14:slik×2 15:niets 16:slik×2 17:niets 18:slik×2 19:niets |  |  |
| r08 | 1✓ | 40 s | 52 | 25 / 21 | 0:slik 1:niets 2:niets 3:niets 4:niets 5:slik 6:niets 7:niets 8:niets 9:niets 10:zetpil 11:niets 12:niets 13:niets 14:niets 15:niets 16:zetpil 17:niets 18:niets 19:niets 20:niets 21:niets 22:niets 23:niets | 0:slik×3 1:niets 2:slik×3 3:niets 4:slik×3 5:niets 6:slik×3 7:niets 8:slik×3 9:niets 10:slik×3 11:niets 12:slik 13:niets 14:slik 15:niets 16:slik 17:niets 18:slik 19:niets |  |  |
| r09 | 1✓ | 81 s | 57 | 25 / 21 | 0:slik 1:niets 2:niets 3:niets 4:slik 5:niets 6:niets 7:niets 8:niets 9:slik 10:niets 11:niets 12:niets 13:niets 14:spuit 15:niets 16:niets 17:niets 18:niets 19:niets 20:niets 21:niets 22:niets 23:niets | 0:slik×3 1:niets 2:slik×3 3:niets 4:slik×3 5:niets 6:slik×3 7:niets 8:slik×3 9:niets 10:slik×3 11:niets 12:slik×3 13:niets 14:niets 15:niets 16:slik×3 17:niets 18:slik×3 19:niets |  |  |
| r10 | 1✓ | 40 s | 52 | 25 / 21 | 0:slik 1:niets 2:niets 3:niets 4:niets 5:niets 6:slik 7:niets 8:niets 9:niets 10:niets 11:niets 12:spuit 13:niets 14:niets 15:niets 16:niets 17:niets 18:slik 19:niets 20:niets 21:niets 22:niets 23:niets | 0:slik×3 1:niets 2:slik×3 3:niets 4:slik×3 5:niets 6:slik×3 7:niets 8:slik×3 9:niets 10:slik×3 11:niets 12:slik×2 13:niets 14:slik×2 15:niets 16:slik×2 17:niets 18:slik×2 19:niets |  |  |
| n01 | 1✓ | 301 s | 58 | 25 / 21 | 0:slik 1:niets 2:niets 3:niets 4:niets 5:niets 6:slik 7:niets 8:niets 9:niets 10:niets 11:niets 12:spuit 13:niets 14:niets 15:niets 16:niets 17:niets 18:slik 19:niets 20:niets 21:niets 22:niets 23:niets | 0:slik×3 1:niets 2:slik×3 3:niets 4:slik×3 5:niets 6:slik×3 7:niets 8:slik×3 9:niets 10:slik×3 11:niets 12:slik×2 13:niets 14:slik×2 15:niets 16:slik×2 17:niets 18:slik×2 19:niets |  |  |

Ongeldige pogingen (opnieuw gespeeld): geen.

