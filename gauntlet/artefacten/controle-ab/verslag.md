# Controle §6A en §6B — onafhankelijk verslag

Gecontroleerde stand: branch `claude/optimistic-franklin-vk86yy`, `index.html` sha256 `173b963c5413…` (gelijk aan de build in `gauntlet/artefacten/bots-rapport.md`). Bron: `docs/bouwopdracht.md`. Niets gewijzigd in `src/`, `tests/`, `tools/`, `docs/` of `index.html`.

Eigen scripts en uitvoer in deze map:
- `narekenen.mjs` / `narekenen.uit.txt` — eigen formules en eigen RK4-integratie (stap 0,005 u), vergeleken met `src/model.js` en het casusblad.
- `steekproef.mjs`, `steekproef-*.json`, `steekproef-abc.uit.txt`, `steekproef-d.uit.txt`, `schermen/` — eigen Playwright-doorlopen (isMobile, hasTouch, alleen `page.touchscreen.tap`; `SoS.debug` alleen gelezen).
- `contrast.mjs`, `langenaam.mjs` / `langenaam.uit.txt`, `maxscore.mjs` / `maxscore.uit.txt`, `bots-r01-eigen-run.md`.

## Oordelen

| Criterium | Oordeel |
|---|---|
| A1 één dosis tegen analytische formule | PASS |
| A2 halvering in T½ | PASS |
| A3 tabellen "Verwachte uitkomsten" | PASS (met kanttekening over afronding, gebrek 1) |
| A4 getallen en beweringen in het spel | PASS (met opmerkingen voor Bart, gebreken 2–4) |
| B1 paracetamol-rangorde | PASS (kanttekening, gebrek 5) |
| B2 lithium-rangorde | PASS |
| B3 tikken, raceduur, "Nog een keer" | PASS (kanttekening over de lezing, gebrek 6) |
| B4 knoppen, scrollen, netwerk | PASS |
| B5 naam en totaal ≥ 32 px | PASS |
| B6 console | PASS |

Ik heb geen rekenfout, geen afwijkend casusgetal en geen onjuiste farmacologische bewering gevonden.

## A1 — PASS

`src/model.js` (zowel `maakSim` met stapgroottes 0,1 / 1/30 / 0,0137 u als `simuleer`) tegen mijn eigen uitgeschreven formules uit §4, 17 tijdstippen van 0,1 tot 24 u:

| Geval | Grootste relatieve afwijking |
|---|---|
| iv 1 g | 2,6 × 10⁻¹⁴ |
| slik 1 g (F 0,85; ka 1,5) | 2,2 × 10⁻¹⁴ |
| zetpil F 0,6 / ka 0,6 | 2,8 × 10⁻¹⁴ |
| zetpil F 0,3 / ka 0,3 | 1,7 × 10⁻¹³ |
| zetpil reeks[13] (0,35 / 0,3) en reeks[3] (0,9 / 1,0) | ≤ 1,7 × 10⁻¹³ |
| lithium slik 10,8 mmol (11 tijdstippen, t < 120) | 6,3 × 10⁻¹⁴ |

Drempel is 1%. Het model gebruikt de exacte exponentiële oplossing per depot (`src/model.js:292-306`).

## A2 — PASS

- Paracetamol iv: C(2,5 u)/C(0) = 0,500000; C(5 u)/C(0) = 0,250000.
- Lithium zonder dosis (depot leeg): C(64)/C(40) = 0,500000.
- Na de ibuprofen: halvering in 24/0,7 u = 0,500000; over t = 120 heen klopt de verhouding (0,554785 tegen 0,554785).

## A3 — PASS

Eigen RK4 | `src/model.js` | casusblad; eigen integratie en model zijn tot op 3 decimalen gelijk.

