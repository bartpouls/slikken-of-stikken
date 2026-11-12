# Criticus C — verslag ronde 1 (§6C Samenhang tutorial en race)

Beoordeeld: `index.html` op branch `claude/optimistic-franklin-vk86yy` (commit c6206cd). Eerst vastgesteld dat `index.html` byte-voor-byte gelijk is aan een verse build uit `src/` (eigen nabouw van de buildstap, uitkomst: identiek). Alles hieronder is zelf gemeten in Chromium met telefoon-emulatie (isMobile, hasTouch, echte tikken) in 375 × 667 en 390 × 844, zonder `?speed`. Niets in `src/`, `tests/`, `tools/`, `docs/` of `index.html` is gewijzigd.

| Criterium | Oordeel |
|---|---|
| C1 Eén tekencode | PASS |
| C2 Nul zichtbare verschillen | PASS (0 verschillen in de genoemde onderdelen; 1 kanttekening) |
| C3 Volledig en niets extra | **FAIL** (strenge lezing; zie gebreken 1–3) |
| C4 Te volgen zonder hulp | PASS (64,4 s in beide maten; 3 kanttekeningen) |
| C5 Race 2 sluit aan | PASS (verplichte twee staan erop; 3 gebreken) |
| Getallen en beweringen | 0 afwijkingen van het casusblad |

Eigen scripts en bewijs (deze map): `lib.mjs`, `c4-bot.mjs` (+ `c4-bot-uitkomst.json`), `c2-vergelijk.mjs` (+ `c2-uitvoer.txt`, `c2-metingen.json`), `c2-naast-elkaar.mjs` (+ `c2-pixels.txt`), `c4-fout-tikken.mjs` (+ `c4-fout-tikken-uitvoer.txt`), schermafbeeldingen in `375x667/` en `390x844/`.

---

## C1 Eén tekencode — PASS

Bewijs (gelezen: `src/app.js`, `src/tutorial.js`, `src/style.css`, `src/index.template.html`, `tools/build.mjs`):

- De oefenronde start als `startRace(0, SoS.tutorial)` (`src/app.js:274`); de race als `startRace(i)` (`:1426`, `:1340`). Eén functie `startRace` (`:368`), één `bouwRaceUi` (`:410`, knoppen `:429-448`), één `teken` (`:783-1088`: sterren, zone, streep, curve, stip, nu-lijn, aslabels, tijdpijl), één `tekenPoortjes` (`:705-781`), één `werkKopBij` (`:1257-1286`: klok, QALY-stand, dagteller, levermeter), één `lus` (`:1091`).
- `src/tutorial.js` (52 regels) bevat alleen data: casus, eindtijd, vijf stappen (klokmoment, zin, knop, poortje, zin daarna) en de tekst van het eindkaartje. Geen canvas, geen DOM, geen rekenwerk.
- Alle plekken waar de motor anders doet met een draaiboek (`R.gids`), zelf nagelopen: `:371` (blokkade uit), `:405-406` (eerste zin i.p.v. openingsmelding), `:420-422` (tekst eindkaartje), `:453` en `:1198`, `:1207`, `:1120` (plotwending uit), `:487-491` (alleen de gemarkeerde knop werkt), `:513` (geen "te laat"), `:536`, `:541-555` (markering aan/uit), `:583` (zin blijft staan), `:1099-1105` (klok stil), `:1125`, `:1186-1190`, `:1294`, `:1312`. Geen van deze regels tekent tijdlijn, curve, zone, poortjes, knoppen, klok, QALY-stand, dagteller of levermeter.
- CSS: de enige tutorial-eigen regels zijn de markering `.actie.wijs` (`src/style.css:315-316`, `:330`). Geen apart scherm in de template (`src/index.template.html:35` is alleen een commentaarregel; de oefenronde gebruikt `#scherm-race`, `:50-77`).
- Restanten van een oude tutorial gezocht (`tutorial|oefen|gids|wijs` in alle bronbestanden): niets gevonden buiten bovenstaande; `einde.js:19` is commentaar.

Gebreken: geen.

## C2 Nul zichtbare verschillen — PASS

