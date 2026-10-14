/*
 * Slikken of Stikken — src/tutorial.js  (stap 2 van de flow: tutorial met paracetamol en opa Jan)
 *
 * INTERFACE (houd deze vast; app.js roept alleen dit aan)
 * ----------------------------------------------------------
 *   SoS.tutorial.start(container, gereed, opties) -> {stop()}
 *     container  <section id="scherm-tutorial" class="scherm wit">: leeg, al zichtbaar, EoT-stijl (wit).
 *                De module vult hem helemaal zelf.
 *     gereed()   Wordt precies één keer aangeroepen als de speler klaar is ("Klaar? Race!", of "Overslaan").
 *                De laatste knop heeft data-actie="verder".
 *     opties     {naam, speed}: speelnaam en de testhaak ?speed=N (versnelt de klok en de pauzes hier).
 *     stop()     Ruimt rAF/timers/listeners op; haalt data-actie="verder" weg zodat de verborgen tutorial
 *                niet botst met de "verder"-knop na de races, en leegt de container na de overgang.
 *
 * VERLOOP (§3 Flow stap 2; één begrip per stap, de speler doet het zelf):
 *   1 Tablet  → curve (echt model) stijgt pas na even; pilletje in opa's maag slinkt met het depot.
 *   2 "2,5 uur" (klok) → spiegel halveert per 2,5 uur, als staafjes met ½ (gemeten op t = 5; 7,5; 10 u).
 *   3 Spuit   → sprong naar 1000/63 mg/L op t = 0, daarna ½ per 2,5 uur; tabletcurve als grijze schaduw.
 *   4 Tablet  → na het echte schema (0, 6, 12, 18 u = 4 g) duwt een 5e gram (20 u) de dagteller over 4 g:
 *               levermeter vol, levertje zorgelijk. Alleen in de tutorial; raakt de race niet.
 *   5 Zetpil ×2 → M.zetpil(3) en M.zetpil(4) uit de vaste reeks: de ene haalt de zone, de andere niet.
 *   6 "Klaar? Race!" (data-actie="verder") → gereed().
 *   Alle curves komen uit SoS.model.maakSim (exacte stappen); tijd loopt versneld (uren per seconde).
 *
 * TESTHAKEN (alleen-lezen): .tut-binnen[data-stap="1".."6"][data-fase="wacht"|"loopt"|"klaar"].
 *   Knoppen: data-tut="slik"|"klok"|"spuit"|"zetpil"|"volgende"|"overslaan"; laatste: data-actie="verder".
 *   (Bewust geen data-actie="slik" enz.: die zijn voor de raceknoppen.)
 */
