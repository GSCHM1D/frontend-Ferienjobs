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
