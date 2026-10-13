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
 * Dus: hele race in de zone = +1000 per race, ongeacht of de race 24 uur of 10 dagen duurt. Afstand buiten
 * de zone is relatief t.o.v. de zonegrens, zodat paracetamol (mg/L) en lithium (mmol/L) dezelfde schaal
 * hebben. Paracetamol heeft geen concentratie-bovengrens (hoog = ∞): "te hoog" blijft 0, de lever loopt via
 * de dagteller. Lithium-spuitknop: geen effect, geen strafpunten. Meetconventie = M.simuleer: meetpunt t_i
 * telt voor [t_i, t_i + dt), een toediening op t_i telt al mee in meetpunt t_i.
 * Weergave: rond de vier regels elk af op hele punten; totaal = som van die afgeronde regels.
 *
 * PUBLIEKE API
 * ------------
 * S.PUNTEN                 {ZONE, LAAG, HOOG, GIFTIG, LEVER_SCHADE, LEVER_PER_GRAM, DT}
 * S.UITLEG                 de QALY-uitlegzin uit §3 (+ "spelpunten, geen echte QALY's").
 * S.REGELS                 [{id:'zone'|'laag'|'hoog'|'giftig', label:'in de zone'|'te laag'|'te hoog'|'lever / giftig'}]
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
 *     uren:{zone, onder, boven, toxisch}, lever:{beschadigd, gramBoven4g, punten} (paracetamol),
 *     praktijk:{regel, zin} }
 *   S.verslag(casus, log, teller) bouwt dit uit een sim-log en een S.maakTeller(casus) (intern gebruikt).
 *   Lithium-spuitknop in de tijdlijn: soort 'overgeslagen' (of 'tablet' als ook geslikt) met geenPrik = true.
 *   tijdlijn[i].echt komt uit casus.echtSchema: paracetamol "1 g 4dd" → '1 g' op 0, 6, 12, 18 u (bewust zonder
 *   route: het casusblad noemt er geen, en om 12 u is slikken geblokkeerd); lithium '400 mg' op elk poortje.
 *
 * PRAKTIJKZINNEN (praktijk.regel; de eerste die past; max. twee zinnen, behalve naIbuMinder = woordelijk §3)
 *   paracetamol: lever (dagteller > 4 g) · niets · zetpil tijdens de misselijkheid: zetpilNauwelijks (F ≤ 0,4) /
 *     zetpilHalf (F < 0,7; bij één zetpil woordelijk §3) / zetpilGoed (F ≥ 0,7) / zetpilWisselend (meerdere zetpillen
 *     met verschillend effect; bij meerdere zetpillen meervoud) · spuit (spuit tijdens misselijkheid) · veelOnder
 *     (> 1/4 van de race onder de zone buiten de misselijkheid; route-neutraal) · misselijkGemist ·
 *     goed (vangnet; alleen bereikbaar zonder blokkade).
 *   lithium: giftigDubbel (> 1,5 na een dubbele dosis) · giftig (vangnet: met één tablet per poortje komt de
 *     spiegel nooit boven 1,5, dus in de race onbereikbaar) · niets · overgeslagenOnder (onder 0,6 en overgeslagen
 *     vóór de ibuprofen, of vóór én na; oorzaak volgens wat er gebeurde) · naIbuTeVeelWeg (alleen na de ibuprofen
 *     overgeslagen en onder 0,6) · dubbel (dubbele dosis, spiegel > 1,0, niet giftig) · naIbuMinder (woordelijk §3;
 *     alleen als na t = 120 ≥ 90% in de zone en < 5% boven 1,0; % = overgeslagen poortjes vanaf t = 120 / 15) ·
 *     naIbuNogTeHoog (na ibuprofen overgeslagen, maar ≥ 5% boven 1,0) · naIbuTeHoog (alles gegeven, boven 1,0) ·
 *     nabespreking (vangnet, casusbladtekst; in de race onbereikbaar).
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

  var PUNTEN = Object.freeze({ ZONE: 1000, LAAG: 1000, HOOG: 1000, GIFTIG: 2000, LEVER_SCHADE: 1000, LEVER_PER_GRAM: 250, DT: 0.005 });

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
      res.leverSchade = !!res.leverSchade;
      return res;
    };
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

  function echtDosisTekst(c) {
    return c.id === 'lithium' ? getal(c.dosis.mg) + ' mg' : getal(c.routes.slik.dosis / 1000) + ' g';
  }

  var SOORT_MV = { tablet: 'tabletten', zetpil: 'zetpillen', spuit: 'spuiten' };

  function tijdlijn(c, log) {
    var Mo = mdl();
    var tijden = Mo.poortjes(c);
    var echt = {}, et = echtDosisTekst(c);
    c.echtSchema.schema.forEach(function (e) { echt[Mo.poortjeIndex(c, e.t)] = et; });
    var rijen = tijden.map(function (t, i) {
      return { index: i, t: t, tijdTekst: 'uur ' + t,
        jij: { soort: 'overgeslagen', aantal: 0, soorten: [], tekst: 'overgeslagen', toedieningen: [],
          geblokkeerd: false, geenPrik: false },
        echt: echt[i] || null };
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
      lever: bg && bg.type === 'dagteller' ? { beschadigd: teller.lever.beschadigd, gramBoven4g: teller.lever.gramBoven,
        punten: Math.round(teller.lever.punten) + 0 } : null,
      praktijk: praktijk(c, rijen, teller, telling)
    };
  }

  // ---------------------------------------------------------------------------------------------
  // Praktijkzin: eerste regel die past. Getallen alleen uit het casusblad of uit de eigen keuzes.
  // ---------------------------------------------------------------------------------------------
  function pct(x) { return Math.round(x * 100) + '%'; }

  var ZETPIL_WERKING = ['nauwelijks', 'maar half', 'goed']; // F ≤ 0,4 · 0,4 < F < 0,7 · F ≥ 0,7
  function zetpilKlasse(F) { return F <= 0.4 ? 0 : (F < 0.7 ? 1 : 2); }

  function zetpilZin(zetpillen) {
    var kl = zetpillen.map(function (x) { return zetpilKlasse(x.d.F); });
    var lo = Math.min.apply(null, kl), hi = Math.max.apply(null, kl), n = zetpillen.length;
    var kop = n === 1 ? 'Tijdens de misselijkheid koos jij de zetpil. '
      : 'Tijdens de misselijkheid koos jij ' + n + ' keer de zetpil. ';
    var regel = ['zetpilNauwelijks', 'zetpilHalf', 'zetpilGoed'][lo];
    if (lo !== hi) return { regel: 'zetpilWisselend',
      zin: kop + 'De ene werkte ' + ZETPIL_WERKING[hi] + ', ' + (n === 2 ? 'de andere ' : 'een andere ') +
        ZETPIL_WERKING[lo] + ': daar kun je niet op rekenen.' };
    if (lo === 2) return { regel: regel,
      zin: kop + (n === 1 ? 'Die werkte' : 'Ze werkten') + ' deze keer goed, maar een zetpil werkt soms goed en ' +
        'soms nauwelijks: daar kun je niet op rekenen.' };
    return { regel: regel, zin: kop + (n === 1 ? 'Die werkte ' : 'Ze werkten ') + ZETPIL_WERKING[lo] +
      ': daar kun je niet op rekenen.' };
  }

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
        zin: 'Jij gaf ' + getal(telling.dagteller.hoogste) + ' g in 24 uur, meer dan de ' + getal(telling.dagteller.max) +
          ' g die mag. Te veel paracetamol beschadigt de lever.' };
      if (!doses.length) return { regel: 'niets',
        zin: 'Jij gaf opa Jan geen paracetamol, dus de pijn kwam terug. ' +
          'Een vast schema op vaste tijden houdt de spiegel boven de streep.' };
      if (zetpillen.length) return zetpilZin(zetpillen);
      if (spuiten.length) return { regel: 'spuit',
        zin: 'Tijdens de misselijkheid koos jij de spuit. Een prik werkt meteen, ook als opa Jan niet kan slikken.' };
      if ((teller.uren.onder - teller.onderTijdensBlokkade) / T > 1 / 4) return { regel: 'veelOnder',
        zin: 'Opa Jan zat ' + pct(teller.uren.onder / T) + ' van de tijd onder de streep. ' +
          'Elke dosis werkt maar een paar uur: verdeel de doses over de dag.' };
      if (!inBlok.length && (geblokt || teller.onderTijdensBlokkade > 0)) return { regel: 'misselijkGemist',
        zin: 'Tijdens de misselijkheid kreeg opa Jan geen paracetamol, en de pijn kwam terug. ' +
          'Kan iemand niet slikken, dan kan het ook als zetpil of prik.' };
      return { regel: 'goed',
        zin: 'Jij bleef met ' + telling.totaleDosis.tekst + ' binnen de 4 g per dag. ' +
          'Een vast schema op vaste tijden houdt de pijn weg en de lever heel.' };
    }

    // lithium
    var tK = eersteKlaring(c), naDuur = T - tK;
    var isNa = function (r) { return r.t >= tK - 1e-9; };
    var weg = function (rs) { return rs.filter(function (r) { return r.jij.toedieningen.length === 0; }).length; };
    var tabl = function (r) { var n = 0; r.jij.toedieningen.forEach(function (d) { n += d.aantal; }); return n; };
    var naRijen = rijen.filter(isNa), voorRijen = rijen.filter(function (r) { return !isNa(r); });
    var wegVoor = weg(voorRijen), wegNa = weg(naRijen);
    var dubbelVoor = voorRijen.filter(function (r) { return tabl(r) >= 2; }).length;
    var dubbelNa = naRijen.filter(function (r) { return tabl(r) >= 2; }).length;
    var dubbel = dubbelVoor + dubbelNa;
    var keer = function (n) { return n + ' keer een dubbele dosis'; };
    var naZone = teller.na.zone / naDuur, naBoven = teller.na.boven / naDuur;

    if (teller.uren.toxisch > 0) {
      if (dubbel) return { regel: 'giftigDubbel',
        zin: 'Jij gaf ' + keer(dubbel) + ' en de spiegel kwam boven de 1,5: giftig. ' +
          'Bij lithium liggen goed en giftig dicht bij elkaar, dus nooit dubbel innemen.' };
      return { regel: 'giftig', // vangnet, in de race onbereikbaar
        zin: 'De spiegel kwam boven de 1,5: giftig, met kans op verwardheid en nieren in gevaar. ' +
          'Bij lithium liggen goed en giftig dicht bij elkaar.' };
    }
    if (!doses.length) return { regel: 'niets',
      zin: 'Jij gaf mevrouw De Vries geen lithium en de spiegel zakte onder de 0,6. ' +
        'Kans op terugval: somber of juist ontremd.' };
    if (teller.uren.onder > 0 && wegVoor > 0 && (teller.voor.onder > 0 || wegNa > 0)) {
      var waar = wegNa > 0 ? 'Jij sloeg ' + (wegVoor + wegNa) + ' van de ' + rijen.length + ' doses over, vóór én na de ibuprofen,'
        : 'Jij sloeg vóór de ibuprofen ' + wegVoor + ' van de ' + voorRijen.length + ' doses over';
      return { regel: 'overgeslagenOnder',
        zin: waar + ' en de spiegel zakte onder de 0,6. Kans op terugval: somber of juist ontremd.' };
    }
    if (wegNa > 0 && teller.na.onder > 0) return { regel: 'naIbuTeVeelWeg',
      zin: 'Jij liet na de ibuprofen ' + pct(wegNa / naRijen.length) + ' van de doses weg en de spiegel zakte ' +
        'onder de 0,6. In het echt verlaagt de arts de dosis en laat de spiegel prikken: zelf pillen overslaan ' +
        'is geen goed idee.' };
    if (dubbel && teller.uren.boven > 0) return { regel: 'dubbel',
      zin: dubbelNa
        ? 'Jij gaf na de ibuprofen ' + keer(dubbelNa) + ', terwijl de nieren al minder opruimden: de spiegel ' +
          'kwam boven de 1,0. Bij lithium nooit dubbel innemen: te veel geeft trillen, misselijkheid en diarree.'
        : 'Jij gaf ' + keer(dubbelVoor) + ' en de spiegel kwam boven de 1,0. ' +
          'Bij lithium nooit dubbel innemen: te veel geeft trillen, misselijkheid en diarree.' };
    if (wegNa > 0 && naZone >= 0.9 && naBoven < 0.05) return { regel: 'naIbuMinder',
      zin: 'Jij liet na de ibuprofen ' + pct(wegNa / naRijen.length) + ' van de doses weg. Dat was nodig, want ' +
        'de nieren ruimden minder op. In het echt verlaagt de arts de dosis en laat de spiegel prikken: pillen ' +
        'overslaan wordt makkelijk vergeten.' };
    if (naBoven >= 0.05) {
      if (wegNa > 0) return { regel: 'naIbuNogTeHoog',
        zin: 'Na de ibuprofen zat de spiegel ' + pct(naBoven) + ' van de tijd boven de 1,0, want de nieren ruimden ' +
          'minder op. In het echt verlaagt de arts de dosis en laat de spiegel prikken: zelf pillen overslaan is ' +
          'geen goed idee.' };
      return { regel: 'naIbuTeHoog',
        zin: 'Jij gaf na de ibuprofen gewoon alle doses en de spiegel kroop boven de 1,0, want de nieren ruimden ' +
          'minder op. In het echt: bij lithium liever paracetamol dan ibuprofen, en de spiegel laten prikken.' };
    }
    return { regel: 'nabespreking', zin: c.nabespreking }; // vangnet
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
