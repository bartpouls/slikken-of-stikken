# Criticus C — verslag ronde 3 (§6C Samenhang tutorial en race)

Beoordeeld: `index.html` op branch `claude/optimistic-franklin-vk86yy`, commit b2e8496. `index.html` is byte-voor-byte gelijk aan een eigen nabouw uit `src/` (`c1-uitvoer.txt`: identiek, 210.466 tekens). Alles zelf gemeten in Chromium met telefoon-emulatie (isMobile, hasTouch, `page.touchscreen.tap`) in 375 × 667 en 390 × 844. Zonder `?speed`, behalve `c3-afwijken.mjs` (`?speed=3`) en `c5-intro2.mjs` (`?speed=20`, alleen om race 1 door te spoelen). De meetscripts van ronde 2 zijn nagelezen en opnieuw gedraaid op de huidige build; `c3-afwijken.mjs` is nieuw geschreven. Buiten deze map is niets gewijzigd.

| Criterium | Oordeel |
|---|---|
| C1 Eén tekencode | PASS |
| C2 Nul zichtbare verschillen | PASS (0 in de genoemde onderdelen; 1 kanttekening, ongewijzigd) |
| C3 Volledig en niets extra | **PASS op de letterlijke tekst (weging)**; een strengere lezing geeft FAIL, zie gebrek 1 |
| C4 Te volgen zonder hulp | PASS (65,2 s en 65,4 s) |
| C5 Race 2 sluit aan | PASS (2 kleine gebreken, ongewijzigd) |
| Getallen en beweringen | 0 afwijkingen van het casusblad, ook bij afwijkend spel; 1 woordkeuspunt voor Bart |

Bewijs in deze map: `c1-uitvoer.txt`; `c4-bot-uitvoer.txt`, `c4-bot-uitkomst.json`; `c2-uitvoer.txt`, `*/c2-dom.json`, `*/c2-paar-*.png`; `c3-knoppen-uitvoer.txt`; `c3-afwijken-uitvoer.txt`, `*/c3-A*-*.png`; `c3-fout-tikken-uitvoer.txt`; `c5-stdout.txt`, `*/c5-intro-race2.png`.

---

## C1 Eén tekencode — PASS

- Oefenronde = `startRace(0, SoS.tutorial)` (`src/app.js:275`), race = `startRace(i)`. Eén `startRace` (`:372`), één `bouwRaceUi`, één `teken`, één `tekenPoortjes`, één `werkKopBij` (klok, QALY-stand, dagteller, levermeter), één `lus` (`:1110`).
- `src/tutorial.js` (57 regels) bevat alleen het draaiboek: klokmoment, zin, knop, poortje, zin daarna, de zin `vol`, tekst eindkaartje. Geen tekencode.
- Alle plekken met `gids` in `app.js` nagelopen (`:372-378`, `:405-410`, `:424-426`, `:457`, `:491`, `:536`, `:541-574`, `:602`, `:1117-1125`, `:1140`, `:1145`, `:1205-1211`, `:1219`, `:1228`, `:1315-1317`, `:1333`, `:1388-1390`). Tussen regel 603 en 1116 (alle tekenfuncties) komt `gids` niet voor. Wat de gids doet: klok stilzetten, zin tonen, klasse `wijs` zetten, plotwending uit, tekst eindkaartje.
- CSS: alleen `.actie.wijs` (`src/style.css:314-316`, `:330`). Template: geen tutorialscherm (`src/index.template.html:35`, `:49` zijn commentaar).
- Wijziging sinds ronde 2 (`git diff 0fa4bc2..HEAD -- src`): alleen `gidsStap` (stap laten vervallen) en het veld `vol`. Geen tekencode.
- DOM-structuur van `#scherm-race` gelijk in tutorial en race op 16 momenten × 2 maten (veld `structuur`: 0 verschillen in `c2-uitvoer.txt`).

Gebreken: geen.

## C2 Nul zichtbare verschillen — PASS

Methode: per tutorialstap drie momenten (a = klok stil vóór de tik, b = 0,15 s na de tik, c = 0,25 uur na het poortje) plus uur 15,5, naast race 1 op hetzelfde klokmoment met dezelfde keuzes (tablet 0, niets 2, spuit 5, tablet 9, zetpil 13). 16 paren × 2 maten. Spiegel, dagteller en QALY op gelijke klok gelijk (bv. m3c: 18,66 mg/L, 2 g, 172; m5c: 7,49 mg/L, 4 g).

