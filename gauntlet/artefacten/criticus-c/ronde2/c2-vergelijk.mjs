// C2: per tutorialstap drie momenten (voor de tik / net gekozen / na het poortje) naast hetzelfde klokmoment in
// race 1 met dezelfde keuzes (tablet uur 0, niets uur 2, spuit uur 5, tablet uur 9, zetpil uur 13).
// Legt schermafbeeldingen vast, vergelijkt DOM-plaats/stijl/tekst en telt afwijkende pixels per horizontale band.
import { chromium, MATEN, open, tik, knop, dbg, wacht, wachtKlok, startTutorial, startRace1, HIER } from './lib.mjs';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
const STAPPEN = [{ op: -0.8, knop: 'slik', poort: 0 }, { op: 1.5, knop: 'niets', poort: 2 }, { op: 4.4, knop: 'spuit', poort: 5 }, { op: 8.5, knop: 'slik', poort: 9 }, { op: 12.5, knop: 'zetpil', poort: 13 }];
const snap = (page) => page.evaluate(() => {
  const r = (e) => { const b = e.getBoundingClientRect(); return [b.x, b.y, b.width, b.height].map((v) => Math.round(v * 10) / 10).join(','); };
  const st = (e, ks) => { const c = getComputedStyle(e); return ks.map((k) => k + '=' + c[k]).join('; '); };
  const T = ['fontFamily', 'fontSize', 'fontWeight', 'color', 'letterSpacing'];
  const u = {};
  for (const [n, s, ks] of [['klok', '#klok'], ['qaly', '#qaly'], ['qaly-label', '.qaly-label'], ['qaly-getal', '#qaly-getal'], ['lever', '#lever'], ['lever-icoon', '.lever-icoon', ['color', 'width', 'height']], ['lever-tekst', '#lever-tekst'], ['lever-meter', '.lever-meter', ['backgroundColor', 'borderRadius', 'width', 'height']], ['lever-vul', '#lever-vul', ['backgroundColor']], ['lever-max', '.lever-max', ['backgroundColor', 'left']], ['patient', '#patient'], ['patient-naam', '#patient-naam'], ['patient-kop', '#patient-kop', ['width', 'height']], ['race-kop', '.race-kop', ['backgroundColor', 'padding']], ['podium', '#podium', ['backgroundColor']], ['doek', '#doek', ['backgroundColor']], ['knoppen', '#knoppen', ['gap', 'padding', 'backgroundColor']], ['knoppen-blok', '.knoppen-blok', ['backgroundColor', 'padding']], ['keuze-info', '#keuze-info', T], ['demp', '#demp', ['color', 'width', 'height']], ['scherm', '#scherm-race', ['backgroundColor', 'backgroundImage']]]) {
    const e = document.querySelector(s); u[n] = e ? { rect: r(e), stijl: st(e, ks || T), hidden: e.hidden } : 'ONTBREEKT';
  }
  u.knoppen_lijst = [...document.querySelectorAll('#knoppen .actie')].map((b) => ({ actie: b.dataset.actie, tekst: b.textContent, rect: r(b), klasse: b.className.replace(/\btik\b/, '').trim(), badge: b.getAttribute('data-badge'), stijl: st(b, ['fontFamily', 'fontSize', 'fontWeight', 'color', 'backgroundColor', 'borderRadius', 'borderTopColor', 'borderTopWidth', 'animationName', 'boxShadow', 'opacity']), icoon: b.querySelector('svg').outerHTML, icoonRect: r(b.querySelector('svg')) }));
  const m = document.querySelector('#melding'), k = document.querySelector('#keuze-info');
  u.tekst = { klok: document.querySelector('#klok').textContent, lever: document.querySelector('#lever-tekst').textContent, leverVul: document.querySelector('#lever-vul').style.width, leverKlasse: document.querySelector('#lever').className.replace(/\btel\b/, '').trim(), patient: document.querySelector('#patient').textContent, portret: document.querySelector('#patient-kop').innerHTML.length, qalyKlasse: document.querySelector('#qaly').className, keuze: k.classList.contains('zicht') ? k.textContent : '' };
  u.los = { melding: m.classList.contains('zicht') ? m.textContent : '', meldingKlasse: m.className, meldingRect: r(m), meldingStijl: st(m, T.concat(['textAlign'])), qaly: document.querySelector('#qaly-getal').textContent };
  // structuur van het racescherm (tags + id + klassen), voor "niets extra"
  u.structuur = [...document.querySelectorAll('#scherm-race *')].filter((e) => !e.closest('svg') || e.tagName.toLowerCase() === 'svg').filter((e) => !e.closest('#melding') || e.id === 'melding').map((e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.hidden ? '[hidden]' : '')).join(' ');
  const d = window.SoS.debug; u.debug = { klok: Math.round(d.klok * 100) / 100, C: Math.round(d.C * 100) / 100, dag: d.dagteller, gegeven: d.gegeven.join(',') };
  return u;
});
function verschil(a, b) {
  const uit = [];
  const loop = (x, y, pad) => {
    if (pad.startsWith('los') || pad.startsWith('debug')) return;
    if (x && typeof x === 'object') { for (const k of new Set([...Object.keys(x), ...Object.keys(y || {})])) loop(x[k], y ? y[k] : undefined, pad + '.' + k); return; }
    if (x !== y) uit.push(`${pad}: tutorial=${JSON.stringify(x)} | race=${JSON.stringify(y)}`);
  };
  loop(a, b, '');
  return uit;
}
const browser = await chromium.launch();
const rapport = [];
const P = (s) => { console.log(s); rapport.push(s); };
for (const maat of MATEN) {
  const map = `${HIER}/${maat.naam}`; mkdirSync(map, { recursive: true });
  const data = {};
  for (const soort of ['tut', 'race']) {
    const fouten = []; const { ctx, page } = await open(browser, maat, fouten);
    if (soort === 'tut') await startTutorial(page); else await startRace1(page);
    for (let i = 0; i < STAPPEN.length; i++) {
      const s = STAPPEN[i], n = i + 1;
      if (soort === 'tut') await page.waitForSelector('#knoppen [data-wijs="1"]'); else if (s.op > -0.8) await wachtKlok(page, s.op);
      await wacht(page, soort === 'tut' ? 500 : 0); // tutorial: zin volledig ingefaded
      data[`${soort}-m${n}a`] = await snap(page); await page.screenshot({ path: `${map}/c2-${soort}-m${n}a-voor.png` });
      await tik(page, knop(s.knop)); await wacht(page, 150);
      data[`${soort}-m${n}b`] = await snap(page); await page.screenshot({ path: `${map}/c2-${soort}-m${n}b-gekozen.png` });
      await wachtKlok(page, s.poort + 0.25);
      data[`${soort}-m${n}c`] = await snap(page); await page.screenshot({ path: `${map}/c2-${soort}-m${n}c-na-poortje.png` });
    }
    await wachtKlok(page, 15.5);
    data[`${soort}-m6`] = await snap(page); await page.screenshot({ path: `${map}/c2-${soort}-m6-uur15.png` });
    P(`${maat.naam} ${soort}: consolefouten ${fouten.length} ${fouten.join(' / ')}`);
    await ctx.close();
  }
  writeFileSync(`${map}/c2-dom.json`, JSON.stringify(data, null, 1));
  // pixelvergelijking in een lege pagina
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  for (const m of ['m1a', 'm1b', 'm1c', 'm2a', 'm2b', 'm2c', 'm3a', 'm3b', 'm3c', 'm4a', 'm4b', 'm4c', 'm5a', 'm5b', 'm5c', 'm6']) {
    const naam = { a: '-voor', b: '-gekozen', c: '-na-poortje' }[m[2]] || '-uur15';
    const A = data[`tut-${m}`], B = data[`race-${m}`];
    P(`\n== ${maat.naam} ${m}: tutorial klok ${A.debug.klok} C ${A.debug.C} dag ${A.debug.dag} | race klok ${B.debug.klok} C ${B.debug.C} dag ${B.debug.dag}`);
    P(`   zin tutorial: ${JSON.stringify(A.los.melding)} [${A.los.meldingKlasse}] @${A.los.meldingRect} | race: ${JSON.stringify(B.los.melding)} [${B.los.meldingKlasse}] @${B.los.meldingRect}`);
    P(`   meldingstijl gelijk: ${A.los.meldingStijl === B.los.meldingStijl} | QALY tut ${A.los.qaly} race ${B.los.qaly}`);
    const v = verschil(A, B); P(`   DOM-verschillen: ${v.length}`); v.forEach((x) => P('     ' + x.slice(0, 600)));
    const b64 = (f) => 'data:image/png;base64,' + readFileSync(f).toString('base64');
    const banden = await page.evaluate(async ([a, b]) => {
      const laad = (u) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = u; });
      const [ia, ib] = [await laad(a), await laad(b)];
      const px = (im) => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, im.width, im.height).data; };
      const da = px(ia), db = px(ib), W = ia.width, H = ia.height, uit = [];
      for (let y0 = 0; y0 < H; y0 += 40) { let n = 0, x1 = W, x2 = 0; for (let y = y0; y < Math.min(H, y0 + 40); y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 90) { n++; if (x < x1) x1 = x; if (x > x2) x2 = x; } } if (n) uit.push(`y${y0 / 2}-${y0 / 2 + 20}: ${n}px (x ${Math.round(x1 / 2)}–${Math.round(x2 / 2)})`); }
      return uit;
    }, [b64(`${map}/c2-tut-${m}${naam}.png`), b64(`${map}/c2-race-${m}${naam}.png`)]);
    P('   pixelbanden (css-px, drempel 90/765): ' + (banden.join(' ; ') || 'geen'));
  }
  await ctx.close();
}
await browser.close();
writeFileSync(`${HIER}/c2-uitvoer.txt`, rapport.join('\n'));
