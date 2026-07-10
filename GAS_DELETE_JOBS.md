# Backend-Änderungen: Inserate selbst verwalten (delete-jobs)

Das Frontend ist fertig verkabelt. Damit es funktioniert, braucht das
Google Apps Script drei Dinge: eine neue Spalte, Anpassungen an zwei
bestehenden Funktionen und drei neue Actions.

Das Sicherheitsmuster entspricht der Supabase-Skizze, übersetzt auf
Google Sheets: Der `deleteToken` wird beim Erstellen einmalig
zurückgegeben, danach **nie mehr ausgeliefert** – `list` gibt ihn nicht
mit, und die Manage-Actions vergleichen ihn nur serverseitig.

---

## 1. Google Sheet: neue Spalte

Im **Jobs**-Sheet in Zelle **O1** den Header `deleteToken` eintragen.
Bestehende Inserate haben keinen Token – sie sind weiterhin nur über das
Admin-Panel lösch-/bearbeitbar. Alle neuen Inserate bekommen automatisch einen.

| A | B | C | D | E | F | G | H | I | J | K | L | M | N | **O (neu)** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| id | createdAt | company | title | category | location | contact | salary | requirements | date_from | date_to | specific_or_not | description | status | **deleteToken** |

---

## 2. `createJob` anpassen

Am Ende der bestehenden `createJob`-Funktion das `appendRow` und das
`return` ersetzen durch:

```javascript
  const sheet = getSheet();
  const id = String(new Date().getTime());
  const createdAt = new Date();
  const deleteToken = Utilities.getUuid();   // NEU

  sheet.appendRow([
    id,
    createdAt,
    cleanInput(data.company),
    cleanInput(data.title),
    cleanInput(data.category),
    cleanInput(data.location),
    cleanInput(data.contact),
    cleanInput(data.salary),
    cleanInput(data.requirements),
    cleanInput(data.date_from),
    cleanInput(data.date_to),
    cleanInput(data.specific_or_not),
    cleanInput(data.description),
    "unverified",
    deleteToken                              // NEU: Spalte O
  ]);

  /* NEU: Verwaltungslink per Mail, falls der Kontakt eine E-Mail ist.
     (Telefonnummern: kein Versand möglich – das Frontend zeigt den Link
     nach dem Erstellen einmalig an und bittet, ihn zu sichern.) */
  var contact = String(data.contact || "").trim();
  var isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
  var emailSent = false;

  if (isEmail) {
    try {
      var manageUrl = "https://holidayjob.ch/manage.html?id=" + id + "&token=" + deleteToken;
      MailApp.sendEmail({
        to: contact,
        subject: "Dein Inserat auf holidayjob.ch – Verwaltungslink",
        htmlBody:
          "<p>Danke für dein Inserat <b>" + cleanInput(data.title) + "</b> auf holidayjob.ch!</p>" +
          "<p>Mit diesem persönlichen Link kannst du dein Inserat jederzeit bearbeiten oder löschen:</p>" +
          "<p><a href=\"" + manageUrl + "\">" + manageUrl + "</a></p>" +
          "<p>Bitte bewahre den Link sicher auf und gib ihn nicht weiter – " +
          "jeder mit diesem Link kann dein Inserat verändern.</p>" +
          "<p>– dein holidayjob.ch Team</p>"
      });
      emailSent = true;
    } catch (e) {
      /* Mailversand darf das Erstellen nie blockieren */
    }
  }

  return {
    success: true,
    message: "Job erstellt",
    id: id,                    // NEU
    deleteToken: deleteToken,  // NEU – einzige Stelle, an der der Token rausgeht
    emailSent: emailSent       // NEU
  };
```

> Hinweis: `MailApp` hat bei privaten Google-Konten ein Tageslimit
> (~100 Mails/Tag). Für euer Volumen reicht das locker.

---

## 3. `getAllJobs` anpassen (gelöschte ausblenden, Token NIE mitgeben)

In der Schleife von `getAllJobs` als erste Zeile ergänzen:

```javascript
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];

    if (row[13] === "deleted") continue;   // NEU: Soft-Delete ausblenden

    jobs.push({
      id: String(row[0]),
      // ... bestehende Felder unverändert ...
      status: row[13]
      // WICHTIG: row[14] (deleteToken) hier NIEMALS mit ausgeben!
    });
  }
```

---

## 4. Drei neue Actions in `doPost`

