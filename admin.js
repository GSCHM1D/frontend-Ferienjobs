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
function renderAdminJobs() {
    adminJobList.innerHTML = "";

    if (adminJobs.length === 0) {
        adminJobList.innerHTML = "<p>Keine Jobs vorhanden.</p>";
        return;
    }

    adminJobs.forEach(job => {
        const card = document.createElement("div");
        card.classList.add("job-card", "admin-job-card");

        if (job.status === "verified") {
            card.classList.add("job-verified");
        } else {
            card.classList.add("job-unverified");
        }

        card.innerHTML = `
            <h3>${job.title}</h3>

            <p><strong>Firma:</strong> ${job.company}</p>
            ${job.category ? `<p><strong>Kategorie:</strong> ${job.category}</p>` : ""}
            <p><strong>Ort:</strong> ${job.location}</p>
            <p><strong>Kontakt:</strong> ${job.contact}</p>
            ${job.salary ? `<p><strong>Lohn:</strong> ${job.salary}</p>` : ""}
            ${job.requirements ? `<p><strong>Voraussetzungen:</strong> ${job.requirements}</p>` : ""}
            ${job.description ? `<p><strong>Beschreibung:</strong> ${job.description}</p>` : ""}

            <span class="status-badge ${job.status === "verified" ? "status-verified" : "status-unverified"}">
                ${job.status === "verified" ? "Verifiziert" : "Nicht verifiziert"}
            </span>

            <div class="admin-actions">
                <button 
                    class="verify-btn" 
                    data-id="${job.id}" 
                    ${job.status === "verified" ? "disabled" : ""}
                >
                    ${job.status === "verified" ? "Bereits verifiziert" : "Verifizieren"}
                </button>

                <button class="delete-btn" data-id="${job.id}">
                    Löschen
                </button>
            </div>
        `;

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
