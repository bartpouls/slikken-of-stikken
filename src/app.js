/*
 * Slikken of Stikken — src/app.js  (schermen, spelverloop, race-motor)
 * Laadt als laatste (na model, score, sound, tutorial, einde). Zet window.SoS.ui en window.SoS.debug.
 *
 * FLOW: start (naam + "Start") → oefenronde → intro race 1 → race 1 paracetamol → intro race 2 → race 2
 *       lithium → einde (SoS.einde.toon). "Oefenronde overslaan" (startscherm) gaat meteen naar intro race 1.
 *       "Nog een keer" start race 1 meteen.
 *
 * EÉN RACE-MOTOR, OOK VOOR DE OEFENRONDE (§6C1): startRace(i, gids). De oefenronde is startRace(0, SoS.tutorial):
 *   hetzelfde scherm (#scherm-race), dezelfde tekencode (teken, tekenPoortjes), dezelfde knoppen, klok,
 *   QALY-stand, dagteller en levermeter. Er bestaat geen tutorialversie van die onderdelen. Het draaiboek
 *   (src/tutorial.js) voegt alleen toe: de klok staat stil tot de gevraagde keuze klaarstaat (R.gids.bevroren;
 *   de knoppen zelf werken precies als in de race: kiezen, wisselen, wissen, te laat),
 *   één zin in beeld (zelfde .melding als de race, maar hij blijft staan), en de markering van die knop
 *   (class "wijs" + data-wijs="1"). De plotwending (misselijkheid) staat uit; de ronde stopt op gids.eind.
 *
 * WAT JE OP HET RACESCHERM ZIET (v2.1; oefenronde en race, zelfde code):
 *   - Spiegelbalk boven in het doek: de horizontale as IS de spiegel in het bloed. Gekleurde stukken (te weinig |
 *     het groene vlak | te veel | giftig), getallen eronder ("streep 5" = de ondergrens), een wijzer op de plek
 *     van de spiegel. De banen eronder hebben dezelfde kleuren.
 *   - Het gezicht van de patiënt staat op de spiegel (KOP-afbeeldingen), met een gevoelswoord (R.gevoel).
 *   - Bovenbalk (#patient): portretje, "Race 1 · Paracetamol" en de patiënt; menuknop linksboven, demp rechtsboven.
 *   - Tijdstrook (#tijdstrook) links in het speelveld, onder de klok: deel 1 / deel 2 van boven naar beneden, lengte
 *     naar verhouding van hun duur, vulling per deel loopt met de klok mee. R.deel2 = begin van de eerste gebeurtenis (oefenronde:
 *     gids.deel2). Geblokte strook in de tijdlijn op dat moment; het label van deel 2 wordt pas na de onthulling
 *     "misselijk"/"ibuprofen". Plotwending: de klok staat stil tot de speler op Verder tikt (R.wacht).
 *   - Regel boven de knoppen (#poort-status): wat staat klaar voor het volgende poortje + balk tot het poortje.
 *   - Vertelstappen in de oefenronde (stap zonder knop): zin in beeld, klok staat even stil, gaat vanzelf verder
 *     of met een tik op het speelveld (tikPodium); st.licht laat een schermonderdeel oplichten (zetLicht).
 *   - Kaartje na de race (#finish): QALY-punten + doseerschema per poortje (schemaHtml, uit race.verslag()).
 *
 * GEDEELD, VOOR einde.js (SoS.ui; gebruik binnen toon(), niet bij het laden):
 *   SoS.ui.figuur({wie:'opa'|'vries', stemming:'neutraal'|'blij'|'pijn'|'misselijk', prop:'stok'|'doosje'|null,
 *                 kleur, label, kop}) -> SVG-string: plat figuurtje zonder schetslijn (past op zwart met sterren),
 *                 herkenbaar aan het hoedje (opa Jan blauwe pet + wandelstok, mevrouw De Vries rode hoed met
 *                 rand, knotje en bril). kop:true = alleen hoofd en hoed. Zet hem in een .fig; .fig.wiebel = reactie.
 *   SoS.ui.icoon(soort)  soort 'tablet'|'slik'|'zetpil'|'spuit'|'niets'|'doosje' -> SVG-string (40×40).
 *   SoS.ui.el(tag, attrs, kinderen) -> element (attrs: class, text, html, data-*, aria-*, on<event>).
 *   SoS.ui.getal(x, decimalen) -> Nederlandse notatie ("1,5"; "1.250").
 *   SoS.ui.speel(naam)  SoS.sound.play zonder risico (namen: zie src/sound.js). SoS.ui.unlock().
 *   SoS.ui.KLEUR {paars, groen, koraal, geel, blauw, rood, roze}
 *   Stijl: style.css (één stijl: zwart met sterren; .kaart, .markering, .tekst, .knop-paars, .knop-lijn, .fig).
 *
 * RACE-INTERACTIE: de tijd loopt van boven naar beneden (pijltje "tijd" in de linkermarge); paarse poortjes
 * schuiven van onder naar de "nu"-lijn. De knoppen onderin kiezen wat er op het EERSTVOLGENDE poortje gebeurt
 * (stand "gekozen", icoontje op het poortje, regel "Tablet voor uur 18" boven de knoppen); op het poortje wordt
 * de keuze toegepast (race.naar(poortjetijd), dan race.geef) en gewist. Overslaan is ook een keuze; een poortje
 * zonder keuze kost punten (race.geenKeuze, S.PUNTEN.GEEN_KEUZE). Een geweigerde tablet telt als keuze.
 * Paracetamol: 1 toediening (1 g) per poortje; dezelfde knop nog eens = keuze weg.
 * Lithium en carbamazepine: dosisknoppen in mg; nog een tik op dezelfde knop = keuze weg.
 * Te laat: een tik binnen 0,3 s (echte tijd, /speed) ná een poortje telt NIET voor het volgende poortje
 * ("Te laat voor uur 16"); tik opnieuw. SoS.debug.poortje.open = false in dat venster.
 * INDELING CANVAS (geen tekst over tekst): poortlabels staan aan de kant weg van de stip (R.kant, strook
 * R.labelMax breed), met een stukje lijn ervoor en erachter; waardelabel boven de nu-lijn, "onderweg"-bolletje
 * ernaast of eronder, buiten die strook. Meldingen staan boven in het podium (verleden), één tegelijk; labels
 * onder een melding worden niet getekend.
 * Termen: "het groene vlak" (de zone); de ondergrens ervan heet "de streep" (label bovenaan, intro race 1).
 * Slikken tijdens misselijkheid wordt geweigerd met de casusbladtekst (geen effect, geen strafpunten). Leverschade (dagteller > 4 g): lijn en stip rood, QALY-pijl omlaag, levermeter vol.
 * Het portretje in de racekop (#patient-kop) laat zien hoe het met de patiënt gaat (blij / pijn / misselijk).
 * Terug-knop: eerst een melding; nog een keer terug binnen 3 s verlaat het spel.
 *
 * TESTHAAK (gauntlet/contract.md):
 *   ?speed=N  versnelt de spelklok N× (ook de aanloop van 3 s en de duur van meldingen).
 *   window.SoS.debug (alleen-lezen momentopname, elke keer vers): {fase, casus, t, klok, C, score,
 *     dagteller, poortje:{index, t, keuze, aantal, geblokkeerd}, gegeven:[...], uitslag:[...], naam, speed,
 *     gids:{stap, bevroren, wijs, zin} (alleen in de oefenronde), tutorialDuur (s, na afloop),
 *     wacht (plotwending wacht op "Verder", data-actie="wending-verder"), menu (hoofdmenu open)}
 *     fase: 'start'|'tutorial'|'intro1'|'race1'|'intro2'|'race2'|'einde'; t = modeltijd (uur);
 *     klok = spelklok (uur, negatief tijdens de aanloop); score = live QALY-totaal.
 *   Stabiele data-attributen: data-actie="start" en "start-over" (startscherm), "verder" (na de oefenronde en
 *     na elke race), "start-race" (intro-kaartje), "slik" | "zetpil" | "spuit" | "niets" (raceknoppen; lithium en
 *     carbamazepine: "d1" | "d2" | "d3" | "d4" = 1–4 tabletten, "Overslaan" = niets), "demp", "menu" (+ data-menu="verder|oefenronde|race-1|race-2|einde|begin"), "opnieuw" (einde). Naamveld: data-veld="naam". Oefenronde: de knop die de
 *     uitleg aanwijst heeft data-wijs="1".
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
  var KLEUR = { paars: '#b07cff', groen: '#3ddc97', koraal: '#ff6f61', geel: '#ffd166', blauw: '#4f8dff',
    rood: '#ff4d6d', roze: '#ff8fb8' };
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

  // Platte figuurtjes voor de zwarte sterrenwereld (geen schetslijnen): herkenbaar aan het gekleurde hoedje.
  // o.kop = true: alleen hoofd en hoed (klein portret in de racekop).
  function figuur(o) {
    o = o || {};
    var idrissi = o.wie === 'idrissi'; // meneer El Idrissi: zelfde vorm als opa Jan, groene pet, donkerder huid, kort zwart haar, geen stok
    var wie = o.wie === 'vries' ? 'vries' : 'opa';
    var st = o.stemming || 'neutraal';
    var hoed = o.kleur || (idrissi ? KLEUR.groen : (wie === 'opa' ? KLEUR.blauw : KLEUR.rood));
    var prop = o.prop === undefined ? (wie === 'opa' && !idrissi ? 'stok' : null) : o.prop;
    var label = o.label || (idrissi ? 'Meneer El Idrissi' : (wie === 'opa' ? 'Opa Jan' : 'Mevrouw De Vries'));
    var huid = idrissi ? (st === 'misselijk' ? '#93a160' : '#a8714a') : (st === 'misselijk' ? '#cfe3a4' : '#f6d9b4');
    var lijf = idrissi ? '#3f9b7a' : (wie === 'opa' ? '#6b7fc4' : '#b06fc9');
    var d = '#2b2233'; // ogen en mond
    var A = 'stroke="' + lijf + '" stroke-width="7" stroke-linecap="round" fill="none"';
    var F = 'stroke="' + d + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"';
    var s = '<svg viewBox="' + (o.kop ? '16 6 80 82' : '0 0 100 132') + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + label + '">';
    if (!o.kop) {
      s += '<path d="M44 104 L42 126 M56 104 L58 126" stroke="' + (idrissi ? '#2f5f8f' : (wie === 'opa' ? '#4a5a96' : '#8a4fa3')) + '" stroke-width="7" stroke-linecap="round" fill="none"/>';
      if (prop === 'stok') {
        s += '<path d="M73 127 L71 97 C71 90 63 90 63 95" stroke="#d9a566" stroke-width="4.5" stroke-linecap="round" fill="none"/>';
        s += '<path d="M39 95 L31 103 M61 95 L70 100" ' + A + '/>';
      } else if (prop === 'doosje') {
        s += '<path d="M39 95 L31 103 M61 95 L70 98" ' + A + '/>';
        s += '<rect x="67" y="88" width="21" height="15" rx="3" fill="#fff"/><path d="M67 95.5 H88" stroke="#ff9f43" stroke-width="5"/>';
      } else {
        s += '<path d="M39 95 L31 103 M61 95 L69 103" ' + A + '/>';
      }
      s += '<path d="M35 110 C35 93 41 84 50 84 C59 84 65 93 65 110 Z" fill="' + lijf + '"/>';
    }
    if (wie === 'vries') s += '<circle cx="74" cy="50" r="9" fill="#e9e4dc"/>';
    s += '<circle cx="50" cy="58" r="25" fill="' + huid + '"/>';
    if (idrissi) s += '<path d="M26.5 52 Q26 44 30 40 L33 50 Z M73.5 52 Q74 44 70 40 L67 50 Z" fill="#1f1a1d"/>' + // kort zwart haar langs de pet
      '<path d="M37 51.5 q4 -2.5 8 0 M55 51.5 q4 -2.5 8 0" stroke="#1f1a1d" stroke-width="2.6" stroke-linecap="round" fill="none"/>'; // wenkbrauwen
    if (st === 'blij') s += '<circle cx="34.5" cy="67" r="4.5" fill="#ff8fb8" opacity=".55"/><circle cx="65.5" cy="67" r="4.5" fill="#ff8fb8" opacity=".55"/>';
    if (st === 'pijn') {
      s += '<path d="M37 55 l6 3.5 l-6 3.5 M63 55 l-6 3.5 l6 3.5" ' + F + '/>';
    } else if (st === 'misselijk') {
      s += '<path d="M37 58 q4 -3 8 0 M55 58 q4 -3 8 0" ' + F + '/>';
    } else {
      s += '<circle cx="41" cy="58" r="3.4" fill="' + d + '"/><circle cx="59" cy="58" r="3.4" fill="' + d + '"/>';
    }
    if (wie === 'vries') {
      s += '<circle cx="41" cy="58" r="7.5" fill="none" stroke="' + d + '" stroke-width="2.2"/>' +
           '<circle cx="59" cy="58" r="7.5" fill="none" stroke="' + d + '" stroke-width="2.2"/>' +
           '<path d="M48.5 58 h3" stroke="' + d + '" stroke-width="2.2"/>';
    } else if (!idrissi) {
      s += '<path d="M41 68.5 q4.5 -4 9 -0.5 q4.5 -3.5 9 0.5" stroke="#ffffff" stroke-width="4" stroke-linecap="round" fill="none"/>';
    }
    var mond = { blij: 'M43 73 q7 7 14 0', pijn: 'M43 77 q7 -6 14 0', misselijk: 'M41 76 q2.5 -3 5 0 t5 0 t5 0 t5 0', neutraal: 'M45 75 h10' }[st] || 'M45 75 h10';
    s += '<path d="' + mond + '" ' + F + '/>';
    if (st === 'pijn') s += '<path d="M78 40 q5 7 0 10 q-5 -3 0 -10 z" fill="#7cc4ff"/>';
    if (st === 'misselijk') s += '<path d="M79 70 q3 -4 6 0 M81 78 q3 -4 6 0" stroke="#a6d96a" stroke-width="2.5" stroke-linecap="round" fill="none"/>';
    // eigen hoedjes: opa Jan een pet met klep, mevrouw De Vries een hoed met rand en lint
    if (wie === 'opa') {
      s += '<path d="M25 47 Q23 29 48 27 Q72 26 77 41 L77 45 Q52 39 25 47 Z" fill="' + hoed + '"/>';
      s += '<path d="M62 43 Q81 38 91 46 Q80 52 63 48 Z" fill="' + hoed + '"/>';
      s += '<circle cx="49" cy="27.5" r="3" fill="#ffffff" opacity=".85"/>';
    } else {
      s += '<path d="M35 37 L37.5 15 Q50 10 62.5 15 L65 37 Z" fill="' + hoed + '"/>';
      s += '<path d="M36.6 29 L63.4 29" stroke="#ffd166" stroke-width="5"/>';
      s += '<ellipse cx="50" cy="37" rx="31" ry="6" fill="' + hoed + '"/>';
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

  // Portretjes (hoofd + hoed) voor het canvas: het gezicht van de patiënt staat op de spiegel.
  var KOP = { opa: {}, vries: {}, idrissi: {} };
  ['opa', 'vries', 'idrissi'].forEach(function (wie) {
    ['neutraal', 'blij', 'pijn', 'misselijk'].forEach(function (st) {
      var im = new Image();
      im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(figuur({ wie: wie, stemming: st, kop: true }).replace('<svg ', '<svg width="160" height="164" '));
      KOP[wie][st] = im;
    });
  });
  var KOP_S = 0.56; // schaal: hoofd ±14 px straal
  function tekenKop(ctx, wie, st, x, y) {
    var im = KOP[wie][st];
    if (!im || !im.complete || !im.naturalWidth) return false;
    ctx.drawImage(im, x - 34 * KOP_S, y - 52 * KOP_S, 80 * KOP_S, 82 * KOP_S); // midden van het hoofd op (x, y)
    return true;
  }
  var KOP_R = 18; // ring om het hoofd; labels blijven hierbuiten

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
    staat.fase = fase || id;
    var mk = $('menu-knop');
    if (mk) mk.hidden = staat.fase === 'start';
    var s = $('scherm-' + id);
    if (s) s.scrollTop = 0;
    if (id === 'start') werkVerderBij();
  }

  // ------------------------------------------------------------------------------------------
  // Voortgang bewaren. Herlaadt de telefoon de pagina (iPhone doet dat soms na een ander app), dan zijn de
  // afgeronde races niet weg: na elke race gaan naam, verslagen en curves naar localStorage (alleen op deze
  // telefoon, 12 uur geldig). Het startscherm biedt dan "Verder als …". Een race die halverwege onderbroken
  // werd, telt niet mee (zelfde regel als het menu) en begint opnieuw bij zijn introkaartje.
  // ------------------------------------------------------------------------------------------
  var VOORTGANG = 'sos.voortgang', VOORTGANG_GELDIG = 12 * 3600 * 1000;
  // Vingerafdruk van deze versie van het spel (alle code op de pagina). Een stand uit een andere versie wordt
  // niet teruggezet: na een correctie op de dag zelf past een oud verslag misschien niet meer bij de code.
  // De stempel komt uit tools/build.mjs (<meta name="bouw">, hash van alle CSS en JS): geen invloed van extensies,
  // en ook een correctie alleen in de opmaak maakt oude standen ongeldig.
  function bouw() {
    try { var m = doc.querySelector('meta[name="bouw"]'); if (m && m.content && m.content.indexOf('@@') < 0) return m.content; } catch (e) { /* negeer */ }
    return 'zonder-stempel';
  }
  function heeftRace(v) { return !!(v && v.opbouw && isFinite(v.opbouw.totaal)); }
  // Voortgang = race 1 of race 2 afgerond. De bonusrace alleen is geen voortgang (Verder zou dan race 1 openen).
  function heeftVoortgang(vs) { return !!vs && (heeftRace(vs[0]) || heeftRace(vs[1])); }
  function bewaarVoortgang() {
    try {
      if (!heeftVoortgang(staat.verslagen)) { root.localStorage.removeItem(VOORTGANG); return; }
      root.localStorage.setItem(VOORTGANG, JSON.stringify({ v: 1, bouw: bouw(), op: Date.now(), naam: staat.naam,
        verslagen: staat.verslagen, curves: staat.curves, duren: staat.duren || [] }));
    } catch (e) { /* geen opslag of vol: het spel werkt gewoon door */ }
  }
  function leesVoortgang() {
    try {
      var x = JSON.parse(root.localStorage.getItem(VOORTGANG) || 'null');
      if (!x || x.v !== 1 || x.bouw !== bouw() || typeof x.naam !== 'string' || !Array.isArray(x.verslagen) || !Array.isArray(x.curves)) return null;
      if (!(Date.now() - x.op < VOORTGANG_GELDIG) || !heeftVoortgang(x.verslagen)) return null;
      return x;
    } catch (e) { return null; }
  }
  function wisVoortgang() { try { root.localStorage.removeItem(VOORTGANG); } catch (e) { /* geen opslag */ } }
  // Welke voortgang biedt het startscherm aan: die van dit spel (na "Naar het begin"), anders de bewaarde.
  function voortgangVoorStart() {
    if (heeftVoortgang(staat.verslagen)) return { naam: staat.naam, verslagen: staat.verslagen, curves: staat.curves, duren: staat.duren || [] };
    return leesVoortgang();
  }
  function werkVerderBij() {
    var blok = $('start-verder');
    if (!blok) return;
    var x = voortgangVoorStart();
    blok.hidden = !x;
    if (!x) return;
    $('start-verder-knop').textContent = 'Verder als ' + x.naam;
    var stand = [];
    x.verslagen.forEach(function (v, i) { if (heeftRace(v)) stand.push(raceNaam(i) + ': ' + getal(v.opbouw.totaal, 0)); });
    $('start-verder-stand').textContent = stand.join(' · ') + ' QALY-punten';
  }

  // Figuurtjes reageren op aanraken.
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
    function begin(metOefenronde) {
      if (staat.fase !== 'start') return;
      unlock();
      speel('tik');
      // Start = een nieuw spel: in het geheugen begint de stand opnieuw. De bewaarde stand blijft staan tot de
      // eerste race van dit nieuwe spel klaar is (dan overschrijft bewaarVoortgang hem): een misser op Start
      // kost dan niets.
      staat.verslagen = []; staat.curves = []; staat.duren = [];
      var naam = (inp.value || '').replace(/\s+/g, ' ').trim().slice(0, 16);
      if (!naam) naam = 'Speler ' + (10 + Math.floor(Math.random() * 90));
      staat.naam = naam;
      try { root.localStorage.setItem('sos.naam', naam); } catch (e) { /* geen opslag */ }
      inp.blur();
      zetHistorie();
      if (metOefenronde && SoS.tutorial) startRace(0, SoS.tutorial);
      else toonIntro(0);
    }
    $('start-form').addEventListener('submit', function (ev) { ev.preventDefault(); begin(true); });
    doc.querySelector('[data-actie="start-over"]').addEventListener('click', function () { begin(false); });
    $('start-verder-knop').addEventListener('click', function () {
      if (staat.fase !== 'start') return;
      var x = voortgangVoorStart();
      if (!x) { werkVerderBij(); return; }
      unlock();
      speel('tik');
      staat.naam = x.naam;
      staat.verslagen = x.verslagen.slice(); staat.curves = x.curves.slice(); staat.duren = (x.duren || []).slice();
      inp.value = x.naam;
      zetHistorie();
      // eerste race die nog niet gespeeld is; zijn race 1 en 2 klaar, dan het eindverslag
      var v = staat.verslagen;
      if (!heeftRace(v[0])) toonIntro(0);
      else if (!heeftRace(v[1])) toonIntro(1);
      else toonEinde();
    });
    werkVerderBij();
  }

  // ------------------------------------------------------------------------------------------
  // 2. Oefenronde (tutorial): geen eigen scherm. startRace(0, SoS.tutorial) start de race-motor van
  //    race 1 met een draaiboek ernaast (zie "gids" hieronder en src/tutorial.js).
  // ------------------------------------------------------------------------------------------

  // Venster als tekst, uit de casusdata (M.venster: kan in de tijd verschuiven), bv. "0,6–1,0 mmol/L".
  function vensterTekst(c, t) {
    var v = M.venster(c, t), e = '\u00a0' + CFG[c.id].eenheid, dec = CFG[c.id].dec;
    return v.hoog === Infinity ? '≥\u00a0' + getal(v.laag, dec) + e : getal(v.laag, dec) + '–' + getal(v.hoog, dec) + e;
  }

  // ------------------------------------------------------------------------------------------
  // 3. Intro-kaartje per race
  // ------------------------------------------------------------------------------------------
  var RACES = ['paracetamol', 'lithium', 'carbamazepine']; // race 3 = bonusrace (alleen via menu / eindscherm)
  var WIE = { paracetamol: 'opa', lithium: 'vries', carbamazepine: 'idrissi' };
  function wieVan(c) { return WIE[c.id] || 'opa'; }
  function perDagCasus(c) { return c.raceDuur > 48; } // klok in dagen
  function raceNaam(i) { return i === 2 ? 'Bonusrace' : 'Race ' + (i + 1); }
  // Hoe de patiënt zich voelt bij deze spiegel (lekentaal uit het casusblad) en welk gezicht erbij hoort.
  var GEVOEL = {
    lithium: { onder: ['kans op terugval', 'neutraal'], zone: ['stabiel', 'blij'], boven: ['trillen, misselijk', 'misselijk'], tox: ['giftig: verward', 'misselijk'] },
    carbamazepine: { onder: ['kans op aanval', 'neutraal'], zone: ['geen aanvallen', 'blij'], licht: ['moe, duizelig', 'neutraal'],
      boven: ['dubbelzien, wankel', 'misselijk'], tox: ['giftig: verward, suf', 'misselijk'] }
  };
  function toonIntro(i) {
    var c = M.casus(RACES[i]);
    $('intro-kop').textContent = raceNaam(i) + ' · ' + c.naam;
    var fig = $('intro-fig');
    fig.innerHTML = '';
    var f = el('div', { class: 'fig', html: figuur({ wie: wieVan(c), stemming: i === 0 ? 'pijn' : 'neutraal' }) });
    maakFigLevend(f);
    fig.appendChild(f);
    $('intro-verhaal').textContent = c.verhaal;
    var regels;
    if (i === 0) {
      regels = ['Jij regelt de medicijnen van opa Jan: wat hij krijgt, en wanneer.',
        'Blijf binnen het therapeutisch venster: boven de streep, met ' + getalKort(c.routes.slik.dosis / 1000, 1) +
          ' g per keer en hooguit ' + getalKort(c.bovengrens.maxPer24u / 1000, 1) + ' g per dag. Boven ' + getalKort(c.bovengrens.maxPer24u / 1000, 1) + ' g per dag loopt de lever gevaar.',
        'Kies vóór elk paars poortje: Tablet, Zetpil, Spuit of Overslaan. Geen keuze kost punten.',
        'De race heeft twee delen: halverwege verandert er iets, pas dan je plan aan.'];
    } else if (i === 2) {
      regels = ['Bonusrace: telt niet mee in je totaal.',
        'Blijf binnen het therapeutisch venster: ' + vensterTekst(c, 0) + ' in de eerste dagen, ' + vensterTekst(c, 1e6) + ' als hij gewend is. Boven ' + getal(c.toxisch, 0) + '\u00a0' + CFG[c.id].eenheid + ' is het giftig.',
        'Meneer El Idrissi begint vandaag: de spiegel heeft dagen nodig om op te bouwen.',
        Math.round(c.raceDuur / 24) + ' dagen, 2 poortjes per dag (0 en 12 uur): kies 200, 400 of 800 mg, of Overslaan.',
        'Verhoog rustig: start met hooguit ' + getal(c.titratie.startPerDag, 0) + ' mg per dag, daarna per week hooguit ' +
          getal(c.titratie.stapPerWeek, 0) + ' mg per dag erbij. Sneller kost ' + getal(SoS.score.PUNTEN.TE_SNEL, 0) + ' punten.'];
    } else {
      // §6C5: wat in race 2 anders is dan in race 1, één zin per verschil (getallen uit de casusdata).
      var uren = M.poortjes(c).filter(function (t) { return t < 24; });
      regels = ['Blijf binnen het therapeutisch venster: het groene vlak heeft nu ook een bovenkant, ' + vensterTekst(c, 0) + '.',
        'Boven ' + getal(c.toxisch, 1) + '\u00a0' + CFG[c.id].eenheid + ' is het giftig.',
        'De klok telt in dagen: de race duurt ' + Math.round(c.raceDuur / 24) + ' dagen.',
        'Twee poortjes per dag, ochtend (' + uren[0] + ' uur) en avond (' + uren[1] + ' uur): kies ' + c.poortjes.dosisKnoppen.map(function (n) { return getal(n * c.dosis.mg, 0); }).join(', ').replace(/, (?=[^,]*$)/, ' of ') + ' mg, of Overslaan.',
        'Lithium is een tablet met vertraagde afgifte (retard): daardoor is één keer per dag genoeg.',
        'Er is geen zetpil, geen spuit en geen dagteller.'];
    }
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
      secPerUur: 80 / 24, Cmax: 20, monster: 0.02, dun: 0.1,
      as: [10, 15], eenheid: 'mg/L', // hulplijnen; de venstergrenzen komen uit M.venster(casus, t)
      zoneLabel: null, toxLabel: null
    },
    lithium: {
      secPerUur: 62 / 240, Cmax: 2, monster: 0.1, dun: 1, dec: 1, decWaarde: 2,
      as: [], eenheid: 'mmol/L', // + casus.toxisch; de venstergrenzen komen uit M.venster(casus, t)
      zoneLabel: ['in de zone'], toxLabel: 'giftig'
    },
    carbamazepine: {
      secPerUur: 97 / 672, Cmax: 24, monster: 0.2, dun: 1, dec: 0, decWaarde: 1,
      as: [], eenheid: 'mg/L',
      zoneLabel: ['in de zone'], toxLabel: 'giftig'
    }
  };
  CFG.paracetamol.dec = 0; CFG.paracetamol.decWaarde = 1;
  // Zonelabel letterlijk uit het casusblad: "pijnstilling (vereenvoudigd)" -> twee regels.
  CFG.paracetamol.zoneLabel = (function (l) { var i = l.indexOf(' ('); return i > 0 ? [l.slice(0, i), l.slice(i + 1)] : [l]; })(M.casus('paracetamol').zone.label);
  var AANLOOP_S = 3; // seconden echte tijd vóór t = 0 (bij speed 1)

  function tijdLabel(c, t, metUur) {
    if (perDagCasus(c)) {
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
    if (perDagCasus(c)) {
      var d = Math.floor(t / 24), h = Math.floor(t - d * 24);
      return 'Dag ' + d + '<small>· ' + h + ' u</small>';
    }
    return 'Uur ' + Math.floor(t);
  }

  // gids = draaiboek van de oefenronde (SoS.tutorial) of niets. Met gids is dit precies dezelfde race, met
  // drie verschillen: de klok staat stil tot de speler de gemarkeerde knop tikt, er staat één uitlegzin in
  // beeld, en de plotwending (misselijkheid) doet niet mee. De ronde stopt op gids.eind en telt niet mee.
  function startRace(i, gids) {
    var c = M.casus(gids ? gids.casus : RACES[i]);
    var cfg = CFG[c.id];
    var race = S.maakRace(c, gids ? { blokkades: false } : undefined);
    R = {
      i: i, casus: c, cfg: cfg, race: race,
      gids: gids ? { stappen: gids.stappen, eind: gids.eind, klaar: gids.klaar, vol: gids.vol, geenKeuze: gids.geenKeuze, i: 0, bevroren: false, actief: false, wijsVanaf: 0, beatTot: 0, t0: performance.now(), duur: null } : null,
      stemming: null, gevoel: '', licht: null,
      // elke race heeft twee delen: een gewoon stuk, en dan verandert er iets (eerste gebeurtenis uit de casusdata)
      deel2: gids ? gids.deel2 : c.gebeurtenissen.reduce(function (m, g) { return Math.min(m, g.type === 'blokkade' ? g.van : g.t); }, Infinity),
      deelStand: '',
      poorten: M.poortjes(c), g: 0,
      keuze: { route: null, aantal: 0, poging: false },
      gegeven: [],
      klok: -AANLOOP_S / cfg.secPerUur,
      monsters: [], dun: [], volgendDun: 0,
      voorgeschiedenis: [],
      toestand: null, toxisch: false,
      onthuld: {}, effecten: [], ibuprofen: false, leverOver: false, laatstePoort: null, kiesT0: 0,
      wacht: false, wachtVanaf: 0, psStand: '',
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
    naarScherm('race', gids ? 'tutorial' : 'race' + (i + 1));
    werkPatientBij();
    meetDoek();
    $('melding').className = 'melding';
    if (gids) gidsStap(); // stap 1: de klok staat meteen stil
    else melding('Kies vóór elk paars poortje een knop: op het poortje gebeurt het. Geen keuze kost punten.', { prio: 0, duur: AANLOOP_S + 3 });
    R.rafId = root.requestAnimationFrame(lus);
  }

  function bouwRaceUi() {
    var c = R.casus;
    $('finish').hidden = true;
    $('finish-schema').innerHTML = '';
    $('deel-2-tekst').textContent = 'Deel 2 · verandering';
    $('deel-2-tekst').removeAttribute('data-vol');
    $('tijdstrook').className = 'tijdstrook';
    // deel 1 en deel 2 naar verhouding van hun duur: de strook is een tijdsaanduiding
    $('deel-1').style.flexGrow = R.deel2;
    $('deel-2').style.flexGrow = (R.gids ? R.gids.eind : c.raceDuur) - R.deel2;
    $('race-titel').textContent = (R.gids ? 'Oefenronde' : (R.i === 2 ? 'Bonus' : raceNaam(R.i))) + ' · ' + c.naam;
    $('poort-status').className = 'poort-status';
    zetLicht(null);
    $('klok').innerHTML = klokHtml(c, 0);
    $('qaly-getal').textContent = '0';
    $('qaly').className = 'qaly';
    $('qaly-trend').textContent = '';
    var lever = $('lever');
    lever.hidden = !(c.bovengrens && c.bovengrens.type === 'dagteller');
    lever.classList.remove('vol');
    $('finish-kop').textContent = R.gids ? R.gids.klaar.kop : 'Race klaar';
    $('finish-label').textContent = R.gids ? R.gids.klaar.label : 'QALY-punten';
    doc.querySelector('#finish [data-actie="verder"]').textContent = R.gids ? R.gids.klaar.knop : 'Verder';
    $('finish-zin').textContent = R.gids && R.gids.klaar.zin ? R.gids.klaar.zin : '';
    $('finish-zin').hidden = !(R.gids && R.gids.klaar.zin);
    $('chips').innerHTML = '';
    $('patient-naam').textContent = c.patient;
    // knoppen
    var nav = $('knoppen');
    nav.innerHTML = '';
    var lijst = c.poortjes.dosisKnoppen ? c.poortjes.dosisKnoppen.map(function (n) { return ['d' + n, mgTekst(c, n), 'tablet', 'slik', n]; }).concat([['niets', 'Overslaan', 'niets']])
      : [['slik', 'Tablet', 'tablet'], ['zetpil', 'Zetpil', 'zetpil'], ['spuit', 'Spuit', 'spuit'], ['niets', 'Overslaan', 'niets']];
    R.knoppen = {};
    R.knopInfo = {};
    lijst.forEach(function (d) {
      R.knopInfo[d[0]] = { route: d[3] || d[0], vast: d[4] || 0 };
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
    if (!R || R.gids || R.g >= R.poorten.length) return null;
    return M.geblokkeerd(R.casus, 'slik', R.poorten[R.g]);
  }

  function werkKnoppenBij() {
    if (!R) return;
    var blok = doelGeblokkeerd();
    Object.keys(R.knoppen).forEach(function (r) {
      var b = R.knoppen[r], info = R.knopInfo[r];
      var gek = R.keuze.route === info.route && (!info.vast || R.keuze.aantal === info.vast);
      b.classList.toggle('gekozen', gek);
      b.setAttribute('aria-pressed', gek ? 'true' : 'false');
      b.setAttribute('data-badge', gek ? (R.keuze.aantal > 1 && !info.vast ? R.keuze.aantal + '×' : '✓') : '');
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

  function tikActie(actie, b) {
    unlock();
    if (!R || R.klaar) return;
    var c = R.casus;
    var info = R.knopInfo[actie] || { route: actie, vast: 0 }, route = info.route;
    flits(b, 'tik');
    // Oefenronde: de knoppen werken precies als in de race (kiezen, wisselen, wissen, te laat). Alleen de
    // klok wacht: zie gidsControle.
    var G = R.gids;
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
    if (info.vast) { // dosisknop (lithium, carbamazepine): één tik = die dosis; nog eens = keuze weg
      if (k.route === route && k.aantal === info.vast) { k.route = null; k.aantal = 0; tekst = 'Keuze gewist voor ' + doelLabel + ': kies opnieuw, geen keuze kost punten.'; }
      else { k.route = route; k.aantal = info.vast; tekst = mgTekst(c, info.vast) + ' voor ' + doelLabel; }
    } else if (k.route === route && k.aantal < max) {
      k.aantal++;
      tekst = k.aantal + '× Tablet voor ' + doelLabel;
    } else if (k.route === route) {
      k.route = null; k.aantal = 0;
      tekst = 'Keuze gewist voor ' + doelLabel + ': kies opnieuw, geen keuze kost punten.';
    } else {
      k.route = route; k.aantal = 1;
      tekst = KEUZENAAM[route] + ' voor ' + doelLabel;
    }
    R.kiesT0 = performance.now();
    speel('tik');
    keuzeInfo(tekst, k.route ? 'gekozen' : 'gewist');
    werkKnoppenBij();
    if (G) gidsControle();
  }

  // ---------- gids (oefenronde) ----------
  // Een stap begint: de zin komt in beeld. Daarna bepaalt gidsControle of de klok moet wachten.
  function gidsStap() {
    var G = R.gids, st = G.stappen[G.i];
    // Nooit om een dosis vragen die de dagteller boven het maximum brengt (kan alleen als de speler zelf
    // iets extra gaf): dan vervalt de stap, met één zin waarom.
    var bg = R.casus.bovengrens, route = R.casus.routes[st.knop];
    if (route && bg && bg.type === 'dagteller' && R.race.sim.dagteller(st.op > 0 ? R.poorten[st.poortje] : 0) + route.dosis > bg.maxPer24u + 1e-9) {
      melding(R.gids.vol, {});
      G.i++;
      return;
    }
    G.actief = true;
    if (!st.knop) { // vertelstap: de klok staat even stil, daarna gaat het vanzelf verder
      var duur = (1.3 + 0.045 * st.zin.length + (st.fig ? 2 : 0)) * 1000 / Math.min(SPEED, 4);
      G.beatVan = performance.now() + MELD_FADE;
      G.beatTot = G.beatVan + duur;
      G.bevroren = true;
      zetLicht(st.licht);
      melding(st.zin, { soort: 'beat', beat: duur, fig: st.fig === 'draai' ? draaiSvg() : null, figGroot: st.fig === 'draai' });
      return;
    }
    zetLicht(null);
    var onder = zoneVan(R.race.sim.C, Math.max(0, R.race.t)) === 'onder';
    var zin = st.zin;
    if (zin === 'lekentaal.onder') zin = onder ? R.casus.lekentaal.onder : st.zinAnders; // casusbladtekst als hij klopt
    melding(zin, { soort: st.zin === 'lekentaal.onder' && onder ? 'au' : null });
    G.wijsVanaf = performance.now() + MELD_FADE + 40; // de markering komt samen met de zin, niet ervoor
    gidsControle();
  }
  // De klok staat stil zolang de gevraagde keuze niet klaarstaat voor het poortje van deze stap. Wisselt of
  // wist de speler zijn keuze (dat kan, net als in de race), dan wacht de klok opnieuw. De gevraagde knop is
  // gemarkeerd (class "wijs", data-wijs) zolang de klok wacht.
  function gidsControle() {
    var G = R.gids;
    if (!G) return;
    var st = G.actief ? G.stappen[G.i] : null;
    if (st && !st.knop) { // vertelstap
      if (performance.now() < G.beatTot) { G.bevroren = true; return; }
      G.i++; G.actief = false; G.bevroren = false;
      zetLicht(null);
      if (G.i < G.stappen.length && R.klok >= G.stappen[G.i].op) gidsStap();
      return;
    }
    G.bevroren = !!st && !(R.keuze.route === st.knop && R.g === st.poortje);
    var toon = G.bevroren && performance.now() >= G.wijsVanaf;
    Object.keys(R.knoppen).forEach(function (r) {
      var aan = toon && r === st.knop, b = R.knoppen[r];
      if (aan === b.classList.contains('wijs')) return;
      b.classList.toggle('wijs', aan);
      if (aan) b.setAttribute('data-wijs', '1'); else b.removeAttribute('data-wijs');
    });
  }

  // Het schermonderdeel dat bij een vertelstap oplicht (in de DOM via een klasse, op het canvas via R.licht).
  // wat: 'patient' (bovenbalk) | 'meter' (spiegelbalk + gezicht, canvas) | 'banen' (canvas) | 'klok' (klok +
  // tijdstrook) | 'delen' (tijdstrook) | 'qaly' | 'lever' | 'knoppen' (knoppen + de balk erboven + het volgende
  // poortje op het canvas)
  var LICHT_DOM = { patient: ['patient'], klok: ['klok', 'tijdstrook'], delen: ['tijdstrook'], qaly: ['qaly'], lever: ['lever'], knoppen: ['knoppen', 'poort-status'] };
  function zetLicht(wat) {
    if (R) R.licht = wat || null;
    ['patient', 'klok', 'tijdstrook', 'qaly', 'lever', 'knoppen', 'poort-status'].forEach(function (id) {
      $(id).classList.toggle('licht', !!(wat && LICHT_DOM[wat] && LICHT_DOM[wat].indexOf(id) >= 0));
    });
  }
  // Een tik op het speelveld slaat de wachttijd van een vertelstap over.
  function tikPodium() {
    if (R && R.wacht) { wachtVerder(); return; }
    var G = R && R.gids;
    if (!G || !G.actief || G.stappen[G.i].knop || R.klaar) return;
    if (performance.now() < G.beatVan + 500) return;
    G.beatTot = 0;
    speel('tik');
  }

  // Dosisknoppen (lithium, carbamazepine): de keuze heet naar de dosis in mg; paracetamol 1 g per keer.
  function mgTekst(c, n) { return getal(n * c.dosis.mg, 0) + ' mg'; }
  function keuzeNaam(c, k) { return c.poortjes.dosisKnoppen && k.route === 'slik' ? mgTekst(c, k.aantal) : (k.aantal > 1 ? k.aantal + '× ' : '') + KEUZENAAM[k.route]; }
  function maxAantal(route) { return route === 'slik' && R.casus.id !== 'paracetamol' ? (R.casus.poortjes.maxTabletten || 2) : 1; }
  var KEUZENAAM = { slik: 'Tablet', zetpil: 'Zetpil', spuit: 'Spuit', niets: 'Overslaan' };
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
    if (R.wacht && !o.wacht) return; // een plotwending staat in beeld en wacht op een tik
    if (nu < R.melding.tot && prio < R.melding.prio) return;
    var duur = (o.duur || 2.4) * 1000 / Math.min(SPEED, 4);
    // oefenronde: de zin blijft staan tot de volgende (altijd precies één zin in beeld); plotwending: tot de tik
    var blijft = !!R.gids || !!o.wacht;
    R.melding = { prio: prio, tot: blijft ? 0 : nu + duur };
    var m = $('melding');
    if (blijft && m.classList.contains('zicht') && m.getAttribute('data-zin') === tekst) return;
    var r = R;
    clearTimeout(meldTimer); clearTimeout(meldWissel);
    function toon() {
      if (R !== r || R.klaar) return;
      m.className = 'melding' + (o.soort ? ' ' + o.soort : '') + (o.fig ? ' met-fig' : '') + (o.wacht ? ' wacht' : '');
      if (o.beat) m.style.setProperty('--beat', Math.round(o.beat) + 'ms');
      m.innerHTML = '';
      if (o.fig) m.appendChild(el('div', { class: 'm-fig' + (o.figGroot ? ' groot kw-fig' : ''), html: o.fig }));
      m.appendChild(el('div', { text: tekst }));
      if (o.wacht) {
        m.appendChild(el('button', { type: 'button', class: 'knop-paars m-verder', 'data-actie': 'wending-verder', text: 'Verder',
          onclick: function (ev) { ev.stopPropagation(); wachtVerder(); } }));
        m.appendChild(el('div', { class: 'm-tik', text: 'De klok staat stil tot je verder tikt.' }));
      }
      m.setAttribute('data-zin', tekst);
      void m.offsetWidth;
      var t0 = performance.now();
      R.meldVlak = { top: m.offsetTop, bottom: m.offsetTop + m.offsetHeight, tot: blijft ? Infinity : t0 + duur + MELD_FADE + 60 };
      m.classList.add('zicht');
      if (!blijft) meldTimer = setTimeout(function () { m.classList.remove('zicht'); }, duur);
    }
    if (m.classList.contains('zicht')) {
      m.classList.remove('zicht');
      if (R.meldVlak && !blijft) R.meldVlak.tot = nu + MELD_FADE + 60 + 400;
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
    for (var i = 0; i < 170; i++) {
      STERREN.push({ x: rnd(), y: rnd(), r: 0.7 + rnd() * 1.6, k: kleuren[Math.floor(rnd() * kleuren.length)],
        a: 0.25 + rnd() * 0.6, p: 0.15 + rnd() * 0.5, f: rnd() * 6.28, vierkant: rnd() < 0.18 });
    }
  })();

  // Dezelfde sterren als in de race, als vaste achtergrond voor start, introkaartjes en eindscherm.
  function zetSterren() {
    try {
      var W = 420, H = 900, cv = doc.createElement('canvas');
      cv.width = W * 2; cv.height = H * 2;
      var x = cv.getContext('2d');
      x.scale(2, 2);
      STERREN.forEach(function (st) {
        x.globalAlpha = st.a; x.fillStyle = st.k;
        if (st.vierkant) x.fillRect(st.x * W, st.y * H, st.r * 1.6, st.r * 2.6);
        else { x.beginPath(); x.arc(st.x * W, st.y * H, st.r, 0, 6.283); x.fill(); }
      });
      doc.documentElement.style.setProperty('--sterren', 'url(' + cv.toDataURL('image/png') + ')');
    } catch (e) { /* zonder sterren is het scherm gewoon zwart */ }
  }

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
      R.links = 40; R.rechts = 24; // links: de tijdstrook; rechts: ruimte voor het gezicht aan de rand
      // breedste poortlabel (+ icoontje, dosisknoppen ook de mg): zo breed is de gereserveerde labelstrook
      ctx.font = '700 15px ' + FONT;
      var mx = 0;
      R.poorten.forEach(function (T) { mx = Math.max(mx, ctx.measureText(tijdLabel(R.casus, T, true)).width); });
      R.labelMax = mx + 34 + (R.casus.poortjes.dosisKnoppen ? 28 : (R.casus.id !== 'paracetamol' ? 18 : 0));
      pasStrookTekst();
    }
  }

  // De labels in de tijdstrook: past "Deel 2 · misselijk" niet in een kort deel, dan alleen "Deel 2".
  function pasStrookTekst() {
    ['deel-1', 'deel-2'].forEach(function (id) {
      var t = $(id).querySelector('.ts-tekst');
      var vol = t.getAttribute('data-vol') || t.textContent;
      t.setAttribute('data-vol', vol);
      t.textContent = vol;
      var rg = doc.createRange(); rg.selectNodeContents(t);
      if (rg.getBoundingClientRect().height > $(id).clientHeight - 6) t.textContent = vol.split(' · ')[0];
    });
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
  var BOVENRAND = 72;
  // Poortlabels staan aan de kant WEG van de stip (R.kant: 'links' | 'rechts', met speling zodat ze niet
  // heen en weer springen). Die strook (R.strook) is gereserveerd: de stip, het waardelabel en het
  // "onderweg"-bolletje blijven erbuiten. Poortjes vlak bij de nu-lijn (PROX) volgen de kant altijd; verder
  // in het verleden houden ze de kant die ze hadden. Zo ligt er nooit tekst over tekst, ook niet op het poortje.
  var INSPRING = 30, PROX = 40; // inspringen: het paarse label heeft een lijn ervoor en erachter

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
        icoonSoort = gg.soort === 'slik' ? 'tablet' : (gg.soort === 'geblokkeerd' || gg.soort === 'geen' ? 'kruis' : (gg.soort === 'leeg' ? null : gg.soort));
        aantal = gg.aantal || 1;
      }
      var extra = icoonSoort ? 34 + (c.poortjes.dosisKnoppen && icoonSoort === 'tablet' ? 28 : (aantal > 1 ? 18 : 0)) : 0;
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
        if (doel && R.licht === 'knoppen') { ctx.lineWidth = 3 + 3 * (0.5 + 0.5 * Math.sin(nu / 240)); ctx.strokeStyle = '#ffffff'; }
        if (verleden && R.gegeven[g] && R.gegeven[g].soort === 'geen') { ctx.strokeStyle = KLEUR.koraal; ctx.globalAlpha = Math.min(1, a * 1.6); }
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
          var dk = c.poortjes.dosisKnoppen && icoonSoort === 'tablet';
          if (aantal > 1 || dk) {
            var at = dk ? getal(aantal * c.dosis.mg, 0) : aantal + '×';
            ctx.font = '800 13px ' + FONT;
            ctx.strokeText(at, ix + 17, yg + 1);
            ctx.fillStyle = '#fff';
            ctx.fillText(at, ix + 17, yg + 1);
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
    // De banen: links van de streep "te weinig" (blauw), het groene vlak, daarboven "te veel" (geel) en
    // giftig (rood). Zelfde kleuren als de lijn en de spiegelbalk bovenaan. Bij een vertelstap lichten ze op.
    var puls = R.licht === 'banen' ? 0.5 + 0.5 * Math.sin(nu / 240) : 0;
    var pad = function (pts, omgekeerd) {
      if (omgekeerd) for (var a = pts.length - 1; a >= 0; a--) ctx.lineTo(pts[a][0], pts[a][1]);
      else pts.forEach(function (p, j) { if (j) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
    };
    ctx.fillStyle = 'rgba(124,196,255,' + (0.075 + 0.13 * puls) + ')';
    ctx.beginPath(); ctx.moveTo(0, 0);
    links.forEach(function (p) { ctx.lineTo(p[0], p[1]); });
    ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(61,220,151,' + (0.13 + 0.13 * puls) + ')';
    ctx.beginPath(); pad(links); pad(rechts, true); ctx.closePath(); ctx.fill();
    var heeftHoog = rechts[0][0] < Rr - 0.5;
    if (heeftHoog) {
      var xt0 = c.toxisch != null ? xVan(c.toxisch) : w;
      ctx.fillStyle = 'rgba(255,225,77,0.07)';
      ctx.beginPath(); pad(rechts); ctx.lineTo(xt0, h); ctx.lineTo(xt0, 0); ctx.closePath(); ctx.fill();
    }
    // de grenzen: de streep (ondergrens) en, als die er is, de bovenkant van het groene vlak
    ctx.strokeStyle = 'rgba(86,235,170,0.95)'; ctx.lineWidth = 2.5 + 1.5 * puls;
    ctx.beginPath(); pad(links); ctx.stroke();
    if (heeftHoog) {
      ctx.strokeStyle = 'rgba(255,225,77,0.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); pad(rechts); ctx.stroke();
    }
    if (c.toxisch != null) {
      var xt = xVan(c.toxisch);
      ctx.fillStyle = 'rgba(255,80,80,0.12)';
      ctx.fillRect(xt, 0, w - xt, h);
      ctx.strokeStyle = 'rgba(255,90,90,0.85)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(xt, 0); ctx.lineTo(xt, h); ctx.stroke();
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
        gebeurtenisLabel(g.label || 'ibuprofen', Math.max(yk + 18, BOVENRAND + 4), g.icoon !== null);
      }
    });

    // waar deel 2 begint: een geblokte strook dwars over de baan (zoals een sectorgrens op een circuit)
    var yS = yVan(R.deel2);
    if (yS > BOVENRAND - 10 && yS < h + 10) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      for (var bx = 0, bi = 0; bx < w; bx += 6, bi++) ctx.fillRect(bx, yS + (bi % 2 ? 0 : -6), 6, 6);
      var geenOnthuld = !Object.keys(R.onthuld).length;
      if (geenOnthuld) { ctx.fillStyle = '#ffffff'; gebeurtenisLabel('deel 2', yS + 18, false); }
    }

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
    var waarde = getal(C, R.cfg.decWaarde) + ' ' + R.cfg.eenheid;
    var gevoel = R.gevoel || '';
    ctx.font = '800 13.5px ' + FONT;
    var wg = ctx.measureText(gevoel).width;
    ctx.font = '600 12.5px ' + FONT;
    var wv = ctx.measureText(waarde).width;
    var o = R.kant === 'links' ? 1 : -1;
    var va = o > 0 ? xD + KOP_R + 6 : xD - KOP_R - 6 - wv;
    if (!past(va, va + wv) || !vrij(va, va + wv)) va = o > 0 ? xD - KOP_R - 6 - wv : xD + KOP_R + 6;
    var vb = va + wv, vKant = va > xD ? 1 : -1;
    // het gevoelswoord: naast het gezicht (boven het getal) als dat past; anders boven het gezicht, in de
    // vrije ruimte naast de strook met poortlabels
    var ga = vKant > 0 ? va : vb - wg, gNaast = past(ga, ga + wg) && vrij(ga, ga + wg), gy = yN - 5;
    if (gNaast) { va = Math.min(va, ga); vb = Math.max(vb, ga + wg); }
    else {
      var lo = R.kant === 'links' ? zB + 6 : 3, hi = R.kant === 'links' ? w - 3 : zA - 6;
      ga = Math.max(lo, Math.min(hi - wg, xD - wg / 2));
      gy = yN - KOP_R - 20;
    }
    var wa = vKant > 0 ? va : vb - wv; // begin van het getal (aan de kant van het gezicht)

    // opnamedepot ("onderweg"): vertraging van slikken/zetpil zichtbaar
    var ref = c.routes.slik.dosis * c.routes.slik.F;
    var dep = R.race.sim.depot / ref;
    R.blob = null;
    if (dep > 0.03) {
      var rB = 5 + 13 * Math.sqrt(Math.min(1.6, dep));
      var hw = Math.max(rB, 29); // halve breedte, met het woord "onderweg" eronder
      // naast de stip (aan de kant zonder waardelabel, of voorbij het label); past dat niet: onder de stip
      var kand = [xD - vKant * (rB + KOP_R + 16), xD + vKant * Math.max(rB + KOP_R + 16, (vKant > 0 ? vb - xD : xD - va) + 6 + hw)];
      var xB = R.kant === 'links' ? Math.max(xD, zB + 8 + hw) : Math.min(xD, zA - 8 - hw), yB = yN + rB + KOP_R + 8;
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

    // de spiegel van nu: het gezicht van de patiënt, met een ring in de kleur van de toestand. Zo zie je in
    // één blik waar de spiegel staat en hoe de patiënt zich daarbij voelt.
    var kl = lijnKleur(C, tm, R.leverOver);
    // stippellijn van het gezicht naar de spiegelbalk bovenaan: de plek links-rechts IS de spiegel
    ctx.save();
    ctx.strokeStyle = kl; ctx.globalAlpha = R.licht === 'meter' ? 0.9 : 0.4; ctx.lineWidth = 1.5; ctx.setLineDash([2, 5]);
    ctx.beginPath(); ctx.moveTo(xD, BOVENRAND - 6); ctx.lineTo(xD, yN - KOP_R - 14); ctx.stroke();
    ctx.restore();
    var gr = ctx.createRadialGradient(xD, yN, KOP_R - 4, xD, yN, KOP_R + 16);
    gr.addColorStop(0, kl); gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.5; ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(xD, yN, KOP_R + 16, 0, 6.283); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(xD, yN, KOP_R, 0, 6.283); ctx.fill();
    ctx.strokeStyle = kl; ctx.lineWidth = 3; ctx.stroke();
    if (!tekenKop(ctx, wieVan(c), R.stemming || 'neutraal', xD, yN + 2)) {
      ctx.fillStyle = kl; ctx.beginPath(); ctx.arc(xD, yN, 6.5, 0, 6.283); ctx.fill();
    }
    if (R.licht === 'meter' || R.licht === 'patient') { // vertelstap: het gezicht licht op
      var pr = 0.5 + 0.5 * Math.sin(nu / 240);
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.9 - 0.6 * pr) + ')'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(xD, yN, KOP_R + 5 + 9 * pr, 0, 6.283); ctx.stroke();
    }
    if (C > R.cfg.Cmax) { // buiten beeld: pijltje
      ctx.fillStyle = kl;
      ctx.beginPath(); ctx.moveTo(xD + KOP_R + 4, yN - 6); ctx.lineTo(xD + KOP_R + 11, yN); ctx.lineTo(xD + KOP_R + 4, yN + 6); ctx.fill();
    }
    // bij het gezicht: hoe de patiënt zich voelt (kleur van de toestand) en daaronder de spiegel in getallen
    ctx.textBaseline = 'bottom'; ctx.textAlign = 'left';
    ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.lineJoin = 'round';
    ctx.font = '800 13.5px ' + FONT; ctx.fillStyle = kl;
    ctx.strokeText(gevoel, ga, gy);
    ctx.fillText(gevoel, ga, gy);
    ctx.font = '600 12.5px ' + FONT; ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.textBaseline = 'top';
    ctx.strokeText(waarde, wa, yN + 3);
    ctx.fillText(waarde, wa, yN + 3);

    // rand boven: as-labels; rand onder: vervagen naar de knoppen
    var gb = ctx.createLinearGradient(0, 0, 0, BOVENRAND);
    gb.addColorStop(0, 'rgba(0,0,0,1)'); gb.addColorStop(0.86, 'rgba(0,0,0,0.9)'); gb.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gb; ctx.fillRect(0, 0, w, BOVENRAND);
    var go = ctx.createLinearGradient(0, h - 50, 0, h);
    go.addColorStop(0, 'rgba(0,0,0,0)'); go.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = go; ctx.fillRect(0, h - 50, w, 50);

    ctx.lineJoin = 'round';
    function halo(tekst, x, y) {
      ctx.strokeStyle = '#000'; ctx.lineWidth = 5; ctx.strokeText(tekst, x, y); ctx.fillText(tekst, x, y);
    }
    // DE SPIEGELBALK: de horizontale as bovenaan is de spiegel in het bloed. Een gekleurde balk met dezelfde
    // stukken als de banen eronder (te weinig | het groene vlak | te veel | giftig) en een wijzer die met het
    // gezicht meeschuift. Grenzen uit M.venster(casus, t) (schuiven mee) en casus.toxisch.
    var v0 = M.venster(c, tm);
    var zl = xVan(v0.laag), zr = v0.hoog === Infinity ? Rr : xVan(v0.hoog);
    var dec = R.cfg.dec;
    var fmt = function (x) { return x === 0 || x === R.cfg.Cmax ? getalKort(x, 1) : getal(x, x % 1 && !dec ? 1 : dec); };
    var stukken = [{ a: L, b: zl, k: LIJNKLEUR.onder, label: 'te weinig' },
      { a: zl, b: zr, k: LIJNKLEUR.zone, label: c.zone.label || R.cfg.zoneLabel[0] }];
    if (v0.hoog !== Infinity) stukken.push({ a: zr, b: c.toxisch != null ? xVan(c.toxisch) : Rr, k: LIJNKLEUR.boven, label: 'te veel' });
    if (c.toxisch != null) stukken.push({ a: xVan(c.toxisch), b: Rr, k: LIJNKLEUR.tox, label: R.cfg.toxLabel });
    var mp = R.licht === 'meter' ? 0.5 + 0.5 * Math.sin(nu / 240) : 0;
    ctx.font = '800 10.5px ' + FONT; ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.textAlign = 'left';
    halo('SPIEGEL IN HET BLOED', L, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.72)'; ctx.textAlign = 'right';
    halo(R.cfg.eenheid, Rr, 2);
    var by = 17, bh = 9;
    stukken.forEach(function (sk, si) {
      ctx.fillStyle = sk.k; ctx.globalAlpha = 0.85;
      ctx.fillRect(sk.a + (si ? 1.5 : 0), by, sk.b - sk.a - (si ? 1.5 : 0), bh);
    });
    ctx.globalAlpha = 1;
    if (mp) { ctx.strokeStyle = 'rgba(255,255,255,' + (0.9 - 0.5 * mp) + ')'; ctx.lineWidth = 2; ctx.strokeRect(L - 5 - 3 * mp, by - 5 - 3 * mp, Rr - L + 10 + 6 * mp, bh + 10 + 6 * mp); }
    // de wijzer: zelfde plek links-rechts als het gezicht
    var xw = Math.max(L, Math.min(Rr, xD));
    ctx.fillStyle = '#000'; ctx.fillRect(xw - 4, by - 4, 8, bh + 8);
    ctx.fillStyle = '#fff'; ctx.fillRect(xw - 2, by - 4, 4, bh + 8);
    // getallen onder de balk; bij de ondergrens staat het woord "streep" (zo heet die grens in het spel)
    var vast = [{ C: v0.laag, streep: true }];
    if (v0.hoog !== Infinity) vast.push({ C: v0.hoog });
    var ticks = vast.slice();
    [0].concat(R.cfg.as, c.toxisch != null ? [c.toxisch] : []).forEach(function (x) {
      if (vast.every(function (tk) { return Math.abs(xVan(tk.C) - xVan(x)) > 26; })) ticks.push({ C: x });
    });
    if (vast.every(function (tk) { return xVan(tk.C) < Rr - 40; })) ticks.push({ C: R.cfg.Cmax, rechts: true });
    ctx.font = '600 12px ' + FONT; ctx.textBaseline = 'top';
    ticks.forEach(function (tk) {
      var xt = xVan(tk.C), tekst = fmt(tk.C);
      ctx.fillStyle = tk.streep ? 'rgba(126,240,196,1)' : 'rgba(255,255,255,0.72)';
      if (tk.streep) {
        ctx.textAlign = 'right';
        halo('streep ' + tekst, xt + ctx.measureText(tekst).width / 2, 31);
      } else {
        ctx.textAlign = tk.C === 0 ? 'left' : (tk.rechts ? 'right' : 'center');
        halo(tekst, tk.C === 0 ? xt - 2 : xt, 31);
      }
    });
    // wat elk stuk betekent
    ctx.font = '800 11.5px ' + FONT; ctx.textAlign = 'center';
    // labels mogen niet over elkaar: past het niet, dan een kort woord; past dat ook niet, dan geen label
    var KORT = { 'te weinig': 'laag', 'in de zone': 'zone', 'te veel': 'hoog' }, rechtsVorig = -Infinity;
    stukken.forEach(function (sk) {
      var m = (sk.a + sk.b) / 2, lb = sk.label;
      var past = function (t) { var bw = ctx.measureText(t).width; return m - bw / 2 >= rechtsVorig + 6 && bw <= sk.b - sk.a + 10; };
      if (!past(lb)) lb = KORT[lb] || lb;
      if (!past(lb)) return;
      ctx.fillStyle = sk.k;
      halo(lb, m, 47);
      rechtsVorig = m + ctx.measureText(lb).width / 2;
    });

    // (de tijd loopt naar beneden: dat laat de tijdstrook links in het speelveld zien, met de klok erboven)
  }

  // ---------- spelklok ----------
  function lus(ts) {
    if (!R || R.klaar) return;
    R.rafId = root.requestAnimationFrame(lus);
    if (doc.hidden || staat.pauze) { R.laatsteTs = null; return; }
    if (R.laatsteTs == null) R.laatsteTs = ts;
    var dtEcht = Math.min(0.25, Math.max(0, (ts - R.laatsteTs) / 1000));
    R.laatsteTs = ts;
    var G = R.gids;
    if (!(G && G.bevroren) && !R.wacht) R.klok += dtEcht * SPEED / R.cfg.secPerUur;
    var c = R.casus, race = R.race, duur = G ? G.eind : c.raceDuur;
    // oefenronde: de klok stopt precies op het moment van de volgende stap
    if (G && !G.actief && G.i < G.stappen.length && R.klok >= G.stappen[G.i].op) {
      if (isFinite(G.stappen[G.i].op)) R.klok = G.stappen[G.i].op;
      gidsStap();
    }
    if (G) gidsControle();
    if (R.klok > duur) R.klok = duur;

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
    if (!G) controleerGebeurtenissen();
    werkKopBij();
    werkPatientBij();
    teken(performance.now());

    if (R.klok >= duur && (G || race.klaar)) eindeRace();
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
        if (res.teSnel < 0) {
          speel('bonk');
          var qs2 = $('qaly-straf');
          qs2.textContent = getal(res.teSnel, 0) + ' te snel';
          qs2.classList.remove('zicht'); void qs2.offsetWidth; qs2.classList.add('zicht');
          R.psFlits = { tot: performance.now() + 2200 / Math.min(SPEED, 4),
            tekst: 'Te snel opgehoogd: ' + getal(res.teSnel, 0) + ' punten' }; // de grens staat in het eindverslag
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
      // geen keuze gemaakt (ook geen Overslaan): dat kost punten. Overslaan is ook een keuze.
      var straf = race.geenKeuze(g);
      uit.soort = 'geen';
      speel('bonk');
      var qs = $('qaly-straf');
      qs.textContent = getal(straf, 0) + ' geen keuze';
      qs.classList.remove('zicht'); void qs.offsetWidth; qs.classList.add('zicht');
      R.psFlits = { tot: performance.now() + 1300 / Math.min(SPEED, 4), tekst: 'Geen keuze voor ' + inZin(tijdLabel(c, T, true)) + ': ' + getal(straf, 0) + ' punten' };
      if (R.gids && R.gids.geenKeuze) melding(R.gids.geenKeuze, { soort: 'au' }); // oefenronde: zeg waarom
    }
    R.gegeven[g] = uit;
    R.laatstePoort = { echt: performance.now(), label: tijdLabel(c, T, true), index: g };
    var ki = $('keuze-info'); if (ki) ki.classList.remove('zicht'); // die keuze is nu voorbij
    R.keuze = { route: null, aantal: 0, poging: false };
    werkKnoppenBij();
    var G = R.gids;
    if (G && G.i < G.stappen.length && G.stappen[G.i].poortje === g) {
      melding(G.stappen[G.i].daarna, {});
      G.i++;
      G.actief = false;
      gidsControle();
    }
  }

  // Het portretje in de racekop reageert op hoe het met de patiënt gaat.
  function werkPatientBij() {
    var c = R.casus, st;
    var z = R.klok < 0 && c.start && c.start.type === 'steadyState' ? 'zone' : zoneVan(R.race.sim.C, Math.max(0, R.race.t));
    // In één of twee woorden hoe de patiënt zich nu voelt, bij deze spiegel (woorden uit het casusblad).
    var gv, gw = GEVOEL[c.id];
    if (gw) {
      var rij = R.toxisch ? gw.tox : gw[z], bw = c.bijwerkingen;
      // bijwerkingen (carbamazepine): licht vanaf 10 mg/L (eerste dagen al boven de bovenkant van het venster, 8),
      // ernstiger boven 12. Alleen de woorden; de punten volgen het venster.
      if (bw && gw.licht && !R.toxisch && R.klok >= 0) {
        var Cn = R.race.sim.C, vh = M.venster(c, Math.max(0, R.race.t)).hoog;
        if (Cn > bw.ernstig) rij = gw.boven;
        else if (Cn >= Math.min(bw.licht, vh)) rij = gw.licht;
      }
      gv = rij[0]; st = rij[1];
    }
    else {
      st = (R.leverOver || (!R.gids && R.klok >= 0 && M.geblokkeerd(c, 'slik', R.klok))) ? 'misselijk' : (z === 'onder' ? 'pijn' : 'blij');
      gv = R.leverOver ? 'lever in gevaar' : ((st === 'misselijk' ? 'misselijk, ' : '') + (z === 'onder' ? 'pijn' : 'pijn weg'));
    }
    R.gevoel = gv;
    if (st === R.stemming) return;
    R.stemming = st;
    $('patient-kop').innerHTML = figuur({ wie: wieVan(c), stemming: st, kop: true });
  }

  // Het volgende poortje is nu het doel: misschien is er een plotwending.
  function bijNieuwDoel() {
    var c = R.casus;
    if (R.gids || R.g >= R.poorten.length) return;
    var T = R.poorten[R.g];
    c.gebeurtenissen.forEach(function (g, gi) {
      if (R.onthuld[gi] || g.type !== 'blokkade') return;
      if (T >= g.van - 1e-9 && T < g.tot - 1e-9) {
        R.onthuld[gi] = true;
        $('deel-2-tekst').removeAttribute('data-vol'); $('deel-2-tekst').textContent = 'Deel 2 · misselijk'; pasStrookTekst();
        speel('wending');
        startWacht(g.tekst + ' Slikken lukt nu niet: kies een zetpil, de spuit of Overslaan.', figuur({ wie: 'opa', stemming: 'misselijk' }));
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
        var lbl = g.label || 'ibuprofen', metDoosje = g.icoon !== null;
        $('deel-2-tekst').removeAttribute('data-vol'); $('deel-2-tekst').textContent = 'Deel 2 · ' + lbl; pasStrookTekst();
        speel('wending');
        startWacht(g.tekst, figuur({ wie: wieVan(c), prop: metDoosje ? 'doosje' : undefined, stemming: 'neutraal' }));
        if (!$('chips').children.length) $('chips').appendChild(el('span', { class: 'chip', html: (metDoosje ? icoon('doosje').replace('<svg', '<svg width="16" height="16"') : '') + lbl }));
      }
    });
  }

  // Plotwending: de klok staat stil tot de speler verder tikt (knop "Verder" of tik op het speelveld). Zo mist
  // niemand de verandering, ook niet wie even wegkeek.
  function startWacht(tekst, fig) {
    R.wacht = false; // eerst de melding zelf mogen tonen
    melding(tekst, { soort: 'wending', prio: 3, fig: fig, wacht: true });
    R.wacht = true;
    R.wachtVanaf = performance.now();
    $('tijdstrook').classList.add('in2');
  }
  function wachtVerder() {
    if (!R || !R.wacht) return;
    if (performance.now() - R.wachtVanaf < 700 / Math.min(SPEED, 4)) return; // niet per ongeluk wegtikken
    R.wacht = false;
    speel('tik');
    var m = $('melding');
    m.classList.remove('zicht');
    R.melding = { prio: -1, tot: 0 };
    if (R.meldVlak) R.meldVlak.tot = performance.now() + MELD_FADE + 60;
  }

  // Een concentratie-tijdcurve zoals in een boek (tijd naar rechts, spiegel omhoog) die een kwartslag draait:
  // dan loopt de tijd naar beneden en de spiegel naar rechts, zoals op het racescherm.
  function draaiSvg() {
    return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Concentratie-tijdcurve die een kwartslag draait">' +
      '<g class="kw-draai">' +
      '<path d="M18 82 H90 M18 82 V12" stroke="#ffffff" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
      '<path d="M86 78 L91 82 L86 86 M14 16 L18 11 L22 16" stroke="#ffffff" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<rect x="18" y="40" width="72" height="42" fill="rgba(61,220,151,0.18)"/>' +
      '<path d="M18 82 C26 30 34 24 42 32 C54 46 66 60 90 70" stroke="#7ef0c4" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
      '<text class="kw-lbl" x="88" y="96" text-anchor="end" font-size="11" font-weight="700" fill="#d0d0d8">tijd</text>' +
      '<text class="kw-lbl" x="4" y="10" font-size="11" font-weight="700" fill="#d0d0d8">spiegel</text>' +
      '</g></svg>';
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
    // deel 1 / deel 2: waar ben je in de race
    var eind = R.gids ? R.gids.eind : c.raceDuur, kk = Math.max(0, R.klok);
    var f1 = Math.round(100 * Math.min(1, kk / R.deel2)), f2 = Math.round(100 * Math.max(0, Math.min(1, (kk - R.deel2) / (eind - R.deel2))));
    var ds = f1 + '|' + f2;
    if (ds !== R.deelStand) {
      R.deelStand = ds;
      $('deel-1').firstChild.style.height = f1 + '%';
      $('deel-2').firstChild.style.height = f2 + '%';
      $('tijdstrook').classList.toggle('in2', kk >= R.deel2 - 1e-9);
    }
    werkPoortStatusBij();
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
      if (st.dagteller > R.dagteller && R.dagteller >= 0) { var lt = $('lever'); lt.classList.remove('tel'); void lt.offsetWidth; lt.classList.add('tel'); }
      R.dagteller = st.dagteller;
      var max = c.bovengrens.maxPer24u;
      $('lever-tekst').textContent = getalKort(st.dagteller / 1000, 1) + ' g van max. ' + getalKort(max / 1000, 1) + ' g';
      var vol = st.dagteller > max;
      R.leverOver = vol;
      $('lever-vul').style.width = (vol ? 100 : 100 * st.dagteller / (max * 1.25)) + '%';
      $('lever').classList.toggle('vol', vol);
    }
  }

  // De regel boven de knoppen: wat staat er klaar voor het volgende poortje, en een balk die volloopt tot het
  // poortje er is. Nog niets gekozen en het poortje is dichtbij: rood ("Kies nu").
  function werkPoortStatusBij() {
    var c = R.casus, ps = $('poort-status'), tekst, klasse = 'poort-status', vul = 0, nu = performance.now();
    if (R.psFlits && nu < R.psFlits.tot) { tekst = R.psFlits.tekst; klasse += ' dringend'; vul = 100; }
    else if (R.g >= R.poorten.length) tekst = 'Geen poortjes meer in deze race.';
    else {
      var T = R.poorten[R.g], vorig = R.g > 0 ? R.poorten[R.g - 1] : Math.min(0, R.klok) - c.poortjes.interval;
      if (R.g === 0) vorig = -AANLOOP_S / R.cfg.secPerUur;
      vul = Math.round(100 * Math.max(0, Math.min(1, (R.klok - vorig) / (T - vorig))));
      var lbl = inZin(tijdLabel(c, T, true)), k = R.keuze;
      if (k.route) tekst = icoon(k.route === 'slik' ? 'tablet' : k.route) + keuzeNaam(c, k) + ' staat klaar voor ' + lbl;
      else {
        tekst = (vul >= 60 ? 'Kies nu voor ' : 'Volgend poortje: ') + lbl + (vul >= 60 ? '!' : '');
        klasse += vul >= 60 ? ' dringend' : ' leeg';
      }
    }
    if (R.licht === 'knoppen') klasse += ' licht'; // vertelstap in de oefenronde
    var stand = klasse + '|' + tekst;
    if (stand !== R.psStand) { R.psStand = stand; ps.className = klasse; $('ps-tekst').innerHTML = tekst; }
    $('ps-vul').style.width = vul + '%';
  }

  function eindeRace() {
    R.klaar = true;
    R.duurEcht = (performance.now() - R.startEcht) / 1000;
    root.cancelAnimationFrame(R.rafId);
    var st = R.race.stand();
    teken(performance.now());
    if (R.gids) {
      R.gids.duur = (performance.now() - R.gids.t0) / 1000;
      staat.tutorialDuur = R.gids.duur;
    } else {
      staat.verslagen[R.i] = R.race.verslag();
      staat.curves[R.i] = R.dun.slice();
      staat.duren = staat.duren || [];
      staat.duren[R.i] = R.duurEcht;
      bewaarVoortgang();
    }
    speel('klaar');
    $('melding').classList.remove('zicht');
    $('finish-getal').textContent = getal(st.totaal, 0);
    $('finish-schema').innerHTML = schemaHtml();
    zetLicht(null);
    $('finish').hidden = false;
    $('finish').scrollTop = 0;
  }

  // Het doseerschema op het kaartje na de race: wanneer gaf je wat. Van boven naar beneden, zoals de tijd in de
  // race: paracetamol één dag in uren, lithium één rij per dag met de poortjes van die dag. Daaronder: gemiddeld
  // per dag naast de grens (uit hetzelfde verslag als het eindscherm).
  function schemaHtml() {
    var c = R.casus, v = R.race.verslag(), eind = R.gids ? R.gids.eind : c.raceDuur;
    var rijen = v.tijdlijn.filter(function (r) { return r.t < eind - 1e-9; });
    var klaring = null;
    if (!R.gids) c.gebeurtenissen.forEach(function (g) { if (g.type === 'klaring' && !klaring) klaring = g; }); // de eerste
    function inhoud(j, kort) {
      if (j.soorten.length) return j.soorten.map(function (so) {
        if (c.poortjes.dosisKnoppen) return '<b class="mg">' + getal(so.aantal * c.dosis.mg, 0) + '</b>';
        return icoon(so.soort) + (so.aantal > 1 ? '<b>' + so.aantal + '×</b>' : '') + (kort ? '' : ' ' + (KEUZENAAM[so.soort === 'tablet' ? 'slik' : so.soort] || so.soort));
      }).join(' ');
      if (j.soort === 'geblokkeerd') return icoon('kruis') + (kort ? '' : ' slikken lukte niet');
      if (j.geenKeuze) return icoon('kruis') + (kort ? '' : ' geen keuze');
      return kort ? '<i></i>' : '';
    }
    var s = '<p class="schema-kop">Jouw doseerschema: wanneer gaf je wat</p>';
    if (perDagCasus(c)) {
      var perDag = Math.round(24 / c.poortjes.interval), dagen = Math.ceil(rijen.length / perDag);
      var metSom = perDag > 1; // één poortje per dag (lithium): de som is hetzelfde getal, dus geen extra kolom
      s += '<div class="schema tl-dag' + (dagen > 12 ? ' veel' : '') + (metSom ? '' : ' zonder-som') + '" style="--k:' + perDag + '"><span class="sk dag"></span>';
      for (var u = 0; u < perDag; u++) s += '<span class="sk">' + rijen[u].t + ' u</span>';
      if (metSom) s += '<span class="sk som">' + (c.poortjes.dosisKnoppen ? 'mg/dag' : 'per dag') + '</span>';
      for (var d = 0; d < dagen; d++) {
        var ibu = klaring && d * 24 >= klaring.t - 1e-9;
        s += '<span class="sk dag' + (ibu ? ' ibu' : '') + '">Dag ' + d + '</span>';
        var som = 0;
        for (var q = 0; q < perDag; q++) {
          var r = rijen[d * perDag + q], j = r.jij;
          j.toedieningen.forEach(function (x) { som += x.aantal; });
          s += '<span class="sc' + (j.soorten.length ? ' gaf' : '') + (j.geenKeuze && !j.soorten.length ? ' geen' : '') + (ibu ? ' ibu' : '') +
            '" aria-label="Dag ' + d + ', ' + r.t % 24 + ' uur: ' + j.tekst + '">' + inhoud(j, true) + '</span>';
        }
        if (metSom) s += '<span class="sk som">' + (c.poortjes.dosisKnoppen ? getal(som * c.dosis.mg, 0) : som + '×') + '</span>';
      }
      s += '</div>';
    } else {
      var blok = null;
      if (!R.gids) c.gebeurtenissen.forEach(function (g) { if (g.type === 'blokkade') blok = g; });
      s += '<ul class="schema tl-uur">' + rijen.map(function (r) {
        var j = r.jij, m = blok && r.t >= blok.van - 1e-9 && r.t < blok.tot - 1e-9;
        var gaf = j.soorten.length || j.soort === 'geblokkeerd' || j.geenKeuze;
        return '<li class="tl-rij' + (gaf ? ' gaf' : '') + (j.geenKeuze && !j.soorten.length ? ' geen' : '') + (m ? ' m' : '') +
          '" aria-label="Uur ' + r.t + ': ' + j.tekst + '"><span class="tl-t">' + (gaf || r.t % 3 === 0 ? 'uur ' + r.t : '') +
          '</span><span class="tl-as"></span><span class="tl-ic">' + inhoud(j, false) + '</span></li>';
      }).join('') + '</ul>';
    }
    var leg = [];
    if (!R.gids && c.gebeurtenissen.some(function (g) { return g.type === 'blokkade'; })) leg.push('<span class="sl m"></span>misselijk');
    if (klaring) leg.push('<span class="sl ibu"></span>' + (klaring.label || 'ibuprofen'));
    var t = v.telling, pd = t.perDag, regels = [];
    if (R.gids) { // oefenronde: 16 uur, dus geen "per dag"
      regels.push('<b>' + t.toedienmomenten + ' keer iets gegeven</b>, samen ' + t.totaleDosis.tekst + ' (' + pd.grens + ')');
    } else if (perDagCasus(c)) {
      regels.push('Gemiddeld <b>' + pd.tekst + '</b>');
      regels.push(pd.grens.charAt(0).toUpperCase() + pd.grens.slice(1));
    } else {
      var over = t.dagteller && t.dagteller.over;
      regels.push('<b' + (over ? ' class="over"' : '') + '>' + pd.tekst + '</b> · ' + pd.grens + (over ? ': <span class="over">lever in gevaar</span>' : ''));
    }
    if (t.geenKeuze) regels.push('<span class="over">' + t.geenKeuze + '× geen keuze gemaakt</span>');
    if (leg.length) regels.push(leg.join(' · '));
    s += '<p class="schema-tel">' + regels.join('<br>') + '</p>';
    return s;
  }

  function naRace() {
    if (!R || !R.klaar) return;
    var i = R.i;
    if (R.gids) toonIntro(0);
    else if (i === 0) toonIntro(1);
    else toonEinde(); // na race 2 én na de bonusrace
  }

  // ------------------------------------------------------------------------------------------
  // 5. Einde (module)
  // ------------------------------------------------------------------------------------------
  function toonEinde() {
    var c = $('scherm-einde');
    c.innerHTML = '';
    naarScherm('einde');
    var races = staat.verslagen.slice(0, 3);
    var data = {
      naam: staat.naam,
      races: races,
      // totaal = race 1 + race 2 (de bonusrace telt niet mee: zelfde lat voor iedereen op het scorebord)
      totaal: races.slice(0, 2).reduce(function (s, v) { return s + (v ? v.opbouw.totaal : 0); }, 0),
      curves: staat.curves.slice(0, 3),
      casussen: RACES.map(function (id) { return M.casus(id); }),
      bonus: function () { toonIntro(2); }
    };
    if (!SoS.einde || typeof SoS.einde.toon !== 'function') return;
    var h = SoS.einde.toon(c, data, opnieuw);
    if (h && typeof h.stop === 'function') staat.moduleStop = h.stop;
  }

  // ------------------------------------------------------------------------------------------
  // Hoofdmenu (knop linksboven op elk scherm behalve start): rondgaan in het spel. Tijdens een race staat de
  // klok stil zolang het menu open is. Een race die je via het menu verlaat, telt niet mee.
  // ------------------------------------------------------------------------------------------
  function stopRace() {
    if (!R) return;
    if (!R.klaar) { R.klaar = true; root.cancelAnimationFrame(R.rafId); }
    $('melding').classList.remove('zicht');
    $('finish').hidden = true;
  }
  var menuSinds = 0;
  function openMenu() {
    unlock();
    speel('tik');
    if (!$('menu').hidden) return;
    staat.pauze = true;
    menuSinds = performance.now();
    var lijst = $('menu-lijst');
    lijst.innerHTML = '';
    var bezig = R && !R.klaar && /^(race|tutorial)/.test(staat.fase);
    function knop(tekst, actie, fn, hoofd, huidig) {
      lijst.appendChild(el('button', { type: 'button', class: hoofd ? 'knop-paars' : 'knop-lijn', 'data-menu': actie,
        'aria-current': huidig ? 'true' : null, text: tekst, onclick: function () { sluitMenu(); fn(); } }));
    }
    knop(bezig ? 'Verder spelen' : 'Terug', 'verder', function () {}, true);
    knop('Oefenronde', 'oefenronde', function () { stopRace(); startRace(0, SoS.tutorial); }, false, staat.fase === 'tutorial');
    RACES.forEach(function (id, i) {
      knop(raceNaam(i) + ' · ' + M.casus(id).naam, 'race-' + (i + 1), function () { stopRace(); toonIntro(i); },
        false, staat.fase === 'race' + (i + 1) || staat.fase === 'intro' + (i + 1));
    });
    if (staat.verslagen.some(Boolean)) knop('Eindverslag', 'einde', function () { stopRace(); toonEinde(); }, false, staat.fase === 'einde');
    knop('Naar het begin', 'begin', function () { stopRace(); naarScherm('start'); });
    if (bezig) lijst.appendChild(el('small', { text: 'De klok staat stil. Kies je iets anders, dan telt deze race niet mee.' }));
    $('menu').hidden = false;
    var eerste = lijst.querySelector('button');
    if (eerste) eerste.focus({ preventScroll: true });
  }
  function sluitMenu() {
    if ($('menu').hidden) return;
    $('menu').hidden = true;
    staat.pauze = false;
    var weg = performance.now() - menuSinds;
    if (R && !R.klaar) {
      R.laatsteTs = null;
      if (R.gids) { R.gids.beatVan += weg; R.gids.beatTot += weg; R.gids.wijsVanaf += weg; } // vertelstap loopt verder waar hij was
      if (R.psFlits) R.psFlits.tot += weg;
    }
    $('menu-knop').focus({ preventScroll: true });
  }

  function opnieuw() {
    if (staat.fase !== 'einde') return;
    staat.verslagen = []; staat.curves = []; staat.duren = [];
    wisVoortgang();
    startRace(0);
  }

  // ------------------------------------------------------------------------------------------
  // Debug (alleen-lezen) en init
  // ------------------------------------------------------------------------------------------
  Object.defineProperty(SoS, 'debug', {
    enumerable: true, configurable: false,
    get: function () {
      var r = R && (/^race[123]$/.test(staat.fase) || staat.fase === 'tutorial') ? R : null;
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
        duren: (staat.duren || []).slice(),
        gids: r && r.gids ? { stap: Math.min(r.gids.i + 1, r.gids.stappen.length), bevroren: r.gids.bevroren,
          wijs: r.gids.bevroren && r.gids.i < r.gids.stappen.length ? r.gids.stappen[r.gids.i].knop : null, zin: $('melding').getAttribute('data-zin') } : null,
        tutorialDuur: staat.tutorialDuur || null,
        wacht: r ? !!r.wacht : false,
        menu: !$('menu').hidden
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
    zetSterren();
    initStart();
    initDemp();
    doc.addEventListener('pointerdown', unlock, true);
    doc.querySelector('[data-actie="start-race"]').addEventListener('click', function () {
      unlock();
      if (!/^intro[123]$/.test(staat.fase)) return;
      speel('tik');
      startRace(staat.introIndex);
    });
    doc.querySelector('#finish [data-actie="verder"]').addEventListener('click', function () {
      unlock();
      speel('tik');
      naRace();
    });
    $('podium').addEventListener('pointerdown', tikPodium);
    $('menu-knop').addEventListener('click', openMenu);
    doc.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') sluitMenu(); });
    root.addEventListener('resize', function () { if (R && !R.klaar) meetDoek(); else if (R) { meetDoek(); teken(performance.now()); } });
    naarScherm('start');
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
