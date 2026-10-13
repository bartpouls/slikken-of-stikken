/*
 * Slikken of Stikken — src/tutorial.js  (PLACEHOLDER; wordt later door een andere bouwer ingevuld)
 *
 * INTERFACE (houd deze vast; app.js roept alleen dit aan)
 * ----------------------------------------------------------
 *   SoS.tutorial.start(container, gereed, opties) -> {stop()} | undefined
 *     container  <section id="scherm-tutorial" class="scherm wit">: leeg, al zichtbaar, EoT-stijl (wit).
 *                De module vult hem helemaal zelf (innerHTML/DOM) en mag hem vrij gebruiken.
 *     gereed()   Roep precies één keer aan als de speler klaar is ("Klaar? Race!"). app.js toont
 *                dan het intro-kaartje van race 1. Geef de laatste knop data-actie="verder".
 *     opties     {naam, speed}: speelnaam en de testhaak ?speed=N (versnel eigen animaties/klokken
 *                ermee als je die hebt).
 *     stop()     Optioneel: app.js roept dit aan als het scherm weggaat (timers/rAF opruimen).
 *
 * BESCHIKBAAR (gebruik pas binnen start(), app.js laadt ná dit bestand):
 *   SoS.model, SoS.score, SoS.sound (unlock/play/isMuted), en SoS.ui uit app.js:
 *   SoS.ui.figuur({wie:'opa'|'vries', stemming, ...}) -> SVG-string (opa Jan blauw hoedje,
 *   mevrouw De Vries rood hoedje), SoS.ui.icoon(soort) -> SVG-string (tablet/zetpil/spuit/niets),
 *   SoS.ui.el(tag, attrs, kinderen), SoS.ui.getal(x, decimalen), SoS.ui.speel(naam).
 *   Stijl: classes .knop-wit (.groot), .fig, en de kleurvariabelen uit style.css.
 *   Eigen stijl in src/tutorial.css, met prefix .tut- .
 */
(function (root) {
  'use strict';
  if (!root) return;
  var SoS = root.SoS = root.SoS || {};

  function start(container, gereed, opties) {
    var ui = SoS.ui;
    var klaar = false;
    container.innerHTML =
      '<div class="tut-binnen">' +
        '<div class="tut-podium"><div class="fig" data-fig="opa">' + ui.figuur({ wie: 'opa', stemming: 'blij' }) + '</div></div>' +
        '<h2 class="tut-kop">Klaar? Race!</h2>' +
        '<button type="button" class="knop-wit groot" data-actie="verder">Klaar? Race!</button>' +
      '</div>';
    var knop = container.querySelector('[data-actie="verder"]');
    knop.addEventListener('click', function () {
      if (klaar) return;
      klaar = true;
      ui.speel('tik');
      gereed();
    });
    return { stop: function () { klaar = true; } };
  }

  SoS.tutorial = { start: start, placeholder: true };
})(typeof window !== 'undefined' ? window : null);
