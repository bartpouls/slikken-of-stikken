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
 *   deel2     spelklok (uur) waarop in de oefenronde "deel 2" begint (in een race: de eerste gebeurtenis
 *             uit de casusdata). Elke race bestaat uit twee delen: een gewoon stuk, en dan verandert er iets.
 *   stappen   [{ op, zin, knop, poortje, daarna }]  of een vertelstap  { op, zin, licht }
 *       vertelstap (zonder knop): de klok staat even stil, de zin staat in beeld en gaat vanzelf verder
 *                (of meteen, met een tik op het speelveld). licht = het schermonderdeel dat oplicht:
 *                'patient' | 'meter' (spiegelbalk bovenaan + gezicht) | 'banen' | 'delen' (deel 1 / deel 2).
 *       op       spelklok (uur) waarop de klok stilstaat (−Infinity = meteen bij het begin)
 *       zin      de ene zin die dan in beeld staat
 *       zin 'lekentaal.onder' = de casusbladtekst "Au. De pijn komt terug."; zit de spiegel dan niet onder
 *                de streep (de speler gaf zelf iets extra), dan staat er zinAnders.
 *       knop     de raceknop die gemarkeerd wordt ('slik' | 'zetpil' | 'spuit' | 'niets'). De klok wacht
 *                tot die keuze klaarstaat voor het eerstvolgende poortje. De knoppen zelf werken precies
 *                als in de race: de speler kan wisselen of zijn keuze wissen; dan wacht de klok opnieuw.
 *       poortje  index van dat poortje (controle: de motor weigert een draaiboek dat niet klopt)
 *       daarna   de ene zin die verschijnt op het moment dat het poortje de keuze uitvoert
 *   vol       de zin als een gevraagde dosis de dagteller boven het maximum zou brengen (kan alleen als de
 *             speler zelf iets extra gaf): de stap vervalt dan, de oefenronde vraagt nooit om een overdosis
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
    deel2: 12,
    stappen: [
      { op: -Infinity, zin: 'Jij bent de dokter van opa Jan: jij bepaalt wat hij krijgt, en wanneer.', licht: 'patient' },
      { op: -Infinity, zin: 'Zijn gezicht staat op de spiegel: zoveel paracetamol zit er in zijn bloed.', licht: 'meter' },
      { op: -Infinity, zin: 'Links van de streep is het te weinig en heeft hij pijn, in het groene vlak niet.', licht: 'banen' },
      { op: -Infinity, zin: 'Opa Jan heeft pijn: kies een tablet voor het eerste poortje.', knop: 'slik', poortje: 0,
        daarna: 'Een pil moet eerst door je maag.' },
      { op: 1.5, zin: 'De pijn is weg: kies Niets om een poortje over te slaan.', knop: 'niets', poortje: 2,
        daarna: 'Je lichaam ruimt het op: elke 2,5 uur is de helft weg.' },
      { op: 4.4, zin: 'lekentaal.onder', zinAnders: 'Kies nu de spuit.', knop: 'spuit', poortje: 5,
        daarna: 'Een prik werkt meteen, maar zakt net zo hard.' },
      { op: 8.5, zin: 'Te veel kan ook, dus de dagteller linksboven telt elke gram: kies weer een tablet.', knop: 'slik', poortje: 9,
        daarna: 'Meer is niet beter: boven 4 gram per dag raakt de lever beschadigd.' },
      { op: 12, zin: 'Deel 2: in elke race verandert halverwege iets, en dan moet je plan mee.', licht: 'delen' },
      { op: 12.5, zin: 'Hier lukt slikken even niet: kies nu een zetpil.', knop: 'zetpil', poortje: 13,
        daarna: 'Een zetpil: soms goed, soms nauwelijks. Daar kun je niet van op aan.' }
    ],
    vol: 'De dagteller is vol: opa Jan krijgt vandaag niets meer.',
    klaar: { kop: 'Klaar?', label: 'QALY-punten in de oefenronde', knop: 'Race!' }
  };
})(typeof window !== 'undefined' ? window : null);
