/* ============================================
   ADMIN PANEL – admin.js
   Single-Key Login, kein Multi-User
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
   SESSION
================== */
const SESSION_KEY = "hjAdminKey";

function getStoredKey() {
    return sessionStorage.getItem(SESSION_KEY) || "";
}
function storeKey(key) {
    sessionStorage.setItem(SESSION_KEY, key);
}
function clearStoredKey() {
    sessionStorage.removeItem(SESSION_KEY);
}

/* ==================
   LOGIN
================== */
const loginScreen = document.getElementById("login-screen");
const adminApp    = document.getElementById("admin-app");
const loginForm   = document.getElementById("login-form");
const loginError  = document.getElementById("login-error");
const loginBtn    = document.getElementById("login-btn");

loginForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    const key = document.getElementById("login-key").value.trim();
    if (!key) return;

    loginBtn.disabled    = true;
    loginBtn.textContent = "Anmelden…";
    loginError.classList.add("hidden");

    try {
        const result = await checkAdminKey(key);
        if (result.success) {
            adminKey = key;
            storeKey(key);
            enterDashboard();
        } else {
            loginError.textContent = result.message || "Ungültiger Schlüssel.";
            loginError.classList.remove("hidden");
        }
    } catch {
        loginError.textContent = "Verbindungsfehler. Bitte erneut versuchen.";
        loginError.classList.remove("hidden");
    } finally {
        loginBtn.disabled    = false;
        loginBtn.textContent = "Anmelden";
    }
});

/* ==================
   DASHBOARD INIT
================== */
function enterDashboard() {
    loginScreen.classList.add("hidden");
    adminApp.classList.remove("hidden");
    checkApiStatus();
    Promise.all([loadJobs(), loadSponsors()]).then(initDashboardCharts);
}

(function init() {
    const stored = getStoredKey();
    if (stored) {
        adminKey = stored;
        enterDashboard();
    }
})();

/* ==================
   LOGOUT
================== */
document.getElementById("logout-btn").addEventListener("click", function() {
    clearStoredKey();
    adminKey = "";
    adminApp.classList.add("hidden");
    loginScreen.classList.remove("hidden");
    document.getElementById("login-key").value = "";
});

/* ==================
   TAB NAVIGATION
================== */
function switchTab(tabId) {
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.add("hidden"));
    document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
    const panel = document.getElementById("tab-" + tabId);
    if (panel) panel.classList.remove("hidden");
    const navBtn = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
    if (navBtn) navBtn.classList.add("active");
    const titles = { dashboard: "Übersicht", jobs: "Job-Verwaltung", sponsors: "Sponsor-Anfragen" };
    document.getElementById("topbar-title").textContent = titles[tabId] || tabId;
}

document.querySelectorAll(".nav-item[data-tab]").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

document.querySelectorAll(".quick-action[data-switch-tab]").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.switchTab));
});

/* ==================
   API STATUS
================== */
async function checkApiStatus() {
    const dot  = document.getElementById("api-dot");
    const text = document.getElementById("api-status-text");
    const det  = document.getElementById("api-detail-text");
    dot.className = "api-dot loading";
    text.textContent = "Verbindung wird geprüft…";
    try {
        const t0 = Date.now();
        await getJobs();
        const ms = Date.now() - t0;
        dot.className = "api-dot ok";
        text.textContent = `Verbunden (${ms} ms)`;
        if (det) det.textContent = `${ms} ms`;
    } catch {
        dot.className = "api-dot error";
        text.textContent = "Nicht erreichbar";
        if (det) det.textContent = "Fehler";
    }
}

/* ==================
   LOADING
================== */
function showLoading(msg) {
    document.getElementById("loading-text").textContent = msg || "Bitte warten…";
    document.getElementById("admin-loading-overlay").classList.remove("hidden");
}
function hideLoading() {
    document.getElementById("admin-loading-overlay").classList.add("hidden");
}

/* ==================
   TOAST
================== */
function toast(msg, type) {
    const container = document.getElementById("toast-container");
    const t = document.createElement("div");
    t.className = `toast ${type || ""}`;
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}

