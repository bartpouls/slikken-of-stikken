// C3(c): spelers die afwijken van de aanwijzing. Loopt de tutorial vast? Klopt de zin nog met het scherm?
import { chromium, MATEN, open, tik, knop, dbg, wacht, regel, startTutorial, HIER } from './lib.mjs';
import { writeFileSync } from 'node:fs';
const uit = []; const P = (s) => { console.log(s); uit.push(s); };
const browser = await chromium.launch();
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
writeFileSync(`${HIER}/c3-fout-tikken-uitvoer.txt`, uit.join('\n'));
