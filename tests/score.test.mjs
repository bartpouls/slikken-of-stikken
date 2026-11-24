// Tests voor src/score.js — draaien met: node tests/score.test.mjs
// Bots spelen headless via het live race-object (zoals de UI: spelklok in frames, keuze op elk poortje,
// misselijkheidsblokkade aan). Daarna: rangorde uit §6B, live = batch, framerate-onafhankelijkheid,
// opbouw-som, eindverslag, browser-lading.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const hier = path.dirname(fileURLToPath(import.meta.url));
const modelPad = path.join(hier, '..', 'src', 'model.js');
const scorePad = path.join(hier, '..', 'src', 'score.js');
const M = require(modelPad);
const S = require(scorePad);

let fouten = 0, checks = 0;
function check(ok, wat) {
  checks++;
  if (!ok) { fouten++; console.log('  FOUT: ' + wat); }
  return ok;
}
const kop = s => console.log('\n=== ' + s + ' ===');
const P = M.casus('paracetamol'), L = M.casus('lithium');

// ---------------------------------------------------------------------------------------------
// Bot-speler. Een bot is (race, t, index) -> lijst keuzes [{route, aantal?, anders?}] of [].
// 'anders' = wat de bot tikt als de eerste keuze geweigerd wordt (zoals een speler die na "Opa is
// misselijk" alsnog iets anders kiest). Frames: de spelklok loopt in stukjes (frame-patroon), zoals de UI.
// ---------------------------------------------------------------------------------------------
function frames(soort) {
  // geeft een functie die de volgende framestap (uur) levert; deterministisch
  if (soort === 'vast') return () => 1 / 60;
  let x = 12345;
  return () => { x = (x * 1103515245 + 12345) % 2147483648; return 0.003 + (x / 2147483648) * 0.4; };
}
// frameSoort 'vast': de speler loopt eerst met race.naar(poortjetijd) naar het poortje en geeft dan.
// frameSoort 'grillig': grillige frames die vlak vóór het poortje stoppen; de bot geeft met {index} en laat
// race.geef zelf naar het poortje lopen (het robuuste pad). Beide moeten bit-identiek uitkomen.
function speel(casus, bot, frameSoort = 'vast', opties) {
  const race = S.maakRace(casus, opties);
  const c = race.casus, tijden = M.poortjes(c), stapje = frames(frameSoort);
  const schaal = c.raceDuur / 24; // lithium: frames in verhouding (zelfde aantal frames per race)
  const metIndex = frameSoort !== 'vast';
  let klok = 0;
  tijden.forEach((tp, idx) => {
    if (metIndex) {
      for (let st = stapje() * schaal; klok + st < tp; st = stapje() * schaal) { klok += st; race.naar(klok); }
    } else {
      while (klok < tp - 1e-12) { klok = Math.min(tp, klok + stapje() * schaal); race.naar(klok); }
      race.naar(tp);
    }
    const keuzes = metIndex ? bot(kijk(race, tp), tp, idx) : bot(race, tp, idx);
    for (const k of keuzes) {
      const r = race.geef(k.route, metIndex ? { ...k, index: idx } : k);
      if (!r.ok && k.anders) race.geef(k.anders.route, metIndex ? { ...k.anders, index: idx } : k.anders);
    }
    klok = Math.max(klok, race.t);
  });
  while (!race.klaar) { klok += stapje() * schaal; race.naar(klok); }
  return race;
}

// In het 'grillig'-pad staat de race nog vlak vóór het poortje; de bot kijkt naar de toestand óp het
// poortje (zoals de speler die het poortje ziet aankomen), via een kopie die tot tp doorloopt.
function kijk(race, tp) {
  const k = kopie(race); k.naar(tp);
  return { sim: k, casus: race.casus, t: tp };
}

// Voorspelling voor slimme bots: kopie van de sim, zonder of met een extra dosis, tot t + h.
function kopie(race) {
  const s = race.sim;
  const k = M.maakSim(race.casus, { steadyState: false, t0: s.t, blokkades: false });
  k.C = s.C; k.depots = s.depots.map(d => ({ A: d.A, ka: d.ka })); k.log = s.log.slice();
  return k;
}

function voorspel(race, h, dosis) {
  const k = kopie(race);
  if (dosis) k.geef(dosis.route, dosis);
  const C = [];
  const n = Math.round(h / S.PUNTEN.DT);
  let p = 0;
  for (let i = 0; i < n; i++) {
    const t = race.t + i * S.PUNTEN.DT;
    const r = S.tempo(race.casus, k.C, t);
    p += (r.zone + r.laag + r.hoog + r.giftig) * S.PUNTEN.DT;
    C.push(k.C);
    k.naar(race.t + (i + 1) * S.PUNTEN.DT);
  }
  return { Ceind: k.C, punten: p, Cmin: Math.min(...C) };
}
const schemaTekst = sch => sch.map(x => x.t + ({ slik: '', spuit: 's', zetpil: 'z' })[x.route]).join(',');
const gegeven = race => race.sim.log.filter(l => l.ok).reduce((s, l) => s + l.dosis, 0);
const geblokt = (t, route = 'slik') => !!M.geblokkeerd(P, route, t);

