// Criticus C4/C3 — wat gebeurt er als je in de oefenronde op een andere knop tikt, of twee keer op dezelfde?
// En ter vergelijking: twee keer dezelfde knop in race 1. Plus enkele getallen (spuitsprong, zetpil 13).
import { join } from 'node:path';
import { chromium, HIER, MATEN, open, tik, dbg, wachtKlok, snap } from './lib.mjs';
const browser = await chromium.launch();
for (const maat of MATEN) {
  const fouten = [];
  const { ctx, page } = await open(browser, maat, fouten);
  const regel = async (wat) => { const s = await snap(page), d = await dbg(page); console.log(`${maat.naam} | ${wat} | klok ${d.klok.toFixed(2)} bevroren=${d.gids ? d.gids.bevroren : '-'} keuze=${d.poortje && d.poortje.keuze} | keuzeregel="${s.tekst.keuze}" | zin="${s.tekst.melding}"`); };
  await page.locator('[data-veld="naam"]').fill('Criticus');
  await tik(page, '[data-actie="start"]');
  await page.waitForTimeout(800);
  await tik(page, '#knoppen .actie[data-actie="zetpil"]'); await page.waitForTimeout(200);
  await regel('stap 1 stil, tik op Zetpil (niet gemarkeerd)');
  await page.screenshot({ path: join(HIER, maat.naam, 'fout-1-andere-knop.png') });
  await page.waitForTimeout(4000); await regel('4 s niets doen: klok staat nog stil?');
  await tik(page, '#demp'); await page.waitForTimeout(200); await regel('tik op dempknop');
  await tik(page, '#demp');
  await tik(page, '#knoppen .actie[data-actie="slik"]'); await page.waitForTimeout(300); await regel('tik op gemarkeerde Tablet');
  await tik(page, '#knoppen .actie[data-actie="slik"]'); await page.waitForTimeout(300); await regel('nog een keer Tablet (in race 1 = keuze wissen)');
  await page.screenshot({ path: join(HIER, maat.naam, 'fout-2-tweede-tik.png') });
  await tik(page, '#knoppen .actie[data-actie="niets"]'); await page.waitForTimeout(300); await regel('tik op Niets terwijl klok loopt');
  await wachtKlok(page, 0.3); await regel('na poortje 0');
  console.log(`${maat.naam} | gegeven op poortje 0: ${(await dbg(page)).gegeven[0]}`);
  // getallen: spuitsprong op uur 5
  await page.waitForFunction(() => window.SoS.debug.gids.bevroren); await tik(page, '#knoppen .actie[data-wijs="1"]');
  await page.waitForFunction(() => window.SoS.debug.klok > 2.2 && window.SoS.debug.gids.bevroren); await tik(page, '#knoppen .actie[data-wijs="1"]');
  await wachtKlok(page, 4.97); const voor = await dbg(page);
  await wachtKlok(page, 5.0001); const na = await dbg(page);
  console.log(`${maat.naam} | spuit: C ${voor.C.toFixed(3)} (klok ${voor.klok.toFixed(3)}) -> ${na.C.toFixed(3)} (klok ${na.klok.toFixed(3)}); sprong ≈ ${(na.C - voor.C).toFixed(2)} mg/L`);
  console.log(`${maat.naam} | zetpil(13) = ${JSON.stringify(await page.evaluate(() => window.SoS.model.zetpil(13)))}; reeks binnen 0,3–0,9 / 0,3–1,0: ${await page.evaluate(() => window.SoS.model.ZETPIL_REEKS.every((z) => z.F >= 0.3 && z.F <= 0.9 && z.ka >= 0.3 && z.ka <= 1.0))}`);
  console.log(`${maat.naam} | consolefouten: ${fouten.length}`);
  await ctx.close();
  // race 1: twee keer dezelfde knop
  const f2 = []; const o = await open(browser, maat, f2); const p = o.page;
  await tik(p, '[data-actie="start-over"]'); await p.waitForTimeout(600); await tik(p, '[data-actie="start-race"]'); await p.waitForTimeout(600);
  const r = async (wat) => { const s = await snap(p), d = await dbg(p); console.log(`${maat.naam} RACE 1 | ${wat} | keuze=${d.poortje.keuze} | keuzeregel="${s.tekst.keuze}"`); };
  await tik(p, '#knoppen .actie[data-actie="slik"]'); await p.waitForTimeout(250); await r('Tablet');
  await tik(p, '#knoppen .actie[data-actie="slik"]'); await p.waitForTimeout(250); await r('nog een keer Tablet');
  await tik(p, '#knoppen .actie[data-actie="spuit"]'); await p.waitForTimeout(250); await r('Spuit');
  await tik(p, '#knoppen .actie[data-actie="zetpil"]'); await p.waitForTimeout(250); await r('dan Zetpil (wisselen)');
  await o.ctx.close();
}
await browser.close();
