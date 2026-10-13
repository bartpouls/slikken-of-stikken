/*
 * src/sound.js — zelf gesynthetiseerde geluidjes (Web Audio) + dempknop.
 * Zet window.SoS.sound. Geen audiobestanden, geen netwerk, geen console-uitvoer.
 *
 * PUBLIEKE API (window.SoS.sound)
 *   unlock()            Roep aan in de eerste tik/klik-handler. Maakt de
 *                       AudioContext aan en ontgrendelt hem (iOS/Android).
 *                       Ook automatisch gekoppeld aan de eerste pointerdown/
 *                       touchend/click/keydown op de pagina. Geeft true als er
 *                       een context is. Veilig om vaak aan te roepen.
 *   play(naam)          Speelt een geluid; start binnen ~5 ms. Geeft true als
 *                       het is ingepland, false bij demp, onbekende naam, nog
 *                       geen tik gehad, of geen Web Audio. Gooit nooit.
 *   <naam>()            Snelkoppeling per geluid, bv. SoS.sound.slik().
 *   names               Array met alle geluidsnamen (zie hieronder).
 *   muted               (alleen-lezen) true als gedempt.
 *   isMuted()           Idem als functie.
 *   setMuted(bool)      Dempen aan/uit; onthouden in localStorage
 *                       ('sos.sound.muted'), werkt ook zonder localStorage.
 *                       Geeft de nieuwe stand terug.
 *   toggle()            Wisselt demp; geeft de nieuwe stand terug.
 *   onMuteChange(fn)    fn(muted) bij elke wijziging (voor het knopicoon).
 *   available           true als de browser Web Audio heeft.
 *   voices()            Aantal nu klinkende stemmen (diagnose; max 6).
 *   _render(naam)       Alleen voor tests: Promise<AudioBuffer|null> van het
 *                       geluid via OfflineAudioContext (zelfde mastergain).
 *
 * GELUIDEN (naam — wanneer — karakter)
 *   tik       knop-tik                 piepklein droog klikje (~30 ms)
 *   poort     poortje komt eraan       heel zacht hoog tikje (~35 ms)
 *   slik      tablet slikken           lage 'glk', zakkende toon in twee delen (~150 ms)
 *   zetpil    zetpil geven             dof 'pff-plop', gedempt en laag (~140 ms)
 *   spuit     spuit: werkt direct      scherpe, hoge stijgende 'tsjik' (~100 ms)
 *   overslaan niets / overgeslagen     neutraal zacht 'tu-tu' omlaag (~120 ms)
 *   au        fout / onder de zone     doffe klap + duidelijk zakkende 'au' (~240 ms)
 *   alarm     te hoog / giftig / lever drie korte tweetoon-piepjes (~235 ms)
 *   wending   plotwending/gebeurtenis  opwaartse 'hm?' + belletje, geen foutgeluid (~250 ms)
 *   bonk      lithium-spuitgrap        holle, komische 'bonk' (~170 ms)
 *   klaar     race klaar               kort opgewekt loopje van vier noten (~390 ms)
 */