(function (root) {
  'use strict';
  if (!root) return;
  var SoS = root.SoS = root.SoS || {};

  var INKT = '#1b1b1f';
  var KLOK_ICOON = '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<circle cx="20" cy="22" r="13" fill="none" stroke="#fff" stroke-width="3"/>' +
    '<path d="M20 13.5V22l6 4" stroke="#ffd166" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
    '<path d="M15.5 5.5h9" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>';

  function lever(stemming) {
    var ziek = stemming === 'ziek';
    var L = 'stroke="' + INKT + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"';
    var s = '<svg viewBox="0 0 90 70" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Lever">';
    s += '<path d="M8 30 C6 14 24 7 46 7 C68 7 84 11 84 21 C84 39 62 62 38 62 C20 62 9 46 8 30 Z" fill="' +
      (ziek ? '#d8bd9a' : '#e0896b') + '" stroke="' + INKT + '" stroke-width="3.5" stroke-linejoin="round"/>';
    s += '<path d="M47 9 C44 22 46 34 52 44" stroke="' + INKT + '" stroke-opacity=".35" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
    if (ziek) {
      s += '<path d="M24 25 l7 3 M44 25 l-7 3" ' + L + '/>';
      s += '<circle cx="28" cy="33" r="2.6" fill="' + INKT + '"/><circle cx="40" cy="33" r="2.6" fill="' + INKT + '"/>';
      s += '<path d="M26 45 q3 -3 6 0 t6 0" ' + L + '/>';
      s += '<path d="M60 20 q4 6 0 9 q-4 -3 0 -9 z" fill="#7cc4ff" stroke="' + INKT + '" stroke-width="1.5"/>';
    } else {
      s += '<circle cx="28" cy="32" r="2.6" fill="' + INKT + '"/><circle cx="40" cy="32" r="2.6" fill="' + INKT + '"/>';
      s += '<path d="M27 40 q7 6 14 0" ' + L + '/>';
    }
    return s + '</svg>';
  }

  function start(container, gereed, opties) {
    opties = opties || {};
    var ui = SoS.ui, M = SoS.model;
    var C = M.casus('paracetamol');
    var SPEED = (opties.speed > 0 && isFinite(opties.speed)) ? opties.speed : 1;
    var ZONE = M.venster(C, 0).laag;                 // 5 mg/L
    var MAX = C.bovengrens.maxPer24u;                // 4000 mg per 24 uur
    var THALF = C.Thalf;                             // 2,5 uur
    var Z_GOED = 3, Z_SLECHT = 4;                    // indexen in M.ZETPIL_REEKS (F 0,9/ka 1,0 en F 0,3/ka 0,3)

    var gestopt = false, klaarGemeld = false, raf = 0;
    var stap = 0, fase = 'wacht';
    var curves = [], staven = [], grafiek = null, actief = null;
    var stemming = 'pijn', leverZiek = false, laatsteDag = -1;

    // ------------------------------------------------------------------ DOM
    var el = ui.el;
    var binnen = el('div', { class: 'tut-binnen', 'data-stap': '1', 'data-fase': 'wacht' });
    var top = el('div', { class: 'tut-top' });
    var over = el('button', { type: 'button', class: 'tut-over', 'data-tut': 'overslaan', text: 'Overslaan' });
    var stippen = el('div', { class: 'tut-stippen', 'aria-hidden': 'true' });
    for (var i = 0; i < 6; i++) stippen.appendChild(el('span'));
    top.appendChild(over); top.appendChild(stippen);

    var podium = el('div', { class: 'tut-podium' });
    var opaWrap = el('div', { class: 'tut-opa' });
    var opaFig = el('div', { class: 'fig', 'data-fig': 'opa' });
    var maag = el('div', { class: 'tut-maag', html: ui.icoon('tablet'), 'aria-hidden': 'true' });
    var ballon = el('div', { class: 'tut-ballon', 'aria-hidden': 'true' });
    var naamje = el('div', { class: 'tut-naamje', text: 'opa Jan' });
    opaWrap.appendChild(ballon); opaWrap.appendChild(opaFig); opaWrap.appendChild(maag); opaWrap.appendChild(naamje);
    var leverWrap = el('div', { class: 'tut-lever', hidden: true });
    var leverFig = el('div', { class: 'fig', html: lever('blij') });
    var leverMeter = el('div', { class: 'tut-meter', 'aria-hidden': 'true', html: '<span class="tut-meter-vul"></span><span class="tut-meter-max"></span>' });
    var leverTekst = el('div', { class: 'tut-meter-tekst', 'aria-live': 'polite' });
    leverWrap.appendChild(leverFig); leverWrap.appendChild(leverMeter); leverWrap.appendChild(leverTekst);
    podium.appendChild(opaWrap); podium.appendChild(leverWrap);

    var tekst = el('p', { class: 'tut-tekst', 'aria-live': 'polite' });
    var graf = el('div', { class: 'tut-grafiek', role: 'img', 'aria-label': 'Spiegel van paracetamol in de tijd' });
    var bediening = el('div', { class: 'tut-bediening' });
    var acties = el('div', { class: 'tut-acties' });
    var volgende = el('button', { type: 'button', class: 'knop-wit tut-volgende', 'data-tut': 'volgende', html: 'Verder <span aria-hidden="true">→</span>' });
    bediening.appendChild(acties); bediening.appendChild(volgende);

    [top, podium, tekst, graf, bediening].forEach(function (n) { binnen.appendChild(n); });
    container.innerHTML = '';
    container.appendChild(binnen);

    // ------------------------------------------------------------------ hulpjes
    function kort(x) { var s = ui.getal(x, 1); return s.replace(/,0$/, ''); }
    function zetFase(f) { fase = f; binnen.setAttribute('data-fase', f); }

    // Eén tik telt één keer: pointerdown (snel, zoals in de race) én click (toetsenbord).
    function bijTik(knop, fn) {
      var viaPointer = 0;
      knop.addEventListener('pointerdown', function (ev) {
        if (ev.button != null && ev.button > 0) return;
        viaPointer = Date.now();
        fn(ev);
      });
      knop.addEventListener('click', function (ev) {
        if (Date.now() - viaPointer < 1000) return;
        fn(ev);
      });
    }
    function flits(n, klasse) { n.classList.remove(klasse); void n.offsetWidth; n.classList.add(klasse); }

    function zetStemming(st, metBallon) {
      if (st === stemming && opaFig.innerHTML) return;
      var oud = stemming;
      stemming = st;
      opaFig.innerHTML = ui.figuur({ wie: 'opa', stemming: st });
      if (!metBallon || oud === st) return;
      if (st === 'pijn') { zegt('Au!'); ui.speel('au'); flits(opaFig, 'wiebel'); }
      else zegt('Ahh!');
    }
    var ballonTimer = 0;
    function zegt(t) {
      ballon.textContent = t;
      ballon.classList.add('zicht');
      root.clearTimeout(ballonTimer);
      ballonTimer = root.setTimeout(function () { ballon.classList.remove('zicht'); }, 1300);
    }
    function zetLever(ziek, metGeluid) {
      if (ziek === leverZiek && leverFig.innerHTML) return;
      leverZiek = ziek;
      leverFig.innerHTML = lever(ziek ? 'ziek' : 'blij');
      leverWrap.classList.toggle('vol', ziek);
      if (ziek && metGeluid) { ui.speel('alarm'); flits(leverFig, 'wiebel'); }
    }
    function werkLeverBij(dag) {
      if (dag === laatsteDag) return;
      laatsteDag = dag;
      leverTekst.textContent = kort(dag / 1000) + ' g van max. ' + kort(MAX / 1000) + ' g';
      var vol = dag > MAX;
      leverMeter.firstChild.style.width = (vol ? 100 : 100 * dag / (MAX * 1.25)) + '%';
      zetLever(vol, true);
    }

    // Figuurtjes reageren op aanraken (EoT-patroon).
    opaFig.addEventListener('pointerdown', function () {
      flits(opaFig, 'wiebel');
      ui.speel('tik');
      zegt(stemming === 'pijn' ? 'Au!' : 'Ahh!');
    });
    leverFig.addEventListener('pointerdown', function () { flits(leverFig, 'wiebel'); ui.speel('tik'); });

    // ------------------------------------------------------------------ curves (echt model)
    // Een curve = eigen modelsimulatie; punten worden in kleine exacte stappen bijgehouden.
    function Curve(o) {
      this.sim = M.maakSim(C, { blokkades: false });
      this.p = [[0, 0]];
      this.stijl = o.stijl || 'nu';
      this.doses = [];
      this.gepland = (o.gepland || []).slice();   // [{t, route, o}] toedieningen die vanzelf gebeuren
      this.metingen = (o.metingen || []).slice(); // [t] momenten om een ½-staafje te meten
      this.label = o.label || null;
      this.dt = o.dt || 0.02;
    }
    Curve.prototype.geef = function (route, o) {
      var s = this.sim, voor = s.C;
      var r = s.geef(route, o || {});
      if (route === 'spuit') this.p.push([s.t, voor]);
      this.p.push([s.t, s.C]);
      this.doses.push({ t: s.t, route: route });
      return r;
    };
    Curve.prototype.meet = function () {
      var s = this.sim, vorige = staven.length ? staven[staven.length - 1] : null;
      staven.push({ t: s.t, C: s.C, vorige: vorige && Math.abs(s.t - vorige.t - THALF) < 1e-6 ? vorige : null });
      if (staven.length > 1) ui.speel('poort');
    };
    Curve.prototype.tot = function (tEind) {
      var s = this.sim;
      while (true) {
        while (this.gepland.length && this.gepland[0].t <= s.t + 1e-9) {
          var g = this.gepland.shift();
          this.geef(g.route, g.o);
          if (g.geluid) ui.speel(g.geluid);
        }
        while (this.metingen.length && this.metingen[0] <= s.t + 1e-9) { this.metingen.shift(); this.meet(); }
        if (s.t >= tEind - 1e-9) break;
        var h = Math.min(this.dt, tEind - s.t);
        if (this.gepland.length) h = Math.min(h, this.gepland[0].t - s.t);
        if (this.metingen.length) h = Math.min(h, this.metingen[0] - s.t);
        s.stap(h);
        this.p.push([s.t, s.C]);
      }
    };

    // Laat de klok van de actieve curve lopen tot tEind (uren per seconde), daarna klaar().
    function loop(curve, tEind, uurPerSec, klaar) {
      root.cancelAnimationFrame(raf);
      var t0 = curve.sim.t, start0 = 0;
      zetFase('loopt');
      function frame(nu) {
        if (gestopt) return;
        if (!start0) start0 = nu;
        var t = Math.min(tEind, t0 + (nu - start0) / 1000 * uurPerSec * SPEED);
        curve.tot(t);
        bijwerken(true);
        if (t >= tEind - 1e-9) { raf = 0; if (klaar) klaar(); return; }
        raf = root.requestAnimationFrame(frame);
      }
      raf = root.requestAnimationFrame(frame);
    }

    function bijwerken(metBallon) {
      if (actief) {
        var c = actief.sim.C;
        zetStemming(c >= ZONE - 1e-9 ? 'blij' : 'pijn', metBallon);
        // Pilletje in de maag: deel van de geslikte dosis dat nog in het opnamedepot zit.
        if (grafiek && grafiek.maag) {
          var f = Math.max(0, Math.min(1, actief.sim.depot / (C.routes.slik.F * C.routes.slik.dosis)));
          maag.style.opacity = f > 0.02 ? String(0.25 + 0.75 * f) : '0';
          maag.style.transform = 'translate(-50%, -50%) scale(' + (0.35 + 0.65 * f).toFixed(3) + ')';
        }
        if (grafiek && grafiek.lever) werkLeverBij(actief.sim.dagteller());
      }
      teken();
    }

    // ------------------------------------------------------------------ grafiek (SVG)
    function tekenGetal(x) { return ui.getal(x, x % 1 ? 1 : 0); }
    function teken() {
      if (!grafiek) { graf.innerHTML = ''; return; }
      var g = grafiek;
      var W = Math.round(graf.clientWidth || 340), H = Math.round(graf.clientHeight || 186);
      var Lp = 30, Rp = 12, Tp = 24, Bp = 50;
      var pw = W - Lp - Rp, ph = H - Tp - Bp, y0 = Tp + ph;
      var X = function (t) { return Lp + t / g.T * pw; };
      var Y = function (c) { return y0 - Math.min(c, g.ymax * 1.06) / g.ymax * ph; };
      var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" xmlns="http://www.w3.org/2000/svg">';
      // zone (≥ 5 mg/L)
      var yz = Y(ZONE);
      s += '<rect x="' + Lp + '" y="' + (Tp - 4) + '" width="' + pw + '" height="' + (yz - Tp + 4) + '" fill="#3ddc97" fill-opacity=".13"/>';
      s += '<path d="M' + Lp + ' ' + yz + 'H' + (Lp + pw) + '" stroke="#1f9e68" stroke-width="2" stroke-dasharray="6 5"/>';
      s += '<text x="' + (Lp + pw - 4) + '" y="' + (Tp + 11) + '" text-anchor="end" class="tut-zone">pijnstilling</text>';
      // y-as
      s += '<text x="' + (Lp - 6) + '" y="' + (Tp - 9) + '" text-anchor="start" class="tut-eenheid">mg/L</text>';
      g.ticksY.forEach(function (c) {
        s += '<text x="' + (Lp - 7) + '" y="' + (Y(c) + 4.5) + '" text-anchor="end" class="' + (c === ZONE ? 'tut-as tut-as-zone' : 'tut-as') + '">' + tekenGetal(c) + '</text>';
        if (c !== ZONE) s += '<path d="M' + Lp + ' ' + Y(c) + 'h-4" stroke="' + INKT + '" stroke-width="2"/>';
      });
      // assen (schetslijn)
      s += '<path d="M' + Lp + ' ' + (Tp - 6) + 'V' + y0 + 'H' + (Lp + pw + 4) + '" stroke="' + INKT + '" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
      g.ticksX.forEach(function (t, i) {
        var lab = tekenGetal(t) + (i === g.ticksX.length - 1 ? ' u' : '');
        s += '<path d="M' + X(t) + ' ' + y0 + 'v5" stroke="' + INKT + '" stroke-width="2"/>';
        s += '<text x="' + X(t) + '" y="' + (H - 5) + '" text-anchor="middle" class="tut-as">' + lab + '</text>';
      });
      // ½-staafjes
      staven.forEach(function (b) {
        var x = Math.max(Lp + 7, X(b.t)), yb = Y(b.C);
        s += '<rect x="' + (x - 6) + '" y="' + yb + '" width="12" height="' + Math.max(0, y0 - yb) + '" rx="2" fill="#3d7fe0" fill-opacity=".3" stroke="#3d7fe0" stroke-width="2"/>';
        if (b.vorige) {
          var xv = Math.max(Lp + 7, X(b.vorige.t)), yh = Y(b.vorige.C / 2);
          s += '<path d="M' + (xv - 6) + ' ' + yh + 'H' + (x + 9) + '" stroke="#3d7fe0" stroke-width="2" stroke-dasharray="3 4"/>';
          s += '<text x="' + (x + 11) + '" y="' + (yh - 4) + '" class="tut-half">½</text>';
        }
      });
      // curves
      curves.forEach(function (c) {
        if (c.p.length < 2) return;
        var d = '';
        for (var i = 0; i < c.p.length; i++) {
          if (c.p[i][0] > g.T + 1e-9) break;
          d += (i ? 'L' : 'M') + X(c.p[i][0]).toFixed(1) + ' ' + Y(c.p[i][1]).toFixed(1);
        }
        var stijl = c.stijl === 'spook' ? 'stroke="#a9a9b2" stroke-width="3" stroke-dasharray="2 7"'
          : c.stijl === 'twee' ? 'stroke="#ff6f61" stroke-width="4"'
          : 'stroke="' + INKT + '" stroke-width="4"';
        s += '<path d="' + d + '" ' + stijl + ' fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
        if (c.label) {
          var piek = c.p[0];
          for (var j = 0; j < c.p.length; j++) if (c.p[j][1] > piek[1] && c.p[j][0] <= g.T) piek = c.p[j];
          var kleur = c.stijl === 'twee' ? '#ff6f61' : c.stijl === 'spook' ? '#8a8a93' : INKT;
          var lx = Math.min(Lp + pw - 12, X(piek[0]) + 4), ly = Y(piek[1]) - 9;
          s += '<circle cx="' + lx + '" cy="' + (ly - 4) + '" r="9" fill="#fff" stroke="' + kleur + '" stroke-width="2"/>';
          s += '<text x="' + lx + '" y="' + ly + '" text-anchor="middle" class="tut-label" fill="' + kleur + '">' + c.label + '</text>';
        }
      });
      // nu: lijn, stip en klok
      if (actief) {
        var tn = actief.sim.t, xn = X(Math.min(tn, g.T)), yn = Y(actief.sim.C);
        s += '<path d="M' + xn + ' ' + (Tp - 4) + 'V' + y0 + '" stroke="#b07cff" stroke-width="2"/>';
        s += '<circle cx="' + xn + '" cy="' + yn + '" r="5.5" fill="' + (actief.sim.C >= ZONE - 1e-9 ? '#3ddc97' : '#ff6f61') + '" stroke="' + INKT + '" stroke-width="2.5"/>';
        var kx = Math.max(Lp + 46, Math.min(Lp + pw - 22, xn));
        s += '<text x="' + kx + '" y="' + (Tp - 9) + '" text-anchor="middle" class="tut-klok">' + ui.getal(Math.floor(tn * 10 + 1e-6) / 10, (Math.floor(tn * 10 + 1e-6) % 10) ? 1 : 0) + ' u</text>';
      }
      // toedieningen onder de as
      var gezien = {};
      curves.forEach(function (c) {
        if (c.stijl === 'spook') return;
        c.doses.forEach(function (d) {
          var k = d.t.toFixed(2), n = gezien[k] = (gezien[k] || 0) + 1;
          var x = X(d.t) + (n - 1) * 24, y = y0 + 19;
          s += '<circle cx="' + x + '" cy="' + y + '" r="11" fill="' + (c.stijl === 'twee' ? '#ff6f61' : INKT) + '"/>';
          s += ui.icoon(d.route === 'slik' ? 'tablet' : d.route).replace('<svg ', '<svg x="' + (x - 9) + '" y="' + (y - 9) + '" width="18" height="18" ');
        });
      });
      s += '</svg>';
      graf.innerHTML = s;
    }

    // ------------------------------------------------------------------ knoppen
    function actieKnop(soort, label, icoonHtml) {
      var b = el('button', { type: 'button', class: 'actie tut-actie', 'data-tut': soort, 'aria-label': label });
      b.innerHTML = icoonHtml + '<span>' + label + '</span>';
      acties.appendChild(b);
      return b;
    }
    function wijs(b, aan) { b.classList.toggle('tut-wijs', !!aan); }
    function uit(b) { b.disabled = true; b.classList.remove('tut-wijs'); }
    function toonVolgende(aan) {
      volgende.classList.toggle('zicht', !!aan);
      volgende.disabled = !aan;
      if (aan) zetFase('klaar');
    }
    // Navigatie alleen op click (einde van de tik): anders landt de click van dezelfde tik op de
    // nieuwe knop die op die plek verschijnt.
    volgende.addEventListener('click', function () {
      if (volgende.disabled || gestopt) return;
      ui.speel('tik');
      naarStap(stap + 1);
    });
    over.addEventListener('click', function () { if (!gestopt) { ui.speel('tik'); meldGereed(); } });

    function meldGereed() {
      if (klaarGemeld) return;
      klaarGemeld = true;
      gereed();
    }

    // ------------------------------------------------------------------ stappen
    function nieuweGrafiek(o) {
      grafiek = o; curves = []; staven = []; actief = null;
    }
    function zetTekst(t) {
      tekst.textContent = t;
      flits(tekst, 'nieuw');
    }

    function naarStap(n) {
      stap = n;
      root.cancelAnimationFrame(raf); raf = 0;
      binnen.setAttribute('data-stap', String(n));
      var st = stippen.children;
      for (var i = 0; i < st.length; i++) st[i].className = i < n - 1 ? 'af' : i === n - 1 ? 'nu' : '';
      acties.innerHTML = '';
      toonVolgende(false);
      zetFase('wacht');
      leverWrap.hidden = !(n === 4 || n === 6);
      podium.classList.toggle('met-lever', !leverWrap.hidden);
      maag.style.opacity = '0';
      ({ 1: stap1, 2: stap2, 3: stap3, 4: stap4, 5: stap5, 6: stap6 })[n]();
      teken();
    }

    var tabletCurve = null;

    // 1. Opa Jan heeft pijn → tablet → curve stijgt pas na even.
    function stap1() {
      nieuweGrafiek({ T: 10, ymax: 12, ticksX: [0, 2.5, 5, 7.5, 10], ticksY: [5, 10], maag: true });
      tabletCurve = new Curve({ stijl: 'nu', dt: 0.02 });
      curves.push(tabletCurve); actief = tabletCurve;
      zetStemming('pijn', false);
      zetTekst('Opa Jan heeft pijn.');
      var b = actieKnop('slik', 'Tablet', ui.icoon('tablet'));
      wijs(b, true);
      bijTik(b, function () {
        if (b.disabled) return;
        uit(b); flits(b, 'tik');
        ui.speel('slik');
        tabletCurve.geef('slik');
        zetTekst('Een pil moet eerst door je maag.');
        bijwerken(false);
        loop(tabletCurve, 2, 0.85, function () { toonVolgende(true); });
      });
    }

    // 2. Curve zakt → elke 2,5 uur is de helft weg (½-staafjes op 5; 7,5; 10 u).
    function stap2() {
      grafiek.maag = true;
      actief = tabletCurve;
      zetTekst('Je lichaam ruimt het op: elke 2,5 uur is de helft weg.');
      tabletCurve.metingen = [2 * THALF];
      var b = actieKnop('klok', ui.getal(THALF, 1) + ' uur', KLOK_ICOON);
      b.disabled = true;
      var keer = 0;
      loop(tabletCurve, 2 * THALF, 1.5, function () { b.disabled = false; wijs(b, true); zetFase('wacht'); });
      bijTik(b, function () {
        if (b.disabled || fase === 'loopt') return;
        keer++;
        flits(b, 'tik'); ui.speel('tik');
        wijs(b, false);
        var doel = (2 + keer) * THALF;
        tabletCurve.metingen = [doel];
        if (keer >= 2) uit(b);
        loop(tabletCurve, doel, 1.6, function () { toonVolgende(true); });
      });
    }

    // 3. Spuit → meteen hoog, zakt net zo hard (½ per 2,5 uur); tabletcurve als schaduw.
    function stap3() {
      var schaduw = { sim: tabletCurve.sim, p: tabletCurve.p, stijl: 'spook', doses: [] };
      nieuweGrafiek({ T: 3 * THALF, ymax: 18, ticksX: [0, 2.5, 5, 7.5], ticksY: [5, 10, 15] });
      curves.push(schaduw);
      var c = new Curve({ stijl: 'nu', dt: 0.02, metingen: [THALF, 2 * THALF, 3 * THALF] });
      curves.push(c); actief = c;
      zetStemming('pijn', false);
      zetTekst('Een prik werkt meteen, maar zakt net zo hard.');
      var b = actieKnop('spuit', 'Spuit', ui.icoon('spuit'));
      wijs(b, true);
      bijTik(b, function () {
        if (b.disabled) return;
        uit(b); flits(b, 'tik');
        ui.speel('spuit');
        c.geef('spuit');
        c.meet();
        bijwerken(true);
        loop(c, 3 * THALF, 2.5, function () { toonVolgende(true); });
      });
    }

    // 4. Dagteller: na 4 × 1 g (0, 6, 12, 18 u) duwt een 5e gram (20 u) de teller over 4 g.
    function stap4() {
      nieuweGrafiek({ T: 24, ymax: 20, ticksX: [0, 6, 12, 18, 24], ticksY: [5, 10, 15], maag: true, lever: true });
      laatsteDag = -1;
      zetLever(false, false);
      var gepland = C.echtSchema.schema.map(function (d) { return { t: d.t, route: d.route, geluid: 'tik' }; });
      var c = new Curve({ stijl: 'nu', dt: 0.04, gepland: gepland });
      curves.push(c); actief = c;
      zetStemming('pijn', false);
      werkLeverBij(0);
      zetTekst('Meer is niet beter: boven 4 gram per dag raakt de lever beschadigd.');
      var b = actieKnop('slik', 'Tablet', ui.icoon('tablet'));
      b.disabled = true;
      loop(c, 20, 10, function () { b.disabled = false; wijs(b, true); zetFase('wacht'); });
      bijTik(b, function () {
        if (b.disabled || fase === 'loopt') return;
        uit(b); flits(b, 'tik');
        ui.speel('slik');
        c.geef('slik');
        bijwerken(false);
        loop(c, 24, 2, function () { toonVolgende(true); });
      });
    }

    // 5. Zetpil: twee zetpillen uit de vaste reeks van het model, met zichtbaar ander effect.
    function stap5() {
      nieuweGrafiek({ T: 3 * THALF, ymax: 12, ticksX: [0, 2.5, 5, 7.5], ticksY: [5, 10] });
      zetStemming('pijn', false);
      zetTekst('Een zetpil: soms goed, soms nauwelijks. Daar kun je niet van op aan.');
      var b = actieKnop('zetpil', 'Zetpil', ui.icoon('zetpil'));
      wijs(b, true);
      var keer = 0;
      bijTik(b, function () {
        if (b.disabled || fase === 'loopt') return;
        keer++;
        flits(b, 'tik');
        ui.speel('zetpil');
        wijs(b, false);
        if (keer >= 2) uit(b);
        var c = new Curve({ stijl: keer === 1 ? 'nu' : 'twee', dt: 0.02, label: String(keer) });
        c.geef('zetpil', { index: keer === 1 ? Z_GOED : Z_SLECHT });
        curves.push(c); actief = c;
        zetStemming('pijn', false);
        bijwerken(false);
        loop(c, 3 * THALF, 3, function () {
          if (keer < 2) { wijs(b, true); zetFase('wacht'); } else toonVolgende(true);
        });
      });
    }

    // 6. Klaar? Race!
    function stap6() {
      grafiek = null; curves = []; staven = []; actief = null;
      over.hidden = true;
      zetStemming('blij', false);
      zetLever(false, false);
      leverTekst.textContent = '';
      leverMeter.hidden = true;
      podium.classList.add('slot');
      tekst.textContent = '';
      graf.innerHTML = '';
      volgende.hidden = true;
      var b = el('button', { type: 'button', class: 'knop-wit groot tut-race', 'data-actie': 'verder', text: 'Klaar? Race!' });
      acties.appendChild(b);
      bediening.classList.add('slot');
      zetFase('klaar');
      ui.speel('klaar');
      var sinds = Date.now();
      b.addEventListener('click', function () {
        if (gestopt || Date.now() - sinds < 350) return;
        ui.speel('tik');
        meldGereed();
      });
    }

    function opResize() { teken(); }
    root.addEventListener('resize', opResize);

    naarStap(1);

    return {
      stop: function () {
        if (gestopt) return;
        gestopt = true;
        klaarGemeld = true;
        root.cancelAnimationFrame(raf);
        root.clearTimeout(ballonTimer);
        root.removeEventListener('resize', opResize);
        var v = binnen.querySelectorAll('[data-actie]');
        for (var i = 0; i < v.length; i++) v[i].removeAttribute('data-actie');
        root.setTimeout(function () {
          if (binnen.parentNode === container) container.removeChild(binnen);
        }, 450);
      }
    };
  }

  SoS.tutorial = { start: start };
})(typeof window !== 'undefined' ? window : null);
