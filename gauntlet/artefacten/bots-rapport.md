# Bots-rapport §6B — Slikken of Stikken

Gegenereerd door `node tests/bots.mjs` op 2026-10-14 06:11:12 UTC. Looptijd: 1,0 min. Playwright 1.56.1, Chromium headless (/opt/pw-browsers).

**Opzet.** Het echte `index.html` (lokale http-server op 127.0.0.1) in mobiele emulatie (isMobile, hasTouch, Pixel-5-UA): 375×667 @2x en 390×844 @3x. De bots handelen alleen via `page.touchscreen.tap` op het midden van een zichtbare knop (vooraf met `elementFromPoint` gecontroleerd). `SoS.debug` wordt alleen gelezen (doelpoortje, open/te laat, gekozen keuze, spiegel, fase). Scores komen van het scherm (finish-overlay en eindscherm); daarna wordt het gespeelde schema uit het rooster op het eindscherm nagerekend met `SoS.score.scoreSchema` (src/score.js, identiek aan de inline code). Strategie-runs op `?speed=4`; run n01 op normale snelheid (geen parameter). Elke run: start → tutorial (vol of "Overslaan") → race 1 → race 2 → eindscherm. Een run is geldig als elk poortje precies de keuze van de bot kreeg (debug.gegeven én rooster op het eindscherm); anders opnieuw (max. 3 pogingen).

## Samenvatting per eis

| eis | 375×667 |
|---|---|
| B1 paracetamol-rangorde, leverschade, echt ≥ 80% van hoogste | niet gehaald (echt 768 = 100,0% van 768) |
| B2 lithium-rangorde, dubbel toxisch en laagst | niet gehaald |
| B3 raceduur 60–120 s (normale snelheid) | niet gehaald |
| B3 "Nog een keer" = 1 tik, race 1 loopt, zelfde naam | niet gehaald |
| B3 tikken tot spelen | zie B3 per viewport (getallen) |
| B4 knoppen ≥ 48×48, geen h-scroll, geen netwerk na laden | gehaald |
| B5 naam en totaal ≥ 32 px | gehaald |
| B6 0 consolefouten | gehaald |

## Viewport 375×667

| run | paracetamol-strategie | lithium-strategie | tutorial | snelheid | race 1 (scherm) | race 1 scoreSchema | race 2 (scherm) | race 2 scoreSchema | totaal (scherm) | geldig (pogingen) |
|---|---|---|---|---|---|---|---|---|---|---|
| r01 | echt schema (1 g om 0/6/18 slik, 12 spuit) | na de ibuprofen elke 3e overslaan | vol | 4× | 768 | 768 | 1000 | 1000 | 1768 | ja (1) |

Controles: finish-overlay = eindscherm per race: ja; scherm = scoreSchema: ja (alle runs, Δ 0); totaal = race 1 + race 2: ja; getypte naam op eindscherm: ja.

### B1 Paracetamol

| strategie | race 1 (scherm) | tijd in zone (u, scoreSchema) | totale dosis | lever |
|---|---|---|---|---|
| echt schema (1 g om 0/6/18 slik, 12 spuit) | 768 | 18,70 van 24 (77,9%) | 4 g | heel |
| spuit-variant (12 u spuit) | – | – | – | – |
| zetpil-variant (12 u zetpil) | – | – | – | – |
| gemiste dosis (niets op 12 u) | – | – | – | – |
| niets (geen enkele tik) | – | – | – | – |
| elk uur slikken (waar het kan) | – | – | – | – |
| slim A: spuit 0, tablet 5, spuit 11, zetpil 16 | – | – | – | – |
| slim B: tablet 0, tablet 5, zetpil 10, zetpil 16 | – | – | – | – |
| greedy: doseer als spiegel over 1 u onder 5 zakt (≥3 u na vorige, max. 4 g/24 u) | – | – | – | – |

- echt (768) = spuit-variant (NaN) ≥ zetpil-variant (NaN) > gemist (NaN) > niets (NaN): **niet gehaald**
- elk uur slikken: leverschade zichtbaar op het scherm — tijdens de race levermeter –; eindscherm dagteller "–" (over=–), regel "lever / giftig" –; score NaN < echt 768: **niet gehaald**
- hoogste botscore race 1: 768 (r01, echt schema (1 g om 0/6/18 slik, 12 spuit)); echt = 768 = 100,0% (≥ 80%): **gehaald**
- **B1 375×667: niet gehaald**

### B2 Lithium

| strategie | race 2 (scherm) | in zone (u) | > 1,0 (u) | > 1,5 (u) | max. spiegel gezien | regel "lever / giftig" (scherm) |
|---|---|---|---|---|---|---|
| na de ibuprofen elke 3e overslaan | 1000 | 240,0 | 0,0 | 0,0 | 0,95 mmol/L | 0 |
| alles slikken | – | – | – | – | – | – |
| niets (elk poortje "Overslaan") | – | – | – | – | – | – |
| elk poortje dubbel (2 tabletten) | – | – | – | – | – | – |
| spiegelwacht: tablet als spiegel 3 u vóór het poortje < 0,85 | – | – | – | – | – | – |
| slim: na de ibuprofen elke 4e overslaan | – | – | – | – | – | – |