// ---------------------------------------------------------------------------------------------
// Paracetamol-bots
// ---------------------------------------------------------------------------------------------
const op = (tijden, f) => (race, t) => (tijden.includes(t) ? f(t) : []);
const slik = { route: 'slik' }, spuit = { route: 'spuit' }, zetpil = { route: 'zetpil' };
const VIER = [0, 6, 12, 18];

const pBots = {
  // 1 g 4dd letterlijk: op 12 u tikt de bot "slik", dat wordt geweigerd (misselijk), en hij doet niets.
  'echt schema (letterlijk: slik 12 u geweigerd)': op(VIER, () => [slik]),
  // Wat een arts/verpleegkundige doet bij een misselijke patiënt na de operatie: dezelfde 1 g, maar iv
  // (casusblad: de zetpil is traag en wisselend, "daar kun je niet op rekenen"). Dit is "echt schema" in §6B.
  'echt schema (12 u spuit, zoals in de kliniek)': op(VIER, t => [t === 12 ? spuit : slik]),
  'spuit-variant': op(VIER, t => [t === 12 ? spuit : slik]),
  'zetpil-variant': op(VIER, t => [t === 12 ? zetpil : slik]),
  'gemiste dosis': op([0, 6, 18], () => [slik]),
  'niets': () => [],
  'elk uur slikken': () => [slik],
  // Slimme bots: doseer als de spiegel vóór het volgende poortje onder 5 zou zakken.
  'greedy drempel (slik, anders spuit)': (race, t) =>
    voorspel(race, 1).Ceind < 5 ? [geblokt(t) ? spuit : slik] : [],
  'greedy drempel, max 4 g': (race, t) =>
    gegeven(race) + 1000 <= 4000 && voorspel(race, 1).Ceind < 5 ? [geblokt(t) ? spuit : slik] : [],
  'greedy spuit, max 4 g': (race, t) =>
    gegeven(race) + 1000 <= 4000 && voorspel(race, 1).Ceind < 5 ? [spuit] : [],
  'greedy zetpil-reeks, max 4 g': (race, t) =>
    gegeven(race) + 1000 <= 4000 && voorspel(race, 1).Ceind < 5 ? [geblokt(t) ? zetpil : slik] : []
};

// Zoekbot: beste 4-dosesschema (4 g precies) over alle C(24,4) tijden × route {slik (spuit als
// geblokkeerd), spuit}. Zoeken op een grof raster (dt 0,05), daarna de top-20 exact naspelen.
function zoekBeste4g() {
  const kand = [];
  const dtz = 0.05;
  for (let a = 0; a < 24; a++) for (let b = a + 1; b < 24; b++) for (let c = b + 1; c < 24; c++) for (let d = c + 1; d < 24; d++) {
    for (let m = 0; m < 16; m++) {
      const sch = [a, b, c, d].map((t, i) => ({ t, route: (m >> i) & 1 ? 'spuit' : (geblokt(t) ? 'spuit' : 'slik') }));
      if (m && sch.every((s, i) => !((m >> i) & 1) || geblokt(s.t))) continue; // dubbel met m=0
      kand.push(sch);
    }
  }
  // grof scoren
  const k = Math.LN2 / P.Thalf, Vd = P.Vd, T = P.raceDuur, n = Math.round(T / dtz);
  const ka = P.routes.slik.ka, F = P.routes.slik.F, ek = Math.exp(-k * dtz), eka = Math.exp(-ka * dtz);
  const gA = ka / (Vd * (ka - k)) * (ek - eka);
  const scored = kand.map(sch => {
    let C = 0, A = 0, j = 0, p = 0;
    for (let i = 0; i < n; i++) {
      const t = i * dtz;
      while (j < sch.length && sch[j].t <= t + 1e-9) {
        if (sch[j].route === 'spuit') C += 1000 / Vd; else A += F * 1000;
        j++;
      }
      p += C >= 5 ? 1 : -(((5 - C) / 5) ** 2);
      C = C * ek + A * gA; A *= eka;
    }
    return { sch, p };
  }).sort((x, y) => y.p - x.p).slice(0, 20);
  let best = null;
  for (const { sch } of scored) {
    const race = speel(P, op(sch.map(s => s.t), t => [sch.find(s => s.t === t)]));
    if (!best || race.stand().exact.zone + race.stand().exact.laag > best.v) best = { sch, race, v: race.stand().exact.zone + race.stand().exact.laag };
  }
  return { best, aantalKandidaten: kand.length };
}

