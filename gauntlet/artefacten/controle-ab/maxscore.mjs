// Hoe hoog kan een bot in race 1 komen? (toets op "echt schema ≥ 80% van de hoogste botscore")
import { createRequire } from 'node:module';
const S = createRequire(import.meta.url)('../../../src/score.js');
const routes = (t) => (t >= 10 && t < 16 ? ['zetpil', 'spuit'] : ['slik', 'zetpil', 'spuit']);
let best = { s: -1e9 }; let n = 0;
// grof (dt 0,05) over alle 4-dosis-schema's, daarna de top 30 exact
const top = [];
for (let a = 0; a < 24; a++) for (let b = a + 1; b < 24; b++) for (let c = b + 1; c < 24; c++) for (let d = c + 1; d < 24; d++) {
  if (b - a < 3 || c - b < 3 || d - c < 3) continue; // dichter op elkaar is nooit beter
  for (const ra of routes(a)) for (const rb of routes(b)) for (const rc of routes(c)) for (const rd of routes(d)) {
    const sch = [{ t: a, route: ra }, { t: b, route: rb }, { t: c, route: rc }, { t: d, route: rd }];
    const s = S.scoreSchema('paracetamol', sch, { dt: 0.05 }).stand.totaal; n++;
    top.push({ s, sch }); 
  }
}
top.sort((x, y) => y.s - x.s);
const ex = top.slice(0, 30).map((x) => ({ s: S.scoreSchema('paracetamol', x.sch).stand.totaal, sch: x.sch.map((e) => e.t + e.route[0]).join(' ') })).sort((x, y) => y.s - x.s);
console.log(n, 'schema\'s; beste (exact):', ex.slice(0, 5));
const echt = S.scoreSchema('paracetamol', [{ t: 0, route: 'slik' }, { t: 6, route: 'slik' }, { t: 12, route: 'spuit' }, { t: 18, route: 'slik' }]).stand.totaal;
console.log('echt (12 u spuit):', echt, '=', (100 * echt / ex[0].s).toFixed(1) + '% van het maximum met 4 doses');
const echtZ = S.scoreSchema('paracetamol', [{ t: 0, route: 'slik' }, { t: 6, route: 'slik' }, { t: 12, route: 'zetpil' }, { t: 18, route: 'slik' }]).stand.totaal;
console.log('echt (12 u zetpil):', echtZ, '=', (100 * echtZ / ex[0].s).toFixed(1) + '%');
