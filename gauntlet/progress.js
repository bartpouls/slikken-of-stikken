window.GAUNTLET = {
  goal: "Slikken of Stikken v1: farmacokinetiek-race voor de telefoon (index.html) + scorebord voor de beamer (scorebord.html)",
  bar: "docs/bouwopdracht.md §6 (verbatim daar). A rekenmodel — type: inhoud tegen bron; poort A1–A4; stop bij 0 afwijkingen. B speelbaarheid — type: bewijs met vooraf afgesproken drempels; poort B1–B6 (bots in 375×667 en 390×844); max 2 rondes tenzij drempels niet gehaald. C beleving — type: smaak; één bouwronde + verse controle op A en B, daarna correctielijst Bart; streef: zo strak als Epic Green Cards. Niet-onderhandelbaar: rekenfout, getal ≠ casusblad, onjuiste farmacologische bewering = FAIL.",
  budget: "A max 4 rondes per stuk · B max 2 (tot 4 als drempels niet gehaald) · C 1 bouwronde + 1 verse controle",
  level: "blind",
  status: "running",
  round: 1, maxRounds: 4,
  updated: "2026-10-13 18:45",
  units: [
    { name: "U1 Rekenmodel + casusdata (A1–A3)", round: 1, verdict: "PENDING", evidence: "gebouwd; blinde criticus rekent onafhankelijk na", artifact: "src/model.js" },
    { name: "U2 QALY-score + rangorde headless (B1–B2 voorlopig)", round: 1, verdict: "PENDING", evidence: "bouwer gestart", artifact: "src/score.js" },
    { name: "U3 Geluid (C, hard: zelf gesynthetiseerd, dempknop)", round: 2, verdict: "FAIL", evidence: "R1 FAIL: au valt niet op; slik/zetpil/au <400 Hz → onhoorbaar op telefoonspeaker; consolewarning na veeg. Ronde 2 in bouw", artifact: "src/sound.js" },
    { name: "U4 Scorebord beamer (C)", round: 1, verdict: "PENDING", evidence: "gebouwd; verse criticus beoordeelt", artifact: "scorebord.html" },
    { name: "U5 Racescherm + spelverloop (C, B3–B6)", round: 0, verdict: "PENDING", evidence: "wacht op U1/U2", artifact: "index.html" },
    { name: "U6 Tutorial opa Jan (C)", round: 0, verdict: "PENDING", evidence: "wacht op U5", artifact: "src/app.js" },
    { name: "U7 Eindverslag + eindscherm (C, B5)", round: 0, verdict: "PENDING", evidence: "wacht op U5", artifact: "src/app.js" },
    { name: "U8 Bots in telefoonscherm (B1–B6)", round: 0, verdict: "PENDING", evidence: "wacht op U5–U7", artifact: "tests/bots.mjs" },
    { name: "Eindcheck A4: elk getal en elke bewering in het spel tegen casusblad", round: 0, verdict: "PENDING", evidence: "na smoothing pass", artifact: "index.html" }
  ],
  log: [
    { round: 0, unit: "LEAD", verdict: "PENDING", note: "Sites §6C niet bereikbaar (netwerkbeleid: 403/ENOTFOUND). Schermafbeeldingen in docs/referenties/ zijn leidend." },
    { round: 1, unit: "U3", verdict: "FAIL", note: "P2 au niet opvallend + basgeluid verdwijnt op telefoonspeaker; P5/P6 AudioContext bij veeg → warning. Terug naar bouwer" },
    { round: 1, unit: "U1", verdict: "PENDING", note: "Model gebouwd: exacte exponentiële stap; 3 tijdpercentages wijken relatief >2% af maar ronden af op tabelwaarde → LEAD-interpretatie ±2 procentpunt" }
  ],
  open: ["LEAD-besluit lat A3: tabel heeft hele procenten, dus tijdpercentages ±2 procentpunt; concentraties/doses ±2% relatief. Akkoord?"],
  belowBar: []
};