Vor dem abschliessenden `return jsonResponse({ success:false, ... })`
in `doPost` einfügen:

```javascript
  /* ── Inserat-Selbstverwaltung: Hilfsfunktion ──
     Findet die Zeile nur, wenn id UND Token übereinstimmen.
     Der Vergleich passiert ausschliesslich hier auf dem Server. */
  function findRowByIdAndToken(sheet, id, token) {
    if (!id || !token) return -1;
    const rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(id) &&
          String(rows[i][14]) === String(token) &&
          rows[i][13] !== "deleted") {
        return i + 1;  // 1-basierte Sheet-Zeile
      }
    }
    return -1;
  }

  if (action === "manageGetJob") {
    const sheet = getSheet();
    const r = findRowByIdAndToken(sheet, data.id, data.token);
    if (r === -1) return jsonResponse({ success: false, message: "Ungültiger Link" });

    const row = sheet.getRange(r, 1, 1, 14).getValues()[0];
    return jsonResponse({
      success: true,
      job: {
        id: String(row[0]),
        company: row[2],
        title: row[3],
        category: row[4],
        location: row[5],
        contact: row[6],
        salary: row[7],
        requirements: row[8],
        date_from: row[9],
        date_to: row[10],
        specific_or_not: row[11],
        description: row[12],
        status: row[13]
        /* deleteToken wird bewusst NICHT zurückgegeben */
      }
    });
  }

  if (action === "manageDeleteJob") {
    const sheet = getSheet();
    const r = findRowByIdAndToken(sheet, data.id, data.token);
    if (r === -1) return jsonResponse({ success: false, message: "Ungültiger Link" });

    /* Soft-Delete: Zeile bleibt als Audit-Spur im Sheet, verschwindet
       aber aus der öffentlichen Liste (siehe getAllJobs-Filter). */
    sheet.getRange(r, 14).setValue("deleted");
    return jsonResponse({ success: true, message: "Inserat gelöscht" });
  }

  if (action === "manageEditJob") {
    const sheet = getSheet();
    const r = findRowByIdAndToken(sheet, data.id, data.token);
    if (r === -1) return jsonResponse({ success: false, message: "Ungültiger Link" });

    /* Dieselben Validierungen wie beim Erstellen lohnen sich auch hier –
       mindestens die Pflichtfelder: */
    if (!data.title || !String(data.title).trim())     return jsonResponse({ success:false, message:"Jobtitel fehlt" });
    if (!data.company || !String(data.company).trim()) return jsonResponse({ success:false, message:"Firmenname fehlt" });
    if (String(data.title).length > 30)                return jsonResponse({ success:false, message:"Titel zu lang" });
    if (String(data.description || "").length > 500)   return jsonResponse({ success:false, message:"Beschreibung zu lang" });

    var fields = ["company","title","category","location","contact","salary",
                  "requirements","date_from","date_to","specific_or_not","description"];
    for (var j = 0; j < fields.length; j++) {
      if (data[fields[j]] !== undefined) {
        sheet.getRange(r, j + 3).setValue(cleanInput(data[fields[j]]));
      }
    }

    /* Nach Bearbeitung erneut prüfen lassen */
    sheet.getRange(r, 14).setValue("unverified");

    return jsonResponse({ success: true, message: "Inserat aktualisiert" });
  }
```

---

## 5. Sicherheits-Checkliste (aus der Architektur-Skizze übernommen)

- ✅ Token wird **nur einmal** zurückgegeben (Insert-Response + optional Mail)
- ✅ `list` liefert den Token **nie** aus (Spalte O wird nicht gemappt)
- ✅ Vergleich passiert **nur serverseitig** in den `manage*`-Actions
- ✅ Löschen ist **Soft-Delete** (`status = "deleted"`), Audit-Spur bleibt
- ✅ Manage-Seite löscht **nie beim Laden**, nur nach explizitem Klick
  (Schutz vor Mail-Link-Vorschauen)
- ✅ `manage.html` hat `noindex, nofollow`
- ⚠️ Token steht in der URL → landet in Browser-History. Für dieses
  Bedrohungsmodell (Ferienjob-Inserate) akzeptabel und bewusst so gewählt,
  weil es ohne Login-System auskommt.

## Was das Frontend bereits macht

