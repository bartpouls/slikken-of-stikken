// Onafhankelijke steekproef §6B/§6A4 — eigen Playwright-script (leest SoS.debug alleen; handelt alleen met touchscreen.tap)
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const { chromium } = createRequire(execSync('npm root -g').toString().trim() + '/')('playwright');
const hier = path.dirname(fileURLToPath(import.meta.url));
const INDEX = 'file://' + path.resolve(hier, '../../../index.html');
const welke = process.argv[2] || 'alle';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MEET = () => {
  const act = document.querySelector('.scherm.actief');
  const zicht = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); if (r.width === 0 || r.height === 0 || cs.visibility === 'hidden' || cs.display === 'none') return false; for (let p = e; p; p = p.parentElement) { const c = getComputedStyle(p); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0 || p.hidden) return false; } return true; };
  const knoppen = [...document.querySelectorAll('button, a[href], input, select, [role="button"], [data-actie]')].filter(zicht).filter((e) => e.id === 'demp' || act.contains(e)).map((e) => { const r = e.getBoundingClientRect(); return { wat: (e.getAttribute('data-actie') || e.id || e.tagName) + ':' + (e.textContent || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 30), tag: e.tagName, w: +r.width.toFixed(1), h: +r.height.toFixed(1), x: +r.left.toFixed(1), y: +r.top.toFixed(1) }; });
  const de = document.documentElement;
  const hscroll = { doc: [de.scrollWidth, de.clientWidth], body: [document.body.scrollWidth, document.body.clientWidth], scherm: [act.scrollWidth, act.clientWidth], vv: window.innerWidth };
  // contrast van DOM-tekst
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[, /]+/).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const contrast = [];
  const tw = document.createTreeWalker(act, NodeFilter.SHOW_TEXT);
  const gezien = new Set();
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    if (!n.textContent.trim()) continue; const e = n.parentElement; if (gezien.has(e) || !zicht(e)) continue; gezien.add(e);
    const cs = getComputedStyle(e); const fg = parse(cs.color); if (!fg) continue;
    let bg = [0, 0, 0], bgBron = 'zwart(standaard)', op = 1, beeld = false;
    for (let p = e; p; p = p.parentElement) { const c = getComputedStyle(p); op *= +c.opacity; }
    for (let p = e; p; p = p.parentElement) { const c = getComputedStyle(p); const b = parse(c.backgroundColor); if (c.backgroundImage !== 'none' && !beeld) beeld = c.backgroundImage.slice(0, 40); if (b && b[3] > 0.5) { bg = b; bgBron = p.className || p.tagName; break; } }
    const a = fg[3] * op; const mix = [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a));
    const L1 = lum(mix), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const px = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700; const groot = px >= 24 || (bold && px >= 18.66);
    contrast.push({ tekst: n.textContent.trim().slice(0, 40), ratio: +ratio.toFixed(2), px, groot, kleur: cs.color, bg: bg.slice(0, 3).join(','), bgBron: String(bgBron).slice(0, 30), op: +op.toFixed(2), beeld });
  }
  return { fase: window.SoS.debug.fase, knoppen, hscroll, contrast, tekst: act.innerText.replace(/\n+/g, ' | ').slice(0, 6000) };
};

