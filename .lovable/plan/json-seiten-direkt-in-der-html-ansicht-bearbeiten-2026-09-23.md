# JSON-Seiten direkt in der HTML-Ansicht bearbeiten

## Umsetzung
- Die vollständige Vorschau aus der JSON-Datei weiterhin mit ausgewähltem Header und Footer anzeigen.
- Bearbeitbare Texte und Überschriften in der Vorschau anklickbar machen.
- Änderungen beim Tippen direkt in den zugehörigen JSON-Feldwert übernehmen und als ungespeichert markieren.
- Die bestehende Schaltfläche „Speichern & neu bauen“ zum Speichern der Änderungen beibehalten.
- Header, Footer und nicht bearbeitbare Seitenteile in der Kapitelansicht vor versehentlichen Änderungen schützen.

## Technische Details
- Vorschau-Elemente erhalten eine eindeutige Zuordnung zum jeweiligen JSON-Feld.
- Änderungen werden sicher aus der eingebetteten Vorschau an das Redaktionssystem übertragen.
- Links werden im Bearbeitungsmodus nicht geöffnet; Bild-, Audio- und Link-Adressen bleiben in den vorhandenen Eingabefeldern bearbeitbar.

## Prüfung
- Text und Überschrift direkt in der Vorschau ändern, Ungespeichert-Markierung prüfen und speichern.
- Prüfen, dass der gespeicherte Text nach erneutem Öffnen korrekt erscheint.
- Darstellung mit Header, Footer und Kategorienfarben sowie den aktuellen Build-Status kontrollieren.
