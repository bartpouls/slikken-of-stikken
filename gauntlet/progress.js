window.GAUNTLET = {
  goal: "Slikken of Stikken v1: farmacokinetiek-race voor de telefoon (index.html) + scorebord voor de beamer (scorebord.html)",
  bar: "docs/bouwopdracht.md §6 (verbatim daar). A rekenmodel — type: inhoud tegen bron; poort A1–A4; stop bij 0 afwijkingen. B speelbaarheid — type: bewijs met vooraf afgesproken drempels; poort B1–B6 (bots in 375×667 en 390×844). C beleving — type: smaak; één bouwronde + verse controle op A en B, daarna correctielijst Bart. Niet-onderhandelbaar: rekenfout, getal ≠ casusblad, onjuiste farmacologische bewering = FAIL.",
  budget: "A max 4 rondes per stuk · B max 2 (tot 4 als drempels niet gehaald) · C 1 bouwronde + 1 verse controle · gebruikt: 3× onderbroken door bestedingslimiet, telkens hervat",
  level: "blind",
  status: "done",
  round: 4, maxRounds: 4,
  updated: "2026-10-14 11:25 UTC",
  units: [
    { name: "A · U1 Rekenmodel + casusdata", round: 1, verdict: "PASS", evidence: "Blind: eigen RK4 in Python; max fout 4e-13 tegen §4; halvering 0,5000000; alle tabelregels binnen marge; 0 afwijkingen casusdata. Stopregel A gehaald.", artifact: "src/model.js" },
    { name: "A4 · Eindcontrole hele spel (getallen en beweringen)", round: 2, verdict: "PASS", evidence: "Blind R2: elk getal en elke farmacologische bewering op alle schermen tegen §5: 0 afwijkingen; geen tegenstrijdige teksten.", artifact: "index.html" },
    { name: "B · U8 Bots in telefoonscherm (B1–B6)", round: 1, verdict: "PASS", evidence: "Blind B-criticus: bots geldig bewijs (alleen echte tikken). Definitieve build 308805f5: echt 768 = spuit 768 ≥ zetpil 736 > gemist 418 > niets −1000; elk uur slikken −3518 met leverschade; echt = 92,8% van 828. Lithium 1000 > 628 > −710, dubbel −2267 (laagst, 183 u > 1,5). Races 93,2 s; ≤3 tikken; knoppen ≥48; 0 console/netwerk; naam 34–40 px, totaal 58–80 px.", artifact: "tests/bots.mjs + gauntlet/artefacten/bots-rapport.md" },
    { name: "B · U2 QALY-score", round: 4, verdict: "FAIL", evidence: "Score zelf PASS (Q1–Q5, uitputtende zoektocht). Q6: in 4–7% van willekeurige spellen noemt een praktijkzin de verkeerde oorzaak. Budget (4 rondes) op.", artifact: "src/score.js" },
    { name: "C · U5 Racescherm + spelverloop", round: 2, verdict: "PASS", evidence: "Harde ondergrens gehaald (eindcontrole 2): 0 overlap op beslismomenten, contrast canvas ≥5,25:1, casusbladlabels. Smaak: wacht op correctielijst Bart.", artifact: "src/app.js" },
    { name: "C · U6 Tutorial opa Jan", round: 2, verdict: "PASS", evidence: "Harde ondergrens gehaald; stapzinnen woordelijk §3; curves = model. Smaak: wacht op Bart.", artifact: "src/tutorial.js" },
    { name: "C · U7 Eindverslag + eindscherm", round: 2, verdict: "PASS", evidence: "Getallen = model (0 afwijkingen); naam ≥34 px, totaal ≥58 px; vraag + knop boven de vouw. Smaak: wacht op Bart.", artifact: "src/einde.js" },
    { name: "C · U3 Geluid", round: 3, verdict: "PASS", evidence: "Blind R3: P1, P3–P6 PASS; P2 nipt; microfix spuit daarna (bouwermeting, niet blind herbeoordeeld). Niemand heeft het gehoord.", artifact: "src/sound.js" },
    { name: "C · U4 Scorebord beamer", round: 5, verdict: "PASS", evidence: "Blind 3× beter per ronde; knoppen ≥48, AA, 0 console/netwerk (eindcontrole 2 + B-criticus). Laatste fix (lange namen) door bouwer gemeten.", artifact: "scorebord.html" }
  ],
  log: [
    { round: 4, unit: "LEAD", verdict: "PASS", note: "Laatste microfix (venster uit data §2, kleur per betekenis, levermetertekst, scorebordnamen, Nog een keer in beeld); modeltest 105/105, scoretest 116/116 en volledige botsrun op definitieve build groen" },
    { round: 2, unit: "Eindcheck", verdict: "PASS", note: "Spel haalt A4 en harde C-ondergrens; 7 restpunten → microfix" },
    { round: 1, unit: "U8", verdict: "PASS", note: "B1–B6 PASS beide viewports" },
    { round: 1, unit: "Eindcheck", verdict: "FAIL", note: "Overlap op beslismoment + knoppen scorebord + 10 naden → smoothing pass" },
    { round: 4, unit: "U2", verdict: "FAIL", note: "Budget op; oorzaakzinnen in randgevallen onder de lat" },
    { round: 2, unit: "U5", verdict: "PASS", note: "Casusbladlabel, contrast, overlap, keuzefeedback, terug-knop" },
    { round: 1, unit: "U6", verdict: "FAIL", note: "Stap 1 sprak eigen les tegen; LEAD: fez vervangen door eigen pet/hoed" },
    { round: 1, unit: "U5", verdict: "FAIL", note: "LEAD: paracetamol max 1 g per poortje (casusblad '1 g per keer')" },
    { round: 3, unit: "U3", verdict: "FAIL", note: "Nipt; microfix spuit, daarna gestopt (smaakstopregel)" },
    { round: 1, unit: "U2", verdict: "FAIL", note: "LEAD: QALY-uitleg §3 vrij van 2-zinnenregel; echt schema = 1 g 0/6/12/18 met op 12 u toegestane route; beste >4 g < gemiste dosis" },
    { round: 1, unit: "U1", verdict: "PASS", note: "0 afwijkingen; kleine fix blokkadegrens-tolerantie" },
    { round: 0, unit: "LEAD", verdict: "PENDING", note: "Sites §6C niet bereikbaar (netwerkbeleid). Schermafbeeldingen in docs/referenties/ leidend." }
  ],
  open: [
    "LEAD-besluiten ter bevestiging: (1) tijdpercentages in de tabel ±2 procentpunt, concentraties ±2% relatief; (2) 'echt schema' = 1 g om 0/6/12/18 u, op 12 u zetpil of spuit (misselijk); (3) paracetamol max. 1 g per poortje, lithium tot 2 tabletten; (4) leverschade (>4 g) scoort altijd lager dan een gemiste dosis; (5) eigen pet/hoed in plaats van fez; (6) knop 'Uitleg overslaan' in de tutorial.",
    "Correctielijst beleving (C): speel het spel op je eigen telefoon en geef je lijst."
  ],
  belowBar: [
    "Praktijkzinnen eindverslag: in 4–7% van willekeurige spellen een verkeerde oorzaak (bv. dubbele lithiumdosis op uur 104/112 → 'vooral na de ibuprofen'; één dosis op uur 20–23 → 'de pijn komt terug'). Geen farmacologische fout, nooit aanmoediging tot overslaan. Fix: tegenfeitelijke run in score.js.",
    "Geluid alleen gemeten, door niemand gehoord; laatste spuit-fix niet blind herbeoordeeld.",
    "Laatste microfix niet opnieuw door een blinde criticus bekeken; wel modeltest, scoretest en volledige botsrun op de definitieve build groen.",
    "Bewijs alleen in Chromium-emulatie; niet getest in iOS Safari of op een echte telefoon.",
    "Lithium steady state in het model 0,764–0,882 mmol/L (casusblad ±0,76–0,87); piek na één dosis 3,65 u (casusblad ±3,5 u).",
    "Beleving (eindcontrole): tijdas kantelt tussen tutorial (→) en race (↓) — overgangszin toegevoegd; eindscherm op 375 px ±7 schermen lang; lithiumlijn beweegt in smalle band; tik binnen ±350 ms na een schermwissel gaat verloren; 'Dag 0' als eerste dag.",
    "QR-code voor de beamer (§7) niet gebouwd; GitHub Pages nog niet aangezet.",
    "Scorebord 1280: tijdelijk 'nieuw'-label deels achter het verwijdervenster van de rij erboven."
  ]
};