/* ==================
   SVG HELPER
================== */
function svgIcon(path) {
    return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

/* ==================
   JOBS
================== */
async function loadJobs() {
    try {
        const data = await getJobs();
        allJobs = Array.isArray(data) ? data : [];
    } catch { allJobs = []; }
    renderJobs();
    updatePendingBadge();
    updateStats();
}

function updatePendingBadge() {
    const badge = document.getElementById("pending-badge");
    const n = allJobs.filter(j => j.status !== "verified").length;
    if (n > 0) { badge.textContent = n; badge.classList.remove("hidden"); }
    else badge.classList.add("hidden");
}

function updateStats() {
    const total    = allJobs.length;
    const verified = allJobs.filter(j => j.status === "verified").length;
    document.getElementById("stat-total").textContent    = total;
    document.getElementById("stat-verified").textContent = verified;
    document.getElementById("stat-pending").textContent  = total - verified;
    document.getElementById("stat-sponsors").textContent = allSponsors.length;
}

function renderJobs() {
    const grid     = document.getElementById("admin-job-grid");
    const search   = (document.getElementById("jobs-search").value || "").toLowerCase();
    const subtitle = document.getElementById("jobs-panel-subtitle");

    let jobs = allJobs;
    if (currentFilter === "verified")   jobs = jobs.filter(j => j.status === "verified");
    if (currentFilter === "unverified") jobs = jobs.filter(j => j.status !== "verified");
    if (search) jobs = jobs.filter(j =>
        (j.title    || "").toLowerCase().includes(search) ||
        (j.company  || "").toLowerCase().includes(search) ||
        (j.location || "").toLowerCase().includes(search)
    );

    subtitle.textContent = `${jobs.length} von ${allJobs.length} Jobs`;
    grid.innerHTML = "";
    if (jobs.length === 0) {
        const msg = document.createElement("p");
        msg.className = "empty-msg";
        msg.textContent = "Keine Jobs gefunden.";
        grid.appendChild(msg);
        return;
    }
    jobs.forEach(j => grid.appendChild(buildJobCard(j)));
}

function buildJobCard(job) {
    const isVerified = job.status === "verified";
    const card = document.createElement("div");
    card.className = "ajc";
    card.dataset.id = job.id;

    const main = document.createElement("div");
    main.className = "ajc-main";
    const title = document.createElement("div"); title.className = "ajc-title"; title.textContent = job.title || "–";
    const meta  = document.createElement("div"); meta.className  = "ajc-meta";  meta.textContent  = [job.company, job.location].filter(Boolean).join(" · ");
    main.appendChild(title); main.appendChild(meta);

    const info = document.createElement("div");
    info.className = "ajc-info";
    function infoRow(label, value) {
        const d = document.createElement("div"); d.className = "ajc-info-row";
        const strong = document.createElement("strong"); strong.textContent = label + ": ";
        d.appendChild(strong);
        d.appendChild(document.createTextNode(value || "–"));
        info.appendChild(d);
    }
    infoRow("Lohn", job.salary);
    infoRow("Kategorie", job.category);

    const pill = document.createElement("span");
    pill.className = `status-pill ${isVerified ? "verified" : "unverified"}`;
    pill.textContent = isVerified ? "Verifiziert" : "Ausstehend";

    const actions = document.createElement("div");
    actions.className = "ajc-actions";

    if (!isVerified) {
        const vBtn = document.createElement("button");
        vBtn.className = "ajc-btn verify-btn job-verify-btn";
        vBtn.dataset.id = String(job.id ?? "");
        vBtn.innerHTML = svgIcon('<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>') + " Verifizieren";
        actions.appendChild(vBtn);
    }

    const dBtn = document.createElement("button");
    dBtn.className = "ajc-btn delete-btn job-delete-btn";
    dBtn.dataset.id = String(job.id ?? "");
    dBtn.innerHTML = svgIcon('<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>') + " Löschen";
    actions.appendChild(dBtn);

    const eBtn = document.createElement("button");
    eBtn.className = "ajc-btn edit-btn job-edit-btn";
    eBtn.dataset.id = String(job.id ?? "");
    eBtn.innerHTML = svgIcon('<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>') + " Bearbeiten";
    actions.appendChild(eBtn);

    const rightCol = document.createElement("div");
    rightCol.style.cssText = "display:flex;flex-direction:column;gap:8px;align-items:flex-end";
    rightCol.appendChild(pill);
    rightCol.appendChild(actions);

    card.appendChild(main);
    card.appendChild(info);
    card.appendChild(rightCol);
    return card;
}

document.getElementById("admin-job-grid").addEventListener("click", async function(e) {
    if (isActionRunning) return;
    const vBtn = e.target.closest(".job-verify-btn");
    const dBtn = e.target.closest(".job-delete-btn");
    const eBtn = e.target.closest(".job-edit-btn");
    if (vBtn) await handleVerifyJob(vBtn.dataset.id);
    else if (dBtn) await handleDeleteJob(dBtn.dataset.id);
    else if (eBtn) openEditModal(eBtn.dataset.id);
});

async function handleVerifyJob(id) {
    isActionRunning = true;
    showLoading("Job wird verifiziert…");
    try {
        const result = await verifyJob(id, adminKey);
        if (!result.success) { toast(result.message || "Fehler", "error"); return; }
        const j = allJobs.find(x => String(x.id) === String(id));
        if (j) j.status = "verified";
        renderJobs(); updatePendingBadge(); updateStats();
        toast("Job verifiziert.", "success");
    } catch { toast("Fehler beim Verifizieren.", "error"); }
    finally { hideLoading(); isActionRunning = false; }
}

async function handleDeleteJob(id) {
    if (!confirm("Diesen Job wirklich löschen?")) return;
    isActionRunning = true;
    showLoading("Job wird gelöscht…");
    try {
        const result = await deleteJob(id, adminKey);
        if (!result.success) { toast(result.message || "Fehler", "error"); return; }
        allJobs = allJobs.filter(j => String(j.id) !== String(id));
        renderJobs(); updatePendingBadge(); updateStats();
        toast("Job gelöscht.", "success");
    } catch { toast("Fehler beim Löschen.", "error"); }
    finally { hideLoading(); isActionRunning = false; }
}

document.getElementById("jobs-search").addEventListener("input", renderJobs);
document.querySelectorAll(".filter-tab").forEach(btn => {
    btn.addEventListener("click", function() {
        document.querySelectorAll(".filter-tab").forEach(b => b.classList.remove("active"));
        this.classList.add("active");
        currentFilter = this.dataset.filter;
        renderJobs();
    });
});

document.getElementById("jobs-refresh-btn").addEventListener("click", async function() {
    showLoading("Jobs werden geladen…");
    try { await loadJobs(); toast("Jobs aktualisiert.", "success"); }
    catch { toast("Fehler beim Laden.", "error"); }
    finally { hideLoading(); }
});

document.getElementById("dash-refresh-btn").addEventListener("click", async function() {
    showLoading("Wird aktualisiert…");
    try {
        await Promise.all([loadJobs(), loadSponsors(), checkApiStatus()]);
        initDashboardCharts();
        toast("Aktualisiert.", "success");
    }
    catch { toast("Fehler.", "error"); }
    finally { hideLoading(); }
});

/* ==================
   EDIT MODAL
================== */
function openEditModal(id) {
    const job = allJobs.find(j => String(j.id) === String(id));
    if (!job) return;
    document.getElementById("edit-job-id").value          = String(id);
    document.getElementById("edit-company").value         = job.company         || "";
    document.getElementById("edit-title").value           = job.title           || "";
    document.getElementById("edit-category").value        = job.category        || "";
    document.getElementById("edit-location").value        = job.location        || "";
    document.getElementById("edit-contact").value         = job.contact         || "";
    document.getElementById("edit-salary").value          = job.salary          || "";
    document.getElementById("edit-requirements").value    = job.requirements    || "";
    document.getElementById("edit-date-from").value       = job.date_from       || "";
    document.getElementById("edit-date-to").value         = job.date_to         || "";
    document.getElementById("edit-specific-or-not").value = job.specific_or_not || "";
    document.getElementById("edit-description").value     = job.description     || "";
    document.getElementById("edit-modal").classList.remove("hidden");
}

document.getElementById("edit-modal-close").addEventListener("click", () => document.getElementById("edit-modal").classList.add("hidden"));
document.getElementById("edit-cancel-btn").addEventListener("click",  () => document.getElementById("edit-modal").classList.add("hidden"));

document.getElementById("edit-form").addEventListener("submit", async function(e) {
    e.preventDefault();
    isActionRunning = true;
    showLoading("Änderungen werden gespeichert…");
    const id = document.getElementById("edit-job-id").value;
    const data = {
        company:         document.getElementById("edit-company").value.trim(),
        title:           document.getElementById("edit-title").value.trim(),
        category:        document.getElementById("edit-category").value,
        location:        document.getElementById("edit-location").value.trim(),
        contact:         document.getElementById("edit-contact").value.trim(),
        salary:          document.getElementById("edit-salary").value.trim(),
        requirements:    document.getElementById("edit-requirements").value.trim(),
        date_from:       document.getElementById("edit-date-from").value,
        date_to:         document.getElementById("edit-date-to").value,
        specific_or_not: document.getElementById("edit-specific-or-not").value,
        description:     document.getElementById("edit-description").value.trim(),
    };
    try {
        const result = await editJob(id, adminKey, data);
        if (!result.success) { toast(result.message || "Fehler", "error"); return; }
        const j = allJobs.find(x => String(x.id) === String(id));
        if (j) Object.assign(j, data);
        renderJobs();
        document.getElementById("edit-modal").classList.add("hidden");
        toast("Job gespeichert.", "success");
    } catch { toast("Fehler beim Speichern.", "error"); }
    finally { hideLoading(); isActionRunning = false; }
});

/* ==================
   SPONSORS
================== */
async function loadSponsors() {
    try {
        const result = await getSponsors(adminKey);
        allSponsors = Array.isArray(result) ? result : [];
    } catch { allSponsors = []; }
    renderSponsorGrid();
    updateSponsorBadge();
    updateStats();
}

function updateSponsorBadge() {
    const badge = document.getElementById("sponsor-badge");
    const pending = allSponsors.filter(s => s.status !== "approved").length;
    if (pending > 0) { badge.textContent = pending; badge.classList.remove("hidden"); }
    else badge.classList.add("hidden");
}

function renderSponsorGrid() {
    const grid     = document.getElementById("admin-sponsor-grid");
    const subtitle = document.getElementById("sponsors-panel-subtitle");
    grid.innerHTML = "";
    subtitle.textContent = allSponsors.length + " Anfrage" + (allSponsors.length !== 1 ? "n" : "");

    if (allSponsors.length === 0) {
        const msg = document.createElement("p");
        msg.className = "empty-msg";
        msg.textContent = "Keine Sponsor-Anfragen vorhanden.";
        grid.appendChild(msg);
        return;
    }
    allSponsors.forEach(s => grid.appendChild(buildSponsorCard(s)));
}

function buildSponsorCard(s) {
    const card = document.createElement("div");
    card.className = "sponsor-card";

    if (s.logo) {
        const img = document.createElement("img");
        img.className = "sponsor-logo-img"; img.src = s.logo; img.alt = (s.company || "") + " Logo";
        card.appendChild(img);
    } else {
        const ph = document.createElement("div");
        ph.className = "sponsor-logo-ph"; ph.textContent = "Kein Logo";
        card.appendChild(ph);
    }

    const body = document.createElement("div");
    body.className = "sponsor-body";

    const nameEl = document.createElement("div");
    nameEl.className = "sponsor-company"; nameEl.textContent = s.company || "–";
    body.appendChild(nameEl);

    function metaRow(iconPath, content, isLink) {
        const row = document.createElement("div"); row.className = "sponsor-meta-row";
        row.innerHTML = svgIcon(iconPath);
        if (isLink && content) {
            const a = document.createElement("a");
            a.href = content.startsWith("http") ? content : "https://" + content;
            a.textContent = content; a.target = "_blank"; a.rel = "noopener noreferrer";
            row.appendChild(a);
        } else {
            const span = document.createElement("span"); span.textContent = content || "–";
            row.appendChild(span);
        }
        return row;
    }

    body.appendChild(metaRow('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>', s.email, false));
    if (s.website) body.appendChild(metaRow('<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>', s.website, true));

    if (s.createdAt) {
        const dateEl = document.createElement("div");
        dateEl.className = "sponsor-date";
        dateEl.textContent = "Eingegangen: " + new Date(s.createdAt).toLocaleDateString("de-CH");
        body.appendChild(dateEl);
    }

    const isApproved = s.status === "approved";
    const actions = document.createElement("div");
    actions.className = "sponsor-actions";

    const pill = document.createElement("span");
    pill.className = "status-pill " + (isApproved ? "verified" : "unverified");
    pill.textContent = isApproved ? "Genehmigt" : "Ausstehend";
    actions.appendChild(pill);

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
    deleteBtn.innerHTML = svgIcon('<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>') + " Löschen";
    actions.appendChild(deleteBtn);

    body.appendChild(actions);
    card.appendChild(body);
    return card;
}

document.getElementById("admin-sponsor-grid").addEventListener("click", async function(e) {
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
        await loadSponsors();
        toast("Sponsor genehmigt – erscheint nun auf der Startseite.", "success");
    } catch { toast("Fehler beim Genehmigen.", "error"); }
    finally { hideLoading(); isActionRunning = false; }
}

async function handleDeleteSponsor(id) {
    if (!confirm("Diese Sponsor-Anfrage wirklich löschen?")) return;
    isActionRunning = true;
    showLoading("Anfrage wird gelöscht…");
    try {
        const result = await deleteSponsor(id, adminKey);
        if (!result.success) { toast(result.message || "Löschen fehlgeschlagen.", "error"); return; }
        await loadSponsors();
        toast("Anfrage gelöscht.", "success");
    } catch { toast("Fehler beim Löschen.", "error"); }
    finally { hideLoading(); isActionRunning = false; }
}

document.getElementById("sponsors-refresh-btn").addEventListener("click", async function() {
    showLoading("Anfragen werden geladen…");
    try { await loadSponsors(); toast("Sponsor-Anfragen aktualisiert.", "success"); }
    catch { toast("Laden fehlgeschlagen.", "error"); }
    finally { hideLoading(); }
});

/* ==================
   DASHBOARD CHARTS
================== */
let _charts = {};

function destroyCharts() {
    Object.values(_charts).forEach(c => { try { c.destroy(); } catch {} });
    _charts = {};
}

function initDashboardCharts() {
    if (typeof Chart === "undefined") return;
    Chart.defaults.font.family = "'DM Sans', system-ui, sans-serif";
    Chart.defaults.font.size   = 12;
    Chart.defaults.color       = "#9ca3af";
    destroyCharts();
    buildTimelineChart();
    buildCategoryChart();
    buildStatusChart();
    buildSponsorChart();
    buildLocationChart();
    animateStatNumbers();
    const el = document.getElementById("dash-updated-at");
    if (el) el.textContent = new Date().toLocaleTimeString("de-CH");
}

const CHART_PALETTE = [
    "#1769ff", "#10b981", "#f59e0b", "#8b5cf6",
    "#06b6d4", "#f97316", "#ec4899", "#6b7280"
];

const TOOLTIP_DEFAULTS = {
    backgroundColor: "#fff",
    titleColor: "#111827",
    bodyColor: "#374151",
    borderColor: "#e5e7eb",
    borderWidth: 1,
    padding: 10,
};

function weekStart(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d.toISOString().slice(0, 10);
}

function buildTimelineChart() {
    const WEEKS = 12;
    const weeks = {};
    for (let i = WEEKS - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i * 7);
        weeks[weekStart(d)] = 0;
    }
    allJobs.forEach(j => {
        if (!j.createdAt) return;
        const k = weekStart(j.createdAt);
        if (k in weeks) weeks[k]++;
    });
    const labels = Object.keys(weeks).map(k => {
        const d = new Date(k);
        return `${d.getDate()}.${d.getMonth() + 1}.`;
    });
    const data = Object.values(weeks);

    const canvas = document.getElementById("chart-timeline");
    if (!canvas) return;
    const grd = canvas.getContext("2d").createLinearGradient(0, 0, 0, 200);
    grd.addColorStop(0, "rgba(23,105,255,0.16)");
    grd.addColorStop(1, "rgba(23,105,255,0)");

    _charts.timeline = new Chart(canvas, {
        type: "line",
        data: {
            labels,
            datasets: [{
                data,
                borderColor: "#1769ff",
                backgroundColor: grd,
                fill: true,
                tension: 0.45,
                pointBackgroundColor: "#1769ff",
                pointBorderColor: "#fff",
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                borderWidth: 2.5,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 900, easing: "easeOutQuart" },
            plugins: {
                legend: { display: false },
                tooltip: {
                    ...TOOLTIP_DEFAULTS,
                    callbacks: {
                        title: items => "KW " + items[0].label,
                        label: item => ` ${item.raw} neue Inserat${item.raw !== 1 ? "e" : ""}`
                    }
                }
            },
            scales: {
                x: { grid: { color: "rgba(0,0,0,0.03)" }, border: { display: false } },
                y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 }, grid: { color: "rgba(0,0,0,0.04)" }, border: { display: false } }
            }
        }
    });
}

