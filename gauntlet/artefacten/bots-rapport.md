# Bots-rapport §6B — Slikken of Stikken

Gegenereerd door `node tests/bots.mjs` op 2026-10-14 06:36:52 UTC. Looptijd: 12,4 min. Playwright 1.56.1, Chromium headless (/opt/pw-browsers). index.html: 221.0 kB, sha256 20c09a018c2d… (één keer ingelezen bij de start; alle runs spelen dezelfde build).

**Opzet.** Het echte `index.html` (lokale http-server op 127.0.0.1) in mobiele emulatie (isMobile, hasTouch, Pixel-5-UA): 375×667 @2x en 390×844 @3x. De bots handelen alleen via `page.touchscreen.tap` op het midden van een zichtbare knop (vooraf met `elementFromPoint` gecontroleerd). `SoS.debug` wordt alleen gelezen (doelpoortje, open/te laat, gekozen keuze, spiegel, fase). Scores komen van het scherm (finish-overlay en eindscherm); daarna wordt het gespeelde schema uit het rooster op het eindscherm nagerekend met `SoS.score.scoreSchema` (src/score.js, identiek aan de inline code). Strategie-runs op `?speed=4`; run n01 op normale snelheid (geen parameter). Elke run: start → tutorial (vol of "Overslaan") → race 1 → race 2 → eindscherm. Een run is geldig als elk poortje precies de keuze van de bot kreeg (debug.gegeven én rooster op het eindscherm); anders opnieuw (max. 3 pogingen).

## Samenvatting per eis

| eis | 375×667 | 390×844 |
|---|---|---|
| B1 paracetamol-rangorde, leverschade, echt ≥ 80% van hoogste | gehaald (echt 768 = 92,8% van 828) | gehaald (echt 768 = 92,8% van 828) |
| B2 lithium-rangorde, dubbel toxisch en laagst | gehaald | gehaald |
| B3 raceduur 60–120 s (normale snelheid) | gehaald | gehaald |
| B3 "Nog een keer" = 1 tik, race 1 loopt, zelfde naam | gehaald | gehaald |
| B3 tikken tot spelen | zie B3 per viewport (getallen) | zie B3 per viewport (getallen) |
| B4 knoppen ≥ 48×48, geen h-scroll, geen netwerk na laden | gehaald | gehaald |
| B5 naam en totaal ≥ 32 px | gehaald | gehaald |
| B6 0 consolefouten | gehaald | gehaald |

## Viewport 375×667

| run | paracetamol-strategie | lithium-strategie | tutorial | snelheid | race 1 (scherm) | race 1 scoreSchema | race 2 (scherm) | race 2 scoreSchema | totaal (scherm) | geldig (pogingen) |
|---|---|---|---|---|---|---|---|---|---|---|
| r01 | echt schema (1 g om 0/6/18 slik, 12 spuit) | na de ibuprofen elke 3e overslaan | vol | 4× | 768 | 768 | 1000 | 1000 | 1768 | ja (1) |
| r02 | spuit-variant (12 u spuit) | alles slikken | Overslaan | 4× | 768 | 768 | 628 | 628 | 1396 | ja (1) |
| r03 | zetpil-variant (12 u zetpil) | niets (elk poortje "Overslaan") | vol | 4× | 736 | 736 | -710 | -710 | 26 | ja (1) |
| r04 | gemiste dosis (niets op 12 u) | elk poortje dubbel (2 tabletten) | Overslaan | 4× | 418 | 418 | -2267 | -2267 | -1849 | ja (1) |
| r05 | niets (geen enkele tik) | spiegelwacht: tablet als spiegel 3 u vóór het poortje < 0,85 | vol | 4× | -1000 | -1000 | 1000 | 1000 | 0 | ja (1) |
| r06 | elk uur slikken (waar het kan) | slim: na de ibuprofen elke 4e overslaan | Overslaan | 4× | -3518 | -3518 | 1000 | 1000 | -2518 | ja (1) |
| r07 | slim A: spuit 0, tablet 5, spuit 11, zetpil 16 | na de ibuprofen elke 3e overslaan | vol | 4× | 828 | 828 | 1000 | 1000 | 1828 | ja (1) |
| r08 | slim B: tablet 0, tablet 5, zetpil 10, zetpil 16 | alles slikken | Overslaan | 4× | 805 | 805 | 628 | 628 | 1433 | ja (1) |
| r09 | greedy: doseer als spiegel over 1 u onder 5 zakt (≥3 u na vorige, max. 4 g/24 u) | elk poortje dubbel (2 tabletten) | vol | 4× | 736 | 736 | -2267 | -2267 | -1531 | ja (1) |
| r10 | echt schema (1 g om 0/6/18 slik, 12 spuit) | na de ibuprofen elke 3e overslaan | Overslaan | 4× | 768 | 768 | 1000 | 1000 | 1768 | ja (1) |
| n01 | echt schema (1 g om 0/6/18 slik, 12 spuit) | na de ibuprofen elke 3e overslaan | vol | normaal (1×) | 768 | 768 | 1000 | 1000 | 1768 | ja (1) |

Controles: finish-overlay = eindscherm per race: ja; scherm = scoreSchema: ja (alle runs, Δ 0); totaal = race 1 + race 2: ja; getypte naam op eindscherm: ja.

### B1 Paracetamol

