const adminKeyInput = document.getElementById("admin-key");
const loadAdminJobsButton = document.getElementById("load-admin-jobs");
const adminJobList = document.getElementById("admin-job-list");

let adminJobs = [];

/* =========================
   JOBS LADEN
========================= */
async function loadAdminJobs() {
    adminJobs = await getJobs();
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
        card.classList.add("job-card");

        if (job.status === "verified") {
            card.classList.add("job-verified");
        } else {
            card.classList.add("job-unverified");
        }

        card.innerHTML = `
            <h3>${job.title}</h3>
            <p><strong>Firma:</strong> ${job.company}</p>
            <p><strong>Ort:</strong> ${job.location}</p>
            <p><strong>Kontakt:</strong> ${job.contact}</p>
            <p><strong>Beschreibung:</strong> ${job.description}</p>
            <span class="status-badge ${job.status === "verified" ? "status-verified" : "status-unverified"}">
                ${job.status === "verified" ? "Verifiziert" : "Nicht verifiziert"}
            </span>
            <div class="admin-actions">
                <button class="verify-btn" data-id="${job.id}">Verifizieren</button>
                <button class="delete-btn" data-id="${job.id}">Löschen</button>
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
        button.addEventListener("click", async function() {
            const id = button.dataset.id;
            const adminKey = adminKeyInput.value.trim();

            if (!adminKey) {
                alert("Bitte Admin-Schlüssel eingeben.");
                return;
            }

            const result = await verifyJob(id, adminKey);

            if (!result.success) {
                alert(result.message || "Verifizieren fehlgeschlagen.");
                return;
            }

            await loadAdminJobs();
        });
    });

    deleteButtons.forEach(button => {
        button.addEventListener("click", async function() {
            const id = button.dataset.id;
            const adminKey = adminKeyInput.value.trim();

            if (!adminKey) {
                alert("Bitte Admin-Schlüssel eingeben.");
                return;
            }

            const confirmed = confirm("Diesen Job wirklich löschen?");
            if (!confirmed) return;

            const result = await deleteJob(id, adminKey);

            if (!result.success) {
                alert(result.message || "Löschen fehlgeschlagen.");
                return;
            }

            await loadAdminJobs();
        });
    });
}

/* =========================
   JOBS LADEN BUTTON
========================= */
loadAdminJobsButton.addEventListener("click", async function() {
    await loadAdminJobs();
});
