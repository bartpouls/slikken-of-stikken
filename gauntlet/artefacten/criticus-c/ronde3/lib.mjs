// Criticus C ronde 3 (overgenomen van ronde 2, nagelezen) — eigen hulpjes (raken het spel niet aan; SoS.debug wordt alleen gelezen).
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
export const { chromium } = createRequire(execSync('npm root -g').toString().trim() + '/')('playwright');
export const HIER = dirname(fileURLToPath(import.meta.url));
export const SPEL = 'file://' + join(HIER, '..', '..', '..', '..', 'index.html');
export const MATEN = [{ naam: '375x667', width: 375, height: 667 }, { naam: '390x844', width: 390, height: 844 }];

export async function open(browser, maat, fouten, query = '') {
  const ctx = await browser.newContext({ viewport: { width: maat.width, height: maat.height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') fouten.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => fouten.push('pageerror: ' + e.message));
  await page.goto(SPEL + query);
  // logboek van alles wat in de uitlegregel (#melding) en de keuzeregel (#keuze-info) verschijnt
  await page.evaluate(() => {
    window.__log = [];
    const kijk = (id) => {
      const e = document.getElementById(id); let vorig = '';
      const f = () => {
        const z = e.classList.contains('zicht') ? e.textContent : '';
        if (z !== vorig) { vorig = z; const d = window.SoS.debug; window.__log.push({ wat: id, tekst: z, klasse: e.className, klok: d.klok == null ? null : Math.round(d.klok * 100) / 100, C: d.C == null ? null : Math.round(d.C * 100) / 100, dag: d.dagteller, ts: Math.round(performance.now()) }); }
      };
      new MutationObserver(f).observe(e, { attributes: true, childList: true, subtree: true, characterData: true });
    };
    kijk('melding'); kijk('keuze-info');
  });
  return { ctx, page };
}
export async function tik(page, sel) {
  const b = await page.locator(sel).first().boundingBox();
  if (!b) throw new Error('niet zichtbaar: ' + sel);
  await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
}
export const knop = (a) => `#knoppen [data-actie="${a}"]`;
export const dbg = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.SoS.debug)));
export const wachtKlok = (page, k, timeout = 120000) => page.waitForFunction((k) => window.SoS.debug.klok >= k, k, { polling: 'raf', timeout });
export const wacht = (page, ms) => page.waitForTimeout(ms);
export const log = (page) => page.evaluate(() => window.__log.splice(0));
// toestand van keuzeregel + knoppen, letterlijk
export const regel = (page) => page.evaluate(() => {
  const e = document.getElementById('keuze-info'), m = document.getElementById('melding'), d = window.SoS.debug;
  return {
    keuze: e.classList.contains('zicht') ? e.textContent : '(leeg)', keuzeKlasse: e.className,
    knoppen: [...document.querySelectorAll('#knoppen .actie')].map((b) => b.dataset.actie + ':' + b.textContent + '[' + (b.classList.contains('gekozen') ? 'gekozen' : '-') + ',' + b.getAttribute('aria-pressed') + ',badge=' + b.getAttribute('data-badge') + (b.classList.contains('geblokkeerd') ? ',geblokkeerd' : '') + ']').join(' '),
    doel: d.poortje ? d.poortje.index + ':' + d.poortje.keuze + ':open=' + d.poortje.open : null,
    wijs: [...document.querySelectorAll('#knoppen [data-wijs]')].map((b) => b.dataset.actie).join(','),
    zin: m.classList.contains('zicht') ? m.textContent : '(geen)', klok: Math.round(d.klok * 1000) / 1000, bevroren: d.gids ? d.gids.bevroren : null
  };
});
export async function startTutorial(page, naam = 'Criticus') {
  await page.fill('[data-veld="naam"]', naam);
  await tik(page, '[data-actie="start"]');
  await page.waitForFunction(() => window.SoS.debug.fase === 'tutorial');
}
export async function startRace1(page, naam = 'Criticus') {
  await page.fill('[data-veld="naam"]', naam);
  await tik(page, '[data-actie="start-over"]');
  await page.waitForFunction(() => window.SoS.debug.fase === 'intro1');
  await wacht(page, 400);
  await tik(page, '[data-actie="start-race"]');
  await page.waitForFunction(() => window.SoS.debug.fase === 'race1');
}