(function (root) {
  'use strict';
  if (!root) return;
  var SoS = root.SoS = root.SoS || {};

  var STORE_KEY = 'sos.sound.muted';
  var MASTER = 0.45;       // bescheiden totaalvolume
  var MAX_VOICES = 6;      // max. gelijktijdige geluiden
  var START = 0.005;       // inplan-offset in seconden
  var MIN_GAP = { poort: 0.15, alarm: 0.12, au: 0.1, klaar: 0.3 }; // anders 0.035

  var Ctor = root.AudioContext || root.webkitAudioContext || null;
  var OfflineCtor = root.OfflineAudioContext || root.webkitOfflineAudioContext || null;

  var ctx = null, master = null, noiseBuf = null;
  var voices = [];
  var lastPlayed = {};
  var listeners = [];

  // ---------- demp-voorkeur ----------
  function readStore() {
    try {
      var ls = root.localStorage;
      return !!ls && ls.getItem(STORE_KEY) === '1';
    } catch (e) { return false; }
  }
  function writeStore(v) {
    try {
      var ls = root.localStorage;
      if (ls) ls.setItem(STORE_KEY, v ? '1' : '0');
    } catch (e) { /* geen opslag: alleen deze sessie */ }
  }
  var muted = readStore();

  // ---------- opbouw ----------
  function makeNoise(c) {
    var len = Math.floor(c.sampleRate * 0.5);
    var b = c.createBuffer(1, len, c.sampleRate);
    var d = b.getChannelData(0);
    var s = 0x2545f491; // vaste xorshift: zelf gevulde ruis
    for (var i = 0; i < len; i++) {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      d[i] = ((s >>> 0) / 4294967295) * 2 - 1;
    }
    return b;
  }

  function makeMaster(c, level) {
    var g = c.createGain();
    g.gain.value = level;
    var comp = c.createDynamicsCompressor(); // vangt pieken bij stapeling op
    try {
      comp.threshold.value = -12; comp.knee.value = 6; comp.ratio.value = 12;
      comp.attack.value = 0.002; comp.release.value = 0.08;
    } catch (e) { /* oude implementaties */ }
    g.connect(comp);
    comp.connect(c.destination);
    return g;
  }

  function env(param, t, a, dur, peak) {
    param.setValueAtTime(0, t);
    param.linearRampToValueAtTime(peak, t + a);
    param.exponentialRampToValueAtTime(0.0008, t + dur);
    param.linearRampToValueAtTime(0, t + dur + 0.01);
  }

  function filt(E, o) {
    var f = E.c.createBiquadFilter();
    f.type = o[0];
    f.frequency.value = o[1];
    f.Q.value = o[2] || 0.7;
    return f;
  }

  // o: {type, f0, f1, glide, at, dur, gain, a, filter:[type,freq,Q]}
  function tone(E, o) {
    var c = E.c, t = E.t + (o.at || 0);
    var osc = c.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f0, t);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, t + (o.glide || o.dur));
    var g = c.createGain();
    env(g.gain, t, o.a || 0.003, o.dur, o.gain);
    var node = osc;
    if (o.filter) { var f = filt(E, o.filter); osc.connect(f); node = f; }
    node.connect(g);
    g.connect(E.out);
    osc.start(t);
    osc.stop(t + o.dur + 0.03);
    E.src.push(osc);
    E.end = Math.max(E.end || 0, t + o.dur + 0.03);
  }

  // o: {at, dur, gain, a, filter:[type,freq,Q]}
  function noise(E, o) {
    var c = E.c, t = E.t + (o.at || 0);
    var s = c.createBufferSource();
    s.buffer = E.noise;
    var g = c.createGain();
    env(g.gain, t, o.a || 0.002, o.dur, o.gain);
    var node = s;
    if (o.filter) { var f = filt(E, o.filter); s.connect(f); node = f; }
    node.connect(g);
    g.connect(E.out);
    s.start(t, Math.random() * 0.3);
    s.stop(t + o.dur + 0.03);
    E.src.push(s);
    E.end = Math.max(E.end || 0, t + o.dur + 0.03);
  }

  // ---------- de geluiden ----------
  var SOUNDS = {
    tik: function (E) {
      tone(E, { type: 'triangle', f0: 1150, f1: 850, dur: 0.03, gain: 0.3 });
      noise(E, { dur: 0.012, gain: 0.06, filter: ['highpass', 4000] });
    },
    poort: function (E) {
      tone(E, { type: 'sine', f0: 1600, dur: 0.035, gain: 0.13, a: 0.002 });
    },
    slik: function (E) {
      tone(E, { type: 'sine', f0: 340, f1: 150, dur: 0.11, gain: 0.55, a: 0.006 });
      tone(E, { type: 'sine', f0: 250, f1: 185, at: 0.075, dur: 0.075, gain: 0.32, a: 0.004 });
    },
    zetpil: function (E) {
      noise(E, { dur: 0.06, gain: 0.22, a: 0.008, filter: ['bandpass', 700, 1.2] });
      tone(E, { type: 'triangle', f0: 210, f1: 105, at: 0.025, dur: 0.11, gain: 0.45, filter: ['lowpass', 600] });
    },
    spuit: function (E) {
      tone(E, { type: 'square', f0: 1300, f1: 2600, dur: 0.06, gain: 0.1, a: 0.001, filter: ['highpass', 900] });
      noise(E, { dur: 0.03, gain: 0.12, a: 0.001, filter: ['highpass', 3500] });
      tone(E, { type: 'sine', f0: 2600, at: 0.045, dur: 0.05, gain: 0.12, a: 0.001 });
    },
    overslaan: function (E) {
      tone(E, { type: 'triangle', f0: 520, dur: 0.045, gain: 0.16 });
      tone(E, { type: 'triangle', f0: 390, at: 0.06, dur: 0.06, gain: 0.14 });
    },
    au: function (E) {
      noise(E, { dur: 0.05, gain: 0.3, filter: ['lowpass', 1500] });
      tone(E, { type: 'square', f0: 500, f1: 170, glide: 0.2, dur: 0.22, gain: 0.18, a: 0.004, filter: ['lowpass', 2000] });
      tone(E, { type: 'sine', f0: 250, f1: 85, glide: 0.2, dur: 0.2, gain: 0.35, a: 0.004 });
    },
    alarm: function (E) {
      var f = [990, 740, 990];
      for (var i = 0; i < 3; i++) {
        tone(E, { type: 'square', f0: f[i], at: i * 0.085, dur: 0.065, gain: 0.12, a: 0.002, filter: ['lowpass', 3200] });
      }
    },
    wending: function (E) {
      tone(E, { type: 'sine', f0: 380, f1: 1000, dur: 0.12, gain: 0.22, a: 0.01 });
      tone(E, { type: 'triangle', f0: 1320, at: 0.11, dur: 0.14, gain: 0.2, a: 0.002 });
      tone(E, { type: 'sine', f0: 1980, at: 0.11, dur: 0.12, gain: 0.07, a: 0.002 });
    },
    bonk: function (E) {
      tone(E, { type: 'sine', f0: 190, f1: 55, glide: 0.12, dur: 0.17, gain: 0.7, a: 0.002 });
      tone(E, { type: 'triangle', f0: 420, f1: 160, dur: 0.05, gain: 0.2, a: 0.001 });
      noise(E, { dur: 0.025, gain: 0.3, a: 0.001, filter: ['lowpass', 900] });
    },
    klaar: function (E) {
      var f = [523.25, 659.25, 783.99, 1046.5];
      for (var i = 0; i < 4; i++) {
        var last = i === 3;
        tone(E, { type: 'triangle', f0: f[i], at: i * 0.075, dur: last ? 0.16 : 0.07, gain: 0.2 });
        tone(E, { type: 'sine', f0: f[i] / 2, at: i * 0.075, dur: last ? 0.16 : 0.07, gain: 0.08 });
      }
    }
  };
  var NAMES = Object.keys(SOUNDS);

  // ---------- context en ontgrendeling ----------
  function resume() {
    try {
      if (ctx && ctx.state !== 'running' && ctx.resume) {
        var p = ctx.resume();
        if (p && p.then) p.then(null, function () {});
      }
    } catch (e) { /* stil */ }
  }

  function unlock() {
    if (!Ctor) return false;
    try {
      if (!ctx) {
        try { ctx = new Ctor({ latencyHint: 'interactive' }); }
        catch (e1) { ctx = new Ctor(); }
        master = makeMaster(ctx, muted ? 0 : MASTER);
        noiseBuf = makeNoise(ctx);
        // stille buffer: ontgrendelt oudere iOS Safari
        var s = ctx.createBufferSource();
        s.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
        s.connect(ctx.destination);
        s.start(0);
      }
      resume();
      return true;
    } catch (e) {
      ctx = null; master = null;
      return false;
    }
  }

  function gesture() {
    unlock();
    if (ctx && ctx.state === 'running') detach();
  }
  var EVENTS = ['pointerdown', 'touchend', 'click', 'keydown'];
  function attach() {
    try {
      for (var i = 0; i < EVENTS.length; i++) {
        root.addEventListener(EVENTS[i], gesture, { capture: true, passive: true });
      }
    } catch (e) { /* stil */ }
  }
  function detach() {
    try {
      for (var i = 0; i < EVENTS.length; i++) {
        root.removeEventListener(EVENTS[i], gesture, { capture: true });
      }
    } catch (e) { /* stil */ }
    // na een onderbreking (iOS: telefoon, ander tabblad) opnieuw ontgrendelen
    if (!attach.vis) {
      attach.vis = true;
      try {
        root.document.addEventListener('visibilitychange', function () {
          if (!root.document.hidden && ctx && ctx.state !== 'running') attach();
        });
      } catch (e) { /* stil */ }
    }
  }
  if (Ctor) attach();

  function inGesture() {
    try {
      var ua = root.navigator && root.navigator.userActivation;
      return !!(ua && ua.isActive);
    } catch (e) { return false; }
  }

  // ---------- stemmen beperken ----------
  function prune(now) {
    for (var i = voices.length - 1; i >= 0; i--) {
      if (voices[i].end <= now) {
        try { voices[i].g.disconnect(); } catch (e) { /* al los */ }
        voices.splice(i, 1);
      }
    }
  }
  function steal(v, now) {
    try {
      v.g.gain.cancelScheduledValues(now);
      v.g.gain.setValueAtTime(v.g.gain.value, now);
      v.g.gain.linearRampToValueAtTime(0, now + 0.01);
      for (var i = 0; i < v.src.length; i++) {
        try { v.src[i].stop(now + 0.015); } catch (e) { /* al gestopt */ }
      }
    } catch (e) { /* stil */ }
    v.end = now + 0.02;
  }

  function play(name) {
    try {
      var build = SOUNDS[name];
      if (!build || muted || !Ctor) return false;
      if (!ctx) {
        if (!inGesture()) return false; // nooit een context buiten een tik
        if (!unlock()) return false;
      }
      if (ctx.state !== 'running') resume();
      var now = ctx.currentTime;
      var gap = MIN_GAP[name] || 0.035;
      if (lastPlayed[name] !== undefined && now - lastPlayed[name] < gap) return false;
      lastPlayed[name] = now;

      prune(now);
      // dezelfde naam klinkt nog: oude stem afkappen (geen stapeling)
      for (var i = 0; i < voices.length; i++) {
        if (voices[i].name === name && !voices[i].stolen) { voices[i].stolen = true; steal(voices[i], now); }
      }
      var live = voices.filter(function (v) { return !v.stolen; });
      while (live.length >= MAX_VOICES) {
        var old = live.shift();
        old.stolen = true;
        steal(old, now);
      }

      var g = ctx.createGain();
      g.gain.value = 1;
      g.connect(master);
      var E = { c: ctx, out: g, t: now + START, noise: noiseBuf, src: [] };
      build(E);
      voices.push({ name: name, g: g, src: E.src, end: E.end || E.t });
      return true;
    } catch (e) {
      return false;
    }
  }

  // ---------- demp ----------
  function applyMute() {
    if (!ctx || !master) return;
    try {
      var now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(muted ? 0 : MASTER, now + 0.02);
    } catch (e) { /* stil */ }
  }
  function setMuted(v) {
    muted = !!v;
    writeStore(muted);
    applyMute();
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](muted); } catch (e) { /* luisteraar mag niet breken */ }
    }
    return muted;
  }

  function render(name) {
    try {
      var build = SOUNDS[name];
      if (!build || !OfflineCtor) return Promise.resolve(null);
      var sr = 44100;
      var oc = new OfflineCtor(1, Math.ceil(sr * 0.6), sr);
      var m = makeMaster(oc, MASTER);
      var E = { c: oc, out: m, t: 0, noise: makeNoise(oc), src: [] };
      build(E);
      var p = oc.startRendering();
      return (p && p.then) ? p.then(null, function () { return null; }) : Promise.resolve(null);
    } catch (e) {
      return Promise.resolve(null);
    }
  }

  var api = {
    names: NAMES.slice(),
    available: !!Ctor,
    unlock: unlock,
    play: play,
    isMuted: function () { return muted; },
    setMuted: setMuted,
    toggle: function () { return setMuted(!muted); },
    onMuteChange: function (fn) { if (typeof fn === 'function') listeners.push(fn); },
    voices: function () {
      if (!ctx) return 0;
      prune(ctx.currentTime);
      var n = 0, now = ctx.currentTime;
      for (var i = 0; i < voices.length; i++) if (!voices[i].stolen && voices[i].end > now) n++;
      return n;
    },
    _render: render
  };
  Object.defineProperty(api, 'muted', { get: function () { return muted; }, enumerable: true });
  NAMES.forEach(function (n) { api[n] = function () { return play(n); }; });

  SoS.sound = api;
})(typeof window !== 'undefined' ? window : null);
