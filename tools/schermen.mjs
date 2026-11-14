// Slikken of Stikken — schermafbeeldingen per scherm en per tutorialstap (§6C, §6D).
// Draaien: node tools/schermen.mjs            (390×844, schrijft gauntlet/schermen/*.png + index.html)
//          node tools/schermen.mjs 375x667    (andere maat: schrijft naar gauntlet/schermen/375x667/)
// Speelt het ECHTE index.html in Chromium (telefoon-emulatie) met echte tikken, op normale snelheid
// (geen ?speed). In de oefenronde tikt het script alleen op de knop die de uitleg aanwijst (data-wijs).
// Race 1 wordt daarna gespeeld met dezelfde keuzes op dezelfde poortjes als in de oefenronde, en op dezelfde
// klokmomenten gefotografeerd: zo kun je elke tutorialstap naast een vergelijkbaar moment uit race 1 leggen.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const hier = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(hier, '..');
const requireGlobaal = createRequire(execSync('npm root -g').toString().trim() + '/');
const { chromium, devices } = requireGlobaal('playwright');

const maat = (process.argv[2] || '390x844').split('x').map(Number);
const HOOFD = maat[0] === 390 && maat[1] === 844;
const UIT = HOOFD ? path.join(ROOT, 'gauntlet', 'schermen') : path.join(ROOT, 'gauntlet', 'schermen', maat.join('x'));
mkdirSync(UIT, { recursive: true });
for (const f of readdirSync(UIT)) if (f.endsWith('.png')) unlinkSync(path.join(UIT, f));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: maat[0], height: maat[1] }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  userAgent: devices['Pixel 5'].userAgent, locale: 'nl-NL'
});
const page = await ctx.newPage();
const fouten = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') fouten.push(m.text()); });
page.on('pageerror', (e) => fouten.push(String(e)));

const lijst = []; // {bestand, titel, groep, uitleg}
async function foto(naam, titel, groep, uitleg = '') {
  const bestand = naam + '.png';
  await page.screenshot({ path: path.join(UIT, bestand) });
  lijst.push({ bestand, titel, groep, uitleg });
}
const dbg = () => page.evaluate(() => JSON.parse(JSON.stringify(window.SoS.debug)));
async function tik(sel) {
  const loc = page.locator(sel).first();
  for (let i = 0; i < 60; i++) {
    const d = await loc.boundingBox();
    if (d) {
      const x = d.x + d.width / 2, y = d.y + d.height / 2;
      const raak = await page.evaluate(([s, x, y]) => {
        const el = document.querySelector(s), hit = document.elementFromPoint(x, y);
        return !!(el && hit && (el === hit || el.contains(hit)));
      }, [sel, x, y]);
      if (raak) { await page.touchscreen.tap(x, y); return; }
    }
    await sleep(50);
  }
  throw new Error('knop niet te raken: ' + sel);
}
const wacht = (fn, arg, timeout = 120000) => page.waitForFunction(fn, arg, { timeout, polling: 25 });
const wachtKlok = (t) => wacht((t) => window.SoS.debug.klok >= t, t);

await page.goto(pathToFileURL(path.join(ROOT, 'index.html')).href);
await wacht(() => window.SoS && window.SoS.debug.fase === 'start');
await sleep(500);
await foto('01-start', 'Start', 'Start', 'Leeg naamveld.');
await tik('[data-veld="naam"]');
await page.keyboard.type('Pilpiraat', { delay: 15 });
await tik('[data-actie="start"]');

