# Bouwcontract Slikken of Stikken v1 (LEAD)

Bron van alle inhoud: `docs/bouwopdracht.md` (lees helemaal). Getallen uit het casusblad (§5) letterlijk overnemen. Geen getal, drempel of medische bewering verzinnen die niet in de bron staat.

## Opleveringen (voor GitHub Pages, repo-root)
- `index.html` — het spel. Eén zelfstandig bestand: alle JS/CSS inline, geen externe bestanden, geen CDN, geen fonts van internet, geen netwerkverzoeken na het laden.
- `scorebord.html` — losse beamerpagina, ook volledig zelfstandig.

## Bronbestanden (worden door `tools/build.mjs` in `index.html` geïnlined)
- `src/model.js` — rekenmodel (§4) + casusdata (§5). Puur, geen DOM. Werkt als `<script>` (zet `window.SoS.model`) én in Node (`module.exports`).
- `src/score.js` — QALY-formule + eindverslag-gegevens. Puur, geen DOM. `window.SoS.score` / `module.exports`.
- `src/sound.js` — zelf gesynthetiseerde blips (WebAudio), dempknop-API. `window.SoS.sound`.
- `src/app.js`, `src/style.css`, `src/index.template.html` — de schermen.
- `tools/build.mjs` — `node tools/build.mjs` schrijft `index.html`.
- `tests/` — tests en bots (Node, Playwright 1.56 is globaal geïnstalleerd: `NODE_PATH=$(npm root -g)`; Chromium: `/opt/pw-browsers`, nooit `playwright install`).

Elk bronbestand documenteert zijn publieke API bovenaan in een kort commentaarblok. Latere bouwers lezen dat.

## Testhaak (alleen voor bots; geen invloed op gewoon spelen)
- `?speed=N` versnelt de spelklok N×. Zonder parameter: normale snelheid.
- `window.SoS.debug` mag alleen-lezen staat tonen (tijd, spiegel, score). Bots handelen uitsluitend via echte tikken op knoppen.

## Werkregels
- Alleen je eigen bestanden aanraken (staat in je opdracht).
- Niets kopiëren van neal.fun, ncase.me, Flappy Bird of Wordle: geen beeld, tekst, code of geluid. Alleen patronen.
- Niet committen; de LEAD commit.