Methode: per tutorialstap drie momenten (a = klok stil vóór de tik, b = direct na de tik, c = 0,45 uur na het poortje) naast hetzelfde klokmoment in race 1 met dezelfde keuzes (tablet uur 0, niets uur 2, spuit uur 5, tablet uur 9, zetpil uur 13), plus het eindkaartje. 16 paren × 2 schermmaten = 32 paren. Per paar (1) een DOM-meting van plaats, tekst, lettertype, gewicht, grootte en kleur van klok, QALY-label, QALY-getal, trendpijl, dagteller, levermeter, maxstreepje, patiënt, canvas, keuzeregel, de vier knoppen (vorm, plaats, icoon, tekst) en dempknop; (2) een pixelvergelijking per schermdeel; (3) zelf bekeken samengestelde beelden `paar-stapNx.png` (tutorial | race 1 | verschil in rood).

Uitkomst, geteld in de onderdelen die §6C2 noemt:

| Onderdeel | Verschillen | Bewijs |
|---|---|---|
| Richting van de tijd | 0 | zelfde pijl "tijd ↓", poortjes op dezelfde hoogte (bv. `paar-stap3a.png`, `paar-stap4a.png`) |
| Achtergrond | 0 | zwart met dezelfde sterren; alleen twinkeling |
| Kleuren zone, streep, curve, poortjes | 0 | curve valt in het verschilbeeld samen; kleurwissel blauw/groen op dezelfde plek |
| Knoppen: vorm, plaats, icoon, tekst | 0 | rect en stijl identiek, bv. 375: Tablet 12,579 81,8×76 in beide; 390: 12,748 85,5×84 |
| Lettertype en plaats klok | 0 | 16,15.5; 26 px/800 in beide |
| Lettertype en plaats QALY-stand | 0 | identiek; getal wijkt soms 1 punt af doordat de race doorloopt tijdens de foto |
| Dagteller en levermeter | 0 | pixelverschil in de rij 0,00% in stap 1–4 (beide maten) |

Wel gevonden, en waarom het niet meetelt:
- Uitlegzin (toegestaan); stilstaande klok (toegestaan); witte rand met pulserende ring om de gevraagde knop (toegestaan).
- Stap 4c en 5a–c: knop "Misselijk" (gestreept, doorgestreept), limoenkleurige band met "misselijk", groen portretje, melding "Opa is misselijk na de narcose." in race 1 — de plotwending, uitzondering volgens §3.
- Stap 3a: in race 1 een koraalrode ring rond de stip (het "au"-effect, 0,6 s). In de tutorial is die ring er ook, maar hij is al uitgedoofd op het moment dat de klok stilstaat. Tijdsverschil, geen ander beeld.
- Eindkaartje: "Klaar? / QALY-punten in de oefenronde / Race!" tegenover "Race klaar / QALY-punten / Verder". Zelfde kaartje, zelfde plaats, lettertype en knopvorm; de tekst is voorgeschreven door §3 stap 6. Het eindkaartje staat niet in de lijst van §6C2.

Kanttekening (geen FAIL, wel melden):
1. Omdat de uitlegzin in de tutorial blijft staan, worden poortlabels (met het icoontje van wat je gaf) die eronder schuiven de hele tutorial lang niet getekend; in de race alleen zolang er een melding staat. Te zien in `375x667/paar-stap2a.png` ("Uur 0 + tablet" ontbreekt links, staat rechts), `390x844/paar-stap4a.png` ("Uur 7"), `paar-stap5a.png` ("Uur 11"). Code: `app.js:598` (`tot: Infinity`) en `:748`. Ik reken dit tot de uitlegzin, maar een strengere lezer kan het als verschil in "poortjes" tellen.

Bewijs dun op één punt: pixel-exact vergelijken kan niet, omdat de race doorloopt terwijl de foto wordt gemaakt (verschuiving van 1–3 px) en de sterren twinkelen. De percentages in `c2-pixels.txt` voor het tijdlijnvlak (0–5%) zijn daardoor ruis plus de toegestane verschillen; het oordeel steunt op de DOM-meting (exact) en op het zelf bekijken van de 32 paren, waarvan ik er 11 volledig heb opengemaakt en de rest via de cijfers heb beoordeeld.