| strategie | race 1 (scherm) | tijd in zone (u, scoreSchema) | totale dosis | lever |
|---|---|---|---|---|
| echt schema (1 g om 0/6/18 slik, 12 spuit) | 768 | 18,70 van 24 (77,9%) | 4 g | heel |
| spuit-variant (12 u spuit) | 768 | 18,70 van 24 (77,9%) | 4 g | heel |
| zetpil-variant (12 u zetpil) | 736 | 17,96 van 24 (74,8%) | 4 g | heel |
| gemiste dosis (niets op 12 u) | 418 | 12,98 van 24 (54,1%) | 3 g | heel |
| niets (geen enkele tik) | -1000 | 0,00 van 24 (0,0%) | 0 g | heel |
| elk uur slikken (waar het kan) | -3518 | 23,67 van 24 (98,6%) | 18 g | beschadigd (-4500) |
| slim A: spuit 0, tablet 5, spuit 11, zetpil 16 | 828 | 20,01 van 24 (83,4%) | 4 g | heel |
| slim B: tablet 0, tablet 5, zetpil 10, zetpil 16 | 805 | 19,59 van 24 (81,6%) | 4 g | heel |
| greedy: doseer als spiegel over 1 u onder 5 zakt (≥3 u na vorige, max. 4 g/24 u) | 736 | 18,92 van 24 (78,8%) | 4 g | heel |

- echt (768) = spuit-variant (768) ≥ zetpil-variant (736) > gemist (418) > niets (-1000): **gehaald**
- elk uur slikken: leverschade zichtbaar op het scherm — tijdens de race levermeter class "vol"=true, zichtbaar=true, tekst "5 g van max. 4 g"; eindscherm dagteller "Dagteller 18 g max. 4 g per 24 uur. Lever beschadigd." (over=true), regel "lever / giftig" −4.500; score -3518 < echt 768: **gehaald**
- hoogste botscore race 1: 828 (r07, slim A: spuit 0, tablet 5, spuit 11, zetpil 16); echt = 768 = 92,8% (≥ 80%): **gehaald**
- **B1 375×667: gehaald**

### B2 Lithium

| strategie | race 2 (scherm) | in zone (u) | > 1,0 (u) | > 1,5 (u) | max. spiegel gezien | regel "lever / giftig" (scherm) |
|---|---|---|---|---|---|---|
| na de ibuprofen elke 3e overslaan | 1000 | 240,0 | 0,0 | 0,0 | 0,95 mmol/L | 0 |
| alles slikken | 628 | 151,9 | 88,1 | 0,0 | 1,20 mmol/L | 0 |
| niets (elk poortje "Overslaan") | -710 | 8,4 | 0,0 | 0,0 | 0,76 mmol/L | 0 |
| elk poortje dubbel (2 tabletten) | -2267 | 4,3 | 235,7 | 183,2 | 2,40 mmol/L | −1.527 |
| spiegelwacht: tablet als spiegel 3 u vóór het poortje < 0,85 | 1000 | 240,0 | 0,0 | 0,0 | 0,90 mmol/L | 0 |
| slim: na de ibuprofen elke 4e overslaan | 1000 | 240,0 | 0,0 | 0,0 | 1,00 mmol/L | 0 |

- elke 3e overslaan (1000) > alles slikken (628) > niets (-710): **gehaald**
- dubbel: max. spiegel 2,40 mmol/L (> 1,5), 183,2 u boven 1,5, regel "lever / giftig" op het eindscherm −1.527; score -2267 = laagste van alle lithiumruns (laagste: -2267, r04): **gehaald**
- **B2 375×667: gehaald**

### B3 Tikken, raceduur, "Nog een keer"

Tikken van openen tot de eerste speelhandeling (eerste tik op een tutorialknop, "Tablet"):
- met naam typen (tik naamveld + typen + Start + Tablet): 3 tikken (run r01); zonder naam (veld leeg laten): 2 tikken.
Tikken van openen tot race 1 loopt (tik op "Start race" meegeteld):
- met "Overslaan", zonder naam typen: 3 tikken (run r02: [data-actie="start"] → [data-tut="overslaan"] → [data-actie="start-race"])
- met "Overslaan", met naam typen: 4 tikken (run r04)
- volledige tutorial, met naam typen: 16, 16, 16, 16, 16, 16 tikken (runs r01, r03, r05, r07, r09, n01); waarvan in de tutorial: 13, 13, 13, 13, 13, 13
- tutorialhandelingen (stap:knop) in run r01: 1:slik, 2:klok, 3:spuit, 4:schema, 4:slik, 5:zetpil, 5:zetpil
Raceduur op normale snelheid (run n01, geen ?speed): race 1 93,2 s, race 2 93,2 s (klok van de bot: tik "Start race" → finish-overlay; spel zelf meet 93,0 s en 93,0 s, incl. 3 s aanloop). 60–120 s: **gehaald**
  Scores op normale snelheid: race 1 768, race 2 1000 (zelfde strategie op 4× in r01: 768, 1000).
"Nog een keer": 1 tik → fase race1, scherm scherm-race, klok loopt (-0,80 → -0,40 u), naam "Pilpiraat Zestig" (was "Pilpiraat Zestig"): **gehaald**
Tikken waarbij de knop > 0,6 s nog bedekt was (bv. tijdens een schermovergang van 0,35 s; de bot wacht dan tot de knop bovenop ligt): geen.
Knoppen die eerst in beeld gescrold moesten worden voor een tik: geen. Tikken die (volgens elementFromPoint) niet op de bedoelde knop zouden landen: geen.
- Samengevat (≤ 3 tikken van openen tot spelen): eerste speelhandeling 2 (zonder naam) / 3 (met naam); race 1 loopt na 3 (Overslaan, zonder naam) / 4 (Overslaan, met naam). Gehaald volgens de lezing "eerste speelhandeling ≤ 3": **gehaald**; race 1 loopt binnen 3 tikken (zonder naam, met Overslaan): **gehaald**.
- **B3 375×667: raceduur gehaald; "Nog een keer" gehaald; tikken: zie hierboven.**

