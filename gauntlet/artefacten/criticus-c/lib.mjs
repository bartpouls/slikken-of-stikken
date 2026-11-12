// Criticus C — gedeelde hulpjes (eigen code van de criticus; raakt het spel niet aan).
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
export const { chromium } = createRequire(execSync('npm root -g').toString().trim() + '/')('playwright');
export const HIER = dirname(fileURLToPath(import.meta.url));
export const SPEL = 'file://' + join(HIER, '..', '..', '..', 'index.html');
export const MATEN = [{ naam: '375x667', width: 375, height: 667 }, { naam: '390x844', width: 390, height: 844 }];

export async function open(browser, maat, fouten) {
  const ctx = await browser.newContext({ viewport: { width: maat.width, height: maat.height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') fouten.push('console: ' + m.text()); });
  page.on('pageerror', (e) => fouten.push('pageerror: ' + e.message));
  await page.goto(SPEL);
  return { ctx, page };
}
export async function tik(page, sel) {
  const b = await page.locator(sel).first().boundingBox();
  if (!b) throw new Error('niet zichtbaar: ' + sel);
  await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
}
export const dbg = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.SoS.debug)));
export const wachtKlok = (page, k) => page.waitForFunction((k) => window.SoS.debug.klok >= k, k, { polling: 'raf', timeout: 120000 });

// Momentopname van alles wat §6C2 noemt, uit de DOM (plaats, tekst, lettertype, kleur).
export const snap = (page) => page.evaluate(() => {
  const r = (e) => { const b = e.getBoundingClientRect(); return [b.x, b.y, b.width, b.height].map((v) => Math.round(v * 10) / 10).join(','); };
  const st = (e, ks) => { const c = getComputedStyle(e); return ks.map((k) => k + '=' + c[k]).join('; '); };
  const T = ['fontFamily', 'fontSize', 'fontWeight', 'color'];
  const uit = {};
  const zet = (naam, sel, ks) => { const e = document.querySelector(sel); if (!e) { uit[naam] = 'ONTBREEKT'; return; } uit[naam] = { rect: r(e), stijl: st(e, ks || T), zichtbaar: !!(e.offsetWidth || e.offsetHeight) }; };
  zet('klok', '#klok'); zet('qaly-label', '.qaly-label'); zet('qaly-getal', '#qaly-getal'); zet('qaly-trend', '#qaly-trend');
  zet('lever', '#lever'); zet('lever-icoon', '.lever-icoon'); zet('lever-tekst', '#lever-tekst'); zet('lever-meter', '.lever-meter', ['backgroundColor', 'borderRadius']);
  zet('lever-max', '.lever-max', ['backgroundColor', 'left']);
  zet('patient', '#patient'); zet('patient-naam', '#patient-naam'); zet('patient-kop', '#patient-kop', ['width', 'height']);
  zet('doek', '#doek', ['backgroundColor']); zet('melding', '#melding', T.concat(['top', 'opacity'])); zet('keuze-info', '#keuze-info', T.concat(['opacity']));
  zet('knoppen', '#knoppen', ['backgroundImage', 'gap', 'padding']); zet('demp', '#demp', ['color', 'width', 'height']);
  uit.knoppen_lijst = [...document.querySelectorAll('#knoppen .actie')].map((b) => ({
    actie: b.dataset.actie, tekst: b.textContent, rect: r(b), klasse: b.className, wijs: b.dataset.wijs || '',
    stijl: st(b, ['fontFamily', 'fontSize', 'fontWeight', 'color', 'backgroundColor', 'borderRadius', 'borderTopColor', 'borderTopWidth', 'borderTopStyle', 'animationName']),
    icoon: b.querySelector('svg') ? b.querySelector('svg').outerHTML.length + ':' + b.querySelector('svg').outerHTML.slice(60, 120) : '', icoonRect: b.querySelector('svg') ? r(b.querySelector('svg')) : ''
  }));
  uit.tekst = {
    klok: document.querySelector('#klok').textContent, qaly: document.querySelector('#qaly').textContent, lever: document.querySelector('#lever').hidden ? '(verborgen)' : document.querySelector('#lever-tekst').textContent,
    leverVul: document.querySelector('#lever-vul').style.width, patient: document.querySelector('#patient').textContent,
    melding: document.querySelector('#melding').classList.contains('zicht') ? document.querySelector('#melding').textContent : '',
    meldingKlasse: document.querySelector('#melding').className,
    keuze: document.querySelector('#keuze-info').classList.contains('zicht') ? document.querySelector('#keuze-info').textContent : '',
    finish: document.querySelector('#finish').hidden ? '' : document.querySelector('#finish').innerText.replace(/\n+/g, ' | ')
  };
  return uit;
});

// Vergelijk twee momentopnamen; geeft de lijst met verschillen (strings).
export function verschil(a, b, negeer = []) {
  const uit = [];
  const loop = (x, y, pad) => {
    if (negeer.some((n) => pad.includes(n))) return;
    if (typeof x === 'object' && x && typeof y === 'object' && y) {
      for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) loop(x[k], y[k], pad + '.' + k);
    } else if (x !== y) uit.push(`${pad}: tutorial=${JSON.stringify(x)} race=${JSON.stringify(y)}`);
  };
  loop(a, b, '');
  return uit;
}
