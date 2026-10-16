/*
 * Slikken of Stikken — src/einde.js  (eindscherm + toedienverslag per race; §2, §3, §6B5, §6C)
 *
 * INTERFACE (houd deze vast; app.js roept alleen dit aan)
 * ----------------------------------------------------------
 *   SoS.einde.toon(container, data, opnieuw) -> {stop()}
 *     container  <section id="scherm-einde" class="scherm wit">: leeg en zichtbaar. Vul hem zelf.
 *     data = {
 *       naam:    speelnaam (string),
 *       races:   [verslag1, verslag2]  — precies race.verslag() uit src/score.js (zie de API daar:
 *                casus, opbouw.regels/totaal, tijdlijn, echtSchema, telling, uren, praktijk.zin),
 *                volgorde paracetamol, lithium,
 *       totaal:  som van races[i].opbouw.totaal (QALY-punten),
 *       curves:  [[{t, C}, ...], [{t, C}, ...]] — de gespeelde spiegel per race, uitgedund
 *                (paracetamol elke 0,1 u, lithium elke 1 u; t in uur), voor een mini-grafiekje,
 *       casussen: [SoS.model.casus('paracetamol'), SoS.model.casus('lithium')]
 *     }
 *     opnieuw()  Roep aan bij "Nog een keer" (één tik; knop data-actie="opnieuw"). app.js start dan
 *                meteen race 1 opnieuw, met dezelfde naam (tutorial en intro worden overgeslagen).
 *     stop()     Opruimen als het scherm weggaat.
 *   Eisen (§6B): naam en totaalscore ≥ 32 px; nabespreekvraag "Wat deed je toen je onder de streep zakte?".
 *
 * OPBOUW (één scrollend scherm, wit = Evolution-of-Trust-stijl zoals start en intro; de mini-curves
 * zijn zwarte racepaneeltjes, zodat ze er net zo uitzien als tijdens de race):
 *   1. Eindscherm (boven de vouw): speelnaam (36 px), totaal QALY-punten (72 px), per race een kaart met
 *      de QALY-punten en een tegelrij (één tegel per poortje, kleur = waar de spiegel tot het volgende
 *      poortje het meest zat: in de zone / te laag / te hoog / giftig; uit data.curves), de
 *      nabespreekvraag, een regel over het scorebord, "spelpunten, geen echte QALY's".
 *   2. Toedienverslag per race (data-verslag="0|1"): mini-curve, QALY-opbouw in vier regels + totaal,
 *      rooster met je toedieningen per poortje naast het echte schema, telling (toedienmomenten,
 *      totale dosis, dagteller), de praktijkzin en (lithium) de nabesprekingszin uit het casusblad.
 *   3. "Nog een keer" (data-actie="opnieuw") direct onder de nabespreekvraag; één tik.
 *   Dempknop (van app.js): rechtsboven zoals op de andere schermen, maar hij scrolt mee (nooit over tekst).
 *   Tegels = lijnkleuren van de race op een zwart paneeltje; ibuprofen oranje (zoals in de race);
 *   labels "Uur 0" / "Dag 5" zoals in de race; "≠" = neutraal grijs "anders dan schema" (geen oordeel).
 *   Alle getallen komen uit data (verslag/score) of het casusblad; dit bestand rekent niets nieuws uit,
 *   behalve de tegelkleur (welke toestand de meeste meetpunten van de eigen curve had).
 * Stabiele haken voor tests: [data-eind="naam"|"totaal"|"race-0"|"race-1"], [data-verslag="i"] met
 *   [data-regel="zone|laag|hoog|giftig|totaal"], [data-poortje="index"][data-soort], [data-tel="..."],
 *   [data-zin="praktijk"|"nabespreking"], knoppen data-actie="opnieuw" en "naar-verslag" (data-race).
 */
