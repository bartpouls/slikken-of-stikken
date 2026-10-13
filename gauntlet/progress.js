window.GAUNTLET = {
  goal: "Slikken of Stikken v1: farmacokinetiek-race voor de telefoon (index.html) + scorebord voor de beamer (scorebord.html)",
  bar: "docs/bouwopdracht.md §6 (verbatim daar). A rekenmodel — type: inhoud tegen bron; poort A1–A4; stop bij 0 afwijkingen. B speelbaarheid — type: bewijs met vooraf afgesproken drempels; poort B1–B6 (bots in 375×667 en 390×844); max 2 rondes tenzij drempels niet gehaald. C beleving — type: smaak; één bouwronde + verse controle op A en B, daarna correctielijst Bart; streef: zo strak als Epic Green Cards. Niet-onderhandelbaar: rekenfout, getal ≠ casusblad, onjuiste farmacologische bewering = FAIL.",
  budget: "A max 4 rondes per stuk · B max 2 (tot 4 als drempels niet gehaald) · C 1 bouwronde + 1 verse controle",
  level: "blind",
  status: "running",
  round: 1, maxRounds: 4,
  updated: "2026-10-13 20:00",
  units: [
    { name: "U1 Rekenmodel + casusdata (A1–A3)", round: 1, verdict: "PASS", evidence: "Blind PASS A1–A4, 0 afwijkingen; eigen RK4 in Python: max fout 4e-13, halvering 0,5000000, alle tabelregels binnen marge. Stopregel A gehaald. Kleine robuustheidsfix blokkade-epsilon", artifact: "src/model.js" },
    { name: "U2 QALY-score + rangorde headless (B1–B2 voorlopig)", round: 2, verdict: "FAIL", evidence: "R1 FAIL: Q1 leverstraf te mild (5 g-bot 750 > zetpil-variant 736); Q6 vijf praktijkzinnen onjuist getriggerd (o.a. overslaan \"nodig\" bij te hoge spiegel). Q2–Q5 PASS (beste bot 828; echt schema 93%). Ronde 2 in bouw", artifact: "src/score.js" },
    { name: "U3 Geluid (C, hard: zelf gesynthetiseerd, dempknop)", round: 2, verdict: "PENDING", evidence: "R2 gebouwd: energie 800–4000 Hz, au +7,5 dB boven slik, geen context bij veeg. Verse criticus meet", artifact: "src/sound.js" },
    { name: "U4 Scorebord beamer (C)", round: 3, verdict: "FAIL", evidence: "R2: blinde A/B nieuw > oud (3/3). Contrast AA overal, geen h-scroll t/m 320. FAIL S2: winnaarsnaam afgekapt bij realistische namen (16 tekens) en scores ~1.700. Ronde 3 gerichte fix", artifact: "scorebord.html" },
    { name: "U5 Racescherm + spelverloop (C, B3–B6)", round: 1, verdict: "PENDING", evidence: "bouwer gestart (racescherm, flow, build)", artifact: "index.html" },
    { name: "U6 Tutorial opa Jan (C)", round: 0, verdict: "PENDING", evidence: "wacht op U5", artifact: "src/app.js" },
    { name: "U7 Eindverslag + eindscherm (C, B5)", round: 0, verdict: "PENDING", evidence: "wacht op U5", artifact: "src/app.js" },
    { name: "U8 Bots in telefoonscherm (B1–B6)", round: 0, verdict: "PENDING", evidence: "wacht op U5–U7", artifact: "tests/bots.mjs" },
    { name: "Eindcheck A4: elk getal en elke bewering in het spel tegen casusblad", round: 0, verdict: "PENDING", evidence: "na smoothing pass", artifact: "index.html" }
  ],
  log: [
    { round: 0, unit: "LEAD", verdict: "PENDING", note: "Sites §6C niet bereikbaar (netwerkbeleid: 403/ENOTFOUND). Schermafbeeldingen in docs/referenties/ zijn leidend." },
    { round: 2, unit: "U4", verdict: "FAIL", note: "Beter dan R1 (blind 3/3), maar podium niet berekend op realistische data → R3" },
    { round: 1, unit: "U2", verdict: "FAIL", note: "Leverschade te goedkoop; lithiumzinnen noemen overslaan \"nodig\" of wijzen verkeerde oorzaak aan. LEAD: QALY-uitleg §3 vrij van 2-zinnenregel; echt schema = 1 g 0/6/12/18 met op 12 u de toegestane route; nieuwe eis: beste >4 g-strategie < gemiste dosis" },
    { round: 1, unit: "U4", verdict: "FAIL", note: "Contrast <AA en horizontaal scrollen op 375 → gerichte fix (geen herontwerp)" },
    { round: 1, unit: "U1", verdict: "PASS", note: "Blind: 0 afwijkingen casusdata; tabel gereproduceerd. Bevinding: blokkadegrens zonder tolerantie → kleine fix" },
    { round: 1, unit: "U3", verdict: "FAIL", note: "P2 au niet opvallend + basgeluid verdwijnt op telefoonspeaker; P5/P6 AudioContext bij veeg → warning. Terug naar bouwer" },
    { round: 1, unit: "U1", verdict: "PENDING", note: "Model gebouwd: exacte exponentiële stap; 3 tijdpercentages wijken relatief >2% af maar ronden af op tabelwaarde → LEAD-interpretatie ±2 procentpunt" }
  ],
  open: ["LEAD-besluit lat A3: tabel heeft hele procenten, dus tijdpercentages ±2 procentpunt; concentraties/doses ±2% relatief. Akkoord?"],
  belowBar: ["Lithium steady state in het model: 0,764–0,882 mmol/L; casusblad zegt ±0,76–0,87 (bovengrens +1,4%). Bart: bevestigen.", "Lithium piek na één dosis 3,65 u (casusblad: ±3,5 u)."]
};
