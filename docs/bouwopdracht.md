# Slikken of Stikken — bouwopdracht v1 (ouderdag 28 november 2026)

Dit document is de bron voor de bouw. Getallen in het casusblad zijn de lat voor het rekenmodel: het spel neemt ze letterlijk over. Afwijken mag alleen na akkoord van Bart Pouls (inhoudelijk eigenaar).

## 1. Doel en doelgroep

- **Wat:** een farmacokinetiek-race op de eigen telefoon. Je houdt de spiegel van een geneesmiddel in de goede zone door op het juiste moment te slikken (of een zetpil te geven, of te spuiten).
- **Voor wie:** ouders en eerstejaars geneeskunde, zonder farmacologiekennis.
- **Waar:** ouderdag geneeskunde, blok van 12,5 minuten: ±2 min uitleg, tutorial, race 1, race 2, ±3 min nabespreking.
- **Prestatieprobleem (wat doen spelers straks anders):** ze snappen dat (1) een pil tijd nodig heeft voordat hij werkt, (2) het lichaam een middel in een vast tempo opruimt (halfwaardetijd), (3) meer niet beter is, en (4) een ander middel de spiegel ongemerkt kan opdrijven.

## 2. Scope v1

**Wel:**
- Eén HTML-pagina, mobiel eerst (staand), werkt zonder installatie, account of server, en zonder internet na het laden. Geen externe bestanden of CDN's.
- Speelnaam invoeren → tutorial → race 1 → race 2 → eindscherm.
- Eindscherm: speelnaam, score race 1, score race 2, totaal, mini-curve per race, het doseerschema (welke poortjes, wat gekozen) en één nabespreekvraag.
- Een losse scorebordpagina voor de beamer: Bart of een student typt naam en totaal in, lijst sorteert zichzelf (alleen lokaal in die browser opgeslagen).
- Geluid (korte blips à la Flappy Bird, zelf gesynthetiseerd, geen gekopieerde geluidsbestanden) met een dempknop.
- Nederlands.

**Niet (plank):** multiplayer en centrale opslag, docentmodus, infuus, twee-compartimentenmodel, fenytoïne, digoxine, gentamicine, opiaten. Wel zo bouwen dat het therapeutisch venster per casus uit data komt en in de tijd kan verschuiven: dat is later nodig voor opiaten (gewenning: venster schuift omhoog).

## 3. Spelmechaniek

- **Poortjes in plaats van vrij tikken.** De tijdas schuift voorbij; op vaste doseermomenten (poortjes) kiest de speler wat er gebeurt. Niets kiezen = overslaan. Zo is het doseerschema dat het eindscherm toont altijd een realistisch schema op vaste tijden.
- **Tijdas geschaald op de halfwaardetijd.** Elke race beslaat ±10 halfwaardetijden in ±90 seconden (60–120 s toegestaan). Daardoor voelt elke casus even snel, terwijl de klok laat zien dat het om uren (paracetamol) of dagen (lithium) gaat. Dat verschil is zelf een leerpunt.
- **Directe feedback.** Elke keuze geeft binnen 100 ms beweging en geluid. Het verschil tussen slikken (vertraagd, lager) en spuiten (direct, hoog) moet je zien.
- **Eerlijke race.** Iedereen speelt dezelfde casus, met de gebeurtenissen op hetzelfde moment. Toeval (zetpil) komt uit een vaste reeks die voor iedereen gelijk is.
- **Score:** de bouwer ontwerpt de formule, maar die moet de botrangorde in §6B halen. Tijd in de zone levert punten op, tijd erbuiten kost punten, en hoe verder buiten de zone hoe meer (kwadratisch). Paracetamol: boven 4 g per 24 uur raakt de lever beschadigd (zware straf of einde race).

### Flow

1. **Start:** speelnaam (alias), één knop "Start". Binnen 3 tikken aan het spelen.
2. **Tutorial (paracetamol, slik / spuit / zetpil):** een verhaal in korte stappen. Elke stap: één nieuw begrip, maximaal één zin tekst, en de speler doet het zelf:
   1. "Opa Jan heeft pijn." → slik → curve stijgt pas na even: *een pil moet eerst door je maag.*
   2. Curve zakt → *je lichaam ruimt het op: elke 2,5 uur is de helft weg.*
   3. Spuit → *een prik werkt meteen, maar zakt net zo hard.*
   4. Dagteller → *meer is niet beter: boven 4 gram per dag raakt de lever beschadigd.*
   5. Zetpil → *een zetpil: soms goed, soms nauwelijks. Daar kun je niet van op aan.*
   6. "Klaar? Race!"
