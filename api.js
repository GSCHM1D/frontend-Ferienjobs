const API_URL = "https://script.google.com/macros/s/AKfycbxsh5hGxHyU_i-EK01nk2_VYV8ZiRXltKSPB25-WEpBx3rvGULqDZEdHYQtNc1cRnmRFg/exec";

/* =========================
   ALLE JOBS LADEN
========================= */
async function getJobs() {
    const response = await fetch(`${API_URL}?action=list`);
    const data = await response.json();
    return data;
}

/* =========================
   NEUEN JOB ERSTELLEN
========================= */
async function createJob(jobData) {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "text/plain"
        },
        body: JSON.stringify({
            action: "create",
            ...jobData
        })
    });

    return await response.json();
}

/* =========================
   JOB VERIFIZIEREN
========================= */
async function verifyJob(id, adminKey) {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "text/plain"
        },
        body: JSON.stringify({
            action: "verify",
            id: id,
            adminKey: adminKey
        })
    });

    return await response.json();
}

/* =========================
   JOB LÖSCHEN
========================= */
async function deleteJob(id, adminKey) {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "text/plain"
        },
        body: JSON.stringify({
            action: "delete",
            id: id,
            adminKey: adminKey
        })
    });

    return await response.json();
}
