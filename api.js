const API_URL = "https://script.google.com/macros/s/AKfycby8KH5USSA2NUk35Pq_r-sECj1lBOhD_M7uweC4_kv3FD9X9gZDnk50uogBw_sXiZLG/exec";

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
   ADMIN LOGIN (Multi-User)
========================= */
async function adminLogin(username, passwordHash) {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "adminLogin", username, passwordHash })
    });
    if (!response.ok) throw new Error(`API-Fehler: ${response.status}`);
    return await response.json();
}

/* =========================
   ADMIN-NUTZER LADEN
========================= */
async function getAdminUsers(adminKey) {
    const response = await fetch(`${API_URL}?action=getAdminUsers&adminKey=${encodeURIComponent(adminKey)}`);
    if (!response.ok) throw new Error(`API-Fehler: ${response.status}`);
    return await response.json();
}

/* =========================
   ADMIN ERSTELLEN
========================= */
async function createAdminUser(adminKey, newUser) {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "createAdminUser", adminKey, ...newUser })
    });
    if (!response.ok) throw new Error(`API-Fehler: ${response.status}`);
    return await response.json();
}

/* =========================
   ADMIN LÖSCHEN
========================= */
async function deleteAdminUser(adminKey, targetUsername) {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "deleteAdminUser", adminKey, targetUsername })
    });
    if (!response.ok) throw new Error(`API-Fehler: ${response.status}`);
    return await response.json();
}

/* =========================
   PROFIL AKTUALISIEREN
========================= */
async function updateAdminProfile(username, passwordHash, updates) {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "updateAdminProfile", username, passwordHash, ...updates })
    });
    if (!response.ok) throw new Error(`API-Fehler: ${response.status}`);
    return await response.json();
}