DOM-verschillen over alle 32 paren, uitgesplitst naar soort (`c2-uitvoer.txt`):
- uitlegzin (tekst, klasse, hoogte): toegestaan;
- klasse `wijs` met witte rand en ring op de gevraagde knop: toegestaan;
- vanaf m4c: knop "Misselijk" (geblokkeerd), ander portretje, melding "Opa is misselijk na de narcose.": plotwending;
- b-momenten: keuzeregel 0,1–0,3 px, QALY 1–2 punten, knopkleur midden in de tik-animatie: de race loopt door tijdens de foto.
Verder 0. Plaats, lettertype, grootte, kleur en tekst van klok, QALY-stand, dagteller, levermeter, portret, knoppen (met icoon) en keuzeregel zijn gelijk.

Zelf geopend en bekeken (8 van de 32 paren; stap 1 t/m 4 in beide maten): `375x667/c2-paar-m1b-gekozen.png`, `m2a-voor`, `m3a-voor`, `m4a-voor`; `390x844/c2-paar-m1c-na-poortje.png`, `m2c-na-poortje`, `m3c-na-poortje`, `m4b-gekozen`. Richting van de tijd, achtergrond, zone, streep, curve, poortjes, knoppen, klok, QALY, dagteller, levermeter: geen verschil buiten de toegestane.

Kanttekening (geen FAIL, weging; ongewijzigd sinds ronde 2):
1. Het poortlabel dat onder de uitlegzin schuift wordt niet getekend (`m2a`: "Uur 0 + tablet" rechts wel, links niet; `m3c`: "Uur 4"; `m4a`: "Uur 7"). In de race gebeurt hetzelfde onder een racemelding, maar die verdwijnt na een paar seconden; in de tutorial blijft de zin staan. Ik reken het tot de uitlegzin. Een strengere lezer telt het als verschil in "poortjes".
2. `m3a`: in de race staat op het fotomoment nog de rode "au"-ring om de stip, in de tutorial is die al uitgedoofd (de foto is 0,5 s later genomen bij stilstaande klok). Zelfde effect, ander fotomoment.

Bewijs dun: pixel-exact vergelijken kan niet (sterren, doorlopende race). Het oordeel steunt op de DOM-meting van alle 32 paren en 8 bekeken beelden; 24 paren zijn niet als beeld bekeken.

## C3 Volledig en niets extra — PASS op de letterlijke tekst (weging)

### (a) Voorgeschreven pad
`c4-bot-uitvoer.txt`, beide maten: `gegeven = slik, leeg, niets, leeg, leeg, spuit, leeg, leeg, leeg, slik, leeg, leeg, leeg, zetpil, leeg, leeg, leeg`; dagteller 1 → 2 → 3 → 4 g. Alle vier de knoppen zijn via een poortje gebruikt. Tijdlijn, curve, zone, streep, poortjes, knoppen, keuzeregel, klok, QALY-stand, dagteller, levermeter, portretje, dempknop en eindkaartje komen voor. Niet op dit pad: de stand "levermeter vol" (eindigt op precies 4 g) en de knopstand "Misselijk" (plotwending, uitzondering).

### (b) Knoppen doen hetzelfde als in race 1
`c3-knoppen-uitvoer.txt`: 12 tikken in dezelfde volgorde in tutorial en race 1, beide maten. Tekst en klasse van de keuzeregel, knopstanden en doelpoortje letterlijk vergeleken: **24 van 24 GELIJK, 0 ANDERS**.
- eerste tik: "Zetpil voor uur 0";
- tweede tik op dezelfde knop: "Keuze gewist voor uur 0: niets kiezen is overslaan.";
- wisselen: "Niets voor uur 0";
- tik 0,03 uur na poortje 0: "Te laat voor uur 0. Kies opnieuw voor uur 1.";
- tik terwijl de klok loopt: "Spuit voor uur 1"; wisselen en wissen idem.

