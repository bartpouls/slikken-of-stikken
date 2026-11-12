// C4: bot die ALLEEN tikt op de knop met data-wijs (en op Start / Race!), zonder ?speed. Meet de duur, legt
// per stap een schermafbeelding vast (voor C2) en logt elke zin die in beeld komt.
import { chromium, MATEN, open, tik, dbg, log, wacht, HIER } from './lib.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
const uit = {};
const browser = await chromium.launch();
for (const maat of MATEN) {
  mkdirSync(`${HIER}/${maat.naam}`, { recursive: true });
  const fouten = []; const { ctx, page } = await open(browser, maat, fouten);
  const tikken = [];
  await page.fill('[data-veld="naam"]', 'Bot');
  const t0 = Date.now();
  await tik(page, '[data-actie="start"]'); tikken.push('start');
  await page.waitForFunction(() => window.SoS.debug.fase === 'tutorial');
  let stap = 0, vorigeKlok = null;
  for (;;) {
    const d = await dbg(page);
    if (d.fase !== 'tutorial' || d.klaar) break;
    const w = await page.$('#knoppen [data-wijs="1"]');
    if (w) {
      stap++;
      const actie = await w.getAttribute('data-actie');
      await page.screenshot({ path: `${HIER}/${maat.naam}/tut-stap${stap}-voor-${actie}.png` });
      const b = await w.boundingBox();
      await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
      tikken.push(`${actie}@klok${d.klok.toFixed(2)}`);
      await wacht(page, 120);
      await page.screenshot({ path: `${HIER}/${maat.naam}/tut-stap${stap}-gekozen-${actie}.png` });
      // na het poortje: de "daarna"-zin
      const poort = d.poortje.t;
      await page.waitForFunction((p) => window.SoS.debug.klok >= p + 0.25, poort, { polling: 'raf' });
      await page.screenshot({ path: `${HIER}/${maat.naam}/tut-stap${stap}-daarna-uur${poort}.png` });
    } else await wacht(page, 30);
  }
  await page.waitForSelector('#finish:not([hidden])');
  const d = await dbg(page);
  await page.screenshot({ path: `${HIER}/${maat.naam}/tut-klaar.png` });
  const finish = await page.evaluate(() => document.querySelector('#finish').innerText.replace(/\n+/g, ' | '));
  await tik(page, '#finish [data-actie="verder"]'); tikken.push('Race!');
  await page.waitForFunction(() => window.SoS.debug.fase === 'intro1');
  const wand = (Date.now() - t0) / 1000;
  await wacht(page, 500);
  await page.screenshot({ path: `${HIER}/${maat.naam}/intro-race1.png` });
  const intro1 = await page.evaluate(() => document.querySelector('#scherm-intro .kaart').innerText);
  const scroll1 = await page.evaluate(() => { const s = document.querySelector('#scherm-intro'); return { sh: s.scrollHeight, ch: s.clientHeight, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }; });
  uit[maat.naam] = { tutorialDuur_s: d.tutorialDuur, wandklok_start_tot_intro1_s: wand, tikken, gegeven: d.gegeven, dagteller: d.dagteller, score: d.score, finish, intro1, scroll1, fouten, log: await log(page) };
  await ctx.close();
}
await browser.close();
writeFileSync(`${HIER}/c4-bot-uitkomst.json`, JSON.stringify(uit, null, 1));
for (const m of Object.keys(uit)) { const u = uit[m]; console.log(m, 'duur', u.tutorialDuur_s, 'wand', u.wandklok_start_tot_intro1_s, u.tikken.join(' '), '| gegeven', u.gegeven.join(','), '| dag', u.dagteller, '| fouten', u.fouten.length, '|', u.finish); for (const l of u.log) console.log('   ', l.wat, 'klok', l.klok, 'C', l.C, 'dag', l.dag, JSON.stringify(l.tekst), l.klasse); console.log(u.intro1, u.scroll1); }