function buildCategoryChart() {
    const cats = {};
    allJobs.forEach(j => { const c = j.category || "Sonstiges"; cats[c] = (cats[c] || 0) + 1; });
    const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    const canvas = document.getElementById("chart-category");
    if (!canvas) return;
    if (sorted.length === 0) { renderNoData(canvas); return; }
    _charts.category = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels: sorted.map(e => e[0]),
            datasets: [{ data: sorted.map(e => e[1]), backgroundColor: CHART_PALETTE, borderWidth: 0, hoverOffset: 6 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            animation: { duration: 900, easing: "easeOutQuart" },
            cutout: "66%",
            plugins: { legend: { position: "bottom", labels: { boxWidth: 10, padding: 10, font: { size: 11 } } }, tooltip: { ...TOOLTIP_DEFAULTS } }
        }
    });
}

function buildStatusChart() {
    const verified = allJobs.filter(j => j.status === "verified").length;
    const pending  = allJobs.length - verified;
    const canvas = document.getElementById("chart-status");
    if (!canvas) return;
    if (allJobs.length === 0) { renderNoData(canvas); return; }
    _charts.status = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels: ["Verifiziert", "Ausstehend"],
            datasets: [{ data: [verified, pending], backgroundColor: ["#10b981", "#f59e0b"], borderWidth: 0, hoverOffset: 6 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            animation: { duration: 900, easing: "easeOutQuart" },
            cutout: "66%",
            plugins: { legend: { position: "bottom", labels: { boxWidth: 10, padding: 10, font: { size: 11 } } }, tooltip: { ...TOOLTIP_DEFAULTS } }
        }
    });
}