async function run(naamRun, vp, dpr, speed, opt) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: dpr, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36' });
  const page = await ctx.newPage();
  const uit = { run: naamRun, vp, speed, tikken: [], metingen: [], console: [], netwerkNaLaden: [], netwerkLaden: [], meldingen: new Set(), keuzeInfo: new Set(), races: [], opm: [] };
  let geladen = false;
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) uit.console.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => uit.console.push('pageerror: ' + e.message));
  page.on('request', (r) => { (geladen ? uit.netwerkNaLaden : uit.netwerkLaden).push(r.url().slice(0, 80)); });
  await page.goto(INDEX + (speed ? '?speed=' + speed : ''), { waitUntil: 'load' });
  await page.waitForFunction(() => window.SoS && window.SoS.debug && window.SoS.debug.fase === 'start');
  geladen = true;
  const dbg = () => page.evaluate(() => { const d = window.SoS.debug; return JSON.parse(JSON.stringify(d)); });
  const meet = async (label) => { const m = await page.evaluate(MEET); m.label = label; uit.metingen.push(m); return m; };
  const shot = (n) => page.screenshot({ path: path.join(hier, 'schermen', `${naamRun}-${n}.png`) });
  async function tik(sel, wat) {
    // wacht tot de knop zichtbaar is en bovenop ligt, dan echte tik in het midden
    for (let i = 0; i < 200; i++) {
      const p = await page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); if (!r.width) return null; const x = r.left + r.width / 2, y = r.top + r.height / 2; const t = document.elementFromPoint(x, y); return { x, y, raak: !!t && (t === e || e.contains(t)), inBeeld: y > 0 && y < innerHeight }; }, sel);
      if (p && p.raak && p.inBeeld) { await page.touchscreen.tap(p.x, p.y); uit.tikken.push(wat || sel); return true; }
      if (p && !p.inBeeld) { await page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'center' }), sel); uit.opm.push('scroll nodig voor ' + sel); }
      await sleep(25);
    }
    uit.opm.push('TIK MISLUKT ' + sel); return false;
  }
  const wachtFase = (f, ms = 240000) => page.waitForFunction((x) => window.SoS.debug.fase === x, f, { timeout: ms });
  const peilMelding = async () => { const m = await page.evaluate(() => { const a = document.querySelector('#melding.zicht'); const k = document.querySelector('#keuze-info.zicht'); return [a ? a.textContent.trim() : '', k ? k.textContent.trim() : '', document.getElementById('lever-tekst').textContent, document.getElementById('lever').hidden, document.getElementById('klok').textContent]; }); if (m[0]) uit.meldingen.add(m[0]); if (m[1]) uit.keuzeInfo.add(m[1]); return m; };

  // ---- start
  await meet('start'); await shot('01-start');
  if (opt.naam) { await tik('#naam', 'naamveld'); await page.keyboard.type(opt.naam); await meet('start-met-toetsenbord'); }
  const tikkenVoor = uit.tikken.length;
  if (opt.tutorial) {
    await tik('[data-actie="start"]', 'Start'); await wachtFase('tutorial');
    uit.tikkenTotSpelen = null; const t0 = Date.now(); let stap = 0;
    for (;;) {
      const d = await dbg(); await peilMelding();
      if (d.klaar) break;
      if (d.gids && d.gids.bevroren) {
        const w = await page.evaluate(() => { const a = [...document.querySelectorAll('#knoppen [data-wijs]')]; return a.map((e) => e.getAttribute('data-actie')); });
        if (w.length === 1) { stap++; await sleep(350); await meet('tutorial-stap' + stap); await shot('02-tut' + stap); await tik(`#knoppen [data-actie="${w[0]}"]`, 'tut:' + w[0]); if (uit.tikkenTotSpelen == null) uit.tikkenTotSpelen = uit.tikken.length; await sleep(60); }
      }
      await sleep(40);
    }
    uit.tutorialDuurS = (Date.now() - t0) / 1000; uit.tutorialStappen = stap;
    uit.tutEind = await dbg();
    await meet('tutorial-klaar'); await shot('02-tut-klaar');
    await tik('#finish [data-actie="verder"]', 'Race!');
  } else {
    await tik('[data-actie="start-over"]', 'Oefenronde overslaan');
  }
  await wachtFase('intro1');

  async function speelRace(nr, plan) {
    await sleep(450); await meet('intro' + nr); await shot(`0${2 + nr}-intro${nr}`);
    await tik('[data-actie="start-race"]', 'Start race');
    if (uit.tikkenTotRace1 == null) uit.tikkenTotRace1 = uit.tikken.length;
    const t0 = Date.now(); await wachtFase('race' + nr);
    const r = { nr, plan: plan.naam, maxC: 0, extra: [], dagtellerMax: '' }; let gemeten = {}, vorigeIdx = -1, extraGedaan = {};
    for (;;) {
      const d = await dbg(); const m = await peilMelding();
      if (d.klaar) break;
      if (d.C > r.maxC) r.maxC = d.C;
      if (m[2] > r.dagtellerMax) r.dagtellerMax = m[2];
      const p = d.poortje;
      if (p && p.open) {
        const wil = plan.kies(p.index, d); // {route, aantal} of null
        if (plan.extra && plan.extra[p.index] && !extraGedaan[p.index]) { extraGedaan[p.index] = 1; await tik(`#knoppen [data-actie="${plan.extra[p.index]}"]`, 'extra:' + plan.extra[p.index]); await sleep(200); await peilMelding(); await shot(`race${nr}-extra-${plan.extra[p.index]}-${p.index}`); r.extra.push(p.index + ':' + plan.extra[p.index]); continue; }
        if (wil && (p.keuze !== wil.route || p.aantal !== (wil.aantal || 1))) { await tik(`#knoppen [data-actie="${wil.route}"]`, `r${nr}:${wil.route}`); await sleep(15); continue; }
      }
      const sleutel = nr === 1 ? (d.klok < 0 ? 'aanloop' : d.klok < 10 ? 'vroeg' : d.klok < 16 ? 'misselijk' : 'laat') : (d.klok < 0 ? 'aanloop' : d.klok < 120 ? 'voor' : 'na-ibu');
      if (!gemeten[sleutel]) { gemeten[sleutel] = 1; await meet(`race${nr}-${sleutel}`); await shot(`race${nr}-${sleutel}`); }
      await sleep(18);
    }
    r.duurS = (Date.now() - t0) / 1000;
    const d = await dbg(); r.gegeven = d.gegeven; r.spelDuur = d.duren; 
    await sleep(200); await meet(`race${nr}-klaar`); await shot(`race${nr}-klaar`);
    r.finish = await page.evaluate(() => document.getElementById('finish-getal').textContent);
    uit.races.push(r);
    await tik('#finish [data-actie="verder"]', 'Verder');
    return r;
  }
  async function einde(tag) {
    await wachtFase('einde'); await sleep(900);
    const e = await page.evaluate(() => {
      const q = (s) => document.querySelector(s); const fs = (s) => { const el = q(s); return el ? { px: parseFloat(getComputedStyle(el).fontSize), tekst: el.textContent.trim(), h: el.getBoundingClientRect().height, w: el.getBoundingClientRect().width, sw: el.scrollWidth, cw: el.clientWidth } : null; };
      const verslagen = [...document.querySelectorAll('.eind-verslag')].map((v) => ({ opbouw: [...v.querySelectorAll('.eind-opbouw tr')].map((tr) => tr.getAttribute('data-regel') + '=' + tr.querySelector('td').textContent.trim()), telling: [...v.querySelectorAll('.eind-telling > div')].map((x) => x.innerText.replace(/\n+/g, ' ')), praktijk: (v.querySelector('[data-zin="praktijk"]') || {}).textContent, nabespreking: (v.querySelector('[data-zin="nabespreking"]') || {}).textContent, echt: (v.querySelector('.eind-echt') || {}).innerText, figcaption: (v.querySelector('figcaption') || {}).textContent, cellen: [...v.querySelectorAll('.eind-cel')].map((c) => c.getAttribute('data-poortje') + ':' + c.getAttribute('data-tekst')).join(' '), svgLabels: [...v.querySelectorAll('svg text')].map((t) => t.textContent).join(' · '), leg: [...v.querySelectorAll('.eind-leg li, .eind-legenda li')].map((l) => l.textContent.trim()).join(' · ') }));
      return { naam: fs('[data-eind="naam"]'), totaal: fs('[data-eind="totaal"]'), race0: fs('[data-eind="race-0"]'), race1: fs('[data-eind="race-1"]'), vraag: fs('[data-eind="vraag"]'), verslagen };
    });
    uit['einde' + tag] = e;
    const sh = await page.evaluate(() => { const s = document.querySelector('.scherm.actief'); return [s.scrollHeight, s.clientHeight]; });
    let i = 0;
    for (let y = 0; y < sh[0]; y += Math.floor(sh[1] * 0.85)) { await page.evaluate((yy) => { document.querySelector('.scherm.actief').scrollTop = yy; }, y); await sleep(350); await meet(`einde${tag}-scroll${i}`); await shot(`einde${tag}-${String(i).padStart(2, '0')}`); i++; }
    await page.evaluate(() => { document.querySelector('.scherm.actief').scrollTop = 0; }); await sleep(300);
  }
  for (let ronde = 0; ronde < opt.rondes.length; ronde++) {
    const [p1, p2] = opt.rondes[ronde];
    await speelRace(1, p1); await wachtFase('intro2'); await speelRace(2, p2);
    await einde(ronde);
    if (ronde < opt.rondes.length - 1 || opt.nogEenKeer) {
      const n = uit.tikken.length; const naamVoor = (await dbg()).naam;
      await tik('[data-actie="opnieuw"]', 'Nog een keer');
      await sleep(400); const d1 = await dbg(); await sleep(300); const d2 = await dbg();
      uit.nogEenKeer = { tikken: uit.tikken.length - n, fase: d1.fase, klok: [d1.klok, d2.klok], naamVoor, naamNa: d2.naam };
      if (ronde === opt.rondes.length - 1) break;
      // "Nog een keer" start race 1 meteen: geen introkaartje → speel direct
      const r = { nr: 1, plan: opt.rondes[ronde + 1][0].naam + ' (na Nog een keer)', maxC: 0 }; const plan = opt.rondes[ronde + 1][0]; const t0 = Date.now();
      for (;;) { const d = await dbg(); await peilMelding(); if (d.klaar) break; if (d.C > r.maxC) r.maxC = d.C; const p = d.poortje; if (p && p.open) { const wil = plan.kies(p.index, d); if (wil && (p.keuze !== wil.route || p.aantal !== (wil.aantal || 1))) { await tik(`#knoppen [data-actie="${wil.route}"]`, 'r1:' + wil.route); await sleep(15); continue; } } await sleep(18); }
      r.duurS = (Date.now() - t0) / 1000; r.gegeven = (await dbg()).gegeven; r.finish = await page.evaluate(() => document.getElementById('finish-getal').textContent); uit.races.push(r);
      await tik('#finish [data-actie="verder"]', 'Verder'); await wachtFase('intro2');
      await speelRace(2, opt.rondes[ronde + 1][1]); await einde(ronde + 1);
      break;
    }
  }
  uit.meldingen = [...uit.meldingen]; uit.keuzeInfo = [...uit.keuzeInfo];
  await browser.close();
  writeFileSync(path.join(hier, `steekproef-${naamRun}.json`), JSON.stringify(uit, null, 1));
  return uit;
}