// ---------------------------------------------------------------------------------------------
// Lithium-bots
// ---------------------------------------------------------------------------------------------
const tK = L.gebeurtenissen.find(g => g.type === 'klaring').t;
const naIbuNr = t => Math.round((t - tK) / 24) + 1; // ochtendpoortjes vanaf t = 120 genummerd 1, 2, 3, ...
const och = t => t % 24 === 0; // ochtendpoortje (0 u); het avondpoortje is om 12 u
const mgL = n => (n ? [{ route: 'slik', aantal: n }] : []); // n retardtabletten van 400 mg
// Beste aantal tabletten (0–3) volgens een voorspelling over h uur
const besteL = (race, h) => [0, 1, 2, 3].reduce((b, n) => {
  const p = voorspel(race, h, n ? { route: 'slik', aantal: n } : undefined).punten;
  return p > b.p ? { n, p } : b;
}, { n: 0, p: -Infinity }).n;
const lBots = {
  'echt schema (vanaf dag 6 800 mg)': (race, t) => mgL(och(t) ? (t >= 144 ? 2 : 3) : 0),
  'verdeeld 400 + 800, na de ibuprofen 400 + 400': (race, t) => mgL(t >= 144 ? 1 : (och(t) ? 1 : 2)),
  'na de ibuprofen elke 3e overslaan': (race, t) => (!och(t) || (t >= tK && naIbuNr(t) % 3 === 0) ? [] : mgL(3)),
  'alles 1200 mg': (race, t) => mgL(och(t) ? 3 : 0),
  'na de ibuprofen 400 mg': (race, t) => mgL(och(t) ? (t >= 144 ? 1 : 3) : 0),
  'niets': () => [],
  'beide poortjes 1200 mg (2400 mg per dag)': () => mgL(3),
  // Slimme bots
  'drempel: 1200 mg als spiegel < 0,8': race => mgL(race.sim.C < 0.8 ? 3 : 0),
  'vooruitkijker (12 u, beste 0–1200 mg)': race => mgL(besteL(race, 12))
};

// ---------------------------------------------------------------------------------------------
kop('Paracetamol: bots (live gespeeld, blokkade aan)');
const pRes = {};
for (const [naam, bot] of Object.entries(pBots)) pRes[naam] = speel(P, bot);
const zoek = zoekBeste4g();
pRes['zoekbot: beste 4 g (' + zoek.best.sch.map(s => s.t + (s.route === 'spuit' ? 's' : '')).join(',') + ')'] = zoek.best.race;
// en die beste 4 g plus één extra gram op het beste moment: loont de 5e gram?
{
  let beste5 = null;
  for (let t = 0; t < 24; t++) {
    if (zoek.best.sch.some(s => s.t === t)) continue;
    const sch = [...zoek.best.sch, { t, route: geblokt(t) ? 'spuit' : 'slik' }];
    const race = speel(P, op(sch.map(s => s.t), tt => [sch.find(s => s.t === tt)]));
    if (!beste5 || race.stand().totaal > beste5.stand().totaal) beste5 = race;
  }
  pRes['zoekbot 4 g + beste 5e gram'] = beste5;
}
const boven4 = zoekBovenVierGram();
pRes['zoekbot >4 g: ' + schemaTekst(boven4.sch)] = boven4.race;
const criticus5 = [{ t: 0, route: 'spuit' }, { t: 4, route: 'slik' }, { t: 8, route: 'zetpil' }, { t: 14, route: 'zetpil' }, { t: 19, route: 'slik' }];
pRes['5 g: spuit 0, slik 4, zetpil 8+14, slik 19'] = speel(P, (r, t) => criticus5.filter(x => x.t === t));
pRes['5 g: 5x spuit (0,5,10,14,19)'] = speel(P, op([0, 5, 10, 14, 19], () => [spuit]));

// Zoekbot boven 4 g: bundelzoektocht (beam) over alle poortjes met keuzes {niets, slik (als het mag),
// zetpil (vaste reeks), spuit}, per totale dosis (5 t/m 24 g) de 120 beste deelschema's bewaard, gerangschikt
// op zone- en te-laag-punten (dus zónder leverstraf: zoekt de schema's die het meest aan pijnstilling winnen).
// De beste kandidaten worden daarna exact live nagespeeld, mét leverstraf.
function zoekBovenVierGram() {
  const dtz = 0.05, sub = Math.round(1 / dtz), W = 120, k = Math.LN2 / P.Thalf;
  let bundel = [{ C: 0, dep: [], p: 0, g: 0, sch: [] }];
  for (let t = 0; t < 24; t++) {
    const opties = [null, spuit, zetpil];
    if (!geblokt(t)) opties.push(slik);
    const nieuw = [];
    for (const st of bundel) for (const o of opties) {
      let C = st.C; const dep = st.dep.map(d => ({ A: d.A, ka: d.ka }));
      if (o && o.route === 'spuit') C += 1000 / P.Vd;
      else if (o) {
        const z = o.route === 'zetpil' ? M.zetpil(t) : { F: P.routes.slik.F, ka: P.routes.slik.ka };
        dep.push({ A: z.F * 1000, ka: z.ka });
      }
      let p = st.p;
      for (let i = 0; i < sub; i++) {
        const r = S.tempo(P, C, t + i * dtz);
        p += (r.zone + r.laag) * dtz;
        C = M.stapExact(C, dep, P.Vd, k, dtz);
      }
      nieuw.push({ C, dep, p, g: st.g + (o ? 1 : 0), sch: o ? [...st.sch, { t, route: o.route }] : st.sch });
    }
    const perG = new Map();
    for (const st of nieuw) { if (!perG.has(st.g)) perG.set(st.g, []); perG.get(st.g).push(st); }
    bundel = [];
    for (const lijst of perG.values()) bundel.push(...lijst.sort((a, b) => b.p - a.p).slice(0, W));
  }
  const kand = bundel.filter(st => st.g > 4).sort((a, b) => b.p - a.p).slice(0, 40);
  let best = null;
  for (const st of kand) {
    const race = speel(P, (r, t) => st.sch.filter(x => x.t === t));
    if (!best || race.stand().totaal > best.race.stand().totaal) best = { race, sch: st.sch };
  }
  return best;
}

