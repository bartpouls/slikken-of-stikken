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
 *   lever      (paracetamol): elke gram die de dagteller boven 4 g per 24 uur brengt: −500 (LEVER_PER_GRAM),
 *              meteen bij die toediening. De race gaat door (zware straf, geen einde race): zo ziet de speler
 *              de misselijkheid en zijn curve nog, en blijft elke extra gram even duur (geen "nu maakt het
 *              niet meer uit").
 * Dus: hele race in de zone = +1000 per race, ongeacht of de race 24 uur of 10 dagen duurt. Afstand buiten
 * de zone is relatief t.o.v. de zonegrens, zodat paracetamol (mg/L) en lithium (mmol/L) dezelfde schaal
 * hebben. Paracetamol heeft geen concentratie-bovengrens (hoog = ∞): "te hoog" blijft 0, de lever loopt via
 * de dagteller. Lithium-spuitknop: geen effect, geen strafpunten. Meetconventie = M.simuleer: meetpunt t_i
 * telt voor [t_i, t_i + dt), een toediening op t_i telt al mee in meetpunt t_i.
 * Weergave: rond de vier regels elk af op hele punten; totaal = som van die afgeronde regels.
 *
 * PUBLIEKE API
 * ------------
 * S.PUNTEN                 {ZONE, LAAG, HOOG, GIFTIG, LEVER_PER_GRAM, DT}
 * S.UITLEG                 de QALY-uitlegzin uit §3 (+ "spelpunten, geen echte QALY's").
 * S.REGELS                 [{id:'zone'|'laag'|'hoog'|'giftig', label:'in de zone'|'te laag'|'te hoog'|'lever / giftig'}]
 * S.tempo(casus, C, t)     -> {zone, laag, hoog, giftig}: punten per uur op dit moment (+ / − getekend).
 *
 * (a) Live (UI): één race-object per race; het bezit de model-sim en loopt op het vaste raster.
 *   const race = S.maakRace('paracetamol' | 'lithium', {blokkades = true});
 *   race.naar(t)          spelklok naar t (uur): loopt raster-stap voor raster-stap, telt punten.
 *                         race.t = laatste rasterpunt ≤ t (max. racelengte). Roep dit per frame aan met de
 *                         spelklok; de uitkomst is onafhankelijk van de framerate.
 *   race.geef(route, o)   = sim.geef ('slik'|'zetpil'|'spuit', {aantal, F, ka, index}); geef op het poortje:
 *                         eerst race.naar(poortjetijd), dan race.geef(...). Extra veld in het antwoord:
 *                         res.lever = strafpunten (≤ 0) die deze toediening de lever kostte.
 *   race.stand()          -> {totaal, regels:{zone, laag, hoog, giftig} (hele getallen), exact:{...},
 *                             dagteller (dosis-eenheden), klaar}  — voor de live QALY-stand.
 *   race.sim, race.casus, race.t, race.klaar (t = racelengte), race.verslag() (zie (c)).
 * (b) Batch: S.scoreSchema(casus, schema, {blokkades = true, dt})  schema zoals M.simuleer
 *   -> {stand, verslag, model: uitvoer van M.simuleer}. Rekent onafhankelijk via M.simuleer en geeft
 *   precies dezelfde punten als het live pad (zie tests/score.test.mjs).
 * (c) Eindverslag: race.verslag() / scoreSchema(...).verslag ->
 *   { casus, opbouw:{regels:[{id,label,punten}], totaal},
 *     tijdlijn:[{index, t, tijdTekst, jij:{soort:'tablet'|'zetpil'|'spuit'|'overgeslagen'|'geblokkeerd',
 *                aantal, toedieningen:[{route, soort, aantal, dosis, F, ka}], geblokkeerd, geenPrik},
 *                echt:'tablet'|null}],
 *     echtSchema:{tekst, aantal}, telling:{toedienmomenten, totaleDosis:{waarde, eenheid, tekst},
 *     dagteller (alleen paracetamol): {hoogste, max, eenheid:'g', over, tekst}},
 *     uren:{zone, onder, boven, toxisch}, praktijk:{regel, zin} }
 *   S.verslag(casus, log, teller) bouwt dit uit een sim-log en een teller (intern gebruikt).
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

  var PUNTEN = Object.freeze({ ZONE: 1000, LAAG: 1000, HOOG: 1000, GIFTIG: 2000, LEVER_PER_GRAM: 500, DT: 0.005 });

  var UITLEG = 'Een QALY is een jaar in goede gezondheid. Hier speel je om QALY-punten: hoe beter je patiënt ' +
    'zich voelt, hoe meer. Het zijn spelpunten, geen echte QALY\'s.';

  var REGELS = Object.freeze([
    { id: 'zone', label: 'in de zone' },
    { id: 'laag', label: 'te laag' },
    { id: 'hoog', label: 'te hoog' },
    { id: 'giftig', label: 'lever / giftig' }
  ]);

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
      som: { zone: 0, laag: 0, hoog: 0, giftig: 0 },
      uren: { zone: 0, onder: 0, boven: 0, toxisch: 0 },
      onderTijdensBlokkade: 0,          // uren onder de zone terwijl slikken geblokkeerd is
      na: { zone: 0, onder: 0, boven: 0 } // uren na de klaringsgebeurtenis (lithium: ibuprofen)
    };
    tl.meet = function (C, t, dt) {
      var r = tempo(c, C, t), v = mdl().venster(c, t);
      tl.som.zone += r.zone * dt; tl.som.laag += r.laag * dt; tl.som.hoog += r.hoog * dt; tl.som.giftig += r.giftig * dt;
      var w = C < v.laag ? 'onder' : (C > v.hoog ? 'boven' : 'zone');
      tl.uren[w] += dt;
      if (c.toxisch != null && C > c.toxisch) tl.uren.toxisch += dt;
      if (w === 'onder' && mdl().geblokkeerd(c, 'slik', t)) tl.onderTijdensBlokkade += dt;
      if (tK != null && t >= tK) tl.na[w] += dt;
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
      tl.som.giftig += straf;
      return straf;
    };
    tl.stand = function () {
      var rg = {}, tot = 0;
      REGELS.forEach(function (r) { rg[r.id] = Math.round(tl.som[r.id]) + 0; tot += rg[r.id]; });
      return { totaal: tot, regels: rg, exact: { zone: tl.som.zone, laag: tl.som.laag, hoog: tl.som.hoog, giftig: tl.som.giftig } };
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
      var res = sim.geef(route, o);
      res.lever = res.ok ? teller.dosis(sim.log, res) : 0;
      return res;
    };
    race.stand = function () {
      var s = teller.stand();
      s.dagteller = sim.dagteller();
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
    uit.log.forEach(function (l) { teller.dosis(uit.log, l); });
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

  function tijdlijn(c, log) {
    var Mo = mdl();
    var tijden = Mo.poortjes(c);
    var echt = {};
    c.echtSchema.schema.forEach(function (e) { echt[Mo.poortjeIndex(c, e.t)] = SOORT[e.route]; });
    var rijen = tijden.map(function (t, i) {
      return { index: i, t: t, tijdTekst: 'uur ' + t,
        jij: { soort: 'overgeslagen', aantal: 0, toedieningen: [], geblokkeerd: false, geenPrik: false },
        echt: echt[i] || null };
    });
    log.forEach(function (l) {
      var j = rijen[Mo.poortjeIndex(c, l.t)].jij;
      if (l.ok) {
        j.toedieningen.push({ route: l.route, soort: SOORT[l.route], aantal: l.aantal, dosis: l.dosis, F: l.F, ka: l.ka });
        j.aantal += l.aantal;
      } else if (l.reden === 'geblokkeerd') j.geblokkeerd = true;
      else if (l.reden === 'geenPrik') j.geenPrik = true;
    });
    rijen.forEach(function (r) {
      var j = r.jij;
      if (j.toedieningen.length) j.soort = j.toedieningen[0].soort;
      else if (j.geblokkeerd) j.soort = 'geblokkeerd';
    });
    return rijen;
  }

  function verslag(c, log, teller) {
    c = mdl().casus(c);
    var stand = teller.stand();
    var rijen = tijdlijn(c, log);
    var ok = log.filter(function (l) { return l.ok; });
    var momenten = rijen.filter(function (r) { return r.jij.toedieningen.length > 0; }).length;
    var tabletten = 0, nominaal = 0;
    ok.forEach(function (l) { tabletten += l.aantal; nominaal += l.dosis; });
    var telling = { toedienmomenten: momenten };
    if (c.id === 'lithium') {
      var mg = tabletten * c.dosis.mg;
      telling.totaleDosis = { waarde: mg, eenheid: 'mg', tekst: getal(mg) + ' mg' };
    } else {
      telling.totaleDosis = { waarde: nominaal / 1000, eenheid: 'g', tekst: getal(nominaal / 1000) + ' g' };
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
        regels: REGELS.map(function (r) { return { id: r.id, label: r.label, punten: stand.regels[r.id] }; }),
        totaal: stand.totaal
      },
      tijdlijn: rijen,
      echtSchema: { tekst: c.echtSchema.tekst, aantal: c.echtSchema.schema.length },
      telling: telling,
      uren: { zone: teller.uren.zone, onder: teller.uren.onder, boven: teller.uren.boven, toxisch: teller.uren.toxisch },
      praktijk: praktijk(c, rijen, teller, telling)
    };
  }

  // ---------------------------------------------------------------------------------------------
  // Praktijkzin: eerste regel die past. Getallen alleen uit het casusblad of uit de eigen keuzes.
  // ---------------------------------------------------------------------------------------------
  function pct(x) { return Math.round(x * 100) + '%'; }

  function praktijk(c, rijen, teller, telling) {
    var Mo = mdl();
    var doses = [];
    rijen.forEach(function (r) { r.jij.toedieningen.forEach(function (d) { doses.push({ t: r.t, d: d }); }); });
    var T = c.raceDuur;

    if (c.id === 'paracetamol') {
      var blok = function (t) { return !!Mo.geblokkeerd(c, 'slik', t); };
      var inBlok = doses.filter(function (x) { return blok(x.t); });
      var zetpillen = inBlok.filter(function (x) { return x.d.route === 'zetpil'; });
      var spuiten = inBlok.filter(function (x) { return x.d.route === 'spuit'; });
      var geblokt = rijen.some(function (r) { return blok(r.t) && r.jij.geblokkeerd; });
      if (telling.dagteller && telling.dagteller.over) return { regel: 'lever',
        zin: 'Jij gaf ' + telling.dagteller.tekst.split(' van')[0] + ' in 24 uur, meer dan de 4 g die mag. ' +
          'Te veel paracetamol beschadigt de lever.' };
      if (!doses.length) return { regel: 'niets',
        zin: 'Jij gaf opa Jan geen paracetamol, dus de pijn kwam terug. ' +
          'Een vast schema op vaste tijden houdt de spiegel boven de streep.' };
      if (zetpillen.length) {
        var Fmin = Math.min.apply(null, zetpillen.map(function (x) { return x.d.F; }));
        if (Fmin <= 0.4) return { regel: 'zetpilNauwelijks',
          zin: 'Tijdens de misselijkheid koos jij de zetpil. Die werkte nauwelijks: daar kun je niet op rekenen.' };
        if (Fmin < 0.7) return { regel: 'zetpilHalf',
          zin: 'Tijdens de misselijkheid koos jij de zetpil. Die werkte maar half: daar kun je niet op rekenen.' };
        return { regel: 'zetpilGoed',
          zin: 'Tijdens de misselijkheid koos jij de zetpil. Die werkte deze keer goed, maar een zetpil werkt ' +
            'soms goed en soms nauwelijks: daar kun je niet op rekenen.' };
      }
      if (spuiten.length) return { regel: 'spuit',
        zin: 'Tijdens de misselijkheid koos jij de spuit. Een prik werkt meteen, ook als opa Jan niet kan slikken.' };
      if (!inBlok.length && (geblokt || teller.onderTijdensBlokkade > 0)) return { regel: 'misselijkGemist',
        zin: 'Tijdens de misselijkheid kreeg opa Jan geen paracetamol, en de pijn kwam terug. ' +
          'Kan iemand niet slikken, dan kan het ook als zetpil of prik.' };
      if (teller.uren.onder / T > 1 / 3) return { regel: 'veelOnder',
        zin: 'Opa Jan zat ' + pct(teller.uren.onder / T) + ' van de tijd onder de streep. ' +
          'Een pil werkt maar een paar uur: verdeel de doses over de dag.' };
      return { regel: 'goed',
        zin: 'Jij bleef met ' + telling.totaleDosis.tekst + ' binnen de 4 g per dag. ' +
          'Een vast schema op vaste tijden houdt de pijn weg en de lever heel.' };
    }

    // lithium
    var tK = eersteKlaring(c);
    var naRijen = rijen.filter(function (r) { return r.t >= tK; });
    var voorRijen = rijen.filter(function (r) { return r.t < tK; });
    var weg = function (rs) { return rs.filter(function (r) { return r.jij.toedieningen.length === 0; }).length; };
    var dubbel = rijen.filter(function (r) { return r.jij.aantal >= 2; }).length;
    if (teller.uren.toxisch > 0) {
      if (dubbel) return { regel: 'giftigDubbel',
        zin: 'Jij gaf ' + dubbel + ' keer een dubbele dosis en de spiegel kwam boven de 1,5: giftig. ' +
          'Bij lithium liggen goed en giftig dicht bij elkaar, dus nooit dubbel innemen.' };
      return { regel: 'giftig',
        zin: 'De spiegel kwam boven de 1,5: giftig, met kans op verwardheid en nieren in gevaar. ' +
          'Bij lithium liggen goed en giftig dicht bij elkaar.' };
    }
    if (!doses.length) return { regel: 'niets',
      zin: 'Jij gaf mevrouw De Vries geen lithium en de spiegel zakte onder de 0,6. ' +
        'Kans op terugval: somber of juist ontremd.' };
    var wegNa = weg(naRijen);
    if (wegNa > 0) {
      if (teller.na.onder > 0) return { regel: 'naIbuTeVeelWeg',
        zin: 'Jij liet na de ibuprofen ' + pct(wegNa / naRijen.length) + ' van de doses weg en de spiegel zakte ' +
          'onder de 0,6. In het echt verlaagt de arts de dosis en laat de spiegel prikken: zelf pillen overslaan ' +
          'is geen goed idee.' };
      return { regel: 'naIbuMinder',
        zin: 'Jij liet na de ibuprofen ' + pct(wegNa / naRijen.length) + ' van de doses weg. Dat was nodig, want ' +
          'de nieren ruimden minder op. In het echt verlaagt de arts de dosis en laat de spiegel prikken: pillen ' +
          'overslaan wordt makkelijk vergeten.' };
    }
    if (weg(voorRijen) > 0 && teller.uren.onder > 0) return { regel: 'overgeslagenOnder',
      zin: 'Jij sloeg ' + weg(rijen) + ' van de ' + rijen.length + ' doses over en de spiegel zakte onder de 0,6. ' +
        'Kans op terugval: somber of juist ontremd.' };
    if (teller.na.boven > 0) return { regel: 'naIbuTeHoog',
      zin: 'Jij gaf na de ibuprofen gewoon alle doses en de spiegel kroop boven de 1,0, want de nieren ruimden ' +
        'minder op. In het echt: bij lithium liever paracetamol dan ibuprofen, en de spiegel laten prikken.' };
    return { regel: 'nabespreking', zin: c.nabespreking };
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
