// Slikken of Stikken — herladen midden in het spel (voortgang bewaren, src/app.js "Voortgang bewaren").
// Draaien: node tests/herlaad.mjs [--browser=webkit|firefox]   (±1 min per browser, vraagt Playwright)
// Speelt race 1 op ?speed=25 in 375×667 en 390×844, herlaadt de pagina en controleert: knop "Verder als <naam>"
// (≥ 48 px, geen horizontaal scrollen), verder bij race 2 met dezelfde score, eindscherm na herladen gelijk,
// "Nog een keer" wist de oude stand, een stand ouder dan 12 uur, uit een andere versie of kapotte opslag wordt
// genegeerd, geen consolefouten.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const requireGlobaal = createRequire(execSync('npm root -g').toString().trim() + '/');
const pw = requireGlobaal('playwright');
const BROWSER = ((process.argv.find((a) => a.startsWith('--browser=')) || '').slice(10) || 'chromium').toLowerCase();
if (!['chromium', 'webkit', 'firefox'].includes(BROWSER)) throw new Error('onbekende --browser: ' + BROWSER);
if (!process.env.PLAYWRIGHT_BROWSERS_PATH) process.env.PLAYWRIGHT_BROWSERS_PATH = '/opt/pw-browsers';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const srv = http.createServer((q, r) => { r.setHeader('content-type','text/html; charset=utf-8'); r.end(fs.readFileSync(path.join(ROOT,'index.html'))); }).listen(0);
const ok = (c, w) => { console.log((c ? 'OK   ' : 'FOUT ') + w); if (!c) process.exitCode = 1; };
(async () => {
  const url = 'http://127.0.0.1:' + srv.address().port + '/?speed=25';
  const b = await pw[BROWSER].launch();
  console.log('Browser: ' + BROWSER);
  for (const vp of [{ width: 375, height: 667 }, { width: 390, height: 844 }]) {
    console.log('--- ' + vp.width + 'x' + vp.height);
    const ctx = await b.newContext({ viewport: vp, isMobile: BROWSER !== 'firefox', hasTouch: true, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const fouten = []; page.on('pageerror', e => fouten.push(e.message)); page.on('console', m => m.type() === 'error' && fouten.push(m.text()));
    const debug = () => page.evaluate(() => window.SoS.debug);
    const wachtFase = async (re) => { for (let i = 0; i < 400; i++) { const d = await debug(); if (re.test(d.fase)) return d; await page.waitForTimeout(100); } throw new Error('fase ' + re); };
    const speelRace = async () => {
      await page.tap('[data-actie="start-race"]');
      for (let i = 0; i < 900; i++) {
        if (await page.isVisible('#finish')) break;
        const d = await debug();
        if (d.wacht) { await page.waitForTimeout(400); await page.tap('[data-actie="wending-verder"]').catch(() => {}); }
        await page.waitForTimeout(100);
      }
      await page.tap('#finish [data-actie="verder"]');
    };
    await page.goto(url);
    ok(!(await page.isVisible('#start-verder')), 'eerste keer: geen "Verder"-knop');
    await page.fill('#naam', 'Testpil');
    await page.tap('[data-actie="start-over"]');
    await wachtFase(/^intro1$/);
    await speelRace();
    await wachtFase(/^intro2$/);
    const na1 = (await debug()).uitslag;
    // herladen midden in het spel
    await page.reload();
    ok(await page.isVisible('#start-verder'), 'na herladen: "Verder"-knop zichtbaar');
    const tekst = await page.textContent('#start-verder-knop'), stand = await page.textContent('#start-verder-stand');
    console.log('     knop: "' + tekst + '" / "' + stand + '"');
    ok(tekst === 'Verder als Testpil', 'knop noemt de naam');
    const bb = await page.locator('#start-verder-knop').boundingBox();
    ok(bb.height >= 48 && bb.width >= 48, 'knop ≥ 48 px (' + Math.round(bb.width) + '×' + Math.round(bb.height) + ')');
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'geen horizontaal scrollen');
    const startBox = await page.locator('[data-actie="start"]').boundingBox();
    ok(startBox.y + startBox.height <= vp.height, 'Start-knop nog in beeld zonder scrollen (onderkant ' + Math.round(startBox.y + startBox.height) + ')');
    await page.tap('#start-verder-knop');
    const d2 = await wachtFase(/^intro2$/);
    ok(d2.naam === 'Testpil' && JSON.stringify(d2.uitslag) === JSON.stringify(na1), 'verder bij race 2 met de score van race 1 (' + d2.uitslag + ')');
    await speelRace();
    await wachtFase(/^einde$/);
    const totaalVoor = await page.textContent('#scherm-einde');
    await page.reload();
    await page.tap('#start-verder-knop');
    await wachtFase(/^einde$/);
    const totaalNa = await page.textContent('#scherm-einde');
    ok(totaalVoor === totaalNa, 'eindscherm na herladen precies gelijk');
    // Nog een keer = nieuw spel; herladen tijdens race 1 → geen Verder meer
    await page.tap('[data-actie="opnieuw"]').catch(async () => { await page.getByText('Nog een keer').tap(); });
    await wachtFase(/^race1$/);
    await page.reload();
    ok(!(await page.isVisible('#start-verder')), 'na "Nog een keer" + herladen: geen oude stand');
    // Een echte bewaarde stand, daarna verouderd of uit een andere versie: niet aanbieden
    await page.fill('#naam', 'Versie');
    await page.tap('[data-actie="start-over"]');
    await wachtFase(/^intro1$/);
    await speelRace();
    await wachtFase(/^intro2$/);
    const echt = await page.evaluate(() => localStorage.getItem('sos.voortgang'));
    const zet = (wijzig) => page.evaluate(([e, w]) => { const x = JSON.parse(e); Object.assign(x, w); localStorage.setItem('sos.voortgang', JSON.stringify(x)); }, [echt, wijzig]);
    await zet({}); await page.reload();
    ok(await page.isVisible('#start-verder'), 'controle: de echte stand wordt wel aangeboden');
    await zet({ op: Date.now() - 13 * 3600e3 }); await page.reload();
    ok(!(await page.isVisible('#start-verder')), 'stand ouder dan 12 uur wordt niet aangeboden');
    // Start (per ongeluk) kost niets: de bewaarde stand blijft tot de eerste nieuwe race klaar is
    await zet({}); await page.reload();
    await page.fill('#naam', 'Nieuw'); await page.tap('[data-actie="start-over"]');
    await wachtFase(/^intro1$/);
    await page.reload();
    ok(await page.isVisible('#start-verder') && (await page.textContent('#start-verder-knop')) === 'Verder als Versie', 'Start zonder race af te maken: oude stand blijft beschikbaar');
    await page.fill('#naam', 'Nieuw'); await page.tap('[data-actie="start-over"]');
    await wachtFase(/^intro1$/); await speelRace(); await wachtFase(/^intro2$/);
    await page.reload();
    ok((await page.textContent('#start-verder-knop')) === 'Verder als Nieuw', 'na de eerste nieuwe race vervangt die de oude stand');
    await zet({ verslagen: [null, null, JSON.parse(echt).verslagen[0]] }); await page.reload();
    ok(!(await page.isVisible('#start-verder')), 'alleen een bonusrace bewaard: geen "Verder"-knop');
    await zet({ bouw: 'oud-123' }); await page.reload();
    ok(!(await page.isVisible('#start-verder')), 'stand uit een andere versie van het spel wordt niet aangeboden');
    await page.evaluate(() => localStorage.setItem('sos.voortgang', '{kapot'));
    await page.reload();
    ok(!(await page.isVisible('#start-verder')), 'kapotte opslag: gewoon startscherm');
    ok(fouten.length === 0, 'geen consolefouten' + (fouten.length ? ': ' + fouten.join(' | ') : ''));
    await ctx.close();
  }
  await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