| Paracetamol | in zone | piek | dosis |
|---|---|---|---|
| Niets | 0,00% / 0% | 0 / 0 | 0 g |
| slik 0/6/12/18 | 78,21% / 78% | 11,886 / 11,9 | 4 g |
| 12 u spuit | 77,92% / 78% | 19,601 / 19,6 | 4 g |
| 12 u zetpil 0,6/0,6 | 74,83% / 75% | 11,810 / 11,8 | 4 g |
| 12 u zetpil 0,3/0,3 | 56,71% / 57% | 11,383 / 11,4 | 4 g |
| 12 u gemist | 54,08% / 54% | 11,383 / 11,4 | 3 g |
| elk uur 0–7 | 65,38% / 65% | 42,971 / 43,0 | 8 g, lever |
| 1 g spuit om 0 | 17,37% / 17% | 15,873 / 15,9 | 1 g |

| Lithium | in zone | > 1,0 | > 1,5 | laatste dag |
|---|---|---|---|---|
| Alles slikken | 63,28 / 63 | 36,72 / 37 | 0 / 0 | 1,070–1,204 / 1,07–1,20 |
| Elke 3e overslaan (136, 160, 184, 208, 232 u) | 100 / 100 | 0 / 0 | 0 / 0 | 0,693–0,894 / 0,69–0,89 |
| Niets | 3,49 / 3 | 0 / 0 | 0 / 0 | 0,002–0,003 / 0,00 |
| Elk poortje dubbel | 1,81 / 2 | 98,19 / 98 | 76,33 / 76 | 2,136–2,405 / 2,14–2,41 |

"Niets" zakt onder 0,6 na 8,37 u (casusblad: ±8 u).

In het draaiende spel zelf (eigen Playwright-runs; regel "in de zone" op het eindscherm = promille van de racetijd; piek uit `debug.C`):

| Gespeeld | "in de zone" | piek gezien | score |
|---|---|---|---|
| slik 0/6/18 + zetpil 12 | +748 (74,8%) | 11,81 | 736 |
| slik 0/6/18 + spuit 12 | +779 (77,9%) | 19,5 (bemonsterd) | 768 |
| slik 0/6/18, 12 gemist | +541 (54,1%) | 11,38 | 418 |
| elk uur 0–7 (normale snelheid) | +654 (65,4%), dagteller 8 g, lever −2.000 | 42,97 | −1.489 |
| 1 g spuit om 0 | +174 (17,4%) | 15,8 (bemonsterd) | −428 |
| niets | 0 | 0 | −1.000 |
| lithium alles | +633 | 1,20 | 628 |
| lithium elke 3e over | +1.000 | 0,95 | 1.000 |
| lithium niets | +35 | 0,76 | −710 |
| lithium dubbel | +18; giftig −1.527 (= 76,3% × 2000) | 2,405 | −2.267 |

`node tests/model.test.mjs`: 105/105; `node tests/score.test.mjs`: 116/116. De tests toetsen wat ze zeggen. Zwak punt: de modeltest vergelijkt met `M.analytisch` uit het model zelf; mijn eigen formules bevestigen dat die kloppen.

## A4 — PASS

- `git diff 670a3f9 -- src/model.js src/score.js`: leeg. Ook `tests/model.test.mjs` en `tests/score.test.mjs` ongewijzigd. `src/model.js` en `src/score.js` staan letterlijk in `index.html`.
- `git diff 670a3f9 -- docs/bouwopdracht.md`: alleen titel, §2-kop, §3 Flow stap 2, §6C (nieuw) en §6D. §4, §5 (casusblad en tabellen), §6A en §6B zijn ongewijzigd.
- Alle teksten die in vier doorlopen in beeld kwamen, naast het casusblad gelegd. Overeenkomend: 70 kg; "elke 2,5 uur is de helft weg"; streep 5 mg/L; "pijnstilling (vereenvoudigd)"; "max. 4 g" / "Maximaal 4 gram per dag"; "Opa is misselijk na de narcose."; legenda "misselijk (uur 10 tot 16)"; "Au. De pijn komt terug."; "Te veel paracetamol beschadigt de lever."; "1 g 4dd"; 0,6–1,0 mmol/L; giftig > 1,5 mmol/L; "3× per dag: om 0, 8 en 16 uur"; 400 mg; "Lithium bestaat niet als prik. Slikken of stikken!" (score ongewijzigd, 1.000 in die run); ibuprofen op dag 5; "Mevrouw De Vries koopt ibuprofen bij de drogist."; beide lekentaalzinnen; nabespreektekst; "3dd 400 mg; na een NSAID spiegel controleren"; QALY-uitleg met "spelpunten, geen echte QALY's"; nabespreekvraag.
- Oefenronde: tablet 0, niets 2, spuit 5, tablet 9, zetpil 13 = 4 g, dagteller eindigt op "4 g van max. 4 g". De zinnen kloppen met de curve: op 1,5 u is de spiegel 9,2 (pijn weg), op 4,4 u 4,9 mg/L ("Au").
- Pillen overslaan: het spel prijst het nergens als eigen keuze. De enige zin met "Dat was nodig" is de letterlijke §3-zin, gevolgd door "In het echt verlaagt de arts de dosis en laat de spiegel prikken". De varianten zeggen "zelf pillen overslaan is geen goed idee". Dubbel innemen wordt altijd afgeraden.

