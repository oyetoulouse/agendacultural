/* OYE TOULOUSE — app */
(function () {
  "use strict";
  const C = Object.assign({ API_URL: "", DEMO_MODE: true, DEMO_ANCHOR: "2026-10-07", DIAS_AGENDA: 31, INSTAGRAM: "oyetoulouse", EMAIL: "", YOUTUBE: "", SPOTIFY: "", APP_URL: "" }, window.OYE_CONFIG || {});
  const I18N = window.OYE_I18N;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---------- almacenamiento local ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem("oye_" + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("oye_" + k, JSON.stringify(v)); } catch (e) { } }
  };

  /* ---------- idioma ---------- */
  let LANG = store.get("lang", null) || ((navigator.language || "es").toLowerCase().startsWith("fr") ? "fr" : "es");
  const L = () => I18N[LANG];
  const t = (k, v) => { let s = L()[k]; if (s == null) s = I18N.es[k] != null ? I18N.es[k] : k; if (v) Object.keys(v).forEach(x => { s = s.split("{" + x + "}").join(v[x]); }); return s; };
  const catName = c => (L().cat[c] || c);

  function applyI18n() {
    document.documentElement.lang = LANG;
    $$("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
    $$("[data-i18n-html]").forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
    $$("[data-i18n-ph]").forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
    $$("[data-i18n-aria]").forEach(el => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
    $("#langBtn").textContent = LANG === "es" ? "FR" : "ES";
    const sel = $("#f_categoria"), v = sel.value;
    sel.innerHTML = `<option value="">${esc(t("choose"))}</option>` + Object.keys(CATS).filter(c => c !== "Oye en vivo").map(c => `<option value="${c}">${esc(catName(c))}</option>`).join("");
    sel.value = v;
    const sl = $(`input[name="slang"][value="${store.get("slang", "bi")}"]`); if (sl) sl.checked = true;
  }

  /* ---------- categorías ---------- */
  const CATS = {
    "Música": "#d5263f", "Fiesta": "#c2185b", "Baile": "#e0568f", "Cine": "#123a6b",
    "Arte": "#6b4fa8", "Charla": "#2f7d6d", "Taller": "#b8621b", "Gastronomía": "#a8452a",
    "Comunidad": "#256eac", "Infancia": "#3f8f3a", "Deporte": "#0f6f8f", "Oye en vivo": "#d5263f", "Otro": "#4a5d7c"
  };
  const catColor = c => CATS[c] || CATS.Otro;

  /* ---------- fechas ---------- */
  const pad = n => String(n).padStart(2, "0");
  const ymd = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const hm = d => pad(d.getHours()) + ":" + pad(d.getMinutes());
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const fDate = (d, lang) => { const l = I18N[lang || LANG]; return l.date(d.getDate(), l.months[d.getMonth()]); };
  const fDay = (d, lang) => I18N[lang || LANG].days[d.getDay()];

  function parseDate(s) {
    s = String(s || "").trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);
    if (m) { const y = m[3].length === 2 ? 2000 + +m[3] : +m[3]; return new Date(y, +m[2] - 1, +m[1]); }
    return null;
  }
  function parseTime(s) {
    const m = String(s || "").trim().match(/^(\d{1,2})\s*[:hH.]\s*(\d{2})?/);
    return m ? [Math.min(23, +m[1]), m[2] ? +m[2] : 0] : null;
  }
  const igHandle = s => String(s || "").trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/[\/?#].*$/, "");
  const igList = s => String(s || "").split(/[\s,;]+/).map(igHandle).filter(Boolean);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const isFree = p => /gratis|gratuit|free|^0\s*€?$/i.test(String(p || "").trim()) || String(p || "").trim() === "";
  const safeUrl = u => /^https?:\/\//i.test(String(u || "").trim()) ? String(u).trim() : "";
  const ytId = u => { const m = String(u || "").match(/(?:youtu\.be\/|v=|\/live\/|\/embed\/|\/shorts\/)([\w-]{11})/); return m ? m[1] : ""; };

  /* textos que dependen del idioma */
  const T = {
    title: e => (LANG === "fr" && e.titulo_fr) || e.titulo,
    desc: e => LANG === "fr" ? (e.descripcion_fr || e.descripcion) : (e.descripcion || e.descripcion_fr),
    price: (e, lang) => e.gratis ? I18N[lang || LANG].free : e.precio
  };

  /* ---------- estado ---------- */
  let favs = new Set(store.get("favs", []));
  let EVENTS = [], PLACES = [], SHOWS = [], VIDEOS = [], lastLoad = 0;
  let demoShift = 0, nowOverride = null, loadState = "loading";
  const now = () => nowOverride ? new Date(nowOverride) : new Date();

  /* ---------- datos ---------- */
  async function loadData() {
    let raw = null, places = null, shows = null, videos = [];
    if (C.API_URL) {
      try {
        const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 15000);
        const res = await fetch(C.API_URL + (C.API_URL.includes("?") ? "&" : "?") + "t=" + Date.now(), { signal: ctl.signal });
        clearTimeout(to);
        if (!res.ok) throw new Error("HTTP " + res.status);
        const j = await res.json();
        if (!j || !Array.isArray(j.eventos)) throw new Error("respuesta inesperada");
        loadState = "ok";
        raw = j.eventos || []; places = j.lugares || []; shows = j.emisiones || []; videos = j.videos || [];
        store.set("cache", { raw, places, shows, videos, at: Date.now() });
      } catch (e) {
        const c = store.get("cache", null);
        if (c) { raw = c.raw; places = c.places; shows = c.shows || []; videos = c.videos || []; toast(t("offline")); }
        else { raw = []; places = []; shows = []; }
        loadState = c ? "ok" : "error";
        console.warn("[Oye Toulouse] No se pudo leer el Google Sheet:", e);
      }
    }
    if (!raw && !C.API_URL) {
      const get = u => fetch(u).then(r => r.json()).catch(() => []);
      [raw, places, shows] = await Promise.all([get("data/eventos.json"), get("data/lugares.json"), get("data/emisiones.json")]);
      if (C.DEMO_MODE) {
        const a = parseDate(C.DEMO_ANCHOR);
        if (a) demoShift = Math.round((startOfDay(new Date()) - a) / 864e5);
        $("#demoTag").hidden = false;
      }
    }
    lastLoad = Date.now();
    VIDEOS = (videos || []).filter(v => v && v.id);
    SHOWS = prepShows(shows || []);
    EVENTS = expand((raw || []).concat(showsAsEvents(SHOWS)));
    PLACES = (places || []).filter(p => p && p.nombre && (!p.estado || /publicad/i.test(p.estado)));
  }

  function prepShows(rows) {
    return rows.filter(r => r && r.titulo && (!r.estado || /publicad/i.test(r.estado))).map(r => {
      let d = parseDate(r.fecha); if (d && demoShift) d = addDays(d, demoShift);
      const t0 = parseTime(r.hora_inicio), t1 = parseTime(r.hora_fin);
      const start = d ? new Date(d.getFullYear(), d.getMonth(), d.getDate(), t0 ? t0[0] : 0, t0 ? t0[1] : 0) : null;
      let end = start && t1 ? new Date(d.getFullYear(), d.getMonth(), d.getDate(), t1[0], t1[1]) : (start ? new Date(start.getTime() + 90 * 6e4) : null);
      if (start && end <= start) end = addDays(end, 1);
      return Object.assign({}, r, { start, end, hasTime: !!t0, yt: safeUrl(r.youtube), ytid: ytId(r.youtube), imagen: safeUrl(r.imagen), media: vodioMedia(r.vodio || r.audio || r.spotify) });
    }).sort((a, b) => (b.start || 0) - (a.start || 0));
  }
  // cada emisión con fecha y hora entra también a la agenda, así aparece en "En vivo"
  function showsAsEvents(shows) {
    return shows.filter(s => s.start && s.hasTime).map(s => ({
      titulo: "Oye Toulouse: " + s.titulo, titulo_fr: s.titulo_fr ? "Oye Toulouse : " + s.titulo_fr : "",
      categoria: "Oye en vivo", fecha: ymd(addDays(s.start, -demoShift)), hora_inicio: hm(s.start), hora_fin: hm(s.end),
      lugar: s.lugar || "", direccion: s.direccion || "", organizador: "Oye Toulouse", ig_organizador: C.INSTAGRAM,
      ig_etiquetas: s.instagram || "", precio: "Gratis", descripcion: [s.invitades ? "Con " + s.invitades + "." : "", s.descripcion].filter(Boolean).join(" "),
      descripcion_fr: [s.invitades ? "Avec " + s.invitades + "." : "", s.descripcion_fr].filter(Boolean).join(" "),
      link: (s.media && s.media.link) || s.yt, imagen: s.imagen
    }));
  }

  function expand(rows) {
    const out = [];
    rows.forEach((r, i) => {
      if (!r || !r.titulo) return;
      if (r.estado && !/publicad/i.test(r.estado)) return;
      let d0 = parseDate(r.fecha); if (!d0) return;
      let d1 = parseDate(r.fecha_fin) || d0;
      if (demoShift) { d0 = addDays(d0, demoShift); d1 = addDays(d1, demoShift); }
      if (d1 < d0) d1 = d0;
      const t0 = parseTime(r.hora_inicio) || [0, 0], t1 = parseTime(r.hora_fin);
      const multi = ymd(d0) !== ymd(d1);
      let k = 0;
      for (let d = new Date(d0); d <= d1 && k < 62; d = addDays(d, 1), k++) {
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), t0[0], t0[1]);
        let end;
        if (t1) { end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), t1[0], t1[1]); if (end <= start) end = addDays(end, 1); }
        else end = new Date(start.getTime() + 2 * 36e5);
        out.push({
          id: "e" + i + (multi ? "-" + k : ""), base: "e" + i,
          titulo: String(r.titulo).trim(), titulo_fr: String(r.titulo_fr || "").trim(),
          categoria: CATS[r.categoria] ? r.categoria : "Otro",
          start, end, hasEnd: !!t1, multi, desde: d0, hasta: d1,
          lugar: r.lugar || "", direccion: r.direccion || "", ciudad: r.ciudad || "Toulouse",
          ig_lugar: igHandle(r.ig_lugar), organizador: r.organizador || "", ig_organizador: igHandle(r.ig_organizador),
          ig_etiquetas: igList(r.ig_etiquetas), precio: String(r.precio || "").trim() || "Gratis", gratis: isFree(r.precio),
          descripcion: r.descripcion || "", descripcion_fr: r.descripcion_fr || "",
          link: safeUrl(r.link), imagen: safeUrl(r.imagen), isShow: r.categoria === "Oye en vivo"
        });
      }
    });
    return out.sort((a, b) => a.start - b.start);
  }

  /* ---------- íconos ---------- */
  const IC = {
    pin: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    place: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    org: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/></svg>',
    euro: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 6.5A7 7 0 1 0 17 17.5M4 10h9M4 14h9"/></svg>',
    tag: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-3.5 7.1"/></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>',
    cal: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/></svg>',
    share: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>',
    mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>'
  };

  const igLink = h => h ? `<a class="ig" href="https://instagram.com/${encodeURIComponent(h)}" target="_blank" rel="noopener">@${esc(h)}</a>` : "";
  const mapsUrl = e => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent([e.lugar, e.direccion, e.ciudad].filter(Boolean).join(", "));
  const timeRange = e => e.hasEnd ? `${hm(e.start)} – ${hm(e.end)}` : hm(e.start);
  const relDay = d => { const diff = Math.round((startOfDay(d) - startOfDay(now())) / 864e5); return diff === 0 ? t("today") : diff === 1 ? t("tomorrow_l") : ""; };
  const dayLabel = d => { const r = relDay(d), base = `${fDay(d)} ${fDate(d)}`; return r ? r + " · " + base : base; };

  /* ---------- tarjetas ---------- */
  function tlItem(e, opts = {}) {
    const tags = [`<span class="tag cat" style="--c:${catColor(e.categoria)}">${esc(catName(e.categoria))}</span>`,
      `<span class="tag ${e.gratis ? "free" : ""}">${esc(T.price(e))}</span>`];
    if (favs.has(e.base)) tags.push(`<span class="tag fav">${esc(t("fav"))}</span>`);
    return `<li><a class="tl ${e.isShow ? "is-show" : ""}" href="#${e.id}">
      <span class="tl-time">${hm(e.start)}${opts.until && e.hasEnd ? `<small>${esc(t("until", { h: hm(e.end) }))}</small>` : ""}</span>
      <span class="tl-body">
        <p class="tl-title">${esc(T.title(e))}</p>
        <span class="tl-where">${IC.pin}<span>${esc(e.lugar)}${e.organizador && e.organizador !== e.lugar ? ` · ${esc(e.organizador)}` : ""}</span></span>
        <span class="tl-tags">${tags.join("")}</span>
      </span></a></li>`;
  }

  /* ---------- HOY ---------- */
  function renderHoy() {
    const n = now();
    $("#hoyDia").textContent = cap(fDay(n));
    $("#hoyTitle").textContent = fDate(n);

    const live = EVENTS.filter(e => e.start <= n && e.end > n);
    if (!live.length && C.DEMO_MODE && !C.API_URL && !nowOverride) {
      const todays = EVENTS.filter(e => ymd(e.start) === ymd(n));
      const nx = todays.find(e => e.end > n) || todays[todays.length - 1];
      if (nx) { nowOverride = nx.start.getTime() + 25 * 6e4; return renderHoy(); }
    }
    const box = $("#liveBox");
    if (!EVENTS.length && loadState !== "ok") {
      box.innerHTML = `<div class="live empty"><span class="live-badge"><i></i>${esc(loadState === "loading" ? t("loading") : t("conn_err"))}</span>
        <p class="live-item">${esc(loadState === "loading" ? t("loading_txt") : t("conn_err_txt"))}</p>
        ${loadState === "error" ? `<button class="btn retry" type="button" data-retry>${esc(t("retry"))}</button>` : ""}</div>`;
      $("#laterList").innerHTML = ""; $("#tomorrowList").innerHTML = "";
      return;
    }
    if (live.length) {
      box.innerHTML = `<div class="live"><span class="live-badge"><i></i>${esc(t("live"))}</span>` +
        live.map(e => {
          const pct = Math.max(3, Math.min(100, (n - e.start) / (e.end - e.start) * 100));
          const left = Math.max(0, Math.round((e.end - n) / 6e4));
          const leftTxt = left >= 60 ? `${Math.floor(left / 60)} h ${pad(left % 60)}` : `${left} min`;
          return `<a class="live-item" href="#${e.id}">
            ${e.isShow ? `<span class="show-flag">${IC.mic} ${esc(t("live_show"))}</span>` : ""}
            <p class="live-title">${esc(T.title(e))}</p>
            <span class="live-where">${IC.pin}<span>${esc(e.lugar)}${e.direccion ? " · " + esc(e.direccion.replace(/,\s*Toulouse$/i, "")) : ""}</span></span>
            <span class="live-meta"><span>${timeRange(e)}</span><span>${esc(t("left", { t: leftTxt }))}</span><span>${esc(T.price(e))}</span></span>
            <span class="bar" aria-hidden="true"><b style="width:${pct}%"></b></span></a>`;
        }).join("") + `</div>`;
    } else {
      const nx = EVENTS.find(e => e.start > n);
      box.innerHTML = `<div class="live empty"><span class="live-badge"><i></i>${esc(t("nothing_live"))}</span>` +
        (nx ? `<a class="live-item" href="#${nx.id}"><p class="live-title">${esc(t("next"))} ${esc(T.title(nx))}</p>
          <span class="live-where">${IC.pin}<span>${esc(nx.lugar)}</span></span>
          <span class="live-meta"><span>${esc(cap(t("at", { d: relDay(nx.start) || fDay(nx.start) + " " + fDate(nx.start), h: hm(nx.start) })))}</span></span></a>`
          : `<p class="live-item">${esc(t("no_events"))}</p>`) + `</div>`;
    }
    const later = EVENTS.filter(e => ymd(e.start) === ymd(n) && e.start > n);
    $("#laterList").innerHTML = later.length ? later.map(e => tlItem(e, { until: true })).join("") : `<li class="none">${t("no_more_today")}</li>`;
    const tm = ymd(addDays(n, 1)), tom = EVENTS.filter(e => ymd(e.start) === tm);
    $("#tomorrowList").innerHTML = tom.length ? tom.map(e => tlItem(e)).join("") : `<li class="none">${esc(t("none_tomorrow"))}</li>`;
  }

  /* ---------- AGENDA ---------- */
  let fState = { f: "todo", cat: "", q: "" };
  function weekendRange(n) {
    const t0 = startOfDay(n), dow = t0.getDay();
    const fri = dow === 0 ? addDays(t0, -2) : dow === 6 ? addDays(t0, -1) : addDays(t0, 5 - dow);
    return [new Date(fri.getTime() + 17 * 36e5), addDays(fri, 3)];
  }
  function renderFilters() {
    const F = [["todo", "f_todo"], ["finde", "f_finde"], ["gratis", "f_gratis"]];
    const cats = Array.from(new Set(EVENTS.map(e => e.categoria)));
    $("#filters").innerHTML = F.map(([id, k]) => `<button class="chip" type="button" data-f="${id}" aria-pressed="${fState.f === id}">${esc(t(k))}</button>`).join("") +
      cats.map(c => `<button class="chip" type="button" data-cat="${esc(c)}" aria-pressed="${fState.cat === c}">${esc(catName(c))}</button>`).join("");
  }
  function filtered() {
    const n = now(), tEnd = addDays(startOfDay(n), C.DIAS_AGENDA), q = fState.q.trim().toLowerCase();
    const [w0, w1] = weekendRange(n);
    return EVENTS.filter(e => {
      if (e.end <= n || e.start >= tEnd) return false;
      if (fState.f === "gratis" && !e.gratis) return false;
      if (fState.f === "fav" && !favs.has(e.base)) return false;
      if (fState.f === "finde" && !(e.end > w0 && e.start < w1)) return false;
      if (fState.cat && e.categoria !== fState.cat) return false;
      if (q && ![e.titulo, e.titulo_fr, e.lugar, e.organizador, e.descripcion, e.descripcion_fr, catName(e.categoria), e.ig_organizador, e.ig_lugar].join(" ").toLowerCase().includes(q)) return false;
      return true;
    });
  }
  function renderAgenda() {
    const t0 = startOfDay(now()), last = addDays(t0, C.DIAS_AGENDA - 1);
    $("#agendaRange").textContent = t("agenda_range", { a: fDate(t0), b: fDate(last) });
    renderFilters();
    const byDay = new Map();
    filtered().forEach(e => { const k = ymd(e.start); if (!byDay.has(k)) byDay.set(k, []); byDay.get(k).push(e); });
    let strip = "";
    for (let i = 0; i < C.DIAS_AGENDA; i++) {
      const d = addDays(t0, i), k = ymd(d), has = byDay.has(k);
      strip += `<a class="dchip ${has ? "has" : "empty"} ${i === 0 ? "today" : ""}" href="#agenda" data-jump="${k}"><span>${L().days_s[d.getDay()]}</span><b>${d.getDate()}</b></a>`;
    }
    $("#dayStrip").innerHTML = strip;
    $("#agendaList").innerHTML = byDay.size ? Array.from(byDay.entries()).map(([k, evs]) => {
      const d = parseDate(k), r = relDay(d);
      const first = r || cap(fDay(d)) + " " + d.getDate();
      const rest = r ? `${fDay(d)} ${fDate(d)}` : L().months[d.getMonth()];
      return `<div class="day" id="d-${k}"><div class="day-h"><b>${esc(first)}</b><span>${esc(rest)} · ${evs.length} ${esc(evs.length === 1 ? t("ev1") : t("evn"))}</span></div>
        <ol class="timeline">${evs.map(e => tlItem(e, { until: true })).join("")}</ol></div>`;
    }).join("") : `<p class="none">${esc(t("no_filter"))}</p>`;
  }

  /* ---------- DETALLE ---------- */
  let openId = null;
  function openSheet(id) {
    const e = EVENTS.find(x => x.id === id) || EVENTS.find(x => x.base === id);
    if (!e) return false;
    openId = e.id;
    const fav = favs.has(e.base);
    const when = e.multi
      ? `${esc(t("range", { a: fDate(e.desde), b: fDate(e.hasta) }))}<small>${timeRange(e)} · ${esc(t("each_day"))}</small>`
      : `${esc(cap(dayLabel(e.start)))}<small>${timeRange(e)}</small>`;
    const orgSame = e.organizador && e.organizador.toLowerCase() === e.lugar.toLowerCase();
    const addr = [e.direccion, e.direccion.toLowerCase().includes(e.ciudad.toLowerCase()) ? "" : e.ciudad].filter(Boolean).join(", ");
    const desc = T.desc(e);
    $("#sheet").innerHTML = `
      <div class="grab"></div>
      <button class="sheet-close" type="button" aria-label="${esc(t("close"))}" data-close>✕</button>
      <span class="tag cat" style="--c:${catColor(e.categoria)}">${esc(catName(e.categoria))}</span>
      <h2 id="sheetTitle">${esc(T.title(e))}</h2>
      ${e.imagen ? `<img class="sheet-flyer" src="${esc(e.imagen)}" alt="" loading="lazy">` : ""}
      <div class="facts">
        <div class="fact">${IC.clock}<div><div class="fact-k">${esc(t("when"))}</div><div class="fact-v">${when}</div></div></div>
        ${e.lugar ? `<div class="fact">${IC.place}<div><div class="fact-k">${esc(t("where"))}</div><div class="fact-v"><a href="${mapsUrl(e)}" target="_blank" rel="noopener">${esc(e.lugar)}</a> ${igLink(e.ig_lugar)}<small>${esc(addr)}</small></div></div></div>` : ""}
        ${e.organizador && !orgSame ? `<div class="fact">${IC.org}<div><div class="fact-k">${esc(t("org"))}</div><div class="fact-v">${esc(e.organizador)} ${igLink(e.ig_organizador)}</div></div></div>` : ""}
        <div class="fact">${IC.euro}<div><div class="fact-k">${esc(t("price"))}</div><div class="fact-v">${esc(T.price(e))}</div></div></div>
        ${e.ig_etiquetas.length ? `<div class="fact">${IC.tag}<div><div class="fact-k">${esc(t("with"))}</div><div class="fact-v">${e.ig_etiquetas.map(igLink).join(" ")}</div></div></div>` : ""}
      </div>
      ${desc ? `<p class="desc">${esc(desc)}</p>` : ""}
      <div class="actions">
        <button class="act" type="button" data-fav="${e.base}" aria-pressed="${fav}">${IC.star}<span>${esc(fav ? t("fav_on") : t("fav"))}</span></button>
        <button class="act" type="button" data-ics="${e.id}">${IC.cal}<span>${esc(t("cal"))}</span></button>
        <button class="act" type="button" data-share="${e.id}">${IC.share}<span>${esc(t("share"))}</span></button>
      </div>
      ${e.link ? `<a class="btn-big" href="${esc(e.link)}" target="_blank" rel="noopener">${esc(e.isShow ? t("watch") : t("tickets"))}</a>` : ""}
      ${e.lugar ? `<a class="btn-big alt" href="${mapsUrl(e)}" target="_blank" rel="noopener">${esc(t("directions"))}</a>` : ""}`;
    $("#sheet").hidden = false; $("#sheetBack").hidden = false;
    document.body.style.overflow = "hidden"; $("#sheet").scrollTop = 0;
    $(".sheet-close").focus({ preventScroll: true });
    return true;
  }
  function closeSheet() { openId = null; $("#sheet").hidden = true; $("#sheetBack").hidden = true; document.body.style.overflow = ""; }

  function toggleFav(base, btn) {
    favs.has(base) ? favs.delete(base) : favs.add(base);
    store.set("favs", Array.from(favs));
    const on = favs.has(base);
    if (btn) { btn.setAttribute("aria-pressed", on); btn.querySelector("span").textContent = on ? t("fav_on") : t("fav"); }
    toast(on ? t("toast_fav_on") : t("toast_fav_off"));
    renderHoy(); renderAgenda(); renderFavs();
  }

  /* ---------- FAVORITOS ---------- */
  function dayGroups(list) {
    const byDay = new Map();
    list.forEach(e => { const k = ymd(e.start); if (!byDay.has(k)) byDay.set(k, []); byDay.get(k).push(e); });
    return Array.from(byDay.entries()).map(([k, evs]) => {
      const d = parseDate(k), r = relDay(d);
      const first = r || cap(fDay(d)) + " " + d.getDate();
      const rest = r ? `${fDay(d)} ${fDate(d)}` : L().months[d.getMonth()];
      return `<div class="day"><div class="day-h"><b>${esc(first)}</b><span>${esc(rest)} · ${evs.length} ${esc(evs.length === 1 ? t("ev1") : t("evn"))}</span></div>
        <ol class="timeline">${evs.map(e => tlItem(e, { until: true })).join("")}</ol></div>`;
    }).join("");
  }
  function renderFavs() {
    const n = now();
    const list = EVENTS.filter(e => favs.has(e.base) && e.end > n);
    $("#favList").innerHTML = list.length ? dayGroups(list)
      : `<div class="none fav-empty"><p>${esc(t("favs_empty"))}</p><a class="btn" href="#agenda">${esc(t("favs_go"))}</a></div>`;
  }

  function saveBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function downloadIcs(id) {
    const e = EVENTS.find(x => x.id === id); if (!e) return;
    const f = d => d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "T" + pad(d.getHours()) + pad(d.getMinutes()) + "00";
    const clean = s => String(s || "").replace(/[\\,;]/g, m => "\\" + m).replace(/\n/g, "\\n");
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Oye Toulouse//Agenda//ES", "BEGIN:VEVENT",
      "UID:" + e.id + "-" + f(e.start) + "@oyetoulouse", "DTSTAMP:" + f(new Date()),
      "DTSTART;TZID=Europe/Paris:" + f(e.start), "DTEND;TZID=Europe/Paris:" + f(e.end),
      "SUMMARY:" + clean(T.title(e)), "LOCATION:" + clean([e.lugar, e.direccion].filter(Boolean).join(", ")),
      "DESCRIPTION:" + clean(T.desc(e) + (e.link ? "\n" + e.link : "") + "\nOye Toulouse"),
      "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    try { saveBlob(new Blob([ics], { type: "text/calendar" }), T.title(e).replace(/[^\wáéíóúñàèçê ]+/gi, "").slice(0, 40) + ".ics"); toast(t("ics_ok")); }
    catch (err) { toast(t("ics_err")); }
  }

  async function shareEvent(id) {
    const e = EVENTS.find(x => x.id === id); if (!e) return;
    const url = location.href.split("#")[0] + "#" + e.base;
    const text = `${T.title(e)} · ${cap(fDay(e.start))} ${fDate(e.start)}, ${hm(e.start)} · ${e.lugar}`;
    if (navigator.share) { try { await navigator.share({ title: T.title(e), text, url }); return; } catch (err) { if (err && err.name === "AbortError") return; } }
    window.open("https://wa.me/?text=" + encodeURIComponent(text + "\n" + url), "_blank", "noopener");
  }

  /* ---------- LUGARES ---------- */
  let placeType = "";
  function renderLugares() {
    const types = Array.from(new Set(PLACES.map(p => p.tipo).filter(Boolean)));
    $("#lugarFilters").innerHTML = `<button class="chip" type="button" data-ptype="" aria-pressed="${!placeType}">${esc(t("all"))}</button>` +
      types.map(x => `<button class="chip" type="button" data-ptype="${esc(x)}" aria-pressed="${placeType === x}">${esc(x)}</button>`).join("");
    const list = PLACES.filter(p => !placeType || p.tipo === placeType);
    $("#placeList").innerHTML = list.length ? list.map(p => {
      const ig = igHandle(p.instagram), q = encodeURIComponent([p.nombre, p.direccion].filter(Boolean).join(", "));
      const d = LANG === "fr" ? (p.descripcion_fr || p.descripcion) : p.descripcion;
      return `<div class="place"><div class="place-top"><h3>${esc(p.nombre)}</h3>${p.tipo ? `<span class="tag">${esc(p.tipo)}</span>` : ""}</div>
        <p>${esc(d || "")}${p.barrio ? ` <b>· ${esc(p.barrio)}</b>` : ""}</p>
        <div class="place-links"><a href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener">${esc(t("map"))}</a>${igLink(ig)}${safeUrl(p.link) ? `<a href="${esc(p.link)}" target="_blank" rel="noopener">Web</a>` : ""}</div></div>`;
    }).join("") : `<p class="none">${esc(t("no_places"))}</p>`;
  }

  /* ---------- EMISIONES (podcast en Vodio) ---------- */
  // En la columna "vodio" del Sheet se puede pegar: el link del episodio, el código de inserción (<iframe…>) o un link .mp3
  const PODCAST_HOSTS = /(^|\.)(vodio\.fr|ausha\.co|spotify\.com|soundcloud\.com|podcasts\.apple\.com|acast\.com|podbean\.com|buzzsprout\.com)$/i;
  function vodioMedia(v) {
    v = String(v || "").trim(); if (!v) return null;
    const m = v.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
    const src = (m ? m[1] : v).replace(/&amp;/g, "&");
    if (!/^https:\/\//i.test(src)) return null;
    let host = ""; try { host = new URL(src).hostname; } catch (e) { return null; }
    if (/\.(mp3|m4a|aac|ogg|wav)(\?|$)/i.test(src)) return { type: "audio", src, link: src };
    const hm2 = v.match(/height=["']?(\d+)/i);
    if (PODCAST_HOSTS.test(host) && (m || /(embed|player|widget|iframe)/i.test(src))) return { type: "iframe", src, link: src, h: Math.min(520, Math.max(120, hm2 ? +hm2[1] : 200)) };
    return { type: "link", src, link: src };
  }
  function showThumb(s) {
    return s.imagen ? `<img src="${esc(s.imagen)}" alt="" loading="lazy">` : `<span class="show-num">#${esc(pad(s.numero || "?"))}</span>`;
  }
  function playerHtml(md) {
    if (md.type === "audio") return `<audio controls autoplay preload="none" src="${esc(md.src)}"></audio>`;
    return `<iframe src="${esc(md.src)}" height="${md.h}" loading="lazy" allow="autoplay; encrypted-media" title="Podcast"></iframe>`;
  }
  function renderShows() {
    const n = now();
    const upcoming = SHOWS.filter(s => s.start && s.end > n).sort((a, b) => a.start - b.start);
    const nx = upcoming[0];
    const sTitle = s => (LANG === "fr" && s.titulo_fr) || s.titulo;
    const sDesc = s => LANG === "fr" ? (s.descripcion_fr || s.descripcion) : (s.descripcion || s.descripcion_fr);
    $("#nextShow").innerHTML = nx ? (() => {
      const isLive = nx.start <= n;
      const ev = EVENTS.find(e => e.isShow && +e.start === +nx.start);
      return `<a class="next-show ${isLive ? "on" : ""}" href="${ev ? "#" + ev.id : "#oye"}">
        <span class="live-badge"><i></i>${esc(isLive ? t("live_show") : t("next_show"))}</span>
        <p class="live-title">${esc(sTitle(nx))}</p>
        <span class="live-meta"><span>${esc(cap(fDay(nx.start)))} ${esc(fDate(nx.start))}${nx.hasTime ? " · " + hm(nx.start) : ""}</span>${nx.lugar ? `<span>${IC.pin} ${esc(nx.lugar)}</span>` : ""}</span>
        ${nx.invitades ? `<span class="live-meta"><span>${esc(t("guests"))} ${esc(nx.invitades)}</span></span>` : ""}</a>`;
    })() : "";
    // no tocar la lista si alguien está escuchando
    if ($("#showList .show-player:not(:empty)")) return;
    const past = SHOWS.filter(s => s !== nx && !(s.start && s.end > n));
    $("#showList").innerHTML = past.length ? past.map((s, i) => {
      const md = s.media;
      const canPlay = md && md.type !== "link";
      return `<article class="show">
        <div class="show-thumb">${showThumb(s)}${canPlay ? `<button class="show-play" type="button" data-play="${i}" aria-label="${esc(t("listen_here"))}">${IC.play}</button>` : ""}</div>
        <div class="show-body">
          <p class="show-k">${esc(t("episode", { n: s.numero || "" }))}${s.start ? " · " + esc(fDate(s.start)) : ""}</p>
          <h3>${esc(sTitle(s))}</h3>
          ${s.invitades ? `<p class="show-g">${esc(t("guests"))} ${esc(s.invitades)}${s.lugar ? " · " + esc(s.lugar) : ""}</p>` : ""}
          ${sDesc(s) ? `<p class="show-d">${esc(sDesc(s))}</p>` : ""}
          <div class="show-btns">
            ${canPlay ? `<button class="listen" type="button" data-play="${i}">${IC.play}<span>${esc(t("listen_here"))}</span></button>` : ""}
            ${md ? `<a href="${esc(md.link)}" target="_blank" rel="noopener">${esc(t("listen_vodio"))}</a>` : `<span class="soon">${esc(t("soon"))}</span>`}
            ${igLink(igHandle(s.instagram))}
          </div>
        </div>
        <div class="show-player" id="player-${i}"></div>
      </article>`;
    }).join("") : (nx ? "" : `<p class="none">${esc(t("no_shows"))}</p>`);
    PAST_SHOWS = past;
  }
  let PAST_SHOWS = [];
  function togglePlayer(i, btn) {
    const box = document.getElementById("player-" + i), s = PAST_SHOWS[i];
    if (!box || !s || !s.media) return;
    if (box.innerHTML) { box.innerHTML = ""; $$(`[data-play="${i}"]`).forEach(b => b.classList.remove("on")); return; }
    $$("#showList .show-player").forEach(p => { p.innerHTML = ""; });
    $$("#showList [data-play]").forEach(b => b.classList.remove("on"));
    box.innerHTML = playerHtml(s.media) + `<button class="player-close" type="button" data-play="${i}">${esc(t("hide_player"))}</button>`;
    $$(`[data-play="${i}"]`).forEach(b => b.classList.add("on"));
  }

  function renderOye() {
    const ig = igHandle(C.INSTAGRAM);
    if (ig) { $("#igLink").href = "https://instagram.com/" + ig; $("#igLink span").textContent = "@" + ig; }
    if (safeUrl(C.YOUTUBE)) { $("#ytLink").href = C.YOUTUBE; $("#ytLink").hidden = false; }
    if (safeUrl(C.VODIO)) { $("#vodioLink").href = C.VODIO; $("#vodioLink").hidden = false; }
    if (C.EMAIL) { $("#mailTxt").textContent = C.EMAIL; $("#mailCard").hidden = false; }
  }

  /* ---------- STORY ---------- */
  let storyBusy = 0;
  async function renderStory() {
    if (!window.OyeStory) return;
    const job = ++storyBusy;
    const mode = ($('input[name="smode"]:checked') || {}).value || "finde";
    const sl = ($('input[name="slang"]:checked') || {}).value || "bi";
    store.set("slang", sl);
    const n = now(), t0 = startOfDay(n);
    let from, to;
    if (mode === "hoy") { from = n; to = addDays(t0, 1); }
    else if (mode === "semana") { from = n; to = addDays(t0, 7); }
    else { [from, to] = weekendRange(n); if (from < n) from = n; }
    const seen = new Set();
    const list = EVENTS.filter(e => e.end > from && e.start < to).filter(e => { if (seen.has(e.base)) return false; seen.add(e.base); return true; });
    const prev = $("#storyPrev");
    if (!list.length) { prev.innerHTML = `<p class="none">${esc(t("s_empty"))}</p>`; return; }
    prev.innerHTML = `<p class="none">…</p>`;

    const lA = sl === "fr" ? "fr" : "es", bi = sl === "bi";
    const dayTxt = d => bi ? `${fDay(d, "es")} ${d.getDate()} · ${fDay(d, "fr")} ${d.getDate()}`.toUpperCase() : `${fDay(d, lA)} ${fDate(d, lA)}`.toUpperCase();
    const groups = [];
    list.forEach(e => {
      const d = e.start < from ? startOfDay(from) : startOfDay(e.start), k = ymd(d);
      let g = groups.find(x => x.k === k); if (!g) { g = { k, label: dayTxt(d), items: [] }; groups.push(g); }
      const title = (lA === "fr" && e.titulo_fr) || e.titulo;
      const price = e.gratis ? (bi ? "Gratis · Gratuit" : I18N[lA].free) : e.precio;
      g.items.push({ time: hm(e.start), timeSub: e.multi ? "→ " + pad(e.hasta.getDate()) + "/" + pad(e.hasta.getMonth() + 1) : "", title, sub: e.lugar, price, free: e.gratis });
    });
    const titles = { finde: ["ESTE FINDE", "CE WEEK-END"], hoy: ["HOY", "AUJOURD'HUI"], semana: ["ESTA SEMANA", "CETTE SEMAINE"] }[mode];
    const d0 = mode === "finde" ? weekendRange(n)[0] : n, d1 = addDays(to, -1);
    const mon = d => I18N[lA].months[d.getMonth()].slice(0, 3).toUpperCase();
    const rangeTxt = ymd(d0) === ymd(d1) ? `${d0.getDate()} ${mon(d0)}` : d0.getMonth() === d1.getMonth() ? `${d0.getDate()}–${d1.getDate()} ${mon(d1)}` : `${d0.getDate()} ${mon(d0)} – ${d1.getDate()} ${mon(d1)}`;
    const canvases = await window.OyeStory.render({
      title: bi ? titles[0] : titles[lA === "fr" ? 1 : 0], title2: bi ? titles[1] : "",
      rangeTxt, groups, instagram: igHandle(C.INSTAGRAM) || "oyetoulouse",
      footer: bi ? "Toda la agenda en la app · Tout l'agenda sur l'appli" : (lA === "fr" ? "Tout l'agenda sur l'appli" : "Toda la agenda en la app"),
      url: (C.APP_URL || "").replace(/^https?:\/\//, "").replace(/\/$/, "")
    });
    if (job !== storyBusy) return;
    const blobs = await Promise.all(canvases.map(c => new Promise(r => c.toBlob(r, "image/png"))));
    const name = i => `oye-${mode}-${ymd(d0)}${canvases.length > 1 ? "-" + (i + 1) : ""}.png`;
    const files = blobs.map((b, i) => new File([b], name(i), { type: "image/png" }));
    prev.innerHTML = `<div class="story-imgs">${canvases.map((c, i) => `<img src="${c.toDataURL("image/jpeg", .8)}" alt="Story ${i + 1}/${canvases.length}">`).join("")}</div>
      <div class="story-actions">
        <button class="btn-big" type="button" id="storyShare">${esc(t("s_share"))}</button>
        <button class="btn-big alt" type="button" id="storyDl">${esc(t("s_download"))}${canvases.length > 1 ? ` (${canvases.length})` : ""}</button>
      </div>`;
    const canShare = navigator.canShare && navigator.canShare({ files });
    if (!canShare) $("#storyShare").hidden = true;
    $("#storyShare").onclick = async () => { try { await navigator.share({ files }); } catch (e) { } };
    $("#storyDl").onclick = () => { files.forEach((f, i) => setTimeout(() => saveBlob(f, f.name), i * 400)); toast(t("s_saved")); };
  }

  /* ---------- FORMULARIO ---------- */
  let flyerData = "";
  function setupForm() {
    $("#f_fecha").min = ymd(new Date());
    $("#f_varios").addEventListener("change", ev => { $("#f_fechaFinWrap").hidden = !ev.target.checked; });
    $$('input[name="tipo_precio"]').forEach(r => r.addEventListener("change", () => { $("#f_montoWrap").hidden = $('input[name="tipo_precio"]:checked').value !== "pago"; }));
    $("#f_desc").addEventListener("input", ev => { $("#descCount").textContent = ev.target.value.length + " / 600"; });
    $("#f_flyer").addEventListener("change", async ev => {
      const file = ev.target.files && ev.target.files[0];
      flyerData = ""; $("#flyerPreview").hidden = true;
      if (!file) return;
      try { flyerData = await shrinkImage(file, 1400, .82); $("#flyerPreview").src = flyerData; $("#flyerPreview").hidden = false; }
      catch (e) { toast(t("bad_img")); }
    });
    const draft = store.get("draft", null);
    if (draft) Object.entries(draft).forEach(([k, v]) => { const el = document.getElementById(k); if (el && !["file", "checkbox", "radio"].includes(el.type)) el.value = v; });
    $("#form").addEventListener("input", () => {
      const d = {}; $$("#form input, #form textarea, #form select").forEach(el => { if (el.id && !["file", "checkbox", "radio"].includes(el.type)) d[el.id] = el.value; });
      store.set("draft", d);
    });
    $("#form").addEventListener("submit", onSubmit);
    $("#sendAnother").addEventListener("click", () => { $("#sentBox").hidden = true; $("#form").hidden = false; window.scrollTo(0, 0); });
  }
  function shrinkImage(file, max, q) {
    return new Promise((res, rej) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL("image/jpeg", q));
      };
      img.onerror = rej; img.src = url;
    });
  }
  async function onSubmit(ev) {
    ev.preventDefault();
    const err = $("#formErr"); err.hidden = true;
    $$(".f.invalid").forEach(x => x.classList.remove("invalid"));
    const bad = ["f_titulo", "f_categoria", "f_fecha", "f_inicio", "f_desc", "f_lugar", "f_dir", "f_org", "f_contacto"].filter(id => !$("#" + id).value.trim());
    const tp = $('input[name="tipo_precio"]:checked').value;
    if (tp === "pago" && !$("#f_monto").value.trim()) bad.push("f_monto");
    if ($("#f_link").value.trim() && !safeUrl($("#f_link").value)) bad.push("f_link");
    if (bad.length || !$("#f_ok").checked) {
      bad.forEach(id => $("#" + id).closest(".f").classList.add("invalid"));
      err.textContent = !bad.length ? t("err_ok") : t("err_fields"); err.hidden = false;
      (bad.length ? $("#" + bad[0]) : $("#f_ok")).focus(); return;
    }
    if ($("#f_web").value) return;
    let precio = tp;
    if (tp === "pago") { const m = $("#f_monto").value.trim(); precio = /€/.test(m) ? m : m + " €"; }
    const d1 = $("#f_desc").value.trim(), d2 = $("#f_desc2").value.trim();
    const data = {
      titulo: $("#f_titulo").value.trim(), categoria: $("#f_categoria").value,
      fecha: $("#f_fecha").value, fecha_fin: $("#f_varios").checked ? $("#f_fecha_fin").value : "",
      hora_inicio: $("#f_inicio").value, hora_fin: $("#f_fin").value,
      lugar: $("#f_lugar").value.trim(), direccion: $("#f_dir").value.trim(), ciudad: $("#f_ciudad").value.trim() || "Toulouse",
      ig_lugar: igHandle($("#f_ig_lugar").value), organizador: $("#f_org").value.trim(), ig_organizador: igHandle($("#f_ig_org").value),
      ig_etiquetas: igList($("#f_ig_tags").value).map(h => "@" + h).join(" "), precio,
      descripcion: LANG === "fr" ? d2 : d1, descripcion_fr: LANG === "fr" ? d1 : d2,
      link: safeUrl($("#f_link").value), contacto: $("#f_contacto").value.trim(), idioma_form: LANG, flyer: flyerData
    };
    const btn = $("#sendBtn"); btn.disabled = true; btn.textContent = t("sending");
    try {
      if (C.API_URL) await fetch(C.API_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(data) });
      else console.info("[Oye Toulouse] demo:", data);
      store.set("draft", null); $("#form").reset(); flyerData = "";
      ["#flyerPreview", "#f_montoWrap", "#f_fechaFinWrap"].forEach(s => { $(s).hidden = true; });
      $("#descCount").textContent = "0 / 600";
      $("#form").hidden = true; $("#sentBox").hidden = false; window.scrollTo(0, 0);
      if (!C.API_URL) toast(t("demo_form"));
    } catch (e) { err.textContent = t("err_send"); err.hidden = false; }
    finally { btn.disabled = false; btn.textContent = t("send_btn"); }
  }

  /* ---------- toast ---------- */
  let tt;
  function toast(msg) { const x = $("#toast"); x.textContent = msg; x.hidden = false; clearTimeout(tt); tt = setTimeout(() => { x.hidden = true; }, 2800); }

  /* ---------- navegación ---------- */
  const VIEWS = ["hoy", "favoritos", "agenda", "enviar", "lugares", "oye", "story"];
  let current = "hoy";
  function route() {
    const h = (location.hash || "#hoy").slice(1);
    if (/^e\d/.test(h)) { if (openSheet(h)) { showView(current, true); return; } }
    closeSheet();
    showView(VIEWS.includes(h) ? h : "hoy");
  }
  function showView(v, keep) {
    const changed = v !== current; current = v;
    $$(".view").forEach(s => { s.hidden = s.dataset.view !== v; });
    const tab = v === "story" ? "agenda" : v === "enviar" ? "hoy" : v;
    $$(".tabbar a").forEach(a => a.dataset.tab === tab ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
    if (v === "story") renderStory();
    if (changed && !keep) window.scrollTo(0, 0);
  }

  function renderAll() { renderHoy(); renderAgenda(); renderFavs(); renderLugares(); renderShows(); if (current === "story") renderStory(); }
  function go(v) {
    closeSheet();
    if (v !== current || location.hash !== "#" + v) history.pushState(null, "", "#" + v);
    showView(v);
  }

  document.addEventListener("click", ev => {
    const x = ev.target;
    if (x.closest("[data-close]") || x.id === "sheetBack") { ev.preventDefault(); closeSheet(); history.replaceState(null, "", "#" + current); return; }
    if (x.closest("[data-retry]")) { loadState = "loading"; renderHoy(); refresh(true); return; }
    const fv = x.closest("[data-fav]"); if (fv) return toggleFav(fv.dataset.fav, fv);
    const ic = x.closest("[data-ics]"); if (ic) return downloadIcs(ic.dataset.ics);
    const sh = x.closest("[data-share]"); if (sh) return shareEvent(sh.dataset.share);
    const ch = x.closest("[data-f]"); if (ch) { fState.f = ch.dataset.f; if (fState.f === "todo") fState.cat = ""; renderAgenda(); return; }
    const cc = x.closest("[data-cat]"); if (cc) { fState.cat = fState.cat === cc.dataset.cat ? "" : cc.dataset.cat; renderAgenda(); return; }
    const pt = x.closest("[data-ptype]"); if (pt) { placeType = pt.dataset.ptype; renderLugares(); return; }
    const jp = x.closest("[data-jump]"); if (jp) { ev.preventDefault(); const el = document.getElementById("d-" + jp.dataset.jump); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    const pl = x.closest("[data-play]"); if (pl) { togglePlayer(+pl.dataset.play, pl); return; }
    const a = x.closest('a[href^="#"]');
    if (a) {
      const h = a.getAttribute("href").slice(1);
      if (/^e\d/.test(h)) { ev.preventDefault(); if (openSheet(h)) history.pushState(null, "", "#" + h); return; }
      if (VIEWS.includes(h)) { ev.preventDefault(); go(h); return; }
    }
  });
  document.addEventListener("keydown", ev => { if (ev.key === "Escape" && !$("#sheet").hidden) { closeSheet(); history.replaceState(null, "", "#" + current); } });
  window.addEventListener("hashchange", route);
  window.addEventListener("popstate", route);
  $("#q").addEventListener("input", ev => { fState.q = ev.target.value; renderAgenda(); });
  $$('input[name="smode"], input[name="slang"]').forEach(r => r.addEventListener("change", renderStory));
  $("#langBtn").addEventListener("click", () => {
    LANG = LANG === "es" ? "fr" : "es"; store.set("lang", LANG);
    applyI18n(); renderAll();
    if (openId) openSheet(openId);
  });

  /* ---------- PWA ---------- */
  let deferred;
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred = e; $("#installBtn").hidden = false; });
  $("#installBtn").addEventListener("click", async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; $("#installBtn").hidden = true; });
  let swReg = null;
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(r => { swReg = r; r.update(); }).catch(() => { }));
  }

  /* ---------- actualización automática ----------
     Al abrir la app (o volver a ella desde segundo plano):
     1) si se publicó una versión nueva en Vercel, la app se recarga sola;
     2) si no, vuelve a leer el Google Sheet. */
  const WATCH = ["index.html", "app.js", "styles.css", "config.js", "i18n.js", "story.js"];
  let FP = null, checking = false;
  async function fingerprint() {
    try {
      const r = await Promise.all(WATCH.map(f => fetch(f, { method: "HEAD", cache: "no-store" }).then(x => x.ok ? (x.headers.get("etag") || x.headers.get("last-modified") || "") : "")));
      return r.join("|") || null;
    } catch (e) { return null; }
  }
  async function refresh(force) {
    if (checking) return; checking = true;
    try {
      const fp = await fingerprint();
      if (fp && FP && fp !== FP) { location.reload(); return; }
      if (fp) FP = fp;
      if (swReg) swReg.update().catch(() => { });
      if (force || Date.now() - lastLoad > 20e3) { nowOverride = null; await loadData(); renderAll(); }
    } finally { checking = false; }
  }
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") refresh(); });
  window.addEventListener("pageshow", ev => { if (ev.persisted) refresh(true); });
  window.addEventListener("online", () => refresh(true));

  /* ---------- arranque ---------- */
  (async function init() {
    applyI18n(); renderOye(); setupForm();
    const cached = C.API_URL && store.get("cache", null);
    if (cached) {
      VIDEOS = cached.videos || []; SHOWS = prepShows(cached.shows || []);
      EVENTS = expand((cached.raw || []).concat(showsAsEvents(SHOWS)));
      PLACES = (cached.places || []).filter(p => p && p.nombre);
      loadState = "ok"; renderAll(); route();
    } else { renderAll(); route(); }
    await loadData();
    renderAll(); route();
    fingerprint().then(fp => { FP = fp; });
    setInterval(() => { if (nowOverride) nowOverride += 6e4; renderHoy(); }, 6e4);
    if (C.API_URL) setInterval(async () => { await loadData(); renderAll(); }, 10 * 6e4);
  })();
})();
