/* ============================================
   INTERAKTIVE FERIENJOB-KARTE – map.js
   Leaflet + OpenStreetMap + Marker-Clustering
   (lokal aus vendor/leaflet/, lazy geladen beim
   ersten Wechsel auf die Kartenansicht)
   ============================================ */

(function () {
    "use strict";

    /* ══════════ KONFIGURATION ══════════ */

    /* Schulferien (Richtwerte Kanton Aargau).
       PLATZHALTER: Daten jährlich prüfen/anpassen! */
    const FERIEN = {
        summer:    ["2026-07-04", "2026-08-09"],
        autumn:    ["2026-09-26", "2026-10-11"],
        christmas: ["2026-12-24", "2027-01-03"]
    };

    const MAP_DEFAULT_CENTER = [47.392, 8.045]; /* Aarau */
    const MAP_DEFAULT_ZOOM = 10;

    /* Zufällige, aber pro Inserat stabile Verschiebung (~±350 m),
       damit Standorte nie als exakte Adresse erscheinen und
       Marker am selben Ort nicht perfekt übereinander liegen. */
    const JITTER_DEG = 0.0035;

    /* ══════════ ORTS-FALLBACK ══════════
       Für Inserate ohne Backend-Koordinaten: kompakte Tabelle
       mit Schweizer Orten (Fokus Region Aargau) und PLZ.
       Backend-Geocoding (siehe GAS_LOCATION_MAP.md) hat Vorrang. */
    const GEO_TABLE = {
        /* Region Aarau */
        "aarau": [47.3925, 8.0442], "5000": [47.3925, 8.0442], "5001": [47.3925, 8.0442], "5004": [47.4009, 8.0568],
        "kuttigen": [47.4180, 8.0440], "küttigen": [47.4180, 8.0440], "5024": [47.4180, 8.0440],
        "buchs": [47.3960, 8.0830], "5033": [47.3960, 8.0830],
        "suhr": [47.3720, 8.0800], "5034": [47.3720, 8.0800],
        "unterentfelden": [47.3650, 8.0350], "5035": [47.3650, 8.0350],
        "oberentfelden": [47.3570, 8.0450], "5036": [47.3570, 8.0450],
        "graenichen": [47.3580, 8.1030], "gränichen": [47.3580, 8.1030], "5722": [47.3580, 8.1030],
        "rohr": [47.4030, 8.0740], "erlinsbach": [47.4020, 8.0090], "5018": [47.4020, 8.0090],
        "biberstein": [47.4150, 8.0680], "5023": [47.4150, 8.0680],
        "rupperswil": [47.4010, 8.1300], "5102": [47.4010, 8.1300],
        "hunzenschwil": [47.3880, 8.1280], "5502": [47.3880, 8.1280],
        "schafisheim": [47.3800, 8.1420], "5503": [47.3800, 8.1420],
        "seon": [47.3460, 8.1600], "5703": [47.3460, 8.1600],
        "schoeftland": [47.3050, 8.0510], "schöftland": [47.3050, 8.0510], "5040": [47.3050, 8.0510],
        "koelliken": [47.3300, 8.0200], "kölliken": [47.3300, 8.0200], "5742": [47.3300, 8.0200],
        "muhen": [47.3350, 8.0560], "5037": [47.3350, 8.0560],
        "reinach": [47.2570, 8.1810], "5734": [47.2570, 8.1810],
        "menziken": [47.2400, 8.1900], "5737": [47.2400, 8.1900],
        "niederlenz": [47.4000, 8.1700], "5702": [47.4000, 8.1700],
        /* Region Lenzburg / Wohlen */
        "lenzburg": [47.3880, 8.1750], "5600": [47.3880, 8.1750],
        "wildegg": [47.4210, 8.1690], "5103": [47.4210, 8.1690],
        "othmarsingen": [47.4000, 8.2140], "5504": [47.4000, 8.2140],
        "wohlen": [47.3510, 8.2760], "5610": [47.3510, 8.2760],
        "villmergen": [47.3490, 8.2450], "5612": [47.3490, 8.2450],
        "bremgarten": [47.3510, 8.3430], "5620": [47.3510, 8.3430],
        "muri": [47.2700, 8.3390], "5630": [47.2700, 8.3390],
        "mellingen": [47.4190, 8.2710], "5507": [47.4190, 8.2710],
        /* Region Baden / Brugg */
        "baden": [47.4730, 8.3080], "5400": [47.4730, 8.3080], "5405": [47.4600, 8.3200],
        "wettingen": [47.4700, 8.3160], "5430": [47.4700, 8.3160],
        "neuenhof": [47.4500, 8.3260], "5432": [47.4500, 8.3260],
        "spreitenbach": [47.4210, 8.3660], "8957": [47.4210, 8.3660],
        "brugg": [47.4810, 8.2080], "5200": [47.4810, 8.2080],
        "windisch": [47.4790, 8.2180], "5210": [47.4790, 8.2180],
        "turgi": [47.4920, 8.2520], "5300": [47.4920, 8.2520],
        "wuerenlingen": [47.5330, 8.2560], "würenlingen": [47.5330, 8.2560], "5303": [47.5330, 8.2560],
        "doettingen": [47.5710, 8.2600], "döttingen": [47.5710, 8.2600], "5312": [47.5710, 8.2600],
        "zurzach": [47.5880, 8.2940], "5330": [47.5880, 8.2940],
        /* Fricktal */
        "frick": [47.5120, 8.0240], "5070": [47.5120, 8.0240],
        "laufenburg": [47.5590, 8.0610], "5080": [47.5590, 8.0610],
        "rheinfelden": [47.5540, 7.7930], "4310": [47.5540, 7.7930],
        "kaiseraugst": [47.5390, 7.7280], "4303": [47.5390, 7.7280],
        "stein": [47.5440, 7.9520], "4332": [47.5440, 7.9520],
        /* Region Zofingen / Olten */
        "zofingen": [47.2880, 7.9450], "4800": [47.2880, 7.9450],
        "oftringen": [47.3130, 7.9250], "4665": [47.3130, 7.9250],
        "aarburg": [47.3200, 7.9000], "4663": [47.3200, 7.9000],
        "rothrist": [47.3060, 7.8910], "4852": [47.3060, 7.8910],
        "olten": [47.3500, 7.9030], "4600": [47.3500, 7.9030],
        "trimbach": [47.3620, 7.8880], "4632": [47.3620, 7.8880],
        "schoenenwerd": [47.3700, 8.0010], "schönenwerd": [47.3700, 8.0010], "5012": [47.3700, 8.0010],
        /* Grosse Schweizer Städte */
        "zuerich": [47.3769, 8.5417], "zürich": [47.3769, 8.5417], "zurich": [47.3769, 8.5417], "8000": [47.3769, 8.5417], "8001": [47.3769, 8.5417],
        "basel": [47.5596, 7.5886], "4000": [47.5596, 7.5886], "4051": [47.5596, 7.5886],
        "bern": [46.9480, 7.4474], "3000": [46.9480, 7.4474], "3011": [46.9480, 7.4474],
        "luzern": [47.0502, 8.3093], "6000": [47.0502, 8.3093], "6003": [47.0502, 8.3093],
        "winterthur": [47.4997, 8.7240], "8400": [47.4997, 8.7240],
        "st. gallen": [47.4245, 9.3767], "st.gallen": [47.4245, 9.3767], "9000": [47.4245, 9.3767],
        "zug": [47.1662, 8.5154], "6300": [47.1662, 8.5154],
        "solothurn": [47.2079, 7.5371], "4500": [47.2079, 7.5371],
        "biel": [47.1368, 7.2468], "2500": [47.1368, 7.2468],
        "thun": [46.7580, 7.6280], "3600": [46.7580, 7.6280],
        "chur": [46.8508, 9.5320], "7000": [46.8508, 9.5320],
        "schaffhausen": [47.6970, 8.6340], "8200": [47.6970, 8.6340],
        "frauenfeld": [47.5580, 8.8980], "8500": [47.5580, 8.8980],
        "fribourg": [46.8065, 7.1620], "1700": [46.8065, 7.1620],
        "neuchatel": [46.9900, 6.9290], "neuenburg": [46.9900, 6.9290], "2000": [46.9900, 6.9290],
        "sion": [46.2330, 7.3590], "1950": [46.2330, 7.3590],
        "lugano": [46.0037, 8.9511], "6900": [46.0037, 8.9511],
        "genf": [46.2044, 6.1432], "geneve": [46.2044, 6.1432], "1200": [46.2044, 6.1432],
        "lausanne": [46.5197, 6.6323], "1000": [46.5197, 6.6323],
        "dietikon": [47.4010, 8.4000], "8953": [47.4010, 8.4000],
        "schlieren": [47.3960, 8.4470], "8952": [47.3960, 8.4470]
    };

    /* ══════════ DOM ══════════ */
    const viewListBtn   = document.getElementById("view-list-btn");
    const viewMapBtn    = document.getElementById("view-map-btn");
    const mapView       = document.getElementById("job-map-view");
    const listEl        = document.getElementById("job-list");
    const filterAnchor  = document.querySelector(".filter-popup-anchor");
    const searchInput   = document.getElementById("map-search-input");
    const searchBtn     = document.getElementById("map-search-btn");
    const geolocateBtn  = document.getElementById("map-geolocate-btn");
    const radiusSelect  = document.getElementById("map-radius");
    const chipRow       = document.getElementById("map-category-chips");
    const periodSelect  = document.getElementById("map-period");
    const customPeriod  = document.getElementById("map-custom-period");
    const periodFrom    = document.getElementById("map-period-from");
    const periodTo      = document.getElementById("map-period-to");
    const countEl       = document.getElementById("map-count");
    const statusEl      = document.getElementById("map-status");
    const mapEl         = document.getElementById("job-map");

    if (!viewMapBtn || !mapEl) return;

    /* ══════════ STATE ══════════
       Filter werden bewusst NICHT gespeichert (weder localStorage
       noch URL) – bei jedem Seitenaufruf frisch (siehe Spezifikation). */
    let map = null;
    let clusterGroup = null;
    let centerMarker = null;
    let radiusCircle = null;
    let leafletReady = false;
    let leafletLoading = null;
    let didInitialFit = false;

    const state = {
        center: null,          /* {lat, lng} der Ortssuche / Geolocation */
        cats: new Set(),       /* leer = alle Kategorien */
        period: "all",
        customFrom: "",
        customTo: ""
    };

    /* ══════════ LEAFLET LAZY LADEN (lokal, kein CDN) ══════════ */
    function loadCss(href) {
        return new Promise(function (resolve, reject) {
            const l = document.createElement("link");
            l.rel = "stylesheet"; l.href = href;
            l.onload = resolve; l.onerror = reject;
            document.head.appendChild(l);
        });
    }
    function loadScript(src) {
        return new Promise(function (resolve, reject) {
            const s = document.createElement("script");
            s.src = src;
            s.onload = resolve; s.onerror = reject;
            document.head.appendChild(s);
        });
    }
    function loadLeaflet() {
        if (leafletReady) return Promise.resolve();
        if (leafletLoading) return leafletLoading;
        leafletLoading = Promise.all([
            loadCss("vendor/leaflet/leaflet.css"),
            loadCss("vendor/leaflet/MarkerCluster.css"),
            loadCss("vendor/leaflet/MarkerCluster.Default.css")
        ])
            .then(function () { return loadScript("vendor/leaflet/leaflet.js"); })
            .then(function () { return loadScript("vendor/leaflet/leaflet.markercluster.js"); })
            .then(function () { leafletReady = true; });
        return leafletLoading;
    }

    /* ══════════ KOORDINATEN AUFLÖSEN ══════════ */
    function normalize(str) {
        return String(str || "").toLowerCase()
            .replace(/[.,/()]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function lookupGeoTable(location) {
        const norm = normalize(location);
        if (!norm) return null;

        /* 1) 4-stellige PLZ im Text */
        const plz = norm.match(/\b(\d{4})\b/);
        if (plz && GEO_TABLE[plz[1]]) return GEO_TABLE[plz[1]];

        /* 2) ganzer String, dann einzelne Wörter */
        if (GEO_TABLE[norm]) return GEO_TABLE[norm];
        const words = norm.split(" ");
        for (let i = 0; i < words.length; i++) {
            if (words[i].length >= 3 && GEO_TABLE[words[i]]) return GEO_TABLE[words[i]];
        }
        /* 3) Zweier-Kombinationen ("st. gallen") */
        for (let i = 0; i < words.length - 1; i++) {
            const two = words[i] + " " + words[i + 1];
            if (GEO_TABLE[two]) return GEO_TABLE[two];
        }
        return null;
    }

    /* Stabiler Pseudo-Zufall aus der Job-ID für den Jitter */
    function hashJitter(id) {
        let h = 0;
        const s = String(id || "");
        for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
        const a = ((h & 0xffff) / 0xffff) * 2 - 1;        /* -1..1 */
        const b = (((h >> 16) & 0x7fff) / 0x7fff) * 2 - 1;
        return [a * JITTER_DEG, b * JITTER_DEG];
    }

    function resolveCoords(job) {
        /* Backend-Koordinaten (GAS-Geocoding) haben Vorrang */
        const lat = parseFloat(job.lat);
        const lng = parseFloat(job.lng);
        if (isFinite(lat) && isFinite(lng) && lat !== 0 && lng !== 0) {
            const j = hashJitter(job.id);
            /* "exact" nur, wenn das Backend es ausdrücklich sagt –
               sonst immer leicht verschieben (Privatsphäre) */
            if (job.geoStatus === "exact") return { lat: lat, lng: lng };
            return { lat: lat + j[0], lng: lng + j[1] };
        }
        const hit = lookupGeoTable(job.location);
        if (hit) {
            const j = hashJitter(job.id);
            return { lat: hit[0] + j[0], lng: hit[1] + j[1] };
        }
        return null;
    }

    /* ══════════ ZEITRAUM-FILTER ══════════ */
    function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

    function periodRange() {
        const today = startOfDay(new Date());
        switch (state.period) {
            case "today":
                return [today, today];
            case "week": {
                const end = new Date(today);
                end.setDate(end.getDate() + (7 - ((today.getDay() + 6) % 7)) - 1); /* bis Sonntag */
                return [today, end];
            }
            case "weekend": {
                const dow = (today.getDay() + 6) % 7;           /* Mo=0 .. So=6 */
                const sat = new Date(today);
                sat.setDate(sat.getDate() + Math.max(0, 5 - dow));
                const sun = new Date(sat);
                if (dow < 6) sun.setDate(sat.getDate() + (dow === 5 ? 1 : 1));
                if (dow === 6) { /* Sonntag: nur heute */ return [today, today]; }
                return [sat, sun];
            }
            case "summer":    return [startOfDay(FERIEN.summer[0]), startOfDay(FERIEN.summer[1])];
            case "autumn":    return [startOfDay(FERIEN.autumn[0]), startOfDay(FERIEN.autumn[1])];
            case "christmas": return [startOfDay(FERIEN.christmas[0]), startOfDay(FERIEN.christmas[1])];
            case "custom": {
                if (!state.customFrom && !state.customTo) return null;
                const from = state.customFrom ? startOfDay(state.customFrom) : new Date(-8640000000000000);
                const to   = state.customTo   ? startOfDay(state.customTo)   : new Date(8640000000000000);
                return [from, to];
            }
            default:
                return null; /* alle */
        }
    }

    function matchesPeriod(job, range) {
        if (!range) return true;
        /* Dauerhaft & flexibel: kein fester Zeitraum -> immer anzeigen */
        if (job.specific_or_not === "Dauerhaft" || job.specific_or_not === "flexibel") return true;
        if (job.specific_or_not !== "Spezifisch") return true;
        if (!job.date_from || !job.date_to) return false;
        const s = startOfDay(job.date_from);
        const e = startOfDay(job.date_to);
        if (isNaN(s.getTime()) || isNaN(e.getTime())) return false;
        /* Überschneidung reicht */
        return s <= range[1] && e >= range[0];
    }

    /* ══════════ RADIUS ══════════ */
    function haversineKm(a, b) {
        const R = 6371;
        const dLat = (b.lat - a.lat) * Math.PI / 180;
        const dLng = (b.lng - a.lng) * Math.PI / 180;
        const s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
    }

    function radiusKm() {
        const v = radiusSelect.value;
        return v === "all" ? null : parseFloat(v);
    }

    /* ══════════ POPUP (Kurzvorschau) ══════════ */
    function fmtDate(d) {
        if (typeof formatDate === "function") return formatDate(d);
        return String(d || "").slice(0, 10);
    }

    function periodText(job) {
        if (job.specific_or_not === "Dauerhaft") return "Dauerhaft";
        if (job.specific_or_not === "flexibel")  return "Zeitraum flexibel";
        if (job.date_from && job.date_to) return fmtDate(job.date_from) + " – " + fmtDate(job.date_to);
        return "";
    }

    function buildPopup(job) {
        const box = document.createElement("div");
        box.className = "map-popup";

        if (job.category) {
            const badge = document.createElement("span");
            badge.className = "map-popup-badge";
            badge.textContent = job.category;
            box.appendChild(badge);
        }

        const title = document.createElement("strong");
        title.className = "map-popup-title";
        title.textContent = job.title || "Ferienjob";
        box.appendChild(title);

        const company = document.createElement("span");
        company.className = "map-popup-company";
        company.textContent = job.company || "";
        box.appendChild(company);

        function row(label, value) {
            if (!value) return;
            const r = document.createElement("span");
            r.className = "map-popup-row";
            const b = document.createElement("b");
            b.textContent = label + ": ";
            r.appendChild(b);
            r.appendChild(document.createTextNode(value));
            box.appendChild(r);
        }
        row("Ort", job.location);
        row("Zeitraum", periodText(job));
        row("Lohn", job.salary);

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "map-popup-btn";
        btn.textContent = "Inserat ansehen";
        btn.addEventListener("click", function () {
            if (typeof trackEvent === "function") trackEvent("map_view_inserat");
            showListView();
            const card = document.querySelector('.job-card[data-job-id="' + String(job.id) + '"]');
            if (card) {
                card.scrollIntoView({ behavior: "smooth", block: "center" });
                card.classList.remove("job-card-flash");
                void card.offsetWidth;
                card.classList.add("job-card-flash");
            }
        });
        box.appendChild(btn);

        return box;
    }

    /* ══════════ MARKER AKTUALISIEREN ══════════ */
    function refreshMarkers() {
        if (!leafletReady || !map) return;

        clusterGroup.clearLayers();

        const jobs = (typeof allJobs !== "undefined" && Array.isArray(allJobs)) ? allJobs : [];
        const range = periodRange();
        const rKm = radiusKm();

        let shown = 0;
        let noGeo = 0;
        const bounds = [];

        jobs.forEach(function (job) {
            /* Kategorie */
            if (state.cats.size > 0 && !state.cats.has(job.category)) return;
            /* Zeitraum */
            if (!matchesPeriod(job, range)) return;

            const coords = resolveCoords(job);
            if (!coords) { noGeo++; return; }

            /* Radius (nur wenn ein Suchzentrum gesetzt ist) */
            if (state.center && rKm !== null && haversineKm(state.center, coords) > rKm) return;

            const marker = L.marker([coords.lat, coords.lng]);
            marker.bindPopup(buildPopup(job), { maxWidth: 260 });
            clusterGroup.addLayer(marker);
            bounds.push([coords.lat, coords.lng]);
            shown++;
        });

        countEl.textContent = shown === 1 ? "1 Job auf der Karte" : shown + " Jobs auf der Karte";
        statusEl.textContent = noGeo > 0
            ? noGeo + " Inserat" + (noGeo === 1 ? "" : "e") + " ohne erkennbaren Standort (nur in der Liste sichtbar)."
            : "";

        /* Beim ersten Rendern auf die Marker zoomen (ohne aktives Suchzentrum) */
        if (!didInitialFit && !state.center && bounds.length > 0) {
            didInitialFit = true;
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
        }
    }

    /* ══════════ SUCHZENTRUM SETZEN ══════════ */
    function setCenter(lat, lng, label) {
        state.center = { lat: lat, lng: lng };

        if (centerMarker) map.removeLayer(centerMarker);
        centerMarker = L.marker([lat, lng], {
            icon: L.divIcon({ className: "map-center-dot", iconSize: [16, 16] }),
            interactive: false,
            keyboard: false
        }).addTo(map);
        if (label) centerMarker.bindTooltip(label, { direction: "top", offset: [0, -10] });

        updateCircle();

        const r = radiusKm();
        const zoom = r === null ? 11 : r <= 2 ? 13 : r <= 5 ? 12 : r <= 10 ? 11 : r <= 20 ? 10 : r <= 30 ? 10 : 9;
        map.setView([lat, lng], zoom);
        refreshMarkers();
    }

    function updateCircle() {
        if (radiusCircle) { map.removeLayer(radiusCircle); radiusCircle = null; }
        const r = radiusKm();
        if (state.center && r !== null) {
            radiusCircle = L.circle([state.center.lat, state.center.lng], {
                radius: r * 1000,
                color: "#2563eb",
                weight: 1.5,
                fillColor: "#2563eb",
                fillOpacity: 0.06,
                interactive: false
            }).addTo(map);
        }
    }

    /* ══════════ ORTSSUCHE (Nominatim, nur bei aktiver Suche) ══════════ */
    let searching = false;
    async function searchLocation() {
        const q = searchInput.value.trim();
        if (!q || searching) return;
        searching = true;
        searchBtn.disabled = true;
        statusEl.textContent = "Ort wird gesucht…";

        try {
            /* Zuerst die eingebaute Tabelle (sofort, offlinefähig) */
            const local = lookupGeoTable(q);
            if (local) {
                statusEl.textContent = "";
                setCenter(local[0], local[1], q);
                return;
            }
            const url = "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ch&q=" +
                encodeURIComponent(q);
            const resp = await fetch(url, { headers: { "Accept": "application/json" } });
            const results = await resp.json();
            if (Array.isArray(results) && results.length > 0) {
                statusEl.textContent = "";
                setCenter(parseFloat(results[0].lat), parseFloat(results[0].lon),
                    String(results[0].display_name || q).split(",")[0]);
                if (typeof trackEvent === "function") trackEvent("map_search_used");
            } else {
                statusEl.textContent = "Ort nicht gefunden – versuch es mit Ortsname oder PLZ.";
            }
        } catch (err) {
            console.error(err);
            statusEl.textContent = "Ortssuche gerade nicht möglich – versuch es später nochmal.";
        } finally {
            searching = false;
            searchBtn.disabled = false;
        }
    }

    /* ══════════ GEOLOCATION („Jobs in meiner Nähe") ══════════
       Der Standort wird NUR für diese eine Suche verwendet –
       nie gespeichert, nie übertragen, nie mit Inseraten verknüpft. */
    function geolocate() {
        if (!navigator.geolocation) {
            statusEl.textContent = "Dein Browser unterstützt keine Standortabfrage.";
            return;
        }
        statusEl.textContent = "Standort wird ermittelt…";
        geolocateBtn.disabled = true;

        navigator.geolocation.getCurrentPosition(
            function (pos) {
                geolocateBtn.disabled = false;
                statusEl.textContent = "";
                if (radiusSelect.value === "all") radiusSelect.value = "10";
                setCenter(pos.coords.latitude, pos.coords.longitude, "Dein Standort");
                if (typeof trackEvent === "function") trackEvent("map_geolocate_used");
            },
            function () {
                geolocateBtn.disabled = false;
                statusEl.textContent = "Standort nicht freigegeben – gib stattdessen einen Ort oder eine PLZ ein.";
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
        );
    }

    /* ══════════ ANSICHT WECHSELN ══════════ */
    function showListView() {
        mapView.classList.add("hidden");
        listEl.classList.remove("hidden");
        if (filterAnchor) filterAnchor.classList.remove("hidden");
        viewListBtn.classList.add("active");
        viewMapBtn.classList.remove("active");
    }

    async function showMapView() {
        listEl.classList.add("hidden");
        mapView.classList.remove("hidden");
        /* Der Listen-Filter gilt nur für die Liste – ausblenden,
           die Karte hat ihre eigenen Filter */
        if (filterAnchor) filterAnchor.classList.add("hidden");
        viewMapBtn.classList.add("active");
        viewListBtn.classList.remove("active");
        if (typeof trackEvent === "function") trackEvent("map_view_opened");

        if (!leafletReady) {
            statusEl.textContent = "Karte wird geladen…";
            try {
                await loadLeaflet();
            } catch (err) {
                console.error(err);
                statusEl.textContent = "Karte konnte nicht geladen werden – bitte Seite neu laden.";
                return;
            }
            statusEl.textContent = "";
        }

        if (!map) {
            map = L.map(mapEl, { scrollWheelZoom: true }).setView(MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM);
            L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
                maxZoom: 19,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
            }).addTo(map);
            clusterGroup = L.markerClusterGroup({ maxClusterRadius: 46, showCoverageOnHover: false });
            map.addLayer(clusterGroup);
        }

        refreshMarkers();
        /* Leaflet braucht das nach display:none -> sichtbar */
        setTimeout(function () { map.invalidateSize(); }, 60);
    }

    /* ══════════ EVENTS ══════════ */
    viewListBtn.addEventListener("click", showListView);
    viewMapBtn.addEventListener("click", showMapView);

    searchBtn.addEventListener("click", searchLocation);
    searchInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); searchLocation(); }
    });

    geolocateBtn.addEventListener("click", geolocate);

    radiusSelect.addEventListener("change", function () {
        if (map) { updateCircle(); refreshMarkers(); }
    });

    chipRow.addEventListener("click", function (e) {
        const chip = e.target.closest(".map-chip");
        if (!chip) return;
        const cat = chip.dataset.cat || "";
        if (cat === "") {
            state.cats.clear();
        } else {
            if (state.cats.has(cat)) state.cats.delete(cat);
            else state.cats.add(cat);
        }
        /* Chip-Optik: "Alle" aktiv, wenn nichts gewählt */
        chipRow.querySelectorAll(".map-chip").forEach(function (c) {
            const cc = c.dataset.cat || "";
            c.classList.toggle("active", cc === "" ? state.cats.size === 0 : state.cats.has(cc));
        });
        refreshMarkers();
    });

    periodSelect.addEventListener("change", function () {
        state.period = periodSelect.value;
        customPeriod.classList.toggle("hidden", state.period !== "custom");
        refreshMarkers();
    });
    periodFrom.addEventListener("change", function () { state.customFrom = periodFrom.value; refreshMarkers(); });
    periodTo.addEventListener("change", function () { state.customTo = periodTo.value; refreshMarkers(); });

    /* Frische Jobdaten -> Karte aktualisieren (falls offen) */
    document.addEventListener("hj-jobs-loaded", function () {
        if (map) refreshMarkers();
    });
})();
