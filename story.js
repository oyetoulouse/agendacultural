/* OYE TOULOUSE — generador de stories (1080 × 1920) a partir de la agenda */
(function () {
  "use strict";
  const W = 1080, H = 1920;
  const COL = { azul: "#256eac", claro: "#7c94c0", noche: "#123a6b", amarillo: "#f8e01b", rojo: "#d5263f", rosa: "#f66ea5", menta: "#afdcd7", papel: "#f6f8fc", tinta: "#0f2747", tinta2: "#4a5d7c" };
  const DISPLAY = '"Lilita One", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif';
  const BODY = '"Bricolage Grotesque", system-ui, -apple-system, "Segoe UI", sans-serif';
  const TOP = 230, LIST_TOP = 700, LIST_BOTTOM = 1500; // zonas seguras de Instagram

  const pad = n => String(n).padStart(2, "0");
  const hm = d => pad(d.getHours()) + ":" + pad(d.getMinutes());
  let logoImg = null, grain = null;

  function loadLogo() {
    if (logoImg) return Promise.resolve(logoImg);
    return new Promise(res => { const i = new Image(); i.onload = () => { logoImg = i; res(i); }; i.onerror = () => res(null); i.src = "img/logo.png"; });
  }
  async function loadFonts() {
    if (!document.fonts || !document.fonts.load) return;
    try { await Promise.all([document.fonts.load('120px "Lilita One"'), document.fonts.load('800 40px "Bricolage Grotesque"'), document.fonts.load('600 32px "Bricolage Grotesque"')]); } catch (e) { }
  }
  function grainPattern(ctx) {
    if (!grain) {
      grain = document.createElement("canvas"); grain.width = grain.height = 256;
      const g = grain.getContext("2d"), im = g.createImageData(256, 256);
      for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() > .5 ? 255 : 0; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = Math.random() * 46; }
      g.putImageData(im, 0, 0);
    }
    return ctx.createPattern(grain, "repeat");
  }

  function wrap(ctx, text, maxW, maxLines) {
    const words = String(text).split(/\s+/); const lines = []; let cur = "";
    for (const w of words) {
      const t = cur ? cur + " " + w : w;
      if (ctx.measureText(t).width <= maxW) cur = t; else { if (cur) lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    if (lines.length > maxLines) {
      const keep = lines.slice(0, maxLines); let last = keep[maxLines - 1];
      while (ctx.measureText(last + "…").width > maxW && last.length) last = last.slice(0, -1);
      keep[maxLines - 1] = last.trim() + "…"; return keep;
    }
    return lines;
  }
  function round(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function shadowText(ctx, txt, x, y, color, sh, off) { ctx.fillStyle = sh; ctx.fillText(txt, x + off, y + off); ctx.fillStyle = color; ctx.fillText(txt, x, y); }

  function background(ctx) {
    ctx.fillStyle = COL.azul; ctx.fillRect(0, 0, W, H);
    let g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1300); g.addColorStop(0, "rgba(124,148,192,.75)"); g.addColorStop(1, "rgba(124,148,192,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // círculo de rayas menta (el mapa del logo)
    ctx.save(); ctx.beginPath(); ctx.arc(W - 40, 420, 300, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = "rgba(175,220,215,.55)"; for (let y = 100; y < 760; y += 9) ctx.fillRect(W - 360, y, 640, 4); ctx.restore();
    // semitono rosa abajo
    ctx.save(); ctx.beginPath(); ctx.arc(80, H - 120, 330, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = COL.rosa; ctx.fillRect(0, H - 460, 420, 460);
    ctx.fillStyle = "rgba(213,38,63,.6)"; for (let y = H - 460; y < H; y += 14) for (let x = (y / 14 % 2) * 7; x < 420; x += 14) { ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 7); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = grainPattern(ctx); ctx.fillRect(0, 0, W, H);
  }

  function header(ctx, o, pageIdx, pages) {
    if (logoImg) ctx.drawImage(logoImg, 56, TOP - 40, 230, 230);
    ctx.textBaseline = "alphabetic";
    ctx.font = `76px ${DISPLAY}`; shadowText(ctx, o.rangeTxt, 316, TOP + 70, "#fff", COL.noche, 5);
    ctx.font = `700 38px ${BODY}`; ctx.fillStyle = COL.menta; ctx.fillText("@" + o.instagram, 320, TOP + 128);
    if (pages > 1) { ctx.font = `800 30px ${BODY}`; ctx.fillStyle = "#fff"; ctx.fillText(`${pageIdx + 1}/${pages}`, 320, TOP + 175); }
    // título
    let size = 150; ctx.font = `${size}px ${DISPLAY}`;
    while (ctx.measureText(o.title).width > W - 120 && size > 80) { size -= 6; ctx.font = `${size}px ${DISPLAY}`; }
    shadowText(ctx, o.title, 58, TOP + 260 + size * .55, COL.amarillo, COL.noche, 9);
    if (o.title2) { ctx.font = `68px ${DISPLAY}`; shadowText(ctx, o.title2, 62, TOP + 360 + size * .55 - 20, COL.menta, COL.noche, 5); }
  }

  function footer(ctx, o) {
    const parts = o.footer.split(" · ");
    ctx.font = `800 34px ${BODY}`;
    const lines = parts.length > 1 ? parts : [o.footer];
    if (o.url) lines.push(o.url);
    const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 70, h = 30 + lines.length * 46;
    const x = (W - w) / 2, y = H - 240 - h;
    round(ctx, x + 7, y + 7, w, h, 26); ctx.fillStyle = COL.rosa; ctx.fill();
    round(ctx, x, y, w, h, 26); ctx.fillStyle = COL.noche; ctx.fill();
    ctx.textAlign = "center";
    lines.forEach((l, i) => { ctx.fillStyle = o.url && i === lines.length - 1 ? COL.amarillo : "#fff"; ctx.fillText(l, W / 2, y + 56 + i * 46); });
    ctx.textAlign = "left";
  }

  /* arma las "filas" (cabeceras de día + eventos) y las reparte en páginas */
  function layout(ctx, groups) {
    const rows = [];
    groups.forEach(g => {
      rows.push({ type: "day", label: g.label, h: 84 });
      g.items.forEach(e => {
        ctx.font = `800 42px ${BODY}`;
        const lines = wrap(ctx, e.title, W - 120 - 250, 2);
        rows.push({ type: "ev", e, lines, h: 92 + lines.length * 50 });
      });
    });
    const pages = [[]]; let y = LIST_TOP, lastDay = null;
    rows.forEach(r => {
      if (r.type === "day") lastDay = r;
      const need = r.h + (r.type === "day" ? 130 : 14); // no dejar un día huérfano al final
      if (y + need > LIST_BOTTOM && pages[pages.length - 1].length) {
        pages.push([]); y = LIST_TOP;
        if (r.type === "ev" && lastDay) { pages[pages.length - 1].push(lastDay); y += lastDay.h; }
      }
      pages[pages.length - 1].push(r); y += r.h + (r.type === "ev" ? 14 : 0);
    });
    return pages;
  }

  function drawRows(ctx, rows) {
    let y = LIST_TOP;
    rows.forEach(r => {
      if (r.type === "day") {
        ctx.font = `800 34px ${BODY}`;
        const w = ctx.measureText(r.label).width + 52;
        round(ctx, 60, y + 10, w, 58, 29); ctx.fillStyle = COL.rosa; ctx.fill();
        ctx.lineWidth = 4; ctx.strokeStyle = COL.noche; ctx.stroke();
        ctx.fillStyle = COL.tinta; ctx.fillText(r.label, 86, y + 52);
        y += r.h; return;
      }
      const e = r.e, x = 60, w = W - 120;
      round(ctx, x + 8, y + 8, w, r.h, 28); ctx.fillStyle = COL.noche; ctx.fill();
      round(ctx, x, y, w, r.h, 28); ctx.fillStyle = COL.papel; ctx.fill();
      ctx.font = `64px ${DISPLAY}`; ctx.fillStyle = COL.azul; ctx.fillText(e.time, x + 30, y + 82);
      if (e.timeSub) { ctx.font = `600 26px ${BODY}`; ctx.fillStyle = COL.tinta2; ctx.fillText(e.timeSub, x + 32, y + 120); }
      ctx.fillStyle = "#d7e1ef"; ctx.fillRect(x + 222, y + 26, 4, r.h - 52);
      ctx.font = `800 42px ${BODY}`; ctx.fillStyle = COL.tinta;
      r.lines.forEach((l, i) => ctx.fillText(l, x + 250, y + 70 + i * 50));
      ctx.font = `600 31px ${BODY}`; ctx.fillStyle = COL.tinta2;
      const sub = wrap(ctx, e.sub, w - 280 - (e.price ? ctx.measureText(e.price).width + 40 : 0), 1)[0] || "";
      const yy = y + 70 + r.lines.length * 50 + 4;
      ctx.fillText(sub, x + 250, yy);
      if (e.price) {
        ctx.font = `800 28px ${BODY}`; const pw = ctx.measureText(e.price).width + 32;
        round(ctx, x + w - pw - 24, yy - 34, pw, 46, 23); ctx.fillStyle = e.free ? COL.menta : COL.amarillo; ctx.fill();
        ctx.fillStyle = COL.tinta; ctx.fillText(e.price, x + w - pw - 8, yy - 2);
      }
      y += r.h + 14;
    });
  }

  /* o = { title, title2, rangeTxt, groups:[{label, items:[{time,timeSub,title,sub,price,free}]}], footer, url, instagram } */
  async function render(o) {
    await Promise.all([loadFonts(), loadLogo()]);
    const probe = document.createElement("canvas").getContext("2d");
    const pages = layout(probe, o.groups);
    return pages.map((rows, i) => {
      const c = document.createElement("canvas"); c.width = W; c.height = H;
      const ctx = c.getContext("2d");
      background(ctx); header(ctx, o, i, pages.length); drawRows(ctx, rows); footer(ctx, o);
      return c;
    });
  }

  window.OyeStory = { render };
})();
