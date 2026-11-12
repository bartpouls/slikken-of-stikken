window.GAUNTLET = {
  goal: "Slikken of Stikken v2: de tutorial is het echte racescherm met begeleiding, en alle schermen hebben één stijl",
  bar: "docs/bouwopdracht.md §6 (verbatim daar). A rekenmodel en B speelbaarheid: al gehaald, moeten groen blijven. C samenhang tutorial en race — type: bewijs met vooraf afgesproken drempels; poort C1–C5, beoordeeld door een aparte criticus met verse context, elk criterium apart en met bewijs; max 2 rondes. D beleving — type: smaak; één bouwronde + één verse controle op A, B en C, daarna de correctielijst van Bart. Niet-onderhandelbaar: rekenfout, getal ≠ casusblad, onjuiste farmacologische bewering = FAIL.",
  budget: "C max 2 rondes · D 1 bouwronde + 1 verse controle · gebruikt: bouwronde 1 klaar, criticus ronde 1 loopt",
  level: "blind",
  status: "running",
  round: 1, maxRounds: 2,
  updated: "2026-11-12",
  units: [
    { name: "A · Rekenmodel en getallen (moet groen blijven)", round: 1, verdict: "PENDING", evidence: "Bouwer: tests/model.test.mjs 105/105, tests/score.test.mjs 116/116 op de nieuwe build. Verse controle volgt.", artifact: "src/model.js, src/score.js" },
    { name: "B · Speelbaarheid, bots (moet groen blijven)", round: 1, verdict: "PENDING", evidence: "Volledige botsrun op de nieuwe build loopt.", artifact: "tests/bots.mjs" },
    { name: "C1 · Eén tekencode", round: 1, verdict: "PENDING", evidence: "Wacht op criticus.", artifact: "src/app.js, src/tutorial.js" },
    { name: "C2 · Nul zichtbare verschillen", round: 1, verdict: "PENDING", evidence: "Wacht op criticus.", artifact: "gauntlet/schermen/" },
    { name: "C3 · Volledig en niets extra", round: 1, verdict: "PENDING", evidence: "Wacht op criticus.", artifact: "gauntlet/schermen/" },
    { name: "C4 · Te volgen zonder hulp", round: 1, verdict: "PENDING", evidence: "Wacht op criticus.", artifact: "tests/bots.mjs" },
    { name: "C5 · Race 2 sluit aan", round: 1, verdict: "PENDING", evidence: "Wacht op criticus.", artifact: "src/app.js (toonIntro)" },
    { name: "D · Beleving: één stijl voor alle schermen", round: 1, verdict: "PENDING", evidence: "Bouwronde klaar; schermafbeeldingen in gauntlet/schermen/. Smaak: wacht op Bart.", artifact: "gauntlet/schermen/index.html" }
  ],
  log: [
    { round: 1, unit: "Bouwer", verdict: "PENDING", note: "Tutorial omgebouwd tot draaiboek op de race-motor; start, introkaartjes en eindscherm in de zwarte sterrenstijl; platte figuurtjes." }
  ],
  open: [],
  belowBar: []
};