### (c) Afwijkend spelen
Fout tikken, wisselen en wissen (`c3-fout-tikken-uitvoer.txt`, beide maten, zonder `?speed`): per stap drie foute knoppen plus 2,5 s wachten: klok blijft staan, markering blijft op de goede knop. Goed kiezen en vlak voor het poortje wisselen of wissen: klok stopt weer, markering komt terug. Alle vijf stappen, 0 consolefouten, duur 92,3 s.

Twaalf scenario's met eigen doses (`c3-afwijken-uitvoer.txt`, `?speed=3`, om en om 375 × 667 en 390 × 844). Gemeten per scenario: elke zin met klok, spiegel en dagteller; elke markering met de dagteller; "overtreding" = een dosisknop gemarkeerd terwijl dagteller + 1 g > 4 g.

| | Scenario | Gevraagd (markering) | Overtredingen | Vast | Einde |
|---|---|---|---|---|---|
| A1 | extra spuit op poortje 1 | tablet 0, niets 2, spuit 5, tablet 9 | 0 | nee | 4 g; zetpilstap vervallen |
| A2 | extra zetpil op poortje 7 | idem | 0 | nee | 4 g; zetpilstap vervallen |
| A3 | extra tablet op poortje 11 | idem | 0 | nee | 4 g; zetpilstap vervallen |
| A4 | extra tablet op 1, 3 en 4 | tablet 0, niets 2 | 0 | nee | 4 g; spuit-, dagteller- en zetpilstap vervallen |
| A5 | tablet op elk niet-gevraagd poortje | tablet 0, niets 2 | 0 | nee | 12 g; leverzin na elke overschrijding in beeld |
| A6 | extra spuit op 4, vlak vóór stap 3 | tablet 0, niets 2, spuit 5, tablet 9 | 0 | nee | 4 g; zetpilstap vervallen |
| A7 | extra tablet op 8, vlak vóór stap 4 | idem | 0 | nee | 4 g; zetpilstap vervallen |
| A8 | extra zetpil op 12, vlak vóór stap 5 | idem | 0 | nee | 4 g; zetpilstap vervallen |
| A9 | aanwijzing gevolgd, daarna zelf spuit op 14 en 15 | alle vijf | 0 | nee | 6 g; leverzin op uur 14 |
| A10 | extra spuit op 1; op 13 toch zelf een zetpil | tablet 0, niets 2, spuit 5, tablet 9 | 0 | nee | 5 g; leverzin op uur 13 |
| A11 | extra tablet op 3 en 4 | tablet 0, niets 2, spuit 5 | 0 | nee | 4 g; dagteller- en zetpilstap vervallen |
| A12 | extra spuit op 6, 7 en 8 | tablet 0, niets 2, spuit 5 | 0 | nee | 5 g; leverzin op uur 8 |

Uitkomsten:
- **Vraagt de tutorial ooit om een dosis boven 4 g? Nee, in 0 van de 12 scenario's.** De hoogste dagteller bij een markering van een dosisknop was 3 g (A1, A2, A6, A7, A10 bij stap 4; A11 bij stap 3). De bewering van de bouwer klopt in alles wat ik heb geprobeerd. Code: `app.js:543-550` kijkt naar de dagteller op het moment van het gevraagde poortje; tussen het begin van een stap en zijn poortje ligt geen ander poortje, dus er is geen gat.
- **Vastlopen: nee**, 12 van 12 bereikten "Klaar?", 0 consolefouten.
- **Leverzin als de speler zelf over 4 g gaat: ja.** "Te veel paracetamol beschadigt de lever." kwam in beeld in A5 (uur 6, 10, 14), A9 (uur 14), A10 (uur 13), A12 (uur 8), met rode dagteller "5 g van max. 4 g", volle levermeter, rode stip, misselijk portret (`390x844/c3-A10-zin2-klok13.2.png`). Volgt er direct nog een overdosis, dan blijft dezelfde zin staan. Omdat een gevraagd poortje nooit meer over 4 g gaat, kan de leverzin niet meer door een "daarna"-zin worden overschreven.
- **Zin die niet klopt met het scherm of farmacologisch onjuist is: niet gevonden.** Nagelopen per zin: "De pijn is weg" stond er steeds bij ≥ 9,18 mg/L; "Au. De pijn komt terug." alleen bij 4,7–4,9 mg/L; bij stap 3 staat "Kies nu de spuit." zodra de spiegel niet onder de streep zit (A1: 11,05; A6: 19,07; A11: 19,79 mg/L); "De dagteller is vol: opa Jan krijgt vandaag niets meer." alleen bij dagteller ≥ 4 g (`375x667/c3-A1-zin1-klok12.7.png`: "4 g van max. 4 g").

