// Randgeval B4/B5: lange naam zonder spatie op het eindscherm (h-scroll? lettergrootte?)
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const { chromium } = createRequire(execSync('npm root -g').toString().trim() + '/')('playwright');
const hier = path.dirname(fileURLToPath(import.meta.url));
const INDEX = 'file://' + path.resolve(hier, '../../../index.html');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
for (const [w, h] of [[375, 667], [390, 844]]) for (const naam of ['WWWWWWWWWWWWWWWW', 'Mmmmmmmmmmmmmm W']) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); const fouten = [];
  page.on('console', (m) => { if (m.type() === 'error') fouten.push(m.text()); }); page.on('pageerror', (e) => fouten.push(e.message));
  await page.goto(INDEX + '?speed=30');
  const tik = async (s) => { for (let i = 0; i < 100; i++) { const p = await page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const t = document.elementFromPoint(x, y); return r.width && t && (t === e || e.contains(t)) ? { x, y } : null; }, s); if (p) { await page.touchscreen.tap(p.x, p.y); return; } await sleep(50); } throw new Error('geen tik ' + s); };
  await tik('#naam'); await page.keyboard.type(naam);
  const start = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  await tik('[data-actie="start-over"]'); await tik('[data-actie="start-race"]');
  await page.waitForFunction(() => window.SoS.debug.klaar === true, null, { timeout: 60000 }); await tik('#finish [data-actie="verder"]');
  await tik('[data-actie="start-race"]'); await page.waitForFunction(() => window.SoS.debug.fase === 'race2' && window.SoS.debug.klaar === true, null, { timeout: 60000 }); await tik('#finish [data-actie="verder"]');
  await page.waitForFunction(() => window.SoS.debug.fase === 'einde'); await sleep(900);
  const m = await page.evaluate(() => { const n = document.querySelector('[data-eind="naam"]'), t = document.querySelector('[data-eind="totaal"]'), s = document.querySelector('.scherm.actief'), de = document.documentElement; const r = n.getBoundingClientRect(); const rng = document.createRange(); rng.selectNodeContents(n); const rr = rng.getBoundingClientRect(); return { naam: n.textContent, naamPx: getComputedStyle(n).fontSize, naamRect: [r.left, r.right].map(Math.round), tekstRect: [rr.left, rr.right].map(Math.round), naamSw: n.scrollWidth, naamCw: n.clientWidth, overflow: getComputedStyle(n).overflow + '/' + getComputedStyle(n).overflowWrap + '/' + getComputedStyle(n).wordBreak, totaal: t.textContent, totaalPx: getComputedStyle(t).fontSize, doc: [de.scrollWidth, de.clientWidth], body: [document.body.scrollWidth, document.body.clientWidth], scherm: [s.scrollWidth, s.clientWidth], vw: innerWidth }; });
  await page.screenshot({ path: path.join(hier, 'schermen', `langenaam-${w}-${naam.slice(0, 4)}.png`) });
  console.log(w + '×' + h, JSON.stringify(naam), 'start', JSON.stringify(start), JSON.stringify(m), 'fouten', fouten.length);
  await ctx.close();
}
await browser.close();