function tabel(res) {
  const rij = (a, b, c, d, e, f, g) => console.log(a.padEnd(48) + b.padStart(7) + c.padStart(7) + d.padStart(7) + e.padStart(7) + f.padStart(8) + '  ' + g);
  rij('bot', 'totaal', 'zone', 'laag', 'hoog', 'lev/gif', 'toedieningen');
  for (const [naam, race] of Object.entries(res)) {
    const s = race.stand(), v = race.verslag();
    rij(naam, String(s.totaal), String(s.regels.zone), String(s.regels.laag), String(s.regels.hoog), String(s.regels.giftig),
      v.telling.toedienmomenten + 'x, ' + v.telling.totaleDosis.tekst);
  }
}
tabel(pRes);
console.log(`(zoekbot doorzocht ${zoek.aantalKandidaten} schema's van precies 4 g)`);

const sc = n => pRes[n].stand().totaal;
const hoogsteP = Math.max(...Object.values(pRes).map(r => r.stand().totaal));
const echt = 'echt schema (12 u spuit, zoals in de kliniek)';
const eisen = [];
function eis(naam, ok) { eisen.push([naam, ok]); check(ok, naam); }
eis('B1 echt schema = spuit-variant', sc(echt) === sc('spuit-variant'));
eis('B1 spuit-variant >= zetpil-variant', sc('spuit-variant') >= sc('zetpil-variant'));
eis('B1 zetpil-variant > gemiste dosis', sc('zetpil-variant') > sc('gemiste dosis'));
eis('B1 gemiste dosis > niets', sc('gemiste dosis') > sc('niets'));
eis('B1 elk uur slikken: leverschade', pRes['elk uur slikken'].verslag().telling.dagteller.over && pRes['elk uur slikken'].stand().regels.giftig < 0);
eis('B1 elk uur slikken < echt schema', sc('elk uur slikken') < sc(echt));
eis(`B1 echt schema >= 80% van hoogste botscore (${sc(echt)} / ${hoogsteP} = ${Math.round(100 * sc(echt) / hoogsteP)}%)`, sc(echt) >= 0.8 * hoogsteP);
{
  const meer = Object.entries(pRes).filter(([, r]) => r.verslag().telling.dagteller.over);
  const [bn, br] = meer.sort((a, b) => b[1].stand().totaal - a[1].stand().totaal)[0];
  eis(`LEAD: beste strategie boven 4 g (${bn}: ${br.stand().totaal}) < gemiste dosis (${sc('gemiste dosis')})`,
    br.stand().totaal < sc('gemiste dosis'));
  // Bovengrens, los van elke zoektocht: zone ≤ +1000, te laag ≤ 0, lever ≤ −(LEVER_SCHADE + LEVER_PER_GRAM).
  const grens = S.PUNTEN.ZONE - S.PUNTEN.LEVER_SCHADE - S.PUNTEN.LEVER_PER_GRAM;
  check(grens < sc('gemiste dosis'), `bovengrens elke >4 g-race: ${grens} < gemiste dosis`);
  console.log(`(bovengrens voor elke race boven 4 g: ${S.PUNTEN.ZONE} − ${S.PUNTEN.LEVER_SCHADE} − ${S.PUNTEN.LEVER_PER_GRAM} = ${grens})`);
}
check(sc('echt schema (letterlijk: slik 12 u geweigerd)') === sc('gemiste dosis'), 'letterlijk echt schema = gemiste dosis (slik op 12 u geweigerd)');
check(sc('zoekbot 4 g + beste 5e gram') < sc(Object.keys(pRes).find(n => n.startsWith('zoekbot: beste'))), '5e gram loont niet (leverstraf)');

