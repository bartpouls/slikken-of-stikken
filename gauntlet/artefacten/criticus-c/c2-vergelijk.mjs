// Criticus C2/C3/C5 — eigen schermafbeeldingen en DOM-metingen: elke tutorialstap naast hetzelfde klokmoment in race 1
// (zelfde keuzes: tablet uur 0, niets uur 2, spuit uur 5, tablet uur 9, zetpil uur 13), daarna eindkaartje,
// introkaartjes en een kort stuk race 2. Echte tikken, geen ?speed.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, HIER, MATEN, open, tik, dbg, wachtKlok, snap, verschil } from './lib.mjs';

const STAPPEN = [ // op = klokmoment waarop de tutorial stilstaat; knop; poortje (uur)
  { n: 1, op: -0.8, knop: 'slik', poort: 0 }, { n: 2, op: 1.5, knop: 'niets', poort: 2 }, { n: 3, op: 4.4, knop: 'spuit', poort: 5 },
  { n: 4, op: 8.5, knop: 'slik', poort: 9 }, { n: 5, op: 12.5, knop: 'zetpil', poort: 13 }];
const browser = await chromium.launch();
const alles = {};
for (const maat of MATEN) {
  const map = join(HIER, maat.naam); mkdirSync(map, { recursive: true });
  const fouten = [], S = {}, uit = { verschillen: {}, teksten: {} };
  const { ctx, page } = await open(browser, maat, fouten);
  const foto = async (naam) => { await page.screenshot({ path: join(map, naam + '.png') }); };
  const leg = async (naam) => { S[naam] = await snap(page); S[naam].dbg = await dbg(page); await foto(naam); };
  const introTekst = () => page.evaluate(() => ({ kop: document.querySelector('#intro-kop').textContent, verhaal: document.querySelector('#intro-verhaal').textContent,
    regels: [...document.querySelectorAll('#intro-regel li')].map((l) => l.textContent), qaly: document.querySelector('#intro-qaly').textContent,
    knop: document.querySelector('[data-actie="start-race"]').textContent,
    scrollt: document.querySelector('#scherm-intro').scrollHeight > document.querySelector('#scherm-intro').clientHeight + 1,
    knopOnder: Math.round(document.querySelector('[data-actie="start-race"]').getBoundingClientRect().bottom), hoogte: innerHeight }));

  await page.locator('[data-veld="naam"]').fill('Criticus');
  await foto('00-start');
  await tik(page, '[data-actie="start"]');
  // ---------- oefenronde ----------
  for (const st of STAPPEN) {
    await page.waitForFunction(() => window.SoS.debug.gids && window.SoS.debug.gids.bevroren, null, { polling: 'raf', timeout: 60000 });
    await page.waitForTimeout(700); // de zin is ingefaded
    await leg(`T${st.n}a`);
    const wijs = await page.locator('#knoppen .actie[data-wijs="1"]').getAttribute('data-actie');
    if (wijs !== st.knop) throw new Error('onverwachte markering ' + wijs);
    await tik(page, `#knoppen .actie[data-actie="${st.knop}"]`);
    await page.waitForTimeout(450); // tik-animatie (380 ms) voorbij
    await leg(`T${st.n}b`);
    await wachtKlok(page, st.poort + 0.45);
    await leg(`T${st.n}c`);
  }
  await page.waitForFunction(() => !document.querySelector('#finish').hidden, null, { timeout: 60000 });
  await page.waitForTimeout(800);
  await leg('T6-eindkaartje');
  await tik(page, '#finish [data-actie="verder"]');
  await page.waitForTimeout(700);
  uit.teksten.intro1 = await introTekst();
  await foto('intro-race-1');
  // ---------- race 1, zelfde keuzes ----------
  await tik(page, '[data-actie="start-race"]');
  await page.waitForFunction(() => window.SoS.debug.fase === 'race1');
  await page.waitForTimeout(700);
  for (const st of STAPPEN) {
    if (st.n > 1) await wachtKlok(page, st.op);
    await leg(`R${st.n}a`);
    await tik(page, `#knoppen .actie[data-actie="${st.knop}"]`);
    await page.waitForTimeout(450);
    await leg(`R${st.n}b`);
    await wachtKlok(page, st.poort + 0.45);
    await leg(`R${st.n}c`);
  }
  await wachtKlok(page, 14.2); await leg('R-misselijk-uur14');
  await tik(page, '#knoppen .actie[data-actie="slik"]'); await page.waitForTimeout(500); await leg('R-misselijk-tablet-getikt');
  await page.waitForFunction(() => !document.querySelector('#finish').hidden, null, { timeout: 120000 });
  await page.waitForTimeout(800);
  await leg('R6-eindkaartje');
  await tik(page, '#finish [data-actie="verder"]');
  await page.waitForTimeout(700);
  uit.teksten.intro2 = await introTekst();
  await foto('intro-race-2');
  // ---------- race 2, kort ----------
  await tik(page, '[data-actie="start-race"]');
  await page.waitForFunction(() => window.SoS.debug.fase === 'race2');
  await page.waitForTimeout(700);
  await leg('L1-begin');
  const r2 = [];
  const doe = async (actie, naam) => {
    await tik(page, `#knoppen .actie[data-actie="${actie}"]`); await page.waitForTimeout(450);
    const s = await snap(page); const d = await dbg(page);
    r2.push(`${naam}: keuzeregel="${s.tekst.keuze}" melding="${s.tekst.melding}" keuze=${d.poortje.keuze}×${d.poortje.aantal} badge=${await page.locator(`#knoppen .actie[data-actie="${actie}"]`).getAttribute('data-badge')}`);
    await foto(naam);
  };
  await doe('slik', 'L2-tablet-1x'); await doe('slik', 'L3-tablet-2x'); await doe('slik', 'L4-tablet-3e-tik');
  await doe('niets', 'L5-overslaan'); await doe('niets', 'L6-overslaan-2e-tik');
  await doe('slik', 'L7-tablet'); await doe('slik', 'L7b-tablet-2x');
  await wachtKlok(page, 3); await leg('L8-na-poortje-0');
  await doe('spuit', 'L9-spuit');
  await wachtKlok(page, 12); await leg('L10-dag0-12u');
  uit.race2 = r2;
  // ---------- vergelijken ----------
  for (const st of STAPPEN) for (const m of ['a', 'b', 'c']) {
    uit.verschillen[`stap${st.n}${m}`] = verschil(S[`T${st.n}${m}`], S[`R${st.n}${m}`], ['.dbg']);
  }
  uit.verschillen.eindkaartje = verschil(S['T6-eindkaartje'], S['R6-eindkaartje'], ['.dbg']);
  uit.verschillen.race2_tov_race1_begin = verschil(S['R1a'], S['L1-begin'], ['.dbg']);
  uit.fouten = fouten;
  uit.snaps = S;
  alles[maat.naam] = uit;
  console.log(`\n================ ${maat.naam} — consolefouten: ${fouten.length}`);
  console.log('INTRO 1:', JSON.stringify(uit.teksten.intro1, null, 1));
  console.log('INTRO 2:', JSON.stringify(uit.teksten.intro2, null, 1));
  for (const [k, v] of Object.entries(uit.verschillen)) { console.log(`--- ${k}: ${v.length} DOM-verschillen`); v.forEach((x) => console.log('   ' + x.slice(0, 330))); }
  console.log('RACE 2:\n' + r2.join('\n'));
  await ctx.close();
}
writeFileSync(join(HIER, 'c2-metingen.json'), JSON.stringify(alles, null, 1));
await browser.close();
