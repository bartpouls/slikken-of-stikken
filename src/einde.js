/*
 * Slikken of Stikken — src/einde.js  (eindscherm + toedienverslag per race; §2, §3, §6B5, §6C)
 *
 * INTERFACE (houd deze vast; app.js roept alleen dit aan)
 * ----------------------------------------------------------
 *   SoS.einde.toon(container, data, opnieuw) -> {stop()}
 *     container  <section id="scherm-einde" class="scherm">: leeg en zichtbaar. Vul hem zelf.
 *     data = {
 *       naam:    speelnaam (string),
 *       races:   [verslag1, verslag2]  — precies race.verslag() uit src/score.js (zie de API daar:
 *                casus, opbouw.regels/totaal, tijdlijn, echtSchema, telling, uren),
 *                volgorde paracetamol, lithium,
 *       totaal:  som van races[i].opbouw.totaal (QALY-punten),
 *       curves:  [[{t, C}, ...], [{t, C}, ...]] — de gespeelde spiegel per race, uitgedund
 *                (paracetamol elke 0,1 u, lithium elke 1 u; t in uur), voor een mini-grafiekje,
 *       casussen: [SoS.model.casus('paracetamol'), SoS.model.casus('lithium')]
 *     }
 *     opnieuw()  Roep aan bij "Nog een keer" (één tik; knop data-actie="opnieuw"). app.js start dan
 *                meteen race 1 opnieuw, met dezelfde naam (tutorial en intro worden overgeslagen).
 *     stop()     Opruimen als het scherm weggaat.
 *   Eisen (§6B): naam en totaalscore ≥ 32 px. (De nabespreekvraag is vervallen op verzoek van Bart: de docent
 *   reflecteert straks met de groep vanuit de eindverslagen.)
 *
 * OPBOUW (één scrollend scherm in dezelfde stijl als de rest: donkere grond met sterren, crème tekst,
 * markering; de mini-curves zien er net zo uit als de spiegel tijdens de race):
 *   1. Eindscherm (boven de vouw): speelnaam (36 px), totaal QALY-punten (72 px), per race een kaart met
 *      de QALY-punten en een tegelrij (één tegel per poortje, kleur = waar de spiegel tot het volgende
 *      poortje het meest zat: in de zone / te laag / te hoog / giftig; uit data.curves), de
 *      een regel over het scorebord, "spelpunten, geen echte QALY's".
 *   2. Toedienverslag per race (data-verslag="0|1"): mini-curve, QALY-opbouw in vijf regels (carbamazepine: zes) + totaal,
 *      rooster met je toedieningen per poortje naast het echte schema (van boven naar beneden, zoals de tijd in
 *      de race) en telling (toedienmomenten, gemiddeld per dag naast de grens). Geen praktijk- of
 *      nabesprekingszin (Bart, nov. 2026): het eindscherm koppelt terug wat er gebeurde, zonder les.
 *   3. "Nog een keer" (data-actie="opnieuw") direct onder de racekaarten; één tik.
 *   Dempknop (van app.js): rechtsboven zoals op de andere schermen, maar hij scrolt mee (nooit over tekst).
 *   Tegels = lijnkleuren van de race; ibuprofen oranje (zoals in de race);
 *   labels "Uur 0" / "Dag 5" zoals in de race; "≠" = neutraal grijs "anders dan schema" (geen oordeel).
 *   Alle getallen komen uit data (verslag/score) of het casusblad; dit bestand rekent niets nieuws uit,
 *   behalve de tegelkleur (welke toestand de meeste meetpunten van de eigen curve had).
 * Stabiele haken voor tests: [data-eind="naam"|"totaal"|"race-0"|"race-1"], [data-verslag="i"] met
 *   [data-regel="zone|laag|hoog|giftig|totaal"], [data-poortje="index"][data-soort], [data-tel="..."],
 *   knoppen data-actie="opnieuw" en "naar-verslag" (data-race).
 */
