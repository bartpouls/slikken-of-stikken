// Tests voor src/model.js — draaien met: node tests/model.test.mjs
// (a) één dosis iv/slik/zetpil tegen de analytische formules (§4), (b) halvering in T½,
// (c) de tabel "Verwachte uitkomsten" (§5), plus casusdata en browser-lading.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const hier = path.dirname(fileURLToPath(import.meta.url));
const modelPad = path.join(hier, '..', 'src', 'model.js');
const M = require(modelPad);

let fouten = 0, checks = 0;
function check(ok, wat) {
  checks++;
  if (!ok) { fouten++; console.log('  FOUT: ' + wat); }
}
const pct = x => (x * 100).toFixed(2) + '%';
const kop = s => console.log('\n=== ' + s + ' ===');

const P = M.casus('paracetamol'), L = M.casus('lithium');
const kP = Math.LN2 / P.Thalf, kL = Math.LN2 / L.Thalf;

// ---------------------------------------------------------------------------------------------
kop('(a) Eén dosis tegen de analytische formules (§4)');
{
  const tijden = [0.1, 0.25, 0.5, 1, 1.38, 2, 3, 4, 6, 8, 10, 12, 16, 20, 24];
  function vergelijk(naam, route, opts, analyt) {
    // Incrementeel (UI-pad) met wisselende stapgrootte, en batch-pad.
    const sim = M.maakSim('paracetamol', { blokkades: false });
    sim.geef(route, opts);
    const batch = M.simuleer('paracetamol', [{ t: 0, route, ...opts }], { blokkades: false, dt: 0.005 });
    let maxRel = 0, maxRelB = 0;
    const rijen = [];
    for (const t of tijden) {
      while (sim.t < t - 1e-12) sim.stap(Math.min(0.037 + 0.01 * Math.sin(sim.t), t - sim.t));
      const verw = analyt(t);
      const rel = Math.abs(sim.C - verw) / verw;
      const i = Math.round(t / 0.005);
      const relB = Math.abs(batch.C[i] - verw) / verw;
      maxRel = Math.max(maxRel, rel); maxRelB = Math.max(maxRelB, relB);
      rijen.push(`t=${t}: ${verw.toFixed(4)} vs ${sim.C.toFixed(4)}`);
    }
    console.log(`${naam.padEnd(28)} ${tijden.length} tijdstippen; max. afwijking incrementeel ${maxRel.toExponential(2)}, batch ${maxRelB.toExponential(2)}`);
    console.log('   ' + rijen.slice(0, 5).join(' | '));
    check(maxRel <= 0.001 && maxRelB <= 0.001, naam + ' wijkt > 0,1% af');
  }
  const D = 1000, Vd = P.Vd;
  vergelijk('iv 1 g', 'spuit', {}, t => M.analytisch.iv(D, Vd, kP, t));
  vergelijk('slik 1 g (F 0,85, ka 1,5)', 'slik', {}, t => M.analytisch.oraal(0.85, D, 1.5, Vd, kP, t));
  vergelijk('zetpil 1 g (F 0,6, ka 0,6)', 'zetpil', { F: 0.6, ka: 0.6 }, t => M.analytisch.oraal(0.6, D, 0.6, Vd, kP, t));
  vergelijk('zetpil reeks[4] (0,3 / 0,3)', 'zetpil', { index: 4 }, t => M.analytisch.oraal(0.3, D, 0.3, Vd, kP, t));
  // Lithium één tablet zonder steady-state-start, zonder gebeurtenis (t < 120)
  {
    const sim = M.maakSim('lithium', { steadyState: false });
    sim.geef('slik');
    let maxRel = 0;
    for (const t of [0.5, 1, 2, 3.5, 6, 10, 24, 48, 72, 100, 119]) {
      sim.naar(t);
      const verw = M.analytisch.oraal(1.0, 10.8, 1.0, 56, kL, t);
      maxRel = Math.max(maxRel, Math.abs(sim.C - verw) / verw);
    }
    console.log(`${'lithium slik 10,8 mmol'.padEnd(28)} 11 tijdstippen; max. afwijking ${maxRel.toExponential(2)}`);
    check(maxRel <= 0.001, 'lithium slik wijkt af');
  }
  // Herhaald doseren = superpositie van analytische enkeldoses
  {
    const schema = [0, 6, 12, 18].map(t => ({ t, route: 'slik' }));
    const r = M.simuleer('paracetamol', schema, { blokkades: false });
    let maxRel = 0;
    for (let t = 0.5; t < 24; t += 1.7) {
      let verw = 0;
      for (const s of schema) if (t > s.t) verw += M.analytisch.oraal(0.85, 1000, 1.5, 63, kP, t - s.t);
      maxRel = Math.max(maxRel, Math.abs(r.C[Math.round(t / 0.005)] - verw) / verw);
    }
    console.log(`${'4× slik (superpositie)'.padEnd(28)} 14 tijdstippen; max. afwijking ${maxRel.toExponential(2)}`);
    check(maxRel <= 0.001, 'superpositie wijkt af');
  }
}