// ---------------------------------------------------------------------------------------------
kop('Lithium: bots (live gespeeld)');
const lRes = {};
for (const [naam, bot] of Object.entries(lBots)) lRes[naam] = speel(L, bot);
tabel(lRes);
const sl = n => lRes[n].stand().totaal;
const laagsteL = Math.min(...Object.values(lRes).map(r => r.stand().totaal));
eis('B2 dosis verlagen (echt schema) > elke 3e overslaan', sl('echt schema (vanaf dag 6 800 mg)') > sl('na de ibuprofen elke 3e overslaan'));
eis('B2 elke 3e overslaan > alles 1200 mg', sl('na de ibuprofen elke 3e overslaan') > sl('alles 1200 mg'));
eis('B2 alles 1200 mg > niets', sl('alles 1200 mg') > sl('niets'));
eis('B2 beide poortjes 1200 mg: toxische zone', lRes['beide poortjes 1200 mg (2400 mg per dag)'].verslag().uren.toxisch > 0);
eis('B2 beide poortjes 1200 mg scoort het laagst (ook < niets)', sl('beide poortjes 1200 mg (2400 mg per dag)') === laagsteL && sl('beide poortjes 1200 mg (2400 mg per dag)') < sl('niets'));
const hoogsteL = Math.max(...Object.values(lRes).map(r => r.stand().totaal));
eis(`B2 echt schema >= 80% van hoogste botscore (${sl('echt schema (vanaf dag 6 800 mg)')} / ${hoogsteL})`, sl('echt schema (vanaf dag 6 800 mg)') >= 0.8 * hoogsteL);

kop('Eisen §6B (score)');
for (const [n, ok] of eisen) console.log((ok ? 'GEHAALD    ' : 'NIET       ') + n);

// ---------------------------------------------------------------------------------------------
kop('Live = batch, framerate-onafhankelijk, opbouw');
{
  let maxVerschil = 0, n = 0, frameOk = true, somOk = true, nulOk = true;
  const alle = [...Object.entries(pBots).map(([k, b]) => [P, k, b]), ...Object.entries(lBots).map(([k, b]) => [L, k, b])];
  for (const [c, naam, bot] of alle) {
    const a = speel(c, bot, 'vast'), b = speel(c, bot, 'grillig');
    const sa = a.stand(), sb = b.stand();
    for (const r of S.REGELS) if (sa.exact[r.id] !== sb.exact[r.id]) frameOk = false;
    // batch: zelfde keuzes (inclusief geweigerde pogingen) via M.simuleer
    const schema = a.sim.log.map(l => ({ t: l.t, route: l.route, aantal: l.aantal, F: l.F, ka: l.ka }));
    const batch = S.scoreSchema(c, schema);
    for (const r of S.REGELS) maxVerschil = Math.max(maxVerschil, Math.abs(batch.stand.exact[r.id] - sa.exact[r.id]));
    if (batch.stand.totaal !== sa.totaal) check(false, `live ≠ batch (afgerond) voor ${naam}`);
    const v = a.verslag();
    if (v.opbouw.regels.reduce((s, r) => s + r.punten, 0) !== v.opbouw.totaal) somOk = false;
    if (v.opbouw.regels.some(r => Object.is(r.punten, -0))) nulOk = false;
    if (JSON.stringify(v) !== JSON.stringify(batch.verslag)) check(false, `verslag live ≠ batch voor ${naam}`);
    n++;
  }
  console.log(`${n} bots: max. verschil live−batch per regel ${maxVerschil.toExponential(1)} punten; frames vast vs grillig identiek: ${frameOk}`);
  check(maxVerschil < 1e-6, 'live = batch (exact)');
  check(frameOk, 'framerate-onafhankelijk (bit-identiek)');
  check(somOk, 'som van afgeronde regels = totaal');
  check(nulOk, 'geen −0 in de opbouw');
}
{
  // Live stand loopt op en eindigt op dezelfde waarde als het verslag; tussenstand is een geheel getal.
  const race = S.maakRace('paracetamol');
  race.naar(3.3); const tussen = race.stand();
  check(Number.isInteger(tussen.totaal) && Math.abs(race.t - 3.3) < S.PUNTEN.DT, 'tussenstand geheel getal, race.t op raster');
  race.naar(1000); check(race.klaar && Math.abs(race.t - 24) < 1e-9, 'race stopt op de racelengte');
  check(S.scoreSchema('paracetamol', []).stand.totaal === -1000 && race.stand().totaal === -1000, 'niets = −1000 (hele race maximaal te laag)');
  // Leverstraf per gram boven 4 g, op het moment van toedienen
  const r2 = S.maakRace('paracetamol');
  const straf = [];
  for (let t = 0; t < 6; t++) { r2.naar(t); straf.push(r2.geef('slik').lever); }
  const LS = S.PUNTEN.LEVER_SCHADE, LG = S.PUNTEN.LEVER_PER_GRAM;
  check(JSON.stringify(straf) === JSON.stringify([0, 0, 0, 0, -LS - LG, -LG]), `leverstraf: 5e gram −${LS}−${LG}, 6e gram −${LG} (${straf})`);
  check(r2.stand().leverBeschadigd && r2.stand().regels.giftig === -LS - 2 * LG, 'leverstraf staat in de opbouwregel "lever / giftig"');
  const vl = r2.verslag().lever;
  check(vl.beschadigd && vl.gramBoven4g === 2 && vl.punten === -LS - 2 * LG, 'verslag.lever: ' + JSON.stringify(vl));
  // Na het einde van de race weigert geef (ook de spuit op t = 24)
  const r4 = S.maakRace('paracetamol');
  for (const t of [0, 6, 12, 18]) r4.geef(t === 12 ? 'spuit' : 'slik', { index: t });
  r4.naar(24);
  const voor = r4.stand().totaal, nLog = r4.sim.log.length;
  const na = r4.geef('spuit');
  const na2 = S.maakRace('paracetamol'); na2.naar(30);
  check(!na.ok && na.reden === 'voorbij' && na.lever === 0 && r4.stand().totaal === voor && r4.sim.log.length === nLog &&
    r4.verslag().tijdlijn[23].jij.soort === 'overgeslagen' && !na2.geef('slik', { index: 23 }).ok, 'geef na het einde van de race geweigerd, niet gelogd, geen straf');
  // geef met index/t zet de toediening exact op het poortje, ook als de UI de race niet eerst naar het poortje bracht
  const ra = S.maakRace('paracetamol'), rb = S.maakRace('paracetamol'), rc = S.maakRace('paracetamol');
  ra.naar(5.997); ra.geef('slik', { index: 6 }); ra.naar(24);
  rb.naar(5.997); rb.geef('slik', { t: 6 }); rb.naar(24);
  rc.naar(6); rc.geef('slik'); rc.naar(24);
  const rd = S.scoreSchema('paracetamol', [{ t: 6, route: 'slik' }]);
  check(ra.stand().exact.zone === rd.stand.exact.zone && rb.stand().exact.zone === rd.stand.exact.zone &&
    rc.stand().exact.zone === rd.stand.exact.zone && Math.abs(ra.sim.log[0].t - 6) < 1e-9, 'geef met {index} of {t} valt exact op het poortje (= batch)');
  const re = S.maakRace('paracetamol'); re.naar(6.2); const laat = re.geef('slik', { index: 6 });
  check(laat.ok && laat.laat === true, 'geef na het poortje: gegeven op race.t met res.laat = true');
  const r3 = S.maakRace('lithium'); r3.naar(0); const g = r3.geef('spuit');
  check(!g.ok && g.reden === 'onbekend', 'lithium heeft geen spuit');
}

