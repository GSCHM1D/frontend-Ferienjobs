/* ============================================
   ADMIN PANEL – admin.js
   ============================================ */

/* ==================
   STATE
================== */
let adminKey = "";
let allJobs = [];
let allSponsors = [];
let currentFilter = "all";
let isActionRunning = false;
let editingJobId = null;

/* ==================
   DOM REFS
================== */
const loginScreen        = document.getElementById("admin-login-screen");
const loginKeyInput      = document.getElementById("login-key-input");
const loginBtn           = document.getElementById("login-btn");
const loginError         = document.getElementById("login-error");
const adminApp           = document.getElementById("admin-app");
const loadingOverlay     = document.getElementById("admin-loading-overlay");
const loadingText        = document.getElementById("loading-text");
const toastContainer     = document.getElementById("toast-container");
const tabBtns            = document.querySelectorAll(".admin-tab-btn");
const tabPanels          = document.querySelectorAll(".tab-panel");
const statTotal          = document.getElementById("stat-total");
const statVerified       = document.getElementById("stat-verified");
const statPending        = document.getElementById("stat-pending");
const statApi            = document.getElementById("stat-api");
const apiDot             = document.getElementById("api-dot");
const apiStatusText      = document.getElementById("api-status-text");
const lastUpdatedTime    = document.getElementById("last-updated-time");
const pendingBadge       = document.getElementById("pending-badge");
const jobGrid            = document.getElementById("admin-job-grid");
const jobsSearch         = document.getElementById("jobs-search");
const jobsSubtitle       = document.getElementById("jobs-panel-subtitle");
const jobsCountLabel     = document.getElementById("jobs-count-label");
const filterTabs         = document.querySelectorAll(".jobs-filter-tab");
const editModal          = document.getElementById("edit-modal");
const editModalClose     = document.getElementById("edit-modal-close");
const editModalBackdrop  = document.getElementById("edit-modal-backdrop");
const editForm           = document.getElementById("edit-form");
const editCancelBtn      = document.getElementById("edit-cancel-btn");
const sponsorGrid        = document.getElementById("admin-sponsor-grid");
const sponsorsSubtitle   = document.getElementById("sponsors-panel-subtitle");
const sponsorBadge       = document.getElementById("sponsor-badge");

/* ==================
   LOADING
================== */
function showLoading(msg = "Aktion wird ausgeführt…") {
    loadingText.textContent = msg;
    loadingOverlay.classList.remove("hidden");
}

function hideLoading() {
    loadingOverlay.classList.add("hidden");
}

