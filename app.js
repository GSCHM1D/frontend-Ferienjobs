const jobForm = document.getElementById("job-form");
const jobList = document.getElementById("job-list");
const loadingOverlay = document.getElementById("loading-overlay");
/* Filter anwenden / zurücksetzen */
const applyFiltersButton = document.getElementById("apply-filters");
const resetFiltersButton = document.getElementById("reset-filters");
/* Dynamischer Titel Bar für Job Form */
const jobFormToggle = document.getElementById("job-form-toggle");
const jobFormWrapper = document.getElementById("job-form-wrapper");
const jobFormToggleIcon = document.getElementById("job-form-toggle-icon");
/* Dynamische Filter Bar */
const filterToggle = document.getElementById("filter-toggle");
const filterWrapper = document.getElementById("filter-wrapper");
/* Alerts ersetzen durch klare Meldungen */
const jobMessage = document.getElementById("job-message");
/* Logik für neue Datumsfelder */
const dateFromInput = document.getElementById("date_from");
const dateToInput = document.getElementById("date_to");
const specificOrNotSelect = document.getElementById("specific_or_not");



let allJobs = [];
let isSubmittingJob = false;
let lastSubmitTime = 0;
const SUBMIT_COOLDOWN_MS = 15000;
let activeFilters = {
    location: "",
    minSalary: "",
    category: "",
    dateFrom: "",
    dateTo: ""
};

/* Datumsfelder */ 

function updateDurationInputs() {
    const mode = specificOrNotSelect.value;

    if (mode === "Dauerhaft") {
        dateFromInput.value = "";
        dateToInput.value = "";

        dateFromInput.disabled = true;
        dateToInput.disabled = true;
    } else {
        dateFromInput.disabled = false;
        dateToInput.disabled = false;
    }
}

specificOrNotSelect.addEventListener("change", updateDurationInputs);
updateDurationInputs();

/* ---------------------- */
function showLoading(message = "Job wird veröffentlicht...") {
    loadingOverlay.querySelector("p").textContent = message;
    loadingOverlay.classList.remove("hidden");
}

function hideLoading() {
    loadingOverlay.classList.add("hidden");
}

function setFormDisabled(disabled) {
    const elements = jobForm.querySelectorAll("input, textarea, button, select");
    elements.forEach(element => {
        element.disabled = disabled;
    });
}

/* Hilfsfunktionen von Meldungen, die Alerts ersetzen */

function showJobMessage(text, type = "info") {
    jobMessage.textContent = text;
    jobMessage.className = "message-box show";

    if (type === "success") {
        jobMessage.classList.add("message-success");
    } else if (type === "error") {
        jobMessage.classList.add("message-error");
    } else {
        jobMessage.classList.add("message-info");
    }
}