// ---------- oefenronde: alleen tikken op de knop die de uitleg aanwijst ----------
await wacht(() => window.SoS.debug.fase === 'tutorial');
const T0 = Date.now();
const stappen = await page.evaluate(() => window.SoS.tutorial.stappen.map((s) => ({ op: s.op, knop: s.knop, poortje: s.poortje, zin: s.zin, licht: s.licht })));
const momenten = []; // klok waarop de foto's genomen zijn (voor de vergelijking met race 1)
let nr = 1, vnr = 0;
for (const st of stappen) {
  if (!st.knop) { // vertelstap: de zin staat even in beeld en gaat vanzelf verder
    vnr++;
    await wacht((z) => { const m = document.querySelector('#melding.zicht'); return !!m && m.getAttribute('data-zin') === z; }, st.zin);
    await sleep(900);
    await foto(`02-oefenronde-verhaal-${vnr}`, `Oefenronde, vertelstap ${vnr} (licht op: ${st.licht})`, 'Oefenronde', `Zin: “${st.zin}” · gaat vanzelf verder, of met een tik op het speelveld.`);
    continue;
  }
  await wacht(() => window.SoS.debug.gids && window.SoS.debug.gids.bevroren && !!document.querySelector('#knoppen [data-wijs]'));
  await sleep(700); // de zin is ingefaded
  let d = await dbg();
  await foto(`02-oefenronde-${nr}a`, `Oefenronde stap ${nr}: klok staat stil`, 'Oefenronde', `Uitlegzin: “${d.gids.zin}” · gemarkeerde knop: ${st.knop} · klok ${d.klok.toFixed(2)} u`);
  momenten.push({ naam: `${nr}a`, klok: d.klok, keuzeVoor: st.poortje, knop: st.knop });
  await tik('#knoppen [data-wijs]');
  await sleep(350);
  d = await dbg();
  await foto(`02-oefenronde-${nr}b`, `Oefenronde stap ${nr}: gekozen, klok loopt`, 'Oefenronde', `Keuze staat klaar voor poortje ${st.poortje}.`);
  await wacht((g) => window.SoS.debug.gegeven.length > g, st.poortje);
  await sleep(1500);
  d = await dbg();
  await foto(`02-oefenronde-${nr}c`, `Oefenronde stap ${nr}: na het poortje`, 'Oefenronde', `Uitlegzin: “${d.gids.zin}” · klok ${d.klok.toFixed(2)} u`);
  momenten.push({ naam: `${nr}c`, klok: d.klok });
  nr++;
}
await wacht(() => !document.getElementById('finish').hidden);
const tutSec = (Date.now() - T0) / 1000;
await sleep(700);
await foto(`02-oefenronde-${nr}`, `Oefenronde stap ${nr}: Klaar? Race!`, 'Oefenronde', `Duur van de oefenronde bij direct reageren (incl. de wachttijd voor de foto's): ${tutSec.toFixed(0)} s.`);
await tik('#finish [data-actie="verder"]');

// ---------- race 1, met dezelfde keuzes als in de oefenronde ----------
await wacht(() => window.SoS.debug.fase === 'intro1');
await sleep(600);
await foto('03-intro-race-1', 'Introkaartje race 1', 'Race 1');
await tik('[data-actie="start-race"]');
await wacht(() => window.SoS.debug.fase === 'race1');
await sleep(600);
await foto('04-race1-begin', 'Race 1: begin', 'Race 1', 'Aanloop: het eerste poortje komt eraan.');
const plan = { 18: 'slik' };
stappen.forEach((s) => { if (s.knop) plan[s.poortje] = s.knop; });
let mi = 0, misselijkFoto = false, geweigerd = false, leverFoto = false;
while (true) {
  const d = await dbg();
  if (d.fase !== 'race1' || d.klaar) break;
  // vergelijkingsfoto's op dezelfde klokmomenten als de oefenronde
  if (mi < momenten.length && d.klok >= momenten[mi].klok) {
    const m = momenten[mi++];
    if (m.keuzeVoor != null) {
      // zelfde situatie als in de oefenronde-foto "a": vlak vóór de keuze; daarna kiezen
      await foto(`05-race1-vergelijk-${m.naam}`, `Race 1 op hetzelfde moment als oefenronde ${m.naam}`, 'Race 1 naast de oefenronde', `klok ${d.klok.toFixed(2)} u (de race loopt door)`);
      await tik(`#knoppen [data-actie="${m.knop}"]`);
    } else {
      await foto(`05-race1-vergelijk-${m.naam}`, `Race 1 op hetzelfde moment als oefenronde ${m.naam}`, 'Race 1 naast de oefenronde', `klok ${d.klok.toFixed(2)} u`);
    }
    continue;
  }
  if (!misselijkFoto && d.klok >= 9.35) {
    misselijkFoto = true;
    await foto('06-race1-misselijk', 'Race 1: plotwending (misselijk)', 'Race 1', 'Opa is misselijk na de narcose: slikken is geblokkeerd.');
  }
  if (!geweigerd && d.klok >= 10.3 && d.klok < 10.6) {
    geweigerd = true;
    await tik('#knoppen [data-actie="slik"]');
    await sleep(450);
    await foto('07-race1-slikken-geweigerd', 'Race 1: tablet geweigerd tijdens misselijkheid', 'Race 1');
  }
  if (!leverFoto && d.dagteller > 4000) {
    leverFoto = true;
    await sleep(500);
    await foto('07b-race1-lever', 'Race 1: vijfde gram binnen 24 uur', 'Race 1', 'Levermeter vol: te veel paracetamol beschadigt de lever.');
  }
  const p = d.poortje;
  if (p && plan[p.index] && p.index >= 14 && p.open && !p.keuze && d.klok > p.t - 0.6 && d.klok < p.t - 0.15) {
    await tik(`#knoppen [data-actie="${plan[p.index]}"]`);
  }
  await sleep(30);
}
await wacht(() => !document.getElementById('finish').hidden);
await sleep(700);
await foto('08-race1-klaar', 'Race 1: klaar', 'Race 1');
await tik('#finish [data-actie="verder"]');