## C3 Volledig en niets extra — FAIL (strenge lezing)

Wat klopt:
- Alle schermonderdelen van race 1 komen in de tutorial voor: klok, QALY-label en -stand met trendpijl, dagteller, levermeter met maxstreepje, portretje en naam, aslabels (0, 5, 10, 15, 20 mg/L), "streep →", "pijnstilling (vereenvoudigd)", groene zone, curve, stip met waarde, "onderweg"-bolletje, nu-lijn, tijdpijl, paarse poortjes met label en icoontje, melding, keuzeregel boven de knoppen ("Tablet voor uur 0"), vier knoppen, vinkje op de gekozen knop, dempknop, eindkaartje met knop.
- Elke raceknop is door de speler zelf gebruikt via het poortjesmechanisme (keuze vooraf, uitvoering op het poortje): Tablet (uur 0 en 9), Niets (uur 2), Spuit (uur 5), Zetpil (uur 13). Gemeten: `gegeven[0] = slik`, dagteller 1 → 2 → 3 → 4 g, zie het logboek in `c4-bot-uitkomst.json`. De knop op het eindkaartje wordt ook gebruikt.

Gebreken:
1. **De tutorial reageert anders op een tik dan race 1.** Tweede tik op dezelfde knop: in race 1 wist dat de keuze ("Keuze gewist voor uur 0: niets kiezen is overslaan."), in de tutorial wordt de tik geweigerd met "Even kijken wat er gebeurt." en blijft de keuze staan. Gemeten in beide maten (`c4-fout-tikken-uitvoer.txt`, `375x667/fout-2-tweede-tik.png`). Code: `app.js:487-491`. De speler leert dus dat dubbel tikken geen kwaad kan, en raakt in race 1 met een dubbele tik zijn dosis kwijt. Dit botst met §3 ("op precies dezelfde manier").
2. **De tutorial bevat iets wat race 1 niet heeft:** knoppen die op slot zitten, met twee eigen teksten in de keuzeregel: "Kies nu Tablet." (andere knop terwijl de klok stilstaat) en "Even kijken wat er gebeurt." (elke tik terwijl de klok loopt). In race 1 telt elke tik. `app.js:489`; `375x667/fout-1-andere-knop.png`.
3. **Twee handelingen uit race 1 worden nergens geoefend:** een keuze wissen (zelfde knop nog eens) en een keuze wisselen vóór het poortje (in race 1 gemeten: Spuit → Zetpil geeft "Zetpil voor uur 0"). §3: "Wie de tutorial gedaan heeft, heeft elke handeling uit race 1 al één keer zelf gedaan."
4. De regel "Te laat voor uur N. Kies opnieuw voor uur N+1." bestaat alleen in de race (`app.js:513`), niet in de tutorial.
5. De toestand "levermeter vol" (boven 4 g: rode lijn, knipperende meter, melding) komt in de tutorial niet in beeld; de speler stopt op precies 4 g. Hij wordt alleen verteld (stap 4). Verdedigbaar, maar het schermonderdeel in die stand is niet gezien.

Weging: de eerste twee deeleisen van C3 (alles komt voor; elke knop zelf gebruikt) zijn gehaald. De FAIL rust op de derde zin ("bevat niets wat race 1 niet heeft") en op §3, door gebrek 1–3. Wie de knopvergrendeling tot de "begeleiding" rekent, komt op PASS met gebreken; ik doe dat niet, omdat gebrek 1 de speler aantoonbaar iets verkeerds aanleert.

## C4 Te volgen zonder hulp — PASS

Eigen bot (`c4-bot.mjs`): zoekt de knop met de zichtbare witte rand (berekende stijl, niet `data-wijs`), tikt die met `page.touchscreen.tap`, en tikt aan het eind op de knop van het eindkaartje. Zonder `?speed`.

| Schermmaat | Doorgekomen | Duur (eigen stopwatch) | Duur volgens spel | Tikken | Consolefouten |
|---|---|---|---|---|---|
| 375 × 667 | ja, eindigt op introkaartje race 1 | 64,4 s | 64,2 s | 7 (Start, 5 knoppen, Race!) | 0 |
| 390 × 844 | ja | 64,4 s | 64,2 s | 7 | 0 |

