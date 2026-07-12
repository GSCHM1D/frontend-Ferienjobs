# Backend: Geocoding für die Ferienjob-Karte (location-map)

Die Karte funktioniert **sofort auch ohne diese Backend-Änderungen**: Das
Frontend hat eine eingebaute Orts-/PLZ-Tabelle (Fokus Region Aargau + grosse
Schweizer Städte) und platziert Inserate damit auf Ortsebene.

Die Backend-Änderungen machen die Karte aber **vollständig und präzis**: Beim
Erstellen eines Inserats wird der Ort **einmalig** in Koordinaten umgewandelt
(Geocoding via OpenStreetMap/Nominatim) und im Sheet gespeichert — genau wie
in der Spezifikation („Die Umwandlung sollte beim Erstellen erfolgen und nicht
bei jedem Öffnen der Karte").

---

## 1. Google Sheet: drei neue Spalten

Im **Jobs**-Sheet ergänzen (R/S/T — kollidiert nicht mit den
delete-jobs-Spalten O/P/Q):

- **R1**: `lat`
- **S1**: `lng`
- **T1**: `geoStatus` — `city` (Ortsebene), `exact` (exakte Adresse),
  `failed` (nicht gefunden) oder leer (noch nicht geocodiert)

> Hinweis Privatsphäre: Das Frontend verschiebt jeden Marker leicht (~±350 m),
> **ausser** `geoStatus` ist `exact`. Trage `exact` nur von Hand ein, wenn ein
> Unternehmen die exakte Geschäftsadresse öffentlich zeigen will. Standard ist
> `city` — nie eine private Wohnadresse exakt anzeigen.

## 2. Geocoding-Funktion ans Ende des Scripts kopieren

```javascript
/* =========================
   GEOCODING (OpenStreetMap / Nominatim)
   Wandelt "Ort / PLZ" einmalig in Koordinaten um.
   Cache verhindert doppelte Anfragen für denselben Ort.
========================= */
function geocodeLocation(locationText) {
  var q = String(locationText || "").trim();
  if (!q) return null;

  var cache = CacheService.getScriptCache();
  var key = "geo_" + q.toLowerCase().replace(/\s+/g, "_").slice(0, 90);
  var cached = cache.get(key);
  if (cached) {
    try { return JSON.parse(cached); } catch (e) {}
  }

  try {
    var url = "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ch&q="
      + encodeURIComponent(q);
    var resp = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      headers: { "User-Agent": "holidayjob.ch Geocoder (holidayjob.ch@gmail.com)" }
    });
    if (resp.getResponseCode() !== 200) return null;
    var results = JSON.parse(resp.getContentText());
    if (!Array.isArray(results) || results.length === 0) return null;

    var out = { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
    cache.put(key, JSON.stringify(out), 21600); /* 6 h Cache */
    return out;
  } catch (err) {
    console.error("Geocoding fehlgeschlagen: " + err);
    return null;
  }
}
```

## 3. `createJob` erweitern (nach dem `appendRow`)

Direkt **nach** dem `sheet.appendRow([...])`-Block einfügen:

```javascript
  /* Einmaliges Geocoding des Orts (Spalten R/S/T).
     Fehler dürfen das Erstellen nie blockieren. */
  try {
    var lastRow = sheet.getLastRow();
    var geo = geocodeLocation(data.location);
    if (geo) {
      sheet.getRange(lastRow, 18).setValue(geo.lat);   // R
      sheet.getRange(lastRow, 19).setValue(geo.lng);   // S
      sheet.getRange(lastRow, 20).setValue("city");    // T
    } else {
      sheet.getRange(lastRow, 20).setValue("failed");  // Admin kann manuell korrigieren
    }
  } catch (e) {
    console.error("Geocoding-Hook: " + e);
  }
```

> `failed` = „Standort konnte nicht eindeutig bestimmt werden". Der Admin
> korrigiert das direkt im Sheet: lat/lng von Hand eintragen (z. B. von
> https://www.openstreetmap.org kopieren) und `geoStatus` auf `city` setzen.
> Das Inserat erscheint trotzdem in der Liste — nur ohne Kartenmarker
> (bzw. mit Marker aus der Frontend-Fallback-Tabelle, falls der Ort bekannt ist).

## 4. `getAllJobs` erweitern (Koordinaten mitgeben)

Im `jobs.push({ ... })` von `getAllJobs` drei Felder ergänzen:

```javascript
      status: row[13],
      lat: row[17] || "",        // R
      lng: row[18] || "",        // S
      geoStatus: row[19] || ""   // T
      /* Niemals row[14] (deleteToken) mitgeben! */
```

Falls du `adminList` (delete-jobs) im Einsatz hast: dort dieselben drei
Zeilen ergänzen.

## 5. Bestehende Inserate nachträglich geocodieren (einmalig)

Diese Funktion einfügen und **einmal manuell im Editor ausführen** — sie
arbeitet alle Zeilen ohne Koordinaten ab (mit Pause, um die
Nominatim-Nutzungsregeln von max. 1 Anfrage/Sekunde einzuhalten):

```javascript
function backfillGeocodes() {
  var sheet = getSheet();
  var rows = sheet.getDataRange().getValues();
  var done = 0;
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    if (rows[i][17] && rows[i][18]) continue;   // hat schon Koordinaten
    var geo = geocodeLocation(rows[i][5]);      // Spalte F: location
    if (geo) {
      sheet.getRange(i + 1, 18).setValue(geo.lat);
      sheet.getRange(i + 1, 19).setValue(geo.lng);
      sheet.getRange(i + 1, 20).setValue("city");
      done++;
    } else {
      sheet.getRange(i + 1, 20).setValue("failed");
    }
    Utilities.sleep(1100); /* Nominatim: max ~1 Anfrage pro Sekunde */
  }
  console.log("Geocodiert: " + done + " Inserate");
}
```

Beim ersten Ausführen erscheint der bekannte Berechtigungsdialog
(„Verbindung mit externem Dienst" für `UrlFetchApp`) — bewilligen.
Falls die KI-Suche (ai-work) schon läuft, ist diese Berechtigung
bereits erteilt.

## 6. Deployen

Wie immer: **Bereitstellen → Bereitstellungen verwalten → ✏️ →
Version „Neue Version" → Bereitstellen** (nicht „Neue Bereitstellung").

---

## Was das Frontend macht (bereits umgesetzt)

- **Liste | Karte**-Umschalter im Kopf der Jobsektion; Leaflet +
  Marker-Clustering werden erst beim ersten Kartenwechsel geladen
  (lokal aus `vendor/leaflet/`, kein CDN).
- Koordinaten-Priorität: Backend (`lat`/`lng`) → eingebaute
  Orts-/PLZ-Tabelle → kein Marker (Zähler zeigt „X Inserate ohne
  erkennbaren Standort").
- Jeder Marker wird leicht verschoben (~±350 m, stabil pro Inserat),
  ausser `geoStatus` = `exact` → keine exakten Privatadressen.
- Ortssuche (Nominatim, live), Radiusfilter mit Kreis (2–50 km / alle),
  „Jobs in meiner Nähe" (Geolocation nur für die aktuelle Suche, wird
  nie gespeichert oder übertragen), Kategorie-Chips (Mehrfachauswahl),
  Zeitraumfilter (heute / Woche / Wochenende / Ferien-Presets /
  eigener Zeitraum — Feriendaten in map.js als markierter Platzhalter).
- Popup-Kurzvorschau (Titel, Firma, Ort, Zeitraum, Lohn, Kategorie) mit
  „Inserat ansehen" → springt zur Job-Card in der Liste und lässt sie
  aufblitzen.
- Filter werden bewusst **nicht** gespeichert (weder Browser noch URL).
- Dauerhaft/flexibel-Inserate erscheinen bei jedem Zeitraumfilter.