(function (root) {
  'use strict';
  if (!root) return;
  var SoS = root.SoS = root.SoS || {};

  var VRAAG = 'Wat deed je toen je onder de streep zakte?';
  var TOESTAND_LABEL = { zone: 'in de zone', onder: 'te laag', boven: 'te hoog', giftig: 'giftig' };
  var SOORT_LABEL = { tablet: 'Tablet', zetpil: 'Zetpil', spuit: 'Spuit', overgeslagen: 'overgeslagen', geblokkeerd: 'geblokkeerd' }; // knopnamen uit de race
  var IBU = '#ff9f43'; // ibuprofen: oranje, zoals in de race (paars is voor de poortjes)
  var LIJN = { zone: '#7ef0c4', onder: '#7cc4ff', boven: '#ffe14d', giftig: '#ff4d5e' }; // = LIJNKLEUR in de race

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
      SoS.ui.figuur({ wie: c.id === 'lithium' ? 'vries' : 'opa', stemming: stemming(c, v),
        prop: c.id === 'lithium' ? null : 'stok' }) + '</div>';
  }

  // ------------------------------------------------------------------------------------------
  // 1. Eindscherm
  // ------------------------------------------------------------------------------------------
  function gebeurtenis(c, type) {
    var g = null;
    c.gebeurtenissen.forEach(function (x) { if (x.type === type) g = x; });
    return g;
  }
  function tijdLabel(c, t) { return c.id === 'lithium' ? 'Dag ' + getal(t / 24) : 'Uur ' + t; } // als label, zoals in de race

  function kaartHtml(i, c, v, curve) {
    var staten = curve && curve.length ? tegelStaten(c, curve) : null;
    var tijden = SoS.model.poortjes(c), lever = leverOp(c, v);
    var blok = gebeurtenis(c, 'blokkade'), ibu = gebeurtenis(c, 'klaring');
    var tegels = '';
    if (staten) {
      tijden.forEach(function (t, k) { if (lever(t)) staten[k] = 'giftig'; });
      // twee rijen: paracetamol uur 0–11 | 12–23; lithium dag 0–4 | dag 5–9 (vanaf de ibuprofen)
      var helft = Math.ceil(staten.length / 2);
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
        '<span class="eind-kaart-titel"><small>Race ' + (i + 1) + '</small>' + esc(c.naam) + '</span>' +
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
      if (gebeurtenis(c, 'klaring')) ibu = true;
    });
    var li = ['zone', 'onder', 'boven', 'giftig'].filter(function (s) { return heeft[s]; }).map(function (s) {
      return '<li><span class="eind-tegel t-' + s + '"></span>' + (s === 'giftig' ? 'lever / giftig' : TOESTAND_LABEL[s]) + '</li>';
    });
    if (blok) li.push('<li><span class="eind-leg-m"></span>misselijk</li>');
    if (ibu) li.push('<li><span class="eind-leg-ibu"></span>ibuprofen</li>');
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
    var vast = c.id === 'lithium' ? 2 : 20;
    var ymax = Math.max(vast, maxC * 1.08);
    var x = function (t) { return L + pw * t / c.raceDuur; };
    var y = function (C) { return T + ph * (1 - Math.min(C, ymax) / ymax); };
    var f = function (n) { return Math.round(n * 10) / 10; };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" ' +
      'aria-label="Jouw spiegel tijdens de race, met de zone">';
    s += '<rect x="0" y="0" width="' + W + '" height="' + H + '" rx="14" fill="#000"/>';
    // gebeurtenissen
    c.gebeurtenissen.forEach(function (g) {
      if (g.type === 'blokkade') {
        s += '<rect x="' + f(x(g.van)) + '" y="' + T + '" width="' + f(x(g.tot) - x(g.van)) + '" height="' + ph +
          '" fill="rgba(190,230,90,0.13)"/>';
        s += '<text x="' + f((x(g.van) + x(g.tot)) / 2) + '" y="' + (T - 5) + '" text-anchor="middle" class="eind-svg-gebeurtenis">misselijk</text>';
      } else if (g.type === 'klaring') {
        s += '<line x1="' + f(x(g.t)) + '" y1="' + T + '" x2="' + f(x(g.t)) + '" y2="' + (T + ph) +
          '" stroke="' + IBU + '" stroke-width="2"/>';
        s += '<text x="' + f(x(g.t) + 4) + '" y="' + (T - 5) + '" class="eind-svg-ibu">ibuprofen</text>';
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
    var labels = c.id === 'lithium'
      ? [[v0.laag, getal(v0.laag, 1), 5], [v0.hoog, getal(v0.hoog, 1), -1], [c.toxisch, getal(c.toxisch, 1), 4]]
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
    var asTekst = c.id === 'lithium'
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
    if (j.soorten.length) {
      return j.soorten.map(function (so) {
        return '<span class="eind-cel-ic">' + ic(so.soort) + (so.aantal > 1 ? '<b>' + so.aantal + '×</b>' : '') + '</span>';
      }).join('');
    }
    if (j.soort === 'geblokkeerd') return '<span class="eind-cel-ic">' + ic('kruis') + '</span>';
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
      var anders = echt ? n !== 1 : n > 0; // afwijking van het echte schema (aantal doses op dit poortje)
      var label = r.tijdTekst + ': ' + j.tekst + (r.echt ? '; echt schema ' + r.echt : '; echt schema niets') +
        (anders ? '; anders dan schema' : '');
      return '<li class="eind-cel' + (echt ? ' echt' : '') + (misselijk ? ' misselijk' : '') + (anders ? ' anders' : '') + ' s-' + j.soort + '"' +
        ' data-anders="' + (anders ? 1 : 0) + '"' +
        ' data-poortje="' + r.index + '" data-soort="' + j.soort + '" data-tekst="' + esc(j.tekst) + '"' +
        ' aria-label="' + esc(label) + '">' +
        (metTijd ? '<span class="eind-cel-uur" aria-hidden="true">' + r.t + '</span>' : '') +
        celInhoud(r) +
        (echt ? '<span class="eind-cel-echt" aria-hidden="true">' + esc(r.echt) + '</span>' : '') +
        (anders ? '<span class="eind-cel-anders" aria-hidden="true">≠</span>' : '') + '</li>';
    };
    var s = '';
    if (c.id === 'lithium') {
      // rijen = dagen, kolommen = de poortjes van die dag
      var perDag = Math.round(24 / c.poortjes.interval), dagen = Math.ceil(rijen.length / perDag);
      var kop = rijen.slice(0, perDag).map(function (r) { return '<span>' + r.t + ' u</span>'; }).join('');
      s += '<div class="eind-rooster eind-rooster-dag" style="--k:' + perDag + '">';
      s += '<div class="eind-dagrij eind-dagkop" aria-hidden="true"><span></span>' + kop + '</div>';
      for (var d = 0; d < dagen; d++) {
        var r0 = rijen[d * perDag];
        if (klaring && Math.abs(r0.t - klaring.t) < 1e-9) {
          s += '<div class="eind-markering"><span>Dag ' + (klaring.t / 24) + ': ibuprofen</span></div>';
        }
        s += '<div class="eind-dagrij"><span class="eind-dag">Dag ' + d + '</span><ul>' +
          rijen.slice(d * perDag, (d + 1) * perDag).map(function (r) { return cel(r, false); }).join('') + '</ul></div>';
      }
      s += '</div>';
    } else {
      // rijen van 6 uur: het echte schema (om de 6 uur) valt steeds in de eerste kolom
      var stap = c.echtSchema.schema.length > 1 ? Math.round((c.echtSchema.schema[1].t - c.echtSchema.schema[0].t) / c.poortjes.interval) : 6;
      s += '<ul class="eind-rooster eind-rooster-uur" style="--k:' + stap + '">' + rijen.map(function (r) { return cel(r, true); }).join('') + '</ul>';
    }
    // legenda: alleen wat voorkomt (+ altijd overgeslagen), en het echte schema
    var komtVoor = {};
    rijen.forEach(function (r) {
      r.jij.soorten.forEach(function (so) { komtVoor[so.soort] = true; });
      if (r.jij.soort === 'geblokkeerd') komtVoor.geblokkeerd = true;
    });
    var ic = SoS.ui.icoon;
    var leg = ['tablet', 'zetpil', 'spuit'].filter(function (k) { return komtVoor[k]; }).map(function (k) {
      return '<li><span class="eind-leg-ic">' + ic(k) + '</span>' + SOORT_LABEL[k] + '</li>';
    });
    if (komtVoor.geblokkeerd) leg.push('<li><span class="eind-leg-ic">' + ic('kruis') + '</span>geblokkeerd (wilde slikken, maar misselijk)</li>');
    leg.push('<li><span class="eind-leg-ic eind-leg-leeg">–</span>overgeslagen</li>');
    leg.push('<li><span class="eind-leg-echt">' + esc(rijen.filter(function (r) { return r.echt; })[0].echt) + '</span>echt schema</li>');
    if (rijen.some(function (r) { var n = 0; r.jij.toedieningen.forEach(function (d) { n += d.aantal; }); return r.echt ? n !== 1 : n > 0; })) {
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
    if (c.id === 'lithium') {
      lek = perDag.length + '× per dag ' + dosis + ' (om ' + lijst(tijden) + ' uur): elk poortje 1 tablet van ' + dosis + '. Na een pijnstiller als ibuprofen (een NSAID): de spiegel laten prikken.';
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

  function tellingHtml(v) {
    var t = v.telling, s = '<div class="eind-telling">';
    s += '<div data-tel="momenten"><span>Toedien&shy;momenten</span><b>' + getal(t.toedienmomenten) + '</b>' +
      '<small>echt schema: ' + getal(v.echtSchema.aantal) + '</small></div>';
    s += '<div data-tel="dosis"><span>Totale dosis</span><b>' + esc(t.totaleDosis.tekst) + '</b></div>';
    if (t.dagteller) {
      s += '<div data-tel="dagteller" class="' + (t.dagteller.over ? 'over' : '') + '"><span>Dagteller</span>' +
        '<b>' + getal(t.dagteller.hoogste, t.dagteller.hoogste % 1 ? 1 : 0) + ' g</b>' +
        '<small>max. ' + getal(t.dagteller.max) + ' g per 24 uur' + (t.dagteller.over ? '. Lever beschadigd.' : '') + '</small></div>';
    }
    return s + '</div>';
  }

  function verslagHtml(i, c, v, curve) {
    var s = '<section class="eind-verslag" data-verslag="' + i + '" id="eind-verslag-' + i + '" aria-labelledby="eind-v-kop-' + i + '">';
    s += '<header class="eind-v-kop">' + figuurHtml(c, v, 'eind-v-fig') +
      '<div><p class="eind-kicker">Race ' + (i + 1) + ' · verslag</p>' +
      '<h2 id="eind-v-kop-' + i + '">' + esc(c.naam) + ' <span class="eind-v-wie">' + esc(c.patient) + '</span></h2>' +
      '<p class="eind-v-score"><b>' + getal(v.opbouw.totaal) + '</b> QALY-punten</p></div></header>';
    var lever = leverOp(c, v), leverOoit = curve && curve.some(function (p) { return lever(p.t); });
    if (curve && curve.length > 1) {
      s += '<figure class="eind-curve">' + curveSvg(c, curve, lever) +
        '<figcaption>Jouw spiegel. Het groene vlak: in de zone (' + esc(c.zone.tekst.split(' = ')[0]) + '); de onderkant is de streep.' +
        (c.toxisch != null ? ' Rode stippellijn: giftig (' + esc(c.toxischTekst || getal(c.toxisch, 1)) + ').' : '') +
        (leverOoit ? ' Rode lijn: meer dan ' + getal(c.bovengrens.maxPer24u / 1000) + ' g in 24 uur. ' + esc(c.lekentaal.boven) : '') +
        '</figcaption></figure>';
    }
    s += opbouwHtml(v);
    s += '<h3 class="eind-h3">Jouw toedieningen per poortje</h3>';
    s += echtTekstHtml(c, v);
    s += roosterHtml(c, v);
    s += tellingHtml(v);
    s += '<blockquote class="eind-praktijk" data-zin="praktijk">' + esc(v.praktijk.zin) + '</blockquote>';
    if (c.nabespreking && v.praktijk.zin.indexOf(c.nabespreking) < 0) {
      s += '<p class="eind-nabespreking" data-zin="nabespreking">' + esc(c.nabespreking) + '</p>';
    }
    return s + '</section>';
  }

  // ------------------------------------------------------------------------------------------
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
          '<div class="eind-vraag"><span class="eind-vraag-kop">Nabespreken</span>' +
            '<p data-eind="vraag">' + VRAAG + '</p></div>' +
          '<div class="eind-acties"><button type="button" class="knop-wit groot" data-actie="opnieuw">Nog een keer</button></div>' +
          '<p class="eind-scorebord">Laat je naam en totaal op het scorebord zetten.</p>' +
          '<p class="eind-spelpunten">QALY-punten zijn spelpunten, geen echte QALY\'s.</p>' +
        '</div>' +
        verslagen +
        '<div class="eind-voet"><button type="button" class="knop-wit" data-actie="naar-boven">' +
          '<span aria-hidden="true">↑</span>&nbsp;Terug naar je score</button></div>' +
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
    Array.prototype.forEach.call(container.querySelectorAll('[data-actie="naar-verslag"]'), function (k) {
      luister(k, 'click', function () {
        var doel = container.querySelector('[data-verslag="' + k.getAttribute('data-race') + '"]');
        if (!doel) return;
        ui.speel('tik');
        var glad = !(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
        container.scrollTo({ top: doel.offsetTop - 8, behavior: glad ? 'smooth' : 'auto' });
      });
    });
    // figuurtjes reageren op aanraken (EoT)
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
      }
    };
  }

  SoS.einde = { toon: toon };
})(typeof window !== 'undefined' ? window : null);
