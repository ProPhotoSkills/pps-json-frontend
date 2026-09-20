# Header- und Footer-Varianten auswählbar machen

## Umsetzung
- In der linken Übersicht zwei eigene Bereiche **Header** und **Footer** anzeigen.
- Alle JSON-Dateien aus den jeweiligen Ordnern als Varianten auflisten.
- Pro Bereich genau eine aktive Variante markieren; beim ersten Laden wird automatisch die erste Variante gewählt.
- Ein Klick auf eine Variante wechselt den Header beziehungsweise Footer der vollständigen Kapitelvorschau, ohne das aktive Kapitel zu verlassen.
- Für jede Variante zusätzlich eine Bearbeiten-Aktion anbieten, damit ihre Inhalte weiterhin geöffnet und gespeichert werden können.
- Die vollständige Vorschau nur aus dem ausgewählten Header, dem aktiven Kapitel und dem ausgewählten Footer zusammensetzen.
- Nach erneutem Scannen und nach dem Speichern die Variantenauswahl erhalten, sofern die Datei noch existiert.

## Technische Details
- Geladene globale Dateien nach Pfad speichern statt alle Markups gemeinsam zusammenzufügen.
- Auswahlzustand für Header- und Footer-Pfad in der Hauptseite verwalten.
- `ChapterEditor` erhält jeweils nur das aktuell ausgewählte Header- und Footer-Markup.
- Bestehendes Speichern und der automatische Neuaufbau der Kategorieübersichten bleiben unverändert.

## Prüfung
- Build prüfen.
- Im Browser kontrollieren, dass Header/Footer getrennt gelistet, wechselbar und in der Kapitelvorschau sichtbar sind.