// ---------- race 2 ----------
await wacht(() => window.SoS.debug.fase === 'intro2');
await sleep(600);
await foto('09-intro-race-2', 'Introkaartje race 2', 'Race 2', 'Wat anders is dan in race 1: één zin per verschil.');
await tik('[data-actie="start-race"]');
await wacht(() => window.SoS.debug.fase === 'race2');
await sleep(600);
await foto('10-race2-begin', 'Race 2: begin', 'Race 2');
const gedaan = {};
while (true) {
  const d = await dbg();
  if (d.fase !== 'race2' || d.klaar) break;
  const p = d.poortje;
  if (p && p.open && !p.keuze && d.klok > p.t - 4 && d.klok < p.t - 1) {
    // alles slikken; poortje 4 dubbel (2× tablet); na de ibuprofen elk 3e poortje overslaan
    const na = p.index - 14, over = p.index >= 15 && na % 3 === 0;
    await tik(`#knoppen [data-actie="${over ? 'niets' : 'slik'}"]`);
    if (p.index === 4) {
      await sleep(120);
      await tik('#knoppen [data-actie="slik"]');
      await sleep(300);
      await foto('11-race2-twee-tabletten', 'Race 2: 2× tablet voor één poortje', 'Race 2');
    }
    if (over && !gedaan.over) { gedaan.over = true; await sleep(300); await foto('14-race2-overslaan', 'Race 2: Overslaan gekozen', 'Race 2'); }
  }
  if (!gedaan.spuit && d.klok >= 52) {
    gedaan.spuit = true;
    await tik('#knoppen [data-actie="spuit"]');
    await sleep(500);
    await foto('12-race2-spuit', 'Race 2: plotwending (de spuitknop)', 'Race 2', 'Lithium bestaat niet als prik.');
  }
  if (!gedaan.ibu && d.klok >= 121.5) {
    gedaan.ibu = true;
    await sleep(250);
    await foto('13-race2-ibuprofen', 'Race 2: plotwending (ibuprofen)', 'Race 2');
  }
  await sleep(30);
}
await wacht(() => !document.getElementById('finish').hidden);
await sleep(700);
await foto('15-race2-klaar', 'Race 2: klaar', 'Race 2');
await tik('#finish [data-actie="verder"]');

