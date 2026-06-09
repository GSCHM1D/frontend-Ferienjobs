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
   Neue Admin-Funktionen – Backend muss action "edit"
   im Google Apps Script implementieren.
   ===================================================== */

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
