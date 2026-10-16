/*
 * Slikken of Stikken — src/model.js  (rekenmodel §4 + casusdata §5 uit docs/bouwopdracht.md)
 * Puur JS, geen DOM. Browser: <script src="model.js"> zet alleen window.SoS.model.
 * Node: const M = require('./src/model.js').
 *
 * PUBLIEKE API (voor UI- en scorebouwers)
 * ---------------------------------------
 * M.CASUSSEN.paracetamol / M.CASUSSEN.lithium   Casusdata, letterlijk uit het casusblad (zie onder).
 * M.casus(id)                       -> casusobject (id 'paracetamol' | 'lithium', of een object zelf).
 * M.venster(casus, t)               -> {laag, hoog}: therapeutisch venster op tijdstip t (uur).
 *                                      Komt uit casus.venster (reeks [{vanaf, laag, hoog}], stapsgewijs);
 *                                      nu constant, later schuivend (opiaten). hoog = Infinity = geen bovengrens.
 * M.poortjes(casus)                 -> [tijden in uur] van de doseermomenten.
 * M.ZETPIL_REEKS                    -> vaste reeks [{F, ka}] (24 stuks, voor iedereen gelijk).
 * M.zetpil(i)                       -> {F, ka} voor poortje-index i (i modulo 24). Het spel gebruikt
 *                                      i = index van het poortje in de race (paracetamol: i = uur 0..23),
 *                                      dus dezelfde keuze op hetzelfde moment geeft iedereen hetzelfde.
 * M.k(casus, t)                     -> eliminatieconstante (/u) op tijdstip t, inclusief klaringgebeurtenissen.
 * M.steadyState(casus)              -> {C, depot, min, max, tau}: begintoestand lithium (dalspiegel vlak
 *                                      vóór een dosis), uit de modelkern berekend (vaste-puntoplossing).
 * M.geblokkeerd(casus, route, t)    -> null of de gebeurtenis die deze route op t blokkeert (van ≤ t < tot,
 *                                      met tolerantie 1e-9 u tegen zwevendekommaruis; ook in M.venster).
 *
 * (a) Incrementeel, voor de UI:
 *   const sim = M.maakSim('paracetamol', {blokkades: true});
 *   sim.geef('slik' | 'zetpil' | 'spuit', {aantal, F, ka, index})  -> {ok, reden?, tekst?, dosis, F, ka}
 *       slik/zetpil: dosis*F naar een eigen opnamedepot (eerste orde, ka); spuit: C += dosis/Vd.
 *       zetpil zonder F/ka: M.zetpil(index ?? huidig poortje-index).  aantal = aantal tabletten (dubbel = 2).
 *       Weigering (ok:false): reden 'geblokkeerd' (misselijkheid: slikken uur 10–16) of 'geenPrik'
 *       (lithium-spuitknop: casus.routes.spuit.tekst tonen, géén effect, geen strafpunten).
 *   sim.stap(dt)  (exact), sim.naar(t), sim.t, sim.C, sim.depot (som depots), sim.kNu,
 *   sim.venster() -> {laag,hoog} nu, sim.dagteller(t?) -> dosis in (t-24, t], sim.log (alle toedieningen).
 * (b) Batch:
 *   M.simuleer(casus, schema, {dt=0.005, blokkades=true, duur=casus.raceDuur})
 *       schema: [{t, route:'slik'|'zetpil'|'spuit', aantal?, F?, ka?}] (toedieningen op t; overslaan = weglaten)
 *       -> {t:[], C:[], log:[], samenvatting:{fractieInZone, fractieOnder, fractieBoven, fractieToxisch,
 *            urenInZone, urenOnder, urenBoven, urenToxisch, piek, tPiek, totaleDosis, aantalToedieningen,
 *            aantalTabletten, max24u, lever (bool, max24u > bovengrens), laatsteDag:{min,max}}}
 *   Beide ingangen delen dezelfde kern (stapExact): exacte exponentiële oplossing per depot, gesplitst
 *   op klaringsmomenten, dus geen integratiefout; dt bepaalt alleen de meetpunten.
 * M.analytisch.iv(D, Vd, k, t), M.analytisch.oraal(F, D, ka, Vd, k, t)  — formules §4 (voor tests).
 *
 * Eenheden: tijd in uur. Paracetamol: dosis mg, C mg/L. Lithium: dosis mmol Li⁺, C mmol/L.
 *
 * INTERPRETATIE VAN DE TABEL "VERWACHTE UITKOMSTEN" (gereproduceerd in tests/model.test.mjs):
 *  - Tijdfracties: meetpunten t = 0, dt, ..., duur−dt (dt = 0,005 u), elk punt telt voor dt; toediening op t
 *    telt al mee in het meetpunt t. Paracetamol "in zone" = C ≥ 5. Lithium "in zone" = 0,6 ≤ C ≤ 1,0;
 *    "> 1,0" = C > 1,0; "> 1,5" = C > 1,5 (de > 1,5-tijd zit ook in > 1,0).
 *  - Poortje op t = 0 telt als doseermoment (paracetamol 0,6,12,18; lithium 0,8,...,232).
 *  - Lithium start in steady state als dalspiegel VLAK VÓÓR de dosis van t = 0 (die dosis kiest de speler).
 *  - "Elke 3e dosis overslaan na de ibuprofen": poortjes vanaf t = 120 genummerd 1,2,3,...; nummer 3,6,9,...
 *    (t = 136, 160, 184, 208, 232) wordt overgeslagen.
 *  - "Laatste dag" = min–max van C over [duur−24, duur].
 *  - De tabel gaat uit van het schema zónder blokkade door misselijkheid (slik om 12 u telt gewoon);
 *    reproduceer met {blokkades:false}. In het spel (blokkades:true) wordt slikken uur 10–16 geweigerd.
 *  - Totale dosis = som van de nominale doses (zetpil en spuit tellen voor 1 g, ook bij lage F); de dagteller
 *    (max24u) gebruikt hetzelfde.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  if (typeof window !== 'undefined') {
    window.SoS = window.SoS || {};
    window.SoS.model = api;
  }
})(this, function () {
  'use strict';

  var LN2 = Math.log(2);
  // Tolerantie (uur) voor tijdvergelijkingen met poortjes/blokkades/venster: een UI die met stap(0.1) of
  // stap(1/30) oploopt komt op t = 9,99999999999998 uit; dat telt als uur 10.
  var EPS_T = 1e-9;

  // ---------------------------------------------------------------------------------------------
  // Zetpilreeks: vaste, met de hand gekozen reeks (F in 0,3–0,9; ka in 0,3–1,0 /u). Eén waarde per
  // poortje-index (paracetamol: uur 0..23). Wisselt bewust tussen "goed" (F ≥ 0,7) en "nauwelijks"
  // (F ≤ 0,4), met ook middenwaarden; beide grenzen van beide bereiken komen voor. In het
  // misselijkheidsvenster (uur 10–15): 10 goed, 11 nauwelijks, 12 middel (0,6/0,6, = tabelregel),
  // 13 nauwelijks (0,35/0,3), 14 goed, 15 matig.
  // ---------------------------------------------------------------------------------------------
  var ZETPIL_REEKS = Object.freeze([
    { F: 0.80, ka: 0.90 }, //  0
    { F: 0.35, ka: 0.40 }, //  1
    { F: 0.65, ka: 0.55 }, //  2
    { F: 0.90, ka: 1.00 }, //  3
    { F: 0.30, ka: 0.30 }, //  4
    { F: 0.55, ka: 0.80 }, //  5
    { F: 0.75, ka: 0.45 }, //  6
    { F: 0.40, ka: 0.95 }, //  7
    { F: 0.85, ka: 0.65 }, //  8
    { F: 0.45, ka: 0.35 }, //  9
    { F: 0.70, ka: 0.85 }, // 10
    { F: 0.30, ka: 0.50 }, // 11
    { F: 0.60, ka: 0.60 }, // 12
    { F: 0.35, ka: 0.30 }, // 13
    { F: 0.90, ka: 0.75 }, // 14
    { F: 0.50, ka: 0.40 }, // 15
    { F: 0.80, ka: 0.55 }, // 16
    { F: 0.30, ka: 0.70 }, // 17
    { F: 0.65, ka: 1.00 }, // 18
    { F: 0.40, ka: 0.45 }, // 19
    { F: 0.85, ka: 0.35 }, // 20
    { F: 0.55, ka: 0.90 }, // 21
    { F: 0.75, ka: 0.30 }, // 22
    { F: 0.35, ka: 0.60 }  // 23
  ].map(Object.freeze));

  function zetpil(i) {
    var n = ZETPIL_REEKS.length;
    var j = ((Math.round(i || 0) % n) + n) % n;
    return { F: ZETPIL_REEKS[j].F, ka: ZETPIL_REEKS[j].ka };
  }

  function reeks(van, stap, aantal) {
    var r = [];
    for (var i = 0; i < aantal; i++) r.push(van + i * stap);
    return r;
  }

  // ---------------------------------------------------------------------------------------------
  // Casusdata (§5). Teksten woordelijk uit het casusblad.
  // ---------------------------------------------------------------------------------------------
  var paracetamol = {
    id: 'paracetamol',
    naam: 'Paracetamol',
    patient: 'Opa Jan',
    gewichtKg: 70,
    verhaal: 'Opa Jan (70 kg) heeft net een nieuwe heup. De pijn moet weg, zijn lever moet heel blijven.',
    eenheid: { dosis: 'mg', concentratie: 'mg/L', tijd: 'uur' },
    VdPerKg: 0.9,          // L/kg
    Vd: 63,                // L ("0,9 L/kg → 63 L")
    VdTekst: '0,9 L/kg → 63 L',
    Thalf: 2.5,            // uur
    ThalfTekst: '2,5 uur',
    routes: {
      slik: {
        dosis: 1000, F: 0.85, ka: 1.5,
        tekst: '1 g per keer, F = 0,85, ka = 1,5 /u (piek ±9,2 mg/L na ±1,4 u)'
      },
      zetpil: {
        dosis: 1000, Fbereik: [0.3, 0.9], kaBereik: [0.3, 1.0], reeks: ZETPIL_REEKS,
        tekst: '1 g per keer. Per zetpil F uit 0,3–0,9 en ka uit 0,3–1,0 /u, uit een vaste reeks (voor iedereen gelijk)'
      },
      spuit: {
        dosis: 1000, F: 1, directePiek: 15.9, telMeeVoorDagteller: true, inTutorial: true, inRace: true,
        tekst: '1 g iv, directe piek 1000/63 = 15,9 mg/L. In tutorial en race 1. Telt mee voor de dagteller.'
      }
    },
    zone: { laag: 5, hoog: Infinity, label: 'pijnstilling (vereenvoudigd)', tekst: '≥ 5 mg/L = "pijnstilling (vereenvoudigd)"' },
    // Therapeutisch venster als reeks in de tijd: vanaf t geldt {laag, hoog} (tot de volgende regel).
    venster: [{ vanaf: 0, laag: 5, hoog: Infinity }],
    toxisch: null, // geen concentratiegrens; de bovengrens is de dagteller
    bovengrens: {
      type: 'dagteller', maxPer24u: 4000, venster: 24,
      tekst: 'Dagteller: maximaal 4 g per 24 uur. Daarboven: levermeter vol.'
    },
    poortjes: { interval: 1, tijden: reeks(0, 1, 24), aantal: 24, tekst: 'elk uur (24 poortjes)', keuzes: ['slik', 'zetpil', 'spuit', 'niets'] },
    raceDuur: 24,
    raceDuurTekst: '24 uur patiënttijd (±10 T½)',
    gebeurtenissen: [{
      type: 'blokkade', van: 10, tot: 16, routes: ['slik'],
      tijdTekst: 'Uur 10 tot 16',
      tekst: 'Opa is misselijk na de narcose.',
      gevolg: 'Slikken geblokkeerd; zetpil, spuit of niets.'
    }],
    echtSchema: {
      tekst: '1 g 4dd',
      schema: [{ t: 0, route: 'slik' }, { t: 6, route: 'slik' }, { t: 12, route: 'slik' }, { t: 18, route: 'slik' }]
    },
    lekentaal: {
      onder: 'Au. De pijn komt terug.',          // onder de zone
      boven: 'Te veel paracetamol beschadigt de lever.' // boven 4 g (dagteller)
    },
    nabespreking: null // het casusblad geeft voor paracetamol geen nabesprekingstekst
  };

  var lithium = {
    id: 'lithium',
    naam: 'Lithium',
    patient: 'Mevrouw De Vries',
    gewichtKg: 70,
    verhaal: 'Mevrouw De Vries (70 kg) gebruikt al jaren lithium tegen stemmingsschommelingen. Halverwege heeft ze rugpijn en koopt ze ibuprofen bij de drogist.',
    eenheid: { dosis: 'mmol', concentratie: 'mmol/L', tijd: 'uur' },
    dosis: { mg: 400, stof: 'lithiumcarbonaat', mmol: 10.8, tekst: '400 mg lithiumcarbonaat = 10,8 mmol Li⁺ per poortje' },
    VdPerKg: 0.8,
    Vd: 56,
    VdTekst: '0,8 L/kg → 56 L',
    Thalf: 24,
    ThalfTekst: '24 uur',
    routes: {
      slik: { dosis: 10.8, F: 1.0, ka: 1.0, tekst: 'F = 1,0; ka = 1,0 /u (piek ±3,5 u na inname)' },
      spuit: {
        doetNiets: true, strafpunten: false,
        tekst: 'Lithium bestaat niet als prik. Slikken of stikken!',
        regel: 'Zichtbaar, maar doet niets aan de spiegel. Bij tikken: "Lithium bestaat niet als prik. Slikken of stikken!" Geen strafpunten.'
      }
    },
    zone: { laag: 0.6, hoog: 1.0, tekst: '0,6–1,0 mmol/L' },
    venster: [{ vanaf: 0, laag: 0.6, hoog: 1.0 }],
    toxisch: 1.5, // > 1,5 mmol/L
    toxischTekst: '> 1,5 mmol/L',
    bovengrens: { type: 'concentratie', waarde: 1.5, tekst: '> 1,5 mmol/L' },
    poortjes: {
      interval: 8, tijden: reeks(0, 8, 30), aantal: 30, keuzes: ['slik', 'overslaan'],
      tekst: '3× per dag, om 0, 8 en 16 uur (30 poortjes); keuze slikken of overslaan'
    },
    start: {
      type: 'steadyState', interval: 8, dosis: 10.8, schema: '3dd 400 mg', bereik: [0.76, 0.87],
      tekst: 'Al in steady state op 3dd 400 mg: spiegel ±0,76–0,87'
    },
    raceDuur: 240,
    raceDuurTekst: '10 dagen patiënttijd (±10 T½)',
    gebeurtenissen: [{
      type: 'klaring', t: 120, tot: null, factor: 0.7, tegenactie: false,
      tijdTekst: 'Dag 5 (t = 120 u)',
      tekst: 'Mevrouw De Vries koopt ibuprofen bij de drogist.',
      gevolg: 'Klaring × 0,7 tot het einde. Geen tegenactie mogelijk.'
    }],
    echtSchema: {
      tekst: '3dd 400 mg; na een NSAID spiegel controleren',
      schema: reeks(0, 8, 30).map(function (t) { return { t: t, route: 'slik' }; })
    },
    lekentaal: {
      onder: 'Kans op terugval: somber of juist ontremd.',
      boven: 'Trillen, misselijk, diarree. Nog hoger: verward, nieren in gevaar.'
    },
    nabespreking: 'In het echt: bij lithium liever paracetamol dan ibuprofen, en de spiegel laten prikken.'
  };

  var CASUSSEN = { paracetamol: paracetamol, lithium: lithium };

  function casus(c) {
    if (c && typeof c === 'object') return c;
    var r = CASUSSEN[c];
    if (!r) throw new Error('Onbekende casus: ' + c);
    return r;
  }

  function venster(c, t) {
    c = casus(c);
    var v = c.venster[0];
    for (var i = 1; i < c.venster.length; i++) if (t >= c.venster[i].vanaf - EPS_T) v = c.venster[i];
    return { laag: v.laag, hoog: v.hoog };
  }

  function poortjes(c) { return casus(c).poortjes.tijden.slice(); }

  function poortjeIndex(c, t) {
    var tij = casus(c).poortjes.tijden, best = 0;
    for (var i = 1; i < tij.length; i++) if (Math.abs(tij[i] - t) < Math.abs(tij[best] - t)) best = i;
    return best;
  }

  function k0(c) { return LN2 / casus(c).Thalf; }

  // Eliminatieconstante op t: k × product van de klaringsfactoren die op t gelden.
  function kOp(c, t) {
    c = casus(c);
    var k = k0(c);
    for (var i = 0; i < c.gebeurtenissen.length; i++) {
      var g = c.gebeurtenissen[i];
      if (g.type === 'klaring' && t >= g.t && (g.tot == null || t < g.tot)) k *= g.factor;
    }
    return k;
  }

  // Tijdstippen waarop k verandert (voor het splitsen van stappen).
  function kGrenzen(c) {
    var r = [];
    casus(c).gebeurtenissen.forEach(function (g) {
      if (g.type === 'klaring') { r.push(g.t); if (g.tot != null) r.push(g.tot); }
    });
    return r.sort(function (a, b) { return a - b; });
  }

  function geblokkeerd(c, route, t) {
    var gs = casus(c).gebeurtenissen;
    for (var i = 0; i < gs.length; i++) {
      var g = gs[i];
      if (g.type === 'blokkade' && g.routes.indexOf(route) >= 0 && t >= g.van - EPS_T && t < g.tot - EPS_T) return g;
    }
    return null;
  }

  // ---------------------------------------------------------------------------------------------
  // Kern: exacte oplossing over een interval h met constante k.
  //   A(h) = A·e^(−ka·h)
  //   C(h) = C·e^(−k·h) + A·ka/(Vd·(ka−k))·(e^(−k·h) − e^(−ka·h))       (ka ≠ k)
  //   C(h) = C·e^(−k·h) + A·k·h·e^(−k·h)/Vd                               (ka = k, limiet)
  // depots: [{A, ka}] (A = reeds met F vermenigvuldigde hoeveelheid). Muteert de depots, geeft C terug.
  // ---------------------------------------------------------------------------------------------
  function stapExact(C, depots, Vd, k, h) {
    if (h <= 0) return C;
    var ek = Math.exp(-k * h);
    var Cn = C * ek;
    for (var i = 0; i < depots.length; i++) {
      var d = depots[i];
      if (d.A === 0) continue;
      var eka = Math.exp(-d.ka * h);
      var diff = d.ka - k;
      if (Math.abs(diff) < 1e-9 * Math.max(d.ka, k)) Cn += d.A * k * h * ek / Vd;
      else Cn += d.A * d.ka / (Vd * diff) * (ek - eka);
      d.A *= eka;
    }
    return Cn;
  }

  // Steady state bij herhaald slikken (dosis D elke tau), dalspiegel vlak vóór een dosis.
  // Volledig uit de kern: de afbeelding over één interval is lineair,
  //   A_volgend = (A + F·D)·a ;  C_volgend = C·b + (A + F·D)·g
  // met a, b, g bepaald door stapExact op eenheidstoestanden. Vast punt:
  //   A* = F·D·a/(1−a) ;  C* = (A* + F·D)·g/(1−b).
  function steadyState(c, opties) {
    c = casus(c);
    opties = opties || {};
    var r = c.routes.slik, tau = opties.tau || c.start.interval, D = opties.dosis || c.start.dosis;
    var k = k0(c), FD = r.F * D;
    var d1 = [{ A: 1, ka: r.ka }];
    var g = stapExact(0, d1, c.Vd, k, tau), a = d1[0].A;
    var b = stapExact(1, [], c.Vd, k, tau);
    var A = FD * a / (1 - a);
    var C = (A + FD) * g / (1 - b);
    // min/max over één interval in steady state (fijn bemonsterd met dezelfde kern)
    var Cc = C, dep = [{ A: A + FD, ka: r.ka }], mn = C, mx = C, n = 1600, h = tau / n;
    for (var i = 0; i < n; i++) {
      Cc = stapExact(Cc, dep, c.Vd, k, h);
      if (Cc < mn) mn = Cc;
      if (Cc > mx) mx = Cc;
    }
    return { C: C, depot: A, ka: r.ka, tau: tau, min: mn, max: mx, naInterval: Cc };
  }

  // ---------------------------------------------------------------------------------------------
  // (a) Incrementele simulatie voor de UI.
  // ---------------------------------------------------------------------------------------------
  function maakSim(c, opties) {
    c = casus(c);
    opties = opties || {};
    var blokkades = opties.blokkades !== false;
    var grenzen = kGrenzen(c);
    var sim = {
      casus: c,
      t: opties.t0 || 0,
      C: 0,
      depots: [],
      log: [],
      get depot() { var s = 0; for (var i = 0; i < this.depots.length; i++) s += this.depots[i].A; return s; },
      get kNu() { return kOp(c, this.t); }
    };
    if (c.start && c.start.type === 'steadyState' && opties.steadyState !== false) {
      var ss = steadyState(c);
      sim.C = ss.C;
      sim.depots.push({ A: ss.depot, ka: ss.ka });
    }

    sim.stap = function (dt) {
      var eind = sim.t + dt;
      while (sim.t < eind - 1e-12) {
        var tot = eind;
        for (var i = 0; i < grenzen.length; i++) if (grenzen[i] > sim.t + 1e-12 && grenzen[i] < tot) tot = grenzen[i];
        sim.C = stapExact(sim.C, sim.depots, c.Vd, kOp(c, sim.t + 1e-12), tot - sim.t);
        sim.t = tot;
      }
      sim.t = eind;
      return sim.C;
    };
    sim.naar = function (t) { if (t > sim.t) sim.stap(t - sim.t); return sim.C; };
    sim.venster = function () { return venster(c, sim.t); };

    sim.geef = function (route, o) {
      o = o || {};
      var aantal = o.aantal == null ? 1 : o.aantal;
      var r = c.routes[route];
      var res = { ok: false, route: route, t: sim.t, aantal: aantal };
      if (!r) { res.reden = 'onbekend'; return res; }
      if (r.doetNiets) { res.reden = 'geenPrik'; res.tekst = r.tekst; sim.log.push(res); return res; }
      var b = blokkades && geblokkeerd(c, route, sim.t);
      if (b) { res.reden = 'geblokkeerd'; res.tekst = b.tekst; res.gebeurtenis = b; sim.log.push(res); return res; }
      var D = r.dosis * aantal, F, ka;
      if (route === 'spuit') {
        F = 1; ka = null;
        sim.C += D / c.Vd;
      } else {
        if (route === 'zetpil') {
          var z = (o.F != null && o.ka != null) ? { F: o.F, ka: o.ka }
            : zetpil(o.index != null ? o.index : poortjeIndex(c, sim.t));
          F = z.F; ka = z.ka;
        } else { F = o.F != null ? o.F : r.F; ka = o.ka != null ? o.ka : r.ka; }
        var dep = null;
        for (var i = 0; i < sim.depots.length; i++) if (sim.depots[i].ka === ka) dep = sim.depots[i];
        if (!dep) { dep = { A: 0, ka: ka }; sim.depots.push(dep); }
        dep.A += F * D;
      }
      res.ok = true; res.dosis = D; res.F = F; res.ka = ka;
      sim.log.push(res);
      return res;
    };

    // Som van de nominale doses in (t−24, t].
    sim.dagteller = function (t) {
      if (t == null) t = sim.t;
      var s = 0;
      for (var i = 0; i < sim.log.length; i++) {
        var l = sim.log[i];
        if (l.ok && l.t > t - 24 - 1e-9 && l.t <= t + 1e-9) s += l.dosis;
      }
      return s;
    };
    return sim;
  }

  // ---------------------------------------------------------------------------------------------
  // (b) Batch: volledig schema over de racelengte.
  // ---------------------------------------------------------------------------------------------
  function simuleer(c, schema, opties) {
    c = casus(c);
    opties = opties || {};
    var dt = opties.dt || 0.005;
    var duur = opties.duur != null ? opties.duur : c.raceDuur;
    var sim = maakSim(c, opties);
    var lijst = (schema || []).slice().sort(function (a, b) { return a.t - b.t; });
    var n = Math.round(duur / dt);
    var ts = new Array(n + 1), Cs = new Array(n + 1);
    var j = 0, tox = c.toxisch;
    var uIn = 0, uOnder = 0, uBoven = 0, uTox = 0, piek = -Infinity, tPiek = 0;
    var ldMin = Infinity, ldMax = -Infinity;
    for (var i = 0; i <= n; i++) {
      var t = i * dt;
      sim.naar(t);
      while (j < lijst.length && lijst[j].t <= t + 1e-9) {
        var s = lijst[j++];
        sim.geef(s.route, s);
      }
      var C = sim.C;
      ts[i] = t; Cs[i] = C;
      if (C > piek) { piek = C; tPiek = t; }
      if (t >= duur - 24 - 1e-9) { if (C < ldMin) ldMin = C; if (C > ldMax) ldMax = C; }
      if (i < n) {
        var v = venster(c, t);
        if (C < v.laag) uOnder += dt;
        else if (C > v.hoog) uBoven += dt;
        else uIn += dt;
        if (tox != null && C > tox) uTox += dt;
      }
    }
    var tot = 0, aantal = 0, tabletten = 0, max24 = 0;
    sim.log.forEach(function (l) {
      if (!l.ok) return;
      tot += l.dosis; aantal++; tabletten += l.aantal;
      var d = sim.dagteller(l.t);
      if (d > max24) max24 = d;
    });
    var bg = c.bovengrens;
    return {
      t: ts, C: Cs, log: sim.log,
      samenvatting: {
        duur: duur,
        urenInZone: uIn, urenOnder: uOnder, urenBoven: uBoven, urenToxisch: uTox,
        fractieInZone: uIn / duur, fractieOnder: uOnder / duur, fractieBoven: uBoven / duur, fractieToxisch: uTox / duur,
        piek: piek, tPiek: tPiek,
        totaleDosis: tot, aantalToedieningen: aantal, aantalTabletten: tabletten,
        max24u: max24,
        lever: bg && bg.type === 'dagteller' ? max24 > bg.maxPer24u : false,
        laatsteDag: { min: ldMin, max: ldMax }
      }
    };
  }

  var analytisch = {
    iv: function (D, Vd, k, t) { return D / Vd * Math.exp(-k * t); },
    oraal: function (F, D, ka, Vd, k, t) {
      return F * D * ka / (Vd * (ka - k)) * (Math.exp(-k * t) - Math.exp(-ka * t));
    }
  };

  return {
    versie: '1.0',
    CASUSSEN: CASUSSEN,
    ZETPIL_REEKS: ZETPIL_REEKS,
    casus: casus,
    venster: venster,
    poortjes: poortjes,
    poortjeIndex: poortjeIndex,
    zetpil: zetpil,
    k: kOp,
    geblokkeerd: geblokkeerd,
    steadyState: steadyState,
    stapExact: stapExact,
    maakSim: maakSim,
    simuleer: simuleer,
    analytisch: analytisch
  };
});