function hideJobMessage() {
    jobMessage.textContent = "";
    jobMessage.className = "message-box hidden";
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

/* Zuerst Hilfsfunktionen Datumsfelder */

function formatDate(dateString) {
    if (!dateString) return "";

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}.${month}.${year}`;
}

function getDurationDisplay(job) {
    if (job.specific_or_not === "Dauerhaft") {
        return {
            text: "Dauerhaft Aushilfe gesucht",
            className: "job-duration-item"
        };
    }

    if (job.specific_or_not === "Spezifisch" && job.date_from && job.date_to) {
        return {
            text: `${formatDate(job.date_from)} - ${formatDate(job.date_to)}`,
            className: "job-duration-item"
        };
    }

    return null;
}

/* ----------------------- */

function renderJobs() {
    const locationValue = activeFilters.location;
    const minSalaryValue = activeFilters.minSalary;
    const categoryValue = activeFilters.category;
    const searchDateFromValue = activeFilters.dateFrom;
    const searchDateToValue = activeFilters.dateTo;
    
    const isSearching =
        locationValue !== "" ||
        minSalaryValue !== "" ||
        categoryValue !== "" ||
        searchDateFromValue !== "" ||
        searchDateToValue !== "";

    let visibleJobs = allJobs;

    if (isSearching) {
        visibleJobs = allJobs.filter(job => {
            return (
                matchesLocation(job, locationValue) &&
                matchesMinSalary(job, minSalaryValue) &&
                matchesCategory(job, categoryValue) &&
                matchesDuration(job, searchDateFromValue, searchDateToValue)
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
        const durationDisplay = getDurationDisplay(job);
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

                    ${durationDisplay ? `
                        <div class="job-meta-item ${durationDisplay.className}">
                            <span class="job-meta-label">Zeitdauer</span>
                            <span class="job-meta-value">${durationDisplay.text}</span>
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
    hideJobMessage();

    const now = Date.now();

    if (isSubmittingJob) {
        return;
    }

    if (now - lastSubmitTime < SUBMIT_COOLDOWN_MS) {
        showJobMessage("Bitte kurz warten, bevor du erneut einen Job veröffentlichst.");
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
            date_from: document.getElementById("date_from").value,
            date_to: document.getElementById("date_to").value,
            specific_or_not: document.getElementById("specific_or_not").value,
            description: document.getElementById("description").value.trim(),
            website: document.getElementById("website").value.trim()
        };

        if (!newJob.specific_or_not) {
            showJobMessage("Bitte wähle aus, ob die Aushilfe dauerhaft oder in einem spezifischen Zeitraum gesucht wird.", "error");
            hideLoading();
            setFormDisabled(false);
            isSubmittingJob = false;
            return;
        }
        
        if (newJob.specific_or_not === "Spezifisch" && (!newJob.date_from || !newJob.date_to)) {
            showJobMessage("Bitte wähle bei spezifischer Zeitdauer ein Von- und Bis-Datum.", "error");
            hideLoading();
            setFormDisabled(false);
            isSubmittingJob = false;
            return;
        }

        const result = await createJob(newJob);

        if (!result.success) {
            showJobMessage(result.message || "Job konnte nicht erstellt werden.");
            return;
        }

        lastSubmitTime = Date.now();

        jobForm.reset();
        await loadJobs();
        showJobMessage("Job erfolgreich veröffentlicht.");
    } catch (error) {
        showJobMessage("Beim Veröffentlichen ist ein Fehler aufgetreten.");
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

function matchesDuration(job, searchDateFromValue, searchDateToValue) {
    if (!searchDateFromValue && !searchDateToValue) return true;

    if (job.specific_or_not === "Dauerhaft") {
        return true;
    }

    if (job.specific_or_not !== "Spezifisch") {
        return false;
    }

    if (!job.date_from || !job.date_to) {
        return false;
    }

    const jobStart = new Date(job.date_from);
    const jobEnd = new Date(job.date_to);

    if (isNaN(jobStart.getTime()) || isNaN(jobEnd.getTime())) {
        return false;
    }

    let searchStart = null;
    let searchEnd = null;

    if (searchDateFromValue) {
        searchStart = new Date(searchDateFromValue);
        if (isNaN(searchStart.getTime())) return true;
    }

    if (searchDateToValue) {
        searchEnd = new Date(searchDateToValue);
        if (isNaN(searchEnd.getTime())) return true;
    }

    if (searchStart && searchEnd) {
        return jobStart >= searchStart && jobEnd <= searchEnd;
    }

    if (searchStart && !searchEnd) {
        return jobStart >= searchStart;
    }

    if (!searchStart && searchEnd) {
        return jobEnd <= searchEnd;
    }

    return true;
}

/* Filter Buttons; Anwenden / Zurücksetzen - eventListener */

applyFiltersButton.addEventListener("click", function () {
    activeFilters = {
        location: searchLocationInput.value.trim(),
        minSalary: searchMinSalaryInput.value.trim(),
        category: searchCategoryInput.value,
        dateFrom: document.getElementById("search-date-from").value,
        dateTo: document.getElementById("search-date-to").value
    };

    renderJobs();
});

resetFiltersButton.addEventListener("click", function () {
    searchLocationInput.value = "";
    searchMinSalaryInput.value = "";
    searchCategoryInput.value = "";
    document.getElementById("search-date-from").value = "";
    document.getElementById("search-date-to").value = "";

    activeFilters = {
        location: "",
        minSalary: "",
        category: "",
        dateFrom: "",
        dateTo: ""
    };

    renderJobs();
});
/* eventListener für Toggle Job posten Bar */

jobFormToggle.addEventListener("click", function () {
    const isOpen = jobFormWrapper.classList.contains("open");

    if (isOpen) {
        jobFormWrapper.classList.remove("open");
        jobFormToggle.classList.remove("active");
        jobFormToggleIcon.textContent = "+";
    } else {
        jobFormWrapper.classList.add("open");
        jobFormToggle.classList.add("active");
        jobFormToggleIcon.textContent = "+";
    }
});

/* evenListener für Toggle Filter */
filterToggle.addEventListener("click", function () {
    const isOpen = filterWrapper.classList.contains("open");

    if (isOpen) {
        filterWrapper.classList.remove("open");
    } else {
        filterWrapper.classList.add("open");
    }
});

/* =========================
   START
========================= */
loadJobs();
