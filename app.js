const jobForm = document.getElementById("job-form");
const searchInput = document.getElementById("search");
const jobList = document.getElementById("job-list");
const loadingOverlay = document.getElementById("loading-overlay");

let allJobs = [];
let isSubmittingJob = false;
let lastSubmitTime = 0;
const SUBMIT_COOLDOWN_MS = 15000;

function showLoading(message = "Job wird veröffentlicht...") {
    loadingOverlay.querySelector("p").textContent = message;
    loadingOverlay.classList.remove("hidden");
}

function hideLoading() {
    loadingOverlay.classList.add("hidden");
}

function setFormDisabled(disabled) {
    const elements = jobForm.querySelectorAll("input, textarea, button");
    elements.forEach(element => {
        element.disabled = disabled;
    });
}

/* =========================
   JOBS LADEN UND ANZEIGEN
========================= */
async function loadJobs() {
    allJobs = await getJobs();
    renderJobs();
}

/* =========================
   JOBS RENDERN
========================= */
function renderJobs() {
    const searchText = searchInput.value.trim().toLowerCase();

    let visibleJobs = allJobs;

    if (searchText !== "") {
        visibleJobs = allJobs.filter(job => {
            const locationText = String(job.location || "").toLowerCase();
            const matchesLocation = locationText.includes(searchText);
            const isVerified = job.status === "verified";

            return matchesLocation && isVerified;
        });
    }

    jobList.innerHTML = "";

    if (visibleJobs.length === 0) {
        jobList.innerHTML = "<p>Keine Jobs gefunden.</p>";
        return;
    }

    visibleJobs.forEach(job => {
        const card = document.createElement("div");
        card.classList.add("job-card", "public-job-card");

        card.innerHTML = `
    <div class="job-card-top">
        ${job.category ? `<span class="job-category-badge">${job.category}</span>` : ""}
        <h3 class="job-title">${job.title}</h3>
        <p class="job-company">${job.company}</p>
    </div>

    <div class="job-card-body">
        <div class="job-meta-list">
            <div class="job-meta-item">
                <span class="job-meta-label">Ort</span>
                <span class="job-meta-value">${job.location}</span>
            </div>

            ${job.salary ? `
                <div class="job-meta-item job-meta-highlight">
                    <span class="job-meta-label">Lohn</span>
                    <span class="job-meta-value">${job.salary}</span>
                </div>
            ` : ""}

            ${job.requirements ? `
                <div class="job-meta-item">
                    <span class="job-meta-label">Voraussetzungen</span>
                    <span class="job-meta-value">${job.requirements}</span>
                </div>
            ` : ""}
        </div>

        ${job.description ? `
            <div class="job-description-block">
                <p class="job-description">${job.description}</p>
            </div>
        ` : ""}
    </div>

    <div class="job-card-footer">
        <span class="job-contact-label">Kontakt</span>
        <span class="job-contact-value">${job.contact}</span>
    </div>
`;

        jobList.appendChild(card);
    });
}

/* =========================
   FORMULAR ABSENDEN
========================= */
jobForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const now = Date.now();

    if (isSubmittingJob) {
        return;
    }

    if (now - lastSubmitTime < SUBMIT_COOLDOWN_MS) {
        alert("Bitte kurz warten, bevor du erneut einen Job veröffentlichst.");
        return;
    }

    isSubmittingJob = true;
    setFormDisabled(true);
    showLoading("Job wird veröffentlicht...");

    try {
        const newJob = {
            company: document.getElementById("company").value.trim(),
            title: document.getElementById("title").value.trim(),
            category: document.getElementById("category").value,
            location: document.getElementById("location").value.trim(),
            contact: document.getElementById("contact").value.trim(),
            salary: document.getElementById("salary").value.trim(),
            requirements: document.getElementById("requirements").value.trim(),
            description: document.getElementById("description").value.trim(),
            website: document.getElementById("website").value.trim()
        };

        const result = await createJob(newJob);

        if (!result.success) {
            alert(result.message || "Job konnte nicht erstellt werden.");
            return;
        }

        lastSubmitTime = Date.now();

        jobForm.reset();
        await loadJobs();
        alert("Job erfolgreich veröffentlicht.");
    } catch (error) {
        alert("Beim Veröffentlichen ist ein Fehler aufgetreten.");
        console.error(error);
    } finally {
        hideLoading();
        setFormDisabled(false);
        isSubmittingJob = false;
    }
});

/* =========================
   SUCHE
========================= */
searchInput.addEventListener("input", function() {
    renderJobs();
});

/* =========================
   START
========================= */
loadJobs();
