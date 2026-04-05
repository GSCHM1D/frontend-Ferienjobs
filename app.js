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
    const locationValue = searchLocationInput.value.trim();
    const minSalaryValue = searchMinSalaryInput.value.trim();
    const categoryValue = searchCategoryInput.value;
    const durationValue = searchDurationInput.value.trim();

    const isSearching =
        locationValue !== "" ||
        minSalaryValue !== "" ||
        categoryValue !== "" ||
        durationValue !== "";

    let visibleJobs = allJobs;

    if (isSearching) {
        visibleJobs = allJobs.filter(job => {
            const isVerified = job.status === "verified";

            return (
                isVerified &&
                matchesLocation(job, locationValue) &&
                matchesMinSalary(job, minSalaryValue) &&
                matchesCategory(job, categoryValue) &&
                matchesDuration(job, durationValue)
            );
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

                    ${job.duration ? `
                        <div class="job-meta-item job-duration-item">
                            <span class="job-meta-label">Zeitdauer</span>
                            <span class="job-meta-value">${job.duration}</span>
                        </div>
                    ` : ""}
                </div>

                ${job.description ? `
                    <div class="job-description-block">
                        <p class="job-description">${job.description}</p>
                    </div>
                ` : ""}
            </div>

            ${job.contact ? `
                <div class="job-card-footer">
                    <span class="job-contact-label">Kontakt</span>
                    <span class="job-contact-value">${job.contact}</span>
                </div>
            ` : ""}
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
            duration: document.getElementById("duration").value.trim(),
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

/* Variabeln*/

const searchLocationInput = document.getElementById("search-location");
const searchMinSalaryInput = document.getElementById("search-min-salary");
const searchCategoryInput = document.getElementById("search-category");
const searchDurationInput = document.getElementById("search-duration");

/* Orte filtern*/

function matchesLocation(job, searchValue) {
    if (!searchValue) return true;

    const value = searchValue.trim().toLowerCase();
    const location = String(job.location || "").toLowerCase();

    return location.includes(value);
}

/* Mindestlohn suchen */

function extractSalaryNumber(salaryText) {
    if (!salaryText) return null;

    const match = String(salaryText).match(/\d+/); // ← findet ERSTE Zahl

    if (!match) return null;

    return parseInt(match[0], 10);
}

function matchesMinSalary(job, minSalaryValue) {
    if (!minSalaryValue) return true;

    const minSalary = parseFloat(minSalaryValue);
    if (isNaN(minSalary)) return true;

    const jobSalary = extractSalaryNumber(job.salary);
    if (jobSalary === null) return false;

    return jobSalary >= minSalary;
}

/* Kategorie suchen */

function matchesCategory(job, selectedCategory) {
    if (!selectedCategory) return true;

    return String(job.category || "") === selectedCategory;
}

/* Zeitraum finden */

function parseGermanDate(dateString) {
    if (!dateString) return null;

    const parts = dateString.split(".");
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);

    const date = new Date(year, month, day);

    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month ||
        date.getDate() !== day
    ) {
        return null;
    }

    return date;
}

function parseSearchDuration(input) {
    if (!input) return null;

    const parts = input.split("-").map(part => part.trim());
    if (parts.length !== 2) return null;

    const start = parseGermanDate(parts[0]);
    const end = parseGermanDate(parts[1]);

    if (!start || !end) return null;

    return { start, end };
}

function parseJobDuration(durationText) {
    if (!durationText) return null;

    const parts = durationText.split("-").map(part => part.trim());
    if (parts.length === 1) {
        const single = parseGermanDate(parts[0]);
        if (!single) return null;
        return { start: single, end: single };
    }

    if (parts.length !== 2) return null;

    const start = parseGermanDate(parts[0]);
    const end = parseGermanDate(parts[1]);

    if (!start || !end) return null;

    return { start, end };
}

/* evenListener */

searchLocationInput.addEventListener("input", renderJobs);
searchMinSalaryInput.addEventListener("input", renderJobs);
searchCategoryInput.addEventListener("change", renderJobs);
searchDurationInput.addEventListener("input", renderJobs);

/* =========================
   START
========================= */
loadJobs();
