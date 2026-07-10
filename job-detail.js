(function () {
    "use strict";

    const container = document.getElementById("job-detail");
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get("id");

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function formatDate(value) {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        return new Intl.DateTimeFormat("de-CH", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }).format(date);
    }

    function durationText(job) {
        if (job.specific_or_not === "Dauerhaft") return "Dauerhaft Aushilfe gesucht";
        if (job.specific_or_not === "flexibel") return "Zeitraum flexibel absprechbar";
        if (job.specific_or_not === "Spezifisch" && job.date_from && job.date_to) {
            return `${formatDate(job.date_from)} – ${formatDate(job.date_to)}`;
        }
        return "Nach Absprache";
    }

    function findEmail(job) {
        const text = `${job.contact || ""} ${job.description || ""}`;
        const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
        return match ? match[0] : "";
    }

    function findPhone(job) {
        const match = String(job.contact || "").match(/(?:\+41|0)(?:[\s/().-]*\d){9,}/);
        return match ? match[0].trim() : "";
    }

    function normalizePhone(phone) {
        const compact = phone.replace(/[^\d+]/g, "");
        return compact.startsWith("0") ? `+41${compact.slice(1)}` : compact;
    }

    function metaItem(label, value, highlight) {
        const item = el("div", `job-detail-meta-item${highlight ? " highlight" : ""}`);
        item.appendChild(el("span", "job-detail-meta-label", label));
        item.appendChild(el("strong", "job-detail-meta-value", value || "–"));
        return item;
    }

    function showError(title, text) {
        container.textContent = "";
        const box = el("div", "job-detail-error");
        box.appendChild(el("h1", null, title));
        box.appendChild(el("p", null, text));
        const back = el("a", "btn btn-solid", "Alle Ferienjobs ansehen");
        back.href = "index.html#jobs";
        box.appendChild(back);
        container.appendChild(box);
    }

    function updatePageMetadata(job) {
        const canonical = `https://holidayjob.ch/job.html?id=${encodeURIComponent(String(job.id))}`;
        const title = `${job.title || "Ferienjob"} bei ${job.company || "Inserent"} | holidayjob.ch`;
        const description = String(job.description || "Ferienjob auf holidayjob.ch").slice(0, 155);

        document.title = title;
        document.querySelector('meta[name="description"]').setAttribute("content", description);
        document.getElementById("job-canonical").setAttribute("href", canonical);
        document.getElementById("job-og-title").setAttribute("content", title);
        document.getElementById("job-og-description").setAttribute("content", description);
        document.getElementById("job-og-url").setAttribute("content", canonical);
        document.getElementById("job-robots").setAttribute("content", "index, follow, max-image-preview:large");
    }

    function isExpired(job) {
        if (job.specific_or_not !== "Spezifisch" || !job.date_to) return false;
        const end = new Date(job.date_to);
        if (Number.isNaN(end.getTime())) return false;
        end.setHours(23, 59, 59, 999);
        return end.getTime() < Date.now();
    }

    function parseHourlySalary(salary) {
        const normalized = String(salary || "").replace(/,/g, ".");
        if (!/(?:\/\s*h\b|pro\s+stunde|stundenlohn|je\s+stunde)/i.test(normalized)) return null;
        const numbers = normalized.match(/\d+(?:\.\d+)?/g);
        if (!numbers || numbers.length === 0) return null;
        const values = numbers.map(Number).filter(Number.isFinite);
        if (values.length === 0) return null;
        return values.length > 1
            ? { minValue: Math.min(...values), maxValue: Math.max(...values) }
            : { value: values[0] };
    }

    function injectJobPosting(job, hasApplyOption) {
        if (!hasApplyOption || !job.createdAt || !job.title || !job.description || !job.company || !job.location || isExpired(job)) return;

        const postalMatch = String(job.location).match(/\b\d{4}\b/);
        const schema = {
            "@context": "https://schema.org",
            "@type": "JobPosting",
            "title": job.title,
            "description": `<p>${String(job.description).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`,
            "identifier": {
                "@type": "PropertyValue",
                "name": "holidayjob.ch",
                "value": String(job.id)
            },
            "datePosted": String(job.createdAt).slice(0, 10),
            "directApply": true,
            "hiringOrganization": {
                "@type": "Organization",
                "name": job.company
            },
            "jobLocation": {
                "@type": "Place",
                "address": {
                    "@type": "PostalAddress",
                    "addressLocality": String(job.location).replace(/\b\d{4}\b/, "").replace(/^\s*[/,-]\s*|\s*[/,-]\s*$/g, "").trim() || job.location,
                    "addressCountry": "CH"
                }
            }
        };

        if (postalMatch) schema.jobLocation.address.postalCode = postalMatch[0];
        if (job.specific_or_not === "Spezifisch") schema.employmentType = "TEMPORARY";
        if (job.specific_or_not === "Spezifisch" && job.date_to) schema.validThrough = String(job.date_to).slice(0, 10);

        const salary = parseHourlySalary(job.salary);
        if (salary) {
            schema.baseSalary = {
                "@type": "MonetaryAmount",
                "currency": "CHF",
                "value": {
                    "@type": "QuantitativeValue",
                    ...salary,
                    "unitText": "HOUR"
                }
            };
        }

        const script = document.createElement("script");
        script.type = "application/ld+json";
        script.id = "jobposting-schema";
        script.textContent = JSON.stringify(schema);
        document.head.appendChild(script);
    }

    function renderJob(job) {
        updatePageMetadata(job);
        container.textContent = "";

        const top = el("header", "job-detail-header");
        const badges = el("div", "job-badge-row");
        if (job.category) badges.appendChild(el("span", "job-category-badge", job.category));
        if (isExpired(job)) badges.appendChild(el("span", "job-expired-badge", "Zeitraum abgelaufen"));
        top.appendChild(badges);
        top.appendChild(el("h1", null, job.title || "Ferienjob"));
        top.appendChild(el("p", "job-detail-company", job.company || "Inserent"));
        container.appendChild(top);

        const meta = el("div", "job-detail-meta-grid");
        meta.appendChild(metaItem("Ort / Region", job.location, false));
        meta.appendChild(metaItem("Lohn", job.salary, true));
        meta.appendChild(metaItem("Zeitraum", durationText(job), false));
        if (job.requirements) meta.appendChild(metaItem("Anforderungen", job.requirements, false));
        container.appendChild(meta);

        const description = el("section", "job-detail-description");
        description.appendChild(el("h2", null, "Das erwartet dich"));
        description.appendChild(el("p", null, job.description || "Keine weitere Beschreibung vorhanden."));
        container.appendChild(description);

        const contact = el("section", "job-detail-contact");
        contact.appendChild(el("span", "section-eyebrow", "Direkt bewerben"));
        contact.appendChild(el("h2", null, "Kontakt aufnehmen"));
        contact.appendChild(el("p", "job-detail-contact-value", job.contact || "Kontaktangabe im Inserat beachten."));

        const email = findEmail(job);
        const phone = findPhone(job);
        const actions = el("div", "job-detail-actions");

        if (email) {
            const subject = `Bewerbung: ${job.title || "Ferienjob"} – via holidayjob.ch`;
            const body = `Guten Tag\n\nich interessiere mich für den Ferienjob „${job.title || ""}“.\n\nName: \nAlter: \nVerfügbar von/bis: \n\nFreundliche Grüsse`;
            const link = el("a", "btn btn-solid", "Per E-Mail bewerben");
            link.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            actions.appendChild(link);
        }

        if (phone) {
            const link = el("a", "btn btn-navy", "Jetzt anrufen");
            link.href = `tel:${normalizePhone(phone)}`;
            actions.appendChild(link);
        }

        const share = el("button", "btn btn-ghost", "Job teilen");
        share.type = "button";
        share.addEventListener("click", async function () {
            const data = { title: document.title, text: `${job.title} bei ${job.company}`, url: window.location.href };
            try {
                if (navigator.share) await navigator.share(data);
                else {
                    await navigator.clipboard.writeText(window.location.href);
                    share.textContent = "Link kopiert";
                }
            } catch (error) {
                if (error && error.name !== "AbortError") share.textContent = "Teilen nicht möglich";
            }
        });
        actions.appendChild(share);
        contact.appendChild(actions);

        const report = el("a", "job-detail-report", "Problematisches Inserat melden");
        report.href = `mailto:holidayjob.ch@gmail.com?subject=${encodeURIComponent("Inserat melden: " + (job.title || "") + " (ID " + (job.id || "?") + ")")}`;
        contact.appendChild(report);
        container.appendChild(contact);

        injectJobPosting(job, Boolean(email || phone));
    }

    async function start() {
        if (!jobId) {
            showError("Inserat nicht gefunden", "In diesem Link fehlt die Job-ID.");
            return;
        }

        try {
            const jobs = await getJobs();
            const job = Array.isArray(jobs)
                ? jobs.find(item => String(item.id) === String(jobId))
                : null;

            if (!job) {
                showError("Inserat nicht gefunden", "Das Inserat ist nicht verfügbar oder der Link ist nicht mehr aktuell.");
                return;
            }

            renderJob(job);
        } catch (error) {
            console.error(error);
            showError("Inserat konnte nicht geladen werden", "Bitte versuche es später erneut.");
        }
    }

    start();
}());