- elke 3e overslaan (1000) > alles slikken (NaN) > niets (NaN): **niet gehaald**
- dubbel: max. spiegel – mmol/L (> 1,5), – u boven 1,5, regel "lever / giftig" op het eindscherm –; score NaN = laagste van alle lithiumruns (laagste: 1000, r01): **niet gehaald**
- **B2 375×667: niet gehaald**

### B3 Tikken, raceduur, "Nog een keer"

Tikken van openen tot de eerste speelhandeling (eerste tik op een tutorialknop, "Tablet"):
- met naam typen (tik naamveld + typen + Start + Tablet): 3 tikken (run r01); zonder naam (veld leeg laten): 2 tikken.
Tikken van openen tot race 1 loopt (tik op "Start race" meegeteld):
- met "Overslaan", zonder naam typen: – tikken (run –: )
- met "Overslaan", met naam typen: – tikken (run –)
- volledige tutorial, met naam typen: 16 tikken (runs r01); waarvan in de tutorial: 13
- tutorialhandelingen (stap:knop) in run r01: 1:slik, 2:klok, 3:spuit, 4:schema, 4:slik, 5:zetpil, 5:zetpil
Raceduur op normale snelheid: niet gemeten (--kort).
Knoppen die eerst in beeld gescrold moesten worden voor een tik: geen. Tikken die (volgens elementFromPoint) niet op de bedoelde knop zouden landen: geen.
- Samengevat (≤ 3 tikken van openen tot spelen): eerste speelhandeling 2 (zonder naam) / 3 (met naam); race 1 loopt na – (Overslaan, zonder naam) / – (Overslaan, met naam). Gehaald volgens de lezing "eerste speelhandeling ≤ 3": **gehaald**; race 1 loopt binnen 3 tikken (zonder naam, met Overslaan): **niet gehaald**.
- **B3 375×667: raceduur niet gehaald; "Nog een keer" niet gehaald; tikken: zie hierboven.**

### B4 Knoppen, scrollen, netwerk

- 24 schermmetingen (105 knopmetingen) op: einde, intro1, intro2, race1, race2, start, tutorial stap 1, tutorial stap 2, tutorial stap 3, tutorial stap 4, tutorial stap 5, tutorial stap 6.
- Kleinste zichtbare knop: demp "Geluid uit" 48×48 px (min. breedte 48 px, min. hoogte 48 px). Knoppen < 48×48: geen: **gehaald**
- Horizontaal scrollen (scrollWidth > clientWidth op document, body of actief scherm): 0 van 24 metingen; grootste scrollWidth 375 px bij clientWidth 375 px: **gehaald**
- Netwerkverzoeken: vóór/tijdens het laden 1 (http://127.0.0.1:43459/index.html); ná het laden 0: **gehaald**
- **B4 375×667: gehaald**

### B5 Eindscherm

- naam: computed font-size 36 px (min. 36; langste naam "Bot Echt" (8 tekens): 36 px); totaal: 64 px (min. 64). Nabespreekvraag op het scherm: "Wat deed je toen je onder de streep zakte?".
- **B5 375×667: gehaald**

### B6 Console

- 1 volledige doorlopen (start → eindscherm): consolefouten 0; waarschuwingen 0.
- **B6 375×667: gehaald**

### Determinisme

- r01 toedieningen: 768 [slik,leeg,leeg,leeg,leeg,leeg,slik,leeg,leeg,leeg,leeg,leeg,spuit,leeg,leeg,leeg,leeg,leeg,slik,leeg,leeg,leeg,leeg,leeg] | 1000 [slik,slik,slik,slik,slik,slik,slik,slik,slik,slik,slik,slik,slik,slik,slik,slik,slik,niets,slik,slik,niets,slik,slik,niets,slik,slik,niets,slik,slik,niets]

### Runs in detail

| run | poging(en) | duur | tikken totaal | tikken race 1 / race 2 | race 1 toedieningen (poortje:keuze) | race 2 toedieningen | praktijkzin race 1 | praktijkzin race 2 |
|---|---|---|---|---|---|---|---|---|
| r01 | 1✓ | 57 s | 53 | 4 / 30 | 0:slik 6:slik 12:spuit 18:slik | 0:slik 1:slik 2:slik 3:slik 4:slik 5:slik 6:slik 7:slik 8:slik 9:slik 10:slik 11:slik 12:slik 13:slik 14:slik 15:slik 16:slik 17:niets 18:slik 19:slik 20:niets 21:slik 22:slik 23:niets 24:slik 25:slik 26:niets 27:slik 28:slik 29:niets | Tijdens de misselijkheid koos jij de spuit. Een prik werkt meteen, ook als opa Jan niet kan slikken. | Jij liet na de ibuprofen 33% van de doses weg. Dat was nodig, want de nieren ruimden minder op. In het echt verlaagt de arts de dosis en laat de spiegel prikken: pillen overslaan wordt makkelijk vergeten. |

Ongeldige pogingen (opnieuw gespeeld): geen.