// ---------------------------------------------------------------------------------------------
kop('(b) Halvering in T½ zonder opname');
{
  for (const [id, T] of [['paracetamol', 2.5], ['lithium', 24]]) {
    const sim = M.maakSim(id, { steadyState: false });
    if (id === 'lithium') sim.C = 1.0; else sim.geef('spuit');
    const C0 = sim.C;
    sim.naar(T);
    const r1 = sim.C / C0;
    sim.naar(2 * T);
    const r2 = sim.C / C0;
    console.log(`${id}: C(T½)/C0 = ${r1.toFixed(6)}, C(2·T½)/C0 = ${r2.toFixed(6)}`);
    check(Math.abs(r1 - 0.5) / 0.5 <= 0.01 && Math.abs(r2 - 0.25) / 0.25 <= 0.01, id + ' halveert niet in T½');
  }
  // Na de ibuprofen (klaring × 0,7): halfwaardetijd wordt 24/0,7 u
  const sim = M.maakSim('lithium', { steadyState: false, t0: 120 });
  sim.C = 1.0;
  sim.naar(120 + 24 / 0.7);
  console.log(`lithium na t=120 (klaring × 0,7): C(24/0,7 u)/C0 = ${sim.C.toFixed(6)}`);
  check(Math.abs(sim.C - 0.5) <= 0.005, 'klaringgebeurtenis klopt niet');
  // Gebeurtenis midden in een stap: stap wordt op t=120 gesplitst
  const a = M.maakSim('lithium', { steadyState: false, t0: 100 }); a.C = 1; a.naar(140);
  const verw = Math.exp(-kL * 20) * Math.exp(-0.7 * kL * 20);
  console.log(`lithium 100→140 in één stap: ${a.C.toFixed(6)} vs exact ${verw.toFixed(6)}`);
  check(Math.abs(a.C - verw) < 1e-9, 'stap over gebeurtenis niet gesplitst');
}

