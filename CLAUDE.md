# Slikken of Stikken — werkafspraken voor Claude

- Bron voor inhoud en getallen: `docs/bouwopdracht.md`. Getallen uit het casusblad (§5) wijzigen alleen na akkoord van Bart Pouls.
- Broncode in `src/`; na elke wijziging `node tools/build.mjs` (schrijft `index.html`) en de tests in `tests/` draaien.
- Bart is geen programmeur: leg keuzes uit zonder jargon.

## Rolverdeling met Copilot

Claude is de enige bouwer. GitHub Copilot is reviewer op pull requests en volgt `.github/copilot-instructions.md`. Copilot bouwt niet mee.

## Opmerkingen van Copilot afhandelen

Haal de opmerkingen op uit de pull request (of Bart plakt ze in de sessie). Per opmerking:

1. **Controleer eerst.** Een opmerking is een bewering, geen opdracht. Leg hem naast de bouwopdracht en de code.
2. **[Hoog] over farmacologie of getallen:** oplossen, of met bewijs weerleggen (formule, casusblad, testuitkomst). Nooit "oplossen" door het casusblad aan te passen; dat beslist Bart.
3. **Telefoonregels (48 px, contrast, geen horizontaal scrollen, enz.):** oplossen als het klopt; controleer na de fix op 375 × 667 en 390 × 844.
4. **Smaak (kleur, sfeer, woordkeus):** niet zelf beslissen. Zet het op een lijstje voor Bart.
5. **Antwoord in de pull request** met één regel per opmerking: opgelost in welke commit, of waarom niet.

Meld aan Bart in gewone taal: wat is opgelost, wat is weerlegd, en wat ligt bij hem.
