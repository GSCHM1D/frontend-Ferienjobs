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
/* Filter Popup */
const filterToggle = document.getElementById("filter-toggle");
const filterPopup = document.getElementById("filter-popup");
const filterPopupClose = document.getElementById("filter-popup-close");
/* Alerts ersetzen durch klare Meldungen */
const jobMessage = document.getElementById("job-message");
/* Logik für neue Datumsfelder */
const dateFromInput = document.getElementById("date_from");
const dateToInput = document.getElementById("date_to");
const specificOrNotSelect = document.getElementById("specific_or_not");
/* Cookie Banner constants */
const cookieBanner = document.getElementById("cookie-banner");
const acceptNecessaryCookiesButton = document.getElementById("accept-necessary-cookies");
const acceptAnalyticsCookiesButton = document.getElementById("accept-analytics-cookies");
/* Cookie Einstellungen ändern */
const changeCookieSettingsLink = document.getElementById("change-cookie-settings");


let allJobs = [];
let isSubmittingJob = false;
let lastSubmitTime = 0;
const SUBMIT_COOLDOWN_MS = 15000;
const ANALYTICS_ID = "G-RDJXNN60R9";
let analyticsEnabled = false;
let analyticsScriptRequested = false;
let activeFilters = {
    location: "",
    minSalary: "",
    category: "",
    dateFrom: "",
    dateTo: ""
};

/* Hilfsfunktion Google Analytics */

function trackEvent(eventName, params = {}) {
    if (analyticsEnabled && typeof window.gtag === "function") {
        window.gtag("event", eventName, params);
    }
}

