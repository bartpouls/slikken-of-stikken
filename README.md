# Slikken of Stikken

Een farmacokinetiek-race voor de telefoon: houd de spiegel van een geneesmiddel in de goede zone door op het juiste moment te slikken. Gemaakt voor de ouderdag geneeskunde (Radboudumc, 28 november 2026).

- **Spel:** [index.html](index.html) — één zelfstandig bestand, werkt zonder internet na het laden.
- **Scorebord voor de beamer:** [scorebord.html](scorebord.html) — namen en totalen blijven alleen in die browser bewaard.
- Bouwopdracht en casusblad: [docs/bouwopdracht.md](docs/bouwopdracht.md)
- Prompt voor de bouwsessie: [docs/prompt-claude-code.md](docs/prompt-claude-code.md)
- Voortgang en beoordelingen van de bouw: [gauntlet/progress.html](gauntlet/progress.html), botsrapport in [gauntlet/artefacten/bots-rapport.md](gauntlet/artefacten/bots-rapport.md)

## Voor wie eraan bouwt

De broncode staat in `src/`; `node tools/build.mjs` voegt alles samen tot `index.html`. Tests: `node tests/model.test.mjs` (rekenmodel tegen het casusblad), `node tests/score.test.mjs` (QALY-punten en eindverslag) en `node tests/bots.mjs` (automatische spelers in een telefoonscherm, ±12 min, vraagt Playwright).

Vereenvoudigd model voor onderwijs. Geen doseeradvies.