Zinnen in beeld bij één extra dosis, A1 (klok / dagteller): "Opa Jan heeft pijn: kies een tablet voor het eerste poortje." (−0,8 / 0 g); "Een pil moet eerst door je maag." (0 / 1 g); "De pijn is weg: kies Niets om een poortje over te slaan." (1,5 / 2 g); "Je lichaam ruimt het op: elke 2,5 uur is de helft weg." (2 / 2 g); "Kies nu de spuit." (4,4 / 2 g); "Een prik werkt meteen, maar zakt net zo hard." (5 / 3 g); "Elke gram telt mee in de dagteller linksboven: kies weer een tablet." (8,5 / 3 g); "Meer is niet beter: boven 4 gram per dag raakt de lever beschadigd." (9 / 4 g); "De dagteller is vol: opa Jan krijgt vandaag niets meer." (12,5 / 4 g); "Au. De pijn komt terug." (15,0 / 4 g). De volledige lijsten per scenario staan in `c3-afwijken-uitvoer.txt`.

### (d) Iets extra in de tutorial?
Nee. Buiten de uitlegzin (waaronder de nieuwe zin "De dagteller is vol…"), de stilstaande klok en de markering: niets. Zelfde DOM-structuur, zelfde keuzeregel, zelfde eindkaartje (`#finish`, met de tekst "Klaar?" / "Race!" uit §3 stap 6).

### Gebreken
1. **Eén eigen extra dosis kost de speler de zetpilstap.** De vier gevraagde doses zijn samen precies 4 g; er is geen speling. In alle zes scenario's met één extra dosis (A1, A2, A3, A6, A7, A8) vervalt stap 5: de zin over de zetpil verschijnt niet, en in A1, A3, A6 en A7 heeft de speler de knop Zetpil nooit gebruikt. Met drie vroege extra tabletten (A4) vervallen ook de spuit en de dagtellerstap; de tutorial loopt dan van uur 4,4 tot 16 (±43 s op gewone snelheid) door met alleen "De dagteller is vol…" en later "Au. De pijn komt terug." (`390x844/c3-A4-einde.png`). Voor zo'n speler geldt de zin uit §3 "wie de tutorial gedaan heeft, heeft elke handeling uit race 1 al één keer zelf gedaan" niet. Dit is de prijs van de reparatie van ronde 2; het is wel veel minder erg dan toen (geen afgedwongen overdosis, geen onjuiste zin).
2. Woordkeus, voor Bart: "De dagteller is vol" verschijnt bij precies 4 g. Op het scherm is de balk dan gevuld tot het maximumstreepje, niet tot het eind, en volgens het casusblad is de levermeter pas "vol" boven 4 g. Dezelfde zin verschijnt ook als de speler al op 7 g of 10 g zit (A5, uur 8,5 en 12,5); dan is "vol" te zwak. Geen fout getal.
3. Klein: valt een eigen overdosis op poortje 8 of 12, dan wordt de leverzin een half uur speltijd later (±1,9 s op gewone snelheid, berekend) vervangen door "De dagteller is vol…" (A12: uur 8,2 → 8,7). In race 1 staat hij 3 s.
4. Uit ronde 1 en 2, nog open: op het voorgeschreven pad ziet de speler de stand "levermeter vol" niet.
5. Uit ronde 2, niet opnieuw gemeten (code daar ongewijzigd): staat de gevraagde keuze al klaar vóór de stap begint, dan stopt de klok niet en staat de zin maar kort in beeld.

