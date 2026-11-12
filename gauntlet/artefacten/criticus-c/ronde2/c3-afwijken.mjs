// C3(c): spelers die afwijken van de aanwijzing. Loopt de tutorial vast? Klopt de zin nog met het scherm?
import { chromium, MATEN, open, tik, knop, dbg, wacht, regel, log, startTutorial, HIER } from './lib.mjs';
import { writeFileSync } from 'node:fs';
const uit = []; const P = (s) => { console.log(s); uit.push(s); };
const browser = await chromium.launch();
const toon = (l) => l.filter((x) => x.tekst).forEach((x) => P(`     ${x.wat === 'melding' ? 'ZIN  ' : 'keuze'} klok ${x.klok} C ${x.C} dagteller ${x.dag / 1000} g: "${x.tekst}" [${x.klasse.replace(/melding|keuze-info|zicht/g, '').trim()}]`));
const staat = (page) => page.evaluate(() => { const d = window.SoS.debug; return { klok: Math.round(d.klok * 100) / 100, C: Math.round(d.C * 10) / 10, dag: d.dagteller, lever: document.querySelector('#lever').className, leverTekst: document.querySelector('#lever-tekst').textContent, zin: document.querySelector('#melding').classList.contains('zicht') ? document.querySelector('#melding').textContent : '(geen)', portret: document.querySelector('#patient-kop svg path[stroke="#a6d96a"]') ? 'misselijk' : 'niet-misselijk', qaly: document.querySelector('#qaly').textContent, gegeven: d.gegeven.join(','), fase: d.fase, klaar: d.klaar }; });

async function scenario(maat, naam, extra, fotos) {
  const fouten = []; const { ctx, page } = await open(browser, maat, fouten);
  await startTutorial(page); const t0 = Date.now(); let fi = 0; const gedaan = new Set();
  P(`\n### ${maat.naam} — ${naam}`);
  for (;;) {
    const d = await dbg(page);
    if (d.klaar || d.fase !== 'tutorial') break;
    if (Date.now() - t0 > 150000) { P('  !! NIET KLAAR NA 150 s: VASTGELOPEN? ' + JSON.stringify(await staat(page))); break; }
    while (fi < fotos.length && d.klok >= fotos[fi]) { const s = await staat(page); await page.screenshot({ path: `${HIER}/${maat.naam}/c3-${naam.split(' ')[0]}-klok${fotos[fi]}.png` }); P(`  foto klok ${fotos[fi]}: ${JSON.stringify(s)}`); fi++; }
    const a = d.poortje ? extra(d, gedaan) : null;
    if (a) { await tik(page, knop(a)); P(`  afwijkende tik: ${a} voor poortje ${d.poortje.index} op klok ${d.klok.toFixed(2)}`); await wacht(page, 40); continue; }
    const w = await page.$('#knoppen [data-wijs="1"]');
    if (w) { const b = await w.boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await wacht(page, 60); } else await wacht(page, 30);
  }
  const s = await staat(page); await page.screenshot({ path: `${HIER}/${maat.naam}/c3-${naam.split(' ')[0]}-einde.png` });
  P(`  einde na ${((Date.now() - t0) / 1000).toFixed(1)} s: ${JSON.stringify(s)} | eindkaartje: ${await page.evaluate(() => document.querySelector('#finish').hidden ? '(niet zichtbaar)' : document.querySelector('#finish').innerText.replace(/\n+/g, ' | '))} | consolefouten ${fouten.length}`);
  toon(await log(page));
  await ctx.close();
}
const eenmaal = (poort, k) => (d, g) => (d.poortje.index === poort && d.poortje.keuze == null && d.poortje.open && !g.has(poort) && d.klok > poort - 0.75) ? (g.add(poort), k) : null;
const M375 = MATEN[0], M390 = MATEN[1];
// S1: één nieuwsgierige extra tik: spuit op poortje 1 (niet gevraagd). Verder precies de aanwijzing.
await scenario(M375, 'S1 één extra spuit op poortje 1', eenmaal(1, 'spuit'), [1.6, 4.5, 8.6, 9.3, 12.6, 13.3, 15]);
// S2: extra zetpil op poortje 7 (tussen stap 3 en 4)
await scenario(M390, 'S2 één extra zetpil op poortje 7', eenmaal(7, 'zetpil'), [8.6, 9.3, 12.6, 13.3, 15]);
// S3: extra tablet op elk niet-gevraagd poortje
const GEVRAAGD = new Set([0, 2, 5, 9, 13]);
await scenario(M375, 'S3 tablet op elk niet-gevraagd poortje', (d, g) => (!GEVRAAGD.has(d.poortje.index) && d.poortje.keuze == null && d.poortje.open && !g.has(d.poortje.index) && d.klok > d.poortje.index - 0.75) ? (g.add(d.poortje.index), 'slik') : null, [1.6, 4.5, 5.3, 8.6, 9.3, 12.6, 13.3, 15]);
// S4: de gevraagde keuze al vooraf klaarzetten (Niets voor poortje 2 op klok 1,2)
await scenario(M375, 'S4 Niets vooraf gekozen voor poortje 2', (d, g) => (d.poortje.index === 2 && d.klok > 1.15 && d.klok < 1.45 && d.poortje.keuze == null && !g.has('x')) ? (g.add('x'), 'niets') : null, [1.6]);

