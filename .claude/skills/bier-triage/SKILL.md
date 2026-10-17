---
name: bier-triage
description: Bier-Meldungen aus der App (Issues mit Label `bier-meldung`) prüfen, korrigieren und freigeben – oder Brauereien ohne Bier nachrecherchieren (tools/catalog/research). Verwenden, wenn Meldungen triagiert, Biere freigegeben oder Lücken im Regionalkatalog gefüllt werden sollen.
---

# Bier-Meldungen triagieren (auf Zuruf)

Das Label `freigegeben` ist die Freigabe: Der Job „Freigegebenes Bier eintragen“ (`tool/beer_bot.py approve N`)
schreibt das Bier als `r-app<N>` (Quelle 5, Qualität 2) in den Live-Katalog, kommentiert ✅ und schließt das Issue.
Setzt Claude das Label über das GitHub-MCP, startet der Job genauso (nicht per `GITHUB_TOKEN` setzen – das löst
keinen Workflow aus).

## Je offene Meldung (`bier-meldung`)
1. Abschnitte lesen (Format: `SECTIONS` in `tool/beer_bot.py`). Link öffnen, sonst die Website der Brauerei – eigener
   User-Agent (`CRAWLER_UA` in `tools/catalog/web.ts`), `robots.txt` und 403 respektieren.
2. **Nur belegte Fakten:** Die abgerufene Seite nennt das Bier und zeigt, dass es ein eigenes Bier dieser Brauerei ist
   (Brauerei-ID/Ort passen). Nichts aus dem Gedächtnis.
3. **Duplikat?** Live: `regional_beers?brewery_id=eq.<id>&select=name` (öffentliche REST-API, Key in
   `src/sync/config.ts`). Noch nicht importiert: `tools/catalog/research/*.json` auf `origin/main`. Gleicher Name (ohne
   Groß-/Kleinschreibung) → Kommentar „schon vorhanden“ bzw. „kommt mit dem nächsten Katalog-Import“ und schließen
   (`not_planned`). Quelle-5-Biere werden beim Import nicht dedupliziert.
4. **Bestätigt:** Issue-Body korrigieren – Schreibweise wie auf der Seite, Alkohol in % vol (nie Stammwürze), Stil nur aus
   der Liste unten im Issue (sonst `_keine Angabe_`), Brauerei-ID. Dann Label `freigegeben` setzen (Labels als Liste
   `["bier-meldung", "freigegeben"]`) und den Bot-Kommentar abwarten; ⚠️ → korrigieren und Label neu setzen.
5. **Nicht belegbar:** Kommentar, was fehlt (z. B. „Seite nennt das Bier nicht“). Issue bleibt offen für den Maintainer.
6. Kommentare enden mit dem Claude-Code-Footer.

Ein über eine Meldung freigegebenes Bier kommt nie zusätzlich in `research/*.json` (sonst steht es doppelt im Katalog).

## Lücken füllen (Nachrecherche)
Brauereien ohne Bier nachrecherchieren wie in `tools/catalog/research/README.md` (V12): Arbeitsliste aus der Live-API
(veröffentlichte Brauereien ohne veröffentlichtes Bier) minus Einträge, die nicht `unclear` sind; Rechercheure in
Batches, danach ein Faktencheck, der jede Beleg-URL neu öffnet. Beleg-URLs als https-Adresse nach Weiterleitungen (fremder Host über
http zählt nicht – der Build listet solche Einträge); Dubletten eines anderen Katalog-Eintrags → Status `duplicate` mit
Beleg und der anderen id in `note`; gar keine Brauerei (Denkmal, Firmensitz) → `not-a-brewery` mit Beleg; Biere, die eine offene
Datenbank fälschlich zuordnet → Feld `wrong` mit https-Seite der richtigen Brauerei (V17). Ablauf und Quellen der zweiten Runde (BeerTasting, Untappd, Lohnbrauerei-Regel):
`tools/catalog/research/README.md` (V16). Einträge in `dach.json` ersetzen (eine id je Datei
und über alle Dateien), `checked` = heute, `stage` = Modell bzw. Durchgang. Prüfen: `npx vitest run tools/catalog/research.test.ts`.
Live wird das erst mit dem Katalog-Import (`catalog-import.yml`, Freigabe des Maintainers) – nie selbst auslösen.