Drempel 120 s: gehaald met 55 s over; dat is ruim 10 s leestijd per stap voor een mens.

Kan een mens zien welke knop bedoeld wordt? Ja: witte rand plus een pulserende witte ring, steeds precies één knop (`375x667/T1a.png` t/m `T5a.png`, ook in 390 × 844). De zin noemt de knop bij naam in stap 1, 2, 4 en 5.

Andere knop getikt (`c4-fout-tikken.mjs`): de knop schudt, de keuzeregel zegt "Kies nu Tablet.", de klok blijft stil, er gebeurt niets fout. Vier seconden niets doen: klok blijft stil. Dempknop tikken: geen invloed. Je kunt niet vastlopen.

Kanttekeningen:
1. Stap 3: de zin is "Au. De pijn komt terug." en noemt de Spuit niet; alleen de markering wijst hem aan. In alle andere stappen staat de knop in de zin.
2. De markering verschijnt ±0,26 s eerder dan de zin (de vorige zin fadet eerst uit). Mijn bot tikte in stap 2, 4 en 5 al voordat de zin in beeld was; de zin verscheen pas na de tik. Een mens merkt dit niet, maar wie snel tikt op de oplichtende knop leest de opdracht pas achteraf.
3. In 375 × 667 loopt de laatste zin over drie regels met een los woord "aan." op de derde regel (`375x667/T5c.png`). Smaak, voor Bart.

Niet gecontroleerd: een echte proefpersoon; de markering met "beweging verminderen" aan (alleen in de CSS gelezen, `style.css:330`: vaste witte ring).

## C5 Race 2 sluit aan — PASS

Introkaartje race 2, uitgelezen in het draaiende spel (beide maten gelijk; `intro-race-2.png`), past zonder scrollen (knop eindigt op 618 van 667 px en 764 van 844 px):

1. "Het groene vlak heeft nu ook een bovenkant: 0,6–1,0 mmol/L."
2. "Poortjes komen 3× per dag: om 0, 8 en 16 uur."
3. "Niets heet hier Overslaan."
4. "Tik twee keer op Tablet voor 2 tabletten op één poortje."
5. "Geen zetpil en geen dagteller; wel een giftige grens: boven 1,5 mmol/L."

Zelf vastgestelde verschillen tussen race 2 en race 1 (race 1 helemaal gespeeld, race 2 tot dag 0 · 12 u; `L1-begin.png` t/m `L10-dag0-12u.png`), en of ze op het kaartje staan:

| Verschil | Op het kaartje? |
|---|---|
| Overslaan in plaats van Niets | ja, zin 3 |
| 2× tablet per poortje (gemeten: "2× Tablet voor dag 0", badge 2×) | ja, zin 4 |
| Zone heeft een bovengrens | ja, zin 1 |
| Poortjes 3× per dag in plaats van elk uur | ja, zin 2 |
| Geen zetpilknop | ja, zin 5 |
| Geen dagteller en levermeter | ja, zin 5 |
| Rode giftige zone boven 1,5 | ja, zin 5 |
| Klok telt dagen ("Dag 0 · 8 u"), race duurt 10 dagen | nee, alleen af te leiden uit "per dag" |
| Spiegel staat bij de start al in het groene vlak (er is al een curve) | nee, alleen af te leiden uit "al jaren" in het verhaal |
| Overslaan staat op de tweede plaats; Niets stond op de vierde | nee |
| Derde tik op Tablet wist de keuze (in race 1 de tweede) | nee |
| Spuit doet niets | bewust niet (plotwending, §3) |

De twee verschillen die §6C5 met name noemt staan er elk in één eigen zin. Daarom PASS.

Gebreken:
1. Zin 5 bevat drie verschillen in één zin (geen zetpil, geen dagteller, giftige grens). De eis is "één zin per verschil".
2. Dat de klok nu dagen telt staat er niet met zoveel woorden, terwijl §3 dat verschil een leerpunt noemt.
3. De knopvolgorde verandert (Overslaan op de plek van Zetpil) en het wissen verschuift van de tweede naar de derde tik; geen van beide staat erop. Samen met C3-gebrek 1 is "per ongeluk wissen" nergens uitgelegd.

