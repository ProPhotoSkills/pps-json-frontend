# HTML-Kopf global und pro Seite bearbeiten

## Umsetzung
- Einen eigenen Bereich **HTML-Kopf** im Redaktionssystem ergänzen, getrennt vom sichtbaren Header.
- Google-Analytics-ID und Pinterest-Bestätigung als eigene, verständliche Felder anzeigen.
- Zusätzlich ein Feld für weitere Kopf-Codes aus der hochgeladenen Datei anbieten.
- Zwei Ebenen unterstützen: **Für alle Seiten** und **nur für die aktuell gewählte HTML-Seite**.
- Seiteneinstellungen können die globalen Werte ersetzen oder leer lassen, um die globalen Werte zu verwenden.
- Einstellungen in einer Konfigurationsdatei im verbundenen Repo speichern und beim Scan wieder laden.
- Die wirksamen Codes in die HTML-Vorschau einsetzen, ohne den sichtbaren Header oder Footer zu verändern.

## Technische Details
- Konfigurationsdatei `HEAD/head-settings.json` mit globalen Werten und Einträgen je HTML-Pfad.
- Measurement ID als Konfiguration behandeln; keine privaten Schlüssel im Quellcode speichern.
- Vor dem Einsetzen benutzerdefinierter Kopf-Codes offensichtliche schließende Dokument-Tags entfernen.

## Prüfung
- Globales Speichern und erneutes Laden prüfen.
- Seitenbezogene Abweichung und Rückfall auf globale Werte prüfen.
- Vorschau einer HTML-Seite mit wirksamen Kopf-Codes und Footer kontrollieren.