// ---------------------------------------------------------------------------------------------
kop('(c) Verwachte uitkomsten (§5)');
const rijen = [];
// Tolerantie: relatief ±2%, óf binnen de afronding van het tabelgetal (halve eenheid van het laatste cijfer).
function rij(casus, strategie, grootheid, verw, kreeg, afronding) {
  const rel = verw === 0 ? Math.abs(kreeg) : Math.abs(kreeg - verw) / Math.abs(verw);
  const binnenRel = verw === 0 ? Math.abs(kreeg) < 0.005 : rel <= 0.02; // verw 0: absoluut < 0,005
  const binnenAfr = Math.abs(kreeg - verw) <= afronding / 2 + 1e-9;
  rijen.push({ casus, strategie, grootheid, verw, kreeg, rel, binnenRel, binnenAfr });
  check(binnenRel || binnenAfr, `${casus} / ${strategie} / ${grootheid}: verwacht ${verw}, kreeg ${kreeg}`);
}
const slik = ts => ts.map(t => ({ t, route: 'slik' }));
{
  const opt = { blokkades: false }; // tabel gaat uit van het schema zonder misselijkheidsblokkade
  const strat = [
    ['Niets', [], 0, 0, 0],
    ['1 g slik 0/6/12/18 (echt)', slik([0, 6, 12, 18]), 78, 11.9, 4],
    ['Idem, 12 u als spuit', [...slik([0, 6, 18]), { t: 12, route: 'spuit' }], 78, 19.6, 4],
    ['Idem, 12 u zetpil 0,6/0,6', [...slik([0, 6, 18]), { t: 12, route: 'zetpil', F: 0.6, ka: 0.6 }], 75, 11.8, 4],
    ['Idem, 12 u zetpil 0,3/0,3', [...slik([0, 6, 18]), { t: 12, route: 'zetpil', F: 0.3, ka: 0.3 }], 57, 11.4, 4],
    ['Dosis van 12 u gemist', slik([0, 6, 18]), 54, 11.4, 3],
    ['Elk uur 1 g van 0 tot 7 u', slik([0, 1, 2, 3, 4, 5, 6, 7]), 65, 43.0, 8],
    ['Eén keer 1 g spuit om 0 u', [{ t: 0, route: 'spuit' }], 17, 15.9, 1]
  ];
  for (const [naam, schema, zone, piek, gram] of strat) {
    const s = M.simuleer('paracetamol', schema, opt).samenvatting;
    rij('paracetamol', naam, 'tijd in zone %', zone, +(s.fractieInZone * 100).toFixed(3), 1);
    rij('paracetamol', naam, 'piek mg/L', piek, +s.piek.toFixed(4), 0.1);
    rij('paracetamol', naam, 'totale dosis g', gram, s.totaleDosis / 1000, 1);
    if (naam.startsWith('Elk uur')) check(s.lever === true && s.max24u === 8000, 'elk uur: lever moet geraakt zijn (8 g)');
    else check(s.lever === false, naam + ': lever onterecht geraakt');
  }
  // Eén dosis slik: piek, tmax en de grensovergangen (exact via bisectie op de kern)
  const r = M.simuleer('paracetamol', slik([0]), opt);
  const s = r.samenvatting;
  const C = t => { const sim = M.maakSim('paracetamol'); sim.geef('slik'); return sim.naar(t); };
  const bisect = (a, b) => { for (let i = 0; i < 60; i++) { const m = (a + b) / 2; ((C(a) - 5) * (C(m) - 5) <= 0) ? (b = m) : (a = m); } return (a + b) / 2; };
  rij('paracetamol', 'Eén dosis 1 g slik', 'piek mg/L', 9.21, +s.piek.toFixed(4), 0.01);
  rij('paracetamol', 'Eén dosis 1 g slik', 'tijd piek u', 1.38, +s.tPiek.toFixed(3), 0.01);
  rij('paracetamol', 'Eén dosis 1 g slik', 'boven 5 vanaf u', 0.33, +bisect(0.01, 1.38).toFixed(4), 0.01);
  rij('paracetamol', 'Eén dosis 1 g slik', 'boven 5 tot u', 4.29, +bisect(1.38, 10).toFixed(4), 0.01);
}
{
  const G = M.poortjes('lithium');
  let n = 0;
  const skip3 = G.filter(t => { if (t < 120) return true; n++; return n % 3 !== 0; });
  const strat = [
    ['Alles slikken', slik(G), 63, 37, 0, 1.07, 1.20],
    ['Na ibuprofen elke 3e overslaan', slik(skip3), 100, 0, 0, 0.69, 0.89],
    ['Niets', [], 3, 0, 0, 0.00, 0.00],
    ['Elk poortje dubbel', G.map(t => ({ t, route: 'slik', aantal: 2 })), 2, 98, 76, 2.14, 2.41]
  ];
  for (const [naam, schema, zone, boven, tox, ldMin, ldMax] of strat) {
    const s = M.simuleer('lithium', schema).samenvatting;
    rij('lithium', naam, 'in zone %', zone, +(s.fractieInZone * 100).toFixed(3), 1);
    rij('lithium', naam, '> 1,0 %', boven, +(s.fractieBoven * 100).toFixed(3), 1);
    rij('lithium', naam, '> 1,5 %', tox, +(s.fractieToxisch * 100).toFixed(3), 1);
    rij('lithium', naam, 'laatste dag min', ldMin, +s.laatsteDag.min.toFixed(4), 0.01);
    rij('lithium', naam, 'laatste dag max', ldMax, +s.laatsteDag.max.toFixed(4), 0.01);
    if (naam === 'Niets') {
      const r = M.simuleer('lithium', []);
      const i = r.C.findIndex(c => c < 0.6);
      console.log(`lithium niets: zakt onder 0,6 na ${r.t[i].toFixed(2)} u (casusblad: ±8 u)`);
      check(Math.abs(r.t[i] - 8) < 1, 'niets: zakt niet onder 0,6 na ±8 u');
    }
  }
  const ss = M.steadyState('lithium');
  rij('lithium', 'Start steady state 3dd 400 mg', 'spiegel min', 0.76, +ss.min.toFixed(4), 0.01);
  rij('lithium', 'Start steady state 3dd 400 mg', 'spiegel max', 0.87, +ss.max.toFixed(4), 0.01);
  check(Math.abs(ss.naInterval - ss.C) < 1e-12, 'steady state is geen vast punt');
}
console.log('\n' + ['casus', 'strategie', 'grootheid', 'verwacht', 'gekregen', 'rel.afw.', 'oordeel'].join(' | '));
for (const r of rijen) {
  const oordeel = r.binnenRel ? 'binnen ±2%' : (r.binnenAfr ? 'buiten ±2% rel., wel binnen afronding tabel' : 'BUITEN');
  console.log([r.casus, r.strategie, r.grootheid, r.verw, r.kreeg, r.verw === 0 ? 'abs ' + r.rel.toFixed(4) : pct(r.rel), oordeel].join(' | '));
}
const maxRel = Math.max(...rijen.filter(r => r.verw !== 0).map(r => r.rel));
console.log(`max. relatieve afwijking (verw ≠ 0): ${pct(maxRel)}; rijen alleen binnen afronding: ${rijen.filter(r => !r.binnenRel && r.binnenAfr).length}`);

