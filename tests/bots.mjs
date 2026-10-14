// Slikken of Stikken — automatische spelers (bots), §6B van docs/bouwopdracht.md.
// Draaien: node tests/bots.mjs            (alles: beide viewports, ±15–20 min)
//          node tests/bots.mjs --kort     (snelle proef: alleen 375×667, 3 runs, geen run op normale snelheid)
// Schrijft: gauntlet/artefacten/bots-rapport.md
//
// Werkwijze
//  - Speelt het ECHTE index.html via een lokale http-server (127.0.0.1, alleen dit bestand) in Chromium met
//    mobiele emulatie (375×667 @2x en 390×844 @3x; isMobile, hasTouch).
//  - Handelt uitsluitend via echte tikken: page.touchscreen.tap op het midden van een zichtbare knop (vooraf
//    gecontroleerd met elementFromPoint dat de tik ook echt op die knop landt). Een naam typen = tik op het
//    naamveld + toetsenbord.
//  - window.SoS.debug wordt alleen GELEZEN: welk poortje is het doel, staat het open, wat is er gekozen, de
//    spiegel (die ook naast de stip op het scherm staat) en de fase. Er wordt niets aan de spelstaat veranderd.
//  - Scores worden van het SCHERM gelezen (finish-overlay na elke race, en het eindscherm). Daarna wordt het
//    werkelijk gespeelde schema (uit het rooster op het eindscherm: data-poortje/data-soort/data-tekst)
//    nagerekend met SoS.score.scoreSchema (src/score.js in Node, dezelfde code die in index.html is geïnlined).
//  - Per poortje wordt gecontroleerd dat de keuze echt is toegepast (debug.gegeven + rooster op het eindscherm).
//    Wijkt iets af (gemist poortje), dan is de run ongeldig en wordt hij opnieuw gespeeld (max. 3 pogingen).
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import path from 'node:path';

const hier = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(hier, '..');
const RAPPORT = path.join(ROOT, 'gauntlet', 'artefacten', 'bots-rapport.md');
const requireGlobaal = createRequire(execSync('npm root -g').toString().trim() + '/');
const { chromium, devices } = requireGlobaal('playwright');
const requireLokaal = createRequire(import.meta.url);
const M = requireLokaal(path.join(ROOT, 'src', 'model.js'));
const S = requireLokaal(path.join(ROOT, 'src', 'score.js'));
if (!process.env.PLAYWRIGHT_BROWSERS_PATH) process.env.PLAYWRIGHT_BROWSERS_PATH = '/opt/pw-browsers';

const KORT = process.argv.includes('--kort');
const MAXPOG = process.argv.includes('--een') ? 1 : 3;
const SNEL = 4; // ?speed=4 voor de strategie-runs (paracetamol: 0,94 s per poortje; lithium: 0,75 s)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T0_SCRIPT = Date.now();

