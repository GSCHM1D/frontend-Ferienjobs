const adminKeyInput = document.getElementById("admin-key");
const loadAdminJobsButton = document.getElementById("load-admin-jobs");
const adminJobList = document.getElementById("admin-job-list");
const adminLoadingOverlay = document.getElementById("admin-loading-overlay");

let adminJobs = [];
let isAdminActionRunning = false;

/* =========================
   LOADING
========================= */
function showAdminLoading(message = "Aktion wird ausgeführt...") {
    const text = adminLoadingOverlay.querySelector("p");
    if (text) {
        text.textContent = message;
    }
    adminLoadingOverlay.classList.remove("hidden");
}

function hideAdminLoading() {
    adminLoadingOverlay.classList.add("hidden");
}

function setAdminPageDisabled(disabled) {
    const elements = document.querySelectorAll("#admin-key, #load-admin-jobs, .verify-btn, .delete-btn");
    elements.forEach(element => {
        element.disabled = disabled;
    });
}

/* =========================
   JOBS LADEN
========================= */
async function loadAdminJobs() {
    const result = await getJobs();

    if (!Array.isArray(result)) {
        alert("Jobs konnten nicht geladen werden.");
        console.error("Unerwartete Antwort beim Laden:", result);
        adminJobs = [];
        renderAdminJobs();
        return;
    }

    adminJobs = result;
    renderAdminJobs();
}

/* =========================
   JOBS ANZEIGEN
========================= */

/* Sichere DOM-Hilfsfunktion (verhindert XSS, weil textContent statt innerHTML) */
function adminEl(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text != null) element.textContent = text;
    return element;
}

function adminLabeledRow(label, value) {
    const p = document.createElement("p");
    const strong = document.createElement("strong");
    strong.textContent = label + ":";
    p.appendChild(strong);
    p.appendChild(document.createTextNode(" " + (value == null ? "" : String(value))));
    return p;
}

function renderAdminJobs() {
    adminJobList.innerHTML = "";

    if (adminJobs.length === 0) {
        adminJobList.appendChild(adminEl("p", null, "Keine Jobs vorhanden."));
        return;
    }

    adminJobs.forEach(job => {
        const isVerified = job.status === "verified";
        const card = adminEl("div", "job-card admin-job-card");
        card.classList.add(isVerified ? "job-verified" : "job-unverified");

        card.appendChild(adminEl("h3", null, job.title));
        card.appendChild(adminLabeledRow("Firma", job.company));
        if (job.category) card.appendChild(adminLabeledRow("Kategorie", job.category));
        card.appendChild(adminLabeledRow("Ort", job.location));
        card.appendChild(adminLabeledRow("Kontakt", job.contact));
        if (job.salary) card.appendChild(adminLabeledRow("Lohn", job.salary));
        if (job.requirements) card.appendChild(adminLabeledRow("Voraussetzungen", job.requirements));

        if (job.specific_or_not === "Dauerhaft") {
            card.appendChild(adminLabeledRow("Zeitraum", "Dauerhaft"));
        } else {
            const from = job.date_from || "";
            const to = job.date_to || "";
            card.appendChild(adminLabeledRow("Zeitraum", from + " - " + to));
        }

        if (job.description) card.appendChild(adminLabeledRow("Beschreibung", job.description));

        const statusBadge = adminEl(
            "span",
            "status-badge " + (isVerified ? "status-verified" : "status-unverified"),
            isVerified ? "Verifiziert" : "Nicht verifiziert"
        );
        card.appendChild(statusBadge);

        const actions = adminEl("div", "admin-actions");

        const verifyBtn = adminEl(
            "button",
            "verify-btn",
            isVerified ? "Bereits verifiziert" : "Verifizieren"
        );
        verifyBtn.dataset.id = job.id == null ? "" : String(job.id);
        if (isVerified) verifyBtn.disabled = true;
        actions.appendChild(verifyBtn);

        const deleteBtn = adminEl("button", "delete-btn", "Löschen");
        deleteBtn.dataset.id = job.id == null ? "" : String(job.id);
        actions.appendChild(deleteBtn);

        card.appendChild(actions);
        adminJobList.appendChild(card);
    });

    addAdminButtonEvents();
}

/* =========================
   BUTTON EVENTS
========================= */
function addAdminButtonEvents() {
    const verifyButtons = document.querySelectorAll(".verify-btn");
    const deleteButtons = document.querySelectorAll(".delete-btn");

    verifyButtons.forEach(button => {
        button.addEventListener("click", async function () {
            if (isAdminActionRunning || button.disabled) {
                return;
            }

            const id = button.dataset.id;
            const adminKey = adminKeyInput.value.trim();

            if (!adminKey) {
                alert("Bitte Admin-Schlüssel eingeben.");
                return;
            }

            isAdminActionRunning = true;
            setAdminPageDisabled(true);
            showAdminLoading("Job wird verifiziert...");

            try {
                const result = await verifyJob(id, adminKey);

                console.log("VERIFY RESULT:", result);

                if (!result.success) {
                    alert(result.message || "Verifizieren fehlgeschlagen.");
                    return;
                }

                await loadAdminJobs();
            } catch (error) {
                console.error("VERIFY ERROR:", error);
                alert("Beim Verifizieren ist ein Fehler aufgetreten.");
            } finally {
                hideAdminLoading();
                setAdminPageDisabled(false);
                isAdminActionRunning = false;
            }
        });
    });

    deleteButtons.forEach(button => {
        button.addEventListener("click", async function () {
            if (isAdminActionRunning) {
                return;
            }

            const id = button.dataset.id;
            const adminKey = adminKeyInput.value.trim();

            if (!adminKey) {
                alert("Bitte Admin-Schlüssel eingeben.");
                return;
            }

            const confirmed = confirm("Diesen Job wirklich löschen?");
            if (!confirmed) {
                return;
            }

            isAdminActionRunning = true;
            setAdminPageDisabled(true);
            showAdminLoading("Job wird gelöscht...");

            try {
                const result = await deleteJob(id, adminKey);

                console.log("DELETE RESULT:", result);

                if (!result.success) {
                    alert(result.message || "Löschen fehlgeschlagen.");
                    return;
                }

                await loadAdminJobs();
            } catch (error) {
                console.error("DELETE ERROR:", error);
                alert("Beim Löschen ist ein Fehler aufgetreten.");
            } finally {
                hideAdminLoading();
                setAdminPageDisabled(false);
                isAdminActionRunning = false;
            }
        });
    });
}

/* =========================
   JOBS LADEN BUTTON
========================= */
loadAdminJobsButton.addEventListener("click", async function () {
    if (isAdminActionRunning) {
        return;
    }

    isAdminActionRunning = true;
    setAdminPageDisabled(true);
    showAdminLoading("Jobs werden geladen...");

    try {
        await loadAdminJobs();
    } catch (error) {
        console.error("LOAD ERROR:", error);
        alert("Jobs konnten nicht geladen werden.");
    } finally {
        hideAdminLoading();
        setAdminPageDisabled(false);
        isAdminActionRunning = false;
    }
});