function buildSponsorChart() {
    const approved = allSponsors.filter(s => s.status === "approved").length;
    const pending  = allSponsors.length - approved;
    const canvas = document.getElementById("chart-sponsors");
    if (!canvas) return;
    if (allSponsors.length === 0) { renderNoData(canvas); return; }
    _charts.sponsors = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels: ["Genehmigt", "Ausstehend"],
            datasets: [{ data: [approved, pending], backgroundColor: ["#1769ff", "#e5e7eb"], borderWidth: 0, hoverOffset: 6 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            animation: { duration: 900, easing: "easeOutQuart" },
            cutout: "66%",
            plugins: { legend: { position: "bottom", labels: { boxWidth: 10, padding: 10, font: { size: 11 } } }, tooltip: { ...TOOLTIP_DEFAULTS } }
        }
    });
}

function buildLocationChart() {
    const locs = {};
    allJobs.forEach(j => {
        const raw = (j.location || "").trim();
        const loc = raw.replace(/^\d{4,}\s*/, "").split(",")[0].trim() || raw.split(" ")[0] || "Unbekannt";
        if (loc) locs[loc] = (locs[loc] || 0) + 1;
    });
    const top = Object.entries(locs).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const canvas = document.getElementById("chart-locations");
    if (!canvas) return;
    if (top.length === 0) { renderNoData(canvas); return; }
    _charts.locations = new Chart(canvas, {
        type: "bar",
        data: {
            labels: top.map(e => e[0]),
            datasets: [{
                data: top.map(e => e[1]),
                backgroundColor: "rgba(23,105,255,0.10)",
                borderColor: "#1769ff",
                borderWidth: 1.5,
                borderRadius: 5,
                hoverBackgroundColor: "rgba(23,105,255,0.22)",
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            animation: { duration: 900, easing: "easeOutQuart" },
            plugins: { legend: { display: false }, tooltip: { ...TOOLTIP_DEFAULTS } },
            scales: {
                x: { grid: { display: false }, border: { display: false } },
                y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 }, grid: { color: "rgba(0,0,0,0.04)" }, border: { display: false } }
            }
        }
    });
}

function renderNoData(canvas) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#9ca3af";
    ctx.font = "13px 'DM Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Keine Daten", canvas.width / 2, canvas.height / 2);
}

function animateStatNumbers() {
    [
        { id: "stat-total",    val: allJobs.length },
        { id: "stat-verified", val: allJobs.filter(j => j.status === "verified").length },
        { id: "stat-pending",  val: allJobs.filter(j => j.status !== "verified").length },
        { id: "stat-sponsors", val: allSponsors.length },
    ].forEach(({ id, val }) => {
        const el = document.getElementById(id);
        if (!el) return;
        const duration = 700, startTime = performance.now();
        (function step(now) {
            const p = Math.min((now - startTime) / duration, 1);
            el.textContent = Math.round(easeOutQuart(p) * val);
            if (p < 1) requestAnimationFrame(step);
        })(performance.now());
    });
}

function easeOutQuart(t) { return 1 - Math.pow(1 - t, 4); }