// ---------------------------------------------------------------------------------------------
// Lokale http-server: serveert alleen index.html (en logt elk verzoek dat binnenkomt).
// ---------------------------------------------------------------------------------------------
const HTML = readFileSync(path.join(ROOT, 'index.html'));
const HTML_SHA = (await import('node:crypto')).createHash('sha256').update(HTML).digest('hex').slice(0, 12);
const serverLog = [];
const server = http.createServer((req, res) => {
  serverLog.push({ t: Date.now(), url: req.url });
  if (req.url === '/' || req.url.startsWith('/index.html')) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(HTML);
  } else { res.writeHead(404); res.end('niet gevonden'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASIS = `http://127.0.0.1:${server.address().port}/index.html`;

// ---------------------------------------------------------------------------------------------
// Strategieën
// ---------------------------------------------------------------------------------------------
const K_PARA = Math.LN2 / 2.5; // T½ 2,5 uur (staat in de tutorial: "elke 2,5 uur is de helft weg")
const vast = (kaart) => (g) => kaart[g] || null; // kaart: {index: {route, aantal}}
const tab = { route: 'slik', aantal: 1 }, zet = { route: 'zetpil', aantal: 1 }, spu = { route: 'spuit', aantal: 1 };
const niets = { route: 'niets', aantal: 1 }, dubbel = { route: 'slik', aantal: 2 };

const PARA = {
  echt: { naam: 'echt schema (1 g om 0/6/18 slik, 12 spuit)', plan: vast({ 0: tab, 6: tab, 12: spu, 18: tab }) },
  spuit: { naam: 'spuit-variant (12 u spuit)', plan: vast({ 0: tab, 6: tab, 12: spu, 18: tab }) },
  zetpil: { naam: 'zetpil-variant (12 u zetpil)', plan: vast({ 0: tab, 6: tab, 12: zet, 18: tab }) },
  gemist: { naam: 'gemiste dosis (niets op 12 u)', plan: vast({ 0: tab, 6: tab, 18: tab }) },
  niets: { naam: 'niets (geen enkele tik)', plan: () => null },
  elkuur: { naam: 'elk uur slikken (waar het kan)', plan: (g) => (g >= 10 && g < 16 ? null : tab) },
  slimA: { naam: 'slim A: spuit 0, tablet 5, spuit 11, zetpil 16', plan: vast({ 0: spu, 5: tab, 11: spu, 16: zet }) },
  slimB: { naam: 'slim B: tablet 0, tablet 5, zetpil 10, zetpil 16', plan: vast({ 0: tab, 5: tab, 10: zet, 16: zet }) },
  greedy: {
    naam: 'greedy: doseer als spiegel over 1 u onder 5 zakt (≥3 u na vorige, max. 4 g/24 u)',
    // Besluit op klok ≥ T − 0,5 u, met de spiegel van dat moment (staat naast de stip).
    vooruit: 0.5,
    besluit(g, d, hist) {
      const proj = d.C * Math.exp(-K_PARA * 1.5);
      const laatste = hist.length ? hist[hist.length - 1] : -99;
      const in24 = hist.filter((t) => t > g - 24).length;
      if (proj < 5 && g - laatste >= 3 && in24 < 4 && (d.dagteller || 0) + 1000 <= 4000) {
        return d.poortje && d.poortje.geblokkeerd ? spu : tab;
      }
      return null;
    }
  }
};
// Lithium: poortje-index i op t = 8i; de ibuprofen begint op t = 120 (i = 15); vanaf daar n = i − 14.
const naIbuN = (i) => i - 14;
const LITH = {
  elke3: { naam: 'na de ibuprofen elke 3e overslaan', plan: (i) => (i >= 15 && naIbuN(i) % 3 === 0 ? niets : tab) },
  alles: { naam: 'alles slikken', plan: () => tab },
  niets: { naam: 'niets (elk poortje "Overslaan")', plan: () => niets },
  dubbel: { naam: 'elk poortje dubbel (2 tabletten)', plan: () => dubbel },
  greedy: {
    naam: 'spiegelwacht: tablet als spiegel 3 u vóór het poortje < 0,85',
    vooruit: 3,
    besluit(g, d) { return d.C < 0.85 ? tab : niets; }
  },
  elke4: { naam: 'slim: na de ibuprofen elke 4e overslaan', plan: (i) => (i >= 15 && naIbuN(i) % 4 === 0 ? niets : tab) }
};

// Runs per viewport: elke run = start → tutorial → race 1 (paracetamol) → race 2 (lithium) → eindscherm.
// tut: 'vol' (alle stappen zelf doen) of 'over' (Overslaan). naam: null = niets typen (leeg veld).
const RUNS = [
  { id: 'r01', P: 'echt', L: 'elke3', tut: 'vol', naam: 'Bot Echt' },
  { id: 'r02', P: 'spuit', L: 'alles', tut: 'over', naam: null },
  { id: 'r03', P: 'zetpil', L: 'niets', tut: 'vol', naam: 'Zetpilbot' },
  { id: 'r04', P: 'gemist', L: 'dubbel', tut: 'over', naam: 'Gemist' },
  { id: 'r05', P: 'niets', L: 'greedy', tut: 'vol', naam: 'Nul' },
  { id: 'r06', P: 'elkuur', L: 'elke4', tut: 'over', naam: 'Elk uur' },
  { id: 'r07', P: 'slimA', L: 'elke3', tut: 'vol', naam: 'Slim A' },
  { id: 'r08', P: 'slimB', L: 'alles', tut: 'over', naam: 'Slim B' },
  { id: 'r09', P: 'greedy', L: 'dubbel', tut: 'vol', naam: 'Gretig' },
  { id: 'r10', P: 'echt', L: 'elke3', tut: 'over', naam: 'Bot Echt', herhaling: 'r01' },
  // normale snelheid (geen ?speed): raceduur met de klok; daarna "Nog een keer"
  { id: 'n01', P: 'echt', L: 'elke3', tut: 'vol', naam: 'Pilpiraat Zestig', normaal: true, opnieuw: true, herhaling: 'r01' }
];
const RUNS_KORT = [RUNS[0], RUNS[3], RUNS[5]];

const VIEWPORTS = [
  { naam: '375×667', viewport: { width: 375, height: 667 }, deviceScaleFactor: 2 },
  { naam: '390×844', viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 }
];

// ---------------------------------------------------------------------------------------------
// Helpers in de pagina (alleen lezen)
// ---------------------------------------------------------------------------------------------
async function debug(page) {
  return page.evaluate(() => {
    const d = window.SoS && window.SoS.debug;
    return d ? JSON.parse(JSON.stringify(d)) : null;
  });
}

// B4: alle zichtbare knoppen ≥ 48×48 en geen horizontaal scrollen, op het scherm van dit moment.
async function meetScherm(page) {
  return page.evaluate(() => {
    const actief = document.querySelector('.scherm.actief');
    const sel = 'button, [role="button"], a[href], input[type="submit"], input[type="button"]';
    const knoppen = [...document.querySelectorAll(sel)].filter((b) => {
      const r = b.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return false;
      return b.checkVisibility ? b.checkVisibility({ opacityProperty: true, visibilityProperty: true }) : true;
    }).map((b) => {
      const r = b.getBoundingClientRect();
      const label = b.getAttribute('data-actie') || b.getAttribute('data-tut') || b.id ||
        (b.className && String(b.className).split(' ')[0]) || b.tagName.toLowerCase();
      const tekst = (b.getAttribute('aria-label') || b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 24);
      return { label, tekst, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 };
    });
    const de = document.documentElement;
    return {
      scherm: actief ? actief.id : null,
      fase: window.SoS && window.SoS.debug ? window.SoS.debug.fase : null,
      stap: (document.querySelector('.tut-binnen') || { getAttribute: () => null }).getAttribute('data-stap'),
      knoppen,
      scroll: {
        doc: [de.scrollWidth, de.clientWidth],
        body: [document.body.scrollWidth, document.body.clientWidth],
        scherm: actief ? [actief.scrollWidth, actief.clientWidth] : null
      }
    };
  });
}

// Echte tik op het midden van een zichtbare knop; controleert eerst dat de tik op die knop landt.
async function tik(page, run, selector, opties = {}) {
  const loc = page.locator(selector).first();
  let doos = await loc.boundingBox();
  if (!doos) throw new Error('knop niet zichtbaar: ' + selector);
  const vp = page.viewportSize();
  if (doos.y < 0 || doos.y + doos.height > vp.height || doos.x < 0 || doos.x + doos.width > vp.width) {
    // buiten beeld: scrollen (geen tik; wel genoteerd)
    run.scrolls.push({ selector, fase: run.faseNu });
    await loc.scrollIntoViewIfNeeded();
    doos = await loc.boundingBox();
  }
  let x = doos.x + doos.width / 2, y = doos.y + doos.height / 2;
  if (!opties.snel) {
    // Wacht (max. 2 s) tot de tik echt op deze knop landt: tijdens een schermovergang (0,35 s) ligt het
    // oude scherm er nog boven.
    const t0 = Date.now();
    let raak = false;
    while (Date.now() - t0 < 2000) {
      raak = await page.evaluate(([s, x, y]) => {
        const el = document.querySelector(s), hit = document.elementFromPoint(x, y);
        return !!(el && hit && (el === hit || el.contains(hit)));
      }, [selector, x, y]);
      if (raak) break;
      await sleep(50);
      const d2 = await loc.boundingBox();
      if (d2) { x = d2.x + d2.width / 2; y = d2.y + d2.height / 2; }
    }
    if (!raak) run.bedekt.push({ selector, fase: run.faseNu });
    if (Date.now() - t0 > 600) run.wachtOpRaak.push({ selector, fase: run.faseNu, ms: Date.now() - t0 });
  }
  await page.touchscreen.tap(x, y);
  run.tikken++;
  run.tikLog.push(selector);
}

function getalVanScherm(s) {
  // "−1.234" -> -1234 ; "768" -> 768
  const t = String(s).trim().replace(/[−–]/g, '-').replace(/\./g, '').replace(',', '.');
  const n = Number(t);
  if (!isFinite(n)) throw new Error('geen getal op het scherm: ' + s);
  return n;
}

async function wachtOp(page, fn, arg, timeout = 30000) {
  return page.waitForFunction(fn, arg, { timeout, polling: 30 });
}

// ---------------------------------------------------------------------------------------------
// Tutorial
// ---------------------------------------------------------------------------------------------
async function speelTutorial(page, run) {
  run.faseNu = 'tutorial';
  const gezien = new Set();
  if (run.cfg.tut === 'over') {
    await wachtOp(page, () => !!document.querySelector('[data-tut="overslaan"]'));
    run.metingen.push(await meetScherm(page));
    await tik(page, run, '[data-tut="overslaan"]');
    await wachtOp(page, () => window.SoS.debug.fase === 'intro1');
    return;
  }
  const einde = Date.now() + (run.cfg.normaal ? 240000 : 90000);
  while (Date.now() < einde) {
    const s = await page.evaluate(() => {
      const b = document.querySelector('.tut-binnen');
      const fase = window.SoS.debug.fase;
      if (!b || fase !== 'tutorial') return { fase };
      const vol = b.querySelector('.tut-volgende');
      const verder = b.querySelector('[data-actie="verder"]');
      const acties = [...b.querySelectorAll('.tut-actie')].filter((x) => !x.disabled).map((x) => x.getAttribute('data-tut'));
      return {
        fase, stap: b.getAttribute('data-stap'), tfase: b.getAttribute('data-fase'),
        volgende: !!(vol && vol.classList.contains('zicht') && !vol.disabled && !vol.hidden),
        verder: !!verder, acties
      };
    });
    if (s.fase !== 'tutorial') break;
    const sleutel = s.stap + (s.volgende ? 'v' : '') + (s.verder ? 'r' : '');
    if (!gezien.has(sleutel)) { gezien.add(sleutel); run.metingen.push(await meetScherm(page)); }
    if (s.verder) {
      await sleep(450); // de knop negeert tikken in de eerste 350 ms (echte tijd)
      await tik(page, run, '.tut-binnen [data-actie="verder"]');
      await sleep(150);
    } else if (s.volgende) {
      await sleep(250); // overgang van 0,2 s
      await tik(page, run, '.tut-binnen .tut-volgende');
      await sleep(150);
    } else if (s.tfase === 'wacht' && s.acties.length) {
      if (run.eersteHandeling == null) run.eersteHandeling = run.tikken + 1;
      await tik(page, run, `.tut-binnen .tut-actie[data-tut="${s.acties[0]}"]`);
      run.tutActies.push(s.stap + ':' + s.acties[0]);
      await sleep(100);
    } else {
      await sleep(60);
    }
  }
  await wachtOp(page, () => window.SoS.debug.fase === 'intro1');
}

// ---------------------------------------------------------------------------------------------
// Race
// ---------------------------------------------------------------------------------------------
async function speelRace(page, run, nr) {
  const casus = nr === 0 ? 'paracetamol' : 'lithium';
  const strat = nr === 0 ? PARA[run.cfg.P] : LITH[run.cfg.L];
  const interval = casus === 'paracetamol' ? 1 : 8;
  const n = casus === 'paracetamol' ? 24 : 30;
  const speed = run.speed;
  // Veiligheidsmarge: niet meer tikken vlak vóór het poortje (dan kan de tik net na het poortje vallen).
  const marge = interval * 0.12;
  const besluit = {};
  const hist = []; // gegeven toedieningen (poortje-index) voor de greedy-bot
  const uit = { casus, strategie: strat.naam, maxC: 0, leverZichtbaar: null, tikkenRace: 0, metingen: 0 };
  const secPerUur = casus === 'paracetamol' ? 90 / 24 : 90 / 240;
  const limiet = Date.now() + ((24 * (casus === 'paracetamol' ? 1 : 10)) * secPerUur / speed + 3 / speed + 40) * 1000;
  const tikkenVoor = run.tikken;
  let gemeten = new Set();
  let laatsteG = -1;
  while (true) {
    if (Date.now() > limiet) throw new Error('race duurt te lang (' + casus + ')');
    const d = await debug(page);
    if (!d || d.fase !== 'race' + (nr + 1)) { await sleep(20); continue; }
    if (d.C > uit.maxC) uit.maxC = d.C;
    if (d.klaar) break;
    // leverschade zichtbaar op het scherm (levermeter "vol")
    if (casus === 'paracetamol' && d.dagteller > 4000 && uit.leverZichtbaar == null) {
      uit.leverZichtbaar = await page.evaluate(() => {
        const l = document.getElementById('lever');
        return { vol: l.classList.contains('vol'), zichtbaar: !l.hidden && l.checkVisibility(), tekst: document.getElementById('lever-tekst').textContent };
      });
    }
    const p = d.poortje;
    if (p) {
      const g = p.index;
      if (g !== laatsteG) {
        // net een poortje gepasseerd: bijhouden wat er gegeven is (greedy) en af en toe het scherm meten
        laatsteG = g;
        hist.length = 0;
        d.gegeven.forEach((x, i) => { if (x && x !== 'leeg' && x !== 'niets' && x !== 'geblokkeerd') hist.push(i); });
        const meetMoment = casus === 'paracetamol' ? [1, 11, 20] : [2, 16, 27];
        if (meetMoment.includes(g) && !gemeten.has(g)) { gemeten.add(g); run.metingen.push(await meetScherm(page)); uit.metingen++; }
      }
      if (!(g in besluit)) {
        if (strat.besluit) {
          if (d.klok >= p.t - strat.vooruit) besluit[g] = strat.besluit(g, d, hist);
        } else besluit[g] = strat.plan(g);
      }
      const wil = besluit[g];
      if (wil && p.open && d.klok < p.t - marge) {
        const goed = p.keuze === wil.route && p.aantal === wil.aantal;
        if (!goed) {
          const sel = `#knoppen [data-actie="${wil.route}"]`;
          await tik(page, run, sel, { snel: true });
          continue;
        }
      }
    }
    await sleep(12);
  }
  uit.tikkenRace = run.tikken - tikkenVoor;
  // Finish-overlay: score van het scherm
  await wachtOp(page, () => !document.getElementById('finish').hidden);
  await sleep(200);
  run.metingen.push(await meetScherm(page));
  const d = await debug(page);
  uit.gegeven = d.gegeven.slice();
  uit.finishScherm = getalVanScherm(await page.locator('#finish-getal').textContent());
  // Verwacht per poortje (uit het plan van de bot)
  uit.verwacht = [];
  for (let g = 0; g < n; g++) {
    const w = besluit[g];
    uit.verwacht.push(!w ? 'leeg' : (w.route + (w.aantal > 1 ? '×' + w.aantal : '')));
  }
  uit.besluit = besluit;
  uit.afwijkingen = [];
  for (let g = 0; g < n; g++) {
    const kreeg = uit.gegeven[g] || 'leeg';
    if (kreeg !== uit.verwacht[g]) uit.afwijkingen.push(`poortje ${g}: wilde ${uit.verwacht[g]}, kreeg ${kreeg}`);
  }
  return uit;
}

// ---------------------------------------------------------------------------------------------
// Eindscherm uitlezen
// ---------------------------------------------------------------------------------------------
async function leesEinde(page) {
  return page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const fs = (s) => { const e = q(s); return e ? parseFloat(getComputedStyle(e).fontSize) : null; };
    const rooster = (i) => [...document.querySelectorAll(`[data-verslag="${i}"] [data-poortje]`)].map((e) => ({
      index: +e.getAttribute('data-poortje'), soort: e.getAttribute('data-soort'), tekst: e.getAttribute('data-tekst')
    }));
    const regels = (i) => Object.fromEntries([...document.querySelectorAll(`[data-verslag="${i}"] [data-regel]`)]
      .map((r) => [r.getAttribute('data-regel'), r.querySelector('td').textContent.trim()]));
    const dag = q('[data-verslag="0"] [data-tel="dagteller"]');
    return {
      naam: q('[data-eind="naam"]').textContent,
      totaal: q('[data-eind="totaal"]').textContent,
      race0: q('[data-eind="race-0"]').textContent,
      race1: q('[data-eind="race-1"]').textContent,
      fsNaam: fs('[data-eind="naam"]'), fsTotaal: fs('[data-eind="totaal"]'),
      rooster: [rooster(0), rooster(1)],
      regels: [regels(0), regels(1)],
      dagteller: dag ? { over: dag.classList.contains('over'), tekst: [...dag.children].map((c) => c.textContent.trim()).join(' ').replace(/\s+/g, ' ') } : null,
      praktijk: [...document.querySelectorAll('[data-zin="praktijk"]')].map((e) => e.textContent.trim()),
      vraag: (q('[data-eind="vraag"]') || {}).textContent || null
    };
  });
}

function schemaVanRooster(rooster, casus) {
  const tijden = M.poortjes(casus);
  const sch = [];
  for (const r of rooster) {
    const t = tijden[r.index];
    if (r.soort === 'tablet') {
      const m = /^(\d+) tabletten/.exec(r.tekst || '');
      sch.push({ t, route: 'slik', aantal: m ? +m[1] : 1 });
    } else if (r.soort === 'zetpil' || r.soort === 'spuit') sch.push({ t, route: r.soort });
  }
  return sch;
}
const roosterVerwacht = (v) => (v === 'leeg' || v === 'niets' ? 'overgeslagen' : v.startsWith('slik') ? 'tablet' : v);

// ---------------------------------------------------------------------------------------------
// Eén run
// ---------------------------------------------------------------------------------------------
async function speelRun(browser, vp, cfg, poging) {
  const speed = cfg.normaal ? 1 : SNEL;
  const ctx = await browser.newContext({
    viewport: vp.viewport, deviceScaleFactor: vp.deviceScaleFactor, isMobile: true, hasTouch: true,
    userAgent: devices['Pixel 5'].userAgent, locale: 'nl-NL'
  });
  const page = await ctx.newPage();
  const run = {
    cfg, vp: vp.naam, poging, speed, tikken: 0, tikLog: [], scrolls: [], bedekt: [], wachtOpRaak: [], metingen: [], tutActies: [],
    console: [], verzoeken: [], eersteHandeling: null, faseNu: 'laden', races: [], start: Date.now()
  };
  let geladen = false;
  try { return await speelRunBinnen(page, ctx, run, cfg, vp, speed, () => { geladen = true; }); }
  catch (e) { await ctx.close().catch(() => {}); throw new Error('[' + run.faseNu + '] ' + (e && e.message || e).split('\n')[0] + ' | tikken: ' + run.tikLog.slice(-4).join(' , ')); }
}

async function speelRunBinnen(page, ctx, run, cfg, vp, speed, zetGeladen) {
  let geladen = false;
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') run.console.push({ type: m.type(), tekst: m.text(), fase: run.faseNu }); });
  page.on('pageerror', (e) => run.console.push({ type: 'pageerror', tekst: String(e), fase: run.faseNu }));
  page.on('request', (r) => run.verzoeken.push({ url: r.url().slice(0, 120), naLaden: geladen, fase: run.faseNu }));
  const url = BASIS + (cfg.normaal ? '' : `?speed=${speed}`);
  await page.goto(url, { waitUntil: 'load' });
  geladen = true; zetGeladen();
  run.faseNu = 'start';
  await wachtOp(page, () => window.SoS && window.SoS.debug && window.SoS.debug.fase === 'start');
  run.metingen.push(await meetScherm(page));

  // Start: naam (tik op het veld + typen) en Start
  if (cfg.naam) {
    await tik(page, run, '[data-veld="naam"]');
    await page.keyboard.type(cfg.naam, { delay: 10 });
  }
  await tik(page, run, '[data-actie="start"]');
  run.tikkenNaStart = run.tikken;
  await wachtOp(page, () => window.SoS.debug.fase === 'tutorial');
  await speelTutorial(page, run);
  run.tutorialTikken = run.tikken - run.tikkenNaStart;

  for (let nr = 0; nr < 2; nr++) {
    run.faseNu = 'intro' + (nr + 1);
    await wachtOp(page, (f) => window.SoS.debug.fase === f, 'intro' + (nr + 1));
    await sleep(150);
    run.metingen.push(await meetScherm(page));
    await tik(page, run, '[data-actie="start-race"]');
    const tStart = Date.now();
    if (nr === 0) run.tikkenTotRace1 = run.tikken;
    run.faseNu = 'race' + (nr + 1);
    await wachtOp(page, (f) => window.SoS.debug.fase === f, 'race' + (nr + 1));
    const r = await speelRace(page, run, nr);
    r.duurKlok = (Date.now() - tStart) / 1000; // tik "Start race" → finish-overlay (incl. ±40 ms bot-latentie)
    const dbg = await debug(page);
    r.duurSpel = dbg.duren[nr];
    run.races.push(r);
    run.faseNu = 'finish' + (nr + 1);
    await tik(page, run, '#finish [data-actie="verder"]');
  }
  run.faseNu = 'einde';
  await wachtOp(page, () => window.SoS.debug.fase === 'einde' && !!document.querySelector('[data-eind="totaal"]'));
  await sleep(300);
  run.metingen.push(await meetScherm(page));
  // ook onderaan het eindscherm meten (verslagen + "Nog een keer")
  await page.evaluate(() => { const s = document.querySelector('.scherm.actief'); s.scrollTop = s.scrollHeight; });
  await sleep(200);
  run.metingen.push(await meetScherm(page));
  await page.evaluate(() => { const s = document.querySelector('.scherm.actief'); s.scrollTop = 0; });
  run.einde = await leesEinde(page);

  // Nagerekend tegen SoS.score.scoreSchema voor het werkelijk gespeelde schema (rooster op het scherm)
  const casussen = ['paracetamol', 'lithium'];
  run.races.forEach((r, i) => {
    r.scherm = getalVanScherm(i === 0 ? run.einde.race0 : run.einde.race1);
    r.schema = schemaVanRooster(run.einde.rooster[i], casussen[i]);
    const ss = S.scoreSchema(casussen[i], r.schema);
    r.scoreSchema = ss.stand.totaal;
    r.uren = ss.verslag.uren;
    r.lever = ss.verslag.lever || null;
    r.regels = run.einde.regels[i];
    // rooster op het eindscherm tegen het plan van de bot
    run.einde.rooster[i].forEach((c) => {
      const v = r.verwacht[c.index];
      if (roosterVerwacht(v) !== c.soort) r.afwijkingen.push(`rooster ${c.index}: wilde ${v}, scherm ${c.soort}`);
      if (v.endsWith('×2') && !/^2 tabletten/.test(c.tekst || '')) r.afwijkingen.push(`rooster ${c.index}: geen "2 tabletten"`);
    });
  });
  run.totaalScherm = getalVanScherm(run.einde.totaal);

  // "Nog een keer": één tik, daarna moet race 1 lopen met dezelfde naam
  if (cfg.opnieuw) {
    run.faseNu = 'opnieuw';
    const naamVoor = (await debug(page)).naam;
    const tikVoor = run.tikken;
    await tik(page, run, '[data-actie="opnieuw"]');
    const t0 = Date.now();
    await wachtOp(page, () => window.SoS.debug.fase === 'race1', undefined, 5000).catch(() => null);
    const d1 = await debug(page);
    await sleep(1500);
    const d2 = await debug(page);
    run.opnieuwUitslag = {
      tikken: run.tikken - tikVoor,
      fase: d2.fase, naamVoor, naamNa: d2.naam,
      klokLoopt: d2.klok > d1.klok, klok1: d1.klok, klok2: d2.klok,
      scherm: await page.evaluate(() => (document.querySelector('.scherm.actief') || {}).id),
      ms: Date.now() - t0
    };
    run.metingen.push(await meetScherm(page));
  }
  run.duur = (Date.now() - run.start) / 1000;
  run.afwijkingen = run.races.flatMap((r) => r.afwijkingen.map((a) => r.casus + ' ' + a));
  run.geldig = run.afwijkingen.length === 0;
  await ctx.close();
  return run;
}

async function speelViewport(vp, runs) {
  const browser = await chromium.launch({ headless: true });
  const uit = [];
  try {
    for (const cfg of runs) {
      let run = null;
      const pogingen = [];
      for (let poging = 1; poging <= MAXPOG; poging++) {
        try {
          run = await speelRun(browser, vp, cfg, poging);
        } catch (e) {
          run = { cfg, vp: vp.naam, poging, fout: String(e && e.stack || e), geldig: false, afwijkingen: ['fout: ' + String(e && e.message || e)] };
        }
        pogingen.push({ poging, geldig: run.geldig, afwijkingen: run.afwijkingen });
        const korte = run.races ? run.races.map((r) => r.scherm).join(' / ') : '-';
        console.log(`[${vp.naam}] ${cfg.id} ${cfg.P}+${cfg.L} poging ${poging}: ${run.geldig ? 'geldig' : 'ONGELDIG'} scores ${korte} ` +
          `totaal ${run.totaalScherm} (${run.duur ? run.duur.toFixed(0) + ' s' : '-'})` + (run.geldig ? '' : ' ' + (run.afwijkingen || []).slice(0, 3).join('; ')));
        if (run.geldig) break;
      }
      run.pogingen = pogingen;
      uit.push(run);
    }
  } finally {
    await browser.close();
  }
  return uit;
}

// ---------------------------------------------------------------------------------------------
// Draaien
// ---------------------------------------------------------------------------------------------
const ALLEEN = (process.argv.find((a) => a.startsWith('--run=')) || '').slice(6).split(',').filter(Boolean);
const runsTeDoen = ALLEEN.length ? RUNS.filter((r) => ALLEEN.includes(r.id)) : (KORT ? RUNS_KORT : RUNS);
const vps = KORT || ALLEEN.length ? [VIEWPORTS[0]] : VIEWPORTS;
const resultaten = await Promise.all(vps.map((vp) => speelViewport(vp, runsTeDoen)));
server.close();
const looptijd = (Date.now() - T0_SCRIPT) / 1000;

// ---------------------------------------------------------------------------------------------
// Rapport
// ---------------------------------------------------------------------------------------------
const nl = (x, d = 0) => (x == null || !isFinite(x) ? '–' : x.toFixed(d).replace('.', ','));
const jn = (b) => (b ? '**gehaald**' : '**niet gehaald**');
const L = [];
L.push('# Bots-rapport §6B — Slikken of Stikken');
L.push('');
L.push(`Gegenereerd door \`node tests/bots.mjs\`${KORT ? ' --kort' : ''} op ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC. ` +
  `Looptijd: ${nl(looptijd / 60, 1)} min. Playwright ${requireGlobaal('playwright/package.json').version}, Chromium headless (/opt/pw-browsers). index.html: ${(HTML.length / 1024).toFixed(1)} kB, sha256 ${HTML_SHA}… (één keer ingelezen bij de start; alle runs spelen dezelfde build).`);
L.push('');
L.push('**Opzet.** Het echte `index.html` (lokale http-server op 127.0.0.1) in mobiele emulatie (isMobile, hasTouch, ' +
  'Pixel-5-UA): 375×667 @2x en 390×844 @3x. De bots handelen alleen via `page.touchscreen.tap` op het midden van een zichtbare ' +
  'knop (vooraf met `elementFromPoint` gecontroleerd). `SoS.debug` wordt alleen gelezen (doelpoortje, open/te laat, gekozen keuze, ' +
  'spiegel, fase). Scores komen van het scherm (finish-overlay en eindscherm); daarna wordt het gespeelde schema uit het rooster ' +
  `op het eindscherm nagerekend met \`SoS.score.scoreSchema\` (src/score.js, identiek aan de inline code). Strategie-runs op \`?speed=${SNEL}\`; ` +
  'run n01 op normale snelheid (geen parameter). Elke run: start → tutorial (vol of "Overslaan") → race 1 → race 2 → eindscherm. ' +
  'Een run is geldig als elk poortje precies de keuze van de bot kreeg (debug.gegeven én rooster op het eindscherm); anders opnieuw (max. 3 pogingen).');
L.push('');

const samenvatting = [];
const alleConsole = [];
const alleNaLaden = [];
resultaten.forEach((runs, vi) => {
  const vp = vps[vi];
  L.push(`## Viewport ${vp.naam}`);
  L.push('');
  L.push('| run | paracetamol-strategie | lithium-strategie | tutorial | snelheid | race 1 (scherm) | race 1 scoreSchema | race 2 (scherm) | race 2 scoreSchema | totaal (scherm) | geldig (pogingen) |');
  L.push('|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of runs) {
    if (!r.races || r.races.length < 2) {
      L.push(`| ${r.cfg.id} | ${PARA[r.cfg.P].naam} | ${LITH[r.cfg.L].naam} | ${r.cfg.tut} | – | – | – | – | – | – | nee: ${(r.afwijkingen || []).join('; ').slice(0, 200)} |`);
      continue;
    }
    const [a, b] = r.races;
    L.push(`| ${r.cfg.id} | ${PARA[r.cfg.P].naam} | ${LITH[r.cfg.L].naam} | ${r.cfg.tut === 'vol' ? 'vol' : 'Overslaan'} | ${r.cfg.normaal ? 'normaal (1×)' : SNEL + '×'} | ` +
      `${a.scherm} | ${a.scoreSchema}${a.scoreSchema === a.scherm ? '' : ' (Δ ' + (a.scherm - a.scoreSchema) + ')'} | ${b.scherm} | ${b.scoreSchema}${b.scoreSchema === b.scherm ? '' : ' (Δ ' + (b.scherm - b.scoreSchema) + ')'} | ` +
      `${r.totaalScherm} | ${r.geldig ? 'ja' : 'NEE'} (${r.pogingen.length}) |`);
  }
  L.push('');
  const geldig = runs.filter((r) => r.geldig && r.races && r.races.length === 2);
  const p1 = (k) => { const r = geldig.find((x) => x.cfg.P === k && !x.cfg.normaal); return r ? r.races[0] : null; };
  const l1 = (k) => { const r = geldig.find((x) => x.cfg.L === k && !x.cfg.normaal); return r ? r.races[1] : null; };
  const sc = (x) => (x ? x.scherm : NaN);

  // Extra controles per run
  const finishGelijk = geldig.every((r) => r.races.every((x) => x.finishScherm === x.scherm));
  const schemaGelijk = geldig.every((r) => r.races.every((x) => x.scoreSchema === x.scherm));
  const totaalGelijk = geldig.every((r) => r.totaalScherm === r.races[0].scherm + r.races[1].scherm);
  const naamGelijk = geldig.every((r) => !r.cfg.naam || r.einde.naam === r.cfg.naam);
  L.push(`Controles: finish-overlay = eindscherm per race: ${finishGelijk ? 'ja' : 'NEE'}; scherm = scoreSchema: ${schemaGelijk ? 'ja (alle runs, Δ 0)' : 'NEE'}; ` +
    `totaal = race 1 + race 2: ${totaalGelijk ? 'ja' : 'NEE'}; getypte naam op eindscherm: ${naamGelijk ? 'ja' : 'NEE'}.`);
  L.push('');

  // ---------------- B1
  const echt = p1('echt'), spuit = p1('spuit'), zetp = p1('zetpil'), gem = p1('gemist'), nts = p1('niets'), elk = p1('elkuur');
  const paraAlle = geldig.map((r) => ({ id: r.cfg.id, k: r.cfg.P, s: r.races[0].scherm }));
  const hoogste = paraAlle.reduce((m, x) => (x.s > m.s ? x : m), { s: -Infinity });
  const elkRun = geldig.find((x) => x.cfg.P === 'elkuur');
  const leverScherm = elkRun ? {
    race: elk.leverZichtbaar,
    einde: elkRun.einde.dagteller,
    regel: elkRun.einde.regels[0].giftig
  } : null;
  const leverOk = !!(leverScherm && leverScherm.race && leverScherm.race.vol && leverScherm.race.zichtbaar &&
    leverScherm.einde && leverScherm.einde.over && /Lever beschadigd/.test(leverScherm.einde.tekst));
  const b1a = sc(echt) === sc(spuit) && sc(spuit) >= sc(zetp) && sc(zetp) > sc(gem) && sc(gem) > sc(nts);
  const b1b = leverOk && sc(elk) < sc(echt);
  const pct = 100 * sc(echt) / hoogste.s;
  const b1c = pct >= 80;
  const B1 = b1a && b1b && b1c;
  L.push('### B1 Paracetamol');
  L.push('');
  L.push('| strategie | race 1 (scherm) | tijd in zone (u, scoreSchema) | totale dosis | lever |');
  L.push('|---|---|---|---|---|');
  for (const k of Object.keys(PARA)) {
    const x = p1(k);
    if (!x) { L.push(`| ${PARA[k].naam} | – | – | – | – |`); continue; }
    const dosis = x.schema.length + ' g';
    L.push(`| ${PARA[k].naam} | ${x.scherm} | ${nl(x.uren.zone, 2)} van 24 (${nl(100 * x.uren.zone / 24, 1)}%) | ${dosis} | ${x.lever && x.lever.beschadigd ? 'beschadigd (' + x.lever.punten + ')' : 'heel'} |`);
  }
  L.push('');
  L.push(`- echt (${sc(echt)}) = spuit-variant (${sc(spuit)}) ≥ zetpil-variant (${sc(zetp)}) > gemist (${sc(gem)}) > niets (${sc(nts)}): ${jn(b1a)}`);
  L.push(`- elk uur slikken: leverschade zichtbaar op het scherm — tijdens de race levermeter ${leverScherm && leverScherm.race ? `class "vol"=${leverScherm.race.vol}, zichtbaar=${leverScherm.race.zichtbaar}, tekst "${leverScherm.race.tekst}"` : '–'}; ` +
    `eindscherm dagteller "${leverScherm && leverScherm.einde ? leverScherm.einde.tekst : '–'}" (over=${leverScherm && leverScherm.einde ? leverScherm.einde.over : '–'}), regel "lever / giftig" ${leverScherm ? leverScherm.regel : '–'}; ` +
    `score ${sc(elk)} < echt ${sc(echt)}: ${jn(b1b)}`);
  L.push(`- hoogste botscore race 1: ${hoogste.s} (${hoogste.id}, ${PARA[hoogste.k] ? PARA[hoogste.k].naam : ''}); echt = ${sc(echt)} = ${nl(pct, 1)}% (≥ 80%): ${jn(b1c)}`);
  L.push(`- **B1 ${vp.naam}: ${B1 ? 'gehaald' : 'niet gehaald'}**`);
  L.push('');

  // ---------------- B2
  const e3 = l1('elke3'), al = l1('alles'), ln = l1('niets'), db = l1('dubbel');
  const lithAlle = geldig.map((r) => ({ id: r.cfg.id, k: r.cfg.L, s: r.races[1].scherm }));
  const laagste = lithAlle.reduce((m, x) => (x.s < m.s ? x : m), { s: Infinity });
  const b2a = sc(e3) > sc(al) && sc(al) > sc(ln);
  const dbRun = geldig.find((x) => x.cfg.L === 'dubbel');
  const b2b = !!(db && db.maxC > 1.5 && db.uren.toxisch > 0 && laagste.k === 'dubbel' && lithAlle.filter((x) => x.k !== 'dubbel').every((x) => x.s > sc(db)));
  const B2 = b2a && b2b;
  L.push('### B2 Lithium');
  L.push('');
  L.push('| strategie | race 2 (scherm) | in zone (u) | > 1,0 (u) | > 1,5 (u) | max. spiegel gezien | regel "lever / giftig" (scherm) |');
  L.push('|---|---|---|---|---|---|---|');
  for (const k of Object.keys(LITH)) {
    const x = l1(k);
    if (!x) { L.push(`| ${LITH[k].naam} | – | – | – | – | – | – |`); continue; }
    L.push(`| ${LITH[k].naam} | ${x.scherm} | ${nl(x.uren.zone, 1)} | ${nl(x.uren.boven, 1)} | ${nl(x.uren.toxisch, 1)} | ${nl(x.maxC, 2)} mmol/L | ${x.regels.giftig} |`);
  }
  L.push('');
  L.push(`- elke 3e overslaan (${sc(e3)}) > alles slikken (${sc(al)}) > niets (${sc(ln)}): ${jn(b2a)}`);
  L.push(`- dubbel: max. spiegel ${nl(db ? db.maxC : NaN, 2)} mmol/L (> 1,5), ${nl(db ? db.uren.toxisch : NaN, 1)} u boven 1,5, regel "lever / giftig" op het eindscherm ${db ? db.regels.giftig : '–'}; ` +
    `score ${sc(db)} = laagste van alle lithiumruns (laagste: ${laagste.s}, ${laagste.id}): ${jn(b2b)}`);
  L.push(`- **B2 ${vp.naam}: ${B2 ? 'gehaald' : 'niet gehaald'}**`);
  L.push('');

  // ---------------- B3
  const metNaamVol = geldig.find((r) => r.cfg.naam && r.cfg.tut === 'vol');
  const zonderNaamOver = geldig.find((r) => !r.cfg.naam && r.cfg.tut === 'over');
  const metNaamOver = geldig.find((r) => r.cfg.naam && r.cfg.tut === 'over');
  const norm = geldig.find((r) => r.cfg.normaal);
  const eersteZonderNaam = metNaamVol ? metNaamVol.eersteHandeling - 1 : NaN; // zonder de tik op het naamveld
  L.push('### B3 Tikken, raceduur, "Nog een keer"');
  L.push('');
  L.push('Tikken van openen tot de eerste speelhandeling (eerste tik op een tutorialknop, "Tablet"):');
  L.push(`- met naam typen (tik naamveld + typen + Start + Tablet): ${metNaamVol ? metNaamVol.eersteHandeling : '–'} tikken (run ${metNaamVol ? metNaamVol.cfg.id : '–'}); zonder naam (veld leeg laten): ${eersteZonderNaam} tikken.`);
  L.push('Tikken van openen tot race 1 loopt (tik op "Start race" meegeteld):');
  L.push(`- met "Overslaan", zonder naam typen: ${zonderNaamOver ? zonderNaamOver.tikkenTotRace1 : '–'} tikken (run ${zonderNaamOver ? zonderNaamOver.cfg.id : '–'}: ${zonderNaamOver ? zonderNaamOver.tikLog.slice(0, zonderNaamOver.tikkenTotRace1).join(' → ') : ''})`);
  L.push(`- met "Overslaan", met naam typen: ${metNaamOver ? metNaamOver.tikkenTotRace1 : '–'} tikken (run ${metNaamOver ? metNaamOver.cfg.id : '–'})`);
  const volle = geldig.filter((r) => r.cfg.tut === 'vol');
  L.push(`- volledige tutorial, met naam typen: ${volle.map((r) => r.tikkenTotRace1).join(', ')} tikken (runs ${volle.map((r) => r.cfg.id).join(', ')}); waarvan in de tutorial: ${volle.map((r) => r.tutorialTikken).join(', ')}`);
  L.push(`- tutorialhandelingen (stap:knop) in run ${volle[0] ? volle[0].cfg.id : '–'}: ${volle[0] ? volle[0].tutActies.join(', ') : '–'}`);
  let b3duur = false, b3opn = false;
  if (norm) {
    const [a, b] = norm.races;
    b3duur = [a, b].every((x) => x.duurKlok >= 60 && x.duurKlok <= 120);
    L.push(`Raceduur op normale snelheid (run ${norm.cfg.id}, geen ?speed): race 1 ${nl(a.duurKlok, 1)} s, race 2 ${nl(b.duurKlok, 1)} s ` +
      `(klok van de bot: tik "Start race" → finish-overlay; spel zelf meet ${nl(a.duurSpel, 1)} s en ${nl(b.duurSpel, 1)} s, incl. 3 s aanloop). 60–120 s: ${jn(b3duur)}`);
    L.push(`  Scores op normale snelheid: race 1 ${a.scherm}, race 2 ${b.scherm} (zelfde strategie op ${SNEL}× in r01: ${(runs.find((r) => r.cfg.id === 'r01') || { races: [{}, {}] }).races.map((x) => x.scherm).join(', ')}).`);
    const o = norm.opnieuwUitslag;
    b3opn = !!(o && o.tikken === 1 && o.fase === 'race1' && o.klokLoopt && o.naamNa === o.naamVoor && o.scherm === 'scherm-race');
    L.push(`"Nog een keer": ${o ? o.tikken : '–'} tik → fase ${o ? o.fase : '–'}, scherm ${o ? o.scherm : '–'}, klok loopt (${o ? nl(o.klok1, 2) + ' → ' + nl(o.klok2, 2) + ' u' : '–'}), naam "${o ? o.naamNa : ''}" (was "${o ? o.naamVoor : ''}"): ${jn(b3opn)}`);
  } else L.push('Raceduur op normale snelheid: niet gemeten (--kort).');
  const scrolls = geldig.flatMap((r) => (r.scrolls || []).map((s) => r.cfg.id + ' ' + s.fase + ' ' + s.selector));
  const bedekt = runs.flatMap((r) => (r.bedekt || []).map((s) => r.cfg.id + ' ' + s.fase + ' ' + s.selector));
  const wacht = runs.flatMap((r) => (r.wachtOpRaak || []).map((s) => r.cfg.id + ' ' + s.fase + ' ' + s.selector + ' ' + s.ms + ' ms'));
  L.push(`Tikken waarbij de knop > 0,6 s nog bedekt was (bv. tijdens een schermovergang van 0,35 s; de bot wacht dan tot de knop bovenop ligt): ${wacht.length ? wacht.join('; ') : 'geen'}.`);
  L.push(`Knoppen die eerst in beeld gescrold moesten worden voor een tik: ${scrolls.length ? scrolls.join('; ') : 'geen'}. Tikken die (volgens elementFromPoint) niet op de bedoelde knop zouden landen: ${bedekt.length ? bedekt.join('; ') : 'geen'}.`);
  const minTik = Math.min(zonderNaamOver ? zonderNaamOver.tikkenTotRace1 : 99, eersteZonderNaam);
  L.push(`- Samengevat (≤ 3 tikken van openen tot spelen): eerste speelhandeling ${eersteZonderNaam} (zonder naam) / ${metNaamVol ? metNaamVol.eersteHandeling : '–'} (met naam); race 1 loopt na ${zonderNaamOver ? zonderNaamOver.tikkenTotRace1 : '–'} (Overslaan, zonder naam) / ${metNaamOver ? metNaamOver.tikkenTotRace1 : '–'} (Overslaan, met naam). Gehaald volgens de lezing "eerste speelhandeling ≤ 3": ${jn(metNaamVol && metNaamVol.eersteHandeling <= 3)}; race 1 loopt binnen 3 tikken (zonder naam, met Overslaan): ${jn(zonderNaamOver && zonderNaamOver.tikkenTotRace1 <= 3)}.`);
  L.push(`- **B3 ${vp.naam}: raceduur ${b3duur ? 'gehaald' : 'niet gehaald'}; "Nog een keer" ${b3opn ? 'gehaald' : 'niet gehaald'}; tikken: zie hierboven.**`);
  L.push('');

  // ---------------- B4
  const metingen = runs.flatMap((r) => (r.metingen || []).map((m) => ({ ...m, run: r.cfg.id })));
  const klein = [];
  const kleinSet = new Map();
  let minW = Infinity, minH = Infinity, minKnop = null, aantalKnopMetingen = 0;
  const schermen = new Set();
  for (const m of metingen) {
    schermen.add((m.fase || '') + (m.stap && m.fase === 'tutorial' ? ' stap ' + m.stap : ''));
    for (const k of m.knoppen) {
      aantalKnopMetingen++;
      if (Math.min(k.w, k.h) < Math.min(minW, minH)) minKnop = k;
      minW = Math.min(minW, k.w); minH = Math.min(minH, k.h);
      if (k.w < 48 || k.h < 48) {
        const sl = m.fase + '|' + k.label + '|' + k.w + '×' + k.h;
        if (!kleinSet.has(sl)) { kleinSet.set(sl, 1); klein.push(`${k.label} "${k.tekst}" ${k.w}×${k.h} px (fase ${m.fase}${m.stap && m.fase === 'tutorial' ? ' stap ' + m.stap : ''}, run ${m.run})`); }
      }
    }
  }
  const hScroll = metingen.filter((m) => m.scroll.doc[0] > m.scroll.doc[1] || m.scroll.body[0] > m.scroll.body[1] || (m.scroll.scherm && m.scroll.scherm[0] > m.scroll.scherm[1]));
  const maxSW = metingen.reduce((a, m) => Math.max(a, m.scroll.doc[0], m.scroll.body[0], m.scroll.scherm ? m.scroll.scherm[0] : 0), 0);
  const cw = metingen.length ? metingen[0].scroll.doc[1] : 0;
  const naLaden = runs.flatMap((r) => (r.verzoeken || []).filter((v) => v.naLaden).map((v) => ({ run: r.cfg.id, ...v })));
  const voorLaden = runs.flatMap((r) => (r.verzoeken || []).filter((v) => !v.naLaden));
  naLaden.forEach((v) => alleNaLaden.push({ vp: vp.naam, ...v }));
  const b4a = klein.length === 0, b4b = hScroll.length === 0, b4c = naLaden.length === 0;
  L.push('### B4 Knoppen, scrollen, netwerk');
  L.push('');
  L.push(`- ${metingen.length} schermmetingen (${aantalKnopMetingen} knopmetingen) op: ${[...schermen].sort().join(', ')}.`);
  L.push(`- Kleinste zichtbare knop: ${minKnop ? `${minKnop.label} "${minKnop.tekst}" ${minKnop.w}×${minKnop.h} px` : '–'} (min. breedte ${minW} px, min. hoogte ${minH} px). Knoppen < 48×48: ${klein.length ? klein.join('; ') : 'geen'}: ${jn(b4a)}`);
  L.push(`- Horizontaal scrollen (scrollWidth > clientWidth op document, body of actief scherm): ${hScroll.length} van ${metingen.length} metingen; grootste scrollWidth ${maxSW} px bij clientWidth ${cw} px: ${jn(b4b)}`);
  L.push(`- Netwerkverzoeken (${runs.length} runs, elk een verse pagina): vóór/tijdens het laden ${voorLaden.length} in totaal (${[...new Set(voorLaden.map((v) => v.url.replace(/\?.*/, '')))].join(', ')}); ná het laden ${naLaden.length}${naLaden.length ? ': ' + naLaden.slice(0, 8).map((v) => v.run + ' ' + v.fase + ' ' + v.url).join('; ') : ''}: ${jn(b4c)}`);
  L.push(`- **B4 ${vp.naam}: ${b4a && b4b && b4c ? 'gehaald' : 'niet gehaald'}**`);
  L.push('');

  // ---------------- B5
  const fsN = geldig.map((r) => r.einde.fsNaam), fsT = geldig.map((r) => r.einde.fsTotaal);
  const langste = geldig.reduce((m, r) => (r.einde.naam.length > (m ? m.einde.naam.length : -1) ? r : m), null);
  const B5 = fsN.every((x) => x >= 32) && fsT.every((x) => x >= 32);
  L.push('### B5 Eindscherm');
  L.push('');
  L.push(`- naam: computed font-size ${[...new Set(fsN)].join(' / ')} px (min. ${Math.min(...fsN)}; langste naam "${langste ? langste.einde.naam : ''}" (${langste ? langste.einde.naam.length : 0} tekens): ${langste ? langste.einde.fsNaam : '–'} px); totaal: ${[...new Set(fsT)].join(' / ')} px (min. ${Math.min(...fsT)}). Nabespreekvraag op het scherm: "${geldig[0] ? geldig[0].einde.vraag : ''}".`);
  L.push(`- **B5 ${vp.naam}: ${B5 ? 'gehaald' : 'niet gehaald'}**`);
  L.push('');

  // ---------------- B6
  const cons = runs.flatMap((r) => (r.console || []).map((c) => ({ run: r.cfg.id, ...c })));
  cons.forEach((c) => alleConsole.push({ vp: vp.naam, ...c }));
  const fouten = cons.filter((c) => c.type === 'error' || c.type === 'pageerror');
  const waarsch = cons.filter((c) => c.type === 'warning');
  const B6 = fouten.length === 0;
  L.push('### B6 Console');
  L.push('');
  L.push(`- ${runs.length} volledige doorlopen (start → eindscherm${runs.some((r) => r.cfg.opnieuw) ? ', plus "Nog een keer"' : ''}): consolefouten ${fouten.length}${fouten.length ? ': ' + fouten.slice(0, 5).map((c) => c.run + ' ' + c.fase + ': ' + c.tekst.slice(0, 160)).join(' | ') : ''}; waarschuwingen ${waarsch.length}${waarsch.length ? ': ' + [...new Set(waarsch.map((c) => c.tekst.slice(0, 160)))].slice(0, 5).join(' | ') : ''}.`);
  L.push(`- **B6 ${vp.naam}: ${B6 ? 'gehaald' : 'niet gehaald'}**`);
  L.push('');

  // ---------------- determinisme
  L.push('### Determinisme');
  L.push('');
  const r01 = runs.find((r) => r.cfg.id === 'r01'), herh = runs.filter((r) => r.cfg.herhaling === 'r01');
  if (r01 && r01.races) {
    const sig = (r) => r.races.map((x) => x.scherm + ' [' + x.gegeven.join(',') + ']').join(' | ');
    for (const h of herh) {
      if (!h.races) continue;
      const zelfde = h.races.every((x, i) => x.scherm === r01.races[i].scherm && x.gegeven.join() === r01.races[i].gegeven.join());
      L.push(`- ${h.cfg.id} (${h.cfg.normaal ? 'normale snelheid' : SNEL + '×'}, tutorial ${h.cfg.tut}) vs r01: race 1 ${h.races[0].scherm} vs ${r01.races[0].scherm}, race 2 ${h.races[1].scherm} vs ${r01.races[1].scherm}; toedieningen per poortje gelijk: ${zelfde ? 'ja' : 'NEE'}.`);
    }
    L.push(`- r01 toedieningen: ${sig(r01)}`);
  }
  L.push('');

  // ---------------- runs in detail
  L.push('### Runs in detail');
  L.push('');
  L.push('| run | poging(en) | duur | tikken totaal | tikken race 1 / race 2 | race 1 toedieningen (poortje:keuze) | race 2 toedieningen | praktijkzin race 1 | praktijkzin race 2 |');
  L.push('|---|---|---|---|---|---|---|---|---|');
  for (const r of runs) {
    if (!r.races) { L.push(`| ${r.cfg.id} | ${r.poging} | – | – | – | – | – | – | – |`); continue; }
    const comp = (x) => x.gegeven.map((s, i) => (s && s !== 'leeg' ? i + ':' + s : null)).filter(Boolean).join(' ') || '(geen)';
    L.push(`| ${r.cfg.id} | ${r.pogingen.map((p) => p.poging + (p.geldig ? '✓' : '✗')).join(' ')} | ${nl(r.duur, 0)} s | ${r.tikken} | ${r.races[0].tikkenRace} / ${r.races[1].tikkenRace} | ${comp(r.races[0])} | ${comp(r.races[1])} | ${(r.einde.praktijk[0] || '').replace(/\|/g, '/')} | ${(r.einde.praktijk[1] || '').replace(/\|/g, '/')} |`);
  }
  const ongeldigePogingen = runs.flatMap((r) => (r.pogingen || []).filter((p) => !p.geldig).map((p) => r.cfg.id + ' poging ' + p.poging + ': ' + (p.afwijkingen || []).slice(0, 4).join('; ')));
  L.push('');
  L.push(`Ongeldige pogingen (opnieuw gespeeld): ${ongeldigePogingen.length ? ongeldigePogingen.join(' · ') : 'geen'}.`);
  L.push('');
  samenvatting.push({ vp: vp.naam, B1, b1a, b1b, b1c, B2, b2a, b2b, b3duur, b3opn, B4: b4a && b4b && b4c, B5, B6,
    echt: sc(echt), hoogste: hoogste.s, pct });
});

// Samenvatting bovenaan
const kopIdx = L.findIndex((x) => x.startsWith('## Viewport'));
const SV = ['## Samenvatting per eis', '', '| eis | ' + samenvatting.map((s) => s.vp).join(' | ') + ' |', '|---|' + samenvatting.map(() => '---|').join('')];
const rij = (naam, f) => SV.push(`| ${naam} | ${samenvatting.map((s) => f(s)).join(' | ')} |`);
const gh = (b) => (b ? 'gehaald' : 'niet gehaald');
rij('B1 paracetamol-rangorde, leverschade, echt ≥ 80% van hoogste', (s) => `${gh(s.B1)} (echt ${s.echt} = ${nl(s.pct, 1)}% van ${s.hoogste})`);
rij('B2 lithium-rangorde, dubbel toxisch en laagst', (s) => gh(s.B2));
rij('B3 raceduur 60–120 s (normale snelheid)', (s) => gh(s.b3duur));
rij('B3 "Nog een keer" = 1 tik, race 1 loopt, zelfde naam', (s) => gh(s.b3opn));
rij('B3 tikken tot spelen', () => 'zie B3 per viewport (getallen)');
rij('B4 knoppen ≥ 48×48, geen h-scroll, geen netwerk na laden', (s) => gh(s.B4));
rij('B5 naam en totaal ≥ 32 px', (s) => gh(s.B5));
rij('B6 0 consolefouten', (s) => gh(s.B6));
SV.push('');
L.splice(kopIdx, 0, ...SV);

mkdirSync(path.dirname(RAPPORT), { recursive: true });
writeFileSync(RAPPORT, L.join('\n') + '\n');
console.log('\nRapport: ' + path.relative(ROOT, RAPPORT) + ` (looptijd ${nl(looptijd / 60, 1)} min)`);
for (const s of samenvatting) {
  console.log(`${s.vp}: B1 ${gh(s.B1)} · B2 ${gh(s.B2)} · B3 duur ${gh(s.b3duur)} / opnieuw ${gh(s.b3opn)} · B4 ${gh(s.B4)} · B5 ${gh(s.B5)} · B6 ${gh(s.B6)}`);
}