const P = {
  zetpil12: { naam: 'slik 0/6/18 + zetpil 12', kies: (i) => ({ 0: { route: 'slik' }, 6: { route: 'slik' }, 12: { route: 'zetpil' }, 18: { route: 'slik' } }[i] || null) },
  spuit12: { naam: 'slik 0/6/18 + spuit 12', kies: (i) => ({ 0: { route: 'slik' }, 6: { route: 'slik' }, 12: { route: 'spuit' }, 18: { route: 'slik' } }[i] || null) },
  gemist: { naam: 'slik 0/6/18, 12 gemist (+ poging slik op 11)', kies: (i) => ([0, 6, 18].includes(i) ? { route: 'slik' } : null), extra: { 11: 'slik' } },
  elkUur07: { naam: 'elk uur slik 0..7', kies: (i) => (i <= 7 ? { route: 'slik' } : null) },
  niets: { naam: 'niets', kies: () => null },
  spuit0: { naam: '1 g spuit om 0', kies: (i) => (i === 0 ? { route: 'spuit' } : null) },
};
const Lp = {
  alles: { naam: 'alles slikken', kies: () => ({ route: 'slik' }) },
  derde: { naam: 'na ibuprofen elke 3e overslaan (+ spuit-tik op poortje 2)', kies: (i) => (i >= 15 && (i - 15 + 1) % 3 === 0 ? { route: 'niets' } : { route: 'slik' }), extra: { 2: 'spuit' } },
  niets: { naam: 'niets', kies: () => null },
  dubbel: { naam: 'elk poortje dubbel', kies: () => ({ route: 'slik', aantal: 2 }) },
};
const RUNS = {
  a: () => run('a-375-tut', { width: 375, height: 667 }, 2, 4, { naam: 'Controleur Zestie', tutorial: true, rondes: [[P.zetpil12, Lp.alles]], nogEenKeer: true }),
  b: () => run('b-390-over', { width: 390, height: 844 }, 3, 4, { tutorial: false, rondes: [[P.gemist, Lp.derde], [P.spuit0, Lp.niets]] }),
  c: () => run('c-375-over', { width: 375, height: 667 }, 2, 4, { tutorial: false, rondes: [[P.niets, Lp.dubbel], [P.spuit12, Lp.alles]] }),
  d: () => run('d-390-normaal', { width: 390, height: 844 }, 3, 0, { naam: 'Wim', tutorial: true, rondes: [[P.elkUur07, Lp.dubbel]] }),
};
const lijst = welke === 'alle' ? Object.keys(RUNS) : welke.split(',');
const res = await Promise.all(lijst.map((k) => RUNS[k]()));
for (const u of res) {
  console.log(`\n===== ${u.run} (${u.vp.width}×${u.vp.height}, speed ${u.speed || 1}) =====`);
  console.log('tikken tot eerste speelhandeling:', u.tikkenTotSpelen, '| tot race 1 loopt:', u.tikkenTotRace1, '| tutorial s:', u.tutorialDuurS, 'stappen', u.tutorialStappen, '| alle tikken:', u.tikken.length);
  for (const r of u.races) console.log(`race ${r.nr} [${r.plan}] finish=${r.finish} duur=${r.duurS.toFixed(1)}s spel=${JSON.stringify(r.spelDuur)} maxC=${r.maxC.toFixed(3)} dagteller=${r.dagtellerMax || ''} extra=${r.extra || ''}`);
  const alleK = u.metingen.flatMap((m) => m.knoppen.map((k) => ({ ...k, label: m.label })));
  const klein = alleK.filter((k) => k.w < 48 || k.h < 48);
  console.log('knopmetingen:', alleK.length, '| kleinste w:', Math.min(...alleK.map((k) => k.w)), 'h:', Math.min(...alleK.map((k) => k.h)), '| <48:', JSON.stringify([...new Set(klein.map((k) => `${k.label}/${k.wat} ${k.w}×${k.h}`))]));
  const hs = u.metingen.filter((m) => m.hscroll.doc[0] > m.hscroll.doc[1] || m.hscroll.body[0] > m.hscroll.body[1] || m.hscroll.scherm[0] > m.hscroll.scherm[1]);
  console.log('h-scroll:', hs.length, 'van', u.metingen.length, hs.map((m) => m.label + JSON.stringify(m.hscroll)).join(' '));
  console.log('netwerk laden:', u.netwerkLaden.length, '| na laden:', u.netwerkNaLaden.length, u.netwerkNaLaden.join(' '));
  console.log('console:', u.console.length, u.console.join(' || '));
  console.log('opm:', [...new Set(u.opm)].join(' | '));
  console.log('nogEenKeer:', JSON.stringify(u.nogEenKeer));
  for (const k of Object.keys(u).filter((x) => /^einde\d/.test(x))) { const e = u[k]; console.log(k, 'naam', JSON.stringify(e.naam), 'totaal', JSON.stringify(e.totaal), 'r0', e.race0 && e.race0.tekst, 'r1', e.race1 && e.race1.tekst); e.verslagen.forEach((v) => console.log('   ', v.opbouw.join(' '), '|', v.telling.join(' ; '), '|', v.praktijk)); }
  const slecht = {}; u.metingen.forEach((m) => m.contrast.filter((c) => c.ratio < (c.groot ? 3 : 4.5)).forEach((c) => { slecht[`${m.fase}: "${c.tekst}" ${c.ratio} (${c.px}px, ${c.kleur} op ${c.bg}/${c.bgBron}, op ${c.op})`] = 1; }));
  console.log('contrast onder norm (DOM-tekst):', Object.keys(slecht).length); Object.keys(slecht).slice(0, 40).forEach((s) => console.log('   ' + s));
}