### B4 Knoppen, scrollen, netwerk

- 215 schermmetingen (963 knopmetingen) op: einde, intro1, intro2, race1, race2, start, tutorial stap 1, tutorial stap 2, tutorial stap 3, tutorial stap 4, tutorial stap 5, tutorial stap 6.
- Kleinste zichtbare knop: demp "Geluid uit" 48×48 px (min. breedte 48 px, min. hoogte 48 px). Knoppen < 48×48: geen: **gehaald**
- Horizontaal scrollen (scrollWidth > clientWidth op document, body of actief scherm): 0 van 215 metingen; grootste scrollWidth 375 px bij clientWidth 375 px: **gehaald**
- Netwerkverzoeken (11 runs, elk een verse pagina): vóór/tijdens het laden 11 in totaal (http://127.0.0.1:33603/index.html); ná het laden 0: **gehaald**
- **B4 375×667: gehaald**

### B5 Eindscherm

- naam: computed font-size 36 px (min. 36; langste naam "Pilpiraat Zestig" (16 tekens): 36 px); totaal: 64 px (min. 64). Nabespreekvraag op het scherm: "Wat deed je toen je onder de streep zakte?".
- **B5 375×667: gehaald**

### B6 Console

- 11 volledige doorlopen (start → eindscherm, plus "Nog een keer"): consolefouten 0; waarschuwingen 0.
- **B6 375×667: gehaald**

### Determinisme

- r10 (4×, tutorial over) vs r01: race 1 768 vs 768, race 2 1000 vs 1000; toedieningen per poortje gelijk: ja.
- n01 (normale snelheid, tutorial vol) vs r01: race 1 768 vs 768, race 2 1000 vs 1000; toedieningen per poortje gelijk: ja.
- r01 toedieningen: 768 [slik,leeg,leeg,leeg,leeg,leeg,slik,leeg,leeg,leeg,leeg,leeg,spuit,leeg,leeg,leeg,leeg,leeg,slik,leeg,leeg,leeg,leeg,leeg] | 1000 [slik,slik,slik,slik,slik,slik,slik,slik,slik,slik,slik,slik,slik,slik,slik,slik,slik,niets,slik,slik,niets,slik,slik,niets,slik,slik,niets,slik,slik,niets]

### Runs in detail

| run | poging(en) | duur | tikken totaal | tikken race 1 / race 2 | race 1 toedieningen (poortje:keuze) | race 2 toedieningen | praktijkzin race 1 | praktijkzin race 2 |
|---|---|---|---|---|---|---|---|---|
| r01 | 1✓ | 58 s | 53 | 4 / 30 | 0:slik 6:slik 12:spuit 18:slik | 0:slik 1:slik 2:slik 3:slik 4:slik 5:slik 6:slik 7:slik 8:slik 9:slik 10:slik 11:slik 12:slik 13:slik 14:slik 15:slik 16:slik 17:niets 18:slik 19:slik 20:niets 21:slik 22:slik 23:niets 24:slik 25:slik 26:niets 27:slik 28:slik 29:niets | Tijdens de misselijkheid koos jij de spuit. Een prik werkt meteen, ook als opa Jan niet kan slikken. | Jij liet na de ibuprofen 33% van de doses weg. Dat was nodig, want de nieren ruimden minder op. In het echt verlaagt de arts de dosis en laat de spiegel prikken: pillen overslaan wordt makkelijk vergeten. |
| r02 | 1✓ | 48 s | 40 | 4 / 30 | 0:slik 6:slik 12:spuit 18:slik | 0:slik 1:slik 2:slik 3:slik 4:slik 5:slik 6:slik 7:slik 8:slik 9:slik 10:slik 11:slik 12:slik 13:slik 14:slik 15:slik 16:slik 17:slik 18:slik 19:slik 20:slik 21:slik 22:slik 23:slik 24:slik 25:slik 26:slik 27:slik 28:slik 29:slik | Tijdens de misselijkheid koos jij de spuit. Een prik werkt meteen, ook als opa Jan niet kan slikken. | Jij gaf na de ibuprofen gewoon alle doses en de spiegel kroop boven de 1,0, want de nieren ruimden minder op. In het echt: bij lithium liever paracetamol dan ibuprofen, en de spiegel laten prikken. |
| r03 | 1✓ | 57 s | 53 | 4 / 30 | 0:slik 6:slik 12:zetpil 18:slik | 0:niets 1:niets 2:niets 3:niets 4:niets 5:niets 6:niets 7:niets 8:niets 9:niets 10:niets 11:niets 12:niets 13:niets 14:niets 15:niets 16:niets 17:niets 18:niets 19:niets 20:niets 21:niets 22:niets 23:niets 24:niets 25:niets 26:niets 27:niets 28:niets 29:niets | Tijdens de misselijkheid koos jij de zetpil. Die werkte maar half: daar kun je niet op rekenen. | Jij gaf mevrouw De Vries geen lithium en de spiegel zakte onder de 0,6. Kans op terugval: somber of juist ontremd. |
| r04 | 1✓ | 49 s | 70 | 3 / 60 | 0:slik 6:slik 18:slik | 0:slik×2 1:slik×2 2:slik×2 3:slik×2 4:slik×2 5:slik×2 6:slik×2 7:slik×2 8:slik×2 9:slik×2 10:slik×2 11:slik×2 12:slik×2 13:slik×2 14:slik×2 15:slik×2 16:slik×2 17:slik×2 18:slik×2 19:slik×2 20:slik×2 21:slik×2 22:slik×2 23:slik×2 24:slik×2 25:slik×2 26:slik×2 27:slik×2 28:slik×2 29:slik×2 | Tijdens de misselijkheid kreeg opa Jan geen paracetamol, en de pijn kwam terug. Kan iemand niet slikken, dan kan het ook als zetpil of prik. | Jij gaf 30 keer een dubbele dosis en de spiegel kwam boven de 1,5: giftig. Bij lithium liggen goed en giftig dicht bij elkaar, dus nooit dubbel innemen, ook niet om in te halen. |
| r05 | 1✓ | 57 s | 49 | 0 / 30 | (geen) | 0:slik 1:slik 2:slik 3:slik 4:slik 5:slik 6:slik 7:slik 8:slik 9:slik 10:slik 11:slik 12:slik 13:slik 14:slik 15:slik 16:niets 17:slik 18:slik 19:niets 20:slik 21:slik 22:niets 23:slik 24:slik 25:niets 26:slik 27:slik 28:niets 29:slik | Jij gaf opa Jan geen paracetamol, dus de pijn bleef. Een vast schema op vaste tijden houdt de spiegel boven de streep. | Jij liet na de ibuprofen 33% van de doses weg. Dat was nodig, want de nieren ruimden minder op. In het echt verlaagt de arts de dosis en laat de spiegel prikken: pillen overslaan wordt makkelijk vergeten. |
| r06 | 1✓ | 49 s | 55 | 18 / 30 | 0:slik 1:slik 2:slik 3:slik 4:slik 5:slik 6:slik 7:slik 8:slik 9:slik 16:slik 17:slik 18:slik 19:slik 20:slik 21:slik 22:slik 23:slik | 0:slik 1:slik 2:slik 3:slik 4:slik 5:slik 6:slik 7:slik 8:slik 9:slik 10:slik 11:slik 12:slik 13:slik 14:slik 15:slik 16:slik 17:slik 18:niets 19:slik 20:slik 21:slik 22:niets 23:slik 24:slik 25:slik 26:niets 27:slik 28:slik 29:slik | Jij gaf 18 g in 24 uur, meer dan de 4 g die mag. Te veel paracetamol beschadigt de lever. | Jij liet na de ibuprofen 20% van de doses weg. Dat was nodig, want de nieren ruimden minder op. In het echt verlaagt de arts de dosis en laat de spiegel prikken: pillen overslaan wordt makkelijk vergeten. |
| r07 | 1✓ | 57 s | 53 | 4 / 30 | 0:spuit 5:slik 11:spuit 16:zetpil | 0:slik 1:slik 2:slik 3:slik 4:slik 5:slik 6:slik 7:slik 8:slik 9:slik 10:slik 11:slik 12:slik 13:slik 14:slik 15:slik 16:slik 17:niets 18:slik 19:slik 20:niets 21:slik 22:slik 23:niets 24:slik 25:slik 26:niets 27:slik 28:slik 29:niets | Tijdens de misselijkheid koos jij de spuit. Een prik werkt meteen, ook als opa Jan niet kan slikken. | Jij liet na de ibuprofen 33% van de doses weg. Dat was nodig, want de nieren ruimden minder op. In het echt verlaagt de arts de dosis en laat de spiegel prikken: pillen overslaan wordt makkelijk vergeten. |
| r08 | 1✓ | 49 s | 41 | 4 / 30 | 0:slik 5:slik 10:zetpil 16:zetpil | 0:slik 1:slik 2:slik 3:slik 4:slik 5:slik 6:slik 7:slik 8:slik 9:slik 10:slik 11:slik 12:slik 13:slik 14:slik 15:slik 16:slik 17:slik 18:slik 19:slik 20:slik 21:slik 22:slik 23:slik 24:slik 25:slik 26:slik 27:slik 28:slik 29:slik | Tijdens de misselijkheid koos jij de zetpil. Die werkte deze keer goed, maar een zetpil werkt soms goed en soms nauwelijks: daar kun je niet op rekenen. | Jij gaf na de ibuprofen gewoon alle doses en de spiegel kroop boven de 1,0, want de nieren ruimden minder op. In het echt: bij lithium liever paracetamol dan ibuprofen, en de spiegel laten prikken. |
| r09 | 1✓ | 57 s | 83 | 4 / 60 | 0:slik 4:slik 9:slik 14:spuit | 0:slik×2 1:slik×2 2:slik×2 3:slik×2 4:slik×2 5:slik×2 6:slik×2 7:slik×2 8:slik×2 9:slik×2 10:slik×2 11:slik×2 12:slik×2 13:slik×2 14:slik×2 15:slik×2 16:slik×2 17:slik×2 18:slik×2 19:slik×2 20:slik×2 21:slik×2 22:slik×2 23:slik×2 24:slik×2 25:slik×2 26:slik×2 27:slik×2 28:slik×2 29:slik×2 | Tijdens de misselijkheid koos jij de spuit. Een prik werkt meteen, ook als opa Jan niet kan slikken. | Jij gaf 30 keer een dubbele dosis en de spiegel kwam boven de 1,5: giftig. Bij lithium liggen goed en giftig dicht bij elkaar, dus nooit dubbel innemen, ook niet om in te halen. |
| r10 | 1✓ | 49 s | 41 | 4 / 30 | 0:slik 6:slik 12:spuit 18:slik | 0:slik 1:slik 2:slik 3:slik 4:slik 5:slik 6:slik 7:slik 8:slik 9:slik 10:slik 11:slik 12:slik 13:slik 14:slik 15:slik 16:slik 17:niets 18:slik 19:slik 20:niets 21:slik 22:slik 23:niets 24:slik 25:slik 26:niets 27:slik 28:slik 29:niets | Tijdens de misselijkheid koos jij de spuit. Een prik werkt meteen, ook als opa Jan niet kan slikken. | Jij liet na de ibuprofen 33% van de doses weg. Dat was nodig, want de nieren ruimden minder op. In het echt verlaagt de arts de dosis en laat de spiegel prikken: pillen overslaan wordt makkelijk vergeten. |
| n01 | 1✓ | 215 s | 54 | 4 / 30 | 0:slik 6:slik 12:spuit 18:slik | 0:slik 1:slik 2:slik 3:slik 4:slik 5:slik 6:slik 7:slik 8:slik 9:slik 10:slik 11:slik 12:slik 13:slik 14:slik 15:slik 16:slik 17:niets 18:slik 19:slik 20:niets 21:slik 22:slik 23:niets 24:slik 25:slik 26:niets 27:slik 28:slik 29:niets | Tijdens de misselijkheid koos jij de spuit. Een prik werkt meteen, ook als opa Jan niet kan slikken. | Jij liet na de ibuprofen 33% van de doses weg. Dat was nodig, want de nieren ruimden minder op. In het echt verlaagt de arts de dosis en laat de spiegel prikken: pillen overslaan wordt makkelijk vergeten. |

Ongeldige pogingen (opnieuw gespeeld): geen.

## Viewport 390×844

| run | paracetamol-strategie | lithium-strategie | tutorial | snelheid | race 1 (scherm) | race 1 scoreSchema | race 2 (scherm) | race 2 scoreSchema | totaal (scherm) | geldig (pogingen) |
|---|---|---|---|---|---|---|---|---|---|---|
| r01 | echt schema (1 g om 0/6/18 slik, 12 spuit) | na de ibuprofen elke 3e overslaan | vol | 4× | 768 | 768 | 1000 | 1000 | 1768 | ja (1) |
| r02 | spuit-variant (12 u spuit) | alles slikken | Overslaan | 4× | 768 | 768 | 628 | 628 | 1396 | ja (1) |
| r03 | zetpil-variant (12 u zetpil) | niets (elk poortje "Overslaan") | vol | 4× | 736 | 736 | -710 | -710 | 26 | ja (1) |
| r04 | gemiste dosis (niets op 12 u) | elk poortje dubbel (2 tabletten) | Overslaan | 4× | 418 | 418 | -2267 | -2267 | -1849 | ja (1) |
| r05 | niets (geen enkele tik) | spiegelwacht: tablet als spiegel 3 u vóór het poortje < 0,85 | vol | 4× | -1000 | -1000 | 1000 | 1000 | 0 | ja (1) |
| r06 | elk uur slikken (waar het kan) | slim: na de ibuprofen elke 4e overslaan | Overslaan | 4× | -3518 | -3518 | 1000 | 1000 | -2518 | ja (1) |
| r07 | slim A: spuit 0, tablet 5, spuit 11, zetpil 16 | na de ibuprofen elke 3e overslaan | vol | 4× | 828 | 828 | 1000 | 1000 | 1828 | ja (1) |
| r08 | slim B: tablet 0, tablet 5, zetpil 10, zetpil 16 | alles slikken | Overslaan | 4× | 805 | 805 | 628 | 628 | 1433 | ja (1) |
| r09 | greedy: doseer als spiegel over 1 u onder 5 zakt (≥3 u na vorige, max. 4 g/24 u) | elk poortje dubbel (2 tabletten) | vol | 4× | 736 | 736 | -2267 | -2267 | -1531 | ja (1) |
| r10 | echt schema (1 g om 0/6/18 slik, 12 spuit) | na de ibuprofen elke 3e overslaan | Overslaan | 4× | 768 | 768 | 1000 | 1000 | 1768 | ja (1) |
| n01 | echt schema (1 g om 0/6/18 slik, 12 spuit) | na de ibuprofen elke 3e overslaan | vol | normaal (1×) | 768 | 768 | 1000 | 1000 | 1768 | ja (1) |

Controles: finish-overlay = eindscherm per race: ja; scherm = scoreSchema: ja (alle runs, Δ 0); totaal = race 1 + race 2: ja; getypte naam op eindscherm: ja.

### B1 Paracetamol

| strategie | race 1 (scherm) | tijd in zone (u, scoreSchema) | totale dosis | lever |
|---|---|---|---|---|
| echt schema (1 g om 0/6/18 slik, 12 spuit) | 768 | 18,70 van 24 (77,9%) | 4 g | heel |
| spuit-variant (12 u spuit) | 768 | 18,70 van 24 (77,9%) | 4 g | heel |
| zetpil-variant (12 u zetpil) | 736 | 17,96 van 24 (74,8%) | 4 g | heel |
| gemiste dosis (niets op 12 u) | 418 | 12,98 van 24 (54,1%) | 3 g | heel |
| niets (geen enkele tik) | -1000 | 0,00 van 24 (0,0%) | 0 g | heel |
| elk uur slikken (waar het kan) | -3518 | 23,67 van 24 (98,6%) | 18 g | beschadigd (-4500) |
| slim A: spuit 0, tablet 5, spuit 11, zetpil 16 | 828 | 20,01 van 24 (83,4%) | 4 g | heel |
| slim B: tablet 0, tablet 5, zetpil 10, zetpil 16 | 805 | 19,59 van 24 (81,6%) | 4 g | heel |
| greedy: doseer als spiegel over 1 u onder 5 zakt (≥3 u na vorige, max. 4 g/24 u) | 736 | 18,92 van 24 (78,8%) | 4 g | heel |

- echt (768) = spuit-variant (768) ≥ zetpil-variant (736) > gemist (418) > niets (-1000): **gehaald**
- elk uur slikken: leverschade zichtbaar op het scherm — tijdens de race levermeter class "vol"=true, zichtbaar=true, tekst "5 g van max. 4 g"; eindscherm dagteller "Dagteller 18 g max. 4 g per 24 uur. Lever beschadigd." (over=true), regel "lever / giftig" −4.500; score -3518 < echt 768: **gehaald**
- hoogste botscore race 1: 828 (r07, slim A: spuit 0, tablet 5, spuit 11, zetpil 16); echt = 768 = 92,8% (≥ 80%): **gehaald**
- **B1 390×844: gehaald**

### B2 Lithium

| strategie | race 2 (scherm) | in zone (u) | > 1,0 (u) | > 1,5 (u) | max. spiegel gezien | regel "lever / giftig" (scherm) |
|---|---|---|---|---|---|---|
| na de ibuprofen elke 3e overslaan | 1000 | 240,0 | 0,0 | 0,0 | 0,95 mmol/L | 0 |
| alles slikken | 628 | 151,9 | 88,1 | 0,0 | 1,20 mmol/L | 0 |
| niets (elk poortje "Overslaan") | -710 | 8,4 | 0,0 | 0,0 | 0,76 mmol/L | 0 |
| elk poortje dubbel (2 tabletten) | -2267 | 4,3 | 235,7 | 183,2 | 2,40 mmol/L | −1.527 |
| spiegelwacht: tablet als spiegel 3 u vóór het poortje < 0,85 | 1000 | 240,0 | 0,0 | 0,0 | 0,90 mmol/L | 0 |
| slim: na de ibuprofen elke 4e overslaan | 1000 | 240,0 | 0,0 | 0,0 | 1,00 mmol/L | 0 |

- elke 3e overslaan (1000) > alles slikken (628) > niets (-710): **gehaald**
- dubbel: max. spiegel 2,40 mmol/L (> 1,5), 183,2 u boven 1,5, regel "lever / giftig" op het eindscherm −1.527; score -2267 = laagste van alle lithiumruns (laagste: -2267, r04): **gehaald**
- **B2 390×844: gehaald**

### B3 Tikken, raceduur, "Nog een keer"

Tikken van openen tot de eerste speelhandeling (eerste tik op een tutorialknop, "Tablet"):
- met naam typen (tik naamveld + typen + Start + Tablet): 3 tikken (run r01); zonder naam (veld leeg laten): 2 tikken.
Tikken van openen tot race 1 loopt (tik op "Start race" meegeteld):
- met "Overslaan", zonder naam typen: 3 tikken (run r02: [data-actie="start"] → [data-tut="overslaan"] → [data-actie="start-race"])
- met "Overslaan", met naam typen: 4 tikken (run r04)
- volledige tutorial, met naam typen: 16, 16, 16, 16, 16, 16 tikken (runs r01, r03, r05, r07, r09, n01); waarvan in de tutorial: 13, 13, 13, 13, 13, 13
- tutorialhandelingen (stap:knop) in run r01: 1:slik, 2:klok, 3:spuit, 4:schema, 4:slik, 5:zetpil, 5:zetpil
Raceduur op normale snelheid (run n01, geen ?speed): race 1 93,2 s, race 2 93,2 s (klok van de bot: tik "Start race" → finish-overlay; spel zelf meet 93,0 s en 93,0 s, incl. 3 s aanloop). 60–120 s: **gehaald**
  Scores op normale snelheid: race 1 768, race 2 1000 (zelfde strategie op 4× in r01: 768, 1000).
"Nog een keer": 1 tik → fase race1, scherm scherm-race, klok loopt (-0,80 → -0,40 u), naam "Pilpiraat Zestig" (was "Pilpiraat Zestig"): **gehaald**
Tikken waarbij de knop > 0,6 s nog bedekt was (bv. tijdens een schermovergang van 0,35 s; de bot wacht dan tot de knop bovenop ligt): geen.
Knoppen die eerst in beeld gescrold moesten worden voor een tik: geen. Tikken die (volgens elementFromPoint) niet op de bedoelde knop zouden landen: geen.
- Samengevat (≤ 3 tikken van openen tot spelen): eerste speelhandeling 2 (zonder naam) / 3 (met naam); race 1 loopt na 3 (Overslaan, zonder naam) / 4 (Overslaan, met naam). Gehaald volgens de lezing "eerste speelhandeling ≤ 3": **gehaald**; race 1 loopt binnen 3 tikken (zonder naam, met Overslaan): **gehaald**.
- **B3 390×844: raceduur gehaald; "Nog een keer" gehaald; tikken: zie hierboven.**

### B4 Knoppen, scrollen, netwerk

- 215 schermmetingen (960 knopmetingen) op: einde, intro1, intro2, race1, race2, start, tutorial stap 1, tutorial stap 2, tutorial stap 3, tutorial stap 4, tutorial stap 5, tutorial stap 6.
- Kleinste zichtbare knop: demp "Geluid uit" 48×48 px (min. breedte 48 px, min. hoogte 48 px). Knoppen < 48×48: geen: **gehaald**
- Horizontaal scrollen (scrollWidth > clientWidth op document, body of actief scherm): 0 van 215 metingen; grootste scrollWidth 390 px bij clientWidth 390 px: **gehaald**
- Netwerkverzoeken (11 runs, elk een verse pagina): vóór/tijdens het laden 11 in totaal (http://127.0.0.1:33603/index.html); ná het laden 0: **gehaald**
- **B4 390×844: gehaald**

### B5 Eindscherm

- naam: computed font-size 40 px (min. 40; langste naam "Pilpiraat Zestig" (16 tekens): 40 px); totaal: 80 px (min. 80). Nabespreekvraag op het scherm: "Wat deed je toen je onder de streep zakte?".
- **B5 390×844: gehaald**

### B6 Console

- 11 volledige doorlopen (start → eindscherm, plus "Nog een keer"): consolefouten 0; waarschuwingen 0.
- **B6 390×844: gehaald**

### Determinisme

- r10 (4×, tutorial over) vs r01: race 1 768 vs 768, race 2 1000 vs 1000; toedieningen per poortje gelijk: ja.
- n01 (normale snelheid, tutorial vol) vs r01: race 1 768 vs 768, race 2 1000 vs 1000; toedieningen per poortje gelijk: ja.
- r01 toedieningen: 768 [slik,leeg,leeg,leeg,leeg,leeg,slik,leeg,leeg,leeg,leeg,leeg,spuit,leeg,leeg,leeg,leeg,leeg,slik,leeg,leeg,leeg,leeg,leeg] | 1000 [slik,slik,slik,slik,slik,slik,slik,slik,slik,slik,slik,slik,slik,slik,slik,slik,slik,niets,slik,slik,niets,slik,slik,niets,slik,slik,niets,slik,slik,niets]

### Runs in detail

| run | poging(en) | duur | tikken totaal | tikken race 1 / race 2 | race 1 toedieningen (poortje:keuze) | race 2 toedieningen | praktijkzin race 1 | praktijkzin race 2 |
|---|---|---|---|---|---|---|---|---|
| r01 | 1✓ | 57 s | 53 | 4 / 30 | 0:slik 6:slik 12:spuit 18:slik | 0:slik 1:slik 2:slik 3:slik 4:slik 5:slik 6:slik 7:slik 8:slik 9:slik 10:slik 11:slik 12:slik 13:slik 14:slik 15:slik 16:slik 17:niets 18:slik 19:slik 20:niets 21:slik 22:slik 23:niets 24:slik 25:slik 26:niets 27:slik 28:slik 29:niets | Tijdens de misselijkheid koos jij de spuit. Een prik werkt meteen, ook als opa Jan niet kan slikken. | Jij liet na de ibuprofen 33% van de doses weg. Dat was nodig, want de nieren ruimden minder op. In het echt verlaagt de arts de dosis en laat de spiegel prikken: pillen overslaan wordt makkelijk vergeten. |
| r02 | 1✓ | 49 s | 40 | 4 / 30 | 0:slik 6:slik 12:spuit 18:slik | 0:slik 1:slik 2:slik 3:slik 4:slik 5:slik 6:slik 7:slik 8:slik 9:slik 10:slik 11:slik 12:slik 13:slik 14:slik 15:slik 16:slik 17:slik 18:slik 19:slik 20:slik 21:slik 22:slik 23:slik 24:slik 25:slik 26:slik 27:slik 28:slik 29:slik | Tijdens de misselijkheid koos jij de spuit. Een prik werkt meteen, ook als opa Jan niet kan slikken. | Jij gaf na de ibuprofen gewoon alle doses en de spiegel kroop boven de 1,0, want de nieren ruimden minder op. In het echt: bij lithium liever paracetamol dan ibuprofen, en de spiegel laten prikken. |
| r03 | 1✓ | 57 s | 53 | 4 / 30 | 0:slik 6:slik 12:zetpil 18:slik | 0:niets 1:niets 2:niets 3:niets 4:niets 5:niets 6:niets 7:niets 8:niets 9:niets 10:niets 11:niets 12:niets 13:niets 14:niets 15:niets 16:niets 17:niets 18:niets 19:niets 20:niets 21:niets 22:niets 23:niets 24:niets 25:niets 26:niets 27:niets 28:niets 29:niets | Tijdens de misselijkheid koos jij de zetpil. Die werkte maar half: daar kun je niet op rekenen. | Jij gaf mevrouw De Vries geen lithium en de spiegel zakte onder de 0,6. Kans op terugval: somber of juist ontremd. |
| r04 | 1✓ | 49 s | 70 | 3 / 60 | 0:slik 6:slik 18:slik | 0:slik×2 1:slik×2 2:slik×2 3:slik×2 4:slik×2 5:slik×2 6:slik×2 7:slik×2 8:slik×2 9:slik×2 10:slik×2 11:slik×2 12:slik×2 13:slik×2 14:slik×2 15:slik×2 16:slik×2 17:slik×2 18:slik×2 19:slik×2 20:slik×2 21:slik×2 22:slik×2 23:slik×2 24:slik×2 25:slik×2 26:slik×2 27:slik×2 28:slik×2 29:slik×2 | Tijdens de misselijkheid kreeg opa Jan geen paracetamol, en de pijn kwam terug. Kan iemand niet slikken, dan kan het ook als zetpil of prik. | Jij gaf 30 keer een dubbele dosis en de spiegel kwam boven de 1,5: giftig. Bij lithium liggen goed en giftig dicht bij elkaar, dus nooit dubbel innemen, ook niet om in te halen. |
| r05 | 1✓ | 57 s | 49 | 0 / 30 | (geen) | 0:slik 1:slik 2:slik 3:slik 4:slik 5:slik 6:slik 7:slik 8:slik 9:slik 10:slik 11:slik 12:slik 13:slik 14:slik 15:slik 16:niets 17:slik 18:slik 19:niets 20:slik 21:slik 22:niets 23:slik 24:slik 25:niets 26:slik 27:slik 28:niets 29:slik | Jij gaf opa Jan geen paracetamol, dus de pijn bleef. Een vast schema op vaste tijden houdt de spiegel boven de streep. | Jij liet na de ibuprofen 33% van de doses weg. Dat was nodig, want de nieren ruimden minder op. In het echt verlaagt de arts de dosis en laat de spiegel prikken: pillen overslaan wordt makkelijk vergeten. |
| r06 | 1✓ | 49 s | 55 | 18 / 30 | 0:slik 1:slik 2:slik 3:slik 4:slik 5:slik 6:slik 7:slik 8:slik 9:slik 16:slik 17:slik 18:slik 19:slik 20:slik 21:slik 22:slik 23:slik | 0:slik 1:slik 2:slik 3:slik 4:slik 5:slik 6:slik 7:slik 8:slik 9:slik 10:slik 11:slik 12:slik 13:slik 14:slik 15:slik 16:slik 17:slik 18:niets 19:slik 20:slik 21:slik 22:niets 23:slik 24:slik 25:slik 26:niets 27:slik 28:slik 29:slik | Jij gaf 18 g in 24 uur, meer dan de 4 g die mag. Te veel paracetamol beschadigt de lever. | Jij liet na de ibuprofen 20% van de doses weg. Dat was nodig, want de nieren ruimden minder op. In het echt verlaagt de arts de dosis en laat de spiegel prikken: pillen overslaan wordt makkelijk vergeten. |
| r07 | 1✓ | 57 s | 53 | 4 / 30 | 0:spuit 5:slik 11:spuit 16:zetpil | 0:slik 1:slik 2:slik 3:slik 4:slik 5:slik 6:slik 7:slik 8:slik 9:slik 10:slik 11:slik 12:slik 13:slik 14:slik 15:slik 16:slik 17:niets 18:slik 19:slik 20:niets 21:slik 22:slik 23:niets 24:slik 25:slik 26:niets 27:slik 28:slik 29:niets | Tijdens de misselijkheid koos jij de spuit. Een prik werkt meteen, ook als opa Jan niet kan slikken. | Jij liet na de ibuprofen 33% van de doses weg. Dat was nodig, want de nieren ruimden minder op. In het echt verlaagt de arts de dosis en laat de spiegel prikken: pillen overslaan wordt makkelijk vergeten. |
| r08 | 1✓ | 49 s | 41 | 4 / 30 | 0:slik 5:slik 10:zetpil 16:zetpil | 0:slik 1:slik 2:slik 3:slik 4:slik 5:slik 6:slik 7:slik 8:slik 9:slik 10:slik 11:slik 12:slik 13:slik 14:slik 15:slik 16:slik 17:slik 18:slik 19:slik 20:slik 21:slik 22:slik 23:slik 24:slik 25:slik 26:slik 27:slik 28:slik 29:slik | Tijdens de misselijkheid koos jij de zetpil. Die werkte deze keer goed, maar een zetpil werkt soms goed en soms nauwelijks: daar kun je niet op rekenen. | Jij gaf na de ibuprofen gewoon alle doses en de spiegel kroop boven de 1,0, want de nieren ruimden minder op. In het echt: bij lithium liever paracetamol dan ibuprofen, en de spiegel laten prikken. |
| r09 | 1✓ | 57 s | 83 | 4 / 60 | 0:slik 4:slik 9:slik 14:spuit | 0:slik×2 1:slik×2 2:slik×2 3:slik×2 4:slik×2 5:slik×2 6:slik×2 7:slik×2 8:slik×2 9:slik×2 10:slik×2 11:slik×2 12:slik×2 13:slik×2 14:slik×2 15:slik×2 16:slik×2 17:slik×2 18:slik×2 19:slik×2 20:slik×2 21:slik×2 22:slik×2 23:slik×2 24:slik×2 25:slik×2 26:slik×2 27:slik×2 28:slik×2 29:slik×2 | Tijdens de misselijkheid koos jij de spuit. Een prik werkt meteen, ook als opa Jan niet kan slikken. | Jij gaf 30 keer een dubbele dosis en de spiegel kwam boven de 1,5: giftig. Bij lithium liggen goed en giftig dicht bij elkaar, dus nooit dubbel innemen, ook niet om in te halen. |
| r10 | 1✓ | 49 s | 41 | 4 / 30 | 0:slik 6:slik 12:spuit 18:slik | 0:slik 1:slik 2:slik 3:slik 4:slik 5:slik 6:slik 7:slik 8:slik 9:slik 10:slik 11:slik 12:slik 13:slik 14:slik 15:slik 16:slik 17:niets 18:slik 19:slik 20:niets 21:slik 22:slik 23:niets 24:slik 25:slik 26:niets 27:slik 28:slik 29:niets | Tijdens de misselijkheid koos jij de spuit. Een prik werkt meteen, ook als opa Jan niet kan slikken. | Jij liet na de ibuprofen 33% van de doses weg. Dat was nodig, want de nieren ruimden minder op. In het echt verlaagt de arts de dosis en laat de spiegel prikken: pillen overslaan wordt makkelijk vergeten. |
| n01 | 1✓ | 215 s | 54 | 4 / 30 | 0:slik 6:slik 12:spuit 18:slik | 0:slik 1:slik 2:slik 3:slik 4:slik 5:slik 6:slik 7:slik 8:slik 9:slik 10:slik 11:slik 12:slik 13:slik 14:slik 15:slik 16:slik 17:niets 18:slik 19:slik 20:niets 21:slik 22:slik 23:niets 24:slik 25:slik 26:niets 27:slik 28:slik 29:niets | Tijdens de misselijkheid koos jij de spuit. Een prik werkt meteen, ook als opa Jan niet kan slikken. | Jij liet na de ibuprofen 33% van de doses weg. Dat was nodig, want de nieren ruimden minder op. In het echt verlaagt de arts de dosis en laat de spiegel prikken: pillen overslaan wordt makkelijk vergeten. |

Ongeldige pogingen (opnieuw gespeeld): geen.