// ---------------------------------------------------------------------------------------------
kop('Casusdata, spelregels en zetpilreeks');
{
  check(P.Vd === 63 && P.VdPerKg === 0.9 && P.Thalf === 2.5 && P.gewichtKg === 70, 'paracetamol Vd/T½');
  check(P.routes.slik.dosis === 1000 && P.routes.slik.F === 0.85 && P.routes.slik.ka === 1.5, 'paracetamol slik');
  check(P.routes.spuit.dosis === 1000 && P.routes.spuit.directePiek === 15.9, 'paracetamol spuit');
  check(Math.abs(1000 / 63 - 15.9) < 0.05, 'directe piek 1000/63');
  check(P.bovengrens.maxPer24u === 4000 && P.raceDuur === 24 && P.poortjes.tijden.length === 24, 'paracetamol bovengrens/poortjes');
  check(L.Vd === 56 && L.VdPerKg === 0.8 && L.Thalf === 24 && L.dosis.mmol === 10.8 && L.routes.slik.dosis === 10.8, 'lithium Vd/T½/dosis');
  check(L.routes.slik.F === 1.0 && L.routes.slik.ka === 1.0 && L.toxisch === 1.5 && L.raceDuur === 240, 'lithium F/ka/toxisch/duur');
  check(JSON.stringify(L.poortjes.tijden.slice(0, 4)) === '[0,8,16,24]' && L.poortjes.tijden.length === 30, 'lithium poortjes');
  check(L.gebeurtenissen[0].t === 120 && L.gebeurtenissen[0].factor === 0.7, 'ibuprofen-gebeurtenis');
  check(Math.abs(M.k('lithium', 130) / M.k('lithium', 100) - 0.7) < 1e-12, 'k × 0,7 na t=120');
  const v = M.venster('lithium', 50); check(v.laag === 0.6 && v.hoog === 1.0, 'venster lithium');
  const vp = M.venster('paracetamol', 3); check(vp.laag === 5 && vp.hoog === Infinity, 'venster paracetamol');
  // Teksten woordelijk
  check(P.gebeurtenissen[0].tekst === 'Opa is misselijk na de narcose.', 'tekst misselijk');
  check(P.lekentaal.onder === 'Au. De pijn komt terug.' && P.lekentaal.boven === 'Te veel paracetamol beschadigt de lever.', 'lekentaal paracetamol');
  check(L.routes.spuit.tekst === 'Lithium bestaat niet als prik. Slikken of stikken!', 'spuittekst lithium');
  check(L.gebeurtenissen[0].tekst === 'Mevrouw De Vries koopt ibuprofen bij de drogist.', 'tekst ibuprofen');
  check(L.nabespreking === 'In het echt: bij lithium liever paracetamol dan ibuprofen, en de spiegel laten prikken.', 'nabespreking');
  // Spelregels
  const s1 = M.maakSim('paracetamol'); s1.naar(10);
  const g = s1.geef('slik'); check(!g.ok && g.reden === 'geblokkeerd' && g.tekst === 'Opa is misselijk na de narcose.', 'slikken uur 10 geblokkeerd');
  check(s1.geef('zetpil').ok && s1.geef('spuit').ok, 'zetpil en spuit uur 10 mogelijk');
  s1.naar(16); check(s1.geef('slik').ok, 'slikken uur 16 weer mogelijk');
  check(s1.dagteller() === 3000, 'dagteller telt zetpil en spuit mee');
  const s2 = M.maakSim('lithium'); const C0 = s2.C; const sp = s2.geef('spuit');
  check(!sp.ok && sp.reden === 'geenPrik' && s2.C === C0, 'lithium-spuit doet niets');
  // Zetpilreeks
  const R = M.ZETPIL_REEKS;
  check(R.length === 24 && R.every(z => z.F >= 0.3 && z.F <= 0.9 && z.ka >= 0.3 && z.ka <= 1.0), 'zetpilreeks binnen bereik');
  const Fs = R.map(z => z.F), Ks = R.map(z => z.ka);
  const sprongen = Fs.slice(1).map((f, i) => Math.abs(f - Fs[i]));
  console.log(`zetpilreeks: F ${Math.min(...Fs)}–${Math.max(...Fs)}, ka ${Math.min(...Ks)}–${Math.max(...Ks)}, gem. sprong in F ${(sprongen.reduce((a, b) => a + b) / sprongen.length).toFixed(2)}`);
  check(Math.min(...Fs) === 0.3 && Math.max(...Fs) === 0.9 && Math.min(...Ks) === 0.3 && Math.max(...Ks) === 1.0, 'reeks raakt de grenzen');
  const z12 = M.zetpil(12); check(z12.F === 0.6 && z12.ka === 0.6, 'zetpil op uur 12 = 0,6/0,6');
  const s3 = M.maakSim('paracetamol'); s3.naar(13); const zz = s3.geef('zetpil'); check(zz.F === R[13].F && zz.ka === R[13].ka, 'zetpil gebruikt poortje-index');
}