### Weging
- **Letterlijke tekst van §6C3: gehaald, dus PASS.** Elke knop en elk schermonderdeel van race 1 komt voor; op het pad dat de tutorial aanwijst heeft de speler elke knop via een poortje gebruikt; de tutorial bevat niets extra; de knoppen werken bij elke soort tik letterlijk gelijk aan race 1.
- **Strengere eigen lezing: FAIL.** Leest men "de speler heeft elke knop zelf gebruikt" als eis voor elke speler die de tutorial uitspeelt, ook een die één keer uit nieuwsgierigheid iets extra geeft, dan haalt de tutorial dat niet (gebrek 1).
- **Mijn oordeel: PASS**, op de letterlijke tekst. Redenen: §6C wordt volgens zijn eigen kop gecontroleerd met bots, en de bot van C4 volgt de aanwijzing; het gebrek waarop ronde 2 FAIL gaf (de tutorial dwong zelf een overdosis af en liet een zin staan die niet bij het scherm paste) is in 12 van 12 scenario's weg; en geen enkele zin is nog onjuist. Het is een weging, geen meetdrempel. Vindt Bart dat één nieuwsgierige tik de zetpilles niet mag kosten, dan is dit FAIL.

### Per gebrek uit ronde 2 (C3)
| Ronde 2 | Nu |
|---|---|
| 1. Eén extra dosis en de tutorial dwingt de speler over het dagmaximum | Verholpen: 0 overtredingen in 12 scenario's. Nieuw gevolg: de stap vervalt (gebrek 1) |
| 2. Casusbladzin bij leverschade overschreven op een gevraagd poortje | Verholpen: een gevraagd poortje gaat nooit meer over 4 g; de leverzin kwam bij elke eigen overschrijding in beeld (A5, A9, A10, A12). Rest: gebrek 3 |
| 3. Bij veel extra doses blijft de tutorial om doses vragen | Verholpen (A5: na uur 2 geen enkele markering meer) |
| 4. Vooraf gekozen knop: zin maar kort in beeld | Niet opnieuw gemeten; code ongewijzigd, dus open |
| 5. Levermeter vol niet te zien op het voorgeschreven pad | Open |

## C4 Te volgen zonder hulp — PASS

`c4-bot.mjs`: tikt alleen op de knop met `data-wijs="1"` (die heeft ook klasse `wijs`), plus Start en Race!. Zonder `?speed`.

| Maat | Door de tutorial | Duur volgens spel | Start tot introkaartje race 1 | Tikken | Consolefouten |
|---|---|---|---|---|---|
| 375 × 667 | ja | 65,2 s | 65,5 s | 7 | 0 |
| 390 × 844 | ja | 65,4 s | 65,6 s | 7 | 0 |

Drempel 120 s gehaald met 54 s over. Eén meting per maat. Eindkaartje: "Klaar? | QALY-punten in de oefenronde | 620 | Race!".

Kanttekeningen (ongewijzigd): bij stap 3 staat "Au. De pijn komt terug." en noemt de zin de spuit niet; alleen de markering wijst hem aan.

## C5 Race 2 sluit aan — PASS

Introkaartje race 2, uitgelezen in het draaiende spel, beide maten gelijk (`c5-stdout.txt`, `*/c5-intro-race2.png`); past zonder scrollen (onderkant knop 597 van 667 en 812 van 844):

1. Het groene vlak heeft nu ook een bovenkant: 0,6–1,0 mmol/L.
2. Boven 1,5 mmol/L is het giftig.
3. De klok telt in dagen: de race duurt 10 dagen.
4. Poortjes komen 3× per dag: om 0, 8 en 16 uur.
5. Niets heet hier Overslaan.
6. Tik twee keer op Tablet voor 2 tabletten op één poortje.
7. Er is geen zetpil.
8. Er is geen dagteller.

Overslaan (5) en 2× tablet (6) staan er elk in één eigen zin. In race 2 gezien: knoppen Tablet / Overslaan / Spuit, klok "Dag 0 · 0 u", dagteller verborgen, "2× Tablet voor dag 0" (390 × 844), "Overslaan voor dag 0 · 16 u", "Lithium bestaat niet als prik. Slikken of stikken!", startspiegel 0,764 mmol/L.

Gebreken (ongewijzigd sinds ronde 2; `toonIntro` is niet veranderd):
1. Niet op het kaartje: Overslaan staat op de tweede plaats (Niets stond op de vierde), en de keuze wist bij de derde tik op Tablet in plaats van de tweede.
2. Niet op het kaartje: de spiegel begint al in het groene vlak, en een tablet is hier 400 mg in plaats van 1 g.

---

## Getallen en beweringen

**0 afwijkingen van het casusblad.** Nagelopen tegen §3 en §5, uit het draaiende spel:

