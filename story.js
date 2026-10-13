/* OYE TOULOUSE — generador de imágenes para Instagram a partir de la agenda
   · story       1080 × 1920
   · publicación 1080 × 1350 (carrusel: portada + páginas de eventos)
   · evento      story de un solo evento (para que la gente lo comparta) */
(function () {
  "use strict";
  const COL = { azul: "#256eac", claro: "#7c94c0", noche: "#123a6b", amarillo: "#f8e01b", rosa: "#f66ea5", rosaHondo: "#c8336f", menta: "#afdcd7", papel: "#f6f8fc", tinta: "#0f2747", tinta2: "#4a5d7c" };
  const DISPLAY = '"Lilita One", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif';
  const BODY = '"Bricolage Grotesque", system-ui, -apple-system, "Segoe UI", sans-serif';
  const FORMATS = {
    story: { W: 1080, H: 1920, top: 230, listTop: 700, listBottom: 1500, footerY: 240, tf: 42, tl: 2, sf: 31, rowPad: 92, gap: 14, timeF: 64 },
    post:  { W: 1080, H: 1350, top: 60,  listTop: 300, listBottom: 1215, footerY: 34, tf: 36, tl: 1, sf: 27, rowPad: 70, gap: 10, timeF: 50 }
  };

  let logoImg = null, cupImg = null, grain = null;
  const loadImg = (src, cors) => new Promise(res => { const i = new Image(); if (cors) i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  async function loadAssets() {
    const fonts = (document.fonts && document.fonts.load) ? Promise.all([document.fonts.load('120px "Lilita One"'), document.fonts.load('800 40px "Bricolage Grotesque"'), document.fonts.load('600 32px "Bricolage Grotesque"')]).catch(() => { }) : null;
    if (!logoImg) logoImg = await loadImg("img/logo.png");
    if (!cupImg) cupImg = await loadImg("img/cupula-grande.png");
    await fonts;
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
    const words = String(text || "").split(/\s+/); const lines = []; let cur = "";
    for (const w of words) { const t = cur ? cur + " " + w : w; if (ctx.measureText(t).width <= maxW) cur = t; else { if (cur) lines.push(cur); cur = w; } }
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
  function fitFont(ctx, txt, maxW, size, min, family) { ctx.font = `${size}px ${family}`; while (ctx.measureText(txt).width > maxW && size > min) { size -= 4; ctx.font = `${size}px ${family}`; } return size; }
  function newCanvas(F) { const c = document.createElement("canvas"); c.width = F.W; c.height = F.H; return c; }

  function background(ctx, F, variant) {
    const { W, H } = F;
    ctx.fillStyle = COL.azul; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, H * .7); g.addColorStop(0, "rgba(124,148,192,.75)"); g.addColorStop(1, "rgba(124,148,192,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (variant !== "plain") {
      // rayas menta (el mapa)
      const r = F.H > 1500 ? 300 : 230, cy = F.H > 1500 ? 420 : 210;
      ctx.save(); ctx.beginPath(); ctx.arc(W - 40, cy, r, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = "rgba(175,220,215,.55)"; for (let y = cy - r; y < cy + r; y += 9) ctx.fillRect(W - 40 - r, y, 2 * r, 4); ctx.restore();
      // semitono rosa (la cúpula)
      const rr = F.H > 1500 ? 330 : 240;
      ctx.save(); ctx.beginPath(); ctx.arc(80, H - 120, rr, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = COL.rosa; ctx.fillRect(0, H - 120 - rr, 80 + rr, rr + 120);
      ctx.fillStyle = "rgba(200,51,111,.5)"; for (let y = H - 120 - rr; y < H; y += 14) for (let x = (Math.round(y / 14) % 2) * 7; x < 80 + rr; x += 14) { ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 7); ctx.fill(); }
      ctx.restore();
    }
    ctx.fillStyle = grainPattern(ctx); ctx.fillRect(0, 0, W, H);
  }

  function pill(ctx, text, x, y, bg, fg, size, stroke) {
    ctx.font = `800 ${size}px ${BODY}`;
    const w = ctx.measureText(text).width + size * 1.5, h = size * 1.7;
    round(ctx, x, y, w, h, h / 2); ctx.fillStyle = bg; ctx.fill();
    if (stroke) { ctx.lineWidth = 4; ctx.strokeStyle = COL.noche; ctx.stroke(); }
    ctx.fillStyle = fg; ctx.fillText(text, x + size * .75, y + h * .68);
    return w;
  }

  function footer(ctx, F, o) {
    const parts = String(o.footer || "").split(" · ").filter(Boolean);
    const lines = parts.slice(); if (o.url) lines.push(o.url);
    if (!lines.length) return;
    const size = F.H > 1500 ? 34 : 28, lh = size * 1.35;
    ctx.font = `800 ${size}px ${BODY}`;
    const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 70, h = 26 + lines.length * lh;
    const x = (F.W - w) / 2, y = F.H - F.footerY - h;
    round(ctx, x + 7, y + 7, w, h, 26); ctx.fillStyle = COL.rosa; ctx.fill();
    round(ctx, x, y, w, h, 26); ctx.fillStyle = COL.noche; ctx.fill();
    ctx.textAlign = "center";
    lines.forEach((l, i) => { ctx.fillStyle = o.url && i === lines.length - 1 ? COL.amarillo : "#fff"; ctx.fillText(l, F.W / 2, y + 13 + lh * (i + .78)); });
    ctx.textAlign = "left";
  }

  /* ---------- listas (story y páginas del carrusel) ---------- */
  function header(ctx, F, o, pageIdx, pages) {
    const post = F.H < 1500, T = F.top;
    const ls = post ? 150 : 230;
    if (logoImg) ctx.drawImage(logoImg, 50, T - (post ? 10 : 40), ls, ls);
    const tx = 50 + ls + 26;
    ctx.textBaseline = "alphabetic";
    ctx.font = `${post ? 58 : 76}px ${DISPLAY}`; shadowText(ctx, o.rangeTxt, tx, T + (post ? 52 : 70), "#fff", COL.noche, 5);
    ctx.font = `700 ${post ? 32 : 38}px ${BODY}`; ctx.fillStyle = COL.menta; ctx.fillText("@" + o.instagram, tx + 4, T + (post ? 98 : 128));
    if (pages > 1) { ctx.font = `800 ${post ? 26 : 30}px ${BODY}`; ctx.fillStyle = "#fff"; ctx.fillText(`${pageIdx + 1}/${pages}`, tx + 4, T + (post ? 138 : 175)); }
    const size = fitFont(ctx, o.title, F.W - 110, post ? 90 : 150, 60, DISPLAY);
    const ty = T + (post ? 160 : 260) + size * .55;
    shadowText(ctx, o.title, 54, ty, COL.amarillo, COL.noche, post ? 6 : 9);
    if (o.title2 && !post) { fitFont(ctx, o.title2, F.W - 120, 68, 36, DISPLAY); shadowText(ctx, o.title2, 58, ty + (post ? 62 : 82), COL.menta, COL.noche, 4); }
  }

  function layout(ctx, F, groups) {
    const rows = [];
    groups.forEach(g => {
      rows.push({ type: "day", label: g.label, h: 84 });
      g.items.forEach(e => {
        ctx.font = `800 ${F.tf}px ${BODY}`;
        const lines = wrap(ctx, e.title, F.W - 120 - 250, F.tl);
        rows.push({ type: "ev", e, lines, h: F.rowPad + lines.length * F.tf * 1.2 });
      });
    });
    const pages = [[]]; let y = F.listTop, lastDay = null;
    rows.forEach(r => {
      if (r.type === "day") lastDay = r;
      const need = r.h + (r.type === "day" ? 110 : F.gap);
      if (y + need > F.listBottom && pages[pages.length - 1].length) {
        pages.push([]); y = F.listTop;
        if (r.type === "ev" && lastDay) { pages[pages.length - 1].push(lastDay); y += lastDay.h; }
      }
      pages[pages.length - 1].push(r); y += r.h + (r.type === "ev" ? F.gap : 0);
    });
    return pages;
  }

  function drawRows(ctx, F, rows) {
    let y = F.listTop;
    const post = F.H < 1500, dayH = post ? 70 : 84, daySize = post ? 28 : 34;
    rows.forEach(r => {
      if (r.type === "day") { pill(ctx, r.label, 60, y + 8, COL.rosa, COL.tinta, daySize, true); y += dayH; return; }
      const e = r.e, x = 60, w = F.W - 120, lh = F.tf * 1.2, h = r.h;
      round(ctx, x + 7, y + 7, w, h, 24); ctx.fillStyle = COL.noche; ctx.fill();
      round(ctx, x, y, w, h, 24); ctx.fillStyle = COL.papel; ctx.fill();
      const base = y + (post ? 52 : 70);
      ctx.font = `${F.timeF}px ${DISPLAY}`; ctx.fillStyle = COL.azul; ctx.fillText(e.time, x + 28, base + (post ? 6 : 12));
      if (e.timeSub) { ctx.font = `600 ${post ? 22 : 26}px ${BODY}`; ctx.fillStyle = COL.tinta2; ctx.fillText(e.timeSub, x + 30, base + (post ? 40 : 50)); }
      ctx.fillStyle = "#d7e1ef"; ctx.fillRect(x + 222, y + 20, 4, h - 40);
      ctx.font = `800 ${F.tf}px ${BODY}`; ctx.fillStyle = COL.tinta;
      r.lines.forEach((l, i) => ctx.fillText(l, x + 250, base + i * lh));
      ctx.font = `600 ${F.sf}px ${BODY}`; ctx.fillStyle = COL.tinta2;
      ctx.font = `800 ${post ? 24 : 28}px ${BODY}`; const pw = e.price ? ctx.measureText(e.price).width + 32 : 0;
      ctx.font = `600 ${F.sf}px ${BODY}`;
      const sub = wrap(ctx, e.sub, w - 280 - (pw ? pw + 20 : 0), 1)[0] || "";
      const yy = base + (r.lines.length - 1) * lh + F.sf * 1.25;
      ctx.fillText(sub, x + 250, yy);
      if (e.price) {
        ctx.font = `800 ${post ? 24 : 28}px ${BODY}`; const ph = post ? 40 : 46;
        round(ctx, x + w - pw - 22, yy - ph * .74, pw, ph, ph / 2); ctx.fillStyle = e.free ? COL.menta : COL.amarillo; ctx.fill();
        ctx.fillStyle = COL.tinta; ctx.fillText(e.price, x + w - pw - 6, yy - ph * .74 + ph * .7);
      }
      y += h + F.gap;
    });
  }

  /* portada del carrusel */
  function cover(F, o, nEvents) {
    const c = newCanvas(F), ctx = c.getContext("2d");
    background(ctx, F, "plain");
    if (cupImg) ctx.drawImage(cupImg, F.W - 690, F.H - 690, 760, 760);
    if (logoImg) ctx.drawImage(logoImg, 56, 56, 170, 170);
    ctx.font = `700 34px ${BODY}`; ctx.fillStyle = COL.menta; ctx.fillText("@" + o.instagram, 250, 130);
    ctx.font = `800 30px ${BODY}`; ctx.fillStyle = "#fff"; ctx.fillText(o.kicker || "", 250, 178);
    let s = fitFont(ctx, o.title, F.W - 110, 170, 90, DISPLAY);
    shadowText(ctx, o.title, 54, 380 + s * .5, COL.amarillo, COL.noche, 10);
    let y = 380 + s * .5;
    if (o.title2) { const s2 = fitFont(ctx, o.title2, F.W - 120, 76, 40, DISPLAY); y += s2 * 1.25; shadowText(ctx, o.title2, 58, y, COL.menta, COL.noche, 5); }
    ctx.font = `110px ${DISPLAY}`; y += 140; shadowText(ctx, o.rangeTxt, 56, y, "#fff", COL.noche, 6);
    pill(ctx, o.countTxt, 60, y + 50, COL.rosa, COL.tinta, 38, true);
    ctx.font = `800 34px ${BODY}`; ctx.fillStyle = "#fff"; ctx.fillText(o.swipe || "→", 60, F.H - 70);
    return c;
  }

  /* o = { format, title, title2, kicker, rangeTxt, countTxt, swipe, groups:[{label, items:[{time,timeSub,title,sub,price,free}]}], footer, url, instagram } */
  async function render(o) {
    await loadAssets();
    const F = FORMATS[o.format] || FORMATS.story;
    const probe = document.createElement("canvas").getContext("2d");
    const pages = layout(probe, F, o.groups);
    const out = [];
    if (o.format === "post") out.push(cover(F, o));
    pages.forEach((rows, i) => {
      const c = newCanvas(F), ctx = c.getContext("2d");
      background(ctx, F); header(ctx, F, o, i, pages.length); drawRows(ctx, F, rows);
      footer(ctx, F, o.format === "post" ? { footer: o.url ? "" : o.footer, url: o.url } : o);
      out.push(c);
    });
    return out;
  }

  /* story de un solo evento
     ev = { title, cat, dayTxt, timeTxt, place, address, price, free, org, img, footer, url, instagram, kicker } */
  async function renderEvent(ev) {
    await loadAssets();
    const F = FORMATS.story, c = newCanvas(F), ctx = c.getContext("2d");
    background(ctx, F, "plain");
    let flyer = ev.img ? await loadImg(ev.img, true) : null;
    // cabecera
    if (logoImg) ctx.drawImage(logoImg, 50, 190, 170, 170);
    ctx.font = `700 34px ${BODY}`; ctx.fillStyle = COL.menta; ctx.fillText("@" + ev.instagram, 244, 262);
    ctx.font = `800 30px ${BODY}`; ctx.fillStyle = "#fff"; ctx.fillText(ev.kicker || "", 244, 308);
    let y = 420;
    if (flyer) {
      // flyer arriba, ocupando el ancho, con marco
      const maxW = 860, maxH = 620, r = Math.min(maxW / flyer.width, maxH / flyer.height);
      const w = flyer.width * r, h = flyer.height * r, x = (F.W - w) / 2;
      round(ctx, x + 10, y + 10, w, h, 24); ctx.fillStyle = COL.noche; ctx.fill();
      ctx.save(); round(ctx, x, y, w, h, 24); ctx.clip(); ctx.drawImage(flyer, x, y, w, h); ctx.restore();
      y += h + 70;
    } else {
      if (cupImg) ctx.drawImage(cupImg, F.W - 560, 1040, 640, 640);
      y = 520;
    }
    // categoría
    if (ev.cat) { pill(ctx, ev.cat.toUpperCase(), 60, y - 50, COL.rosa, COL.tinta, 32, true); y += 50; }
    // título
    let size = flyer ? 96 : 130; ctx.font = `${size}px ${DISPLAY}`;
    let lines = wrap(ctx, ev.title, F.W - 120, flyer ? 3 : 4);
    while (lines.some(l => ctx.measureText(l).width > F.W - 120) && size > 60) { size -= 6; ctx.font = `${size}px ${DISPLAY}`; lines = wrap(ctx, ev.title, F.W - 120, 4); }
    lines.forEach(l => { y += size * 1.0; shadowText(ctx, l, 58, y, COL.amarillo, COL.noche, 7); });
    y += 40;
    // datos
    const infoW = flyer ? F.W - 120 : 640;
    const rows = [[ev.dayTxt, "#fff", `800 54px ${BODY}`], [ev.timeTxt, COL.menta, `800 50px ${BODY}`], [ev.place, "#fff", `800 46px ${BODY}`], [ev.address, "#dfe8f5", `600 34px ${BODY}`], [ev.org, "#dfe8f5", `600 34px ${BODY}`]].filter(r => r[0]);
    rows.forEach(([txt, col, font]) => {
      ctx.font = font; ctx.fillStyle = col;
      wrap(ctx, txt, infoW, 2).forEach(l => { y += parseInt(font.match(/(\d+)px/)[1]) * 1.3; ctx.fillText(l, 60, y); });
    });
    if (ev.price) { y += 30; pill(ctx, ev.price, 60, y, ev.free ? COL.menta : COL.amarillo, COL.tinta, 34, true); }
    footer(ctx, F, { footer: ev.footer, url: ev.url });
    return c;
  }

  window.OyeStory = { render, renderEvent };
})();