function loadAnalytics() {
    analyticsEnabled = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
        window.dataLayer.push(arguments);
    };
    window.gtag("consent", "update", { analytics_storage: "granted" });

    if (analyticsScriptRequested) return;
    analyticsScriptRequested = true;
    window.gtag("js", new Date());
    window.gtag("config", ANALYTICS_ID, {
        anonymize_ip: true,
        allow_google_signals: false
    });

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ANALYTICS_ID)}`;
    document.head.appendChild(script);
}

function disableAnalytics() {
    analyticsEnabled = false;
    if (typeof window.gtag === "function") {
        window.gtag("consent", "update", { analytics_storage: "denied" });
    }

    ["_ga", `_ga_${ANALYTICS_ID.replace("G-", "")}`].forEach(name => {
        document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    });
}

/* Datumsfelder */

/* Modi ohne konkrete Daten: Felder werden ausgegraut & geleert */
const DATELESS_MODES = ["Dauerhaft", "flexibel"];

/* Graue Platzhalter-Optik pflegen (leere Datumsfelder + Placeholder im Select) */
function refreshDurationPlaceholders() {
    dateFromInput.classList.toggle("date-empty", !dateFromInput.value);
    dateToInput.classList.toggle("date-empty", !dateToInput.value);
    specificOrNotSelect.classList.toggle("is-placeholder", specificOrNotSelect.value === "");
}

function updateDurationInputs() {
    const mode = specificOrNotSelect.value;
    const disabled = DATELESS_MODES.indexOf(mode) !== -1;

    if (disabled) {
        dateFromInput.value = "";
        dateToInput.value = "";
    }

    dateFromInput.disabled = disabled;
    dateToInput.disabled = disabled;
    dateFromInput.required = mode === "Spezifisch";
    dateToInput.required = mode === "Spezifisch";

    const fromField = dateFromInput.closest(".field");
    const toField = dateToInput.closest(".field");
    if (fromField) fromField.classList.toggle("is-disabled", disabled);
    if (toField) toField.classList.toggle("is-disabled", disabled);

    refreshDurationPlaceholders();
}

/* Wird ein Datum eingegeben, bevor das Dropdown gesetzt ist,
   automatisch auf "Spezifisch" stellen. */
function autoSelectSpecific() {
    if ((dateFromInput.value || dateToInput.value) && specificOrNotSelect.value !== "Spezifisch") {
        specificOrNotSelect.value = "Spezifisch";
        updateDurationInputs();
    }
    refreshDurationPlaceholders();
}

specificOrNotSelect.addEventListener("change", updateDurationInputs);
dateFromInput.addEventListener("input", autoSelectSpecific);
dateToInput.addEventListener("input", autoSelectSpecific);
dateFromInput.addEventListener("change", autoSelectSpecific);
dateToInput.addEventListener("change", autoSelectSpecific);

const today = new Date();
const todayLocal = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0")
].join("-");
dateFromInput.min = todayLocal;
dateToInput.min = todayLocal;
dateFromInput.addEventListener("change", function () {
    dateToInput.min = dateFromInput.value || todayLocal;
    if (dateToInput.value && dateToInput.value < dateToInput.min) {
        dateToInput.value = "";
        refreshDurationPlaceholders();
    }
});
updateDurationInputs();

/* Zeichen-Zähler für die Beschreibung */
const descriptionInput = document.getElementById("description");
const descriptionCounter = document.getElementById("description-counter");
if (descriptionInput && descriptionCounter) {
    descriptionInput.addEventListener("input", function () {
        const left = 500 - descriptionInput.value.length;
        descriptionCounter.textContent = left <= 100
            ? "noch " + left + " Zeichen"
            : "max. 500 Zeichen";
    });
}

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

/* Hilfsfunktion Cookie Banner */

function initCookieBanner() {
    const cookieChoice = localStorage.getItem("holidayjobCookieChoice");

    if (cookieChoice === "analytics") {
        loadAnalytics();
        cookieBanner.classList.add("hidden");
        return;
    }

    if (cookieChoice === "necessary") {
        disableAnalytics();
        cookieBanner.classList.add("hidden");
        return;
    }

    cookieBanner.classList.remove("hidden");

    acceptNecessaryCookiesButton.addEventListener("click", function () {
        localStorage.setItem("holidayjobCookieChoice", "necessary");
        disableAnalytics();
        cookieBanner.classList.add("hidden");
    });

    acceptAnalyticsCookiesButton.addEventListener("click", function () {
        localStorage.setItem("holidayjobCookieChoice", "analytics");
        loadAnalytics();
        cookieBanner.classList.add("hidden");
    });
}

/* Banner erneut aufrufen, Änderungen Cookie Einstellungen */

if (changeCookieSettingsLink) {
    changeCookieSettingsLink.addEventListener("click", function (event) {
        event.preventDefault();
        localStorage.removeItem("holidayjobCookieChoice");
        disableAnalytics();
        cookieBanner.classList.remove("hidden");
        acceptNecessaryCookiesButton.focus();
    });
}

/* Testemonials vorbereiten */

const testimonials = [
    {
        company: "Aargauhotels AG",
        logo: "logos_firmen/Aargauhotels_logo_transparent.PNG",
        person: "Sabrina Schaffner",
        role: "HR",
        quote: "Für uns bedeutete die Plattform eine spürbare Entlastung im Rekrutierungsprozess.",
        url: "https://www.aargauhotels.ch"
    },
    {
        company: "AZ-Vertriebs AG",
        logo: "logos_firmen/AZVertrieb_logo.PNG",
        person: "Ramon Aeberhard",
        role: "Teamleiter Vertrieb",
        quote: "Die Plattform leistet uns grosse Unterstützung, um unsere Kunden in der Ferienzeit zu bedienen, da diese Ferienjobs eine echte Hilfe sind.",
        url: "https://www.azvertrieb.ch"
    }
];

/* =========================
   JOBS LADEN UND ANZEIGEN
========================= */
function renderJobSkeletons(count = 6) {
    jobList.innerHTML = "";
    for (let i = 0; i < count; i++) {
        const sk = el("div", "skeleton-card");
        sk.appendChild(el("div", "skeleton-line w40"));
        sk.appendChild(el("div", "skeleton-line w70"));
        sk.appendChild(el("div", "skeleton-line w55"));
        sk.appendChild(el("div", "skeleton-line"));
        sk.appendChild(el("div", "skeleton-line tall"));
        jobList.appendChild(sk);
    }
}

async function loadJobs() {
    renderJobSkeletons();
    try {
        const jobs = await getJobs();
        allJobs = Array.isArray(jobs) ? jobs : [];
    } catch (error) {
        console.error(error);
        allJobs = [];
        jobList.innerHTML = "";
        const box = el("div", "jobs-empty");
        box.appendChild(el("strong", null, "Jobs konnten nicht geladen werden."));
        box.appendChild(el("span", null, "Bitte versuche es in ein paar Minuten erneut."));
        jobList.appendChild(box);
        return;
    }
    updateHeroStats();
    renderJobs();
}

function updateHeroStats() {
    const jobCount = document.getElementById("hero-job-count");
    const companyCount = document.getElementById("hero-company-count");
    const companies = new Set(
        allJobs
            .map(job => String(job.company || "").trim().toLowerCase())
            .filter(Boolean)
    );

    if (jobCount) jobCount.textContent = String(allJobs.length);
    if (companyCount) companyCount.textContent = String(companies.size);
}

/* Ist das Inserat jünger als 7 Tage? */
function isNewJob(job) {
    if (!job.createdAt) return false;
    const created = new Date(job.createdAt);
    if (isNaN(created.getTime())) return false;
    return Date.now() - created.getTime() < 7 * 24 * 60 * 60 * 1000;
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

    if (job.specific_or_not === "flexibel") {
        return {
            text: "Zeitraum flexibel",
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

/* Testimonials laden */

function renderTestimonials() {
    const logoList = document.getElementById("customer-logo-list");
    const testimonialList = document.getElementById("testimonial-list");

    if (!logoList || !testimonialList) return;

    logoList.innerHTML = "";
    testimonialList.innerHTML = "";

    testimonials.forEach((item, index) => {
        const testimonialId = `testimonial-${index}`;

        const logoButton = el("button", "customer-logo-button");
        logoButton.type = "button";

        const logoImg = document.createElement("img");
        logoImg.src = item.logo;
        logoImg.alt = item.company;

        logoButton.appendChild(logoImg);

        logoButton.addEventListener("click", function () {
            document.getElementById(testimonialId).scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        });

        logoList.appendChild(logoButton);

        const card = el("article", "testimonial-card");
        card.id = testimonialId;

        const top = el("div", "testimonial-top");

        const img = document.createElement("img");
        img.src = item.logo;
        img.alt = item.company;
        img.className = "testimonial-logo";

        const info = el("div", "testimonial-info");
        info.appendChild(el("h3", null, item.company));
        info.appendChild(el("p", null, `${item.person} · ${item.role}`));

        top.appendChild(img);
        top.appendChild(info);

        card.appendChild(top);
        card.appendChild(el("p", "testimonial-quote", `„${item.quote}“`));

        if (item.url) {
            const link = el("a", "testimonial-link", "Website besuchen");
            link.href = item.url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            card.appendChild(link);
        }

        testimonialList.appendChild(card);
    });
}

/* ------------------ */

/* Sichere DOM-Hilfsfunktionen (verhindern XSS, weil textContent statt innerHTML) */

function el(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text != null) element.textContent = text;
    return element;
}

function metaItem(label, value, extraClass) {
    const item = el("div", "job-meta-item");
    if (extraClass) item.classList.add(extraClass);
    item.appendChild(el("span", "job-meta-label", label));
    item.appendChild(el("span", "job-meta-value", value == null ? "" : String(value)));
    return item;
}

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

    // Alle Jobs werden unabhängig vom internen Status gleich dargestellt.
    let visibleJobs = [...allJobs].sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime() || 0;
        const bTime = new Date(b.createdAt || 0).getTime() || 0;
        return bTime - aTime;
    });

    if (isSearching) {
        visibleJobs = visibleJobs.filter(job => {
            return (
                matchesLocation(job, locationValue) &&
                matchesMinSalary(job, minSalaryValue) &&
                matchesCategory(job, categoryValue) &&
                matchesDuration(job, searchDateFromValue, searchDateToValue)
            );
        });
    }

    /* Schnellsuche (Titel / Firma / Ort) */
    if (quickSearchQuery) {
        visibleJobs = visibleJobs.filter(job =>
            String(job.title || "").toLowerCase().includes(quickSearchQuery) ||
            String(job.company || "").toLowerCase().includes(quickSearchQuery) ||
            String(job.location || "").toLowerCase().includes(quickSearchQuery)
        );
    }

    syncCategoryChips();
    updateJobsCount(visibleJobs.length);

    jobList.innerHTML = "";

    if (visibleJobs.length === 0) {
        const box = el("div", "jobs-empty");
        box.appendChild(el("strong", null, "Keine Jobs gefunden."));
        box.appendChild(el("span", null, "Passe die Suche oder Filter an – oder schau später wieder vorbei."));
        jobList.appendChild(box);
        return;
    }

    visibleJobs.forEach(job => {
        const durationDisplay = getDurationDisplay(job);
        const card = el("div", "job-card public-job-card");

        const top = el("div", "job-card-top");
        const badgeRow = el("div", "job-badge-row");
        if (job.category) badgeRow.appendChild(el("span", "job-category-badge", job.category));
        if (isNewJob(job)) badgeRow.appendChild(el("span", "job-new-badge", "Neu"));
        if (badgeRow.childNodes.length > 0) top.appendChild(badgeRow);
        const title = el("h3", "job-title");
        const titleLink = el("a", null, job.title || "Ferienjob");
        titleLink.href = getJobDetailHref(job);
        title.appendChild(titleLink);
        top.appendChild(title);
        top.appendChild(el("p", "job-company", job.company));
        card.appendChild(top);

        const body = el("div", "job-card-body");
        const list = el("div", "job-meta-list");
        list.appendChild(metaItem("Ort", job.location, null));
        if (job.salary) list.appendChild(metaItem("Lohn", job.salary, "job-meta-highlight"));
        if (job.requirements) list.appendChild(metaItem("Voraussetzungen", job.requirements, null));
        if (durationDisplay) list.appendChild(metaItem("Zeitdauer", durationDisplay.text, durationDisplay.className));
        body.appendChild(list);

        if (job.description) {
            const block = el("div", "job-description-block");
            block.appendChild(el("p", "job-description", job.description));
            body.appendChild(block);
        }
        card.appendChild(body);

        if (job.contact) {
            const footer = el("div", "job-card-footer");
            footer.appendChild(el("span", "job-contact-label", "Kontakt"));
            footer.appendChild(buildContactValue(job));
            footer.appendChild(buildJobActions(job));
            card.appendChild(footer);
        } else {
            card.appendChild(buildJobActions(job));
        }

        const reportLink = el("a", "job-report-link", "Inserat melden");
        reportLink.href = "mailto:holidayjob.ch@gmail.com?subject="
            + encodeURIComponent("Inserat melden: " + (job.title || "") + " (ID " + (job.id || "?") + ")");
        card.appendChild(reportLink);

        jobList.appendChild(card);
    });

}

function getJobDetailHref(job) {
    return `job.html?id=${encodeURIComponent(String(job.id || ""))}`;
}

function findEmail(job) {
    const text = `${job.contact || ""} ${job.description || ""}`;
    const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    return match ? match[0] : "";
}

function findPhone(job) {
    const contact = String(job.contact || "");
    const match = contact.match(/(?:\+41|0)(?:[\s/().-]*\d){9,}/);
    return match ? match[0].trim() : "";
}

function normalizePhone(phone) {
    const compact = phone.replace(/[^\d+]/g, "");
    return compact.startsWith("0") ? `+41${compact.slice(1)}` : compact;
}

function buildJobActions(job) {
    const actions = el("div", "job-card-actions");
    const email = findEmail(job);
    const phone = findPhone(job);

    if (email) {
        const emailLink = el("a", "job-contact-action", "E-Mail senden");
        emailLink.href = `mailto:${email}?subject=${encodeURIComponent("Bewerbung: " + (job.title || "Ferienjob") + " – via holidayjob.ch")}`;
        emailLink.addEventListener("click", function () {
            trackEvent("job_contact_email_click", { job_id: String(job.id || "") });
        });
        actions.appendChild(emailLink);
    }

    if (phone) {
        const phoneLink = el("a", "job-contact-action", "Anrufen");
        phoneLink.href = `tel:${normalizePhone(phone)}`;
        phoneLink.addEventListener("click", function () {
            trackEvent("job_contact_phone_click", { job_id: String(job.id || "") });
        });
        actions.appendChild(phoneLink);
    }

    const detailLink = el("a", "job-details-link", "Details");
    detailLink.href = getJobDetailHref(job);
    actions.appendChild(detailLink);
    return actions;
}

/* Kontakt klickbar machen: E-Mail -> mailto, Telefonnummer -> tel */
function buildContactValue(job) {
    const contact = String(job.contact || "").trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
    const phoneDigits = contact.replace(/[\s().\-\/]/g, "");
    const isPhone = /^\+?\d{9,13}$/.test(phoneDigits);

    if (!isEmail && !isPhone) {
        return el("span", "job-contact-value", contact);
    }

    const link = el("a", "job-contact-value job-contact-link", contact);
    link.href = isEmail
        ? "mailto:" + contact + "?subject=" + encodeURIComponent("Bewerbung: " + (job.title || "Ferienjob") + " – via holidayjob.ch")
        : "tel:" + phoneDigits;
    return link;
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

        if (newJob.specific_or_not === "Spezifisch" && newJob.date_from > newJob.date_to) {
            showJobMessage("Das Bis-Datum muss am oder nach dem Von-Datum liegen.", "error");
            hideLoading();
            setFormDisabled(false);
            isSubmittingJob = false;
            return;
        }

        const result = await createJob(newJob);

        if (!result.success) {
            showJobMessage(result.message || "Job konnte nicht erstellt werden.", "error");
            return;
        }

        lastSubmitTime = Date.now();

        jobForm.reset();
        await loadJobs();
        updateDurationInputs();
        showJobMessage("Job erfolgreich veröffentlicht.", "success");
        trackEvent("job_published", { category: newJob.category || "unknown" });
    } catch (error) {
        showJobMessage("Beim Veröffentlichen ist ein Fehler aufgetreten.", "error");
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

    const normalized = String(salaryText).replace(",", ".");
    const looksHourly = /(?:\/\s*h\b|pro\s+stunde|stundenlohn|je\s+stunde)/i.test(normalized);
    if (!looksHourly) return null;

    const match = normalized.match(/\d+(?:\.\d+)?/);

    if (!match) return null;

    return parseFloat(match[0]);
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

    /* Dauerhaft & flexibel haben keinen festen Zeitraum und erscheinen
       daher immer, wenn nach Daten gefiltert wird */
    if (job.specific_or_not === "Dauerhaft" || job.specific_or_not === "flexibel") {
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
        return jobEnd >= searchStart && jobStart <= searchEnd;
    }

    if (searchStart && !searchEnd) {
        return jobEnd >= searchStart;
    }

    if (!searchStart && searchEnd) {
        return jobStart <= searchEnd;
    }

    return true;
}

/* Filter Buttons; Anwenden / Zurücksetzen - eventListener */

applyFiltersButton.addEventListener("click", function () {
    trackEvent("applied_filters");
    activeFilters = {
        location: searchLocationInput.value.trim(),
        minSalary: searchMinSalaryInput.value.trim(),
        category: searchCategoryInput.value,
        dateFrom: document.getElementById("search-date-from").value,
        dateTo: document.getElementById("search-date-to").value
    };

    renderJobs();
    closeFilterPopup();
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
    closeFilterPopup();
});
/* eventListener für Toggle Job posten Bar */

function setJobFormOpen(open, shouldFocus = false) {
    jobFormWrapper.classList.toggle("open", open);
    jobFormToggle.classList.toggle("active", open);
    jobFormToggle.setAttribute("aria-expanded", String(open));
    jobFormToggleIcon.textContent = "+";

    if (open && shouldFocus) {
        const firstField = document.getElementById("company");
        if (firstField) firstField.focus({ preventScroll: true });
    }
}

jobFormToggle.addEventListener("click", function () {
    const willOpen = !jobFormWrapper.classList.contains("open");
    setJobFormOpen(willOpen, willOpen);
    if (willOpen) trackEvent("job_form_opened");
});

["header-insert-cta", "hero-insert-cta"].forEach(id => {
    const link = document.getElementById(id);
    if (!link) return;
    link.addEventListener("click", function () {
        setJobFormOpen(true);
        trackEvent("job_form_opened", { source: id });
    });
});

/* Filter Popup öffnen / schliessen */

function openFilterPopup() {
    filterPopup.classList.add("open");
    filterToggle.setAttribute("aria-expanded", "true");
    filterPopup.setAttribute("aria-hidden", "false");
    filterPopup.inert = false;
    searchLocationInput.focus();
}

function closeFilterPopup() {
    filterPopup.classList.remove("open");
    filterToggle.setAttribute("aria-expanded", "false");
    filterPopup.setAttribute("aria-hidden", "true");
    filterPopup.inert = true;
}

filterToggle.addEventListener("click", function (e) {
    e.stopPropagation();
    filterPopup.classList.contains("open") ? closeFilterPopup() : openFilterPopup();
});

filterPopupClose.addEventListener("click", closeFilterPopup);

document.addEventListener("click", function (e) {
    if (filterPopup.classList.contains("open") &&
        !filterPopup.contains(e.target) &&
        e.target !== filterToggle &&
        !filterToggle.contains(e.target)) {
        closeFilterPopup();
    }
});

document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeFilterPopup();
});

/* =========================
   SPONSOREN
========================= */

async function loadPublicSponsors() {
    const section = document.getElementById("sponsors-section");
    const grid    = document.getElementById("sponsors-grid");
    if (!section || !grid) return;

    try {
        const sponsors = await getPublicSponsors();
        if (!Array.isArray(sponsors) || sponsors.length === 0) return;

        grid.innerHTML = "";

        sponsors.forEach(function(s) {
            const hasWebsite = Boolean(s.website);
            const tile = document.createElement(hasWebsite ? "a" : "div");
            tile.className = "sponsor-tile";

            if (hasWebsite) {
                tile.href   = s.website.startsWith("http") ? s.website : "https://" + s.website;
                tile.target = "_blank";
                tile.rel    = "noopener noreferrer";
                tile.title  = s.company || "";
            }

            const logoBox = el("div", "sponsor-tile-logo-box");

            if (s.logo) {
                const img = document.createElement("img");
                img.className = "sponsor-tile-img";
                img.src = s.logo;
                img.alt = String(s.company || "") + " Logo";
                logoBox.appendChild(img);
            } else {
                const fallback = el("div", "sponsor-tile-fallback");
                fallback.textContent = String(s.company || "?")[0].toUpperCase();
                logoBox.appendChild(fallback);
            }

            tile.appendChild(logoBox);
            tile.appendChild(el("span", "sponsor-tile-name", s.company || ""));
            grid.appendChild(tile);
        });

        section.style.display = "";
    } catch {
        /* Keine Sponsoren oder API nicht erreichbar: Abschnitt bleibt versteckt */
    }
}

/* =========================
   START
========================= */

initCookieBanner();
/* =========================
   SCHNELLSUCHE + KATEGORIE-CHIPS
========================= */
let quickSearchQuery = "";

const quickSearchInput = document.getElementById("job-quick-search");
const jobsCountLabel = document.getElementById("jobs-count");
const categoryChips = document.querySelectorAll(".job-chip");

if (quickSearchInput) {
    quickSearchInput.addEventListener("input", function () {
        quickSearchQuery = quickSearchInput.value.trim().toLowerCase();
        renderJobs();
    });
}

categoryChips.forEach(chip => {
    chip.setAttribute("aria-pressed", String(chip.classList.contains("active")));
    chip.addEventListener("click", function () {
        const cat = chip.dataset.cat || "";
        activeFilters.category = cat;
        if (searchCategoryInput) searchCategoryInput.value = cat;
        trackEvent("category_chip_used");
        renderJobs();
    });
});

/* Chips folgen dem aktiven Kategorie-Filter (auch aus dem Popup) */
function syncCategoryChips() {
    categoryChips.forEach(chip => {
        const active = (chip.dataset.cat || "") === (activeFilters.category || "");
        chip.classList.toggle("active", active);
        chip.setAttribute("aria-pressed", String(active));
    });
}

function updateJobsCount(n) {
    if (!jobsCountLabel) return;
    jobsCountLabel.textContent = n === 1 ? "1 Job online" : n + " Jobs online";
}

filterPopup.setAttribute("aria-hidden", "true");
filterPopup.inert = true;
setJobFormOpen(window.location.hash === "#post-job-section");

renderTestimonials();
loadJobs();
loadPublicSponsors();
