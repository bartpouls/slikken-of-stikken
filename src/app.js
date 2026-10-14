/*
 * Slikken of Stikken — src/app.js  (schermen, spelverloop, racescherm)
 * Laadt als laatste (na model, score, sound, tutorial, einde). Zet window.SoS.ui en window.SoS.debug.
 *
 * FLOW: start (naam + "Start") → tutorial (SoS.tutorial.start) → intro race 1 → race 1 paracetamol
 *       → intro race 2 → race 2 lithium → einde (SoS.einde.toon). "Nog een keer" start race 1 meteen.
 *
 * GEDEELD, VOOR ANDERE BOUWERS (SoS.ui; gebruik binnen je start()/toon(), niet bij het laden):
 *   SoS.ui.figuur({wie:'opa'|'vries', stemming:'neutraal'|'blij'|'pijn'|'misselijk', prop:'stok'|'doosje'|null,
 *                 kleur, label}) -> SVG-string in Evolution-of-Trust-stijl: rond wit hoofd, zwarte schetslijn,
 *                 gekleurd hoedje (opa Jan blauwe pet #3d7fe0 met wandelstok, mevrouw De Vries rode hoed
 *                 met rand, knotje en bril). Zet hem in een <div class="fig">; .fig.wiebel laat hem even reageren.
 *   SoS.ui.icoon(soort)  soort 'tablet'|'slik'|'zetpil'|'spuit'|'niets'|'doosje' -> SVG-string (40×40).
 *   SoS.ui.el(tag, attrs, kinderen) -> element (attrs: class, text, html, data-*, aria-*, on<event>).
 *   SoS.ui.getal(x, decimalen) -> Nederlandse notatie ("1,5"; "1.250").
 *   SoS.ui.speel(naam)  SoS.sound.play zonder risico (namen: zie src/sound.js). SoS.ui.unlock().
 *   SoS.ui.KLEUR {paars, groen, koraal, geel, blauw, rood, roze, inkt, papier}
 *   Stijl: style.css (kleurvariabelen, .scherm.wit/.zwart, .knop-wit, .knop-paars, .fig).
 *
 * RACE-INTERACTIE: de tijd loopt van boven naar beneden (pijltje "tijd" in de linkermarge); paarse poortjes
 * schuiven van onder naar de "nu"-lijn. De knoppen onderin kiezen wat er op het EERSTVOLGENDE poortje gebeurt
 * (stand "gekozen", icoontje op het poortje, regel "Tablet voor uur 18" boven de knoppen); op het poortje wordt
 * de keuze toegepast (race.naar(poortjetijd), dan race.geef) en gewist. Niets gekozen = overslaan.
 * Paracetamol: 1 toediening (1 g) per poortje; dezelfde knop nog eens = keuze weg.
 * Lithium: tablet tot 2× per poortje ("2× Tablet voor ..."), derde tik = keuze weg.
 * Te laat: een tik binnen 0,3 s (echte tijd, /speed) ná een poortje telt NIET voor het volgende poortje
 * ("Te laat voor uur 16"); tik opnieuw. SoS.debug.poortje.open = false in dat venster.
 * INDELING CANVAS (geen tekst over tekst): poortlabels staan aan de kant weg van de stip (R.kant, strook
 * R.labelMax breed); waardelabel boven de nu-lijn, "onderweg"-bolletje ernaast of eronder, buiten die strook.
 * Meldingen staan boven in het podium (verleden), één tegelijk; labels onder een melding worden niet getekend.
 * Termen: "het groene vlak" (de zone); de ondergrens ervan heet "de streep" (label bovenaan, intro race 1).
 * Slikken tijdens misselijkheid en de lithium-spuit worden geweigerd met de casusbladtekst (geen effect,
 * geen strafpunten). Leverschade (dagteller > 4 g): lijn en stip rood, QALY-pijl omlaag, levermeter vol.
 * Terug-knop: eerst een melding; nog een keer terug binnen 3 s verlaat het spel.
 *
 * TESTHAAK (gauntlet/contract.md):
 *   ?speed=N  versnelt de spelklok N× (ook de aanloop van 3 s en de duur van meldingen).
 *   window.SoS.debug (alleen-lezen momentopname, elke keer vers): {fase, casus, t, klok, C, score,
 *     dagteller, poortje:{index, t, keuze, aantal, geblokkeerd}, gegeven:[...], uitslag:[...], naam, speed}
 *     fase: 'start'|'tutorial'|'intro1'|'race1'|'intro2'|'race2'|'einde'; t = modeltijd (uur);
 *     klok = spelklok (uur, negatief tijdens de aanloop); score = live QALY-totaal.
 *   Stabiele data-attributen: data-actie="start" (startscherm), "verder" (tutorial-einde en na elke
 *     race), "start-race" (intro-kaartje), "slik" | "zetpil" | "spuit" | "niets" (race; lithium
 *     "Overslaan" = niets), "demp", "opnieuw" (einde). Naamveld: data-veld="naam".
 *   Raceknoppen reageren op pointerdown (snel) én click (toetsenbord); één tik telt één keer.
 */