/* ==================
   TOAST
================== */
function toast(message, type = "info") {
    const icons = {
        success: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
        error:   `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
        info:    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
    };
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.innerHTML = `<div class="toast-icon">${icons[type] || icons.info}</div><span class="toast-msg">${message}</span>`;
    toastContainer.appendChild(el);
    setTimeout(() => {
        el.classList.add("removing");
        el.addEventListener("animationend", () => el.remove(), { once: true });
    }, 3500);
}

/* ==================
   AUTH – LOCKOUT
================== */

/*
 * Sperrdauer (Minuten) indexiert nach Anzahl Fehlversuche.
 * Index 0–2 = keine Sperre, ab Index 3 greift die Sperre.
 * Ab 8+ Fehlversuchen bleibt es bei 60 Minuten.
 */
const LOCKOUT_MINUTES = [0, 0, 0, 1, 5, 10, 20, 40, 60];

function getFailCount()     { return parseInt(localStorage.getItem("hjadmin_fails")   || "0", 10); }
function setFailCount(n)    { localStorage.setItem("hjadmin_fails",   String(n)); }
function getLockoutUntil()  { return parseInt(localStorage.getItem("hjadmin_lockout") || "0", 10); }
function setLockoutUntil(ts){ localStorage.setItem("hjadmin_lockout", String(ts)); }

function clearAuthState() {
    localStorage.removeItem("hjadmin_fails");
    localStorage.removeItem("hjadmin_lockout");
}

function isLockedOut() { return Date.now() < getLockoutUntil(); }

function recordFailedAttempt() {
    const fails = getFailCount() + 1;
    setFailCount(fails);
    const idx  = Math.min(fails, LOCKOUT_MINUTES.length - 1);
    const mins = LOCKOUT_MINUTES[idx];
    if (mins > 0) setLockoutUntil(Date.now() + mins * 60 * 1000);
    return fails;
}

let countdownInterval = null;

function startLockoutCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);
    loginKeyInput.disabled = true;
    loginBtn.disabled      = true;
    loginBtn.textContent   = "Gesperrt";
    updateLockoutDisplay();
    countdownInterval = setInterval(() => {
        if (!isLockedOut()) {
            clearInterval(countdownInterval);
            countdownInterval = null;
            loginKeyInput.disabled = false;
            loginBtn.disabled      = false;
            loginBtn.textContent   = "Einloggen";
            clearLoginError();
        } else {
            updateLockoutDisplay();
        }
    }, 1000);
}

function updateLockoutDisplay() {
    const remaining = getLockoutUntil() - Date.now();
    const mins = Math.floor(remaining / 60000);
    const secs = Math.ceil((remaining % 60000) / 1000);
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    showLoginError(`Zu viele Fehlversuche. Bitte warten: ${timeStr}`);
}

function showLoginError(msg) {
    loginError.textContent = msg;
    loginError.classList.add("visible");
    loginKeyInput.style.borderColor = "var(--adng)";
    loginKeyInput.style.boxShadow   = "0 0 0 4px var(--adngg)";
}

function clearLoginError() {
    loginError.classList.remove("visible");
    loginKeyInput.style.borderColor = "";
    loginKeyInput.style.boxShadow   = "";
}

async function attemptLogin() {
    if (isLockedOut()) { startLockoutCountdown(); return; }

    const key = loginKeyInput.value.trim();
    if (!key) { showLoginError("Bitte Admin-Schlüssel eingeben."); return; }

    loginBtn.disabled    = true;
    loginBtn.textContent = "Prüfen…";
    clearLoginError();

    try {
        const result = await checkAdminKey(key);

        if (!result.success) {
            if (result.locked) {
                /* Backend hat gesperrt: Countdown mit Backend-Zeitangabe starten.
                   Sekunden aus der Nachricht parsen und als lokalen Lockout setzen. */
                const secsMatch = String(result.message || "").match(/(\d+)\s*Sekunden/);
                const secs = secsMatch ? parseInt(secsMatch[1], 10) : 60;
                setLockoutUntil(Date.now() + secs * 1000);
                setFailCount(Math.max(getFailCount(), 3));
                startLockoutCountdown();
            } else {
                const fails = recordFailedAttempt();
                if (isLockedOut()) {
                    startLockoutCountdown();
                } else {
                    const attemptsLeft = 3 - fails;
                    if (attemptsLeft > 0) {
                        showLoginError(`Falscher Admin-Schlüssel. Noch ${attemptsLeft} Versuch${attemptsLeft !== 1 ? "e" : ""}.`);
                    } else {
                        showLoginError("Falscher Admin-Schlüssel.");
                    }
                    loginBtn.disabled    = false;
                    loginBtn.textContent = "Einloggen";
                }
            }
            return;
        }

        /* Erfolg */
        clearAuthState();
        adminKey = key;
        const jobs = await getJobs();
        allJobs = Array.isArray(jobs) ? jobs : [];
        showAdminApp();

    } catch {
        showLoginError("Verbindung fehlgeschlagen. Netzwerk prüfen.");
        loginBtn.disabled    = false;
        loginBtn.textContent = "Einloggen";
    }
}

loginBtn.addEventListener("click", attemptLogin);
loginKeyInput.addEventListener("keydown", e => { if (e.key === "Enter") attemptLogin(); });
loginKeyInput.addEventListener("input", () => { if (!isLockedOut()) clearLoginError(); });

/* Beim Laden: bereits gesperrte Sitzung sofort anzeigen */
if (isLockedOut()) startLockoutCountdown();

document.getElementById("logout-btn").addEventListener("click", () => {
    adminKey = "";
    allJobs  = [];
    loginKeyInput.value = "";
    clearLoginError();
    adminApp.classList.add("hidden");
    loginScreen.style.display = "";
    switchTab("dashboard");
});

function showAdminApp() {
    loginScreen.style.display = "none";
    adminApp.classList.remove("hidden");
    updateStats();
    checkApiStatus();
    renderJobGrid();
    loadSponsors();
}

/* ==================
   TAB NAVIGATION
================== */
function switchTab(tabId) {
    tabBtns.forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tabId));
    tabPanels.forEach(panel => panel.classList.toggle("active", panel.id === `tab-${tabId}`));
}

tabBtns.forEach(btn => btn.addEventListener("click", () => switchTab(btn.dataset.tab)));

document.querySelectorAll("[data-switch-tab]").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.switchTab));
});

/* ==================
   DASHBOARD
================== */
function updateStats() {
    const total    = allJobs.length;
    const verified = allJobs.filter(j => j.status === "verified").length;
    const pending  = total - verified;

    statTotal.textContent    = total;
    statVerified.textContent = verified;
    statPending.textContent  = pending;
    lastUpdatedTime.textContent = new Date().toLocaleTimeString("de-CH");

    if (pending > 0) {
        pendingBadge.textContent = pending;
        pendingBadge.classList.remove("hidden");
    } else {
        pendingBadge.classList.add("hidden");
    }
}

async function checkApiStatus() {
    apiDot.className = "api-dot loading";
    apiStatusText.textContent = "Verbindung wird geprüft…";
    statApi.textContent = "…";
    statApi.style.color = "";
    statApi.style.fontSize = "";

    try {
        const t0 = Date.now();
        await getJobs();
        const ms = Date.now() - t0;
        apiDot.className = "api-dot ok";
        apiStatusText.textContent = `API erreichbar (${ms} ms)`;
        statApi.textContent = "Online";
        statApi.style.color = "var(--aok)";
        statApi.style.fontSize = "16px";
    } catch {
        apiDot.className = "api-dot err";
        apiStatusText.textContent = "API nicht erreichbar";
        statApi.textContent = "Offline";
        statApi.style.color = "var(--adng)";
        statApi.style.fontSize = "16px";
    }
}

document.getElementById("dash-refresh-btn").addEventListener("click", async () => {
    showLoading("Wird aktualisiert…");
    try {
        const jobs = await getJobs();
        if (Array.isArray(jobs)) { allJobs = jobs; updateStats(); renderJobGrid(); }
        await checkApiStatus();
        toast("Dashboard aktualisiert.", "success");
    } catch {
        toast("Aktualisierung fehlgeschlagen.", "error");
    } finally {
        hideLoading();
    }
});

/* ==================
   JOB GRID
================== */
function getFilteredJobs() {
    let jobs = allJobs;
    if (currentFilter === "verified")   jobs = jobs.filter(j => j.status === "verified");
    if (currentFilter === "unverified") jobs = jobs.filter(j => j.status !== "verified");

    const q = (jobsSearch.value || "").toLowerCase().trim();
    if (q) {
        jobs = jobs.filter(j =>
            (j.title    || "").toLowerCase().includes(q) ||
            (j.company  || "").toLowerCase().includes(q) ||
            (j.location || "").toLowerCase().includes(q)
        );
    }
    return jobs;
}

function renderJobGrid() {
    const jobs = getFilteredJobs();
    jobGrid.innerHTML = "";

    const total = allJobs.length;
    jobsSubtitle.textContent = `${total} Job${total !== 1 ? "s" : ""} total`;
    jobsCountLabel.textContent = jobs.length !== total ? `${jobs.length} angezeigt` : "";

    if (jobs.length === 0) {
        const msg = document.createElement("p");
        msg.className = "no-jobs-msg";
        msg.textContent = currentFilter === "unverified" ? "Keine ausstehenden Jobs." : "Keine Jobs gefunden.";
        jobGrid.appendChild(msg);
        return;
    }

    jobs.forEach(job => jobGrid.appendChild(buildJobCard(job)));
}

function svgIcon(path, size = 12) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

function buildJobCard(job) {
    const isVerified = job.status === "verified";
    const card = document.createElement("div");
    card.className = `admin-job-card ${isVerified ? "verified" : "unverified"}`;

    /* header */
    const header = document.createElement("div");
    header.className = "ajc-header";
    const titleWrap = document.createElement("div");
    const titleEl = document.createElement("div");
    titleEl.className = "ajc-title";
    titleEl.textContent = job.title || "–";
    const companyEl = document.createElement("div");
    companyEl.className = "ajc-company";
    companyEl.textContent = job.company || "";
    titleWrap.appendChild(titleEl);
    titleWrap.appendChild(companyEl);
    const pill = document.createElement("span");
    pill.className = `status-pill ${isVerified ? "verified" : "unverified"}`;
    pill.textContent = isVerified ? "Verifiziert" : "Ausstehend";
    header.appendChild(titleWrap);
    header.appendChild(pill);
    card.appendChild(header);

    /* meta */
    const meta = document.createElement("div");
    meta.className = "ajc-meta";

    function metaItem(iconPath, text) {
        const item = document.createElement("div");
        item.className = "ajc-meta-item";
        item.innerHTML = svgIcon(iconPath);
        const span = document.createElement("span");
        span.textContent = text;
        item.appendChild(span);
        return item;
    }

    if (job.location) meta.appendChild(metaItem('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>', job.location));
    if (job.salary)   meta.appendChild(metaItem('<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>', job.salary));
    if (job.category) meta.appendChild(metaItem('<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>', job.category));
    const dateStr = job.specific_or_not === "Dauerhaft"
        ? "Dauerhaft"
        : [job.date_from, job.date_to].filter(Boolean).join(" – ") || "–";
    meta.appendChild(metaItem('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>', dateStr));
    card.appendChild(meta);

    /* description */
    if (job.description) {
        const desc = document.createElement("p");
        desc.className = "ajc-desc";
        desc.textContent = job.description;
        card.appendChild(desc);
    }

    /* actions */
    const actions = document.createElement("div");
    actions.className = "ajc-actions";

    const verifyBtn = document.createElement("button");
    verifyBtn.className = "ajc-btn verify-btn";
    verifyBtn.dataset.id = String(job.id ?? "");
    verifyBtn.innerHTML = svgIcon('<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>') + (isVerified ? " Verifiziert" : " Verifizieren");
    if (isVerified) verifyBtn.disabled = true;

    const editBtn = document.createElement("button");
    editBtn.className = "ajc-btn edit-btn";
    editBtn.dataset.id = String(job.id ?? "");
    editBtn.innerHTML = svgIcon('<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>') + " Bearbeiten";

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "ajc-btn delete-btn";
    deleteBtn.dataset.id = String(job.id ?? "");
    deleteBtn.innerHTML = svgIcon('<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>') + " Löschen";

    actions.appendChild(verifyBtn);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    card.appendChild(actions);

    return card;
}

/* Event delegation — avoids memory leaks from per-button listeners */
jobGrid.addEventListener("click", async function(e) {
    if (isActionRunning) return;
    const verifyBtn = e.target.closest(".verify-btn");
    const editBtn   = e.target.closest(".edit-btn");
    const deleteBtn = e.target.closest(".delete-btn");
    if (verifyBtn && !verifyBtn.disabled) await handleVerify(verifyBtn.dataset.id);
    else if (editBtn)                      openEditModal(editBtn.dataset.id);
    else if (deleteBtn)                    await handleDelete(deleteBtn.dataset.id);
});

/* ==================
   FILTER + SEARCH
================== */
filterTabs.forEach(tab => {
    tab.addEventListener("click", () => {
        filterTabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        currentFilter = tab.dataset.filter;
        renderJobGrid();
    });
});

document.getElementById("jobs-refresh-btn").addEventListener("click", async () => {
    showLoading("Jobs werden geladen…");
    try {
        const jobs = await getJobs();
        if (Array.isArray(jobs)) { allJobs = jobs; updateStats(); renderJobGrid(); toast("Jobs aktualisiert.", "success"); }
    } catch {
        toast("Laden fehlgeschlagen.", "error");
    } finally {
        hideLoading();
    }
});

jobsSearch.addEventListener("input", renderJobGrid);

/* ==================
   VERIFY
================== */
async function handleVerify(id) {
    isActionRunning = true;
    showLoading("Job wird verifiziert…");
    try {
        const result = await verifyJob(id, adminKey);
        if (!result.success) { toast(result.message || "Verifizieren fehlgeschlagen.", "error"); return; }
        const job = allJobs.find(j => String(j.id) === String(id));
        if (job) job.status = "verified";
        updateStats();
        renderJobGrid();
        toast("Job erfolgreich verifiziert.", "success");
    } catch {
        toast("Fehler beim Verifizieren.", "error");
    } finally {
        hideLoading();
        isActionRunning = false;
    }
}

/* ==================
   DELETE
================== */
async function handleDelete(id) {
    if (!confirm("Diesen Job wirklich löschen?")) return;
    isActionRunning = true;
    showLoading("Job wird gelöscht…");
    try {
        const result = await deleteJob(id, adminKey);
        if (!result.success) { toast(result.message || "Löschen fehlgeschlagen.", "error"); return; }
        allJobs = allJobs.filter(j => String(j.id) !== String(id));
        updateStats();
        renderJobGrid();
        toast("Job gelöscht.", "success");
    } catch {
        toast("Fehler beim Löschen.", "error");
    } finally {
        hideLoading();
        isActionRunning = false;
    }
}

/* ==================
   EDIT MODAL
================== */
function openEditModal(id) {
    const job = allJobs.find(j => String(j.id) === String(id));
    if (!job) return;
    editingJobId = id;

    document.getElementById("edit-job-id").value          = id;
    document.getElementById("edit-company").value         = job.company        || "";
    document.getElementById("edit-title").value           = job.title          || "";
    document.getElementById("edit-category").value        = job.category       || "";
    document.getElementById("edit-location").value        = job.location       || "";
    document.getElementById("edit-contact").value         = job.contact        || "";
    document.getElementById("edit-salary").value          = job.salary         || "";
    document.getElementById("edit-requirements").value    = job.requirements   || "";
    document.getElementById("edit-date-from").value       = job.date_from      || "";
    document.getElementById("edit-date-to").value         = job.date_to        || "";
    document.getElementById("edit-specific-or-not").value = job.specific_or_not|| "";
    document.getElementById("edit-description").value     = job.description    || "";

    editModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
}

function closeEditModal() {
    editModal.classList.add("hidden");
    document.body.style.overflow = "";
    editingJobId = null;
    editForm.reset();
}

editModalClose.addEventListener("click", closeEditModal);
editCancelBtn.addEventListener("click", closeEditModal);
editModalBackdrop.addEventListener("click", closeEditModal);
document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !editModal.classList.contains("hidden")) closeEditModal();
});

editForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    if (isActionRunning) return;
    isActionRunning = true;

    const saveBtn = document.getElementById("edit-save-btn");
    saveBtn.disabled = true;
    showLoading("Änderungen werden gespeichert…");

    const jobData = {
        company:          document.getElementById("edit-company").value.trim(),
        title:            document.getElementById("edit-title").value.trim(),
        category:         document.getElementById("edit-category").value,
        location:         document.getElementById("edit-location").value.trim(),
        contact:          document.getElementById("edit-contact").value.trim(),
        salary:           document.getElementById("edit-salary").value.trim(),
        requirements:     document.getElementById("edit-requirements").value.trim(),
        date_from:        document.getElementById("edit-date-from").value,
        date_to:          document.getElementById("edit-date-to").value,
        specific_or_not:  document.getElementById("edit-specific-or-not").value,
        description:      document.getElementById("edit-description").value.trim(),
    };

    try {
        const result = await editJob(editingJobId, adminKey, jobData);
        if (!result.success) { toast(result.message || "Speichern fehlgeschlagen.", "error"); return; }
        const idx = allJobs.findIndex(j => String(j.id) === String(editingJobId));
        if (idx !== -1) allJobs[idx] = { ...allJobs[idx], ...jobData };
        renderJobGrid();
        closeEditModal();
        toast("Job gespeichert.", "success");
    } catch {
        toast("Fehler beim Speichern.", "error");
    } finally {
        hideLoading();
        saveBtn.disabled = false;
        isActionRunning = false;
    }
});

/* ==================
   SPONSORS
================== */
async function loadSponsors() {
    try {
        const result = await getSponsors(adminKey);
        allSponsors = Array.isArray(result) ? result : [];
    } catch {
        allSponsors = [];
    }
    renderSponsorGrid();
    updateSponsorBadge();
}

function updateSponsorBadge() {
    if (allSponsors.length > 0) {
        sponsorBadge.textContent = allSponsors.length;
        sponsorBadge.classList.remove("hidden");
    } else {
        sponsorBadge.classList.add("hidden");
    }
}

function renderSponsorGrid() {
    sponsorGrid.innerHTML = "";
    sponsorsSubtitle.textContent = allSponsors.length + " Anfrage" + (allSponsors.length !== 1 ? "n" : "");

    if (allSponsors.length === 0) {
        const msg = document.createElement("p");
        msg.className = "no-jobs-msg";
        msg.textContent = "Keine Sponsor-Anfragen vorhanden.";
        sponsorGrid.appendChild(msg);
        return;
    }

    allSponsors.forEach(function(s) { sponsorGrid.appendChild(buildSponsorCard(s)); });
}

function buildSponsorCard(s) {
    const card = document.createElement("div");
    card.className = "sponsor-card";

    /* Logo */
    const logoWrap = document.createElement("div");
    logoWrap.style.display = "flex";
    logoWrap.style.alignItems = "center";
    logoWrap.style.gap = "14px";

    if (s.logo) {
        const img = document.createElement("img");
        img.className = "sponsor-logo-img";
        img.src = s.logo;
        img.alt = s.company + " Logo";
        logoWrap.appendChild(img);
    } else {
        const ph = document.createElement("div");
        ph.className = "sponsor-logo-ph";
        ph.textContent = "Kein Logo";
        logoWrap.appendChild(ph);
    }

    const nameEl = document.createElement("div");
    nameEl.className = "sponsor-company";
    nameEl.textContent = s.company || "–";
    logoWrap.appendChild(nameEl);
    card.appendChild(logoWrap);

    /* Meta */
    function metaRow(iconPath, content, isLink) {
        const row = document.createElement("div");
        row.className = "sponsor-meta-row";
        row.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + iconPath + '</svg>';
        if (isLink && content) {
            const a = document.createElement("a");
            a.href = content.startsWith("http") ? content : "https://" + content;
            a.textContent = content;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            row.appendChild(a);
        } else {
            const span = document.createElement("span");
            span.textContent = content || "–";
            row.appendChild(span);
        }
        return row;
    }

    card.appendChild(metaRow('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>', s.email, false));
    if (s.website) card.appendChild(metaRow('<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>', s.website, true));

    if (s.createdAt) {
        const dateEl = document.createElement("div");
        dateEl.className = "sponsor-date";
        dateEl.textContent = "Eingegangen: " + new Date(s.createdAt).toLocaleDateString("de-CH");
        card.appendChild(dateEl);
    }

    /* Status pill */
    const isApproved = s.status === "approved";
    const pill = document.createElement("span");
    pill.className = "status-pill " + (isApproved ? "verified" : "unverified");
    pill.textContent = isApproved ? "Genehmigt" : "Ausstehend";
    card.appendChild(pill);

    /* Actions */
    const actions = document.createElement("div");
    actions.className = "sponsor-actions";

    if (!isApproved) {
        const approveBtn = document.createElement("button");
        approveBtn.className = "ajc-btn verify-btn sponsor-approve-btn";
        approveBtn.dataset.id = String(s.id ?? "");
        approveBtn.innerHTML = svgIcon('<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>') + " Genehmigen";
        actions.appendChild(approveBtn);
    }

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "ajc-btn delete-btn sponsor-delete-btn";
    deleteBtn.dataset.id = String(s.id ?? "");
    deleteBtn.innerHTML = svgIcon('<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>') + " Löschen";

    actions.appendChild(deleteBtn);
    card.appendChild(actions);

    return card;
}

/* Event delegation for sponsor actions */
sponsorGrid.addEventListener("click", async function(e) {
    if (isActionRunning) return;
    const approveBtn = e.target.closest(".sponsor-approve-btn");
    const deleteBtn  = e.target.closest(".sponsor-delete-btn");
    if (approveBtn) await handleApproveSponsor(approveBtn.dataset.id);
    else if (deleteBtn) await handleDeleteSponsor(deleteBtn.dataset.id);
});

async function handleApproveSponsor(id) {
    isActionRunning = true;
    showLoading("Sponsor wird genehmigt…");
    try {
        const result = await approveSponsor(id, adminKey);
        if (!result.success) { toast(result.message || "Genehmigen fehlgeschlagen.", "error"); return; }
        const s = allSponsors.find(function(x) { return String(x.id) === String(id); });
        if (s) s.status = "approved";
        renderSponsorGrid();
        toast("Sponsor genehmigt – erscheint nun auf der Startseite.", "success");
    } catch {
        toast("Fehler beim Genehmigen.", "error");
    } finally {
        hideLoading();
        isActionRunning = false;
    }
}

async function handleDeleteSponsor(id) {
    if (!confirm("Diese Sponsor-Anfrage wirklich löschen?")) return;
    isActionRunning = true;
    showLoading("Anfrage wird gelöscht…");
    try {
        const result = await deleteSponsor(id, adminKey);
        if (!result.success) { toast(result.message || "Löschen fehlgeschlagen.", "error"); return; }
        allSponsors = allSponsors.filter(function(s) { return String(s.id) !== String(id); });
        renderSponsorGrid();
        updateSponsorBadge();
        toast("Anfrage gelöscht.", "success");
    } catch {
        toast("Fehler beim Löschen.", "error");
    } finally {
        hideLoading();
        isActionRunning = false;
    }
}

document.getElementById("sponsors-refresh-btn").addEventListener("click", async function() {
    showLoading("Anfragen werden geladen…");
    try {
        await loadSponsors();
        toast("Sponsor-Anfragen aktualisiert.", "success");
    } catch {
        toast("Laden fehlgeschlagen.", "error");
    } finally {
        hideLoading();
    }
});