---

## Getallen en beweringen — 0 afwijkingen

Nagelopen tegen §3 en §5, alles uitgelezen uit het draaiende spel:

Oefenronde
- "Opa Jan heeft pijn: kies een tablet voor het eerste poortje." — §3 stap 1. Klopt.
- "Een pil moet eerst door je maag." — letterlijk §3. Curve begint pas na uur 0 te stijgen; "onderweg"-bolletje zichtbaar.
- "De pijn is weg: kies Niets om een poortje over te slaan." — op uur 1,5 staat de stip op 9,2 mg/L (casusblad: piek 9,21 na 1,38 u; zone ≥ 5). Klopt.
- "Je lichaam ruimt het op: elke 2,5 uur is de helft weg." — letterlijk §3; T½ 2,5 uur.
- "Au. De pijn komt terug." — letterlijk casusblad; verschijnt op klok 4,30–4,38 (casusblad: onder 5 mg/L vanaf 4,29 u). Stip toont 4,9 mg/L.
- "Een prik werkt meteen, maar zakt net zo hard." — letterlijk §3. Gemeten sprong op uur 5: 4,16 → 20,00 mg/L over 0,03 uur, dus ≈ 15,9 mg/L (casusblad 15,9).
- "Elke gram telt mee in de dagteller linksboven: kies weer een tablet." — dagteller telde de spuit mee (2 g na de spuit; casusblad: spuit telt mee).
- "Meer is niet beter: boven 4 gram per dag raakt de lever beschadigd." — letterlijk §3; maximum 4 g.
- "Slikken lukt niet altijd: kies nu een zetpil." — geen getal; geen onjuiste bewering.
- "Een zetpil: soms goed, soms nauwelijks. Daar kun je niet van op aan." — letterlijk §3. Zetpil op poortje 13 gebruikt F 0,35 en ka 0,3 /u; de hele vaste reeks ligt binnen 0,3–0,9 en 0,3–1,0.
- Dagteller "0/1/2/3/4 g van max. 4 g"; aslabels 0, 5, 10, 15, 20 mg/L; zonelabel "pijnstilling (vereenvoudigd)"; klok "Uur 0" t/m "Uur 16"; poortjes elk uur. Klopt.
- Eindkaartje "Klaar?" / "Race!" — §3 stap 6. Totaal 4 × 1 g = 4 g, niet boven het maximum.

Introkaartje race 1
- Verhaal letterlijk casusblad (70 kg, nieuwe heup, lever heel).
- "Houd de spiegel in het groene vlak, boven de streep." / "Kies vóór elk paars poortje: Tablet, Zetpil, Spuit of Niets." — routes kloppen met casus 1.
- "Maximaal 4 gram per dag: daarboven raakt de lever beschadigd." — casusblad: maximaal 4 g per 24 uur.
- QALY-zin letterlijk §3, plus "Het zijn spelpunten, geen echte QALY's." (door §3 gevraagd).

Introkaartje race 2
- Verhaal letterlijk casusblad. Zone 0,6–1,0 mmol/L; 3× per dag om 0, 8 en 16 uur; giftig boven 1,5 mmol/L. Alle drie letterlijk casusblad.
- In de race gezien: startspiegel 0,76 mmol/L (casusblad ±0,76–0,87), "Lithium bestaat niet als prik. Slikken of stikken!" letterlijk, "Opa is misselijk na de narcose." letterlijk.

Eén opmerking zonder afwijking: de dagen tellen vanaf "Dag 0". Dat past bij het casusblad (dag 5 = t 120 u), maar "Tablet voor dag 0" kan een leek vreemd vinden. Smaak, voor Bart.

## Niet gecontroleerd

- Echte telefoon (iOS Safari, Android Chrome); alleen Chromium-emulatie.
- Geluid.
- Race 2 voorbij dag 0 · 12 u (ibuprofen op dag 5 alleen in de code gelezen).
- De schermafbeeldingen van de bouwer in `gauntlet/schermen/` heb ik niet gebruikt en niet bekeken; het oordeel rust geheel op eigen opnamen.
- `tests/bots.mjs` en `tools/schermen.mjs` niet gedraaid.
