# HTML- und JSON-Dateien gemeinsam darstellen

## Umsetzung
- Die getrennten Bereiche „HTML-Dateien“ und „JSON-Dateien“ durch eine gemeinsame Kapitelansicht ersetzen.
- Jede Kapitel-JSON über ihren vollständigen Dateinamen ohne Endung mit dem gleichnamigen HTML-Ordner beziehungsweise der gleichnamigen HTML-Datei verbinden – unabhängig davon, in welchen Repo-Ordnern beide liegen.
- Die vorhandene Reihenfolge der JSON-Dateien aus dem Repo beibehalten und pro Kapitel beide Dateien direkt nebeneinander auswählbar machen: JSON bearbeiten und HTML ansehen.
- Nicht zuordenbare JSON- oder HTML-Dateien weiterhin sichtbar in eigenen Restgruppen aufführen, damit nichts verloren geht.
- Kategorien aus dem Ordner der JSON-Datei ableiten und die zugehörigen Farben automatisch aus dem aktuell ausgewählten Footer auslesen; die Farbe in Überschrift und Kapitelzeilen sichtbar verwenden.

## Technische Details
- Die Zuordnung nutzt den gemeinsamen Basisnamen wie `t13_l01_…`; zusätzlich werden `e`/`l`-Varianten der Kapitelnummer toleriert.
- Footer-Farben werden nur aus gültigen sechsstelligen Hex-Werten direkt an den Kategorienamen übernommen; fehlt eine Farbe, bleibt die neutrale Darstellung erhalten.

## Prüfung
- Paarung, Öffnen von JSON und HTML sowie Restgruppen mit den vorhandenen Repo-Daten prüfen.
- Kategorienfarben gegen den Footer kontrollieren und den aktuellen Build-Status prüfen.