3. **Race 1: paracetamol** (tablet, zetpil of spuit, met misselijkheid; zie casusblad).
4. **Race 2: lithium** (tablet of overslaan; de spuitknop is er wel, maar lithium bestaat niet als injectie; zie casusblad).
5. **Eindscherm** (zie §2), groot en leesbaar op 2 meter, één tik "Nog een keer".

## 4. Rekenmodel

Eén compartiment, eliminatie eerste orde, orale en rectale opname eerste orde.

- k = ln(2) / T½; CL = k · Vd
- **Spuit (iv):** C springt direct met Dosis / Vd.
- **Slik / zetpil:** de dosis × F gaat naar een opnamedepot dat met snelheid ka leegloopt: dA/dt = −ka · A; dC/dt = ka · A / Vd − k · C.
  - Analytisch, voor één dosis: C(t) = F · D · ka / (Vd · (ka − k)) · (e^(−k·t) − e^(−ka·t))
- **Herhaald doseren:** superpositie of numeriek; moet overeenkomen met de analytische oplossing.
- **Gebeurtenis die de klaring verandert:** vanaf het tijdstip geldt k_nieuw = k × factor. Het bestaande depot en de concentratie lopen gewoon door.
- Gewicht patiënt: 70 kg in beide casussen.

## 5. Casusblad

### Casus 1 — Paracetamol (tutorial en race 1)

**Verhaal:** Opa Jan (70 kg) heeft net een nieuwe heup. De pijn moet weg, zijn lever moet heel blijven.

| Veld | Waarde | Status / bron |
|---|---|---|
| Vd | 0,9 L/kg → 63 L | bron [1][3] |
| T½ | 2,5 uur | bron [3] (1,9–2,5 u) |
| Slik | 1 g per keer, F = 0,85, ka = 1,5 /u (piek ±9,2 mg/L na ±1,4 u) | F: bron [3] (0,7–0,9); ka: aanname, past bij piek ±1,5 u [2] |
| Zetpil | 1 g per keer. Per zetpil F uit 0,3–0,9 en ka uit 0,3–1,0 /u, uit een vaste reeks (voor iedereen gelijk) | richting bron [4][5] (traag en wisselend); spreiding is een spelkeuze |
| Spuit | 1 g iv, directe piek 1000/63 = 15,9 mg/L. In tutorial en race 1. Telt mee voor de dagteller. | vereenvoudiging: echt iv-paracetamol loopt in 15 min in, met piek ±30 mg/L [1] |
| Zone | ≥ 5 mg/L = "pijnstilling (vereenvoudigd)" | spelkeuze, afgesteld op het echte schema (zie onder) |
| Bovengrens | Dagteller: maximaal 4 g per 24 uur. Daarboven: levermeter vol. | Bart akkoord |
| Poortjes | elk uur (24 poortjes) | spelkeuze |
| Racelengte | 24 uur patiënttijd (±10 T½) | spelkeuze |
| Gebeurtenis race 1 | Uur 10 tot 16: "Opa is misselijk na de narcose." Slikken geblokkeerd; zetpil, spuit of niets. | Bart akkoord |
| Echt schema (eindscherm) | 1 g 4dd | Bart akkoord |
| Onder de zone, in lekentaal | "Au. De pijn komt terug." | |
| Boven 4 g, in lekentaal | "Te veel paracetamol beschadigt de lever." | |

### Casus 2 — Lithium (race 2)

**Verhaal:** Mevrouw De Vries (70 kg) gebruikt al jaren lithium tegen stemmingsschommelingen. Halverwege heeft ze rugpijn en koopt ze ibuprofen bij de drogist.

