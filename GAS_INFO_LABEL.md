# Backend: Info-Labels für Job-Inserate (info-label)

Admins können im Bearbeiten-Modal zu jedem Feld einen kurzen Info-Text
hinterlegen. Im öffentlichen Inserat erscheint dann ein kleines graues ⓘ
neben dem Feld; ein Klick öffnet eine Textblase mit dem Inhalt.

Alle Info-Texte werden zusammen in **einer** Spalte als JSON gespeichert –
so braucht es keine eigene Spalte pro Feld.

Beispiel-Inhalt der Zelle:

```json
{"salary":"Zuschlag ab 18 Jahren","location":"Direkt beim Bahnhof"}
```

---

## 1. Google Sheet: eine neue Spalte

Im **Jobs**-Sheet in Zelle **U1** den Header `infoLabels` eintragen.
(U ist frei – O/P/Q gehören zu delete-jobs, R/S/T zur Karte.)

Bestehende Inserate bleiben leer = kein Icon. Nichts geht kaputt.

## 2. `getAllJobs` erweitern

Im `jobs.push({ ... })` eine Zeile ergänzen:

```javascript
      status: row[13],
      infoLabels: row[20] || ""    // U: Info-Labels als JSON-String
```

Falls `adminList` (delete-jobs) im Einsatz ist: dort dieselbe Zeile ergänzen.

## 3. `editJob` erweitern (Admin speichert die Info-Texte)

In `editJob` das `fields`-Array um `infoLabels` erweitern **und** das Feld
separat in Spalte U schreiben (es liegt nicht im zusammenhängenden Block C–M):

```javascript
      var fields = [
        "company", "title", "category", "location", "contact",
        "salary", "requirements", "date_from", "date_to",
        "specific_or_not", "description"
      ];

      for (var j = 0; j < fields.length; j++) {
        if (data[fields[j]] !== undefined) {
          sheet.getRange(r, j + 3).setValue(cleanInput(data[fields[j]]));
        }
      }

      /* NEU: Info-Labels (JSON-String) in Spalte U.
         Bewusst OHNE cleanInput: das JSON beginnt mit "{" und würde
         von sanitizeForSheet nicht verändert, aber wir prüfen es
         stattdessen auf Gültigkeit und Länge. */
      if (data.infoLabels !== undefined) {
        var labels = String(data.infoLabels || "").slice(0, 2000);
        if (labels) {
          try { JSON.parse(labels); }        // nur gültiges JSON speichern
          catch (err) { labels = ""; }
        }
        sheet.getRange(r, 21).setValue(labels);   // Spalte U
      }
```

## 4. Deployen

**Bereitstellen → Bereitstellungen verwalten → ✏️ → Version „Neue Version"
→ Bereitstellen** (nicht „Neue Bereitstellung").

---

## Sicherheit

Die Info-Texte werden im Frontend **immer** mit `textContent` gesetzt –
niemals als HTML. Selbst wenn jemand HTML oder ein `<script>` in das
Info-Feld schreiben würde, erschiene es als reiner Text in der Blase.
Zusätzlich sind die Texte auf 300 Zeichen pro Feld begrenzt.
