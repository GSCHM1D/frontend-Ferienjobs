/* ============================================
   KI-JOBSUCHE – ai-search.js
   Drawer am rechten Rand, öffnet sich aus dem
   Filter-Popup. Chat läuft über das Apps Script
   (action "aiChat"), das an Groq weiterleitet.
   ============================================ */

(function () {
    const openBtn   = document.getElementById("ai-search-open");
    const drawer    = document.getElementById("ai-drawer");
    const backdrop  = document.getElementById("ai-drawer-backdrop");
    const closeBtn  = document.getElementById("ai-drawer-close");
    const messages  = document.getElementById("ai-messages");
    const sugBox    = document.getElementById("ai-suggestions");
    const form      = document.getElementById("ai-form");
    const input     = document.getElementById("ai-input");
    const sendBtn   = document.getElementById("ai-send");

    if (!openBtn || !drawer) return;

    const gate       = document.getElementById("ai-gate");
    const gateAccept = document.getElementById("ai-gate-accept");
    const GATE_KEY   = "hjAiDisclaimerAccepted";

    /* Verlauf nur für die laufende Sitzung (wird nicht gespeichert) */
    let history = [];
    let isWaiting = false;
    let greeted = false;

    function gateAccepted() {
        try { return sessionStorage.getItem(GATE_KEY) === "1"; } catch { return false; }
    }

    function showGreeting() {
        if (greeted) return;
        greeted = true;
        addMessage("assistant",
            "Hi! Ich helfe dir, den passenden Ferienjob zu finden. " +
            "Erzähl mir zum Beispiel, was du gerne machst, wo du ungefähr wohnst " +
            "oder wann du Zeit hast – ich schaue, was gerade passt.");
    }

    /* ── Öffnen / Schliessen ── */
    function openDrawer() {
        drawer.classList.add("open");
        backdrop.classList.remove("hidden");
        drawer.setAttribute("aria-hidden", "false");
        document.body.classList.add("ai-drawer-open");

        /* Filter-Popup schliessen, falls offen */
        const popup = document.getElementById("filter-popup");
        if (popup) popup.classList.remove("open");

        if (gateAccepted()) {
            gate.classList.add("hidden");
            showGreeting();
            setTimeout(() => input.focus(), 250);
        } else {
            /* Hinweis zuerst: Chat bleibt gesperrt, bis er bestätigt ist */
            gate.classList.remove("hidden");
            sugBox.classList.add("hidden");
            input.disabled = true;
            sendBtn.disabled = true;
        }
        if (typeof trackEvent === "function") trackEvent("ai_search_opened");
    }

    gateAccept.addEventListener("click", function () {
        try { sessionStorage.setItem(GATE_KEY, "1"); } catch {}
        gate.classList.add("hidden");
        input.disabled = false;
        sendBtn.disabled = false;
        if (history.length === 0) sugBox.classList.remove("hidden");
        showGreeting();
        input.focus();
        if (typeof trackEvent === "function") trackEvent("ai_disclaimer_accepted");
    });

    function closeDrawer() {
        drawer.classList.remove("open");
        backdrop.classList.add("hidden");
        drawer.setAttribute("aria-hidden", "true");
        document.body.classList.remove("ai-drawer-open");
    }

    openBtn.addEventListener("click", openDrawer);
    closeBtn.addEventListener("click", closeDrawer);
    backdrop.addEventListener("click", closeDrawer);
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && drawer.classList.contains("open")) closeDrawer();
    });

    /* ── Nachrichten rendern (immer textContent – kein HTML aus der KI) ── */
    function addMessage(role, text) {
        const bubble = document.createElement("div");
        bubble.className = "ai-msg " + (role === "user" ? "ai-msg-user" : "ai-msg-bot");
        bubble.textContent = text;
        messages.appendChild(bubble);
        messages.scrollTop = messages.scrollHeight;
        return bubble;
    }

    function addTyping() {
        const t = document.createElement("div");
        t.className = "ai-msg ai-msg-bot ai-typing";
        t.setAttribute("aria-label", "KI schreibt");
        for (let i = 0; i < 3; i++) t.appendChild(document.createElement("span"));
        messages.appendChild(t);
        messages.scrollTop = messages.scrollHeight;
        return t;
    }

    /* ── Job-Empfehlungen: "JOBS: id1,id2"-Zeile der KI in Chips umwandeln ── */
    function extractJobIds(text) {
        const match = text.match(/\n?\s*JOBS:\s*([\d,\s]+)\s*$/i);
        if (!match) return { clean: text, ids: [] };
        const ids = match[1].split(",").map(s => s.trim()).filter(Boolean);
        return { clean: text.replace(match[0], "").trim(), ids: ids };
    }

    function findJob(id) {
        /* allJobs ist eine globale let-Bindung aus app.js (nicht auf window) */
        if (typeof allJobs === "undefined" || !Array.isArray(allJobs)) return null;
        return allJobs.find(j => String(j.id) === String(id)) || null;
    }

    function addJobChips(ids) {
        const jobs = ids.map(findJob).filter(Boolean);
        if (jobs.length === 0) return;

        const wrap = document.createElement("div");
        wrap.className = "ai-job-chips";

        const label = document.createElement("span");
        label.className = "ai-job-chips-label";
        label.textContent = "Passende Inserate:";
        wrap.appendChild(label);

        jobs.forEach(job => {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "ai-job-chip";
            chip.textContent = (job.title || "Inserat") + " · " + (job.location || "");
            chip.addEventListener("click", function () {
                const card = document.querySelector('.job-card[data-job-id="' + String(job.id) + '"]');
                if (!card) return;
                closeDrawer();
                card.scrollIntoView({ behavior: "smooth", block: "center" });
                card.classList.remove("job-card-flash");
                void card.offsetWidth; /* Animation neu starten */
                card.classList.add("job-card-flash");
            });
            wrap.appendChild(chip);
        });

        messages.appendChild(wrap);
        messages.scrollTop = messages.scrollHeight;
    }

    /* ── Senden ── */
    async function send(text) {
        text = String(text || "").trim();
        if (!text || isWaiting) return;

        sugBox.classList.add("hidden");
        addMessage("user", text);
        history.push({ role: "user", content: text });
        input.value = "";

        isWaiting = true;
        sendBtn.disabled = true;
        const typing = addTyping();
        if (typeof trackEvent === "function") trackEvent("ai_message_sent");

        try {
            const result = await aiChat(history.slice(-10));
            typing.remove();

            if (!result || !result.success || !result.reply) {
                addMessage("assistant", (result && result.message) || "Die KI ist gerade nicht erreichbar – bitte versuch es in einem Moment nochmal.");
                return;
            }

            const { clean, ids } = extractJobIds(String(result.reply));
            addMessage("assistant", clean);
            history.push({ role: "assistant", content: clean });
            addJobChips(ids);
        } catch (err) {
            console.error(err);
            typing.remove();
            addMessage("assistant", "Die KI ist gerade nicht erreichbar – bitte versuch es in einem Moment nochmal.");
        } finally {
            isWaiting = false;
            sendBtn.disabled = false;
            input.focus();
        }
    }

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        send(input.value);
    });

    sugBox.addEventListener("click", function (e) {
        const btn = e.target.closest(".ai-suggestion");
        if (btn) send(btn.textContent);
    });
})();