| Veld | Waarde | Status / bron |
|---|---|---|
| Dosis | 400 mg lithiumcarbonaat = 10,8 mmol Li⁺ per poortje | rekenregel |
| Vd | 0,8 L/kg → 56 L | geheugen, Bart akkoord |
| T½ | 24 uur | geheugen, Bart akkoord |
| F, ka | F = 1,0; ka = 1,0 /u (piek ±3,5 u na inname) | F: geheugen; ka: aanname (vereenvoudigd) |
| Zone | 0,6–1,0 mmol/L | geheugen, Bart akkoord |
| Toxisch | > 1,5 mmol/L | geheugen, Bart akkoord |
| Poortjes | 3× per dag, om 0, 8 en 16 uur (30 poortjes); keuze slikken of overslaan | spelkeuze |
| Spuitknop | Zichtbaar, maar doet niets aan de spiegel. Bij tikken: "Lithium bestaat niet als prik. Slikken of stikken!" Geen strafpunten. | farmacologisch: er is geen injecteerbare lithium; Bart akkoord |
| Start | Al in steady state op 3dd 400 mg: spiegel ±0,76–0,87 | doorgerekend |
| Racelengte | 10 dagen patiënttijd (±10 T½) | spelkeuze |
| Gebeurtenis race 2 | Dag 5 (t = 120 u): "Mevrouw De Vries koopt ibuprofen bij de drogist." Klaring × 0,7 tot het einde. Geen tegenactie mogelijk. | factor binnen gerapporteerde range [6][7][8]; Bart akkoord |
| Echt schema (eindscherm) | 3dd 400 mg; na een NSAID spiegel controleren | |
| Onder de zone, in lekentaal | "Kans op terugval: somber of juist ontremd." | |
| Boven de zone, in lekentaal | "Trillen, misselijk, diarree. Nog hoger: verward, nieren in gevaar." | |
| Nabespreking | "In het echt: bij lithium liever paracetamol dan ibuprofen, en de spiegel laten prikken." | |

### Verwachte uitkomsten (referentie voor de criticus)

Doorgerekend met het model uit §4 (numeriek, stap 0,005 u). Het spel moet hier binnen ±2% op uitkomen.

**Paracetamol, 24 uur, zone ≥ 5 mg/L:**

| Strategie | Tijd in zone | Piek (mg/L) | Totale dosis |
|---|---|---|---|
| Niets | 0% | 0 | 0 g |
| 1 g slik om 0, 6, 12, 18 u (echt schema) | 78% | 11,9 | 4 g |
| Idem, dosis van 12 u als spuit | 78% | 19,6 | 4 g |
| Idem, dosis van 12 u als zetpil met F 0,6 / ka 0,6 | 75% | 11,8 | 4 g |
| Idem, dosis van 12 u als zetpil met F 0,3 / ka 0,3 | 57% | 11,4 | 4 g |
| Dosis van 12 u gemist | 54% | 11,4 | 3 g |
| Elk uur 1 g van 0 tot 7 u | 65% | 43,0 | 8 g → lever |
| Eén keer 1 g spuit om 0 u | 17% | 15,9 | 1 g |

Eén dosis 1 g slik: piek 9,21 mg/L na 1,38 u; boven 5 mg/L van 0,33 tot 4,29 u.

**Lithium, 10 dagen, ibuprofen vanaf dag 5 (klaring × 0,7):**

| Strategie | In zone 0,6–1,0 | > 1,0 | > 1,5 | Laatste dag |
|---|---|---|---|---|
| Alles slikken | 63% | 37% | 0% | 1,07–1,20 |
| Na de ibuprofen elke 3e dosis overslaan | 100% | 0% | 0% | 0,69–0,89 |
| Niets (zakt onder 0,6 na ±8 u) | 3% | 0% | 0% | 0,00 |
| Elk poortje dubbel | 2% | 98% | 76% | 2,14–2,41 |

## 6. De lat

Niet-onderhandelbaar: een rekenfout in een concentratiecurve, een getal dat afwijkt van het casusblad of een onjuiste farmacologische bewering in de speltekst is altijd FAIL.

### A. Rekenmodel — type: inhoud tegen bron

Poortcriteria:
1. Eén dosis iv, slik en zetpil: maximaal 1% afwijking van de analytische formules in §4, op minstens 10 tijdstippen.
2. De concentratie halveert in precies T½ (≤ 1% afwijking) zonder opname.
3. De strategieën in "Verwachte uitkomsten" geven in het spel ±2% dezelfde getallen.
4. Elk getal in het spel komt letterlijk overeen met het casusblad.

Stopregel: stoppen zodra de blinde check 0 afwijkingen vindt.

### B. Speelbaarheid — type: bewijs met vooraf afgesproken drempels

