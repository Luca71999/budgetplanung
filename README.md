# Budgetplanung

Eine kleine, iPhone-taugliche Web-App fuer deinen monatlichen Budgetplan.

## Funktionen

- Feste Einnahmen einzeln erfassen
- Feste Ausgaben einzeln erfassen
- Personalisierung ueber Namen und Monat
- Aktueller Kontostand fuer realistischere Planung
- Sicherheitsreserve in Prozent festlegen
- Variable Kategorien fuer Essen, Drogerie, Freizeit und Sparen
- Automatische Berechnung fuer:
  - gesamte Einnahmen
  - feste Ausgaben
  - frei verfuegbares Budget
  - geschaetzter Kontostand zum Monatsende
  - moeglicher monatlicher Abbau deines aktuellen Minus
  - Orientierung fuer Essen pro Monat, Woche und Tag
  - prozentuale Aufteilung des Restbudgets auf mehrere Kategorien
- Speicherung direkt im Browser per `localStorage`

## Nutzung

1. `index.html` im Browser oeffnen.
2. Einnahmen und Ausgaben eintragen.
3. Die Zusammenfassung unten zeigt dir sofort, was fuer variable Kosten uebrig bleibt.

## Auf dem iPhone

1. Die Dateien auf einen Webspace, in iCloud Drive oder in eine einfache Hosting-Loesung legen.
2. `index.html` in Safari oeffnen.
3. Optional in Safari ueber "Teilen" -> "Zum Home-Bildschirm" als App-Symbol speichern.
4. Durch `manifest.json` und `icon.svg` wirkt die Seite auf mobilen Geraeten app-aehnlicher.
