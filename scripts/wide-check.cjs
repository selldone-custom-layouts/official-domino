// wide-check.cjs — every page keeps its 1440 design at every desktop width, up to the owner's
// Windows zoom-out (75 / 67 / 50 / 33 % ≈ 1920 / 2150 / 2880 / 3840 CSS px). The Layout's v-main
// stops at 1720px and sits in the middle, so anything sized from the window (vw) instead of its
// own band runs wider than the page: Domino 1.0.2 squeezed the home journal's post titles to 13px
// at 2880 (the owner, 15 November 2026, on Pralino: "see what this section does when I zoom out").
//
// For every page and width:
//   SQUEEZE  an element's own words (more than 12 characters) render narrower than 60px;
//   COLUMN   a paragraph's words (more than 80 characters, no block inside) sit in a column
//            narrower than 240px;
//   BROKEN   a word of 4+ letters breaks across two lines (mid-word, not at a hyphen);
//   HSCROLL  the page scrolls sideways.
// Visually hidden words (1px boxes), layers that are closed and words outside the window
// sideways (the marquee's far copies) are skipped.
//
// Usage: node scripts/wide-check.cjs <base> [wait selector]
//   PAGES="home=/,category=/croissants-category,…"  (product pages open in-app through the router:
//          a cold /product/ load in a headless browser gets Selldone's SEO page)
//   WIDTHS=1100,1440,1920,2560,2880,3840,5120 (default)   STORAGE='{"domino-theme":"…"}'
//   SHOTS=<folder>: also a full-page JPEG of each page and width (scaled to 1400px wide; FULL=1 keeps
//          the real size), to look at.
// Prints each finding and "TOTAL n". Deliver at 0.
const fs = require("fs");
const path = require("path");
/* Playwright: PW (a path to the package), else the installed package, else the workspace's copy beside this repo */
const PW = process.env.PW || (() => { try { return require.resolve("playwright"); } catch { return require("path").resolve(__dirname, "../../kalio-marketplace/node_modules/playwright"); } })();
const { chromium } = require(PW);
const base = (process.argv[2] || "http://localhost:9140").replace(/\/$/, "");
const WAIT = process.argv[3] || ".ftr";
const PAGES = (process.env.PAGES ||
  "home=/,category=/croissants-category,deals=/?filter=%7B%22only_has_discount%22%3Atrue%7D,product=/product/720375,compare=/comparison?list=p720375_p720378_p720380,blog=/blog,article=/blog/a-guide-to-the-croissant-collection-36221,about=/about-us,contact=/contact-us,faq=/faq,terms=/terms,cart=/basket/PHYSICAL,account=/user,404=/no-such-page")
  .split(",").map((s) => s.split("="));
const WIDTHS = (process.env.WIDTHS || "1100,1440,1920,2560,2880,3840,5120").split(",").map(Number);
const SHOTS = process.env.SHOTS ? path.resolve(process.env.SHOTS) : "";
let sharp = null;
if (SHOTS) {
  try { sharp = require(process.env.SHARP || (() => { try { return require.resolve("sharp"); } catch { return require("path").resolve(__dirname, "../../kalio-marketplace/node_modules/sharp"); } })()); } catch (e) { sharp = null; }
  fs.mkdirSync(SHOTS, { recursive: true });
}

function audit() {
  const out = [];
  const seen = new Set();
  const W = innerWidth;
  const name = (el) => (el.className && typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : el.tagName.toLowerCase());
  const where = (el) => { const o = []; for (let p = el; p && o.length < 3 && p !== document.body; p = p.parentElement) o.unshift(name(p)); return o.join(" > "); };
  const shown = (el) => {
    for (let p = el; p && p !== document.documentElement; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) < 0.05) return false;
      if (p.getAttribute("aria-hidden") === "true" && p.classList.contains("mq-list")) return false;
    }
    return true;
  };
  const tiny = (r) => r.width <= 2 || r.height <= 2;
  const inWindow = (r) => r.right > 0 && r.left < W;
  const own = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").replace(/\s+/g, " ").trim();
  const add = (kind, el, msg) => { const k = kind + where(el) + msg; if (!seen.has(k)) { seen.add(k); out.push(`${kind} ${msg}  ${where(el)}`); } };

  const els = [...document.querySelectorAll("body *")].filter((e) => !/^(SCRIPT|STYLE|NOSCRIPT|SVG|PATH|TEXT|TSPAN|OPTION)$/i.test(e.tagName));
  for (const el of els) {
    const t = own(el);
    if (t.length <= 12) continue;
    const r = el.getBoundingClientRect();
    if (tiny(r) || !inWindow(r) || !shown(el)) continue;
    if (r.width < 60) add("SQUEEZE", el, `${Math.round(r.width)}px "${t.slice(0, 30)}"`);
  }
  /* COLUMN: block-level elements whose words are all inline */
  const blockish = (s) => !/^inline/.test(s.display) && s.display !== "contents" && s.display !== "none";
  for (const el of els) {
    const s = getComputedStyle(el);
    if (!blockish(s)) continue;
    if ([...el.children].some((c) => blockish(getComputedStyle(c)))) continue;
    const t = el.textContent.replace(/\s+/g, " ").trim();
    if (t.length <= 80) continue;
    const r = el.getBoundingClientRect();
    if (tiny(r) || !inWindow(r) || !shown(el)) continue;
    const cw = r.width - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
    if (cw < 240) add("COLUMN", el, `${Math.round(cw)}px "${t.slice(0, 30)}"`);
  }
  /* BROKEN: a word split over two lines */
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || /^(SCRIPT|STYLE|NOSCRIPT|TEXT|TSPAN)$/i.test(el.tagName)) continue;
    const text = n.textContent;
    if (text.trim().length < 4) continue;
    const pr = el.getBoundingClientRect();
    if (tiny(pr) || !inWindow(pr)) continue;
    if (!shown(el)) continue;
    const re = /[\p{L}\p{N}’']{4,}/gu;
    let m;
    while ((m = re.exec(text))) {
      range.setStart(n, m.index);
      range.setEnd(n, m.index + m[0].length);
      const rs = [...range.getClientRects()].filter((x) => x.width > 0.5);
      if (rs.length < 2) continue;
      const tops = new Set(rs.map((x) => Math.round(x.top / 3)));
      if (tops.size > 1) add("BROKEN", el, `"${m[0].slice(0, 24)}" over ${tops.size} lines`);
    }
  }
  const sw = document.documentElement.scrollWidth, cw = document.documentElement.clientWidth;
  if (sw > cw + 1) out.push(`HSCROLL page ${sw}px in a ${cw}px window`);
  return out;
}

