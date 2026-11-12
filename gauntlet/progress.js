window.GAUNTLET = {
  goal: "Slikken of Stikken v2: de tutorial is het echte racescherm met begeleiding, en alle schermen hebben één stijl",
  bar: "docs/bouwopdracht.md §6 (verbatim daar). A rekenmodel en B speelbaarheid: al gehaald, moeten groen blijven. C samenhang tutorial en race — type: bewijs met vooraf afgesproken drempels; poort C1–C5, beoordeeld door een aparte criticus met verse context, elk criterium apart en met bewijs; max 2 rondes, tenzij de drempels nog niet gehaald zijn. D beleving — type: smaak; één bouwronde + één verse controle op A, B en C, daarna de correctielijst van Bart. Niet-onderhandelbaar: rekenfout, getal ≠ casusblad, onjuiste farmacologische bewering = FAIL.",
  budget: "C: 3 rondes gebruikt (ronde 3 omdat de drempel van C3 na ronde 2 niet gehaald was), elke ronde een nieuwe criticus met verse context · D: 1 bouwronde + verse controle op A en B (ronde 1) en op C (ronde 3) · sessie 3× onderbroken door een gebruikslimiet, telkens hervat",
  level: "blind",
  status: "done",
  round: 3, maxRounds: 3,
  updated: "2026-11-12",
  units: [
    { name: "A · Rekenmodel en getallen (moest groen blijven)", round: 1, verdict: "PASS", evidence: "Verse controleur, eigen formules en eigen RK4: A1 afwijking ≤ 1,7e-13 op 17 tijdstippen; A2 halvering 0,500000; A3 alle 12 tabelrijen gelijk na afronding; A4 0 afwijkingen in alle teksten. model.js, score.js en §4/§5 ongewijzigd t.o.v. 670a3f9. Tests 105/105 en 116/116 op de eindbuild.", artifact: "gauntlet/artefacten/controle-ab/verslag.md" },
    { name: "B · Speelbaarheid, bots (moest groen blijven)", round: 3, verdict: "PASS", evidence: "Volledige botsrun op de eindbuild (sha256 1bfb48c68c2d), 375×667 en 390×844: echt 768 = spuit 768 ≥ zetpil 736 > gemist 418 > niets −1000; elk uur slikken −3518 met leverschade; echt = 92,8% van 828. Lithium 1000 > 628 > −710; dubbel −2267. Race 93 s; knoppen ≥ 48; 0 console/netwerk; naam ≥ 34 px, totaal ≥ 58 px. Verse controleur (op de build van ronde 1) bevestigde B1–B6 met eigen steekproef.", artifact: "gauntlet/artefacten/bots-rapport.md" },
    { name: "C1 · Eén tekencode", round: 3, verdict: "PASS", evidence: "Drie critici, drie keer PASS. Eén startRace, teken, tekenPoortjes, werkKopBij; 'gids' komt in geen tekenfunctie voor; tutorial.js is alleen een draaiboek; geen tutorial-CSS behalve de markering.", artifact: "gauntlet/artefacten/criticus-c/ronde3/verslag-ronde3.md" },
    { name: "C2 · Nul zichtbare verschillen", round: 3, verdict: "PASS", evidence: "32 paren (16 momenten × 2 maten): 0 verschillen buiten uitlegzin, markering, plotwending en het doorlopen van de race. Bewijs deels dun: 8 paren als beeld bekeken, de rest via DOM-meting.", artifact: "gauntlet/artefacten/criticus-c/ronde3/" },
    { name: "C3 · Volledig en niets extra", round: 3, verdict: "PASS", evidence: "Ronde 1 FAIL (knoppen op slot, tweede tik deed iets anders). Ronde 2 FAIL (na één eigen extra dosis dwong de tutorial over 4 g). Ronde 3 PASS op de letterlijke tekst, als weging: 24/24 tikken gelijk aan race 1; alle vier de knoppen via een poortje; in 12 afwijkscenario's vroeg de tutorial nooit om een dosis boven 4 g en liep hij nooit vast.", artifact: "gauntlet/artefacten/criticus-c/ronde3/verslag-ronde3.md" },
    { name: "C4 · Te volgen zonder hulp", round: 3, verdict: "PASS", evidence: "Eigen bot van de criticus, alleen de gemarkeerde knop, zonder ?speed: 65,2 s (375×667) en 65,4 s (390×844), 7 tikken, 0 consolefouten. Drempel 120 s.", artifact: "gauntlet/artefacten/criticus-c/ronde3/" },
    { name: "C5 · Race 2 sluit aan", round: 3, verdict: "PASS", evidence: "Acht zinnen op het introkaartje van race 2, één per verschil; 'Niets heet hier Overslaan.' en 'Tik twee keer op Tablet voor 2 tabletten op één poortje.' elk apart; past zonder scrollen in beide maten.", artifact: "src/app.js (toonIntro)" },
    { name: "D · Beleving: één stijl voor alle schermen", round: 1, verdict: "PENDING", evidence: "Eén bouwronde gedaan: start, oefenronde, introkaartjes, races en eindscherm zwart met sterren, platte figuurtjes, paarse markering met lijn ervoor en erachter. Smaak: wacht op de correctielijst van Bart.", artifact: "gauntlet/schermen/index.html" }
  ],
  log: [
    { round: 1, unit: "Bouwer", verdict: "PENDING", note: "Tutorial omgebouwd tot draaiboek op de race-motor; start, introkaartjes en eindscherm in de zwarte sterrenstijl; platte figuurtjes." },
    { round: 1, unit: "Controle A en B", verdict: "PASS", note: "A1–A4 en B1–B6 PASS; 0 afwijkingen van het casusblad." },
    { round: 1, unit: "Criticus C", verdict: "FAIL", note: "C3: knoppen in de tutorial op slot met eigen meldingen; tweede tik deed iets anders dan in race 1. C1, C2, C4, C5 PASS." },
    { round: 2, unit: "Bouwer", verdict: "PENDING", note: "Slot weg: knoppen werken als in de race, alleen de klok wacht. Markering komt samen met de zin. Introkaartje race 2: één zin per verschil." },
    { round: 2, unit: "Criticus C", verdict: "FAIL", note: "C3 (weging): na één eigen extra dosis dwong de tutorial de speler over het dagmaximum. C1, C2, C4, C5 PASS." },
    { round: 3, unit: "Bouwer", verdict: "PENDING", note: "De oefenronde vraagt nooit om een dosis boven 4 g: die stap vervalt met één zin." },
    { round: 3, unit: "Criticus C", verdict: "PASS", note: "C1–C5 PASS; C3 op de letterlijke tekst (weging). 0 afwijkingen van het casusblad." },
    { round: 3, unit: "Bots", verdict: "PASS", note: "Volledige run op de eindbuild: B1–B6 en de C-metingen groen in beide maten." }
  ],
  open: [
    "Correctielijst beleving (D): bekijk gauntlet/schermen/index.html of speel het spel op je telefoon en geef je lijst.",
    "Keuzes van de bouwer ter bevestiging: (1) 'Oefenronde overslaan' staat op het startscherm, niet in de oefenronde; (2) de oefenronde geeft tablet (uur 0), spuit (5), tablet (9), zetpil (13) = precies 4 g, zonder leverschade; (3) nieuwe zinnen in de oefenronde naast die uit §3: 'Opa Jan heeft pijn: kies een tablet voor het eerste poortje.', 'De pijn is weg: kies Niets om een poortje over te slaan.', 'Elke gram telt mee in de dagteller linksboven: kies weer een tablet.', 'Slikken lukt niet altijd: kies nu een zetpil.', en bij afwijken 'Kies nu de spuit.' en 'De dagteller is vol: opa Jan krijgt vandaag niets meer.'",
    "Weging C3: wie in de oefenronde zelf één extra dosis geeft, mist de zetpilstap (anders zou de tutorial hem over 4 g duwen). Is dat goed zo?"
  ],
  belowBar: [
    "C3 is PASS als weging op de letterlijke tekst. Strenger gelezen blijft staan: één eigen extra dosis in de oefenronde kost de speler de zetpilstap, en de stand 'levermeter vol' komt op het voorgeschreven pad niet in beeld.",
    "C2: een poortlabel dat onder de blijvende uitlegzin schuift, wordt niet getekend; de critici rekenden dat tot de uitlegzin. Bewijs voor C2 is deels een DOM-meting: 8 van de 32 paren zijn als beeld bekeken.",
    "Stap 3 van de oefenronde toont 'Au. De pijn komt terug.' (casusblad); de zin noemt de spuit niet, alleen de markering wijst hem aan.",
    "'De dagteller is vol' verschijnt bij precies 4 g; het casusblad noemt de levermeter pas boven 4 g vol. Woordkeus voor Bart.",
    "Introkaartje race 2 (acht zinnen, vol): niet erop staan de andere plaats van Overslaan, het wissen bij de derde tik op Tablet, de spiegel die al in het groene vlak begint en dat een tablet hier 400 mg is.",
    "De verse controle op A en B is gedaan op de build van ronde 1; daarna veranderde alleen de begeleiding van de oefenronde en het introkaartje. Op de eindbuild zijn de model- en scoretests en de volledige botsrun groen, maar A4 (teksten) is alleen door de C-critici opnieuw nagelopen voor oefenronde en introkaartjes.",
    "Scorebord voor de beamer (scorebord.html) heeft de oude stijl: §6D noemt het niet en het is niet aangepast.",
    "Alleen Chromium-emulatie: niet getest op een echte telefoon, in iOS Safari, met geluid of met 'beweging verminderen'.",
    "Uit v1, ongewijzigd: praktijkzinnen eindverslag noemen in 4–7% van willekeurige spellen de verkeerde oorzaak; QR-code voor de beamer niet gebouwd; lithium steady state in het model 0,764–0,882 (casusblad ±0,76–0,87)."
  ]
};
