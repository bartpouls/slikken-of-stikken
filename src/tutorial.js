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
 *   stappen   [{ op, zin, knop, poortje, daarna }]  of een vertelstap  { op, zin, licht, fig }
 *       vertelstap (zonder knop): de klok staat even stil, de zin staat in beeld en gaat vanzelf verder
 *                (of meteen, met een tik op het speelveld). licht = het schermonderdeel dat oplicht:
 *                'patient' (bovenbalk) | 'meter' (spiegelbalk bovenaan + gezicht) | 'banen' | 'klok' (klok + tijdstrook)
 *                | 'delen' (tijdstrook: deel 1 / deel 2) | 'qaly' | 'lever' (dagteller)
 *                | 'knoppen' (+ de balk erboven en het volgende poortje).
 *                fig 'draai' = een concentratie-tijdcurve die een kwartslag draait (zo staat hij op het scherm).
 *       op       spelklok (uur) waarop de klok stilstaat (−Infinity = meteen bij het begin)
 *       zin      de ene zin die dan in beeld staat
 *       zin 'lekentaal.onder' = de casusbladtekst "Au. De pijn komt terug."; zit de spiegel dan niet onder
 *                de streep (de speler gaf zelf iets extra), dan staat er zinAnders.
 *       knop     de raceknop die gemarkeerd wordt ('slik' | 'zetpil' | 'spuit' | 'niets'). De klok wacht
 *                tot die keuze klaarstaat voor het eerstvolgende poortje. De knoppen zelf werken precies
 *                als in de race: de speler kan wisselen of zijn keuze wissen; dan wacht de klok opnieuw.
 *       poortje  index van dat poortje (controle: de motor weigert een draaiboek dat niet klopt)
 *       daarna   de ene zin die verschijnt op het moment dat het poortje de keuze uitvoert
 *   geenKeuze de zin als een poortje voorbijgaat zonder keuze (alleen in de oefenronde; in de race is er
 *             dezelfde −20-flits en dezelfde bonk, zonder zin). Staat in beeld tot de volgende stap.
 *   vol       de zin als een gevraagde dosis de dagteller boven het maximum zou brengen (kan alleen als de
 *             speler zelf iets extra gaf): de stap vervalt dan, de oefenronde vraagt nooit om een overdosis
 *   klaar     { kop, label, knop, zin }: tekst op het eindkaartje (zelfde kaartje als "Race klaar" na een race);
 *             zin staat boven de knop (alleen na de oefenronde) en kost dus geen kloktijd
 * }
 * De plotwendingen (misselijkheid, ibuprofen) zitten er bewust niet in: de
 * motor zet de blokkade van casus 1 in de oefenronde uit.
 *
 * Doses in de oefenronde: tablet (uur 0), spuit (uur 5), zetpil (uur 13) = 3 × 1 g. Zo blijft er 1 g ruimte
 * onder het dagmaximum: geeft de speler op een vrij poortje zelf één dosis extra, dan komt de zetpil toch aan bod.
 * Tussen de stappen kiest de speler zelf (de klok loopt door; geen keuze kost punten, net als in de race:
 * dat staat uitgelegd op poortje 1, vóór het eerste vrije poortje). De zetpil op poortje 13 is
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
    eind: 15,
    deel2: 12,
    stappen: [
      { op: -Infinity, zin: 'Jij doseert de medicijnen van opa Jan: jij kiest wat hij krijgt, en wanneer.', licht: 'patient' },
      { op: -Infinity, zin: 'Het is een race tegen de klok: die loopt linksboven, en de strook eronder toont hoe ver je bent.', licht: 'klok' },
      { op: -Infinity, zin: 'Een concentratie-tijdcurve, een kwartslag gedraaid: zo loopt de race over je scherm naar beneden.', fig: 'draai' },
      { op: -Infinity, zin: 'Zijn gezicht staat op de spiegel: zoveel paracetamol zit er in zijn bloed.', licht: 'meter' },
      { op: -Infinity, zin: 'Links van de streep heeft hij pijn, in het groene vlak niet: blijf binnen dat venster.', licht: 'banen' },
      { op: -Infinity, zin: 'Een QALY is een jaar in goede gezondheid; hier zijn het spelpunten: in het groene vlak erbij, erbuiten eraf.', licht: 'qaly' },
      { op: -Infinity, zin: 'De paarse lijnen zijn poortjes: kies vóór élk poortje een knop, voordat de balk boven de knoppen vol is.', licht: 'knoppen' },
      { op: -Infinity, zin: 'Opa Jan heeft pijn: kies een tablet voor het eerste poortje.', knop: 'slik', poortje: 0,
        daarna: 'Een pil moet eerst door je maag.' },
      { op: 0.3, zin: 'Niets geven is ook een keuze: tik dan Overslaan. Geen keuze kost punten.', knop: 'niets', poortje: 1,
        daarna: 'Nu jij: kies vóór elk poortje Tablet, Spuit, Zetpil of Overslaan.' },
      { op: 2.6, zin: 'De curve zakt: je lichaam ruimt het op, elke 2,5 uur is de helft weg.' },
      { op: 4.4, zin: 'lekentaal.onder', zinAnders: 'Kies nu de spuit.', knop: 'spuit', poortje: 5,
        daarna: 'Een prik werkt meteen, maar zakt net zo hard.' },
      { op: 8.5, zin: 'De dagteller telt elke gram: 1 g per keer, en boven 4 g per dag loopt de lever gevaar.', licht: 'lever' },
      { op: 12, zin: 'Deel 2: in elke race verandert halverwege iets, en dan moet je plan mee.', licht: 'delen' },
      { op: 12.5, zin: 'Hier lukt slikken even niet: kies nu een zetpil.', knop: 'zetpil', poortje: 13,
        daarna: 'Een zetpil: soms goed, soms nauwelijks. Daar kun je niet van op aan.' }
    ],
    geenKeuze: 'Geen keuze: dat kost punten. Kies vóór elk poortje een knop, ook als het Overslaan is.',
    vol: 'De dagteller is vol: opa Jan krijgt vandaag niets meer.',
    klaar: { kop: 'Klaar?', label: 'QALY-punten in de oefenronde', knop: 'Race!',
      zin: 'In de race wacht de klok niet op jou: kies bij elk poortje op tijd, ook als het Overslaan is.' }
  };
})(typeof window !== 'undefined' ? window : null);