// ---------------------------------------------------------------------------------------------
kop('Eindverslag');
{
  // Tijdlijn en telling
  const vL = pRes['echt schema (letterlijk: slik 12 u geweigerd)'].verslag();
  check(vL.tijdlijn.length === 24 && vL.tijdlijn[12].jij.soort === 'geblokkeerd' && vL.tijdlijn[12].jij.tekst === 'geblokkeerd' &&
    vL.tijdlijn.map(r => r.echt).join() === [0, 6, 12, 18].reduce((a, t) => (a[t] = '1 g', a), Array(24).fill(null)).join(),
    'tijdlijn: 12 u geblokkeerd; echt schema "1 g" op 0, 6, 12, 18 u, zonder route');
  {
    const r = S.maakRace('paracetamol');
    r.geef('spuit', { index: 0 }); r.geef('slik', { index: 0 }); r.geef('zetpil', { index: 1 }); r.naar(24);
    const j0 = r.verslag().tijdlijn[0].jij, j1 = r.verslag().tijdlijn[1].jij;
    check(j0.tekst === 'spuit + tablet' && j0.soorten.length === 2 && j0.soort === 'spuit' && j0.aantal === 1 &&
      j1.tekst === 'zetpil' && r.verslag().telling.toedienmomenten === 2, 'spuit + tablet op één poortje: beide getoond (' + j0.tekst + ')');
    const vLi = lRes['na de ibuprofen 400 mg'].verslag().tijdlijn;
    check(vLi[0].jij.tekst === '1.200 mg' && vLi[0].echt === '1.200 mg' && vLi[1].jij.soort === 'overgeslagen' && vLi[1].echt === null &&
      vLi[12].jij.tekst === '400 mg' && vLi[12].echt === '800 mg',
      'lithium: dosis in mg naast echt schema, avondpoortje leeg (' + vLi[12].jij.tekst + ' / ' + vLi[12].echt + ')');
  }
  check(vL.telling.toedienmomenten === 3 && vL.telling.totaleDosis.tekst === '3 g' && vL.telling.dagteller.tekst === '3 g van max. 4 g', 'telling paracetamol: ' + JSON.stringify(vL.telling));
  const vS = pRes['spuit-variant'].verslag();
  check(vS.tijdlijn[12].jij.soort === 'spuit' && vS.tijdlijn[13].jij.soort === 'overgeslagen' && vS.echtSchema.tekst === '1 g 4dd', 'tijdlijn spuit / overgeslagen, echt schema 1 g 4dd');
  const vE = pRes['elk uur slikken'].verslag();
  check(vE.telling.dagteller.over && vE.telling.totaleDosis.tekst === '18 g', 'elk uur slikken: 18 g, dagteller over 4 g');
  const vD = lRes['beide poortjes 1200 mg (2400 mg per dag)'].verslag();
  check(vD.tijdlijn.length === 20 && vD.tijdlijn[1].jij.aantal === 3 && vD.telling.totaleDosis.tekst === '24.000 mg', 'lithium beide poortjes: 2400 mg per dag, 24.000 mg');
  const vA = lRes['alles 1200 mg'].verslag();
  check(vA.tijdlijn[0].jij.soort === 'tablet' && vA.telling.totaleDosis.tekst === '12.000 mg' && vA.telling.toedienmomenten === 10 && !vA.telling.dagteller, 'lithium telling 12.000 mg, 10 momenten, geen dagteller');
  const vEc = lRes['echt schema (vanaf dag 6 800 mg)'].verslag();
  check(vEc.tijdlijn.every(r => (r.echt ? r.jij.tekst === r.echt : r.jij.soort === 'overgeslagen')) && /1\.200 mg per dag, later 800 mg per dag/.test(vEc.telling.perDag.grens), 'lithium echt schema: elk poortje gelijk aan het schema; ' + vEc.telling.perDag.grens);
  check(!('praktijk' in vS), 'verslag heeft geen praktijkzin meer');
  console.log('voorbeeld verslag (spuit-variant):', JSON.stringify({ opbouw: vS.opbouw, telling: vS.telling }));
}

