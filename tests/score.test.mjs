// Tests voor src/score.js — draaien met: node tests/score.test.mjs
// Bots spelen headless via het live race-object (zoals de UI: spelklok in frames, keuze op elk poortje,
// misselijkheidsblokkade aan). Daarna: rangorde uit §6B, live = batch, framerate-onafhankelijkheid,
// opbouw-som, eindverslag en praktijkzinnen, browser-lading.
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
const naIbuNr = t => Math.round((t - tK) / 8) + 1; // poortjes vanaf t = 120 genummerd 1, 2, 3, ...
const lBots = {
  'na de ibuprofen elke 3e overslaan': (race, t) => (t >= tK && naIbuNr(t) % 3 === 0 ? [] : [slik]),
  'alles slikken': () => [slik],
  'alles slikken + spuitknop': () => [spuit, slik], // spuitknop: geen effect, geen strafpunten
  'niets': () => [],
  'elk poortje dubbel': () => [{ route: 'slik', aantal: 2 }],
  // Slimme bots
  'drempel: slik als spiegel < 0,8': race => (race.sim.C < 0.8 ? [slik] : []),
  'vooruitkijker (8 u, met/zonder)': race =>
    (voorspel(race, 8, slik).punten >= voorspel(race, 8).punten ? [slik] : []),
  'vooruitkijker (24 u, met/zonder)': race =>
    (voorspel(race, 24, slik).punten >= voorspel(race, 24).punten ? [slik] : [])
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
  rij('bot', 'totaal', 'zone', 'laag', 'hoog', 'lev/gif', 'toedieningen / praktijkregel');
  for (const [naam, race] of Object.entries(res)) {
    const s = race.stand(), v = race.verslag();
    rij(naam, String(s.totaal), String(s.regels.zone), String(s.regels.laag), String(s.regels.hoog), String(s.regels.giftig),
      v.telling.toedienmomenten + 'x, ' + v.telling.totaleDosis.tekst + ' / ' + v.praktijk.regel);
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
eis('B2 elke 3e overslaan > alles slikken', sl('na de ibuprofen elke 3e overslaan') > sl('alles slikken'));
eis('B2 alles slikken > niets', sl('alles slikken') > sl('niets'));
eis('B2 elk poortje dubbel: toxische zone', lRes['elk poortje dubbel'].verslag().uren.toxisch > 0);
eis('B2 elk poortje dubbel scoort het laagst (ook < niets)', sl('elk poortje dubbel') === laagsteL && sl('elk poortje dubbel') < sl('niets'));
check(sl('alles slikken + spuitknop') === sl('alles slikken'), 'lithium-spuitknop kost geen punten');

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
  check(!g.ok && g.reden === 'geenPrik' && g.lever === 0, 'lithium-spuit: geweigerd, geen straf');
}

// ---------------------------------------------------------------------------------------------
kop('Eindverslag en praktijkzinnen');
{
  const zinnen = {};
  // Eén scenario per praktijkzin (live gespeeld), met de regel die hij moet triggeren.
  const naIbuOpT = (pred, dosis = slik) => (race, t) => (pred(t) ? [] : [dosis]);
  const scen = [
    // paracetamol
    ['P lever: elk uur slikken', P, pBots['elk uur slikken'], 'lever'],
    ['P niets', P, pBots['niets'], 'niets'],
    ['P zetpil 12 u (F 0,6)', P, pBots['zetpil-variant'], 'zetpilHalf'],
    ['P zetpil 13 u (F 0,35)', P, op([0, 6, 13, 18], t => [t === 13 ? zetpil : slik]), 'zetpilNauwelijks'],
    ['P zetpil 14 u (F 0,9)', P, op([0, 6, 14, 18], t => [t === 14 ? zetpil : slik]), 'zetpilGoed'],
    ['P rand 6: zetpil 10 u (F 0,7) en 13 u (F 0,35)', P, op([0, 10, 13, 18], t => [t === 10 || t === 13 ? zetpil : slik]), 'zetpilWisselend',
      'Tijdens de misselijkheid gaf jij 2 zetpillen. De ene werkte goed, de andere nauwelijks: daar kun je niet op rekenen.'],
    ['P zetpil 11 u en 13 u (allebei nauwelijks)', P, op([0, 6, 11, 13], t => [t === 11 || t === 13 ? zetpil : slik]), 'zetpilNauwelijks',
      'Tijdens de misselijkheid gaf jij 2 zetpillen. Ze werkten nauwelijks: daar kun je niet op rekenen.'],
    ['P r3-6: zetpil met aantal 2 om 12 u (API)', P, op([0, 6, 12], t => [t === 12 ? { route: 'zetpil', aantal: 2 } : slik]), 'zetpilHalf',
      'Tijdens de misselijkheid gaf jij 2 zetpillen. Ze werkten maar half: daar kun je niet op rekenen.'],
    ['P r3-7: alleen een spuit om 12 u', P, op([12], () => [spuit]), 'veelOnder',
      'Opa Jan zat 83% van de tijd onder de streep. Eén dosis werkt maar een paar uur: daarna komt de pijn terug.'],
    ['P spuit 12 u', P, pBots['spuit-variant'], 'spuit'],
    ['P rand 5 / r3-5: alleen 1 g spuit om 0 u', P, op([0], () => [spuit]), 'veelOnder',
      'Opa Jan zat 83% van de tijd onder de streep. Eén dosis werkt maar een paar uur: daarna komt de pijn terug.'],
    ['P alles vroeg (0, 1, 2, 3 u)', P, op([0, 1, 2, 3], () => [slik]), 'veelOnder'],
    ['P gemiste dosis', P, pBots['gemiste dosis'], 'misselijkGemist'],
    ['P echt schema zonder blokkade (vangnet)', P, op(VIER, () => [slik]), 'goed', null, { blokkades: false }],
    // lithium
    ['L elk poortje dubbel', L, lBots['elk poortje dubbel'], 'giftigDubbel'],
    ['L niets', L, lBots['niets'], 'niets'],
    ['L rand 3a: eerste 15 overslaan, daarna 1', L, (race, t) => (t === tK ? [slik] : []), 'overgeslagenOnder',
      'Jij sloeg 29 van de 30 doses over, vóór én na de ibuprofen, en de spiegel zakte onder de 0,6. Kans op terugval: somber of juist ontremd.'],
    ['L rand 3b: eerste 15 overslaan, daarna alles', L, naIbuOpT(t => t < tK), 'overgeslagenOnder',
      'Jij sloeg vóór de ibuprofen 15 van de 15 doses over en de spiegel zakte onder de 0,6. Kans op terugval: somber of juist ontremd.'],
    ['L na ibuprofen om de andere overslaan', L, naIbuOpT(t => t >= tK && naIbuNr(t) % 2 === 0), 'naIbuTeVeelWeg'],
    ['L rand 4: dubbel na de ibuprofen (136 u)', L, (race, t) => [{ route: 'slik', aantal: t === 136 ? 2 : 1 }], 'dubbel'],
    ['L dubbel vóór de ibuprofen (48 u)', L, (race, t) => [{ route: 'slik', aantal: t === 48 ? 2 : 1 }], 'dubbel'],
    ['L r3-1: dubbel 0 u, 120 u over, dubbel 128 u, daarna elke 3e over', L, (race, t) =>
      t === 120 ? [] : (t === 0 || t === 128 ? [{ route: 'slik', aantal: 2 }] : (t > 128 && naIbuNr(t) % 3 === 0 ? [] : [slik])), 'dubbel',
      'Jij gaf 2 keer een dubbele dosis en door die vóór de ibuprofen kwam de spiegel boven de 1,0. Bij lithium nooit dubbel innemen, ook niet om in te halen: te veel geeft trillen, misselijkheid en diarree.'],
    ['L r3-2: 120 u over, dubbel 128 u, daarna elke 3e over', L, (race, t) =>
      t === 120 ? [] : (t === 128 ? [{ route: 'slik', aantal: 2 }] : (t > 128 && naIbuNr(t) % 3 === 0 ? [] : [slik])), 'dubbel'],
    ['L r3-4: dubbel 0 u, daarna alles slikken', L, (race, t) => [{ route: 'slik', aantal: t === 0 ? 2 : 1 }], 'dubbel',
      'Jij gaf één keer een dubbele dosis vóór de ibuprofen en de spiegel kwam boven de 1,0: vooral na de ibuprofen, omdat de nieren minder opruimden, maar ook door het dubbel innemen. Bij lithium nooit dubbel innemen, ook niet om in te halen: te veel geeft trillen, misselijkheid en diarree.'],
    ['L na ibuprofen elke 3e overslaan', L, lBots['na de ibuprofen elke 3e overslaan'], 'naIbuMinder',
      'Jij liet na de ibuprofen 33% van de doses weg. Dat was nodig, want de nieren ruimden minder op. In het echt verlaagt de arts de dosis en laat de spiegel prikken: pillen overslaan wordt makkelijk vergeten.'],
    ['L rand 2: alleen poortje 232 overslaan', L, naIbuOpT(t => t === 232), 'naIbuNogTeHoog'],
    ['L alles slikken', L, lBots['alles slikken'], 'naIbuTeHoog']
  ];
  const rij = (a, b, c) => console.log(a.padEnd(50) + b.padEnd(18) + c);
  for (const [naam, c, bot, regel, tekst, opties] of scen) {
    const v = speel(c, bot, 'vast', opties).verslag();
    zinnen[v.praktijk.regel] = zinnen[v.praktijk.regel] || v.praktijk.zin;
    const ok = v.praktijk.regel === regel && (!tekst || v.praktijk.zin === tekst);
    if (naam.startsWith('L r3') || naam.startsWith('L rand 4')) {
      const u = v.uren, dub = v.tijdlijn.some(r => r.jij.soorten.some(x => x.aantal >= 2));
      check(!dub || v.praktijk.regel !== 'naIbuMinder', `${naam}: geen naIbuMinder bij een dubbele dosis`);
      console.log(`   (${naam}: uren boven 1,0 totaal ${u.boven.toFixed(2)})`);
    }
    check(ok, `${naam}: verwacht ${regel}, kreeg ${v.praktijk.regel}: ${v.praktijk.zin}`);
    rij(naam, v.praktijk.regel, v.praktijk.zin);
  }
  const zonder = ['giftig', 'nabespreking'].filter(r => !zinnen[r]);
  console.log(`(vangnetregels zonder racescenario, in de race onbereikbaar: ${zonder.join(', ')})`);
  for (const [r, z] of Object.entries(zinnen)) {
    const n = z.split(/[.!?](\s|$)/).filter(s => s && s.trim()).length;
    if (r !== 'naIbuMinder') check(n <= 2, `praktijkzin ${r} maximaal twee zinnen`);
    check(!/(overslaan|weglaten) is (goed|slim|handig)|sla .* over\b/i.test(z), `praktijkzin ${r} prijst overslaan niet`);
  }
  check(!/pil/.test(zinnen.veelOnder), 'veelOnder route-neutraal (geen "pil")');
  check(/nooit dubbel innemen, ook niet om in te halen/.test(zinnen.dubbel) && !/nodig|goed idee|slim/.test(zinnen.dubbel), 'dubbel-zin noemt het dubbel innemen en prijst het niet');
  check(zinnen.zetpilHalf === 'Tijdens de misselijkheid koos jij de zetpil. Die werkte maar half: daar kun je niet op rekenen.', 'voorbeeldzin zetpil woordelijk');
  check(zinnen.naIbuMinder === 'Jij liet na de ibuprofen 33% van de doses weg. Dat was nodig, want de nieren ruimden minder op. In het echt verlaagt de arts de dosis en laat de spiegel prikken: pillen overslaan wordt makkelijk vergeten.', 'voorbeeldzin lithium woordelijk, percentage uit keuzes (5 van 15)');

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
    const vLi = lRes['elk poortje dubbel'].verslag().tijdlijn[0];
    check(vLi.jij.tekst === '2 tabletten' && vLi.echt === '400 mg', 'lithium: "2 tabletten" naast echt "400 mg"');
  }
  check(vL.telling.toedienmomenten === 3 && vL.telling.totaleDosis.tekst === '3 g' && vL.telling.dagteller.tekst === '3 g van max. 4 g', 'telling paracetamol: ' + JSON.stringify(vL.telling));
  const vS = pRes['spuit-variant'].verslag();
  check(vS.tijdlijn[12].jij.soort === 'spuit' && vS.tijdlijn[13].jij.soort === 'overgeslagen' && vS.echtSchema.tekst === '1 g 4dd', 'tijdlijn spuit / overgeslagen, echt schema 1 g 4dd');
  const vE = pRes['elk uur slikken'].verslag();
  check(vE.telling.dagteller.over && vE.telling.totaleDosis.tekst === '18 g', 'elk uur slikken: 18 g, dagteller over 4 g');
  const vD = lRes['elk poortje dubbel'].verslag();
  check(vD.tijdlijn.length === 30 && vD.tijdlijn[0].jij.aantal === 2 && vD.telling.totaleDosis.tekst === '24.000 mg', 'lithium dubbel: 2 tabletten, 24.000 mg');
  const vA = lRes['alles slikken + spuitknop'].verslag();
  check(vA.tijdlijn[0].jij.geenPrik && vA.tijdlijn[0].jij.soort === 'tablet' && vA.telling.totaleDosis.tekst === '12.000 mg' && vA.telling.toedienmomenten === 30 && !vA.telling.dagteller, 'lithium telling 12.000 mg, 30 momenten, geen dagteller');
  console.log('voorbeeld verslag (spuit-variant):', JSON.stringify({ opbouw: vS.opbouw, telling: vS.telling, praktijk: vS.praktijk }));
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