(function (root) {
  'use strict';
  if (!root) return;
  var SoS = root.SoS = root.SoS || {};

  var TOESTAND_LABEL = { zone: 'in de zone', onder: 'te laag', boven: 'te hoog', giftig: 'giftig' };
  var SOORT_LABEL = { tablet: 'Tablet', zetpil: 'Zetpil', spuit: 'Spuit', overgeslagen: 'Overslaan', geblokkeerd: 'geblokkeerd', geenKeuze: 'geen keuze' }; // knopnamen uit de race
  var IBU = '#F5A65A'; // ibuprofen: oranje, zoals in de race
  var LIJN = { zone: '#7ef0c4', onder: '#7cc4ff', boven: '#F6C343', giftig: '#ff4d5e' }; // = LIJNKLEUR in de race

  var WIE = { paracetamol: 'opa', lithium: 'vries', carbamazepine: 'idrissi' };
  function perDagCasus(c) { return c.raceDuur > 48; }
  function dec(c) { return c.id === 'lithium' ? 1 : 0; } // getallen van de grenzen
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function getal(x, dec) { return SoS.ui.getal(x, dec || 0); }
  function metTeken(x) { return x > 0 ? '+' + getal(x) : getal(x); } // getal() zet zelf "−"
  function lijst(xs) { // "0, 6, 12 en 18"
    return xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' en ' + xs[xs.length - 1];
  }

  function toestand(c, C, t) {
    var M = SoS.model, v = M.venster(c, t);
    if (c.toxisch != null && C > c.toxisch) return 'giftig';
    return C < v.laag ? 'onder' : (C > v.hoog ? 'boven' : 'zone');
  }

  // Per poortje: de toestand waarin de eigen spiegel tot het volgende poortje het vaakst zat.
  function tegelStaten(c, curve) {
    var tijden = SoS.model.poortjes(c), uit = [];
    var ernst = { zone: 0, onder: 1, boven: 2, giftig: 3 };
    for (var i = 0; i < tijden.length; i++) {
      var a = tijden[i], b = i + 1 < tijden.length ? tijden[i + 1] : c.raceDuur, n = {}, best = null;
      for (var j = 0; j < curve.length; j++) {
        var p = curve[j];
        if (p.t >= a - 1e-6 && p.t < b - 1e-6) { var s = toestand(c, p.C, p.t); n[s] = (n[s] || 0) + 1; }
      }
      Object.keys(n).forEach(function (s) {
        if (best == null || n[s] > n[best] || (n[s] === n[best] && ernst[s] > ernst[best])) best = s;
      });
      uit.push(best);
    }
    return uit;
  }

  // Paracetamol: leverschade zoals in de race: rood zolang de dagteller (doses in (t − 24 u, t]) boven het
  // maximum zit. Geeft een functie t -> bool (altijd false zonder dagteller).
  function leverOp(c, v) {
    var bg = c.bovengrens;
    if (!bg || bg.type !== 'dagteller') return function () { return false; };
    var doses = [];
    v.tijdlijn.forEach(function (r) { r.jij.toedieningen.forEach(function (d) { doses.push({ t: r.t, dosis: d.dosis }); }); });
    return function (t) {
      var som = 0;
      doses.forEach(function (d) { if (d.t <= t + 1e-6 && d.t > t - bg.venster + 1e-6) som += d.dosis; });
      return som > bg.maxPer24u + 1e-9;
    };
  }

  function stemming(c, v) {
    if (c.toxisch != null && v.uren && v.uren.toxisch > 0) return 'misselijk';
    if (v.lever && v.lever.beschadigd) return 'misselijk';
    return v.opbouw.totaal >= 500 ? 'blij' : (v.opbouw.totaal >= 0 ? 'neutraal' : 'pijn');
  }
  function figuurHtml(c, v, klasse) {
    return '<div class="fig ' + (klasse || '') + '" aria-hidden="true">' +
      SoS.ui.figuur({ wie: WIE[c.id] || 'opa', stemming: stemming(c, v) }) + '</div>';
  }

  // ------------------------------------------------------------------------------------------
  // 1. Eindscherm
  // ------------------------------------------------------------------------------------------
  function gebeurtenis(c, type) {
    var g = null;
    c.gebeurtenissen.forEach(function (x) { if (x.type === type) g = x; });
    return g;
  }
  function tijdLabel(c, t) { return perDagCasus(c) ? 'Dag ' + getal(t / 24) : 'Uur ' + t; } // als label, zoals in de race

  function kaartHtml(i, c, v, curve) {
    var staten = curve && curve.length ? tegelStaten(c, curve) : null;
    var tijden = SoS.model.poortjes(c), lever = leverOp(c, v);
    var blok = gebeurtenis(c, 'blokkade'), ibu = gebeurtenis(c, 'klaring');
    var tegels = '';
    if (staten) {
      tijden.forEach(function (t, k) { if (lever(t)) staten[k] = 'giftig'; });
      // twee rijen: paracetamol uur 0–11 | 12–23; lithium dag 0–4 | dag 5–9 (vanaf de ibuprofen)
      var perDagN = perDagCasus(c) ? Math.round(24 / c.poortjes.interval) : 1; // rijen beginnen op een hele dag
      var helft = Math.ceil(staten.length / 2 / perDagN) * perDagN;
      var rij = function (van, tot) {
        var s = '<span class="eind-tegelrij"><span class="eind-rijlabel">' + tijdLabel(c, tijden[van]) + '</span>' +
          '<span class="eind-tegelvak" style="--n:' + (tot - van) + '">';
        for (var k = van; k < tot; k++) {
          var t = tijden[k], extra = '';
          if (blok && t >= blok.van - 1e-9 && t < blok.tot - 1e-9) extra += ' m';
          if (ibu && Math.abs(t - ibu.t) < 1e-9) extra += ' ibu';
          s += '<span class="eind-tegel t-' + (staten[k] || 'leeg') + extra + '" style="--i:' + k + '"></span>';
        }
        return s + '</span></span>';
      };
      tegels = '<span class="eind-tegels" role="img" aria-label="Per poortje: waar de spiegel zat">' +
        rij(0, helft) + rij(helft, staten.length) + '</span>';
    }
    return '<button type="button" class="eind-kaart" data-actie="naar-verslag" data-race="' + i + '">' +
      '<span class="eind-kaart-kop">' + figuurHtml(c, v, 'eind-kaart-fig') +
        '<span class="eind-kaart-titel"><small>' + (i === 2 ? 'Bonusrace · telt niet mee' : 'Race ' + (i + 1)) + '</small>' + esc(c.naam) + '</span>' +
        '<span class="eind-kaart-rechts"><span class="eind-kaart-score" data-eind="race-' + i + '">' + getal(v.opbouw.totaal) + '</span>' +
        '<span class="eind-kaart-meer">verslag <span aria-hidden="true">↓</span></span></span>' +
      '</span>' + tegels +
    '</button>';
  }

  function legendaHtml(cs) {
    var heeft = { zone: true, onder: true, boven: false, giftig: false }, blok = false, ibu = false;
    cs.forEach(function (c) {
      if (!c) return;
      if (c.venster.some(function (v) { return v.hoog !== Infinity; })) heeft.boven = true;
      if (c.toxisch != null || (c.bovengrens && c.bovengrens.type === 'dagteller')) heeft.giftig = true;
      if (gebeurtenis(c, 'blokkade')) blok = true;
      if (gebeurtenis(c, 'klaring')) ibu = ibu ? ibu + ' / ' + (gebeurtenis(c, 'klaring').label || 'ibuprofen') : (gebeurtenis(c, 'klaring').label || 'ibuprofen');
    });
    var li = ['zone', 'onder', 'boven', 'giftig'].filter(function (s) { return heeft[s]; }).map(function (s) {
      return '<li><span class="eind-tegel t-' + s + '"></span>' + (s === 'giftig' ? 'lever / giftig' : TOESTAND_LABEL[s]) + '</li>';
    });
    if (blok) li.push('<li><span class="eind-leg-m"></span>misselijk</li>');
    if (ibu) li.push('<li><span class="eind-leg-ibu"></span>' + ibu + '</li>');
    return '<ul class="eind-legenda" aria-label="Uitleg van de tegels">' + li.join('') + '</ul>';
  }

  // ------------------------------------------------------------------------------------------
  // 2. Toedienverslag
  // ------------------------------------------------------------------------------------------
  function curveSvg(c, curve, lever) {
    if (!curve || curve.length < 2) return '';
    var W = 340, H = 132, L = 8, R = 30, T = 18, B = 22, pw = W - L - R, ph = H - T - B;
    var maxC = 0;
    curve.forEach(function (p) { if (p.C > maxC) maxC = p.C; });
    var vast = c.id === 'lithium' ? 2 : (c.id === 'carbamazepine' ? 24 : 20);
    var ymax = Math.max(vast, maxC * 1.08);
    var x = function (t) { return L + pw * t / c.raceDuur; };
    var y = function (C) { return T + ph * (1 - Math.min(C, ymax) / ymax); };
    var f = function (n) { return Math.round(n * 10) / 10; };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" ' +
      'aria-label="Jouw spiegel tijdens de race, met de zone">';
    s += '<rect x="0" y="0" width="' + W + '" height="' + H + '" rx="14" fill="#141A24"/>';
    // gebeurtenissen
    c.gebeurtenissen.forEach(function (g) {
      if (g.type === 'blokkade') {
        s += '<rect x="' + f(x(g.van)) + '" y="' + T + '" width="' + f(x(g.tot) - x(g.van)) + '" height="' + ph +
          '" fill="rgba(190,230,90,0.13)"/>';
        s += '<text x="' + f((x(g.van) + x(g.tot)) / 2) + '" y="' + (T - 5) + '" text-anchor="middle" class="eind-svg-gebeurtenis">misselijk</text>';
      } else if (g.type === 'klaring') {
        s += '<line x1="' + f(x(g.t)) + '" y1="' + T + '" x2="' + f(x(g.t)) + '" y2="' + (T + ph) +
          '" stroke="' + IBU + '" stroke-width="2"/>';
        if (g === gebeurtenis(c, 'klaring') || !g.label) s += '<text x="' + f(x(g.t) + 4) + '" y="' + (T - 5) + '" class="eind-svg-ibu">' + esc(g.label || 'ibuprofen') + '</text>';
      }
    });
    // het groene vlak: uit M.venster(casus, t), dus het schuift mee als het venster in de tijd verschuift
    var M = SoS.model, n = 48, boven = [], onder = [], heeftHoog = false;
    for (var k = 0; k <= n; k++) {
      var tk = c.raceDuur * k / n, vk = M.venster(c, tk);
      if (vk.hoog !== Infinity) heeftHoog = true;
      boven.push(f(x(tk)) + ' ' + f(vk.hoog === Infinity ? T : y(vk.hoog)));
      onder.push(f(x(tk)) + ' ' + f(y(vk.laag)));
    }
    s += '<path d="M' + boven.join(' L') + ' L' + onder.slice().reverse().join(' L') + ' Z" fill="rgba(61,220,151,0.16)"/>';
    s += '<path d="M' + onder.join(' L') + '" fill="none" stroke="rgba(61,220,151,0.85)" stroke-width="1.5"/>';
    if (heeftHoog) s += '<path d="M' + boven.join(' L') + '" fill="none" stroke="rgba(61,220,151,0.5)" stroke-width="1"/>';
    var v0 = M.venster(c, c.raceDuur); // labels rechts: het venster aan het eind van de race
    if (c.toxisch != null && c.toxisch < ymax) {
      s += '<line x1="' + L + '" y1="' + f(y(c.toxisch)) + '" x2="' + (L + pw) + '" y2="' + f(y(c.toxisch)) +
        '" stroke="rgba(255,90,90,0.7)" stroke-width="1.2" stroke-dasharray="4 4"/>';
    }
    // curve, gekleurd per toestand
    var stuk = null, paden = [];
    for (var i = 0; i < curve.length; i++) {
      var p = curve[i], st = lever(p.t) ? 'giftig' : toestand(c, p.C, p.t), pt = f(x(p.t)) + ' ' + f(y(p.C));
      if (!stuk || stuk.st !== st) {
        if (stuk) stuk.d += ' L' + pt;
        stuk = { st: st, d: 'M' + pt };
        paden.push(stuk);
      } else stuk.d += ' L' + pt;
    }
    paden.forEach(function (pd) {
      s += '<path d="' + pd.d + '" fill="none" stroke="' + LIJN[pd.st] + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>';
    });
    // labels: drempels (casusblad) en tijdas
    var labels = c.toxisch != null
      ? [[v0.laag, getal(v0.laag, dec(c)), 5], [v0.hoog, getal(v0.hoog, dec(c)), -1], [c.toxisch, getal(c.toxisch, dec(c)), 4]]
      : [[v0.laag, getal(v0.laag), 4]];
    var gezet = [];
    labels.forEach(function (lb) {
      if (lb[0] == null || lb[0] >= ymax) return;
      var yl = y(lb[0]) + lb[2];
      if (gezet.some(function (g) { return Math.abs(g - yl) < 12; })) return; // geen labels over elkaar
      gezet.push(yl);
      s += '<text x="' + (W - 3) + '" y="' + f(y(lb[0]) + lb[2]) + '" text-anchor="end" class="eind-svg-label' +
        (lb[0] === c.toxisch ? ' tox' : '') + '">' + esc(lb[1]) + '</text>';
    });
    var asTekst = perDagCasus(c)
      ? [[0, 'Dag 0'], [c.raceDuur / 2, 'Dag ' + c.raceDuur / 48], [c.raceDuur, 'Dag ' + c.raceDuur / 24]]
      : [[0, 'Uur 0'], [c.raceDuur / 2, 'Uur ' + c.raceDuur / 2], [c.raceDuur, 'Uur ' + c.raceDuur]];
    asTekst.forEach(function (a, k) {
      var anker = k === 0 ? 'start' : (k === 2 ? 'end' : 'middle');
      s += '<text x="' + f(x(a[0])) + '" y="' + (H - 6) + '" text-anchor="' + anker + '" class="eind-svg-as">' + a[1] + '</text>';
    });
    return s + '</svg>';
  }

  function opbouwHtml(v) {
    var rijen = v.opbouw.regels.map(function (r) {
      var kl = r.punten > 0 ? 'plus' : (r.punten < 0 ? 'min' : 'nul');
      return '<tr data-regel="' + r.id + '"><th scope="row">' + esc(r.label) + '</th>' +
        '<td class="' + kl + '">' + metTeken(r.punten) + '</td></tr>';
    }).join('');
    return '<table class="eind-opbouw"><caption>QALY-opbouw</caption><tbody>' + rijen +
      '<tr class="eind-opbouw-totaal" data-regel="totaal"><th scope="row">totaal</th><td>' + getal(v.opbouw.totaal) +
      '</td></tr></tbody></table>';
  }

  function celInhoud(rij) {
    var j = rij.jij, ic = SoS.ui.icoon;
    if (j.soorten.length && /mg$/.test(j.tekst)) return '<span class="eind-cel-txt mg">' + esc(j.tekst) + '</span>'; // dosisknoppen (lithium, carbamazepine)
    if (j.soorten.length) {
      return j.soorten.map(function (so) {
        return '<span class="eind-cel-ic">' + ic(so.soort) + (so.aantal > 1 ? '<b>' + so.aantal + '×</b>' : '') + '</span>';
      }).join('');
    }
    if (j.soort === 'geblokkeerd' || j.soort === 'geenKeuze') return '<span class="eind-cel-ic">' + ic('kruis') + '</span>' +
      (j.soort === 'geenKeuze' ? '<span class="eind-cel-txt">geen keuze</span>' : '');
    return '<span class="eind-cel-leeg" aria-hidden="true">–</span>';
  }

  function roosterHtml(c, v) {
    var M = SoS.model, rijen = v.tijdlijn;
    var blok = null;
    c.gebeurtenissen.forEach(function (g) { if (g.type === 'blokkade') blok = g; });
    var klaring = null;
    c.gebeurtenissen.forEach(function (g) { if (g.type === 'klaring') klaring = g; });
    var cel = function (r, metTijd) {
      var j = r.jij, misselijk = blok && r.t >= blok.van - 1e-9 && r.t < blok.tot - 1e-9;
      var echt = !!r.echt, n = 0;
      j.toedieningen.forEach(function (d) { n += d.aantal; });
      var anders = n !== (r.echtAantal || 0); // afwijking van het echte schema (aantal doses op dit poortje)
      var label = r.tijdTekst + ': ' + j.tekst + (r.echt ? '; echt schema ' + r.echt : '; echt schema niets') +
        (anders ? '; anders dan schema' : '');
      return '<li class="eind-cel' + (echt ? ' echt' : '') + (misselijk ? ' misselijk' : '') + (anders ? ' anders' : '') + ' s-' + j.soort + '"' +
        ' data-anders="' + (anders ? 1 : 0) + '"' +
        ' data-poortje="' + r.index + '" data-soort="' + j.soort + '" data-tekst="' + esc(j.tekst) + '"' +
        ' aria-label="' + esc(label) + '">' +
        (metTijd ? '<span class="eind-cel-uur" aria-hidden="true">uur ' + r.t + '</span>' : '') +
        celInhoud(r) +
        (echt ? '<span class="eind-cel-echt" aria-hidden="true">' + esc(r.echt) + '</span>' : '') +
        (anders ? '<span class="eind-cel-anders" aria-hidden="true">≠</span>' : '') + '</li>';
    };
    var s = '';
    if (perDagCasus(c)) {
      // rijen = dagen, kolommen = de poortjes van die dag
      var perDag = Math.round(24 / c.poortjes.interval), dagen = Math.ceil(rijen.length / perDag);
      var kop = rijen.slice(0, perDag).map(function (r) { return '<span>' + r.t + ' u</span>'; }).join('');
      s += '<div class="eind-rooster eind-rooster-dag" style="--k:' + perDag + '">';
      s += '<div class="eind-dagrij eind-dagkop" aria-hidden="true"><span></span>' + kop + '</div>';
      for (var d = 0; d < dagen; d++) {
        var r0 = rijen[d * perDag];
        if (klaring && Math.abs(r0.t - klaring.t) < 1e-9) {
          s += '<div class="eind-markering"><span>Dag ' + (klaring.t / 24) + ': ' + esc(klaring.label || 'ibuprofen') + '</span></div>';
        }
        s += '<div class="eind-dagrij"><span class="eind-dag">Dag ' + d + '</span><ul>' +
          rijen.slice(d * perDag, (d + 1) * perDag).map(function (r) { return cel(r, false); }).join('') + '</ul></div>';
      }
      s += '</div>';
    } else {
      // één dag, van boven naar beneden: elk uur een rij, zoals de tijd in de race
      s += '<ul class="eind-rooster eind-rooster-uur">' + rijen.map(function (r) { return cel(r, true); }).join('') + '</ul>';
    }
    // legenda: alleen wat voorkomt (+ altijd overgeslagen), en het echte schema
    var komtVoor = {};
    rijen.forEach(function (r) {
      r.jij.soorten.forEach(function (so) { komtVoor[so.soort] = true; });
      if (r.jij.soort === 'geblokkeerd') komtVoor.geblokkeerd = true;
      if (r.jij.soort === 'geenKeuze') komtVoor.geenKeuze = true;
    });
    var ic = SoS.ui.icoon;
    var leg = ['tablet', 'zetpil', 'spuit'].filter(function (k) { return komtVoor[k]; }).map(function (k) {
      return '<li><span class="eind-leg-ic">' + ic(k) + '</span>' + SOORT_LABEL[k] + '</li>';
    });
    if (komtVoor.geblokkeerd) leg.push('<li><span class="eind-leg-ic">' + ic('kruis') + '</span>geblokkeerd (wilde slikken, maar misselijk)</li>');
    if (komtVoor.geenKeuze) leg.push('<li><span class="eind-leg-ic">' + ic('kruis') + '</span>geen keuze (kost punten)</li>');
    leg.push('<li><span class="eind-leg-ic eind-leg-leeg">–</span>Overslaan</li>');
    leg.push('<li><span class="eind-leg-echt">' + esc(rijen.filter(function (r) { return r.echt; })[0].echt) + '</span>echt schema</li>');
    if (rijen.some(function (r) { var n = 0; r.jij.toedieningen.forEach(function (d) { n += d.aantal; }); return n !== (r.echtAantal || 0); })) {
      leg.push('<li><span class="eind-leg-anders">≠</span>anders dan schema</li>');
    }
    if (blok) leg.push('<li><span class="eind-leg-misselijk"></span>misselijk (' + esc(blok.tijdTekst.toLowerCase()) + ')</li>');
    return s + '<ul class="eind-leg">' + leg.join('') + '</ul>';
  }

  function echtTekstHtml(c, v) {
    var sch = c.echtSchema.schema, perDag = sch.filter(function (e) { return e.t < 24; });
    var dosis = (v.tijdlijn.filter(function (r) { return r.echt; })[0] || {}).echt || '';
    var tijden = perDag.map(function (e) { return e.t; });
    var lek;
    if (c.id === 'carbamazepine') {
      lek = '2× per dag 200 mg (start laag: meneer El Idrissi moet wennen aan de bijwerkingen); na 2 weken, als de lever het sneller afbreekt, 2× per dag 400 mg. In het echt op geleide van een spiegelbepaling, maximaal 1.200 mg per dag.';
    } else if (c.id === 'lithium') {
      lek = '1× per dag ' + dosis + ' retard (' + (sch[0].aantal || 1) + ' tabletten van ' + c.dosis.mg + ' mg) om ' + sch[0].t + ' uur, het avondpoortje leeg; vanaf de dag na de ibuprofen ' +
        getal((sch[sch.length - 1].aantal || 1) * c.dosis.mg) + ' mg, en de spiegel laten prikken.';
    } else {
      lek = perDag.length + '× per dag ' + dosis + ' (om ' + lijst(tijden) + ' uur).';
      // Een dosis van het echte schema tijdens de misselijkheid: dan kan opa Jan niet slikken.
      var blok = gebeurtenis(c, 'blokkade');
      var inBlok = blok ? tijden.filter(function (t) { return t >= blok.van - 1e-9 && t < blok.tot - 1e-9; }) : [];
      if (inBlok.length) {
        lek += ' Om ' + lijst(inBlok) + ' uur is opa Jan misselijk en kan hij niet slikken: dan krijgt hij die ' + dosis +
          ' als zetpil of prik.';
      }
    }
    return '<p class="eind-echt"><span class="eind-echt-kop">Echt schema</span> <b>' + esc(v.echtSchema.tekst) + '</b><br>' +
      'Dat is: ' + esc(lek) + '</p>';
  }

  // Telling: hoe vaak gaf je iets, en wat kreeg de patiënt gemiddeld per dag naast de grens (paracetamol: max. 1 g
  // per keer en 4 g per dag; lithium: het schema per dag en het venster). Een totaal "x mg in y dagen" zegt
  // spelers weinig; per dag kun je naast de grens leggen.
  function tellingHtml(v) {
    var t = v.telling, pd = t.perDag, s = '<div class="eind-telling">';
    s += '<div data-tel="momenten"><span>Toedien&shy;momenten</span><b>' + getal(t.toedienmomenten) + '</b>' +
      '<small>echt schema: ' + getal(v.echtSchema.aantal) + (t.geenKeuze ? ' · ' + t.geenKeuze + '× geen keuze' : '') + '</small></div>';
    if (t.dagteller) { // paracetamol: de race is één dag, dus per dag = de dagteller
      s += '<div data-tel="dagteller" class="' + (t.dagteller.over ? 'over' : '') + '"><span>Per dag</span>' +
        '<b>' + getal(t.dagteller.hoogste, t.dagteller.hoogste % 1 ? 1 : 0) + ' g</b>' +
        '<small>' + esc(pd.grens) + (t.dagteller.over ? '. Lever in gevaar.' : '') + '</small></div>';
    } else if (pd) {
      s += '<div data-tel="perdag"><span>Gemiddeld per dag</span><b>' + getal(pd.gemiddeld, pd.gemiddeld % 1 ? 1 : 0) + '</b>' +
        '<small>tabletten (' + esc(pd.tekst.replace(/^.*\(|\)$/g, '')) + '); ' + esc(pd.grens) + '</small></div>';
    }
    return s + '</div>';
  }

  function verslagHtml(i, c, v, curve) {
    var s = '<section class="eind-verslag" data-verslag="' + i + '" id="eind-verslag-' + i + '" aria-labelledby="eind-v-kop-' + i + '">';
    s += '<p class="markering">' + (i === 2 ? 'Bonusrace' : 'Race ' + (i + 1)) + ' · verslag</p>';
    s += '<header class="eind-v-kop">' + figuurHtml(c, v, 'eind-v-fig') +
      '<div><h2 id="eind-v-kop-' + i + '">' + esc(c.naam) + ' <span class="eind-v-wie">' + esc(c.patient) + '</span></h2>' +
      '<p class="eind-v-score"><b>' + getal(v.opbouw.totaal) + '</b> QALY-punten</p></div></header>';
    var lever = leverOp(c, v), leverOoit = curve && curve.some(function (p) { return lever(p.t); });
    if (curve && curve.length > 1) {
      s += '<figure class="eind-curve">' + curveSvg(c, curve, lever) +
        '<figcaption>Jouw spiegel als concentratie-tijdcurve, zoals in een boek: de tijd loopt hier naar rechts. In de race was het dezelfde curve, een kwartslag gedraaid. Het groene vlak: in de zone (' + esc(c.zone.tekst.split(' = ')[0]) + '); de onderkant is de streep.' +
        (c.toxisch != null ? ' Rode stippellijn: giftig (' + esc(c.toxischTekst || getal(c.toxisch, 1)) + ').' : '') +
        (leverOoit ? ' Rode lijn: meer dan ' + getal(c.bovengrens.maxPer24u / 1000) + ' g in 24 uur. ' + esc(c.lekentaal.boven) : '') +
        '</figcaption></figure>';
    }
    s += opbouwHtml(v);
    s += '<h3 class="eind-h3">Jouw toedieningen per poortje</h3>';
    s += echtTekstHtml(c, v);
    s += roosterHtml(c, v);
    s += tellingHtml(v);
    return s + '</section>';
  }

  // ------------------------------------------------------------------------------------------
  // Logo Capsule Pop (ongewijzigd bestand uit bartpouls/epic-green-cards, assets/capsule-pop.svg), rechtsonder in de voettekst.
  var LOGO_VOET = '<footer class="cp-voet"><div class="cp-logo"><svg xmlns="http://www.w3.org/2000/svg" viewBox="133 33 134 270" width="20" height="40" role="img" aria-label="Capsule Pop"><title>Capsule Pop logo, rust-stand</title><path d="M140,172 V100 A60,60 0 0 1 260,100 V172 Z" fill="#F28C28"/><path d="M140,172 H260 V236 A60,60 0 0 1 140,236 Z" fill="#1F8A9E"/><path d="M226,104 A30,30 0 0 0 212,76 L222,64 A42,42 0 0 1 242,104 V156 H226 Z" fill="#C2620E"/><path d="M242,176 H258 V236 A58,58 0 0 1 230,286 L223,274 A44,44 0 0 0 242,236 Z" fill="#14606F"/><circle cx="178" cy="198" r="5" fill="#8FD3DB"/><circle cx="200" cy="214" r="7" fill="#F6C343"/><circle cx="224" cy="196" r="4" fill="#FBF4E6"/><circle cx="186" cy="236" r="6" fill="#FBF4E6"/><circle cx="214" cy="248" r="5" fill="#8FD3DB"/><circle cx="174" cy="262" r="4" fill="#F6C343"/><circle cx="198" cy="272" r="6" fill="#8FD3DB"/><circle cx="228" cy="224" r="3.5" fill="#F6C343"/><path d="M172,86 A36,36 0 0 1 204,74" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/><circle cx="215" cy="79" r="3" fill="#FFFFFF"/><path d="M260.0,175.0 L260.0,100.0 L260.0,98.5 L259.9,97.1 L259.8,95.6 L259.7,94.1 L259.5,92.7 L259.4,91.2 L259.1,89.7 L258.8,88.3 L258.5,86.9 L258.2,85.4 L257.8,84.0 L257.4,82.6 L257.0,81.2 L256.5,79.8 L256.0,78.4 L255.4,77.0 L254.9,75.7 L254.2,74.3 L253.6,73.0 L252.9,71.7 L252.2,70.4 L251.5,69.2 L250.7,67.9 L249.9,66.7 L249.1,65.5 L248.2,64.3 L247.3,63.1 L246.4,61.9 L245.4,60.8 L244.5,59.7 L243.5,58.6 L242.4,57.6 L241.4,56.5 L240.3,55.5 L239.2,54.6 L238.1,53.6 L236.9,52.7 L235.7,51.8 L234.5,50.9 L233.3,50.1 L232.1,49.3 L230.8,48.5 L229.6,47.8 L228.3,47.1 L227.0,46.4 L225.7,45.8 L224.3,45.1 L223.0,44.6 L221.6,44.0 L220.2,43.5 L218.8,43.0 L217.4,42.6 L216.0,42.2 L214.6,41.8 L213.1,41.5 L211.7,41.2 L210.3,40.9 L208.8,40.6 L207.3,40.5 L205.9,40.3 L204.4,40.2 L202.9,40.1 L201.5,40.0 L200.0,40.0 L198.5,40.0 L197.1,40.1 L195.6,40.2 L194.1,40.3 L192.7,40.5 L191.2,40.6 L189.7,40.9 L188.3,41.2 L186.9,41.5 L185.4,41.8 L184.0,42.2 L182.6,42.6 L181.2,43.0 L179.8,43.5 L178.4,44.0 L177.0,44.6 L175.7,45.1 L174.3,45.8 L173.0,46.4 L171.7,47.1 L170.4,47.8 L169.2,48.5 L167.9,49.3 L166.7,50.1 L165.5,50.9 L164.3,51.8 L163.1,52.7 L161.9,53.6 L160.8,54.6 L159.7,55.5 L158.6,56.5 L157.6,57.6 L156.5,58.6 L155.5,59.7 L154.6,60.8 L153.6,61.9 L152.7,63.1 L151.8,64.3 L150.9,65.5 L150.1,66.7 L149.3,67.9 L148.5,69.2 L147.8,70.4 L147.1,71.7 L146.4,73.0 L145.8,74.3 L145.1,75.7 L144.6,77.0 L144.0,78.4 L143.5,79.8 L143.0,81.2 L142.6,82.6 L142.2,84.0 L141.8,85.4 L141.5,86.9 L141.2,88.3 L140.9,89.7 L140.6,91.2 L140.5,92.7 L140.3,94.1 L140.2,95.6 L140.1,97.1 L140.0,98.5 L140.0,100.0 L140.0,236.0 L140.0,237.5 L140.1,238.9 L140.2,240.4 L140.3,241.9 L140.5,243.3 L140.6,244.8 L140.9,246.3 L141.2,247.7 L141.5,249.1 L141.8,250.6 L142.2,252.0 L142.6,253.4 L143.0,254.8 L143.5,256.2 L144.0,257.6 L144.6,259.0 L145.1,260.3 L145.8,261.7 L146.4,263.0 L147.1,264.3 L147.8,265.6 L148.5,266.8 L149.3,268.1 L150.1,269.3 L150.9,270.5 L151.8,271.7 L152.7,272.9 L153.6,274.1 L154.6,275.2 L155.5,276.3 L156.5,277.4 L157.6,278.4 L158.6,279.5 L159.0,279.8 L159.0,175.0 Z M159.1,98.0 L159.2,96.0 L159.4,94.0 L159.8,92.0 L160.2,90.0 L160.8,88.1 L161.4,86.2 L162.1,84.3 L162.9,82.5 L163.8,80.7 L164.8,78.9 L165.9,77.2 L167.1,75.6 L168.3,74.0 L169.6,72.5 L171.0,71.0 L172.5,69.6 L174.0,68.3 L175.6,67.1 L177.2,65.9 L178.9,64.8 L180.7,63.8 L182.5,62.9 L184.3,62.1 L186.2,61.4 L188.1,60.8 L190.0,60.2 L192.0,59.8 L194.0,59.4 L196.0,59.2 L198.0,59.1 L200.0,59.0 L202.0,59.1 L204.0,59.2 L206.0,59.4 L208.0,59.8 L210.0,60.2 L211.9,60.8 L213.8,61.4 L215.7,62.1 L217.5,62.9 L219.3,63.8 L221.1,64.8 L222.8,65.9 L224.4,67.1 L226.0,68.3 L227.5,69.6 L229.0,71.0 L230.4,72.5 L231.7,74.0 L232.9,75.6 L234.1,77.2 L235.2,78.9 L236.2,80.7 L237.1,82.5 L237.9,84.3 L238.6,86.2 L239.2,88.1 L239.8,90.0 L240.2,92.0 L240.6,94.0 L240.8,96.0 L240.9,98.0 L241.0,100.1 L241.0,153.0 L159.0,153.0 L159.0,100.1 Z" fill="#1B2230" fill-rule="evenodd"/><path d="M259.0,171.0 L259.0,99.9 L258.9,97.1 L258.7,94.2 L258.4,91.3 L257.9,88.5 L257.2,85.7 L256.5,82.9 L255.6,80.1 L254.5,77.4 L253.3,74.8 L252.0,72.2 L250.6,69.7 L249.1,67.2 L247.4,64.9 L245.6,62.6 L243.7,60.4 L241.7,58.3 L239.6,56.3 L237.4,54.4 L235.1,52.6 L232.8,50.9 L230.3,49.4 L227.8,48.0 L225.2,46.7 L222.6,45.5 L219.9,44.4 L217.1,43.5 L214.3,42.8 L211.5,42.1 L208.7,41.6 L205.8,41.3 L202.9,41.1 L200.0,41.0 L197.1,41.1 L194.2,41.3 L191.3,41.6 L188.5,42.1 L185.7,42.8 L182.9,43.5 L180.1,44.4 L177.4,45.5 L174.8,46.7 L172.2,48.0 L169.7,49.4 L167.2,50.9 L164.9,52.6 L162.6,54.4 L160.4,56.3 L158.3,58.3 L156.3,60.4 L154.4,62.6 L152.6,64.9 L150.9,67.2 L149.4,69.7 L148.0,72.2 L146.7,74.8 L145.5,77.4 L144.4,80.1 L143.5,82.9 L142.8,85.7 L142.1,88.5 L141.6,91.3 L141.3,94.2 L141.1,97.1 L141.0,99.9 L141.0,246.9 L141.2,247.7 L141.5,249.1 L141.8,250.6 L142.2,252.0 L142.6,253.4 L143.0,254.8 L143.5,256.2 L144.0,257.6 L144.6,259.0 L145.1,260.3 L145.8,261.7 L146.4,263.0 L147.1,264.3 L147.8,265.6 L148.5,266.8 L149.3,268.1 L150.1,269.3 L150.9,270.5 L151.8,271.7 L152.7,272.9 L153.6,274.1 L154.6,275.2 L155.0,275.7 L155.0,171.0 Z M155.1,97.8 L155.2,95.6 L155.5,93.4 L155.9,91.2 L156.4,89.1 L156.9,86.9 L157.6,84.8 L158.4,82.8 L159.3,80.8 L160.3,78.8 L161.4,76.9 L162.6,75.0 L163.9,73.2 L165.2,71.5 L166.7,69.8 L168.2,68.2 L169.8,66.7 L171.5,65.2 L173.2,63.9 L175.0,62.6 L176.9,61.4 L178.8,60.3 L180.8,59.3 L182.8,58.4 L184.8,57.6 L186.9,56.9 L189.1,56.4 L191.2,55.9 L193.4,55.5 L195.6,55.2 L197.8,55.1 L200.0,55.0 L202.2,55.1 L204.4,55.2 L206.6,55.5 L208.8,55.9 L210.9,56.4 L213.1,56.9 L215.2,57.6 L217.2,58.4 L219.2,59.3 L221.2,60.3 L223.1,61.4 L225.0,62.6 L226.8,63.9 L228.5,65.2 L230.2,66.7 L231.8,68.2 L233.3,69.8 L234.8,71.5 L236.1,73.2 L237.4,75.0 L238.6,76.9 L239.7,78.8 L240.7,80.8 L241.6,82.8 L242.4,84.8 L243.1,86.9 L243.6,89.1 L244.1,91.2 L244.5,93.4 L244.8,95.6 L244.9,97.8 L245.0,100.1 L245.0,157.0 L155.0,157.0 L155.0,100.1 Z" fill="#FBF4E6" fill-rule="evenodd"/><path d="M140,236 V100 A60,60 0 0 1 260,100 V236 A60,60 0 0 1 140,236 Z" fill="none" stroke="#1B2230" stroke-width="5" stroke-linejoin="round"/></svg></div></footer>';

  function toon(container, data, opnieuw) {
    var ui = SoS.ui, M = SoS.model;
    data = data || {};
    var races = data.races || [], curves = data.curves || [];
    var cs = races.map(function (v, i) {
      return (data.casussen && data.casussen[i]) || (v ? M.casus(v.casus) : null);
    });
    var totaal = data.totaal != null ? data.totaal : races.reduce(function (s, v) { return s + (v ? v.opbouw.totaal : 0); }, 0);

    var kaarten = '', verslagen = '';
    races.forEach(function (v, i) {
      if (!v || !cs[i]) return;
      kaarten += kaartHtml(i, cs[i], v, curves[i]);
      verslagen += verslagHtml(i, cs[i], v, curves[i]);
    });

    container.innerHTML =
      '<div class="eind-binnen">' +
        '<div class="eind-held">' +
          // twee lege zwevers houden alleen de eerste regel vrij van de dempknop (rechtsboven), symmetrisch
          '<p class="eind-naam" data-eind="naam"><span class="eind-naam-vrij" aria-hidden="true"></span>' +
            '<span class="eind-naam-vrij r" aria-hidden="true"></span>' + esc(data.naam || '') + '</p>' +
          '<p class="eind-label">QALY-punten totaal</p>' +
          '<p class="eind-totaal" data-eind="totaal">' + getal(totaal) + '</p>' +
          '<div class="eind-kaarten">' + kaarten + '</div>' +
          legendaHtml(cs) +
          '<div class="eind-acties"><button type="button" class="knop-hoofd groot" data-actie="opnieuw">Nog een keer</button>' +
            (data.bonus && !races[2] ? '<button type="button" class="knop-lijn groot" data-actie="bonus">Bonusrace: carbamazepine</button>' : '') + '</div>' +
          '<p class="eind-scorebord">Laat je naam en totaal op het scorebord zetten.</p>' +
          '<p class="eind-spelpunten">QALY-punten zijn spelpunten, geen echte QALY\'s.</p>' +
        '</div>' +
        verslagen +
        '<div class="eind-voet"><button type="button" class="knop-lijn" data-actie="naar-boven">' +
          '<span aria-hidden="true">↑</span>&nbsp;Terug naar je score</button></div>' +
        LOGO_VOET +
      '</div>';

    var bezig = false;
    var weg = [];
    function luister(el, ev, fn) { el.addEventListener(ev, fn); weg.push(function () { el.removeEventListener(ev, fn); }); }

    luister(container.querySelector('[data-actie="opnieuw"]'), 'click', function () {
      if (bezig) return;
      bezig = true;
      ui.speel('tik');
      opnieuw();
    });
    var bonusK = container.querySelector('[data-actie="bonus"]');
    if (bonusK) luister(bonusK, 'click', function () { if (bezig) return; bezig = true; ui.speel('tik'); data.bonus(); });
    Array.prototype.forEach.call(container.querySelectorAll('[data-actie="naar-verslag"]'), function (k) {
      luister(k, 'click', function () {
        var doel = container.querySelector('[data-verslag="' + k.getAttribute('data-race') + '"]');
        if (!doel) return;
        ui.speel('tik');
        var glad = !(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
        container.scrollTo({ top: doel.offsetTop - 8, behavior: glad ? 'smooth' : 'auto' });
      });
    });
    // figuurtjes reageren op aanraken
    Array.prototype.forEach.call(container.querySelectorAll('.eind-v-fig'), function (f) {
      luister(f, 'pointerdown', function () {
        f.classList.remove('wiebel'); void f.offsetWidth; f.classList.add('wiebel');
        ui.speel('tik');
      });
    });

    luister(container.querySelector('[data-actie="naar-boven"]'), 'click', function () {
      ui.speel('tik');
      var glad = !(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
      container.scrollTo({ top: 0, behavior: glad ? 'smooth' : 'auto' });
    });

    // De dempknop van app.js staat vast rechtsboven en zou bij scrollen over tekst liggen: zolang het
    // eindscherm open is, staat hij op dezelfde plek (rechtsboven) maar scrolt hij mee met de pagina; de
    // speelnaam laat daar ruimte voor. stop() zet hem terug.
    var demp = root.document.getElementById('demp'), dempTerug = null;
    if (demp && demp.parentNode) {
      dempTerug = { ouder: demp.parentNode, na: demp.nextSibling };
      container.appendChild(demp);
    }
    // idem de menuknop (linksboven)
    var menuK = root.document.getElementById('menu-knop'), menuTerug = null;
    if (menuK && menuK.parentNode) {
      menuTerug = { ouder: menuK.parentNode, na: menuK.nextSibling };
      container.appendChild(menuK);
    }

    // Speelnaam: 1–2 regels, alleen breken op spaties; zo nodig kleiner, maar nooit onder 32 px.
    var naamEl = container.querySelector('[data-eind="naam"]');
    function pasNaam() {
      var max = root.innerHeight >= 800 ? 40 : (root.innerHeight >= 700 ? 36 : 34);
      naamEl.style.overflowWrap = 'normal';
      for (var px = max; px >= 32; px--) {
        naamEl.style.fontSize = px + 'px';
        var regels = Math.round(naamEl.offsetHeight / (px * 1.08));
        if (naamEl.scrollWidth <= naamEl.clientWidth + 1 && regels <= 2) return;
      }
      naamEl.style.fontSize = '32px';
      naamEl.style.overflowWrap = 'anywhere'; // één woord dat zelfs op 32 px niet past
    }
    pasNaam();
    luister(root, 'resize', pasNaam);

    container.scrollTop = 0;
    ui.speel('klaar');
    return {
      stop: function () {
        bezig = true;
        weg.forEach(function (f) { f(); });
        weg = [];
        if (dempTerug && demp) {
          try { dempTerug.ouder.insertBefore(demp, dempTerug.na && dempTerug.na.parentNode === dempTerug.ouder ? dempTerug.na : null); }
          catch (e) { /* negeer */ }
          dempTerug = null;
        }
        if (menuTerug && menuK) {
          try { menuTerug.ouder.insertBefore(menuK, menuTerug.na && menuTerug.na.parentNode === menuTerug.ouder ? menuTerug.na : null); }
          catch (e) { /* negeer */ }
          menuTerug = null;
        }
      }
    };
  }

  SoS.einde = { toon: toon };
})(typeof window !== 'undefined' ? window : null);