// ---------------------------------------------------------------------------------------------
kop('Geen keuze (v2.2): poortje voorbij zonder keuze kost punten; live = batch; per dag');
{
  const G = S.PUNTEN.GEEN_KEUZE;
  const sch = [{ t: 0, route: 'slik' }, { t: 6, route: 'slik' }, { t: 12, route: 'spuit' }, { t: 18, route: 'slik' }];
  const zonder = S.scoreSchema(P, sch), met = S.scoreSchema(P, sch, { geenKeuze: [3, 4, 5] });
  check(met.stand.regels.keuze === -3 * G && met.stand.totaal === zonder.stand.totaal - 3 * G, 'drie poortjes zonder keuze: −3 × ' + G);
  check(met.verslag.tijdlijn[3].jij.soort === 'geenKeuze' && met.verslag.tijdlijn[3].jij.tekst === 'geen keuze' && met.verslag.telling.geenKeuze === 3, 'tijdlijn en telling tonen "geen keuze"');
  check(met.verslag.opbouw.regels.some((r) => r.id === 'keuze' && r.label === 'geen keuze' && r.punten === -3 * G), 'opbouwregel "geen keuze"');
  const race = S.maakRace(P);
  sch.forEach((d) => race.geef(d.route, { t: d.t }));
  [3, 4, 5].forEach((i) => { race.naar(M.poortjes(P)[i]); race.geenKeuze(i); });
  race.geenKeuze(3); // dubbel melden telt niet dubbel
  race.naar(24);
  check(race.stand().totaal === met.stand.totaal, 'live = batch met geen keuze (' + race.stand().totaal + ' / ' + met.stand.totaal + ')');
  check(zonder.verslag.telling.perDag.tekst === '4 g per dag' && /max\. 1 g per keer, 4 g per dag/.test(zonder.verslag.telling.perDag.grens), 'paracetamol per dag: ' + JSON.stringify(zonder.verslag.telling.perDag));
  const lAlles = S.scoreSchema(L, M.poortjes(L).filter((t) => t % 24 === 0).map((t) => ({ t, route: 'slik', aantal: 3 })));
  check(lAlles.verslag.telling.perDag.gemiddeld === 3 && lAlles.verslag.telling.perDag.dagen.length === 10 && /1\.200 mg/.test(lAlles.verslag.telling.perDag.tekst), 'lithium per dag: ' + lAlles.verslag.telling.perDag.tekst);
}