- `index.html`/`app.js`: Nach dem Veröffentlichen erscheint ein grünes Panel
  mit dem Verwaltungslink + Kopieren-Button. Text passt sich an, je nachdem
  ob das Backend `emailSent: true` meldet. Gibt das Backend (noch) keinen
  Token zurück, erscheint wie bisher nur „Job erfolgreich veröffentlicht."
  – nichts geht kaputt.
- `manage.html?id=…&token=…`: lädt das Inserat über `manageGetJob`,
  bietet Bearbeiten (Formular, danach Status „Wird geprüft") und Löschen
  (mit Bestätigungsdialog) an. Ungültige Links zeigen eine Fehlerseite.

---

# UPDATE 2: Edit-Moderation + Lösch-Mitteilungen

Bearbeitungen über den Verwaltungslink gehen nicht mehr direkt live.
Sie warten als Vorschlag in **Spalte P**, bis das Admin-Panel sie freigibt —
öffentlich bleibt bis dahin die alte Version, und der Status (verified/
unverified) bleibt beim Freigeben unverändert erhalten.

## 1. Sheet: zwei neue Spalten

Im **Jobs**-Sheet ergänzen:
- **P1**: `pendingEdit` (JSON des Änderungs-Vorschlags)
- **Q1**: `deletedAt` (Zeitstempel bei Löschung durch den Inserenten —
  Basis für die Mitteilungen im Admin-Panel; Admin-Löschungen setzen das NICHT)

## 2. `manageEditJob` ERSETZEN (Vorschlag statt Direkt-Schreiben)

```javascript
  if (action === "manageEditJob") {
    const sheet = getSheet();
    const r = findRowByIdAndToken(sheet, data.id, data.token);
    if (r === -1) return jsonResponse({ success: false, message: "Ungültiger Link" });

    if (!data.title || !String(data.title).trim())     return jsonResponse({ success:false, message:"Jobtitel fehlt" });
    if (!data.company || !String(data.company).trim()) return jsonResponse({ success:false, message:"Firmenname fehlt" });
    if (String(data.title).length > 30)                return jsonResponse({ success:false, message:"Titel zu lang" });
    if (String(data.description || "").length > 500)   return jsonResponse({ success:false, message:"Beschreibung zu lang" });
    if (String(data.salary || "").length > 25)         return jsonResponse({ success:false, message:"Lohnangaben zu lang" });
    if (data.specific_or_not === "Spezifisch" && (!data.date_from || !data.date_to)) {
      return jsonResponse({ success:false, message:"Von- und Bis-Datum fehlen" });
    }

    /* Vorschlag als JSON in Spalte P ablegen — Live-Daten (C–M) und
       Status (N) bleiben UNVERÄNDERT, bis das Admin-Panel freigibt.
       Ein erneutes Einreichen überschreibt den offenen Vorschlag. */
    var fields = ["company","title","category","location","contact","salary",
                  "requirements","date_from","date_to","specific_or_not","description"];
    var proposal = { requestedAt: new Date().toISOString() };
    for (var j = 0; j < fields.length; j++) {
      if (data[fields[j]] !== undefined) {
        proposal[fields[j]] = String(stripControls(data[fields[j]]));
      }
    }
    sheet.getRange(r, 16).setValue(JSON.stringify(proposal));   // Spalte P

    return jsonResponse({ success: true, message: "Änderung eingereicht – wird geprüft" });
  }
```

## 3. `manageDeleteJob` ERSETZEN (Zeitstempel für Mitteilung)

```javascript
  if (action === "manageDeleteJob") {
    const sheet = getSheet();
    const r = findRowByIdAndToken(sheet, data.id, data.token);
    if (r === -1) return jsonResponse({ success: false, message: "Ungültiger Link" });

    sheet.getRange(r, 14).setValue("deleted");
    sheet.getRange(r, 17).setValue(new Date());   // Spalte Q: Signal fürs Admin-Panel
    return jsonResponse({ success: true, message: "Inserat gelöscht" });
  }
```

## 4. `manageGetJob`: eine Zeile ergänzen

Im zurückgegebenen `job`-Objekt zusätzlich (Zeile mit `status: row[13]` erweitern):

```javascript
        status: row[13],
        hasPendingEdit: String(sheet.getRange(r, 16).getValue() || "") !== ""
```

## 5. NEUE doGet-Action: `adminList`

Vor dem abschliessenden `return` in `doGet` einfügen (liefert dem Admin-Panel
alles: auch gelöschte Zeilen und die Vorschläge — aber NIE den Token):

```javascript
  if (action === "adminList") {
    var adminCheck = checkAdminKey(e.parameter.adminKey);
    if (!adminCheck.success) return jsonResponse(adminCheck);

    var sheet = getSheet();
    var rows = sheet.getDataRange().getValues();
    var jobs = [];
    for (var i = 1; i < rows.length; i++) {
      if (!rows[i][0]) continue;
      var pendingEdit = null;
      if (rows[i][15]) {
        try { pendingEdit = JSON.parse(rows[i][15]); } catch (err) { pendingEdit = null; }
      }
      jobs.push({
        id: String(rows[i][0]),
        createdAt: rows[i][1],
        company: rows[i][2], title: rows[i][3], category: rows[i][4],
        location: rows[i][5], contact: rows[i][6], salary: rows[i][7],
        requirements: rows[i][8], date_from: rows[i][9], date_to: rows[i][10],
        specific_or_not: rows[i][11], description: rows[i][12],
        status: rows[i][13],
        pendingEdit: pendingEdit,          // Spalte P (geparst)
        deletedAt: rows[i][16] || ""       // Spalte Q
        /* rows[i][14] (deleteToken) NIEMALS ausgeben */
      });
    }
    return jsonResponse(jobs);
  }
```

## 6. NEUE doPost-Actions: `approveJobEdit` / `rejectJobEdit`

Vor dem abschliessenden `return` in `doPost` einfügen:

```javascript
  if (action === "approveJobEdit") {
    var adminCheck = checkAdminKey(data.adminKey);
    if (!adminCheck.success) return jsonResponse(adminCheck);

    var sheet = getSheet();
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(data.id)) {
        var raw = rows[i][15];
        if (!raw) return jsonResponse({ success: false, message: "Kein Vorschlag vorhanden" });
        var proposal;
        try { proposal = JSON.parse(raw); }
        catch (err) { return jsonResponse({ success: false, message: "Vorschlag unlesbar" }); }

        /* Vorschlag in die Live-Spalten C–M übernehmen.
           Status (Spalte N) bleibt UNVERÄNDERT — verified bleibt
           verified, unverified bleibt unverified. */
        var fields = ["company","title","category","location","contact","salary",
                      "requirements","date_from","date_to","specific_or_not","description"];
        for (var j = 0; j < fields.length; j++) {
          if (proposal[fields[j]] !== undefined) {
            sheet.getRange(i + 1, j + 3).setValue(cleanInput(proposal[fields[j]]));
          }
        }
        sheet.getRange(i + 1, 16).setValue("");   // Vorschlag löschen
        return jsonResponse({ success: true, message: "Änderung übernommen" });
      }
    }
    return jsonResponse({ success: false, message: "Job nicht gefunden" });
  }

  if (action === "rejectJobEdit") {
    var adminCheck = checkAdminKey(data.adminKey);
    if (!adminCheck.success) return jsonResponse(adminCheck);

    var sheet = getSheet();
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(data.id)) {
        sheet.getRange(i + 1, 16).setValue("");   // Vorschlag verwerfen, Live bleibt
        return jsonResponse({ success: true, message: "Vorschlag abgelehnt" });
      }
    }
    return jsonResponse({ success: false, message: "Job nicht gefunden" });
  }
```

## Was das Frontend macht (bereits umgesetzt)

- **manage.html**: Nach dem Speichern heisst es „Änderung eingereicht – bisherige
  Version bleibt online"; der Status-Pill ändert sich nicht mehr. Läuft schon
  ein Vorschlag, wird das beim Öffnen angezeigt.
- **Admin-Panel**: Jobs mit Vorschlag bekommen einen gelben „Änderung ausstehend"-
  Block mit Alt→Neu-Vergleich (nur geänderte Felder) und Buttons „Änderung
  übernehmen" / „Ablehnen"; neuer Filter-Tab „Änderungen"; der Jobs-Badge zählt
  unverifizierte + offene Vorschläge. Vom Inserenten gelöschte Jobs (Spalte Q
  gesetzt) erscheinen oben als rote, wegdrückbare Mitteilung (Wegdrücken wird
  lokal im Browser gemerkt).
- **Fallback**: Kennt das Backend `adminList` noch nicht, lädt das Panel wie
  bisher die öffentliche Liste — nichts geht kaputt, nur Moderation/Mitteilungen
  fehlen dann.
