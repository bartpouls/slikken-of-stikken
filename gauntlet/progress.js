window.GAUNTLET = {
  goal: "Slikken of Stikken v1: farmacokinetiek-race voor de telefoon (index.html) + scorebord voor de beamer (scorebord.html)",
  bar: "docs/bouwopdracht.md §6 (verbatim daar). A rekenmodel — type: inhoud tegen bron; poort A1–A4; stop bij 0 afwijkingen. B speelbaarheid — type: bewijs met vooraf afgesproken drempels; poort B1–B6 (bots in 375×667 en 390×844); max 2 rondes tenzij drempels niet gehaald. C beleving — type: smaak; één bouwronde + verse controle op A en B, daarna correctielijst Bart; streef: zo strak als Epic Green Cards. Niet-onderhandelbaar: rekenfout, getal ≠ casusblad, onjuiste farmacologische bewering = FAIL.",
  budget: "A max 4 rondes per stuk · B max 2 (tot 4 als drempels niet gehaald) · C 1 bouwronde + 1 verse controle",
  level: "blind",
  status: "running",
  round: 3, maxRounds: 4,
  updated: "2026-10-14 (hervat na API-limiet)",
  units: [
    { name: "U1 Rekenmodel + casusdata (A1–A4)", round: 1, verdict: "PASS", evidence: "Blind PASS A1–A4, 0 afwijkingen; eigen RK4 in Python: max fout 4e-13, halvering 0,5000000, alle tabelregels binnen marge. Stopregel A gehaald.", artifact: "src/model.js" },
    { name: "U2 QALY-score + rangorde headless", round: 3, verdict: "FAIL", evidence: "R2: Q1–Q5 PASS (2 onafhankelijke scorers, 0 verschil; beste ≤4 g 828, echt schema 93%; beste >4 g −250 < gemist 418). FAIL Q6: lithiumzinnen bij dubbele (inhaal)dosis. R3 in bouw", artifact: "src/score.js" },
    { name: "U3 Geluid", round: 3, verdict: "PENDING", evidence: "R3 gebouwd: alle actiegeluiden boven telefoondrempel via echt pad; au ≥3,7 dB boven rest. Verse criticus loopt", artifact: "src/sound.js" },
    { name: "U4 Scorebord beamer", round: 4, verdict: "FAIL", evidence: "R3: blind beter dan R2; S1–S3, S5, S6 PASS. FAIL S4: bevestigvenster vervaagd (2,83:1) / half onder formulier op 320; score −10.275 geweigerd. R4 in bouw", artifact: "scorebord.html" },
    { name: "U5 Racescherm + spelverloop", round: 1, verdict: "PENDING", evidence: "Gebouwd: tijd loopt omlaag, zone als verticale baan, paarse poortjes; race 93 s; live = batch. Verse criticus op momentopname loopt", artifact: "index.html" },
    { name: "U6 Tutorial opa Jan", round: 1, verdict: "PENDING", evidence: "In bouw (hervat)", artifact: "src/tutorial.js" },
    { name: "U7 Eindverslag + eindscherm", round: 1, verdict: "PENDING", evidence: "In bouw (hervat)", artifact: "src/einde.js" },
    { name: "U8 Bots in telefoonscherm (B1–B6)", round: 0, verdict: "PENDING", evidence: "wacht op U5–U7", artifact: "tests/bots.mjs" },
    { name: "Eindcheck: smoothing + A4 over het hele spel", round: 0, verdict: "PENDING", evidence: "na U5–U8", artifact: "index.html" }
  ],
  log: [
    { round: 3, unit: "LEAD", verdict: "PENDING", note: "API-limiet onderbrak 6 agents; hervat vanuit eigen context" },
    { round: 3, unit: "U4", verdict: "FAIL", note: "Steeds beter (blind 3×), resterend: 3 randgevallen bevestigvenster/scorebereik" },
    { round: 2, unit: "U2", verdict: "FAIL", note: "Score zelf PASS; 7 randgevallen in zinnen. LEAD: §3-voorbeeldzinnen mogen 3 zinnen zijn" },
    { round: 2, unit: "U3", verdict: "FAIL", note: "Beter dan R1 (blind), alleen absoluut niveau op telefoonspeaker te laag → R3" },
    { round: 2, unit: "U4", verdict: "FAIL", note: "Beter dan R1 (blind 3/3), maar podium niet berekend op realistische data → R3" },
    { round: 1, unit: "U2", verdict: "FAIL", note: "Leverschade te goedkoop; lithiumzinnen noemen overslaan 'nodig'. LEAD: QALY-uitleg §3 vrij van 2-zinnenregel; echt schema = 1 g 0/6/12/18 met op 12 u de toegestane route; nieuwe eis: beste >4 g < gemiste dosis" },
    { round: 1, unit: "U4", verdict: "FAIL", note: "Contrast <AA en horizontaal scrollen op 375 → gerichte fix" },
    { round: 1, unit: "U1", verdict: "PASS", note: "Blind: 0 afwijkingen casusdata; tabel gereproduceerd. Kleine fix blokkadegrens-tolerantie" },
    { round: 1, unit: "U3", verdict: "FAIL", note: "Au niet opvallend + basgeluid verdwijnt op telefoonspeaker; AudioContext bij veeg → warning" },
    { round: 0, unit: "LEAD", verdict: "PENDING", note: "Sites §6C niet bereikbaar (netwerkbeleid: 403/ENOTFOUND). Schermafbeeldingen in docs/referenties/ zijn leidend." }
  ],
  open: ["LEAD-besluit lat A3: tabel heeft hele procenten, dus tijdpercentages ±2 procentpunt; concentraties/doses ±2% relatief. Akkoord?"],
  belowBar: ["Lithium steady state in het model: 0,764–0,882 mmol/L; casusblad zegt ±0,76–0,87 (bovengrens +1,4%). Bart: bevestigen.", "Lithium piek na één dosis 3,65 u (casusblad: ±3,5 u)."]
};