const push = (pg, to) => pg.evaluate((to) => { const el = [...document.querySelectorAll("*")].find((e) => e.__vue_app__); el.__vue_app__.config.globalProperties.$router.push(to).catch(() => {}); }, to);

(async () => {
  const b = await chromium.launch();
  let total = 0;
  for (const w of WIDTHS) {
    const mob = w < 600;
    const ctx = await b.newContext({ viewport: { width: w, height: mob ? 844 : Math.round(w * 0.56) }, deviceScaleFactor: 1, isMobile: mob, hasTouch: mob });
    if (process.env.STORAGE) await ctx.addInitScript((st) => { for (const [k, v] of Object.entries(JSON.parse(st))) localStorage.setItem(k, v); }, process.env.STORAGE);
    await ctx.route(/^https:\/\/[^/]*selldone\.com\/.*\/buy\//, (r) => r.abort());
    const pg = await ctx.newPage();
    const errs = [];
    pg.on("pageerror", (e) => errs.push(e.message));
    await pg.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 180000 });
    await pg.waitForSelector(WAIT, { timeout: 180000 });
    for (const [label, to] of PAGES) {
      if (label !== "home") await push(pg, to);
      await pg.waitForTimeout(label === "home" ? 3500 : 4500);
      await pg.evaluate(async () => {
        document.querySelectorAll('img[loading="lazy"]').forEach((i) => (i.loading = "eager"));
        for (let y = 0; y < document.body.scrollHeight; y += 900) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
        window.scrollTo(0, 0);
      });
      await pg.waitForTimeout(1200);
      const found = await pg.evaluate(audit);
      for (const f of found) console.log(`${w} ${label}  ${f}`);
      total += found.length;
      if (SHOTS) {
        await pg.evaluate(() => Promise.all([...document.images].filter((i) => !i.complete).map((i) => new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 4000); }))));
        /* a very tall page at 5120 can be past what one shot holds: then the parts only */
        const buf = await pg.screenshot({ fullPage: true, timeout: 60000 }).catch((e) => (console.log(`${w} ${label}  no full-page shot: ${String(e.message).slice(0, 120)}`), null));
        const file = path.join(SHOTS, `${label}-${w}.${sharp && !process.env.FULL ? "jpg" : "png"}`);
        if (buf && sharp && !process.env.FULL) await sharp(buf, { limitInputPixels: false }).resize({ width: 1400 }).jpeg({ quality: 72 }).toFile(file);
        else if (buf) fs.writeFileSync(file, buf);
        if (buf) console.log(`${w} ${label}  shot ${file}`);
        /* PARTS=".hero,.how,…": each part's first visible match on its own, at its real size (scaled to
           1400px wide at most), to look at the photos' crops. */
        for (const sel of (process.env.PARTS || "").split(",").filter(Boolean)) {
          const el = pg.locator(sel).first();
          if (!(await el.count()) || !(await el.isVisible())) continue;
          await el.scrollIntoViewIfNeeded().catch(() => {});
          await pg.waitForTimeout(400);
          const pb = await el.screenshot().catch(() => null);
          if (!pb) continue;
          const pf = path.join(SHOTS, `${label}-${w}-${sel.replace(/[^\w-]+/g, "")}.jpg`);
          if (sharp) await sharp(pb).resize({ width: 1400, withoutEnlargement: true }).jpeg({ quality: 75 }).toFile(pf);
          else fs.writeFileSync(pf.replace(/jpg$/, "png"), pb);
        }
      }
    }
    if (errs.length) console.log(`${w} page errors: ${errs.slice(0, 3).join(" | ")}`);
    await ctx.close();
  }
  await b.close();
  console.log(`TOTAL ${total}`);
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
