// C5: introkaartje race 2 uitlezen (beide maten) en de verschillen met race 1 in race 2 zelf vaststellen. ?speed=20 alleen om race 1 door te spoelen.
import { chromium, MATEN, open, tik, knop, dbg, wacht, regel, HIER } from './lib.mjs';
import { writeFileSync } from 'node:fs';
const uit = []; const P = (s) => { console.log(s); uit.push(s); };
const browser = await chromium.launch();
for (const maat of MATEN) {
  const fouten = []; const { ctx, page } = await open(browser, maat, fouten, '?speed=20');
  await page.fill('[data-veld="naam"]', 'Criticus'); await tik(page, '[data-actie="start-over"]');
  await page.waitForFunction(() => window.SoS.debug.fase === 'intro1'); await wacht(page, 400);
  await tik(page, '[data-actie="start-race"]');
  await page.waitForSelector('#finish:not([hidden])', { timeout: 60000 });
  await tik(page, '#finish [data-actie="verder"]');
  await page.waitForFunction(() => window.SoS.debug.fase === 'intro2'); await wacht(page, 700);
  await page.screenshot({ path: `${HIER}/${maat.naam}/c5-intro-race2.png` });
  const k = await page.evaluate(() => { const s = document.querySelector('#scherm-intro'), b = document.querySelector('[data-actie="start-race"]').getBoundingClientRect(); return { kop: document.querySelector('#intro-kop').textContent, verhaal: document.querySelector('#intro-verhaal').textContent, regels: [...document.querySelectorAll('#intro-regel li')].map((l) => l.textContent), liFont: getComputedStyle(document.querySelector('#intro-regel li')).fontSize, qaly: document.querySelector('#intro-qaly').textContent, scrollH: s.scrollHeight, clientH: s.clientHeight, knopOnder: Math.round(b.bottom), knopH: Math.round(b.height), docW: document.documentElement.scrollWidth }; });
  P(`\n### ${maat.naam} introkaartje race 2: ${k.kop}`); P('  verhaal: ' + k.verhaal); k.regels.forEach((r, i) => P(`  ${i + 1}. ${r}`));
  P(`  lettergrootte regels ${k.liFont}; scrollHeight ${k.scrollH} / clientHeight ${k.clientH}; onderkant Start-knop ${k.knopOnder} van ${maat.height}; knophoogte ${k.knopH}; paginabreedte ${k.docW}; qaly-zin: "${k.qaly}"`);
  await tik(page, '[data-actie="start-race"]'); await page.waitForFunction(() => window.SoS.debug.fase === 'race2');
  const r0 = await regel(page); const kop = await page.evaluate(() => ({ klok: document.querySelector('#klok').textContent, lever: document.querySelector('#lever').hidden, C: window.SoS.debug.C }));
  P(`  race 2 start: knoppen ${r0.knoppen} | klok "${kop.klok}" | dagteller verborgen ${kop.lever} | startspiegel ${kop.C.toFixed(3)}`);
  for (const [n, a] of [['Tablet', 'slik'], ['Tablet 2e tik', 'slik'], ['Tablet 3e tik', 'slik'], ['Overslaan', 'niets'], ['Overslaan 2e tik', 'niets'], ['Spuit', 'spuit']]) { await tik(page, knop(a)); await wacht(page, 50); const r = await regel(page); P(`  ${n}: "${r.keuze}" doel ${r.doel} zin "${r.zin}"`); }
  await page.screenshot({ path: `${HIER}/${maat.naam}/c5-race2-begin.png` });
  P(`  consolefouten ${fouten.length}`);
  await ctx.close();
}
await browser.close();
writeFileSync(`${HIER}/c5-uitvoer.txt`, uit.join('\n'));