// ---------------------------------------------------------------------------------------------
kop('Zwevendekommaruis bij blokkade (stap 0,1 / 0,2 / 1/30)');
{
  for (const [naam, h] of [['0,1', 0.1], ['0,2', 0.2], ['1/30', 1 / 30]]) {
    const uitkomst = {};
    for (const doel of [9, 10, 15, 16]) {
      const sim = M.maakSim('paracetamol');
      const n = Math.round(doel / h);
      for (let i = 0; i < n; i++) sim.stap(h);
      const r = sim.geef('slik'); // geef() zonder expliciete tijd: gebruikt sim.t
      uitkomst[doel] = { t: sim.t, ok: r.ok, blok: !!M.geblokkeerd('paracetamol', 'slik', sim.t) };
    }
    console.log(`stap ${naam}: ` + Object.entries(uitkomst).map(([d, u]) => `uur ${d} (t=${u.t}) slik ${u.ok ? 'toegestaan' : 'geweigerd'}`).join('; '));
    check(uitkomst[9].ok && !uitkomst[10].ok && !uitkomst[15].ok && uitkomst[16].ok, `stap ${naam}: blokkade uur 10–16 niet robuust`);
    check([9, 10, 15, 16].every(d => uitkomst[d].blok === !uitkomst[d].ok), `stap ${naam}: geblokkeerd() en geef() oneens`);
  }
  // Vlak vóór / ná de grenzen (verder dan de tolerantie) gedraagt zich nog als verwacht
  check(!M.geblokkeerd('paracetamol', 'slik', 9.99) && M.geblokkeerd('paracetamol', 'slik', 15.99) && !M.geblokkeerd('paracetamol', 'slik', 16), 'blokkadegrenzen');
  check(M.poortjeIndex('paracetamol', 9.99999999999998) === 10, 'poortje-index bij ruis');
}

// ---------------------------------------------------------------------------------------------
kop('Browser-lading (<script>)');
{
  const ctx = { window: {} };
  vm.createContext(ctx);
  const voor = new Set(Object.keys(ctx));
  vm.runInContext(readFileSync(modelPad, 'utf8'), ctx);
  const nieuw = Object.keys(ctx).filter(k => !voor.has(k));
  const ok = ctx.window.SoS && typeof ctx.window.SoS.model.simuleer === 'function';
  console.log(`window.SoS.model aanwezig: ${!!ok}; extra globals: ${nieuw.length ? nieuw.join(',') : 'geen'}`);
  check(ok && nieuw.length === 0, 'browser-lading');
}

console.log(`\n${checks - fouten}/${checks} controles in orde` + (fouten ? `, ${fouten} FOUT` : ''));
process.exit(fouten ? 1 : 0);
