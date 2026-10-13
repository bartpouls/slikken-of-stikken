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
 *                 gekleurd hoedje (opa Jan blauw #3d7fe0 met wandelstok, mevrouw De Vries rood #e0405f met
 *                 knotje en bril). Zet hem in een <div class="fig">; .fig.wiebel laat hem even reageren.
 *   SoS.ui.icoon(soort)  soort 'tablet'|'slik'|'zetpil'|'spuit'|'niets'|'doosje' -> SVG-string (40×40).
 *   SoS.ui.el(tag, attrs, kinderen) -> element (attrs: class, text, html, data-*, aria-*, on<event>).
 *   SoS.ui.getal(x, decimalen) -> Nederlandse notatie ("1,5"; "1.250").
 *   SoS.ui.speel(naam)  SoS.sound.play zonder risico (namen: zie src/sound.js). SoS.ui.unlock().
 *   SoS.ui.KLEUR {paars, groen, koraal, geel, blauw, rood, roze, inkt, papier}
 *   Stijl: style.css (kleurvariabelen, .scherm.wit/.zwart, .knop-wit, .knop-paars, .fig).
 *
 * RACE-INTERACTIE: de tijd loopt van boven naar beneden; paarse poortjes schuiven van onder naar de
 * "nu"-lijn. De knoppen onderin kiezen wat er op het EERSTVOLGENDE poortje gebeurt (stand "gekozen",
 * icoontje op het poortje); op het poortje wordt de keuze toegepast (race.geef) en gewist. Niets
 * gekozen = overslaan. Tablet twee keer tikken = 2 tabletten tegelijk ("2×"), derde tik = keuze weg;
 * zelfde knop bij zetpil/spuit nog eens tikken = keuze weg. Slikken tijdens misselijkheid en de
 * lithium-spuit worden geweigerd met de casusbladtekst (geen effect, geen strafpunten).
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
    // hoedje (fez) met kwastje
    s += '<path d="M35 40 L65 36.5 L60.5 14.5 L40.5 16.5 Z" fill="' + hoed + '" stroke="' + ink + '" stroke-width="3.5" stroke-linejoin="round"/>';
    s += '<path d="M50.5 15.5 C57 7 69 8 71 22" stroke="' + ink + '" stroke-width="2.6" stroke-linecap="round" fill="none"/>';
    s += '<circle cx="71.2" cy="24.5" r="2.8" fill="' + ink + '"/>';
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
    $('intro-regel').textContent = i === 0
      ? 'Elk uur komt er een paars poortje. Kies vóór het poortje: tablet, zetpil, spuit of niets.'
      : 'Poortjes 3× per dag, om 0, 8 en 16 uur. Kies vóór het poortje: tablet of overslaan.';
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
      ticks: [{ C: 0, t: '0' }, { C: 5, t: '5 mg/L', streep: true }, { C: 10, t: '10' }, { C: 15, t: '15' }],
      zoneLabel: 'pijnstilling', toxLabel: null
    },
    lithium: {
      secPerUur: 90 / 240, Cmax: 2, monster: 0.1, dun: 1,
      ticks: [{ C: 0, t: '0' }, { C: 0.6, t: '0,6', streep: true }, { C: 1.0, t: '1,0' }, { C: 1.5, t: '1,5' }, { C: 2.0, t: '2 mmol/L', rechts: true }],
      zoneLabel: 'zone', toxLabel: 'giftig'
    }
  };
  var AANLOOP_S = 3; // seconden echte tijd vóór t = 0 (bij speed 1)

  function tijdLabel(c, t, metUur) {
    if (c.id === 'lithium') {
      var d = Math.floor(t / 24 + 1e-9), h = Math.round(t - d * 24);
      if (h === 24) { d++; h = 0; }
      return h === 0 ? 'Dag ' + d : 'Dag ' + d + (metUur ? ' · ' + h + ' u' : '');
    }
    return 'Uur ' + Math.floor(t + 1e-9);
  }
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
      onthuld: {}, effecten: [], ibuprofen: false,
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
    melding('Kies vóór het paarse poortje.', { prio: 0, duur: AANLOOP_S + 1.5 });
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
    var k = R.keuze;
    if (route === 'niets') {
      if (k.route === 'niets') { k.route = null; k.aantal = 0; } else { k.route = 'niets'; k.aantal = 1; }
    } else if (k.route === route) {
      if (route === 'slik' && k.aantal === 1) k.aantal = 2;
      else { k.route = null; k.aantal = 0; }
    } else { k.route = route; k.aantal = 1; }
    speel('tik');
    R.effecten.push({ type: 'kies', t0: performance.now() });
    werkKnoppenBij();
  }

  // ---------- meldingen (korte witte tekst in het midden) ----------
  var meldTimer = 0;
  function melding(tekst, o) {
    o = o || {};
    if (!R) return;
    var nu = performance.now();
    var prio = o.prio || 0;
    if (nu < R.melding.tot && prio < R.melding.prio) return;
    var duur = (o.duur || 2.4) * 1000 / Math.min(SPEED, 4);
    R.melding = { prio: prio, tot: nu + duur };
    var m = $('melding');
    m.className = 'melding' + (o.soort ? ' ' + o.soort : '');
    m.innerHTML = '';
    if (o.fig) m.appendChild(el('div', { class: 'm-fig', html: o.fig }));
    m.appendChild(el('div', { text: tekst }));
    void m.offsetWidth;
    m.classList.add('zicht');
    clearTimeout(meldTimer);
    meldTimer = setTimeout(function () { m.classList.remove('zicht'); }, duur);
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
      R.yNu = Math.round(D.h * 0.55);
      R.links = 18; R.rechts = 18;
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
  var LIJNKLEUR = { zone: '#7ef0c4', onder: '#ff8f80', boven: '#ffb067', tox: '#ff5a5a' };
  function lijnKleur(C, t) {
    if (R.casus.toxisch != null && C > R.casus.toxisch) return LIJNKLEUR.tox;
    return LIJNKLEUR[zoneVan(C, t)];
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

    // onthulde gebeurtenissen in de tijdlijn
    c.gebeurtenissen.forEach(function (g, gi) {
      if (!R.onthuld[gi]) return;
      if (g.type === 'blokkade') {
        var y1 = yVan(g.van), y2 = yVan(g.tot);
        if (y2 < 0 || y1 > h) return;
        ctx.fillStyle = 'rgba(190,230,90,0.07)';
        ctx.fillRect(0, y1, w, y2 - y1);
        ctx.fillStyle = 'rgba(200,235,120,0.9)';
        ctx.fillRect(4, y1, 3, y2 - y1);
        ctx.font = '600 12px ' + FONT;
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        var ym = Math.max(y1 + 6, 48);
        if (ym < y2 - 18) ctx.fillText('misselijk', 12, ym);
      } else if (g.type === 'klaring') {
        var yk = yVan(g.t);
        if (yk > h) return;
        ctx.fillStyle = 'rgba(255,159,67,0.06)';
        ctx.fillRect(0, Math.max(0, yk), w, h - Math.max(0, yk));
        if (yk > -20) {
          ctx.strokeStyle = 'rgba(255,159,67,0.8)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(0, yk); ctx.lineTo(w, yk); ctx.stroke();
        }
        ctx.fillStyle = 'rgba(255,176,103,0.95)';
        ctx.font = '600 12px ' + FONT;
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        var yl = Math.max(yk + 6, 48);
        tekenIcoon(ctx, 'doosje', 20, yl + 7, 18);
        ctx.fillText('ibuprofen', 32, yl);
      }
    });

    // paarse poortjes
    ctx.font = '700 15px ' + FONT;
    ctx.textBaseline = 'middle';
    for (var g = 0; g < R.poorten.length; g++) {
      var T = R.poorten[g], yg = yVan(T);
      if (yg < -30 || yg > h + 30) continue;
      var verleden = g < R.g, doel = g === R.g;
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
      var extra = icoonSoort ? 30 + (aantal > 1 ? 18 : 0) : 0;
      var cx = w / 2, l1 = cx - tw / 2 - 12, r1 = cx + tw / 2 + 12 + extra;
      var a = verleden ? 0.3 : (doel ? 1 : 0.6);
      // in de verte vervagen
      if (yg > h - 60) a *= Math.max(0, (h - yg) / 60) * 0.8 + 0.2;
      if (yg < 64) a *= Math.max(0, (yg - 20) / 44);
      if (a <= 0.01) continue;
      ctx.globalAlpha = a;
      ctx.strokeStyle = KLEUR.paars; ctx.lineWidth = doel ? 2 : 1.25;
      ctx.beginPath(); ctx.moveTo(L - 6, yg); ctx.lineTo(l1, yg); ctx.moveTo(r1, yg); ctx.lineTo(Rr + 6, yg); ctx.stroke();
      if (doel) { ctx.shadowColor = 'rgba(176,124,255,0.9)'; ctx.shadowBlur = 12; }
      ctx.fillStyle = doel ? '#c9a4ff' : KLEUR.paars;
      ctx.textAlign = 'center';
      ctx.fillText(label, cx, yg + 0.5);
      ctx.shadowBlur = 0;
      if (icoonSoort) {
        var ix = cx + tw / 2 + 12 + 14;
        var pop = 1;
        if (doel && R.kiesT0) { var dtk = (nu - R.kiesT0) / 160; if (dtk < 1) pop = 1 + 0.35 * Math.sin(dtk * Math.PI); }
        tekenIcoon(ctx, icoonSoort, ix, yg, 26 * pop);
        if (aantal > 1) {
          ctx.font = '800 13px ' + FONT; ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
          ctx.fillText(aantal + '×', ix + 14, yg + 1);
          ctx.font = '700 15px ' + FONT;
        }
      }
      ctx.globalAlpha = 1;
    }

    // de spiegel: lijn van boven (verleden) naar de nu-lijn
    var tBoven = tVan(-10);
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
        var p = reeks[n], k2 = lijnKleur(p.C, Math.max(0, p.t));
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

    // nu-lijn
    var yN = R.yNu;
    ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1;
    ctx.setLineDash([3, 6]);
    ctx.beginPath(); ctx.moveTo(0, yN); ctx.lineTo(w, yN); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '600 11px ' + FONT;
    ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText('nu', Rr + 4, yN - 4);

    var C = R.race.sim.C, tm = Math.max(0, R.race.t);
    var xD = xVan(C);

    // opnamedepot ("onderweg"): vertraging van slikken/zetpil zichtbaar
    var ref = c.routes.slik.dosis * c.routes.slik.F;
    var dep = R.race.sim.depot / ref;
    if (dep > 0.03) {
      var rB = 5 + 13 * Math.sqrt(Math.min(1.6, dep));
      var xB = L + 20;
      if (Math.abs(xB - xD) < rB + 14) xB = Math.min(Rr - 20, xD + rB + 26);
      ctx.strokeStyle = 'rgba(255,225,161,0.55)'; ctx.lineWidth = 2;
      ctx.setLineDash([2, 5]); ctx.lineDashOffset = -(nu / 40) % 7 * (xD > xB ? 1 : -1);
      ctx.beginPath(); ctx.moveTo(xB, yN); ctx.lineTo(xD, yN); ctx.stroke();
      ctx.setLineDash([]); ctx.lineDashOffset = 0;
      ctx.fillStyle = 'rgba(255,225,161,0.22)';
      ctx.beginPath(); ctx.arc(xB, yN, rB, 0, 6.283); ctx.fill();
      ctx.strokeStyle = 'rgba(255,225,161,0.8)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = 'rgba(255,225,161,0.85)'; ctx.font = '600 11px ' + FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText('onderweg', xB, yN + rB + 4);
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
        if (dt > 0.7) return false;
        var q = dt / 0.7, ex = w / 2 + 40 + (e.xNaar - (w / 2 + 40)) * q;
        tekenIcoon(ctx, e.soort, ex, yN - 6 * Math.sin(q * Math.PI), 26 * (1 - 0.6 * q), 1 - q * 0.7);
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
    var kl = lijnKleur(C, tm);
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
    // waarde bij de stip
    var waarde = c.id === 'lithium' ? getal(C, 2) + ' mmol/L' : getal(C, 1) + ' mg/L';
    ctx.font = '600 12.5px ' + FONT; ctx.textBaseline = 'top';
    var wv = ctx.measureText(waarde).width;
    var xl = xD + 12;
    ctx.textAlign = 'left';
    if (xl + wv > Rr) { xl = xD - 12; ctx.textAlign = 'right'; }
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(waarde, xl, yN + 9);

    // rand boven: as-labels; rand onder: vervagen naar de knoppen
    var gb = ctx.createLinearGradient(0, 0, 0, 44);
    gb.addColorStop(0, 'rgba(0,0,0,0.95)'); gb.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gb; ctx.fillRect(0, 0, w, 44);
    var go = ctx.createLinearGradient(0, h - 50, 0, h);
    go.addColorStop(0, 'rgba(0,0,0,0)'); go.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = go; ctx.fillRect(0, h - 50, w, 50);

    ctx.font = '600 12px ' + FONT; ctx.textBaseline = 'top';
    R.cfg.ticks.forEach(function (tk) {
      var xt = xVan(tk.C);
      ctx.fillStyle = tk.streep ? 'rgba(126,240,196,0.95)' : 'rgba(255,255,255,0.5)';
      ctx.textAlign = tk.C === 0 ? 'left' : (tk.rechts ? 'right' : 'center');
      ctx.fillText(tk.t, tk.C === 0 ? xt - 2 : xt, 6);
    });
    var v0 = M.venster(c, tm);
    var zl = xVan(v0.laag), zr = v0.hoog === Infinity ? Rr : xVan(v0.hoog);
    ctx.fillStyle = 'rgba(126,240,196,0.85)'; ctx.textAlign = 'center';
    ctx.font = '700 11px ' + FONT;
    ctx.fillText(R.cfg.zoneLabel.toUpperCase(), (zl + zr) / 2 + (v0.hoog === Infinity ? 12 : 0), 23);
    if (R.cfg.toxLabel) {
      ctx.fillStyle = 'rgba(255,120,110,0.9)';
      ctx.fillText(R.cfg.toxLabel.toUpperCase(), (xVan(c.toxisch) + Rr) / 2, 23);
    }
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
    if (forceer || !laatste || t - laatste.t >= R.cfg.monster) R.monsters.push({ t: t, C: C });
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
        R.monsters.push({ t: T, C: race.sim.C });
        if (k.route === 'spuit') {
          speel('spuit');
          R.effecten.push({ type: 'spuit', t0: nu, xVan: xVan(Cvoor), xNaar: xVan(race.sim.C) });
        } else {
          speel(k.route === 'zetpil' ? 'zetpil' : 'slik');
          var ref = c.routes.slik.dosis * c.routes.slik.F;
          var xB = R.links + 20;
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
      trend = som > 0 ? 'plus' : (som < -1e-9 ? 'min' : '');
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
          geblokkeerd: !!doelGeblokkeerd(), poging: r.keuze.poging
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
