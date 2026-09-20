# Bestehende Kopfzeilen-Angaben einlesen

## Umsetzung
- Beim Repo-Scan alle vorhandenen HTML-Dateien nach Google-Analytics-IDs, Pinterest-Bestätigungscodes und weiteren Verifizierungsangaben durchsuchen.
- Bereits gespeicherte Angaben aus `HEAD/head-settings.json` beibehalten; nur noch leere globale oder seitenbezogene Felder mit gefundenen Werten vorbelegen.
- Im Bereich „HTML-Kopf · Google & Pinterest“ die aus jeder Seite gelesenen Werte anzeigen, sodass sie direkt korrigiert und gespeichert werden können.
- Einen sichtbaren Hinweis ergänzen, wie viele HTML-Seiten ausgelesen wurden und ob eine ausgewählte Seite eigene Angaben enthält oder globale Werte übernimmt.

## Technische Details
- Die Erkennung berücksichtigt `gtag`-Einbindungen, Pinterest-`p:domain_verify`-Meta-Tags sowie weitere Verifizierungs-Meta-Tags.
- Das Einlesen verändert keine Repo-Datei. Erst „HTML-Kopf speichern“ schreibt die korrigierten Angaben in die zentrale Einstellungsdatei.
- Danach Build und Darstellung im Redaktionssystem prüfen.