## B1 — PASS

Rapport (beide schermmaten): echt 768 = spuit-variant 768 ≥ zetpil-variant 736 > gemist 418 > niets −1000; elk uur slikken −3518 met levermeter vol; echt = 92,8% van de hoogste botscore 828. Zelf nagespeeld: 768, 736, 418, −1.000 en (elk uur 0–7) −1.489 met leverschade. Eigen zoektocht over 172.773 schema's met 4 doses (`maxscore.mjs`): het maximum is 828, dus de 80%-eis hangt niet af van een zwakke "beste bot".

## B2 — PASS

Rapport: 1000 > 628 > −710; dubbel −2267, 183 u boven 1,5, laagste. Zelf nagespeeld in beide schermmaten: 1.000, 628, −710, −2.267 (max. spiegel 2,405).

## B3 — PASS

- Tikken (eigen telling): naamveld + Start + eerste raceknop in de oefenronde = 3; zonder naam 2. Met "Oefenronde overslaan": 2 tikken tot race 1 loopt (3 met naam).
- Raceduur zonder `?speed`, zelf gemeten op 390×844: race 1 93,0 s, race 2 93,0 s (spel meet 93,02 en 93,03 s). Uit de code: 90 s + 3 s aanloop, onafhankelijk van schermmaat (`src/app.js:332,337,344`). Rapport: 93,2 s in beide maten.
- Oefenronde zonder `?speed`: 66,4 s.
- "Nog een keer": 1 tik, fase race1, klok loopt, zelfde naam (3 runs).

## B4 — PASS

- 503 eigen knopmetingen over start, oefenronde (5 stappen + eindkaartje), intro 1 en 2, race 1 (ook tijdens misselijkheid), race 2, finish-kaartjes en het hele eindscherm (gescrold). Kleinste: dempknop 48×48 en "Oefenronde overslaan" 203,3×48. Eindscherm: "Nog een keer" 335×60, verslagkaart 335×111, "Terug naar je score" 270×56. Niets onder 48×48.
- Horizontaal scrollen: 0 van 111 schermmetingen; ook niet met een naam van 16 brede letters zonder spatie.
- Netwerk: 1 verzoek (index.html zelf), 0 na het laden, in alle runs. CSP `default-src 'none'`.
- Tekstcontrast (DOM, 377 stabiele metingen): laagste 4,53:1 (wit op de paarse knop, 22 px vet); de rest ≥ 6,2:1. De uitgeschakelde knop "Misselijk" komt op 6,3:1.

## B5 — PASS

Naam 34 px (375) / 40 px (390); totaal 58 px / 80 px. Een naam van 16 brede letters krimpt naar precies 32 px en breekt af over twee regels.

## B6 — PASS

