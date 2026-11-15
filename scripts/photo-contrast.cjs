// photo-contrast.cjs — words that sit on a photo keep AA contrast (contrast-audit reads the CSS
// grounds and cannot see a photo under the words).
//
// For each element in WORDS that is visible on the page: hide the words (their colour, shadow and
// the background of the element itself are made transparent), shoot the box they sat in, and compare
// the words' colour with the photo (and its scrim) under them. The ground is taken at its 95th
// percentile toward the words' colour's opposite (the worst 5% of pixels are ignored: a speck of
// light in a dark photo is not a reading problem). Large words (24px+, or 18.66px+ bold) need 3:1,
// the rest 4.5:1.
//
// Usage: node scripts/photo-contrast.cjs <base> [wait selector]
//   PAGES="home=/,…" (default: home)   WIDTHS=1440,390,1100,2880 (default)   STORAGE='{…}' (theme)
//   WORDS=".hero-words a,…" (default: every Domino word over a photo slot or a collection photo)
// Prints each word with its ratio, the failures as "LOW", and "TOTAL n" (the failures). Deliver at 0.
/* Playwright: PW (a path to the package), else the installed package, else the workspace's copy beside this repo */
const PW = process.env.PW || (() => { try { return require.resolve("playwright"); } catch { return require("path").resolve(__dirname, "../../kalio-marketplace/node_modules/playwright"); } })();
const path = require("path");
const { chromium } = require(PW);
/* sharp: SHARP (a path to the package), else the installed package, else the workspace's copy beside this repo */
const sharp = require(process.env.SHARP || (() => { try { return require.resolve("sharp"); } catch { return require("path").resolve(__dirname, "../../kalio-marketplace/node_modules/sharp"); } })());
const base = (process.argv[2] || "http://localhost:9140").replace(/\/$/, "");
const WAIT = process.argv[3] || ".ftr";
const PAGES = (process.env.PAGES || "home=/").split(",").map((s) => s.split("="));
const WIDTHS = (process.env.WIDTHS || "1440,390,1100,2880").split(",").map(Number);
/* the words that sit right on a photo (the gallery's labels and frame, the cards' chips have their own ground) */
const WORDS = process.env.WORDS || ".hero-words a,.offer-tx .offer-e,.offer-tx h3,.offer-tx p,.j-word";

const lum = (r, g, b) => {
  const c = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const push = (pg, to) => pg.evaluate((to) => { const el = [...document.querySelectorAll("*")].find((e) => e.__vue_app__); el.__vue_app__.config.globalProperties.$router.push(to).catch(() => {}); }, to);

(async () => {
  const b = await chromium.launch();
  let fails = 0;
  for (const w of WIDTHS) {
    const mob = w < 600;
    const ctx = await b.newContext({ viewport: { width: w, height: mob ? 844 : Math.round(w * 0.56) }, deviceScaleFactor: 1, isMobile: mob, hasTouch: mob });
    if (process.env.STORAGE) await ctx.addInitScript((st) => { for (const [k, v] of Object.entries(JSON.parse(st))) localStorage.setItem(k, v); }, process.env.STORAGE);
    await ctx.route(/^https:\/\/[^/]*selldone\.com\/.*\/buy\//, (r) => r.abort());
    const pg = await ctx.newPage();
    await pg.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 180000 });
    await pg.waitForSelector(WAIT, { timeout: 180000 });
    for (const [label, to] of PAGES) {
      if (label !== "home") await push(pg, to);
      await pg.waitForTimeout(4000);
      await pg.evaluate(async () => {
        document.querySelectorAll('img[loading="lazy"]').forEach((i) => (i.loading = "eager"));
        for (let y = 0; y < document.body.scrollHeight; y += 900) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
        window.scrollTo(0, 0);
        await Promise.all([...document.images].filter((i) => !i.complete).map((i) => new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 5000); })));
      });
      /* No animation or transition under the shot (the marquee, a hover zoom). */
      await pg.addStyleTag({ content: "*,*::before,*::after{animation-play-state:paused!important;transition:none!important}" });
      const n = await pg.evaluate((sel) => document.querySelectorAll(sel).length, WORDS);
      for (let i = 0; i < n; i++) {
        const info = await pg.evaluate(([sel, i]) => {
          const el = document.querySelectorAll(sel)[i];
          const r0 = el.getBoundingClientRect();
          const s = getComputedStyle(el);
          if (r0.width < 2 || r0.height < 2 || s.visibility === "hidden" || s.display === "none") return null;
          /* only words over a photo (an <img> in the same slot) */
          const slot = el.closest(".ph, .gt, .cc-ph, .tri.photo");
          const img = slot && slot.querySelector(":scope > img, :scope > .ph-img");
          if (!img || !img.naturalWidth) return null;
          el.scrollIntoView({ block: "center" });
          const r = el.getBoundingClientRect();
          const big = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.66 && Number(s.fontWeight) >= 700);
          const m = s.color.match(/[\d.]+/g).map(Number);
          el.dataset.pcHide = "1";
          return { x: Math.max(0, r.left), y: Math.max(0, r.top), w: Math.min(r.width, innerWidth - Math.max(0, r.left)), h: Math.min(r.height, innerHeight - Math.max(0, r.top)), big, color: m.slice(0, 3), text: (el.textContent || "").trim().slice(0, 24), cls: (el.className && el.className.baseVal === undefined ? el.className : el.tagName).toString().split(" ")[0] };
        }, [WORDS, i]);
        if (!info || info.w < 2 || info.h < 2) continue;
        const style = await pg.addStyleTag({ content: "[data-pc-hide],[data-pc-hide] *{color:transparent!important;text-shadow:none!important;-webkit-text-stroke:0!important}[data-pc-hide] svg,[data-pc-hide] .i{visibility:hidden!important}" });
        await pg.waitForTimeout(60);
        const shot = await pg.screenshot({ clip: { x: info.x, y: info.y, width: info.w, height: info.h } });
        await pg.evaluate(() => document.querySelectorAll("[data-pc-hide]").forEach((e) => delete e.dataset.pcHide));
        await style.evaluate((n) => n.remove());
        const { data, info: im } = await sharp(shot).raw().toBuffer({ resolveWithObject: true });
        const L = [];
        for (let p = 0; p < data.length; p += im.channels) L.push(lum(data[p], data[p + 1], data[p + 2]));
        L.sort((a, b) => a - b);
        const tl = lum(...info.color);
        /* the worst 5%: the brightest pixels for light words, the darkest for dark words */
        const ground = tl > 0.4 ? L[Math.floor(L.length * 0.95)] : L[Math.floor(L.length * 0.05)];
        const cr = ratio(tl, ground);
        const need = info.big ? 3 : 4.5;
        const ok = cr >= need;
        if (!ok) fails++;
        console.log(`${ok ? "ok " : "LOW"} ${w} ${label}  ${cr.toFixed(2)}:1 (needs ${need})  ${info.cls} "${info.text}"`);
      }
    }
    await ctx.close();
  }
  await b.close();
  console.log(`TOTAL ${fails}`);
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
