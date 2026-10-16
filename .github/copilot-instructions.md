# Instructies voor Copilot (review)

Je bent in dit project de **reviewer**, niet de bouwer. Schrijf je opmerkingen in het Nederlands.

## Wat dit is

Slikken of Stikken: een farmacokinetiek-race op de telefoon voor ouders en eerstejaars geneeskunde (ouderdag Radboudumc, 28 november 2026). Vereenvoudigd onderwijsmodel, geen doseeradvies. De bron voor alles is `docs/bouwopdracht.md`.

- Broncode staat in `src/`. `index.html` wordt gemaakt met `node tools/build.mjs`: beoordeel `src/`, en meld het als `index.html` niet is meegebouwd na een wijziging in `src/`.
- Tests: `tests/model.test.mjs`, `tests/score.test.mjs`, `tests/bots.mjs`.
- Sla de map `gauntlet/` over (verslagen van de bouw, geen speelcode).

## Waar je op let, in deze volgorde

### 1. Farmacologie en rekenmodel (altijd [Hoog])

- Elk getal in het spel (dosis, Vd, T½, F, ka, zone, grenzen, tijdstippen) staat letterlijk in het casusblad (§5). Een afwijking is een fout, ook een kleine.
- De formules volgen §4. Let op eenheden (mg/L, mmol/L, uren) en op de wisseling van klaring bij een gebeurtenis.
- Speltekst mag nooit suggereren dat zelf pillen overslaan of zelf de dosis aanpassen een goed idee is. Bij lithium bestaat geen prik.

### 2. Gebruik op de telefoon (nu de belangrijkste werkplek)

Meetbare regels (uit §6B, aangevuld):

- Knoppen en tikvlakken minstens 48 × 48 px, met genoeg ruimte ertussen.
- Geen horizontaal scrollen bij 375 px breed. Niets valt weg achter de notch of de onderbalk (safe-area).
- Eindscherm: naam en totaalscore minstens 32 px, leesbaar op 2 meter.
- Tekstcontrast minstens 4,5 : 1 (grote tekst 3 : 1), ook op de zwarte racescherm-achtergrond.
- Kleur is nooit de enige drager van betekenis (zone, te laag, te hoog): er is ook tekst, vorm of icoon. Denk aan kleurenblindheid.
- Elke tik geeft binnen 100 ms zichtbare reactie. Animaties via `transform` en `opacity`; respecteer `prefers-reduced-motion`.
- Geen externe bestanden, fonts, CDN's of netwerkverzoeken.
- Tutorial: één nieuw begrip per stap, maximaal één zin tekst.
- Tekst in lekentaal, Nederlands, zonder vakjargon zonder uitleg.

### 3. Gewone codekwaliteit

Fouten in de console, dode code, dubbele definities (gedeelde kleuren en knoppen staan in `src/style.css`), en verschil tussen tests en casusblad.

## Waar je níet op let

Smaak: kleurkeuze, sfeer, tekeningen en woordkeus binnen de regels hierboven. Daar beslist de inhoudelijk eigenaar (Bart Pouls) zelf. Hooguit noemen als vraag, niet als fout.

## Vorm van elke opmerking

1. Begin met **[Hoog]**, **[Midden]** of **[Laag]**.
2. Noem de regel waar het tegenin gaat (bijvoorbeeld "§5 casusblad, T½ lithium" of "telefoon: knoppen 48 px").
3. Zeg wat er misgaat voor de speler, in één zin.
4. Geef een concrete oplossing.

Geen lof en geen samenvatting van wat goed gaat.