(function (root) {
  'use strict';
  var SoS = root.SoS = root.SoS || {};
  var M = SoS.model, S = SoS.score;
  var doc = root.document;

  // ------------------------------------------------------------------------------------------
  // Testhaak: ?speed=N
  // ------------------------------------------------------------------------------------------
  var SPEED = 1;
  try {
    var sp = parseFloat(new URLSearchParams(root.location.search).get('speed'));
    if (isFinite(sp) && sp > 0) SPEED = Math.min(100, Math.max(0.1, sp));
  } catch (e) { /* geen URL-parameters */ }

  // ------------------------------------------------------------------------------------------
  // Gedeelde helpers (SoS.ui)
  // ------------------------------------------------------------------------------------------
  var KLEUR = { paars: '#b07cff', groen: '#3ddc97', koraal: '#ff6f61', geel: '#ffd166', blauw: '#3d7fe0',
    rood: '#e0405f', roze: '#ff8fb8', inkt: '#1b1b1f', papier: '#fbfaf7' };
  var FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

  function speel(naam) {
    try { if (SoS.sound) SoS.sound.play(naam); } catch (e) { /* geluid is bijzaak */ }
  }
  function unlock() {
    try { if (SoS.sound) SoS.sound.unlock(); } catch (e) { /* idem */ }
  }

  function getal(x, dec) {
    dec = dec == null ? 0 : dec;
    var neg = x < 0;
    var s = Math.abs(x).toFixed(dec).split('.');
    s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    var r = s.join(',');
    if (neg && /[1-9]/.test(r)) r = '−' + r;
    return r;
  }
  // Compact: hele getallen zonder ",0".
  function getalKort(x, dec) {
    var r = getal(x, dec);
    return r.indexOf(',') >= 0 ? r.replace(/,?0+$/, '') : r;
  }

  function el(tag, attrs, kinderen) {
    var e = doc.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    });
    (kinderen || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c); });
    return e;
  }

  function figuur(o) {
    o = o || {};
    var wie = o.wie === 'vries' ? 'vries' : 'opa';
    var st = o.stemming || 'neutraal';
    var hoed = o.kleur || (wie === 'opa' ? KLEUR.blauw : KLEUR.rood);
    var ink = KLEUR.inkt;
    var prop = o.prop === undefined ? (wie === 'opa' ? 'stok' : null) : o.prop;
    var label = o.label || (wie === 'opa' ? 'Opa Jan' : 'Mevrouw De Vries');
    var gezicht = st === 'misselijk' ? '#e6f5cf' : '#fff';
    var L = 'stroke="' + ink + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"';
    var s = '<svg viewBox="0 0 100 132" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + label + '">';
    // benen + lijfje
    s += '<path d="M45 104 L42 127 M55 104 L58 127" ' + L + '/>';
    s += '<path d="M38 108 C38 94 42 84 50 84 C58 84 62 94 62 108 Z" fill="#fff" stroke="' + ink + '" stroke-width="4" stroke-linejoin="round"/>';
    // armen + attribuut
    if (prop === 'stok') {
      s += '<path d="M39 93 L31 101" ' + L + '/>';
      s += '<path d="M61 93 L70 99" ' + L + '/>';
      s += '<path d="M73 127 L71 97 C71 90 63 90 63 95" stroke="#7a5230" stroke-width="4" stroke-linecap="round" fill="none"/>';
    } else if (prop === 'doosje') {
      s += '<path d="M39 93 L31 101" ' + L + '/>';
      s += '<path d="M61 93 L69 97" ' + L + '/>';
      s += '<rect x="67" y="88" width="20" height="14" rx="2" fill="#fff" stroke="' + ink + '" stroke-width="3"/>';
      s += '<path d="M67 95 H87" stroke="#ff9f43" stroke-width="4"/>';
    } else {
      s += '<path d="M39 93 L31 101 M61 93 L69 101" ' + L + '/>';
    }
    // knotje (achter het hoofd)
    if (wie === 'vries') s += '<circle cx="73" cy="50" r="8" fill="#d9d3c7" stroke="' + ink + '" stroke-width="3"/>';
    // hoofd
    s += '<circle cx="50" cy="58" r="25" fill="' + gezicht + '" stroke="' + ink + '" stroke-width="4"/>';
    // ogen
    if (st === 'pijn') {
      s += '<path d="M37 55 l6 3.5 l-6 3.5 M63 55 l-6 3.5 l6 3.5" stroke="' + ink + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>';
    } else if (st === 'misselijk') {
      s += '<path d="M37 58 q4 -3 8 0 M55 58 q4 -3 8 0" stroke="' + ink + '" stroke-width="3" stroke-linecap="round" fill="none"/>';
    } else {
      s += '<circle cx="41" cy="58" r="3.4" fill="' + ink + '"/><circle cx="59" cy="58" r="3.4" fill="' + ink + '"/>';
    }
    if (wie === 'vries') {
      s += '<circle cx="41" cy="58" r="7.5" fill="none" stroke="' + ink + '" stroke-width="2.2"/>' +
           '<circle cx="59" cy="58" r="7.5" fill="none" stroke="' + ink + '" stroke-width="2.2"/>' +
           '<path d="M48.5 58 h3" stroke="' + ink + '" stroke-width="2.2"/>';
    } else {
      s += '<path d="M42 68.5 q4 -3.5 8 -0.5 q4 -3 8 0.5" stroke="#9b9b9b" stroke-width="3.2" stroke-linecap="round" fill="none"/>';
    }
    // mond
    var mond = { blij: 'M43 72 q7 7 14 0', pijn: 'M43 76 q7 -6 14 0', misselijk: 'M41 75 q2.5 -3 5 0 t5 0 t5 0 t5 0', neutraal: 'M45 74 h10' }[st] || 'M45 74 h10';
    s += '<path d="' + mond + '" stroke="' + ink + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>';
    if (st === 'pijn') s += '<path d="M77 40 q5 7 0 10 q-5 -3 0 -10 z" fill="#7cc4ff" stroke="' + ink + '" stroke-width="1.5"/>';
    if (st === 'misselijk') s += '<path d="M78 70 q3 -4 6 0 M80 78 q3 -4 6 0" stroke="#7bbf3a" stroke-width="2.5" stroke-linecap="round" fill="none"/>';
    // eigen hoedjes: opa Jan een pet (flat cap) met klep, mevrouw De Vries een hoed met rand en lint
    if (wie === 'opa') {
      s += '<path d="M25 47 Q23 29 48 27 Q72 26 77 41 L77 45 Q52 39 25 47 Z" fill="' + hoed + '" stroke="' + ink + '" stroke-width="3.5" stroke-linejoin="round"/>';
      s += '<path d="M62 43 Q81 38 91 46 Q80 52 63 48 Z" fill="' + hoed + '" stroke="' + ink + '" stroke-width="3.5" stroke-linejoin="round"/>';
      s += '<path d="M36 33 Q48 30 62 32" stroke="' + ink + '" stroke-width="2" stroke-linecap="round" fill="none" opacity=".45"/>';
      s += '<circle cx="49" cy="27.5" r="2.6" fill="' + ink + '"/>';
    } else {
      s += '<path d="M35 37 L37.5 15 Q50 10 62.5 15 L65 37 Z" fill="' + hoed + '" stroke="' + ink + '" stroke-width="3.5" stroke-linejoin="round"/>';
      s += '<path d="M36.6 29 L63.4 29" stroke="#ffd166" stroke-width="4.5"/>';
      s += '<ellipse cx="50" cy="37" rx="31" ry="6" fill="' + hoed + '" stroke="' + ink + '" stroke-width="3.5"/>';
    }
    s += '</svg>';
    return s;
  }

  var ICONEN = {
    tablet: '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g transform="rotate(-35 20 20)">' +
      '<rect x="4" y="13" width="32" height="14" rx="7" fill="#ffffff"/><path d="M20 13h9a7 7 0 0 1 0 14h-9z" fill="#ff8fb8"/>' +
      '<rect x="4.5" y="13.5" width="31" height="13" rx="6.5" fill="none" stroke="#000" stroke-opacity=".18"/></g></svg>',
    zetpil: '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g transform="rotate(-35 20 20)">' +
      '<path d="M7 13.5h14c8.5 0 14 3 14 6.5s-5.5 6.5-14 6.5H7a2.5 2.5 0 0 1-2.5-2.5v-8A2.5 2.5 0 0 1 7 13.5z" fill="#ffe1a1"/>' +
      '<path d="M10 17h9" stroke="#fff" stroke-opacity=".7" stroke-width="2" stroke-linecap="round"/></g></svg>',
    spuit: '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g transform="rotate(-35 20 20)" stroke-linecap="round">' +
      '<path d="M2.5 14v12M2.5 20h6" stroke="#d6ecff" stroke-width="3" fill="none"/>' +
      '<rect x="8.5" y="14" width="18" height="12" rx="2" fill="#16314f" stroke="#d6ecff" stroke-width="2"/>' +
      '<rect x="15.5" y="16.5" width="10" height="7" fill="#7cc4ff"/>' +
      '<rect x="26.5" y="17" width="4" height="6" fill="#d6ecff"/><path d="M30.5 20h8" stroke="#ffffff" stroke-width="1.8"/></g></svg>',
    niets: '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<circle cx="20" cy="20" r="12" fill="none" stroke="#a3a3ad" stroke-width="3"/><path d="M11.5 28.5L28.5 11.5" stroke="#a3a3ad" stroke-width="3" stroke-linecap="round"/></svg>',
    doosje: '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<rect x="6" y="11" width="28" height="19" rx="3" fill="#fff"/><path d="M6 19h28" stroke="#ff9f43" stroke-width="5"/></svg>',
    kruis: '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<path d="M12 12L28 28M28 12L12 28" stroke="#ff6f61" stroke-width="4" stroke-linecap="round"/></svg>'
  };
  ICONEN.slik = ICONEN.tablet;
  function icoon(soort) { return ICONEN[soort] || ''; }

  var DEMP_AAN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" fill-opacity=".15"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
  var DEMP_UIT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" fill-opacity=".15"/><path d="M17 9.5l5 5M22 9.5l-5 5"/></svg>';

  SoS.ui = { el: el, figuur: figuur, icoon: icoon, getal: getal, speel: speel, unlock: unlock, KLEUR: KLEUR, FONT: FONT };

  // Afbeeldingen van de iconen voor het canvas (data-URI, geen netwerk).
  var IMG = {};
  ['tablet', 'zetpil', 'spuit', 'niets', 'doosje', 'kruis'].forEach(function (k) {
    var im = new Image();
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ICONEN[k]);
    IMG[k] = im;
  });
  function tekenIcoon(ctx, soort, x, y, maat, alpha) {
    var im = IMG[soort];
    if (!im || !im.complete || !im.naturalWidth) return;
    ctx.save();
    if (alpha != null) ctx.globalAlpha *= alpha;
    ctx.drawImage(im, x - maat / 2, y - maat / 2, maat, maat);
    ctx.restore();
  }

  // ------------------------------------------------------------------------------------------
  // Staat en schermen
  // ------------------------------------------------------------------------------------------
  var $ = function (id) { return doc.getElementById(id); };
  var staat = { fase: 'start', naam: '', verslagen: [], curves: [], moduleStop: null };
  var R = null; // lopende race

  function naarScherm(id, fase) {
    if (staat.moduleStop) { try { staat.moduleStop(); } catch (e) { /* negeer */ } staat.moduleStop = null; }
    var schermen = doc.querySelectorAll('.scherm');
    for (var i = 0; i < schermen.length; i++) schermen[i].classList.toggle('actief', schermen[i].id === 'scherm-' + id);
    var donker = id === 'race';
    doc.body.classList.toggle('donker', donker);
    doc.body.classList.toggle('licht', !donker);
    var tc = doc.querySelector('meta[name="theme-color"]');
    if (tc) tc.setAttribute('content', donker ? '#000000' : KLEUR.papier);
    staat.fase = fase || id;
    var s = $('scherm-' + id);
    if (s) s.scrollTop = 0;
  }

  // Figuurtjes reageren op aanraken (EoT-patroon).
  function maakFigLevend(div) {
    div.addEventListener('pointerdown', function () {
      unlock();
      div.classList.remove('wiebel');
      void div.offsetWidth;
      div.classList.add('wiebel');
      speel('tik');
    });
  }

  // ------------------------------------------------------------------------------------------
  // 1. Start
  // ------------------------------------------------------------------------------------------
  function initStart() {
    var figs = doc.querySelectorAll('#scherm-start [data-fig]');
    for (var i = 0; i < figs.length; i++) {
      var wie = figs[i].getAttribute('data-fig');
      figs[i].innerHTML = figuur({ wie: wie, stemming: 'blij', prop: wie === 'opa' ? 'stok' : null });
      maakFigLevend(figs[i]);
    }
    var inp = $('naam');
    try { var oud = root.localStorage.getItem('sos.naam'); if (oud) inp.value = oud; } catch (e) { /* geen opslag */ }
    $('start-form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (staat.fase !== 'start') return;
      unlock();
      speel('tik');
      var naam = (inp.value || '').replace(/\s+/g, ' ').trim().slice(0, 16);
      if (!naam) naam = 'Speler ' + (10 + Math.floor(Math.random() * 90));
      staat.naam = naam;
      try { root.localStorage.setItem('sos.naam', naam); } catch (e) { /* geen opslag */ }
      inp.blur();
      zetHistorie();
      toonTutorial();
    });
  }

  // ------------------------------------------------------------------------------------------
  // 2. Tutorial (module)
  // ------------------------------------------------------------------------------------------
  function toonTutorial() {
    var c = $('scherm-tutorial');
    c.innerHTML = '';
    naarScherm('tutorial');
    if (!SoS.tutorial || typeof SoS.tutorial.start !== 'function') { toonIntro(0); return; }
    var gedaan = false;
    var h = SoS.tutorial.start(c, function () {
      if (gedaan || staat.fase !== 'tutorial') return;
      gedaan = true;
      toonIntro(0);
    }, { naam: staat.naam, speed: SPEED });
    if (h && typeof h.stop === 'function') staat.moduleStop = h.stop;
  }

  // Venster als tekst, uit de casusdata (M.venster: kan in de tijd verschuiven), bv. "0,6–1,0 mmol/L".
  function vensterTekst(c, t) {
    var v = M.venster(c, t), e = '\u00a0' + CFG[c.id].eenheid, dec = c.id === 'lithium' ? 1 : 0;
    return v.hoog === Infinity ? '≥\u00a0' + getal(v.laag, dec) + e : getal(v.laag, dec) + '–' + getal(v.hoog, dec) + e;
  }

  // ------------------------------------------------------------------------------------------
  // 3. Intro-kaartje per race
  // ------------------------------------------------------------------------------------------
  var RACES = ['paracetamol', 'lithium'];
  function toonIntro(i) {
    var c = M.casus(RACES[i]);
    $('intro-kop').textContent = 'Race ' + (i + 1) + ' · ' + c.naam;
    var fig = $('intro-fig');
    fig.innerHTML = '';
    var f = el('div', { class: 'fig', html: figuur({ wie: i === 0 ? 'opa' : 'vries', stemming: i === 0 ? 'pijn' : 'neutraal' }) });
    maakFigLevend(f);
    fig.appendChild(f);
    $('intro-verhaal').textContent = c.verhaal;
    var regels = i === 0
      ? ['De lijn is de spiegel: hoeveel paracetamol er in het bloed zit.',
         'Houd hem in het groene vlak. De ondergrens daarvan is de streep.',
         'In de race loopt de tijd van boven naar beneden. Kies vóór elk paars poortje: Tablet, Zetpil, Spuit of Niets.']
      : ['De lijn is de spiegel: hoeveel lithium er in het bloed zit.',
         'Houd hem in het groene vlak (' + vensterTekst(c, 0) + ').',
         'Een paars poortje om 0, 8 en 16 uur: kies Tablet (twee keer tikken = 2 tabletten) of Overslaan.'];
    var ul = $('intro-regel');
    ul.innerHTML = '';
    regels.forEach(function (r) { ul.appendChild(el('li', { text: r })); });
    $('intro-qaly').textContent = i === 0 ? S.UITLEG : '';
    staat.introIndex = i;
    naarScherm('intro', 'intro' + (i + 1));
  }

  // ------------------------------------------------------------------------------------------
  // 4. Race
  // ------------------------------------------------------------------------------------------
  var CFG = {
    paracetamol: {
      secPerUur: 90 / 24, Cmax: 20, monster: 0.02, dun: 0.1,
      as: [10, 15], eenheid: 'mg/L', // hulplijnen; de venstergrenzen komen uit M.venster(casus, t)
      zoneLabel: null, toxLabel: null
    },
    lithium: {
      secPerUur: 90 / 240, Cmax: 2, monster: 0.1, dun: 1,
      as: [], eenheid: 'mmol/L', // + casus.toxisch; de venstergrenzen komen uit M.venster(casus, t)
      zoneLabel: ['in de zone'], toxLabel: 'giftig'
    }
  };
  // Zonelabel letterlijk uit het casusblad: "pijnstilling (vereenvoudigd)" -> twee regels.
  CFG.paracetamol.zoneLabel = (function (l) { var i = l.indexOf(' ('); return i > 0 ? [l.slice(0, i), l.slice(i + 1)] : [l]; })(M.casus('paracetamol').zone.label);
  var AANLOOP_S = 3; // seconden echte tijd vóór t = 0 (bij speed 1)

  function tijdLabel(c, t, metUur) {
    if (c.id === 'lithium') {
      var d = Math.floor(t / 24 + 1e-9), h = Math.round(t - d * 24);
      if (h === 24) { d++; h = 0; }
      return h === 0 ? 'Dag ' + d : 'Dag ' + d + (metUur ? ' · ' + h + ' u' : '');
    }
    return 'Uur ' + Math.floor(t + 1e-9);
  }
  // Midden in een zin: "uur 18", "dag 3 · 8 u" (als label los: "Uur 18", "Dag 3 · 8 u").
  function inZin(label) { return label.charAt(0).toLowerCase() + label.slice(1); }
  function klokHtml(c, t) {
    t = Math.max(0, t);
    if (c.id === 'lithium') {
      var d = Math.floor(t / 24), h = Math.floor(t - d * 24);
      return 'Dag ' + d + '<small>· ' + h + ' u</small>';
    }
    return 'Uur ' + Math.floor(t);
  }

  function startRace(i) {
    var c = M.casus(RACES[i]);
    var cfg = CFG[c.id];
    var race = S.maakRace(c);
    R = {
      i: i, casus: c, cfg: cfg, race: race,
      poorten: M.poortjes(c), g: 0,
      keuze: { route: null, aantal: 0, poging: false },
      gegeven: [],
      klok: -AANLOOP_S / cfg.secPerUur,
      monsters: [], dun: [], volgendDun: 0,
      voorgeschiedenis: [],
      toestand: null, toxisch: false,
      onthuld: {}, effecten: [], ibuprofen: false, leverOver: false, laatstePoort: null, kiesT0: 0,
      laatsteTs: null, klaar: false, rafId: 0,
      startEcht: performance.now(), duurEcht: null,
      tekstKlok: '', tekstScore: '', trend: '', dagteller: -1,
      melding: { prio: -1, tot: 0 }
    };
    // Lithium: ze slikt al jaren; teken de laatste dag ervoor (zelfde steady state als de race-start).
    if (c.start && c.start.type === 'steadyState') {
      var vs = M.maakSim(c, { t0: -24 });
      for (var k = 0; k < 3; k++) {
        var tg = -24 + k * c.start.interval;
        vs.naar(tg);
        R.voorgeschiedenis.push({ t: tg, C: vs.C });
        vs.geef('slik');
        for (var s = 0; s < 40; s++) { vs.stap(c.start.interval / 40); R.voorgeschiedenis.push({ t: vs.t, C: vs.C }); }
      }
    }
    bouwRaceUi();
    naarScherm('race', 'race' + (i + 1));
    meetDoek();
    melding('Tik een knop vóór het paarse poortje: wat je kiest, gebeurt als het poortje bij ‘nu’ is.', { prio: 0, duur: AANLOOP_S + 3 });
    R.rafId = root.requestAnimationFrame(lus);
  }

  function bouwRaceUi() {
    var c = R.casus;
    $('finish').hidden = true;
    $('klok').innerHTML = klokHtml(c, 0);
    $('qaly-getal').textContent = '0';
    $('qaly').className = 'qaly';
    $('qaly-trend').textContent = '';
    var lever = $('lever');
    lever.hidden = !(c.bovengrens && c.bovengrens.type === 'dagteller');
    lever.classList.remove('vol');
    var pat = $('patient');
    pat.innerHTML = '';
    pat.appendChild(el('span', { text: c.patient }));
    // knoppen
    var nav = $('knoppen');
    nav.innerHTML = '';
    var lijst = c.id === 'lithium'
      ? [['slik', 'Tablet', 'tablet'], ['niets', 'Overslaan', 'niets'], ['spuit', 'Spuit', 'spuit']]
      : [['slik', 'Tablet', 'tablet'], ['zetpil', 'Zetpil', 'zetpil'], ['spuit', 'Spuit', 'spuit'], ['niets', 'Niets', 'niets']];
    R.knoppen = {};
    lijst.forEach(function (d) {
      var b = el('button', { type: 'button', class: 'actie', 'data-actie': d[0], 'aria-pressed': 'false', 'aria-label': d[1] });
      b.innerHTML = icoon(d[2]) + '<span>' + d[1] + '</span>';
      var viaPointer = 0;
      b.addEventListener('pointerdown', function (ev) {
        if (ev.button != null && ev.button > 0) return;
        viaPointer = performance.now();
        tikActie(d[0], b);
      });
      b.addEventListener('click', function () {
        if (performance.now() - viaPointer < 1000) return; // al afgehandeld via pointerdown
        tikActie(d[0], b);
      });
      nav.appendChild(b);
      R.knoppen[d[0]] = b;
    });
    werkKnoppenBij();
  }

  function doelGeblokkeerd() {
    if (!R || R.g >= R.poorten.length) return null;
    return M.geblokkeerd(R.casus, 'slik', R.poorten[R.g]);
  }

  function werkKnoppenBij() {
    if (!R) return;
    var blok = doelGeblokkeerd();
    Object.keys(R.knoppen).forEach(function (r) {
      var b = R.knoppen[r];
      var gek = R.keuze.route === r;
      b.classList.toggle('gekozen', gek);
      b.setAttribute('aria-pressed', gek ? 'true' : 'false');
      b.setAttribute('data-badge', gek ? (R.keuze.aantal > 1 ? R.keuze.aantal + '×' : '✓') : '');
      if (r === 'slik') {
        b.classList.toggle('geblokkeerd', !!blok);
        b.querySelector('span').textContent = blok ? 'Misselijk' : 'Tablet';
      }
    });
  }

  function flits(b, klasse) {
    b.classList.remove(klasse);
    void b.offsetWidth;
    b.classList.add(klasse);
    setTimeout(function () { b.classList.remove(klasse); }, 380);
  }

  function tikActie(route, b) {
    unlock();
    if (!R || R.klaar) return;
    var c = R.casus;
    flits(b, 'tik');
    // Lithium-spuitknop: zichtbaar, doet niets, geen strafpunten.
    if (route === 'spuit' && c.routes.spuit && c.routes.spuit.doetNiets) {
      R.race.geef('spuit');
      speel('bonk');
      flits(b, 'schud');
      melding(c.routes.spuit.tekst, { soort: 'grap', prio: 2, duur: 2.6 });
      R.effecten.push({ type: 'bonk', t0: performance.now() });
      return;
    }
    // Slikken tijdens misselijkheid: geweigerd (wordt op het poortje gelogd als poging).
    var blok = route === 'slik' && doelGeblokkeerd();
    if (blok) {
      R.keuze.poging = true;
      speel('bonk');
      flits(b, 'schud');
      melding(blok.tekst, { soort: 'wending', prio: 2, duur: 2.4, fig: figuur({ wie: 'opa', stemming: 'misselijk' }) });
      return;
    }
    if (R.g >= R.poorten.length) { keuzeInfo('Geen poortjes meer in deze race.'); return; }
    var doelLabel = inZin(tijdLabel(c, R.poorten[R.g], true));
    // Te laat: een tik vlak ná een poortje telt niet stilletjes mee voor het volgende poortje.
    if (R.laatstePoort && performance.now() - R.laatstePoort.echt < TE_LAAT_MS / SPEED) {
      flits(b, 'schud');
      speel('overslaan');
      keuzeInfo('Te laat voor ' + inZin(R.laatstePoort.label) + '. Kies opnieuw voor ' + doelLabel + '.', 'laat');
      return;
    }
    var k = R.keuze;
    var max = maxAantal(route);
    var tekst;
    if (k.route === route && k.aantal < max) {
      k.aantal++;
      tekst = k.aantal + '× Tablet voor ' + doelLabel;
    } else if (k.route === route) {
      k.route = null; k.aantal = 0;
      tekst = 'Keuze gewist voor ' + doelLabel + ': niets kiezen is overslaan.';
    } else {
      k.route = route; k.aantal = 1;
      tekst = KEUZENAAM[c.id === 'lithium' && route === 'niets' ? 'overslaan' : route] + ' voor ' + doelLabel;
    }
    R.kiesT0 = performance.now();
    speel('tik');
    keuzeInfo(tekst, k.route ? 'gekozen' : 'gewist');
    werkKnoppenBij();
  }

  // Lithium: tablet tot 2× per poortje (casusblad: "elk poortje dubbel"); paracetamol 1 g per keer.
  function maxAantal(route) { return route === 'slik' && R.casus.id === 'lithium' ? 2 : 1; }
  var KEUZENAAM = { slik: 'Tablet', zetpil: 'Zetpil', spuit: 'Spuit', niets: 'Niets', overslaan: 'Overslaan' };
  var TE_LAAT_MS = 300; // echte tijd bij speed 1 (gedeeld door ?speed=N)

  var infoTimer = 0;
  function keuzeInfo(tekst, soort) {
    var e = $('keuze-info');
    if (!e) return;
    e.textContent = tekst;
    e.className = 'keuze-info zicht' + (soort ? ' ' + soort : '');
    clearTimeout(infoTimer);
    infoTimer = setTimeout(function () { e.classList.remove('zicht'); }, Math.max(500, 1800 / Math.min(SPEED, 4)));
  }

  // ---------- meldingen (korte witte tekst, boven in het podium, in het verleden-deel) ----------
  // Er is er altijd hooguit één in beeld: een nieuwe melding wacht tot de vorige is uitgefaded.
  // Zolang hij zichtbaar is, tekent het canvas geen poort- of gebeurtenislabels onder hem (R.meldVlak).
  var meldTimer = 0, meldWissel = 0, MELD_FADE = 260;
  function melding(tekst, o) {
    o = o || {};
    if (!R) return;
    var nu = performance.now();
    var prio = o.prio || 0;
    if (nu < R.melding.tot && prio < R.melding.prio) return;
    var duur = (o.duur || 2.4) * 1000 / Math.min(SPEED, 4);
    R.melding = { prio: prio, tot: nu + duur };
    var m = $('melding');
    var r = R;
    clearTimeout(meldTimer); clearTimeout(meldWissel);
    function toon() {
      if (R !== r || R.klaar) return;
      m.className = 'melding' + (o.soort ? ' ' + o.soort : '') + (o.fig ? ' met-fig' : '');
      m.innerHTML = '';
      if (o.fig) m.appendChild(el('div', { class: 'm-fig', html: o.fig }));
      m.appendChild(el('div', { text: tekst }));
      void m.offsetWidth;
      var t0 = performance.now();
      R.meldVlak = { top: m.offsetTop, bottom: m.offsetTop + m.offsetHeight, tot: t0 + duur + MELD_FADE + 60 };
      m.classList.add('zicht');
      meldTimer = setTimeout(function () { m.classList.remove('zicht'); }, duur);
    }
    if (m.classList.contains('zicht')) {
      m.classList.remove('zicht');
      if (R.meldVlak) R.meldVlak.tot = nu + MELD_FADE + 60 + 400;
      meldWissel = setTimeout(toon, MELD_FADE);
    } else toon();
  }

  // ---------- canvas ----------
  var doek = null, ctx = null, D = { w: 0, h: 0, dpr: 1 };
  var STERREN = [];
  (function () {
    var kleuren = ['#ff8fb8', '#ffd166', '#7cc4ff', '#b07cff', '#ffffff', '#7ef0c4', '#ffffff'];
    var z = 7;
    function rnd() { z = (z * 16807) % 2147483647; return (z - 1) / 2147483646; } // vaste reeks
    for (var i = 0; i < 120; i++) {
      STERREN.push({ x: rnd(), y: rnd(), r: 0.6 + rnd() * 1.5, k: kleuren[Math.floor(rnd() * kleuren.length)],
        a: 0.25 + rnd() * 0.6, p: 0.15 + rnd() * 0.5, f: rnd() * 6.28, vierkant: rnd() < 0.18 });
    }
  })();

  function meetDoek() {
    doek = $('doek');
    if (!doek) return;
    ctx = doek.getContext('2d');
    var r = doek.getBoundingClientRect();
    D.dpr = Math.min(root.devicePixelRatio || 1, 2.5);
    D.w = Math.max(1, r.width); D.h = Math.max(1, r.height);
    doek.width = Math.round(D.w * D.dpr); doek.height = Math.round(D.h * D.dpr);
    ctx.setTransform(D.dpr, 0, 0, D.dpr, 0, 0);
    if (R) {
      var gat = Math.max(84, Math.min(130, D.h * 0.22));
      R.pxPerUur = gat / R.casus.poortjes.interval;
      R.yNu = Math.round(D.h * 0.52);
      R.links = 18; R.rechts = 18;
      // breedste poortlabel (+ icoontje, lithium ook "2×"): zo breed is de gereserveerde labelstrook
      ctx.font = '700 15px ' + FONT;
      var mx = 0;
      R.poorten.forEach(function (T) { mx = Math.max(mx, ctx.measureText(tijdLabel(R.casus, T, true)).width); });
      R.labelMax = mx + 34 + (R.casus.id === 'lithium' ? 18 : 0);
    }
  }

  function xVan(C) {
    var b = D.w - R.links - R.rechts;
    return R.links + Math.max(0, Math.min(1, C / R.cfg.Cmax)) * b;
  }
  function yVan(t) { return R.yNu + (t - R.klok) * R.pxPerUur; }
  function tVan(y) { return R.klok + (y - R.yNu) / R.pxPerUur; }

  function zoneVan(C, t) {
    var v = M.venster(R.casus, t);
    return C < v.laag ? 'onder' : (C > v.hoog ? 'boven' : 'zone');
  }
  // Eén kleur per betekenis (ook op het eindscherm): groen = in de zone, blauw = te laag, geel = te hoog,
  // rood = giftig/lever; oranje = ibuprofen, limoen = misselijk, paars = poortjes.
  var LIJNKLEUR = { zone: '#7ef0c4', onder: '#7cc4ff', boven: '#ffe14d', tox: '#ff4d5e' };
  // lv = leverschade (dagteller boven het maximum): dan is de lijn rood, ook al is de spiegel "in de zone".
  function lijnKleur(C, t, lv) {
    if (lv) return LIJNKLEUR.tox;
    if (R.casus.toxisch != null && C > R.casus.toxisch) return LIJNKLEUR.tox;
    return LIJNKLEUR[zoneVan(C, t)];
  }

  // Bovenrand (as-labels) en onderrand (knoppen): hier worden poortjes en spiegel weggevaagd.
  var BOVENRAND = 58;
  // Poortlabels staan aan de kant WEG van de stip (R.kant: 'links' | 'rechts', met speling zodat ze niet
  // heen en weer springen). Die strook (R.strook) is gereserveerd: de stip, het waardelabel en het
  // "onderweg"-bolletje blijven erbuiten. Poortjes vlak bij de nu-lijn (PROX) volgen de kant altijd; verder
  // in het verleden houden ze de kant die ze hadden. Zo ligt er nooit tekst over tekst, ook niet op het poortje.
  var INSPRING = 8, PROX = 40;

  function poortjeAlpha(yg, h, basis) {
    var a = basis;
    // onderin: weg vóór de keuzeregel boven de knoppen
    if (yg > h - 76) a *= Math.max(0, (h - 40 - yg) / 36);
    // bovenin: weg vóór de as-labels en de vastgezette gebeurtenis-labels
    if (yg < BOVENRAND + 50) a *= Math.max(0, (yg - BOVENRAND - 26) / 24);
    return a;
  }

  // Bedekt de melding (boven in het podium) deze rij? Dan geen poort- of gebeurtenislabel daar.
  function onderMelding(y0, y1, nu) {
    var m = R && R.meldVlak;
    return !!(m && nu < m.tot && y1 > m.top - 10 && y0 < m.bottom + 12);
  }

  // stap 1: lijnen; stap 2: label (met zwarte halo) en icoontje van de keuze/toediening.
  function tekenPoortjes(nu, stap) {
    var c = R.casus, w = D.w, h = D.h, L = R.links, Rr = w - R.rechts;
    ctx.font = '700 15px ' + FONT;
    ctx.textBaseline = 'middle';
    R.zijde = R.zijde || [];
    R.zijdeT = R.zijdeT || [];
    for (var g = 0; g < R.poorten.length; g++) {
      var T = R.poorten[g], yg = yVan(T);
      if (yg < -30 || yg > h + 30) continue;
      var verleden = g < R.g, doel = g === R.g;
      if (stap === 1) {
        var zi = R.zijde[g];
        if (zi == null) { R.zijde[g] = R.kant; R.zijdeT[g] = -1e9; }
        else if (zi !== R.kant && (!verleden || Math.abs(yg - R.yNu) < PROX)) { R.zijde[g] = R.kant; R.zijdeT[g] = nu; }
      }
      var zijde = R.zijde[g] || R.kant;
      var label = tijdLabel(c, T, true);
      var tw = ctx.measureText(label).width;
      var icoonSoort = null, aantal = 1;
      if (doel && R.keuze.route) { icoonSoort = R.keuze.route === 'slik' ? 'tablet' : R.keuze.route; aantal = R.keuze.aantal; }
      else if (doel && R.keuze.poging) icoonSoort = 'kruis';
      else if (verleden && R.gegeven[g]) {
        var gg = R.gegeven[g];
        icoonSoort = gg.soort === 'slik' ? 'tablet' : (gg.soort === 'geblokkeerd' ? 'kruis' : (gg.soort === 'leeg' ? null : gg.soort));
        aantal = gg.aantal || 1;
      }
      var extra = icoonSoort ? 34 + (aantal > 1 ? 18 : 0) : 0;
      var wb = tw + extra;
      var xs = zijde === 'links' ? L + INSPRING : Rr - INSPRING - wb; // begin van label (+ icoon)
      var l1 = xs - 8, r1 = xs + wb + 8;
      // komend: ≥ 90% dekking (contrast), doel: vol en helder, verleden: gedimd (geschiedenis)
      // verleden: lijn gedimd, label in een dof paars dat toch ≥ 4,5:1 haalt (#8a72c0 op zwart = 5,25)
      var a = poortjeAlpha(yg, h, verleden ? (stap === 1 ? 0.4 : 1) : (doel ? 1 : 0.92));
      if (stap === 1) {
        if (a <= 0.01) continue;
        ctx.globalAlpha = a;
        ctx.strokeStyle = doel ? '#d9c2ff' : (verleden ? KLEUR.paars : '#c9a4ff');
        ctx.lineWidth = doel ? 2.5 : (verleden ? 1 : 1.25);
        ctx.beginPath();
        if (l1 > L - 6) { ctx.moveTo(L - 6, yg); ctx.lineTo(l1, yg); }
        ctx.moveTo(r1, yg); ctx.lineTo(Rr + 6, yg); ctx.stroke();
      } else {
        // label: niet onder de melding, en na een kantwissel kort infaden (nooit half over de stip)
        if (onderMelding(yg - 10, yg + 10, nu)) a = 0;
        a *= Math.min(1, (nu - (R.zijdeT[g] || -1e9)) / 160);
        if (a <= 0.01) continue;
        ctx.globalAlpha = a;
        ctx.textAlign = 'left';
        ctx.strokeStyle = '#000'; ctx.lineWidth = 6; ctx.lineJoin = 'round';
        ctx.globalAlpha = Math.min(1, a * 2.5); // uitsparing dekt de spiegel ook bij gedimde labels
        ctx.strokeText(label, xs, yg + 0.5);
        ctx.globalAlpha = a;
        if (doel) { ctx.shadowColor = 'rgba(176,124,255,0.95)'; ctx.shadowBlur = 14; }
        ctx.fillStyle = doel ? '#ecdfff' : (verleden ? '#8a72c0' : '#c9a4ff');
        ctx.fillText(label, xs, yg + 0.5);
        ctx.shadowBlur = 0;
        if (icoonSoort) {
          var ix = xs + tw + 19;
          var pop = 1;
          if (doel && R.kiesT0) { var dtk = (nu - R.kiesT0) / 160; if (dtk < 1) pop = 1 + 0.2 * Math.sin(dtk * Math.PI); }
          ctx.fillStyle = '#000';
          ctx.globalAlpha = Math.min(1, a * 2.5);
          ctx.beginPath(); ctx.arc(ix, yg, 15, 0, 6.283); ctx.fill();
          ctx.globalAlpha = a;
          tekenIcoon(ctx, icoonSoort, ix, yg, 26 * pop, verleden ? 0.55 : 1);
          if (aantal > 1) {
            ctx.font = '800 13px ' + FONT;
            ctx.strokeText(aantal + '×', ix + 17, yg + 1);
            ctx.fillStyle = '#fff';
            ctx.fillText(aantal + '×', ix + 17, yg + 1);
            ctx.font = '700 15px ' + FONT;
          }
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  function teken(nu) {
    if (!ctx || !R) return;
    var c = R.casus, w = D.w, h = D.h, L = R.links, Rr = w - R.rechts;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    // sterretjes (schuiven mee omhoog met de tijd, rustig)
    var schuif = R.klok * R.pxPerUur;
    for (var i = 0; i < STERREN.length; i++) {
      var st = STERREN[i];
      var y = ((st.y * h - schuif * st.p) % h + h) % h;
      ctx.globalAlpha = st.a * (0.75 + 0.25 * Math.sin(nu / 900 + st.f));
      ctx.fillStyle = st.k;
      if (st.vierkant) ctx.fillRect(st.x * w, y, st.r * 1.6, st.r * 2.6);
      else { ctx.beginPath(); ctx.arc(st.x * w, y, st.r, 0, 6.283); ctx.fill(); }
    }
    ctx.globalAlpha = 1;

    // therapeutische zone als verticale baan (venster(casus, t): later verschuifbaar)
    var stappen = 24, dy = h / stappen, links = [], rechts = [];
    for (var s = 0; s <= stappen; s++) {
      var yy = s * dy, v = M.venster(c, tVan(yy));
      links.push([xVan(v.laag), yy]);
      rechts.push([v.hoog === Infinity ? Rr : xVan(v.hoog), yy]);
    }
    ctx.fillStyle = 'rgba(61,220,151,0.10)';
    ctx.beginPath();
    links.forEach(function (p, j) { if (j) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
    for (var j2 = rechts.length - 1; j2 >= 0; j2--) ctx.lineTo(rechts[j2][0], rechts[j2][1]);
    ctx.closePath(); ctx.fill();
    // de streep (ondergrens) helder
    ctx.strokeStyle = 'rgba(61,220,151,0.75)'; ctx.lineWidth = 2;
    ctx.beginPath();
    links.forEach(function (p, j) { if (j) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
    ctx.stroke();
    if (rechts[0][0] < Rr) {
      ctx.strokeStyle = 'rgba(61,220,151,0.35)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      rechts.forEach(function (p, j) { if (j) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
      ctx.stroke();
    }
    if (c.toxisch != null) {
      var xt = xVan(c.toxisch);
      ctx.fillStyle = 'rgba(255,80,80,0.09)';
      ctx.fillRect(xt, 0, Rr - xt, h);
      ctx.strokeStyle = 'rgba(255,90,90,0.55)'; ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.moveTo(xt, 0); ctx.lineTo(xt, h); ctx.stroke();
      ctx.setLineDash([]);
    }

    // stip, kant van de poortlabels en de vrije strook
    var C = R.race.sim.C, tm = Math.max(0, R.race.t);
    var xD = xVan(C), yN = R.yNu, mid = (L + Rr) / 2;
    if (R.kant == null) R.kant = xD > mid ? 'links' : 'rechts';
    else if (R.kant === 'rechts' && xD > mid + 10) R.kant = 'links';
    else if (R.kant === 'links' && xD < mid - 10) R.kant = 'rechts';
    var zA = R.kant === 'links' ? L + INSPRING - 4 : Rr - INSPRING - R.labelMax - 4, zB = zA + R.labelMax + 8;
    var vrij = function (a, b) { return b < zA - 4 || a > zB + 4; };
    var past = function (a, b) { return a >= 2 && b <= w - 2; };
    // gebeurtenislabels in dezelfde strook als de poortlabels (daar staat nooit iets van de stip)
    function gebeurtenisLabel(tekst, y, metIcoon) {
      ctx.font = '600 12px ' + FONT; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
      var bw = ctx.measureText(tekst).width + (metIcoon ? 22 : 0);
      if (onderMelding(y - 2, y + 15, nu)) return;
      var x0 = R.kant === 'links' ? L + INSPRING : Rr - INSPRING - bw;
      ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.lineJoin = 'round';
      if (metIcoon) tekenIcoon(ctx, 'doosje', x0 + 8, y + 7, 18);
      ctx.strokeText(tekst, x0 + (metIcoon ? 22 : 0), y);
      ctx.fillText(tekst, x0 + (metIcoon ? 22 : 0), y);
    }

    // onthulde gebeurtenissen in de tijdlijn
    c.gebeurtenissen.forEach(function (g, gi) {
      if (!R.onthuld[gi]) return;
      if (g.type === 'blokkade') {
        var y1 = yVan(g.van), y2 = yVan(g.tot);
        if (y2 < 0 || y1 > h) return;
        ctx.fillStyle = 'rgba(190,230,90,0.07)';
        ctx.fillRect(0, y1, w, y2 - y1);
        ctx.fillStyle = 'rgba(200,235,120,0.9)';
        ctx.fillRect(0, y1, 3, y2 - y1);
        var ym = Math.max(y1 + 18, BOVENRAND + 4);
        if (ym < y2 - 18) gebeurtenisLabel('misselijk', ym, false);
      } else if (g.type === 'klaring') {
        var yk = yVan(g.t);
        if (yk > h) return;
        ctx.fillStyle = 'rgba(255,159,67,0.06)';
        ctx.fillRect(0, Math.max(0, yk), w, h - Math.max(0, yk));
        if (yk > -20) {
          ctx.strokeStyle = 'rgba(255,159,67,0.8)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(0, yk); ctx.lineTo(w, yk); ctx.stroke();
        }
        ctx.fillStyle = '#ff9f43';
        gebeurtenisLabel('ibuprofen', Math.max(yk + 18, BOVENRAND + 4), true);
      }
    });

    // paarse poortjes, stap 1: alleen de lijnen (onder de spiegel)
    tekenPoortjes(nu, 1);

    // de spiegel: lijn van boven (verleden) naar de nu-lijn
    ctx.save();
    ctx.beginPath(); ctx.rect(0, BOVENRAND - 8, w, h); ctx.clip();
    var tBoven = tVan(BOVENRAND - 20);
    var reeks = R.voorgeschiedenis.concat(R.monsters);
    var start = 0;
    while (start < reeks.length - 1 && reeks[start + 1].t < tBoven) start++;
    if (reeks.length - start >= 2) {
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      // gloed
      ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 9;
      ctx.beginPath();
      for (var m = start; m < reeks.length; m++) {
        var px = xVan(reeks[m].C), py = yVan(reeks[m].t);
        if (m === start) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      // kleur per stuk (in de zone groen, eronder koraal)
      ctx.lineWidth = 3;
      var kleur = null, xv = 0, yv = 0;
      for (var n = start; n < reeks.length; n++) {
        var p = reeks[n], k2 = lijnKleur(p.C, Math.max(0, p.t), p.lv);
        var x2 = xVan(p.C), y2b = yVan(p.t);
        if (k2 !== kleur) {
          // het stuk naar een nieuwe toestand krijgt de kleur van die toestand (spuit-sprong = nieuwe kleur)
          if (kleur) ctx.stroke();
          ctx.strokeStyle = k2; ctx.beginPath();
          if (kleur) { ctx.moveTo(xv, yv); ctx.lineTo(x2, y2b); } else ctx.moveTo(x2, y2b);
          kleur = k2;
        } else ctx.lineTo(x2, y2b);
        xv = x2; yv = y2b;
      }
      if (kleur) ctx.stroke();
    }
    ctx.restore();

    // paarse poortjes, stap 2: labels + icoontjes met zwarte uitsparing (boven de spiegel)
    tekenPoortjes(nu, 2);

    // nu-lijn; het woord "nu" aan de rand aan de kant van de poortlabels (buiten hun strook)
    ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1;
    ctx.setLineDash([3, 6]);
    ctx.beginPath(); ctx.moveTo(0, yN); ctx.lineTo(w, yN); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = '600 12px ' + FONT;
    ctx.textBaseline = 'bottom';
    if (R.kant === 'links') { ctx.textAlign = 'left'; ctx.fillText('nu', 4, yN - 4); }
    else { ctx.textAlign = 'right'; ctx.fillText('nu', w - 4, yN - 4); }

    // indeling rond de stip: waardelabel boven de nu-lijn, naar buiten (weg van de poortlabels);
    // past dat niet, dan naar binnen. Het "onderweg"-bolletje aan de andere kant, of voorbij het label.
    var waarde = c.id === 'lithium' ? getal(C, 2) + ' mmol/L' : getal(C, 1) + ' mg/L';
    ctx.font = '600 12.5px ' + FONT;
    var wv = ctx.measureText(waarde).width;
    var o = R.kant === 'links' ? 1 : -1;
    var va = o > 0 ? xD + 10 : xD - 10 - wv;
    if (!past(va, va + wv) || !vrij(va, va + wv)) va = o > 0 ? xD - 10 - wv : xD + 10;
    var vb = va + wv, vKant = va > xD ? 1 : -1;

    // opnamedepot ("onderweg"): vertraging van slikken/zetpil zichtbaar
    var ref = c.routes.slik.dosis * c.routes.slik.F;
    var dep = R.race.sim.depot / ref;
    R.blob = null;
    if (dep > 0.03) {
      var rB = 5 + 13 * Math.sqrt(Math.min(1.6, dep));
      var hw = Math.max(rB, 29); // halve breedte, met het woord "onderweg" eronder
      // naast de stip (aan de kant zonder waardelabel, of voorbij het label); past dat niet: onder de stip
      var kand = [xD - vKant * (rB + 26), xD + vKant * Math.max(rB + 26, (vKant > 0 ? vb - xD : xD - va) + 6 + hw)];
      var xB = R.kant === 'links' ? Math.max(xD, zB + 8 + hw) : Math.min(xD, zA - 8 - hw), yB = yN + rB + 14;
      for (var q = 0; q < kand.length; q++) {
        if (kand[q] - hw >= L && kand[q] + hw <= w - 4 && vrij(kand[q] - hw, kand[q] + hw)) { xB = kand[q]; yB = yN; break; }
      }
      ctx.strokeStyle = 'rgba(255,225,161,0.55)'; ctx.lineWidth = 2;
      ctx.setLineDash([2, 5]); ctx.lineDashOffset = -(nu / 40) % 7 * (xD > xB || yB > yN ? 1 : -1);
      ctx.beginPath(); ctx.moveTo(xB, yB); ctx.lineTo(xD, yN); ctx.stroke();
      ctx.setLineDash([]); ctx.lineDashOffset = 0;
      R.blob = { x: xB, y: yB };
      ctx.fillStyle = 'rgba(255,225,161,0.22)';
      ctx.beginPath(); ctx.arc(xB, yB, rB, 0, 6.283); ctx.fill();
      ctx.strokeStyle = 'rgba(255,225,161,0.8)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = 'rgba(255,225,161,0.85)'; ctx.font = '600 11px ' + FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
      ctx.strokeText('onderweg', xB, yB + rB + 4);
      ctx.fillText('onderweg', xB, yB + rB + 4);
    }

    // effecten
    R.effecten = R.effecten.filter(function (e) {
      var dt = (nu - e.t0) / 1000;
      if (e.type === 'spuit') {
        if (dt > 0.9) return false;
        var f = Math.min(1, dt / 0.12);
        ctx.strokeStyle = 'rgba(160,215,255,' + (0.9 * (1 - dt / 0.9)) + ')';
        ctx.lineWidth = 6 * (1 - dt / 0.9) + 1;
        ctx.beginPath(); ctx.moveTo(e.xVan, yN); ctx.lineTo(e.xVan + (e.xNaar - e.xVan) * f, yN); ctx.stroke();
        ctx.strokeStyle = 'rgba(200,235,255,' + (1 - dt / 0.9) + ')'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(e.xNaar, yN, 8 + dt * 70, 0, 6.283); ctx.stroke();
        return true;
      }
      if (e.type === 'slik') {
        // het icoontje plopt in het "onderweg"-bolletje (geen vlucht over de poortlabels)
        if (dt > 0.7) return false;
        var q2 = dt / 0.7, bl = R.blob || { x: xD, y: yN };
        tekenIcoon(ctx, e.soort, bl.x, bl.y, 26 * (1.15 - 0.6 * q2), 1 - q2 * 0.8);
        return true;
      }
      if (e.type === 'lever') {
        if (dt > 1.2) return false;
        ctx.fillStyle = 'rgba(255,80,80,' + (0.22 * (1 - dt / 1.2)) + ')';
        ctx.fillRect(0, 0, w, h);
        return true;
      }
      if (e.type === 'au') {
        if (dt > 0.6) return false;
        ctx.strokeStyle = 'rgba(255,111,97,' + (1 - dt / 0.6) + ')'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(e.x, yN, 10 + dt * 50, 0, 6.283); ctx.stroke();
        return true;
      }
      return dt < 1;
    });

    // de stip (nu)
    var kl = lijnKleur(C, tm, R.leverOver);
    var gr = ctx.createRadialGradient(xD, yN, 0, xD, yN, 20);
    gr.addColorStop(0, kl); gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.55; ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(xD, yN, 20, 0, 6.283); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = kl; ctx.beginPath(); ctx.arc(xD, yN, 6.5, 0, 6.283); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    if (C > R.cfg.Cmax) { // buiten beeld: pijltje
      ctx.fillStyle = kl;
      ctx.beginPath(); ctx.moveTo(xD + 9, yN - 6); ctx.lineTo(xD + 16, yN); ctx.lineTo(xD + 9, yN + 6); ctx.fill();
    }
    // waarde bij de stip (boven de nu-lijn)
    ctx.font = '600 12.5px ' + FONT; ctx.textBaseline = 'bottom'; ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.lineJoin = 'round';
    ctx.strokeText(waarde, va, yN - 8);
    ctx.fillText(waarde, va, yN - 8);

    // rand boven: as-labels; rand onder: vervagen naar de knoppen
    var gb = ctx.createLinearGradient(0, 0, 0, BOVENRAND);
    gb.addColorStop(0, 'rgba(0,0,0,1)'); gb.addColorStop(0.7, 'rgba(0,0,0,0.85)'); gb.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gb; ctx.fillRect(0, 0, w, BOVENRAND);
    var go = ctx.createLinearGradient(0, h - 50, 0, h);
    go.addColorStop(0, 'rgba(0,0,0,0)'); go.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = go; ctx.fillRect(0, h - 50, w, 50);

    ctx.lineJoin = 'round';
    function halo(tekst, x, y) {
      ctx.strokeStyle = '#000'; ctx.lineWidth = 5; ctx.strokeText(tekst, x, y); ctx.fillText(tekst, x, y);
    }
    // as-labels: venstergrenzen uit M.venster(casus, t) (schuiven mee), giftig uit casus.toxisch, hulplijnen;
    // de eenheid staat bij beide casussen rechts, bij het hoogste getal.
    var v0 = M.venster(c, tm);
    var zl = xVan(v0.laag), zr = v0.hoog === Infinity ? Rr : xVan(v0.hoog);
    var dec = c.id === 'lithium' ? 1 : 0;
    var fmt = function (x) { return x === 0 || x === R.cfg.Cmax ? getalKort(x, 1) : getal(x, x % 1 && !dec ? 1 : dec); };
    var vast = [{ C: v0.laag, streep: true }];
    if (v0.hoog !== Infinity) vast.push({ C: v0.hoog });
    var ticks = vast.slice();
    [0].concat(R.cfg.as, c.toxisch != null ? [c.toxisch] : []).forEach(function (x) {
      if (vast.every(function (tk) { return Math.abs(xVan(tk.C) - xVan(x)) > 26; })) ticks.push({ C: x });
    });
    if (vast.every(function (tk) { return xVan(tk.C) < Rr - 70; })) ticks.push({ C: R.cfg.Cmax, rechts: true });
    ctx.font = '600 12px ' + FONT; ctx.textBaseline = 'top';
    ticks.forEach(function (tk) {
      var xt = xVan(tk.C);
      ctx.fillStyle = tk.streep ? 'rgba(126,240,196,1)' : 'rgba(255,255,255,0.72)';
      ctx.textAlign = tk.C === 0 ? 'left' : (tk.rechts ? 'right' : 'center');
      halo(fmt(tk.C) + (tk.rechts ? ' ' + R.cfg.eenheid : ''), tk.C === 0 ? xt - 2 : xt, 6);
    });
    // "de streep" = de ondergrens van het groene vlak (zie intro race 1)
    ctx.fillStyle = 'rgba(126,240,196,1)'; ctx.textAlign = 'right';
    halo('streep →', zl - 4, 23);
    ctx.textAlign = 'center';
    ctx.font = '700 11.5px ' + FONT;
    var zx = (zl + zr) / 2 + (v0.hoog === Infinity ? 12 : 0);
    R.cfg.zoneLabel.forEach(function (regel, i) { halo(regel, zx, 23 + i * 14); });
    if (R.cfg.toxLabel) {
      ctx.fillStyle = 'rgba(255,135,125,1)';
      halo(R.cfg.toxLabel, (xVan(c.toxisch) + Rr) / 2, 23);
    }

    // tijd loopt naar beneden: klein pijltje in de linkermarge, onder de nu-lijn
    var ty = yN + 22;
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = '#000'; ctx.lineWidth = 4;
    ctx.fillStyle = '#d0d0d8';
    ctx.translate(10, ty); ctx.rotate(Math.PI / 2);
    ctx.font = '600 11px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.strokeText('tijd', 0, 0); ctx.fillText('tijd', 0, 0);
    var tl = ctx.measureText('tijd').width;
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = '#d0d0d8'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    var ya = ty + tl + 4;
    ctx.beginPath(); ctx.moveTo(10, ya); ctx.lineTo(10, ya + 16); ctx.moveTo(6, ya + 11); ctx.lineTo(10, ya + 16); ctx.lineTo(14, ya + 11); ctx.stroke();
    ctx.restore();
  }

  // ---------- spelklok ----------
  function lus(ts) {
    if (!R || R.klaar) return;
    R.rafId = root.requestAnimationFrame(lus);
    if (doc.hidden) { R.laatsteTs = null; return; }
    if (R.laatsteTs == null) R.laatsteTs = ts;
    var dtEcht = Math.min(0.25, Math.max(0, (ts - R.laatsteTs) / 1000));
    R.laatsteTs = ts;
    R.klok += dtEcht * SPEED / R.cfg.secPerUur;
    var c = R.casus, race = R.race, duur = c.raceDuur;

    // poortjes die we passeren: precies op de poortjestijd toepassen
    while (R.g < R.poorten.length && R.poorten[R.g] <= R.klok + 1e-9) {
      var T = R.poorten[R.g];
      race.naar(T);
      neemMonster(true);
      pasPoortjeToe(R.g);
      R.g++;
      bijNieuwDoel();
    }
    if (R.klok >= 0) race.naar(Math.min(R.klok, duur));
    neemMonster(false);
    controleerZone();
    controleerGebeurtenissen();
    werkKopBij();
    teken(performance.now());

    if (R.klok >= duur && race.klaar) eindeRace();
  }

  function neemMonster(forceer) {
    var t = R.race.t, C = R.race.sim.C;
    if (R.klok < 0) return;
    var laatste = R.monsters[R.monsters.length - 1];
    if (forceer || !laatste || t - laatste.t >= R.cfg.monster) R.monsters.push({ t: t, C: C, lv: R.leverOver });
    while (t >= R.volgendDun - 1e-9) {
      R.dun.push({ t: Math.round(t * 1000) / 1000, C: C });
      R.volgendDun += R.cfg.dun;
    }
    // alleen bewaren wat nog in beeld kan komen
    var grens = R.klok - (R.yNu + 40) / R.pxPerUur;
    var weg = 0;
    while (weg < R.monsters.length - 2 && R.monsters[weg + 1].t < grens) weg++;
    if (weg > 200) R.monsters.splice(0, weg);
  }

  function pasPoortjeToe(g) {
    var c = R.casus, race = R.race, k = R.keuze, T = R.poorten[g];
    var uit = { soort: 'leeg', aantal: 0 };
    var nu = performance.now();
    if (k.poging) { race.geef('slik', { index: g }); uit.soort = 'geblokkeerd'; }
    if (k.route && k.route !== 'niets') {
      var Cvoor = race.sim.C;
      var res = race.geef(k.route, { aantal: k.aantal || 1, index: g });
      if (res.ok) {
        uit.soort = k.route; uit.aantal = res.aantal;
        if (res.lever < 0) R.leverOver = true;
        R.monsters.push({ t: T, C: race.sim.C, lv: R.leverOver });
        if (k.route === 'spuit') {
          speel('spuit');
          R.effecten.push({ type: 'spuit', t0: nu, xVan: xVan(Cvoor), xNaar: xVan(race.sim.C) });
        } else {
          speel(k.route === 'zetpil' ? 'zetpil' : 'slik');
          var ref = c.routes.slik.dosis * c.routes.slik.F;
          var xB = xVan(Cvoor) > D.w / 2 ? xVan(Cvoor) - 50 : R.links + 20;
          R.effecten.push({ type: 'slik', t0: nu, soort: k.route === 'slik' ? 'tablet' : 'zetpil', xNaar: xB, ref: ref });
        }
        if (res.lever < 0) {
          setTimeout(function () { speel('alarm'); }, 120);
          melding(c.lekentaal.boven, { soort: 'alarm', prio: 2, duur: 3 });
          R.effecten.push({ type: 'lever', t0: nu });
          var lv = $('lever'); lv.classList.remove('vol'); void lv.offsetWidth; lv.classList.add('vol');
        }
      } else if (res.reden === 'geblokkeerd') {
        uit.soort = 'geblokkeerd';
      }
    } else if (k.route === 'niets') {
      uit.soort = 'niets';
      speel('overslaan');
    } else if (!k.poging) {
      speel('poort');
    }
    R.gegeven[g] = uit;
    R.laatstePoort = { echt: performance.now(), label: tijdLabel(c, T, true), index: g };
    var ki = $('keuze-info'); if (ki) ki.classList.remove('zicht'); // die keuze is nu voorbij
    R.keuze = { route: null, aantal: 0, poging: false };
    werkKnoppenBij();
  }

  // Het volgende poortje is nu het doel: misschien is er een plotwending.
  function bijNieuwDoel() {
    var c = R.casus;
    if (R.g >= R.poorten.length) return;
    var T = R.poorten[R.g];
    c.gebeurtenissen.forEach(function (g, gi) {
      if (R.onthuld[gi] || g.type !== 'blokkade') return;
      if (T >= g.van - 1e-9 && T < g.tot - 1e-9) {
        R.onthuld[gi] = true;
        speel('wending');
        melding(g.tekst, { soort: 'wending', prio: 3, duur: 3.4, fig: figuur({ wie: 'opa', stemming: 'misselijk' }) });
        if (R.knoppen.slik) flits(R.knoppen.slik, 'schud');
      }
    });
    werkKnoppenBij();
  }

  function controleerGebeurtenissen() {
    var c = R.casus;
    c.gebeurtenissen.forEach(function (g, gi) {
      if (R.onthuld[gi] || g.type !== 'klaring') return;
      if (R.klok >= g.t - 1e-9) {
        R.onthuld[gi] = true;
        speel('wending');
        melding(g.tekst, { soort: 'wending', prio: 3, duur: 3.6, fig: figuur({ wie: 'vries', prop: 'doosje', stemming: 'neutraal' }) });
        $('patient').appendChild(el('span', { class: 'chip', html: icoon('doosje').replace('<svg', '<svg width="16" height="16"') + 'ibuprofen' }));
      }
    });
  }

  function controleerZone() {
    if (R.klok < 0) return;
    var c = R.casus, C = R.race.sim.C, t = R.race.t;
    var z = zoneVan(C, t);
    var tox = c.toxisch != null && C > c.toxisch;
    var vorig = R.toestand;
    if (vorig && z !== vorig) {
      if (z === 'onder') {
        speel('au');
        melding(c.lekentaal.onder, { soort: 'au', prio: 1, duur: 2.4 });
        R.effecten.push({ type: 'au', t0: performance.now(), x: xVan(C) });
      } else if (z === 'boven') {
        speel('alarm');
        melding(c.lekentaal.boven, { soort: 'alarm', prio: 1, duur: 2.8 });
      }
    }
    if (tox && !R.toxisch) {
      speel('alarm');
      melding(c.lekentaal.boven, { soort: 'alarm', prio: 2, duur: 2.8 });
    }
    R.toestand = z; R.toxisch = tox;
  }

  function werkKopBij() {
    var c = R.casus;
    var k = klokHtml(c, R.klok);
    if (k !== R.tekstKlok) { $('klok').innerHTML = k; R.tekstKlok = k; }
    var st = R.race.stand();
    var sc = getal(st.totaal, 0);
    if (sc !== R.tekstScore) { $('qaly-getal').textContent = sc; R.tekstScore = sc; }
    var trend = '';
    if (R.klok >= 0) {
      var tp = S.tempo(c, R.race.sim.C, R.race.t);
      var som = tp.zone + tp.laag + tp.hoog + tp.giftig;
      trend = R.leverOver ? 'min' : (som > 0 ? 'plus' : (som < -1e-9 ? 'min' : ''));
    }
    trend += st.totaal < 0 ? ' negatief' : '';
    if (trend !== R.trend) {
      $('qaly').className = 'qaly ' + trend;
      $('qaly-trend').textContent = trend.indexOf('plus') === 0 ? '▲' : (trend.indexOf('min') === 0 ? '▼' : '');
      R.trend = trend;
    }
    if (c.bovengrens && c.bovengrens.type === 'dagteller' && st.dagteller !== R.dagteller) {
      R.dagteller = st.dagteller;
      var max = c.bovengrens.maxPer24u;
      $('lever-tekst').textContent = getalKort(st.dagteller / 1000, 1) + ' g van max. ' + getalKort(max / 1000, 1) + ' g';
      var vol = st.dagteller > max;
      R.leverOver = vol;
      $('lever-vul').style.width = (vol ? 100 : 100 * st.dagteller / (max * 1.25)) + '%';
      $('lever').classList.toggle('vol', vol);
    }
  }

  function eindeRace() {
    R.klaar = true;
    R.duurEcht = (performance.now() - R.startEcht) / 1000;
    root.cancelAnimationFrame(R.rafId);
    var st = R.race.stand();
    teken(performance.now());
    staat.verslagen[R.i] = R.race.verslag();
    staat.curves[R.i] = R.dun.slice();
    staat.duren = staat.duren || [];
    staat.duren[R.i] = R.duurEcht;
    speel('klaar');
    $('melding').classList.remove('zicht');
    $('finish-getal').textContent = getal(st.totaal, 0);
    $('finish').hidden = false;
  }

  function naRace() {
    if (!R || !R.klaar) return;
    var i = R.i;
    if (i === 0) toonIntro(1);
    else toonEinde();
  }

  // ------------------------------------------------------------------------------------------
  // 5. Einde (module)
  // ------------------------------------------------------------------------------------------
  function toonEinde() {
    var c = $('scherm-einde');
    c.innerHTML = '';
    naarScherm('einde');
    var races = staat.verslagen.slice(0, 2);
    var data = {
      naam: staat.naam,
      races: races,
      totaal: races.reduce(function (s, v) { return s + (v ? v.opbouw.totaal : 0); }, 0),
      curves: staat.curves.slice(0, 2),
      casussen: RACES.map(function (id) { return M.casus(id); })
    };
    if (!SoS.einde || typeof SoS.einde.toon !== 'function') return;
    var h = SoS.einde.toon(c, data, opnieuw);
    if (h && typeof h.stop === 'function') staat.moduleStop = h.stop;
  }

  function opnieuw() {
    if (staat.fase !== 'einde') return;
    staat.verslagen = []; staat.curves = []; staat.duren = [];
    startRace(0);
  }

  // ------------------------------------------------------------------------------------------
  // Debug (alleen-lezen) en init
  // ------------------------------------------------------------------------------------------
  Object.defineProperty(SoS, 'debug', {
    enumerable: true, configurable: false,
    get: function () {
      var r = R && (staat.fase === 'race1' || staat.fase === 'race2') ? R : null;
      var snap = {
        fase: staat.fase, naam: staat.naam, speed: SPEED,
        casus: r ? r.casus.id : null,
        t: r ? r.race.t : null,
        klok: r ? r.klok : null,
        C: r ? r.race.sim.C : null,
        score: r ? r.race.stand().totaal : null,
        dagteller: r ? r.race.stand().dagteller : null,
        klaar: r ? r.klaar : null,
        poortje: r && r.g < r.poorten.length ? {
          index: r.g, t: r.poorten[r.g], keuze: r.keuze.route, aantal: r.keuze.aantal,
          geblokkeerd: !!doelGeblokkeerd(), poging: r.keuze.poging,
          open: !(r.laatstePoort && performance.now() - r.laatstePoort.echt < TE_LAAT_MS / SPEED)
        } : null,
        gegeven: r ? r.gegeven.map(function (x) { return x ? x.soort + (x.aantal > 1 ? '×' + x.aantal : '') : null; }) : [],
        uitslag: staat.verslagen.map(function (v) { return v ? v.opbouw.totaal : null; }),
        duren: (staat.duren || []).slice()
      };
      return Object.freeze(snap);
    }
  });

  function initDemp() {
    var b = $('demp');
    function zet(m) {
      b.innerHTML = m ? DEMP_UIT : DEMP_AAN;
      b.setAttribute('aria-pressed', m ? 'true' : 'false');
      b.setAttribute('aria-label', m ? 'Geluid aan' : 'Geluid uit');
    }
    var snd = SoS.sound;
    zet(snd ? snd.isMuted() : false);
    if (snd && snd.onMuteChange) snd.onMuteChange(zet);
    b.addEventListener('click', function () {
      unlock();
      if (!snd) return;
      var m = snd.toggle();
      zet(m);
      if (!m) speel('tik');
    });
  }

  // Terug-knop: binnen het spel eerst waarschuwen; nog een keer terug binnen 3 s verlaat het spel.
  var toastTimer = 0, laatsteTerug = 0, historieGezet = false;
  function toast(tekst) {
    var e = $('toast');
    e.textContent = tekst;
    e.classList.add('zicht');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { e.classList.remove('zicht'); }, 2600);
  }
  function zetHistorie() {
    if (historieGezet) return;
    try { root.history.pushState({ sos: 1 }, ''); historieGezet = true; } catch (e) { /* geen history */ }
  }
  root.addEventListener('popstate', function () {
    if (!historieGezet) return;
    historieGezet = false;
    var nu = Date.now();
    if (nu - laatsteTerug < 3000) { try { root.history.back(); } catch (e) { /* negeer */ } return; }
    laatsteTerug = nu;
    zetHistorie();
    toast('Nog een keer terug om het spel te verlaten.');
  });

  function init() {
    doc.body.classList.add('licht');
    initStart();
    initDemp();
    doc.addEventListener('pointerdown', unlock, true);
    doc.querySelector('[data-actie="start-race"]').addEventListener('click', function () {
      unlock();
      if (staat.fase !== 'intro1' && staat.fase !== 'intro2') return;
      speel('tik');
      startRace(staat.introIndex);
    });
    doc.querySelector('#finish [data-actie="verder"]').addEventListener('click', function () {
      unlock();
      speel('tik');
      naRace();
    });
    root.addEventListener('resize', function () { if (R && !R.klaar) meetDoek(); else if (R) { meetDoek(); teken(performance.now()); } });
    naarScherm('start');
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
