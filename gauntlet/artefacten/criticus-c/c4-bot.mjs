// Criticus C4 — eigen bot: tikt UITSLUITEND op de knop die zichtbaar gemarkeerd is (witte rand), met echte
// tikken, zonder ?speed, en aan het eind op de knop van het eindkaartje. Meet de duur met de eigen stopwatch.
// De gemarkeerde knop wordt gevonden op wat een mens ziet (witte rand in de berekende stijl), niet via data-wijs.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, HIER, MATEN, open, tik, dbg } from './lib.mjs';

const browser = await chromium.launch();
const rapport = [];
for (const maat of MATEN) {
  const fouten = [];
  const { ctx, page } = await open(browser, maat, fouten);
  const log = [];
  await page.locator('[data-veld="naam"]').fill('Criticus');
  const t0 = Date.now();
  await tik(page, '[data-actie="start"]'); // tik 1: Start -> oefenronde
  let tikken = 1, laatsteZin = '', laatsteKeuze = '', klaar = false;
  const tikLog = [];
  while (!klaar && Date.now() - t0 < 200000) {
    const s = await page.evaluate(() => {
      const zichtbaar = (e) => e && !e.hidden && e.offsetWidth > 0;
      const gemarkeerd = [...document.querySelectorAll('#knoppen .actie')].filter((b) => getComputedStyle(b).borderTopColor === 'rgb(255, 255, 255)')
        .map((b) => ({ actie: b.dataset.actie, wijs: b.dataset.wijs || '', anim: getComputedStyle(b).animationName }));
      const m = document.querySelector('#melding'), k = document.querySelector('#keuze-info'), f = document.querySelector('#finish');
      return {
        fase: window.SoS.debug.fase, klok: window.SoS.debug.klok, gemarkeerd,
        zin: m.classList.contains('zicht') ? m.textContent : '', keuze: k.classList.contains('zicht') ? k.textContent : '',
        klokTekst: document.querySelector('#klok').textContent, lever: document.querySelector('#lever-tekst').textContent, qaly: document.querySelector('#qaly-getal').textContent,
        finish: zichtbaar(f) ? f.innerText.replace(/\n+/g, ' | ') : ''
      };
    });
    const nu = ((Date.now() - t0) / 1000).toFixed(1);
    if (s.zin !== laatsteZin) { log.push(`${nu}s  klok ${s.klok.toFixed(2)} (${s.klokTekst})  ZIN: "${s.zin}"  [dagteller: ${s.lever}; QALY ${s.qaly}]`); laatsteZin = s.zin; }
    if (s.keuze !== laatsteKeuze) { log.push(`${nu}s  klok ${s.klok.toFixed(2)}  keuzeregel: "${s.keuze}"`); laatsteKeuze = s.keuze; }
    if (s.finish) {
      log.push(`${nu}s  EINDKAARTJE: ${s.finish}`);
      await page.screenshot({ path: join(HIER, `c4-${maat.naam}-eindkaartje.png`) });
      await tik(page, '#finish [data-actie="verder"]'); tikken++;
      klaar = true; break;
    }
    if (s.gemarkeerd.length === 1) {
      await tik(page, `#knoppen .actie[data-actie="${s.gemarkeerd[0].actie}"]`); tikken++;
      tikLog.push(`${nu}s klok ${s.klok.toFixed(2)} tik op ${s.gemarkeerd[0].actie} (data-wijs=${s.gemarkeerd[0].wijs}, animatie=${s.gemarkeerd[0].anim})`);
      log.push(tikLog[tikLog.length - 1]);
      await page.waitForTimeout(60);
    } else if (s.gemarkeerd.length > 1) { log.push(`${nu}s  FOUT: ${s.gemarkeerd.length} knoppen tegelijk gemarkeerd`); await page.waitForTimeout(40); }
    else await page.waitForTimeout(40);
  }
  const duur = (Date.now() - t0) / 1000;
  await page.waitForTimeout(600);
  const d = await dbg(page);
  await page.screenshot({ path: join(HIER, `c4-${maat.naam}-na-oefenronde.png`) });
  rapport.push({ maat: maat.naam, doorgekomen: klaar && d.fase === 'intro1', faseNa: d.fase, duurStopwatch: duur, tutorialDuurSpel: d.tutorialDuur, tikken, fouten, log });
  console.log(`\n=== ${maat.naam}: doorgekomen=${klaar && d.fase === 'intro1'} fase=${d.fase} duur=${duur.toFixed(1)} s (spel zelf: ${d.tutorialDuur && d.tutorialDuur.toFixed(1)} s) tikken=${tikken} consolefouten=${fouten.length}`);
  console.log(log.join('\n'));
  await ctx.close();
}
writeFileSync(join(HIER, 'c4-bot-uitkomst.json'), JSON.stringify(rapport, null, 1));
await browser.close();