0 consolefouten, 0 waarschuwingen en 0 pageerrors in 4 eigen volledige doorlopen plus 4 korte (lange naam), inclusief "Nog een keer". Rapport: 0 in 22 doorlopen. Mijn eigen `node tests/bots.mjs --run=r01` gaf 768 / 1000, geldig (uitvoer in `bots-r01-eigen-run.md`; het volledige rapport is daarna teruggezet, sha gelijk aan vooraf).

## Bots en rapport

- `tests/bots.mjs` handelt via `page.touchscreen.tap` na een `elementFromPoint`-controle (regel 175-203); `page.evaluate` wordt alleen gebruikt om te lezen en om het eindscherm te scrollen. Scores komen van het scherm (`getalVanScherm`) en worden daarna nagerekend met `scoreSchema`.
- sha256 in het rapport `173b963c5413` = `sha256sum index.html`.
- De getallen in het rapport halen de rangordes en drempels; mijn eigen runs geven dezelfde scores.

## Gebreken en kanttekeningen

1. **A3, afronding van de tabel.** Drie cellen vallen bij een strikt relatieve lezing buiten ±2%: "1 g spuit om 0 u" 17,37% tegen 17% (2,2%), lithium "Niets" 3,49% tegen 3%, "Elk poortje dubbel" 1,81% tegen 2%. Afgerond op hele procenten, zoals de tabel, zijn ze gelijk. Het spel volgt §4 exact; de afwijking zit in de afronding van het casusblad. Ik reken dit niet als FAIL.
2. **Casusblad, kleine eigen afrondingen (voor Bart, niet aan het spel te wijten).** Exact uitgerekend: piek één tablet 9,20 mg/L (blad: 9,21); boven 5 mg/L tot 4,30 u (blad: 4,29); steady state lithium 0,764–0,882 (blad: ±0,76–0,87). Het spel toont daardoor kort "0,88 mmol/L" in de eerste uren van race 2. Alles binnen 2%.
3. **Twee tabelrijen zijn in het spel niet te spelen.** "1 g slik om 0, 6, 12, 18" (slikken is om 12 u geblokkeerd) en "zetpil F 0,3 / ka 0,3 om 12 u" (poortje 12 heeft vast 0,6 / 0,6). Die rijen zijn alleen via het model gecontroleerd; de modelcode staat letterlijk in `index.html`.
4. **Getallen in beeld die niet in het casusblad staan.** Schaalstreepjes 10, 15 en 20 mg/L en 2 mmol/L op de as, en de live spiegelwaarde. Dat zijn asmarkeringen en modeluitkomsten, geen casusgegevens.
5. **B1, "echt schema = spuit-variant" is per definitie waar.** De bot speelt voor beide exact hetzelfde schema (slik 0/6/18, spuit 12), omdat het echte schema met vier tabletten niet speelbaar is. Zonder blokkade zou 4× slik 772 scoren tegen 768 voor de spuit-variant.
6. **B3, lezing van "spelen".** Met de volledige oefenronde loopt race 1 pas na 9 tikken. De eis is gehaald als de oefenronde als spelen telt (2–3 tikken), of via "Oefenronde overslaan" (2–3 tikken).
7. **Randen precies op de drempel.** Dempknop 48×48, "Oefenronde overslaan" 48 px hoog, lange naam 32 px. Gehaald, zonder marge.

## Niet of dun gecontroleerd

- Raceduur zonder `?speed` zelf alleen op 390×844 gemeten; 375×667 uit de code en het rapport.
- Tekst op het canvas (poortlabels, as, "onderweg") alleen op schermafbeeldingen bekeken, niet op contrast gemeten.
- De twee vangnetzinnen ("giftig" zonder dubbele dosis, "nabespreking") en de meeste praktijkzin-varianten zijn alleen in de code gelezen, niet in beeld gezien. In beeld gezien: 9 van de praktijkzinnen.
- "Te laat"-melding, terugknop-melding en de draai-je-telefoon-tekst niet in beeld gezien.
- Alleen Chromium-emulatie; geen echte telefoon, geen Safari.
- De 390×844-helft van het botsrapport heb ik op de samenvattende regels gelezen, niet elke detailrij.