// S5: fout tikken, wachten, wisselen vlak voor het poortje, wissen: blijft de klok staan, komt de markering terug?
for (const maat of MATEN) {
  const fouten = []; const { ctx, page } = await open(browser, maat, fouten);
  await startTutorial(page); P(`\n### ${maat.naam} — S5 fout tikken / wisselen / wissen per stap`);
  const STAPPEN = [['slik', 0], ['niets', 2], ['spuit', 5], ['slik', 9], ['zetpil', 13]];
  for (const [goed, poort] of STAPPEN) {
    await page.waitForSelector('#knoppen [data-wijs="1"]');
    const r0 = await regel(page);
    for (const k of ['slik', 'zetpil', 'spuit', 'niets'].filter((x) => x !== goed)) { await tik(page, knop(k)); await wacht(page, 80); }
    await wacht(page, 2500);
    const r1 = await regel(page);
    P(`  stap ${goed}@${poort}: na 3 foute tikken + 2,5 s: klok ${r0.klok} -> ${r1.klok}, bevroren ${r1.bevroren}, wijs=${r1.wijs}, doel ${r1.doel}, zin "${r1.zin}"`);
    await tik(page, knop(goed)); await wacht(page, 60);
    const r2 = await regel(page);
    await page.waitForFunction((p) => window.SoS.debug.klok >= p - 0.12, poort, { polling: 'raf' });
    const fout = goed === 'spuit' ? 'slik' : 'spuit';
    await tik(page, knop(fout)); await wacht(page, 1500);
    const r3 = await regel(page);
    await page.screenshot({ path: `${HIER}/${maat.naam}/c3-S5-gewisseld-voor-poortje${poort}.png` });
    P(`     goed getikt: bevroren ${r2.bevroren} "${r2.keuze}"; vlak voor het poortje gewisseld naar ${fout}: klok ${r3.klok} (1,5 s later nog steeds vóór ${poort}: ${r3.klok < poort}), bevroren ${r3.bevroren}, wijs=${r3.wijs}, doel ${r3.doel}, zin "${r3.zin}"`);
    await tik(page, knop(fout)); await wacht(page, 800); const r4 = await regel(page); // wissen
    P(`     zelfde knop nog eens (wissen): "${r4.keuze}" bevroren ${r4.bevroren}, wijs=${r4.wijs}, klok ${r4.klok}`);
    await tik(page, knop(goed));
    await page.waitForFunction((p) => window.SoS.debug.klok >= p + 0.2, poort, { polling: 'raf', timeout: 20000 });
    const d = await dbg(page); P(`     daarna goed: poortje ${poort} gaf ${d.gegeven[poort]}, zin "${d.gids.zin}"`);
  }
  await page.waitForSelector('#finish:not([hidden])', { timeout: 60000 });
  const d = await dbg(page); P(`  klaar: gegeven ${d.gegeven.join(',')} dagteller ${d.dagteller} tutorialDuur ${d.tutorialDuur} consolefouten ${fouten.length}`);
  await ctx.close();
}
await browser.close();
writeFileSync(`${HIER}/c3-afwijken-uitvoer.txt`, uit.join('\n'));