// ---------- eindscherm ----------
await wacht(() => window.SoS.debug.fase === 'einde' && !!document.querySelector('[data-eind="totaal"]'));
await sleep(1200);
await foto('16-einde', 'Eindscherm', 'Eindscherm');
for (const i of [0, 1]) {
  await page.evaluate((i) => {
    const s = document.querySelector('.scherm.actief');
    s.scrollTop = document.querySelector(`[data-verslag="${i}"]`).offsetTop - 8;
  }, i);
  await sleep(300);
  await foto(`17-einde-verslag-${i + 1}`, `Eindscherm: verslag race ${i + 1}`, 'Eindscherm');
  await page.evaluate(() => { document.querySelector('.scherm.actief').scrollTop += window.innerHeight - 80; });
  await sleep(300);
  await foto(`17-einde-verslag-${i + 1}-vervolg`, `Eindscherm: verslag race ${i + 1} (vervolg)`, 'Eindscherm');
}
await page.evaluate(() => { const s = document.querySelector('.scherm.actief'); s.scrollTop = s.scrollHeight; });
await sleep(300);
await foto('18-einde-onderaan', 'Eindscherm: onderaan', 'Eindscherm');
await browser.close();

// ---------- overzichtspagina ----------
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const groepen = [...new Set(lijst.map((l) => l.groep))];
const kaart = (l) => `<figure><a href="${l.bestand}"><img src="${l.bestand}" alt="${esc(l.titel)}" loading="lazy" width="${maat[0]}" height="${maat[1]}"></a>` +
  `<figcaption><b>${esc(l.titel)}</b>${l.uitleg ? '<br>' + esc(l.uitleg) : ''}<br><code>${l.bestand}</code></figcaption></figure>`;
let html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Slikken of Stikken — schermen ${maat.join(' × ')}</title>
<style>
body{margin:0;padding:24px;background:#16161c;color:#eee;font:16px/1.45 system-ui,sans-serif}
h1{font-size:24px;margin:0 0 4px}h2{font-size:19px;margin:36px 0 12px;color:#b07cff}
p{max-width:820px;color:#c4c4cc;margin:6px 0}
.rij{display:flex;flex-wrap:wrap;gap:18px}
figure{margin:0;width:260px}img{display:block;width:260px;height:auto;border:1px solid #3a3a44;border-radius:10px}
figcaption{font-size:13px;color:#c4c4cc;margin-top:6px}figcaption b{color:#fff}code{font-size:11.5px;color:#8f8f9a}
.paar{display:flex;gap:10px;margin:0 0 18px;padding:12px;border:1px solid #3a3a44;border-radius:12px;width:max-content;max-width:100%}
</style></head><body>
<h1>Slikken of Stikken — schermen op ${maat.join(' × ')}</h1>
<p>Gemaakt door <code>tools/schermen.mjs</code>: het echte <code>index.html</code>, echte tikken, normale snelheid. In de oefenronde tikt het script alleen op de knop die de uitleg aanwijst. Klik op een afbeelding voor de volle grootte.</p>`;
for (const g of groepen) {
  if (g === 'Race 1 naast de oefenronde') continue;
  html += `<h2>${esc(g)}</h2><div class="rij">` + lijst.filter((l) => l.groep === g).map(kaart).join('') + '</div>';
}
const paren = lijst.filter((l) => l.groep === 'Race 1 naast de oefenronde');
if (paren.length) {
  html += '<h2>Oefenronde naast race 1 (§6C2)</h2><p>Links de oefenronde, rechts race 1 op hetzelfde klokmoment met dezelfde keuzes. Toegestaan verschil: de uitlegzin, de stilstaande klok en de markering van de knop. In race 1 staat aan het begin de starthint in beeld, en vanaf uur 10 de plotwending (misselijkheid), die bewust niet in de oefenronde zit.</p>';
  for (const r of paren) {
    const naam = r.bestand.replace('05-race1-vergelijk-', '').replace('.png', '');
    const t = lijst.find((l) => l.bestand === `02-oefenronde-${naam}.png`);
    if (t) html += `<div class="paar">${kaart(t)}${kaart(r)}</div>`;
  }
}
html += '</body></html>';
writeFileSync(path.join(UIT, 'index.html'), html);
console.log(`${lijst.length} schermafbeeldingen in ${path.relative(ROOT, UIT)}; oefenronde ${tutSec.toFixed(0)} s; consolefouten: ${fouten.length}`);
if (fouten.length) console.log(fouten.join('\n'));