Automatische spelers (bots) spelen het echte spel in een telefoonscherm (375 × 667 en 390 × 844). Poortcriteria:
1. **Paracetamol:** echt schema = spuit-variant ≥ zetpil-variant > gemiste dosis > niets. "Elk uur slikken" eindigt met leverschade en scoort lager dan het echte schema. Het echte schema haalt minstens 80% van de hoogste botscore.
2. **Lithium:** "na de ibuprofen elke 3e overslaan" > "alles slikken" > "niets"; "elk poortje dubbel" belandt in de toxische zone en scoort het laagst.
3. Van openen tot spelen: maximaal 3 tikken. Een race duurt 60–120 seconden. "Nog een keer" is één tik.
4. Knoppen minstens 48 × 48 px. Geen horizontaal scrollen. Geen netwerkverzoeken na het laden.
5. Eindscherm: naam en totaalscore in minstens 32 px.
6. Geen fouten in de console tijdens een volledige doorloop.

Maximaal 2 rondes, tenzij de drempels nog niet gehaald zijn.

### C. Beleving — type: smaak

Eén bouwronde, één verse controle op A en B, daarna de correctielijst van Bart. Schermafbeeldingen van de twee hoofdreferenties staan in `docs/referenties/` en zijn leidend als de sites niet te openen zijn. Stijlkeuze: **verhaal en tutorial in de stijl van The Evolution of Trust** (wit, zwarte schetslijnen, simpele figuurtjes met een gekleurd hoedje: opa Jan en mevrouw De Vries); **de races in de stijl van Universe Forecast** (zwart met gekleurde sterretjes, platte illustraties, paarse tijdmarkeringen met een lijn ervoor en erachter, korte witte tekst in het midden). Overweeg de tijd van boven naar beneden te laten lopen, zoals de tijdlijn van Universe Forecast: dat past bij een staand telefoonscherm. Referenties (patronen overnemen, niets kopiëren):
- **Uitstraling:** neal.fun/universe-forecast — rustige, grote typografie, veel lucht, alles beweegt soepel, één ding tegelijk in beeld.
- **Verhaal en uitleg:** ncase.me/trust (The Evolution of Trust) — een verhaal in korte hoofdstukken, één begrip per stap, leren door te doen; figuurtjes die reageren als je ze aanraakt of aanwijst.
- **Geluid:** Flappy Bird — korte, droge blips bij elke actie en een duidelijk "au"-geluid bij een fout.
- **Gebeurtenis:** neal.fun/password-game — een plotwending, geen foutmelding.
- **Eindscherm:** Wordle — in één blik te snappen, leuk om te laten zien.
- Streef: oogt op mobiel minstens zo strak als Epic Green Cards.

## 7. Hosting

GitHub Pages vanaf deze (openbare) repo: openbare link, geen account nodig. QR-code op de beamer.

## Bronnen

1. Perfalgan productinformatie — https://www.sahpra.org.za/wp-content/uploads/2020/06/Perfalgan_PI_Equity-Pharmaceuticals_MCC-Format01-February-2019.pdf
2. Vergelijking iv/oraal paracetamol (500 mg oraal: piek ±5,5 mg/L, tmax ±1,5 u) — https://findanexpert.unimelb.edu.au/scholarlywork/1094007-comparative-plasma-and-cerebrospinal-fluid-pharmacokinetics-of-paracetamol-after-intravenous-and-oral-administration
3. Forrest, Clements & Prescott, Clinical pharmacokinetics of paracetamol (1982): Vd ±0,9 L/kg, T½ 1,9–2,5 u, F 70–90%
4. Bioavailability of acetaminophen suppositories — https://pubmed.ncbi.nlm.nih.gov/1190239/
5. VUMC Poison Control, rectale paracetamol — https://www.vumc.org/poison-control/toxicology-question-week/may-12-2003-what-bioavailability-rectally-administered-acetaminophen
6. Ibuprofen-bijsluiter (lithiumklaring −19% bij gezonde vrijwilligers) — https://medlibrary.org/lib/rx/meds/ibuprofen-98/page/4/
7. NSAID's en lithiumspiegel, retrospectieve studie — https://thieme-connect.de/products/ejournals/html/10.1055/s-0039-3403006?lang=de
8. Review lithiuminteracties met NSAID's en diuretica — https://www.journals.usp.br/acp/article/view/148060
