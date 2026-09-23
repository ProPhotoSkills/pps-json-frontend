# Automatische vollständige Seitenaufnahme nach dem Repo-Scan

## Ziel
Nach „Verbinden & Repo scannen“ wird automatisch das erste gefundene Kapitel geöffnet und als vollständige Seitenansicht mit ausgewähltem Header, Footer sowie den geladenen CSS- und JavaScript-Dateien dargestellt. Sobald alles geladen ist, wird daraus automatisch eine statische Aufnahme erzeugt und oberhalb der bearbeitbaren Ansicht angezeigt.

## Umsetzung
- Den Scan so abschließen, dass Header, Footer und Repo-Assets feststehen, bevor das erste Kapitel geöffnet wird.
- Automatisch die erste Kapitel-JSON laden, ohne dass links erst auf „JSON“ geklickt werden muss.
- Die gerenderte Gesamtseite nach Bildern, Schriften und Skripten aufnehmen.
- Währenddessen einen klaren Ladezustand zeigen; bei nicht aufnehmbaren Fremdbildern weiterhin die vollständige Live-Ansicht anzeigen.
- Die Aufnahme mit einem Aktualisieren-Befehl versehen, damit Änderungen erneut aufgenommen werden können.

## Technische Details
- Die Aufnahme bleibt vollständig im Browser; GitHub-Zugangsdaten werden nicht übertragen oder gespeichert.
- Die vorhandene sichere Kommunikation zwischen Seitenansicht und Redaktionssystem bleibt erhalten.
- Das bestehende direkte Bearbeiten der JSON-Texte und das Speichern werden nicht verändert.

## Prüfung
- Ablauf direkt nach einer erfolgreichen Verbindung testen.
- Kontrollieren, dass Header, Inhalt, Footer und Repo-Stile sichtbar sind.
- Desktop- und schmale Darstellung sowie Fehler-/Ladezustand prüfen.
