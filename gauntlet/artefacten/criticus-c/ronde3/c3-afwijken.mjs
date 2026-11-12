// C3(c) ronde 3: spelers die afwijken van de aanwijzing. ?speed=3 (alleen hier).
// Per scenario: elke zin met klok / spiegel / dagteller, elke markering met de dagteller op dat moment,
// OVERTREDING als een dosisknop gemarkeerd is terwijl dagteller + 1 g > 4 g, leverzin bij elke overschrijding,
// vastlopen (geen einde binnen 90 s).
import { chromium, MATEN, open, tik, knop, wacht, log, startTutorial, HIER } from './lib.mjs';
import { writeFileSync } from 'node:fs';
const uit = []; const P = (s) => { console.log(s); uit.push(s); };
const browser = await chromium.launch();
const LEVERZIN = 'Te veel paracetamol beschadigt de lever.';
const kijk = (page) => page.evaluate(() => {
  const d = window.SoS.debug, m = document.querySelector('#melding');
  return { fase: d.fase, klaar: d.klaar, klok: d.klok, C: d.C, dag: d.dagteller, poortje: d.poortje, gids: d.gids, gegeven: d.gegeven,
    wijs: [...document.querySelectorAll('#knoppen .wijs')].map((b) => b.dataset.actie).join(','),
    zin: m.classList.contains('zicht') ? m.textContent : '', lever: document.querySelector('#lever').className, leverTekst: document.querySelector('#lever-tekst').textContent, qaly: document.querySelector('#qaly-getal').textContent };
});
const samenvatting = [];
async function scenario(maat, code, naam, extra, opts = {}) {
  const fouten = []; const { ctx, page } = await open(browser, maat, fouten, '?speed=3');
  await startTutorial(page); const t0 = Date.now(); const gedaan = new Set();
  P(`\n### ${code} (${maat.naam}) — ${naam}`);
  let vorigWijs = '', vorigZin = '', overtredingen = 0, vast = false, vorigDag = 0, overschrijdingen = [], reeks = [], fotoN = 0, gevraagd = [];
  for (;;) {
    const s = await kijk(page);
    if (s.klaar || s.fase !== 'tutorial') break;
    if (Date.now() - t0 > 90000) { vast = true; P('  !! VASTGELOPEN na 90 s: ' + JSON.stringify(s)); break; }
    reeks.push([Math.round(s.klok * 100) / 100, Math.round(s.C * 100) / 100]);
    if (s.dag !== vorigDag) { if (s.dag > 4000) overschrijdingen.push({ klok: s.klok, dag: s.dag }); P(`  dagteller ${vorigDag / 1000} -> ${s.dag / 1000} g op klok ${s.klok.toFixed(2)} (${s.leverTekst}; lever-klasse "${s.lever}")`); vorigDag = s.dag; }
    if (s.wijs !== vorigWijs) {
      if (s.wijs) {
        const dosis = ['slik', 'zetpil', 'spuit'].includes(s.wijs);
        const over = dosis && s.dag + 1000 > 4000;
        if (over) overtredingen++;
        gevraagd.push(s.wijs + '@' + (s.poortje ? s.poortje.index : '?'));
        P(`  MARKERING ${s.wijs} voor poortje ${s.poortje && s.poortje.index} op klok ${s.klok.toFixed(2)}, dagteller ${s.dag / 1000} g, spiegel ${s.C.toFixed(2)}, zin "${s.zin}"${over ? '  <<< OVERTREDING: gevraagde dosis brengt dagteller boven 4 g' : ''}`);
      }
      vorigWijs = s.wijs;
    }
    if (s.zin !== vorigZin && s.zin) {
      vorigZin = s.zin;
      if (opts.fotoZin && opts.fotoZin.some((z) => s.zin.startsWith(z))) { await wacht(page, 120); await page.screenshot({ path: `${HIER}/${maat.naam}/c3-${code}-zin${++fotoN}-klok${s.klok.toFixed(1)}.png` }); }
    }
    const a = s.poortje ? extra(s, gedaan) : null;
    if (a) { await tik(page, knop(a)); P(`  eigen tik: ${a} voor poortje ${s.poortje.index} op klok ${s.klok.toFixed(2)} (dagteller ${s.dag / 1000} g)`); await wacht(page, 30); continue; }
    if (s.wijs && !opts.negeerMarkering) { await tik(page, knop(s.wijs)); await wacht(page, 40); } else await wacht(page, 15);
  }
  const e = await kijk(page);
  await page.screenshot({ path: `${HIER}/${maat.naam}/c3-${code}-einde.png` });
  const finish = await page.evaluate(() => document.querySelector('#finish').hidden ? '(niet zichtbaar)' : document.querySelector('#finish').innerText.replace(/\n+/g, ' | '));
  const L = await log(page);
  const zinnen = L.filter((x) => x.wat === 'melding' && x.tekst);
  zinnen.forEach((x) => P(`     ZIN klok ${x.klok} spiegel ${x.C} dagteller ${x.dag / 1000} g: "${x.tekst}" [${x.klasse.replace(/melding|zicht/g, '').trim()}]`));
  L.filter((x) => x.wat === 'keuze-info' && x.tekst).forEach((x) => P(`     keuze klok ${x.klok} dagteller ${x.dag / 1000} g: "${x.tekst}"`));
  // leverzin bij elke overschrijding? (zin binnen 0,6 uur na de dosis)
  const leverOk = overschrijdingen.map((o) => ({ klok: Math.round(o.klok * 100) / 100, dag: o.dag, zin: zinnen.some((z) => z.tekst === LEVERZIN && z.klok >= o.klok - 0.3 && z.klok <= o.klok + 0.6) }));
  // "Je lichaam ruimt het op" terwijl de spiegel stijgt? "De pijn is weg" onder de streep? "Au" boven de streep?
  const past = [];
  for (const z of zinnen) {
    const na = reeks.find((r) => r[0] >= z.klok + 0.3);
    if (z.tekst.startsWith('Je lichaam ruimt') && na && na[1] > z.C + 0.05) past.push(`"${z.tekst}" op klok ${z.klok}: spiegel stijgt daarna (${z.C} -> ${na[1]} op klok ${na[0]})`);
    if (z.tekst.startsWith('De pijn is weg') && z.C < 5) past.push(`"${z.tekst}" bij spiegel ${z.C} (< 5)`);
    if (z.tekst.startsWith('Au.') && z.C >= 5.05) past.push(`"${z.tekst}" bij spiegel ${z.C} (>= 5)`);
    if (z.tekst.startsWith('De dagteller is vol') && z.dag < 4000) past.push(`"${z.tekst}" bij dagteller ${z.dag / 1000} g`);
  }
  P(`  einde na ${((Date.now() - t0) / 1000).toFixed(1)} s: klok ${e.klok.toFixed(2)}, gegeven ${e.gegeven.join(',')}, dagteller ${e.dag / 1000} g, QALY ${e.qaly}, lever "${e.lever}" | eindkaartje: ${finish} | consolefouten ${fouten.length} ${fouten.join(' / ')}`);
  P(`  gevraagd (markeringen): ${gevraagd.join(' ')} | OVERTREDINGEN (dosis gevraagd boven 4 g): ${overtredingen} | vastgelopen: ${vast ? 'JA' : 'nee'}`);
  P(`  overschrijdingen door de speler + leverzin erbij: ${JSON.stringify(leverOk)}`);
  P(`  zin past niet bij scherm: ${past.length ? past.join(' ;; ') : 'geen gevonden (automatische controle)'}`);
  samenvatting.push(`${code} ${maat.naam}: overtredingen ${overtredingen}, vast ${vast ? 'JA' : 'nee'}, overschrijdingen ${leverOk.length} (leverzin bij ${leverOk.filter((x) => x.zin).length}), past-niet ${past.length}, gegeven ${e.gegeven.join(',')}, einddagteller ${e.dag / 1000} g`);
  await ctx.close();
}
// eenmalige eigen tik op bepaalde poortjes: {poortje: knop}
const opPoortjes = (kaart) => (s, g) => { const p = s.poortje.index; return (kaart[p] && s.poortje.open && s.poortje.keuze !== kaart[p] && !g.has(p) && s.klok > p - 0.75 && !(s.gids && s.gids.bevroren)) ? (g.add(p), kaart[p]) : null; };
const [M375, M390] = MATEN;
const VOL = ['De dagteller is vol', 'Te veel paracetamol'];
const SC = [
  ['A1', 'één extra spuit op poortje 1 (vroeg)', opPoortjes({ 1: 'spuit' })],
  ['A2', 'één extra zetpil op poortje 7 (laat)', opPoortjes({ 7: 'zetpil' })],
  ['A3', 'één extra tablet op poortje 11 (laat)', opPoortjes({ 11: 'slik' })],
  ['A4', 'drie extra tabletten op poortje 1, 3 en 4 (meerdere, vroeg)', opPoortjes({ 1: 'slik', 3: 'slik', 4: 'slik' })],
  ['A5', 'tablet op elk niet-gevraagd poortje', opPoortjes({ 1: 'slik', 3: 'slik', 4: 'slik', 6: 'slik', 7: 'slik', 8: 'slik', 10: 'slik', 11: 'slik', 12: 'slik', 14: 'slik', 15: 'slik' })],
  ['A6', 'extra spuit op poortje 4, precies vóór stap 3 (spuit op 5)', opPoortjes({ 4: 'spuit' })],
  ['A7', 'extra tablet op poortje 8, precies vóór stap 4 (tablet op 9)', opPoortjes({ 8: 'slik' })],
  ['A8', 'extra zetpil op poortje 12, precies vóór stap 5 (zetpil op 13)', opPoortjes({ 12: 'zetpil' })],
  ['A9', 'aanwijzing gevolgd, daarna zelf spuit op poortje 14 en 15 (speler gaat zelf over 4 g)', opPoortjes({ 14: 'spuit', 15: 'spuit' })],
  ['A10', 'extra spuit op poortje 1; stap 5 vervalt; speler geeft op poortje 13 toch zelf een zetpil', opPoortjes({ 1: 'spuit', 13: 'zetpil' })],
  ['A11', 'extra tabletten op poortje 3 en 4, vlak vóór stap 3', opPoortjes({ 3: 'slik', 4: 'slik' })],
  ['A12', 'extra spuit op 6, 7 en 8 (dagteller al 5 g vóór stap 4)', opPoortjes({ 6: 'spuit', 7: 'spuit', 8: 'spuit' })],
];
const alleen = process.argv.slice(2);
for (let i = 0; i < SC.length; i++) {
  const [code, naam, f] = SC[i];
  if (alleen.length && !alleen.includes(code)) continue;
  await scenario(i % 2 ? M390 : M375, code, naam, f, { fotoZin: VOL });
}
P('\n=== SAMENVATTING ===\n' + samenvatting.join('\n'));
await browser.close();
writeFileSync(`${HIER}/c3-afwijken-uitvoer${alleen.length ? '-' + alleen.join('-') : ''}.txt`, uit.join('\n'));
