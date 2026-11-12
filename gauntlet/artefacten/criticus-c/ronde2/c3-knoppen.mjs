// C3(a): dezelfde reeks tikken in de tutorial en in race 1; vergelijk letterlijk keuzeregel, knopstanden en doelpoortje.
import { chromium, MATEN, open, tik, knop, dbg, wacht, regel, startTutorial, startRace1, HIER } from './lib.mjs';
import { writeFileSync } from 'node:fs';
const uit = []; const P = (s) => { console.log(s); uit.push(s); };
const browser = await chromium.launch();
for (const maat of MATEN) {
  const res = {};
  for (const soort of ['tut', 'race']) {
    const fouten = []; const { ctx, page } = await open(browser, maat, fouten);
    if (soort === 'tut') { await startTutorial(page); await page.waitForSelector('#knoppen [data-wijs="1"]'); } else await startRace1(page);
    const r = []; const doe = async (naam, k) => { await tik(page, knop(k)); await wacht(page, 60); const x = await regel(page); r.push({ naam, ...x }); if (naam.startsWith('*')) await page.screenshot({ path: `${HIER}/${maat.naam}/c3-${soort}-${naam.slice(1).replace(/\W+/g, '-')}.png` }); };
    // A. vóór poortje 0 (tutorial: klok staat stil; race: aanloop van 3 s loopt)
    await doe('*1 eerste tik Zetpil', 'zetpil');
    await doe('*2 tweede tik Zetpil (wissen)', 'zetpil');
    await doe('3 Spuit', 'spuit');
    await doe('*4 wisselen naar Niets', 'niets');
    await doe('5 Niets nog eens (wissen)', 'niets');
    await doe('6 Tablet', 'slik');
    await doe('*7 Tablet nog eens (wissen)', 'slik');
    await doe('8 Tablet', 'slik');
    // B. vlak na poortje 0: te laat?
    await page.waitForFunction(() => window.SoS.debug.poortje.index === 1, null, { polling: 'raf' });
    await doe('*9 Spuit direct na poortje 0', 'spuit');
    await wacht(page, 450);
    // C. terwijl de klok loopt (klok ±0,2; doel poortje 1)
    await doe('*10 Spuit terwijl klok loopt', 'spuit');
    await doe('11 wisselen naar Zetpil', 'zetpil');
    await doe('12 Zetpil nog eens (wissen)', 'zetpil');
    const d = await dbg(page);
    res[soort] = r; P(`${maat.naam} ${soort}: klok na reeks ${d.klok.toFixed(2)}, gegeven ${d.gegeven.join(',')}, consolefouten ${fouten.length}`);
    await ctx.close();
  }
  for (let i = 0; i < res.tut.length; i++) {
    const a = res.tut[i], b = res.race[i];
    const gelijk = a.keuze === b.keuze && a.keuzeKlasse === b.keuzeKlasse && a.knoppen === b.knoppen && a.doel === b.doel;
    P(`  ${gelijk ? 'GELIJK ' : 'ANDERS '} ${a.naam}`);
    P(`      tutorial: "${a.keuze}" [${a.keuzeKlasse}] doel ${a.doel} | klok ${a.klok} bevroren ${a.bevroren} wijs=${a.wijs} | zin: ${a.zin}`);
    P(`      race 1  : "${b.keuze}" [${b.keuzeKlasse}] doel ${b.doel} | klok ${b.klok}`);
    if (a.knoppen !== b.knoppen) { P('      knoppen tutorial: ' + a.knoppen); P('      knoppen race 1  : ' + b.knoppen); } else P('      knoppen (beide): ' + a.knoppen);
  }
}
await browser.close();
writeFileSync(`${HIER}/c3-knoppen-uitvoer.txt`, uit.join('\n'));
