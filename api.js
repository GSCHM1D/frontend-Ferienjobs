const isLocal =
    window.location.hostname === "localhost" || 
    window.location.hostname === "127.0.0.1";

const API_URL = isLocal
    ? "https://script.google.com/macros/s/AKfycbxhmOXxHqvpaSuzluHNV1miNmTt5S2lVU32wnwwRdK82RQV30ucTRzuQC-dUW7IdgAaTg/exec"
    : "https://script.google.com/macros/s/AKfycby8KH5USSA2NUk35Pq_r-sECj1lBOhD_M7uweC4_kv3FD9X9gZDnk50uogBw_sXiZLG/exec";


/* =========================
   ALLE JOBS LADEN
========================= */
async function getJobs() {
    const response = await fetch(`${API_URL}?action=list`);
    if (!response.ok) throw new Error(`API-Fehler: ${response.status}`);
    return await response.json();
}

/* =========================
   NEUEN JOB ERSTELLEN
========================= */
async function createJob(jobData) {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "text/plain" // text/plain als CORS-Workaround für Google Apps Script
        },
        body: JSON.stringify({
            action: "create",
            ...jobData
        })
    });
    if (!response.ok) throw new Error(`API-Fehler: ${response.status}`);
    return await response.json();
}

/* =========================
   JOB VERIFIZIEREN
========================= */
async function verifyJob(id, adminKey) {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "text/plain" // text/plain als CORS-Workaround für Google Apps Script
        },
        body: JSON.stringify({
            action: "verify",
            id: id,
            adminKey: adminKey
        })
    });
    if (!response.ok) throw new Error(`API-Fehler: ${response.status}`);
    return await response.json();
}

/* =========================
   JOB LÖSCHEN
========================= */
async function deleteJob(id, adminKey) {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "text/plain" // text/plain als CORS-Workaround für Google Apps Script
        },
        body: JSON.stringify({
            action: "delete",
            id: id,
            adminKey: adminKey
        })
    });
    if (!response.ok) throw new Error(`API-Fehler: ${response.status}`);
    return await response.json();
}

/* =====================================================
   HIER ADMIN ACTIONS NEW
   Neue Admin-Funktionen – Backend muss die folgenden
   actions im Google Apps Script implementieren:
     action "edit"     → Job-Felder bearbeiten
     action "checkKey" → Schlüssel validieren,
                         gibt {success:true} oder {success:false} zurück
   ===================================================== */

/* =========================
   ADMIN KEY PRÜFEN
========================= */
async function checkAdminKey(adminKey) {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "text/plain" // text/plain als CORS-Workaround für Google Apps Script
        },
        body: JSON.stringify({
            action: "checkKey",
            adminKey: adminKey
        })
    });
    if (!response.ok) throw new Error(`API-Fehler: ${response.status}`);
    return await response.json();
}

/* =========================
   SPONSOR ANFRAGE SENDEN
========================= */
async function createSponsor(sponsorData) {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "createSponsor", ...sponsorData })
    });
    if (!response.ok) throw new Error(`API-Fehler: ${response.status}`);
    return await response.json();
}

/* =========================
   ALLE SPONSOREN LADEN (Admin)
========================= */
async function getSponsors(adminKey) {
    const response = await fetch(`${API_URL}?action=getSponsors&adminKey=${encodeURIComponent(adminKey)}`);
    if (!response.ok) throw new Error(`API-Fehler: ${response.status}`);
    return await response.json();
}

/* =========================
   OEFFENTLICHE SPONSOREN
========================= */
async function getPublicSponsors() {
    const response = await fetch(`${API_URL}?action=getPublicSponsors`);
    if (!response.ok) throw new Error(`API-Fehler: ${response.status}`);
    return await response.json();
}

/* =========================
   SPONSOR GENEHMIGEN
========================= */
async function approveSponsor(id, adminKey) {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "approveSponsor", id: id, adminKey: adminKey })
    });
    if (!response.ok) throw new Error(`API-Fehler: ${response.status}`);
    return await response.json();
}

/* =========================
   SPONSOR LOESCHEN
========================= */
async function deleteSponsor(id, adminKey) {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "deleteSponsor", id: id, adminKey: adminKey })
    });
    if (!response.ok) throw new Error(`API-Fehler: ${response.status}`);
    return await response.json();
}

/* =========================
   JOB BEARBEITEN
========================= */
async function editJob(id, adminKey, jobData) {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "text/plain" // text/plain als CORS-Workaround für Google Apps Script
        },
        body: JSON.stringify({
            action: "edit",
            id: id,
            adminKey: adminKey,
            ...jobData
        })
    });
    if (!response.ok) throw new Error(`API-Fehler: ${response.status}`);
    return await response.json();
}


/* ═════════════════════════════════════════════════
   SELBSTVERWALTUNG VON INSERATEN (delete-jobs)
   Der deleteToken wird beim Erstellen einmalig
   zurückgegeben und danach nur noch serverseitig
   verglichen – nie wieder ausgeliefert.
═════════════════════════════════════════════════ */

/* =========================
   INSERAT PER TOKEN LADEN
========================= */
async function manageGetJob(id, token) {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" }, // CORS-Workaround für Google Apps Script
        body: JSON.stringify({ action: "manageGetJob", id: id, token: token })
    });
    if (!response.ok) throw new Error(`API-Fehler: ${response.status}`);
    return await response.json();
}

/* =========================
   INSERAT PER TOKEN LÖSCHEN
========================= */
async function manageDeleteJob(id, token) {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "manageDeleteJob", id: id, token: token })
    });
    if (!response.ok) throw new Error(`API-Fehler: ${response.status}`);
    return await response.json();
}

/* =========================
   INSERAT PER TOKEN BEARBEITEN
========================= */
async function manageEditJob(id, token, jobData) {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "manageEditJob", id: id, token: token, ...jobData })
    });
    if (!response.ok) throw new Error(`API-Fehler: ${response.status}`);
    return await response.json();
}