// ---------------------------------------------------------------------------------------------
kop('Bonusrace carbamazepine: rangorde en geleidelijk ophogen');
{
  const C3 = M.casus('carbamazepine'), PT = M.poortjes(C3);
  const sp = (f) => S.scoreSchema(C3, PT.map((t, i) => ({ t, route: 'slik', aantal: f(i, t) })).filter((x) => x.aantal));
  const echtSchema = C3.echtSchema.schema;
  const r = { echt: S.scoreSchema(C3, echtSchema), eenStap: sp((i, t) => (t >= 336 ? 2 : 1)),
    oplaad: S.scoreSchema(C3, echtSchema.map((e, i) => (i === 0 ? { ...e, aantal: 4 } : e))), nooit: sp(() => 1),
    dag7: sp((i, t) => (t >= 168 ? 2 : 1)), hoog: sp(() => 2), niets: sp(() => 0), achthonderd: sp(() => 4) };
  const sc = Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v.stand.totaal]));
  console.log('scores:', JSON.stringify(sc));
  check(sc.echt > sc.eenStap && sc.eenStap > sc.oplaad && sc.oplaad > sc.nooit && sc.nooit > sc.dag7 && sc.dag7 > sc.hoog &&
    sc.hoog > sc.niets && sc.niets > sc.achthonderd,
    'rangorde: geleidelijk > in één stap ophogen > oplaaddosis > nooit ophogen > dag 7 verdubbelen > meteen 400 > niets > 800 mg per keer');
  // casusblad (docs/bouwopdracht.md, casus 3): doorgerekende tabel
  const verwacht = { echt: 943, eenStap: 843, oplaad: 831, nooit: 798, dag7: 709, hoog: 334, niets: -1000, achthonderd: -2829 };
  check(Object.entries(verwacht).every(([k, v]) => sc[k] === v), 'scores = tabel casusblad ' + JSON.stringify(verwacht));
  // echt schema: 400 → 600 → 800 mg per dag
  const mgDag = (d) => echtSchema.filter((e) => Math.floor(e.t / 24) === d).reduce((a, e) => a + e.aantal * 200, 0);
  check(mgDag(0) === 400 && mgDag(6) === 400 && mgDag(7) === 600 && mgDag(13) === 600 && mgDag(14) === 800 && mgDag(27) === 800,
    'echt schema: 400 mg/dag, na 1 week 600, na 2 weken 800');
  // straf: alleen bij een te snelle stap, één keer per stap, -100
  check(r.echt.stand.regels.snel === 0 && r.eenStap.stand.regels.snel === -100 && r.oplaad.stand.regels.snel === -100 &&
    r.dag7.stand.regels.snel === -100 && r.hoog.stand.regels.snel === -100 && r.nooit.stand.regels.snel === 0,
    'strafpunten te snel opgehoogd');
  check(JSON.stringify(r.eenStap.verslag.teSnel) === JSON.stringify([{ dag: 14, mg: 800, toegestaan: 600 }]), 'te snelle stap op dag 14: 800 van max. 600 mg');
  // na een week niets mag je weer met 400 mg per dag beginnen
  const pauze = sp((i, t) => (t >= 168 && t < 336 ? 0 : 1));
  check(pauze.stand.regels.snel === 0, 'na een week zonder: weer starten met 400 mg per dag kost niets');
  // opbouw: zes regels bij carbamazepine, vijf bij paracetamol en lithium (§3)
  check(r.echt.verslag.opbouw.regels.length === 6 && r.echt.verslag.opbouw.regels[5].label === 'te snel opgehoogd' &&
    S.scoreSchema('lithium', []).verslag.opbouw.regels.length === 5 && S.scoreSchema('paracetamol', []).verslag.opbouw.regels.length === 5,
    'opbouwregel "te snel opgehoogd" alleen bij carbamazepine');
  // live = batch, ook voor de straf
  const race = S.maakRace(C3);
  PT.forEach((t, i) => { const n = (t >= 336 ? 2 : 1); race.geef('slik', { aantal: n, index: i }); });
  race.naar(C3.raceDuur);
  check(race.stand().totaal === sc.eenStap && race.stand().regels.snel === -100, 'live race = batch (' + race.stand().totaal + ')');
  check(M.venster(C3, 0).hoog === 8 && M.venster(C3, 200).hoog === 12, 'venster schuift: bovenkant 8 → 12 mg/L op dag 6');
  check(r.echt.verslag.tijdlijn[40].jij.tekst === '400 mg' && r.echt.verslag.tijdlijn[40].echt === '400 mg' &&
    r.echt.verslag.tijdlijn[14].echt === '400 mg' && r.echt.verslag.tijdlijn[15].echt === '200 mg', 'dosis in mg in de tijdlijn');
}

// ---------------------------------------------------------------------------------------------
kop('Browser-lading (<script>)');
{
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(readFileSync(modelPad, 'utf8'), ctx);
  const voor = new Set(Object.keys(ctx));
  vm.runInContext(readFileSync(scorePad, 'utf8'), ctx);
  const nieuw = Object.keys(ctx).filter(k => !voor.has(k));
  const Sb = ctx.window.SoS && ctx.window.SoS.score;
  const ok = !!Sb && Sb.scoreSchema('lithium', []).stand.totaal === S.scoreSchema('lithium', []).stand.totaal;
  console.log(`window.SoS.score aanwezig en rekent: ${ok}; extra globals: ${nieuw.length ? nieuw.join(',') : 'geen'}`);
  check(ok && nieuw.length === 0, 'browser-lading');
}

console.log(`\n${checks - fouten}/${checks} controles in orde` + (fouten ? `, ${fouten} FOUT` : ''));
process.exit(fouten ? 1 : 0);
