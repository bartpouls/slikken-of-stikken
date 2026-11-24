/*
 * Slikken of Stikken — src/score.js  (QALY-punten + eindverslaggegevens, §3 van docs/bouwopdracht.md)
 * Puur JS, geen DOM. Browser: laad ná model.js; <script src="score.js"> zet alleen window.SoS.score.
 * Node: const S = require('./src/score.js')  (haalt zelf ./model.js op).
 *
 * DE FORMULE (spelpunten, geen echte QALY's)
 * ------------------------------------------
 * Per modeltijdstap dt (vast raster t_i = i·dt, dt = 0,005 u; nooit per frame) met C = spiegel op t_i
 * (ná een toediening op t_i), venster [laag, hoog] op t_i en racelengte T (uur):
 *   in de zone (laag ≤ C ≤ hoog):  +ZONE / T · dt                       ZONE   = 1000
 *   te laag    (C < laag):         −LAAG / T · d² · dt,  d = (laag − C) / laag     LAAG = 1000
 *   te hoog    (C > hoog):         −HOOG / T · d² · dt,  d = (C − hoog) / hoog     HOOG = 1000
 *   giftig     (C > casus.toxisch, alleen lithium > 1,5): extra −GIFTIG / T · dt   GIFTIG = 2000
 *   lever      (paracetamol, dagteller boven 4 g per 24 uur): eenmalig −LEVER_SCHADE (1000) op het moment dat
 *              de dagteller voor het eerst boven 4 g komt ("levermeter vol"), plus −LEVER_PER_GRAM (250) voor elke
 *              gram boven 4 g, meteen bij die toediening; in de opbouwregel "lever / giftig".
 *              Waarom zo zwaar: de beste denkbare >4 g-race haalt hooguit +1000 (hele race in de zone) en krijgt
 *              minstens −1250, dus ≤ −250: altijd lager dan "gemiste dosis" (418). Leverschade kost in één klap
 *              een hele race aan punten. De race gaat door (geen einde race): de speler ziet de misselijkheid en
 *              zijn curve nog, en elke extra gram blijft even duur (geen "nu maakt het niet meer uit").
 *   te snel opgehoogd (alleen casus.titratie, carbamazepine): −TE_SNEL (100) per te snelle ophoogstap, op de
 *              toediening die de dagdosis boven de grens brengt. Grens op dag d: max(400 − 200, dagdosis dag d − 7) +
 *              200 mg, dus eerste week hooguit 400 mg per dag, daarna per week hooguit 200 mg per dag erbij (FDA-label).
 *              Alleen bij een echte verhoging t.o.v. gisteren, hooguit één keer per dag. Zesde opbouwregel.
 * Dus: hele race in de zone = +1000 per race, ongeacht of de race 24 uur of 10 dagen duurt. Afstand buiten
 * de zone is relatief t.o.v. de zonegrens, zodat paracetamol (mg/L) en lithium (mmol/L) dezelfde schaal
 * hebben. Paracetamol heeft geen concentratie-bovengrens (hoog = ∞): "te hoog" blijft 0, de lever loopt via
 * de dagteller. Meetconventie = M.simuleer: meetpunt t_i
 * telt voor [t_i, t_i + dt), een toediening op t_i telt al mee in meetpunt t_i.
 * Weergave: rond de vier regels elk af op hele punten; totaal = som van die afgeronde regels.
 *
 * PUBLIEKE API
 * ------------
 * S.PUNTEN                 {ZONE, LAAG, HOOG, GIFTIG, LEVER_SCHADE, LEVER_PER_GRAM, GEEN_KEUZE, TE_SNEL, DT}
 * S.UITLEG                 de QALY-uitlegzin uit §3 (+ "spelpunten, geen echte QALY's").
 * S.REGELS                 [{id:'zone'|'laag'|'hoog'|'giftig'|'keuze'|'snel', label}] ('snel' = 'te snel opgehoogd': alleen
 *                          in het verslag van een casus met titratie; race.geef geeft res.teSnel ≤ 0 terug)
 * S.tempo(casus, C, t)     -> {zone, laag, hoog, giftig}: punten per uur op dit moment (+ / − getekend).
 *
 * (a) Live (UI): één race-object per race; het bezit de model-sim en loopt op het vaste raster.
 *   const race = S.maakRace('paracetamol' | 'lithium', {blokkades = true});
 *   race.naar(t)          spelklok naar t (uur): loopt raster-stap voor raster-stap, telt punten.
 *                         race.t = laatste rasterpunt ≤ t (max. racelengte). Roep dit per frame aan met de
 *                         spelklok; de uitkomst is onafhankelijk van de framerate.
 *   race.geef(route, o)   = sim.geef ('slik'|'zetpil'|'spuit', {aantal, F, ka, index, t}).
 *                         BELANGRIJK: een toediening hoort precies op het poortje. Geef o.index (poortje-index,
 *                         zoals M.poortjes) of o.t (poortjetijd): dan loopt de race eerst zelf naar dat poortje
 *                         (race.naar(poortjetijd)) en valt de toediening exact op het raster, net als in de batch.
 *                         Zonder index/t valt hij op race.t; roep dan eerst race.naar(poortjetijd) aan (anders
 *                         kan de live stand ±1 punt van de batch afwijken). Ligt race.t al voorbij het poortje,
 *                         dan geeft hij op race.t met res.laat = true (terugspoelen kan niet).
 *                         Na het einde van de race (race.klaar) weigert hij: {ok:false, reden:'voorbij'}, niet gelogd.
 *                         Extra velden in het antwoord: res.lever = strafpunten (≤ 0) die deze toediening de lever
 *                         kostte (incl. eenmalig −1000 bij de eerste overschrijding), res.leverSchade (bool: deze
 *                         toediening bracht de dagteller voor het eerst boven 4 g).
 *   race.stand()          -> {totaal, regels:{zone, laag, hoog, giftig} (hele getallen), exact:{...},
 *                             dagteller (dosis-eenheden), leverBeschadigd, klaar}  — voor de live QALY-stand.
 *   race.sim, race.casus, race.t, race.klaar (t = racelengte), race.verslag() (zie (c)).
 * (b) Batch: S.scoreSchema(casus, schema, {blokkades = true, dt})  schema zoals M.simuleer
 *   -> {stand, verslag, model: uitvoer van M.simuleer}. Rekent onafhankelijk via M.simuleer en geeft
 *   precies dezelfde punten als het live pad (zie tests/score.test.mjs).
 * (c) Eindverslag: race.verslag() / scoreSchema(...).verslag ->
 *   { casus, opbouw:{regels:[{id,label,punten}], totaal},
 *     tijdlijn:[{index, t, tijdTekst, jij:{soort:'tablet'|'zetpil'|'spuit'|'overgeslagen'|'geblokkeerd',
 *                aantal (eenheden van die eerste soort), soorten:[{soort, aantal}] (alle soorten op dit
 *                poortje, bv. spuit + tablet), tekst ('tablet' | '2 tabletten' | 'spuit + tablet' | 'zetpil' |
 *                'overgeslagen' | 'geblokkeerd'), toedieningen:[{route, soort, aantal, dosis, F, ka}],
 *                geblokkeerd, geenPrik},
 *                echt: '1 g' | '400 mg' | null}],   (dosis van het echte schema op dit moment, zonder route)
 *     echtSchema:{tekst, aantal}, telling:{toedienmomenten, totaleDosis:{waarde, eenheid, tekst},
 *     dagteller (alleen paracetamol): {hoogste, max, eenheid:'g', over, tekst}},
 *     uren:{zone, onder, boven, toxisch}, lever:{beschadigd, gramBoven4g, punten} (paracetamol) }
 *   S.verslag(casus, log, teller) bouwt dit uit een sim-log en een S.maakTeller(casus) (intern gebruikt).
 *   tijdlijn[i].echt komt uit casus.echtSchema: paracetamol "1 g 4dd" → '1 g' op 0, 6, 12, 18 u (bewust zonder
 *   route: het casusblad noemt er geen, en om 12 u is slikken geblokkeerd); lithium '1.200 mg', vanaf dag 6 '800 mg'.
 *
 */
