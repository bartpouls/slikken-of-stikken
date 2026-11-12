/*
 * Slikken of Stikken — src/tutorial.js  (de oefenronde: alleen het draaiboek, geen tekencode)
 *
 * De tutorial IS het racescherm (§3 Flow stap 2, §6C): app.js start dezelfde race-motor als race 1
 * (zelfde tijdlijn, poortjes, knoppen, zone, streep, klok, QALY-stand, dagteller en levermeter) en legt
 * dit draaiboek ernaast. Dit bestand tekent niets en rekent niets: het zegt alleen wanneer de klok stilstaat,
 * welke knop gemarkeerd wordt en welke zin in beeld staat.
 *
 * SoS.tutorial = {
 *   casus     'paracetamol' (casusblad §5, casus 1)
 *   eind      spelklok (uur) waarop de oefenronde stopt en "Klaar?" verschijnt
 *   stappen   [{ op, zin, knop, poortje, daarna }]
 *       op       spelklok (uur) waarop de klok stilstaat (−Infinity = meteen bij het begin)
 *       zin      de ene zin die dan in beeld staat
 *       knop     de raceknop die gemarkeerd wordt ('slik' | 'zetpil' | 'spuit' | 'niets'); de klok loopt
 *                weer zodra de speler die knop tikt. De keuze geldt, net als in de race, voor het
 *                eerstvolgende poortje.
 *       poortje  index van dat poortje (controle: de motor weigert een draaiboek dat niet klopt)
 *       daarna   de ene zin die verschijnt op het moment dat het poortje de keuze uitvoert
 *   klaar     { kop, label, knop }: tekst op het eindkaartje (zelfde kaartje als "Race klaar" na een race)
 * }
 * De plotwendingen (misselijkheid, ibuprofen, geweigerde lithiumprik) zitten er bewust niet in: de
 * motor zet de blokkade van casus 1 in de oefenronde uit.
 *
 * Doses in de oefenronde: tablet (uur 0), spuit (uur 5), tablet (uur 9), zetpil (uur 13) = 4 × 1 g,
 * dus precies het dagmaximum uit het casusblad en nooit erboven. De zetpil op poortje 13 is
 * M.zetpil(13) uit de vaste reeks (F 0,35; ka 0,3 /u): een zwakke, zodat "nauwelijks" te zien is.
 * Zinnen bij "daarna" zijn de zinnen uit §3 Flow stap 2 van de bouwopdracht; "Au. De pijn komt terug."
 * komt uit het casusblad (de motor leest hem uit de casusdata).
 */
(function (root) {
  'use strict';
  if (!root) return;
  var SoS = root.SoS = root.SoS || {};
  SoS.tutorial = {
    casus: 'paracetamol',
    eind: 16,
    stappen: [
      { op: -Infinity, zin: 'Opa Jan heeft pijn: kies een tablet voor het eerste poortje.', knop: 'slik', poortje: 0,
        daarna: 'Een pil moet eerst door je maag.' },
      { op: 1.5, zin: 'De pijn is weg: kies Niets om een poortje over te slaan.', knop: 'niets', poortje: 2,
        daarna: 'Je lichaam ruimt het op: elke 2,5 uur is de helft weg.' },
      { op: 4.4, zin: 'lekentaal.onder', knop: 'spuit', poortje: 5,
        daarna: 'Een prik werkt meteen, maar zakt net zo hard.' },
      { op: 8.5, zin: 'Elke gram telt mee in de dagteller linksboven: kies weer een tablet.', knop: 'slik', poortje: 9,
        daarna: 'Meer is niet beter: boven 4 gram per dag raakt de lever beschadigd.' },
      { op: 12.5, zin: 'Slikken lukt niet altijd: kies nu een zetpil.', knop: 'zetpil', poortje: 13,
        daarna: 'Een zetpil: soms goed, soms nauwelijks. Daar kun je niet van op aan.' }
    ],
    klaar: { kop: 'Klaar?', label: 'QALY-punten in de oefenronde', knop: 'Race!' }
  };
})(typeof window !== 'undefined' ? window : null);
