const jobForm = document.getElementById("job-form");
const searchInput = document.getElementById("search");
const jobList = document.getElementById("job-list");
const loadingOverlay = document.getElementById("loading-overlay");

let allJobs = [];
let isSubmittingJob = false;

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
        `;

        jobList.appendChild(card);
    });
}

/* =========================
   FORMULAR ABSENDEN
========================= */
jobForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    if (isSubmittingJob) {
        return;
    }

    isSubmittingJob = true;
    setFormDisabled(true);
    showLoading("Job wird veröffentlicht...");

    try {
        const newJob = {
            company: document.getElementById("company").value.trim(),
            title: document.getElementById("title").value.trim(),
            location: document.getElementById("location").value.trim(),
            contact: document.getElementById("contact").value.trim(),
            description: document.getElementById("description").value.trim()
        };

        const result = await createJob(newJob);

        if (!result.success) {
            alert(result.message || "Job konnte nicht erstellt werden.");
            return;
        }

        jobForm.reset();
        await loadJobs();
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
