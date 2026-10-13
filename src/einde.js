/*
 * Slikken of Stikken — src/einde.js  (PLACEHOLDER; wordt later door een andere bouwer ingevuld)
 *
 * INTERFACE (houd deze vast; app.js roept alleen dit aan)
 * ----------------------------------------------------------
 *   SoS.einde.toon(container, data, opnieuw) -> {stop()} | undefined
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
 *     stop()     Optioneel: opruimen als het scherm weggaat.
 *   Eisen (§6B): naam en totaalscore ≥ 32 px; nabespreekvraag "Wat deed je toen je onder de streep zakte?".
 *
 * BESCHIKBAAR: SoS.model, SoS.score, SoS.sound, SoS.ui (zie app.js). Eigen stijl in src/einde.css, prefix .eind- .
 */
(function (root) {
  'use strict';
  if (!root) return;
  var SoS = root.SoS = root.SoS || {};

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function toon(container, data, opnieuw) {
    var ui = SoS.ui;
    var namen = { paracetamol: 'Paracetamol', lithium: 'Lithium' };
    var rijen = (data.races || []).map(function (v, i) {
      return '<li class="eind-race"><span>Race ' + (i + 1) + ' · ' + esc(namen[v.casus] || v.casus) + '</span>' +
        '<b>' + ui.getal(v.opbouw.totaal, 0) + '</b></li>';
    }).join('');
    container.innerHTML =
      '<div class="eind-binnen">' +
        '<p class="eind-naam">' + esc(data.naam) + '</p>' +
        '<p class="eind-label">QALY-punten totaal</p>' +
        '<p class="eind-totaal">' + ui.getal(data.totaal, 0) + '</p>' +
        '<ul class="eind-races">' + rijen + '</ul>' +
        '<p class="eind-vraag">Wat deed je toen je onder de streep zakte?</p>' +
        '<button type="button" class="knop-wit groot" data-actie="opnieuw">Nog een keer</button>' +
      '</div>';
    var bezig = false;
    container.querySelector('[data-actie="opnieuw"]').addEventListener('click', function () {
      if (bezig) return;
      bezig = true;
      ui.speel('tik');
      opnieuw();
    });
    return { stop: function () { bezig = true; } };
  }

  SoS.einde = { toon: toon, placeholder: true };
})(typeof window !== 'undefined' ? window : null);