(function (root, factory) {
  var api = factory(function () {
    if (typeof window !== 'undefined' && window.SoS && window.SoS.model) return window.SoS.model;
    if (typeof require === 'function') return require('./model.js');
    throw new Error('score.js: src/model.js niet geladen');
  });
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  if (typeof window !== 'undefined') {
    window.SoS = window.SoS || {};
    window.SoS.score = api;
  }
})(this, function (haalModel) {
  'use strict';

  var PUNTEN = Object.freeze({ ZONE: 1000, LAAG: 1000, HOOG: 1000, GIFTIG: 2000, LEVER_SCHADE: 1000, LEVER_PER_GRAM: 250,
    GEEN_KEUZE: 20, TE_SNEL: 100, DT: 0.005 });

  var UITLEG = 'Een QALY is een jaar in goede gezondheid. Hier speel je om QALY-punten: hoe beter je patiënt ' +
    'zich voelt, hoe meer. Het zijn spelpunten, geen echte QALY\'s.';

  var REGELS = Object.freeze([
    { id: 'zone', label: 'in de zone' },
    { id: 'laag', label: 'te laag' },
    { id: 'hoog', label: 'te hoog' },
    { id: 'giftig', label: 'lever / giftig' },
    { id: 'keuze', label: 'geen keuze' },
    { id: 'snel', label: 'te snel opgehoogd', alleen: 'titratie' } // alleen bij een casus met titratie (carbamazepine)
  ]);
  function regelsVoor(c) { return REGELS.filter(function (r) { return !r.alleen || c[r.alleen]; }); }

  var M = null;
  function mdl() { return M || (M = haalModel()); }

  // Punten per uur op één meetpunt.
  function tempo(c, C, t) {
    c = mdl().casus(c);
    var T = c.raceDuur, v = mdl().venster(c, t), r = { zone: 0, laag: 0, hoog: 0, giftig: 0 }, d;
    if (C < v.laag) { d = (v.laag - C) / v.laag; r.laag = -PUNTEN.LAAG / T * d * d; }
    else if (C > v.hoog) { d = (C - v.hoog) / v.hoog; r.hoog = -PUNTEN.HOOG / T * d * d; }
    else r.zone = PUNTEN.ZONE / T;
    if (c.toxisch != null && C > c.toxisch) r.giftig = -PUNTEN.GIFTIG / T;
    return r;
  }

  function eersteKlaring(c) {
    for (var i = 0; i < c.gebeurtenissen.length; i++) if (c.gebeurtenissen[i].type === 'klaring') return c.gebeurtenissen[i].t;
    return null;
  }

  // Teller: telt punten en uren. meet() per meetpunt, dosis() per geslaagde toediening (in logvolgorde).
  function maakTeller(c) {
    c = mdl().casus(c);
    var tK = eersteKlaring(c);
    var tl = {
      som: { zone: 0, laag: 0, hoog: 0, giftig: 0, keuze: 0, snel: 0 },
      geenKeuze: [],                    // poortje-indexen die voorbijgingen zonder keuze (−GEEN_KEUZE elk)
      teSnel: [],                       // te snelle ophoogstappen {dag, t, mg, toegestaan} (−TE_SNEL elk)
      uren: { zone: 0, onder: 0, boven: 0, toxisch: 0 },
      onderTijdensBlokkade: 0,          // uren onder de zone terwijl slikken geblokkeerd is
      voor: { zone: 0, onder: 0, boven: 0 }, // uren vóór de klaringsgebeurtenis (lithium: ibuprofen)
      na: { zone: 0, onder: 0, boven: 0 },   // uren erna
      lever: { beschadigd: false, gramBoven: 0, punten: 0 }
    };
    tl.meet = function (C, t, dt) {
      var r = tempo(c, C, t), v = mdl().venster(c, t);
      tl.som.zone += r.zone * dt; tl.som.laag += r.laag * dt; tl.som.hoog += r.hoog * dt; tl.som.giftig += r.giftig * dt;
      var w = C < v.laag ? 'onder' : (C > v.hoog ? 'boven' : 'zone');
      tl.uren[w] += dt;
      if (c.toxisch != null && C > c.toxisch) tl.uren.toxisch += dt;
      if (w === 'onder' && mdl().geblokkeerd(c, 'slik', t)) tl.onderTijdensBlokkade += dt;
      if (tK != null) tl[t >= tK - 1e-9 ? 'na' : 'voor'][w] += dt;
    };
    // log: alle eerdere toedieningen (sim.log); l: deze. Geeft de leverstraf (≤ 0) terug.
    tl.dosis = function (log, l) {
      var bg = c.bovengrens;
      if (!l.ok || !bg || bg.type !== 'dagteller') return 0;
      var voor = 0;
      for (var i = 0; i < log.length && log[i] !== l; i++) {
        var e = log[i];
        if (e.ok && e.t > l.t - bg.venster - 1e-9 && e.t <= l.t + 1e-9) voor += e.dosis;
      }
      var na = voor + l.dosis;
      var over = Math.max(0, na - bg.maxPer24u) - Math.max(0, voor - bg.maxPer24u);
      var straf = -PUNTEN.LEVER_PER_GRAM * over / 1000; // dosis in mg
      l.leverSchade = false;
      if (over > 0 && !tl.lever.beschadigd) { tl.lever.beschadigd = true; l.leverSchade = true; straf -= PUNTEN.LEVER_SCHADE; }
      tl.lever.gramBoven += over / 1000;
      tl.lever.punten += straf;
      tl.som.giftig += straf;
      return straf;
    };
    // Geleidelijk ophogen (casus.titratie, carbamazepine). Dagdosis = mg op deze kalenderdag tot en met deze
    // toediening. Toegestaan op dag d: max(start − stap, dagdosis op dag d − 7) + stap; dus de eerste week hooguit
    // 400 mg per dag, daarna per week hooguit 200 mg per dag erbij (na een week niets: weer 400). Straf alleen bij
    // een echte verhoging (dagdosis boven die van gisteren) en hooguit één keer per dag. Geeft de straf (≤ 0) terug.
    tl.titratie = function (log, l) {
      var ti = c.titratie;
      if (!ti || !l.ok) return 0;
      var dag = function (t) { return Math.floor(t / 24 + 1e-9); };
      var d = dag(l.t), nu = 0, gisteren = 0, weekTerug = 0;
      for (var i = 0; i < log.length; i++) {
        var e = log[i];
        if (e.ok) {
          var de = dag(e.t);
          if (de === d) nu += e.dosis; else if (de === d - 1) gisteren += e.dosis;
          if (de === d - 7) weekTerug += e.dosis;
        }
        if (e === l) break;
      }
      var toegestaan = Math.max(ti.startPerDag - ti.stapPerWeek, weekTerug) + ti.stapPerWeek;
      if (nu <= toegestaan + 1e-9 || nu <= gisteren + 1e-9) return 0;
      for (var j = 0; j < tl.teSnel.length; j++) if (tl.teSnel[j].dag === d) return 0;
      tl.teSnel.push({ dag: d, t: l.t, mg: nu, toegestaan: toegestaan });
      tl.som.snel -= PUNTEN.TE_SNEL;
      return -PUNTEN.TE_SNEL;
    };
    // Een poortje ging voorbij zonder dat de speler iets koos (ook geen Overslaan): vaste straf.
    tl.geenKeuzeOp = function (index) {
      if (tl.geenKeuze.indexOf(index) >= 0) return 0;
      tl.geenKeuze.push(index);
      tl.som.keuze -= PUNTEN.GEEN_KEUZE;
      return -PUNTEN.GEEN_KEUZE;
    };
    tl.stand = function () {
      var rg = {}, tot = 0;
      REGELS.forEach(function (r) { rg[r.id] = Math.round(tl.som[r.id]) + 0; tot += rg[r.id]; });
      return { totaal: tot, regels: rg, exact: { zone: tl.som.zone, laag: tl.som.laag, hoog: tl.som.hoog, giftig: tl.som.giftig, keuze: tl.som.keuze, snel: tl.som.snel } };
    };
    return tl;
  }

  // ---------------------------------------------------------------------------------------------
  // (a) Live
  // ---------------------------------------------------------------------------------------------
  function maakRace(c, opties) {
    var Mo = mdl();
    c = Mo.casus(c);
    opties = opties || {};
    var dt = opties.dt || PUNTEN.DT;
    var N = Math.round(c.raceDuur / dt);
    var sim = Mo.maakSim(c, { blokkades: opties.blokkades !== false });
    var teller = maakTeller(c);
    var i = 0;
    var race = {
      casus: c, sim: sim, teller: teller,
      get t() { return i * dt; },
      get klaar() { return i >= N; }
    };
    race.naar = function (t) {
      var doel = Math.min(N, Math.floor(t / dt + 1e-6));
      while (i < doel) {
        teller.meet(sim.C, i * dt, dt); // meetpunt t_i telt voor [t_i, t_i + dt)
        i++;
        sim.naar(i * dt);
      }
      return race.stand();
    };
    race.geef = function (route, o) {
      o = o || {};
      var tp = null, tijden = Mo.poortjes(c);
      if (o.index != null && tijden[o.index] != null) tp = tijden[o.index];
      else if (o.t != null) tp = o.t;
      if (tp != null && tp > race.t + 1e-9) race.naar(tp);
      if (race.klaar) {
        return { ok: false, route: route, t: race.t, aantal: o.aantal == null ? 1 : o.aantal, reden: 'voorbij', lever: 0 };
      }
      var res = sim.geef(route, o);
      if (tp != null && tp < race.t - dt / 2) res.laat = true;
      res.lever = res.ok ? teller.dosis(sim.log, res) : 0;
      res.teSnel = res.ok ? teller.titratie(sim.log, res) : 0; // ≤ 0: strafpunten voor te snel ophogen
      res.leverSchade = !!res.leverSchade;
      return res;
    };
    // Poortje voorbij zonder keuze (de UI roept dit aan op het poortje). Geeft de straf (≤ 0) terug.
    race.geenKeuze = function (index) { return teller.geenKeuzeOp(index); };
    race.stand = function () {
      var s = teller.stand();
      s.dagteller = sim.dagteller();
      s.leverBeschadigd = teller.lever.beschadigd;
      s.klaar = race.klaar;
      return s;
    };
    race.verslag = function () { return verslag(c, sim.log, teller); };
    return race;
  }

  // ---------------------------------------------------------------------------------------------
  // (b) Batch, onafhankelijk via M.simuleer
  // ---------------------------------------------------------------------------------------------
  function scoreSchema(c, schema, opties) {
    var Mo = mdl();
    c = Mo.casus(c);
    opties = opties || {};
    var dt = opties.dt || PUNTEN.DT;
    var uit = Mo.simuleer(c, schema, { dt: dt, blokkades: opties.blokkades !== false });
    var teller = maakTeller(c);
    for (var i = 0; i < uit.t.length - 1; i++) teller.meet(uit.C[i], uit.t[i], dt);
    uit.log.forEach(function (l) { teller.dosis(uit.log, l); teller.titratie(uit.log, l); });
    (opties.geenKeuze || []).forEach(function (i) { teller.geenKeuzeOp(i); });
    return { stand: teller.stand(), verslag: verslag(c, uit.log, teller), model: uit };
  }

  // ---------------------------------------------------------------------------------------------
  // (c) Eindverslag
  // ---------------------------------------------------------------------------------------------
  var SOORT = { slik: 'tablet', zetpil: 'zetpil', spuit: 'spuit' };

  function getal(x) { // Nederlandse notatie: komma, punt als duizendtal
    var s = String(Math.round(x * 100) / 100).split('.');
    s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return s.join(',');
  }

  // Dosis van het echte schema op één poortje, als tekst (aantal tabletten: carbamazepine wordt opgehoogd).
  function echtDosisTekst(c, aantal) {
    aantal = aantal || 1;
    return c.dosis && c.dosis.mg ? getal(c.dosis.mg * aantal) + ' mg' : getal(aantal * c.routes.slik.dosis / 1000) + ' g';
  }

  var SOORT_MV = { tablet: 'tabletten', zetpil: 'zetpillen', spuit: 'spuiten' };

  function tijdlijn(c, log) {
    var Mo = mdl();
    var tijden = Mo.poortjes(c);
    var echt = {}, echtN = {};
    c.echtSchema.schema.forEach(function (e) { var i = Mo.poortjeIndex(c, e.t); echt[i] = echtDosisTekst(c, e.aantal); echtN[i] = e.aantal || 1; });
    var rijen = tijden.map(function (t, i) {
      return { index: i, t: t, tijdTekst: 'uur ' + t,
        jij: { soort: 'overgeslagen', aantal: 0, soorten: [], tekst: 'overgeslagen', toedieningen: [],
          geblokkeerd: false, geenPrik: false },
        echt: echt[i] || null, echtAantal: echtN[i] || 0 };
    });
    log.forEach(function (l) {
      var j = rijen[Mo.poortjeIndex(c, l.t)].jij;
      if (l.ok) {
        j.toedieningen.push({ route: l.route, soort: SOORT[l.route], aantal: l.aantal, dosis: l.dosis, F: l.F, ka: l.ka });
        var so = null;
        for (var i = 0; i < j.soorten.length; i++) if (j.soorten[i].soort === SOORT[l.route]) so = j.soorten[i];
        if (!so) { so = { soort: SOORT[l.route], aantal: 0 }; j.soorten.push(so); }
        so.aantal += l.aantal;
      } else if (l.reden === 'geblokkeerd') j.geblokkeerd = true;
      else if (l.reden === 'geenPrik') j.geenPrik = true;
    });
    rijen.forEach(function (r) {
      var j = r.jij;
      if (j.soorten.length) {
        j.soort = j.soorten[0].soort;
        j.aantal = j.soorten[0].aantal;
        j.tekst = j.soorten.map(function (so) {
          if (c.poortjes.dosisKnoppen) return getal(so.aantal * c.dosis.mg) + ' mg'; // carbamazepine: dosis in mg
          return so.aantal > 1 ? so.aantal + ' ' + SOORT_MV[so.soort] : so.soort;
        }).join(' + ');
      } else if (j.geblokkeerd) { j.soort = 'geblokkeerd'; j.tekst = 'geblokkeerd'; }
    });
    return rijen;
  }

  function verslag(c, log, teller) {
    c = mdl().casus(c);
    var stand = teller.stand();
    var rijen = tijdlijn(c, log);
    (teller.geenKeuze || []).forEach(function (i) {
      var j = rijen[i] && rijen[i].jij;
      if (j && !j.soorten.length && !j.geblokkeerd) { j.soort = 'geenKeuze'; j.tekst = 'geen keuze'; }
      if (j) j.geenKeuze = true;
    });
    var ok = log.filter(function (l) { return l.ok; });
    var momenten = rijen.filter(function (r) { return r.jij.toedieningen.length > 0; }).length;
    var tabletten = 0, nominaal = 0;
    ok.forEach(function (l) { tabletten += l.aantal; nominaal += l.dosis; });
    var telling = { toedienmomenten: momenten, geenKeuze: (teller.geenKeuze || []).length };
    if (c.dosis && c.dosis.mg) {
      var mg = tabletten * c.dosis.mg;
      telling.totaleDosis = { waarde: mg, eenheid: 'mg', tekst: getal(mg) + ' mg' };
    } else {
      telling.totaleDosis = { waarde: nominaal / 1000, eenheid: 'g', tekst: getal(nominaal / 1000) + ' g' };
    }
    // Per dag (dag 0 = uur 0–24): wat kreeg de patiënt gemiddeld per dag, naast de grens of het schema.
    var dagen = Math.max(1, Math.round(c.raceDuur / 24)), perDag = [];
    for (var dg = 0; dg < dagen; dg++) perDag.push(0);
    var tabl = c.dosis && c.dosis.mg;
    ok.forEach(function (l) { var d = Math.min(dagen - 1, Math.floor(l.t / 24 + 1e-9)); perDag[d] += tabl ? l.aantal : l.dosis / 1000; });
    var gem = perDag.reduce(function (a, b) { return a + b; }, 0) / dagen;
    if (tabl) {
      var dag0 = c.echtSchema.schema.filter(function (e) { return e.t < 24; });
      var laatste = c.echtSchema.schema.filter(function (e) { return e.t >= c.raceDuur - 24; });
      var mgDag = function (rij) { var m = 0; rij.forEach(function (e) { m += (e.aantal || 1) * c.dosis.mg; }); return m; };
      var schemaTekst = mgDag(dag0) === mgDag(laatste)
        ? dag0.length + ' × ' + getal(c.dosis.mg * (dag0[0].aantal || 1)) + ' mg per dag'
        : getal(mgDag(dag0)) + ' mg per dag, later ' + getal(mgDag(laatste)) + ' mg per dag';
      telling.perDag = { dagen: perDag, gemiddeld: gem, eenheid: 'tabletten',
        tekst: getal(Math.round(gem * 10) / 10) + ' tabletten per dag (' + getal(Math.round(gem * c.dosis.mg)) + ' mg)',
        grens: 'schema: ' + schemaTekst + '; venster ' + c.zone.tekst };
    } else {
      telling.perDag = { dagen: perDag, gemiddeld: gem, eenheid: 'g',
        tekst: getal(Math.round(gem * 10) / 10) + ' g per dag',
        grens: 'max. ' + getal(c.routes.slik.dosis / 1000) + ' g per keer, ' + getal(c.bovengrens.maxPer24u / 1000) + ' g per dag' };
    }
    var bg = c.bovengrens;
    if (bg && bg.type === 'dagteller') {
      var hoogste = 0;
      ok.forEach(function (l) {
        var s = 0;
        ok.forEach(function (e) { if (e.t > l.t - bg.venster - 1e-9 && e.t <= l.t + 1e-9) s += e.dosis; });
        if (s > hoogste) hoogste = s;
      });
      telling.dagteller = { hoogste: hoogste / 1000, max: bg.maxPer24u / 1000, eenheid: 'g', over: hoogste > bg.maxPer24u,
        tekst: getal(hoogste / 1000) + ' g van max. ' + getal(bg.maxPer24u / 1000) + ' g' };
    }
    return {
      casus: c.id,
      opbouw: {
        regels: regelsVoor(c).map(function (r) { return { id: r.id, label: r.label, punten: stand.regels[r.id] }; }),
        totaal: stand.totaal
      },
      tijdlijn: rijen,
      echtSchema: { tekst: c.echtSchema.tekst, aantal: c.echtSchema.schema.length },
      telling: telling,
      uren: { zone: teller.uren.zone, onder: teller.uren.onder, boven: teller.uren.boven, toxisch: teller.uren.toxisch },
      lever: bg && bg.type === 'dagteller' ? { beschadigd: teller.lever.beschadigd, gramBoven4g: teller.lever.gramBoven,
        punten: Math.round(teller.lever.punten) + 0 } : null,
      teSnel: c.titratie ? teller.teSnel.map(function (x) { return { dag: x.dag, mg: x.mg, toegestaan: x.toegestaan }; }) : null
    };
  }

  return {
    versie: '1.0',
    PUNTEN: PUNTEN,
    UITLEG: UITLEG,
    REGELS: REGELS,
    tempo: tempo,
    maakTeller: maakTeller,
    maakRace: maakRace,
    scoreSchema: scoreSchema,
    verslag: verslag
  };
});