Oefenronde, voorgeschreven pad (`c4-bot-uitvoer.txt`)
- "Opa Jan heeft pijn: kies een tablet voor het eerste poortje." Spiegel 0.
- "Een pil moet eerst door je maag." Letterlijk §3. Op klok 0,25 pas 4,07 mg/L.
- "De pijn is weg: kies Niets om een poortje over te slaan." Op uur 1,5: 9,18 mg/L (casusblad: piek 9,21 na 1,38 u; zone ≥ 5).
- "Je lichaam ruimt het op: elke 2,5 uur is de helft weg." Letterlijk §3; T½ 2,5 u.
- "Au. De pijn komt terug." Letterlijk casusblad; verschijnt op klok 4,30–4,37 bij 4,9 mg/L (casusblad: boven 5 tot 4,29 u).
- "Een prik werkt meteen, maar zakt net zo hard." Letterlijk §3. Sprong op uur 5: 4,1 → 20,0 mg/L = 15,9 (casusblad 15,9).
- "Elke gram telt mee in de dagteller linksboven: kies weer een tablet." De dagteller staat linksboven en telde de spuit mee (2 g).
- "Meer is niet beter: boven 4 gram per dag raakt de lever beschadigd." Letterlijk §3.
- "Slikken lukt niet altijd: kies nu een zetpil." Geen getal, geen onjuiste bewering.
- "Een zetpil: soms goed, soms nauwelijks. Daar kun je niet van op aan." Letterlijk §3. Zetpil op poortje 13: F 0,35, ka 0,3 /u (uit het model gelezen; binnen 0,3–0,9 en 0,3–1,0).
- Dagteller "0/1/2/3/4 g van max. 4 g"; as 0, 5, 10, 15, 20 mg/L; "pijnstilling (vereenvoudigd)"; poortjes elk uur; eindkaartje "Klaar?" / "Race!"; totaal 4 g.

Zinnen die alleen bij afwijken verschijnen
- "Kies nu de spuit." Geen getal; alleen als de spiegel niet onder de streep zit.
- "De dagteller is vol: opa Jan krijgt vandaag niets meer." Alleen bij dagteller ≥ 4 g; past bij "maximaal 4 g per 24 uur". Woordkeus: zie C3 gebrek 2.
- "Te veel paracetamol beschadigt de lever." Letterlijk casusblad; alleen boven 4 g, met "5 g van max. 4 g".
- Keuzeregel: "… voor uur N", "Keuze gewist voor uur N: niets kiezen is overslaan.", "Te laat voor uur N. Kies opnieuw voor uur N+1." Gelijk aan race 1.

Introkaartje race 1: verhaal letterlijk casusblad; "Houd de spiegel in het groene vlak, boven de streep."; "Kies vóór elk paars poortje: Tablet, Zetpil, Spuit of Niets."; "Maximaal 4 gram per dag: daarboven raakt de lever beschadigd." (casusblad: 4 g per 24 uur); QALY-zin letterlijk §3 plus "Het zijn spelpunten, geen echte QALY's."

Introkaartje race 2: verhaal letterlijk casusblad; 0,6–1,0 mmol/L; giftig boven 1,5 mmol/L; 10 dagen; 3× per dag om 0, 8 en 16 uur.

## Niet gecontroleerd

- Echte telefoon (iOS Safari, Android Chrome); alleen Chromium-emulatie. Geluid. "Beweging verminderen" (alleen CSS gelezen).
- Van de 32 C2-paren zijn er 8 als beeld bekeken; de rest alleen via de DOM-meting.
- De afwijkscenario's draaiden op `?speed=3`. Hoe lang een zin op gewone snelheid in beeld staat is daar berekend, niet gemeten. Elk scenario is in één maat gedraaid (om en om), niet in beide.
- Ronde 2 gebrek 4 (vooraf gekozen knop) niet opnieuw gemeten.
- Race 2 op `?speed=20`: de poortjes schoven te snel voor een nette tikreeks (in 375 × 667 viel de tweede tik op Tablet al na het poortje). Ibuprofen op dag 5 niet gespeeld.
- C4: één meting per maat.
- `tests/bots.mjs` en `tools/schermen.mjs` niet gedraaid; schermafbeeldingen van de bouwer niet gebruikt.
