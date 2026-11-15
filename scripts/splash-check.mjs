// splash-check.mjs — the in-app splash (components/domino/DominoSplash.vue), on the BUILT bundle loaded the
// way Selldone loads it: the shop's real storefront HTML, with its domain loading frame, the loader pointed at
// this folder's dist/app (the same local server as domino-prod-check.mjs).
// (new-shop-kits/loading/IN-APP-SPLASH.md "Checks", 15 November 2026)
//
//   1. hand-over, at 1440 and 390: a shot every ~100 ms from the start of the visit while the frame and the
//      splash are up; the splash is there before the frame goes, and is gone by 4.3 s (4 s cap + the fade);
//   2. the next load in the same session: no splash;
//   3. other brands (the brand stubbed, the splash held): a very long name, an Arabic name, a wide and a tall
//      logo, at 1440 and 390: the brand stays in the window, clear of the ring (8px), the logo loads, the name
//      wraps to two lines at most;
//   4. the name on its ground at 4.5:1 or more: every palette, light and dark, and Custom #ffff00 / #111111;
//   5. slow 3G (CDP): the splash is never up past 4.3 s;
//   page errors: none.
// Usage: node --use-system-ca scripts/splash-check.mjs [dist/app] [shots folder]   (after the production build)
// Prints the findings and "TOTAL n". Nothing is ordered (no bag).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const APP = path.resolve(process.argv[2] || "dist/app");
const OUT = path.resolve(process.argv[3] || "docs/dev-shots/splash");
const SHOP = (process.env.SHOP_URL || "https://domino.selldone.shop").replace(/\/$/, "");
const PORT = Number(process.env.PORT || 9147);
const BASE = `http://localhost:${PORT}`;
const PW = process.env.PW || "H:/Selldone Projects/Kalio Sample Shop Claude/kalio-marketplace/node_modules/playwright/index.js";
const MIME = { ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2", ".json": "application/json" };
fs.mkdirSync(OUT, { recursive: true });
if (!fs.existsSync(path.join(APP, "shop.js"))) {
  console.error(`no ${path.join(APP, "shop.js")}: build first`);
  process.exit(2);
}
let html = await (await fetch(`${SHOP}/?splash-check=${Date.now()}`, { headers: { Accept: "text/html" } })).text();
const before = html;
html = html
  .replace(/https?:\\\/\\\/[^"]*?\\\/layouts\\\/\d+\\\/releases\\\/[0-9A-Za-z]{26}\\\/app\\\/shop\.(js|css)/g, (_m, ext) => `http:\\/\\/localhost:${PORT}\\/__domino\\/app\\/shop.${ext}`)
  .replace(/"assetBases":\[/, `"assetBases":["http:\\/\\/localhost:${PORT}\\/__domino\\/",`)
  .replace(/"local":false/, '"local":true');
if (html === before) {
  console.error(`${SHOP} has no private Layout release in its loader`);
  process.exit(2);
}
const hasFrame = html.includes("first_loading_view");
const STUB = {
  "wide.svg": '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="120" viewBox="0 0 640 120"><rect width="640" height="120" rx="8" fill="#a0522d"/><circle cx="60" cy="60" r="40" fill="#fff"/></svg>',
  "tall.svg": '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="320" viewBox="0 0 120 320"><rect width="120" height="320" rx="8" fill="#2f6f4f"/><circle cx="60" cy="60" r="40" fill="#fff"/></svg>',
};
const server = http
  .createServer((req, res) => {
    const url = new URL(req.url, BASE);
    if (url.pathname.startsWith("/__stub/")) {
      const k = url.pathname.slice(8);
      res.writeHead(STUB[k] ? 200 : 404, { "content-type": "image/svg+xml" });
      return res.end(STUB[k] || "");
    }
    if (url.pathname.startsWith("/__domino/app/")) {
      const file = path.join(APP, decodeURIComponent(url.pathname.slice("/__domino/app/".length)));
      if (!file.startsWith(APP) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404);
        return res.end();
      }
      res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream", "access-control-allow-origin": "*", "cache-control": "no-store" });
      return fs.createReadStream(file).pipe(res);
    }
    if (/\.[a-z0-9]{2,5}$/i.test(url.pathname)) {
      res.writeHead(404);
      return res.end();
    }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    res.end(html);
  })
  .listen(PORT);

const pw = await import("file:///" + PW.replace(/\\/g, "/"));
const chromium = pw.chromium || pw.default?.chromium;
const sharp = (await import("file:///" + path.join(path.dirname(PW), "..", "sharp", "dist", "index.mjs").replace(/\\/g, "/")).catch(() => null))?.default || null;
const browser = await chromium.launch();
let total = 0;
const bad = (msg) => { total++; console.log("FAIL " + msg); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errs = [];
const VIEWS = [[1440, 900], [390, 844]];
const ctxFor = async (w, h, init) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: w < 600, hasTouch: w < 600 });
  await ctx.addInitScript(init.fn, init.arg);
  await ctx.route((u) => !/localhost/.test(u.host) && /\/buy\//.test(u.pathname), (r) => r.abort());
  return ctx;
};
const state = (page) =>
  page.evaluate(() => {
    const s = document.querySelector(".dm-splash");
    return { t: Math.round(performance.now()), frame: !!document.getElementById("first_loading_view"), splash: s ? (s.classList.contains("out") ? "fading" : "on") : "none", app: !!document.querySelector(".v-main") };
  }).catch(() => null);

/* 1 + 2: hand-over, then the next load */
for (const [w, h] of VIEWS) {
  const ctx = await ctxFor(w, h, { fn: () => { try { localStorage.setItem("domino-splash", "test"); } catch (e) {} }, arg: null });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errs.push(`${w}: ${String(e).slice(0, 200)}`));
  const shots = [];
  const states = [];
  const nav = page.goto(`${BASE}/`, { waitUntil: "commit", timeout: 120000 });
  await nav;
  const t0 = Date.now();
  while (Date.now() - t0 < 6000) {
    const st = await state(page);
    if (st) states.push(st);
    if (st && (st.frame || st.splash !== "none") && shots.length < 40) shots.push({ t: st.t, buf: await page.screenshot({ timeout: 3000 }).catch(() => null), st });
    if (st && !st.frame && st.splash === "none" && st.app && states.some((x) => x.splash !== "none")) break;
    await sleep(60);
  }
  const seen = states.filter((s) => s.splash !== "none");
  const lastOn = seen.length ? seen[seen.length - 1].t : 0;
  const frameGone = states.find((s, i) => i > 0 && !s.frame && states[i - 1].frame);
  const gap = states.filter((s) => !s.frame && s.splash === "none" && !s.app);
  console.log(`${w} hand-over: frame ${hasFrame ? "in the HTML" : "NOT in the HTML"}; splash seen ${seen.length ? seen[0].t + "–" + lastOn + " ms" : "never"}; frame removed ~${frameGone ? frameGone.t : "?"} ms; ${shots.length} shots`);
  if (!seen.length) bad(`${w}: the splash never showed`);
  if (lastOn > 4300) bad(`${w}: the splash was still up at ${lastOn} ms (cap 4 s + fade)`);
  if (gap.length) bad(`${w}: ${gap.length} moments with neither the frame, the splash nor the page (first at ${gap[0].t} ms)`);
  if (frameGone && !states.some((s) => s.t <= frameGone.t && s.splash === "on") && seen.length) {
    const firstOn = seen[0].t;
    if (firstOn > frameGone.t + 20) bad(`${w}: the splash came ${firstOn - frameGone.t} ms after the frame left`);
  }
  if (sharp && shots.length) {
    const good = shots.filter((s) => s.buf);
    const tw = 288, th = Math.round((tw * h) / w);
    const cols = 6, rows = Math.ceil(good.length / cols);
    const tiles = await Promise.all(good.map((s) => sharp(s.buf).resize(tw, th).jpeg().toBuffer()));
    const comp = tiles.map((b, i) => ({ input: b, left: (i % cols) * (tw + 6), top: Math.floor(i / cols) * (th + 20) + 16 }));
    const labels = good.map((s, i) => `<text x="${(i % cols) * (tw + 6) + 4}" y="${Math.floor(i / cols) * (th + 20) + 12}" font-size="12" font-family="sans-serif">${s.t}ms ${s.st.frame ? "frame" : ""} ${s.st.splash}</text>`).join("");
    const W = cols * (tw + 6), H = rows * (th + 20) + 16;
    await sharp({ create: { width: W, height: H, channels: 3, background: "#fff" } })
      .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${labels}</svg>`), left: 0, top: 0 }, ...comp])
      .jpeg({ quality: 78 })
      .toFile(path.join(OUT, `handover-${w}.jpg`));
  }
  /* 2: the next load in the same session */
  await page.waitForSelector(".ftr", { timeout: 60000 }).catch(() => {});
  await page.reload({ waitUntil: "commit" });
  let again = false;
  const t1 = Date.now();
  while (Date.now() - t1 < 6000) {
    const st = await state(page);
    if (st && st.splash !== "none") again = true;
    if (st && st.app && Date.now() - t1 > 2500) break;
    await sleep(80);
  }
  console.log(`${w} second load: ${again ? "SPLASH" : "no splash"}`);
  if (again) bad(`${w}: the splash showed again on the second load of the session`);
  await ctx.close();
}

/* 3: other brands, held */
const BRANDS = [
  ["own", {}],
  ["long", { name: "Maison Pâtisserie du Marais Saint-Germain" }],
  ["arabic", { name: "حلويات الشام الدمشقية" }],
  ["wide-logo", { logo: `${BASE}/__stub/wide.svg` }],
  ["tall-logo", { logo: `${BASE}/__stub/tall.svg` }],
];
for (const [w, h] of VIEWS) {
  for (const [key, stub] of BRANDS) {
    const ctx = await ctxFor(w, h, { fn: (s) => { window.__dmSplash = Object.assign({ hold: true }, s); }, arg: stub });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errs.push(`${w} ${key}: ${String(e).slice(0, 200)}`));
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForSelector(".dm-splash .dsp-brand", { timeout: 60000 }).catch(() => {});
    await page.waitForFunction(() => !document.getElementById("first_loading_view"), null, { timeout: 30000 }).catch(() => {});
    await sleep(900);
    const r = await page.evaluate(() => {
      const box = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
      const name = document.querySelector(".dm-splash .dsp-name");
      const img = document.querySelector(".dm-splash .dsp-logo");
      const lines = name ? Math.round(name.getBoundingClientRect().height / parseFloat(getComputedStyle(name).lineHeight)) : 0;
      return { mark: box(".dm-splash .dsp-mark"), brand: box(".dm-splash .dsp-brand"), vw: innerWidth, vh: innerHeight, lines, logoOk: !img || (img.complete && img.naturalWidth > 0), name: name?.textContent || "" };
    });
    const msg = [];
    if (!r.brand || !r.mark) msg.push("no splash");
    else {
      if (r.brand.l < 0 || r.brand.r > r.vw || r.brand.b > r.vh) msg.push("the brand leaves the window");
      if (r.brand.t < r.mark.b + 8) msg.push("the brand touches the ring");
      if (!r.logoOk) msg.push("the logo did not load");
      if (r.lines > 2) msg.push(`${r.lines} lines`);
    }
    console.log(`${w} ${key.padEnd(9)} ${msg.length ? msg.join("; ") : "ok"}  (lines ${r.lines}${r.name ? ', "' + r.name.slice(0, 30) + '"' : ""})`);
    for (const m of msg) bad(`${w} ${key}: ${m}`);
    await page.screenshot({ path: path.join(OUT, `brand-${key}-${w}.png`) });
    await ctx.close();
  }
}

/* 4: the name on its ground, every theme */
const THEMES = [];
for (const p of ["pistachio", "cherry", "caramel", "blueberry"]) for (const m of ["light", "dark"]) THEMES.push({ palette: p, mode: m });
for (const c of ["#ffff00", "#111111"]) for (const m of ["light", "dark"]) THEMES.push({ palette: "custom", custom: c, mode: m });
{
  const lum = (rgb) => { const c = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  for (const th of THEMES) {
    const ctx = await ctxFor(1440, 900, { fn: (t) => { window.__dmSplash = { hold: true }; try { localStorage.setItem("domino-theme", JSON.stringify(t)); } catch (e) {} }, arg: th });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForSelector(".dm-splash .dsp-name", { timeout: 60000 }).catch(() => {});
    await page.waitForSelector(".ftr", { timeout: 60000 }).catch(() => {}); /* the Layout's stylesheet and the palette are in */
    await sleep(600);
    const c = await page.evaluate(() => {
      const n = document.querySelector(".dm-splash .dsp-name"), g = document.querySelector(".dm-splash");
      const p = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      return n && g ? { ink: p(getComputedStyle(n).color), bg: p(getComputedStyle(g).backgroundColor), dark: document.documentElement.classList.contains("dm-dark") } : null;
    });
    if (!c) { bad(`contrast ${JSON.stringify(th)}: no splash`); await ctx.close(); continue; }
    const a = lum(c.ink), b2 = lum(c.bg);
    const ratio = (Math.max(a, b2) + 0.05) / (Math.min(a, b2) + 0.05);
    const ok = ratio >= 4.5;
    console.log(`contrast ${th.palette}${th.custom ? " " + th.custom : ""} ${th.mode}${c.dark ? " (dark on)" : ""}: ${ratio.toFixed(2)}:1 ${ok ? "ok" : "LOW"}`);
    if (!ok) bad(`contrast ${JSON.stringify(th)} ${ratio.toFixed(2)}`);
    await ctx.close();
  }
}

/* 5: slow 3G */
{
  const ctx = await ctxFor(1440, 900, { fn: () => { try { localStorage.setItem("domino-splash", "test"); } catch (e) {} }, arg: null });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: (500 * 1024) / 8, uploadThroughput: (500 * 1024) / 8 });
  page.on("pageerror", (e) => errs.push(`slow3g: ${String(e).slice(0, 200)}`));
  await page.goto(`${BASE}/`, { waitUntil: "commit", timeout: 180000 });
  let late = 0, seen = 0;
  const t0 = Date.now();
  while (Date.now() - t0 < 90000) {
    const st = await state(page);
    if (st && st.splash !== "none") { seen++; if (st.t > 4300) late = st.t; }
    if (st && st.app && st.t > 6000) break;
    await sleep(150);
  }
  console.log(`slow 3G: splash ${seen ? "seen" : "not seen (the app started after the 4 s cap)"}${late ? `, STILL UP at ${late} ms` : ""}`);
  if (late) bad(`slow 3G: the splash was up at ${late} ms`);
  await ctx.close();
}

for (const e of errs) bad(`page error ${e}`);
await browser.close();
server.close();
console.log(`TOTAL ${total}`);
process.exit(total ? 1 : 0);
