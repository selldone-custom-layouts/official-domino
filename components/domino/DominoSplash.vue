<!--
  Domino — the in-app splash (new-shop-kits/loading/IN-APP-SPLASH.md, 15 November 2026).

  Selldone removes the domain's own loading frame (scripts/loading/, set on the domain as "custom
  loading") 150 ms after the app starts, about half a second into a visit with a warm cache: too
  short to see (the owner: "the Domino animation is far too short, half a second"). The frame
  cannot ask for more time, so the Layout draws the same picture itself, over it, and keeps it
  until the page is really ready:

  - the same cocoa ground, the same fine ring with the pistachio arc turning (1.2 s a turn, picked
    up about where the frame's was), the same cupcake drawing, already fully drawn as the frame
    left it, and the shop's name exactly as the header's wordmark draws it (DominoLogo: BRAND.name
    or the shop's live title, lower case, Cormorant italic, the pistachio dot) at the frame's size;
    or, when SPLASH.logo is set, that image fitted in the frame's logo box;
  - the colours are Domino's tokens (--dm-cocoa, --dm-cocoa-ink, --dm-act-dk), so the visitor's
    palette and dark mode re-tint it; their light values are the fallbacks, so it is right before
    the stylesheet arrives (its few rules are added from here for the same reason);
  - only on the first page load of a browser session (sessionStorage "domino-splash"); moving in
    the app or reloading later never shows it;
  - it fades out (300 ms) once ALL of: the shop and the first page's data are in (the shop, the
    collections and the catalogue every page reads, no skeleton left in the page); the first photo
    in the window has decoded (or 2.5 s after it started loading); 1.2 s since the visit began (one
    turn of the ring; not with reduced motion). It always goes by 4 s, and at once if the first
    page fails to load: it never covers an error. The page renders under it all along.
  - automated browsers (navigator.webdriver: the Layout's checks) skip it, unless localStorage
    "domino-splash" is "test". A check can stub the brand with window.__dmSplash = { name, logo,
    hold } (hold: stay until removed), to try long and right-to-left names and odd logos.
-->
<template>
  <div v-if="on" :class="['dm-splash', { out }]" role="status">
    <span class="dsp-sr">{{ srText }}</span>
    <div class="dsp">
      <svg aria-hidden="true" class="dsp-mark" focusable="false" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
        <circle class="dsp-base" cx="60" cy="60" r="56" />
        <circle :style="{ animationDelay: phase }" class="dsp-arc" cx="60" cy="60" r="56" />
        <g v-if="art" class="dsp-art" transform="translate(18 14) scale(.7)" v-html="art"></g>
      </svg>
      <div :style="{ '--dsp-fs': size + 'px', '--dsp-fs-s': sizeSmall + 'px' }" aria-hidden="true" class="dsp-brand">
        <img v-if="logo" :src="logo" alt="" class="dsp-logo" />
        <span v-else-if="word" class="dsp-name" dir="auto">{{ word }}<i class="dsp-dot"></i></span>
      </div>
    </div>
  </div>
</template>

<script>
import { BRAND } from "../kalio/kalio-brand";
import { dm } from "./dm";
import { t } from "../kalio/i18n/kalio-i18n";

/** Match these to the domain's loading frame (scripts/loading/configs/domino.json). */
export const SPLASH = {
  /** the line art in the ring: "croissant", "cupcake", "tart", "whisk" or "none" */
  art: "cupcake",
  /** an https logo shown instead of the wordmark (the frame's "logo"); null draws the wordmark */
  logo: null,
};

/* The frame's drawings (scripts/loading/make-loading.cjs ART). */
const ART = {
  croissant:
    '<path d="M10 80c2-14 13-24 25-27 6-12 16-19 25-19s19 7 25 19c12 3 23 13 25 27-6 4-14 4-20-2-2 8-8 12-14 12-4 6-10 9-16 9s-12-3-16-9c-6 0-12-4-14-12-6 6-14 6-20 2z"/>' +
    '<path d="M35 53c5 8 7 18 5 28M60 34c2 12 2 31 0 47M85 53c-5 8-7 18-5 28"/><path d="M24 66c3 2 6 3 9 3M96 66c-3 2-6 3-9 3"/>',
  cupcake:
    '<path d="M32 66h56l-7 36H39z"/><path d="M46 66l2 36M60 66v36M74 66l-2 36"/>' +
    '<path d="M28 66c-7-2-8-12-1-15-3-9 6-16 14-13 1-10 13-14 20-8 7-7 20-2 20 8 9-3 17 5 13 14 7 4 5 13-2 14z"/>',
  tart:
    '<path d="M14 62c0-9 21-16 46-16s46 7 46 16-21 16-46 16-46-7-46-16z"/><path d="M14 62v9c0 9 21 16 46 16s46-7 46-16v-9"/>' +
    '<circle cx="44" cy="60" r="6"/><circle cx="60" cy="56" r="6"/><circle cx="76" cy="60" r="6"/>',
  whisk:
    '<path d="M60 16v40"/><path d="M60 56c-14 0-22 16-22 30s10 22 22 22 22-8 22-22-8-30-22-30z"/><path d="M60 56c-6 0-10 16-10 30s4 22 10 22 10-8 10-22-4-30-10-30z"/>',
};

/* The frame's own rules, with Domino's tokens (their light values as fallbacks). Added from here,
   so the splash is drawn right even before the Layout's stylesheet has arrived. */
const CSS =
  ".dm-splash{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;margin:0;background:var(--dm-cocoa,#3a2a22);color:var(--dm-cocoa-ink,#f7f1ea);font-family:\"Jost\",system-ui,sans-serif;-webkit-font-smoothing:antialiased;transition:opacity .3s ease}" +
  ".dm-splash.out{opacity:0;pointer-events:none}" +
  ".dm-splash .dsp{display:flex;flex-direction:column;align-items:center;gap:24px;padding:24px;max-width:min(88vw,560px);box-sizing:border-box;text-align:center}" +
  ".dm-splash .dsp-mark{width:120px;height:120px;display:block;flex:none}" +
  ".dm-splash .dsp-base{fill:none;stroke:rgba(247,241,234,.16);stroke:color-mix(in srgb,var(--dm-cocoa-ink,#f7f1ea) 16%,transparent);stroke-width:1.2}" +
  ".dm-splash .dsp-arc{fill:none;stroke:var(--dm-act-dk,#b9d398);stroke-width:1.6;stroke-linecap:round;stroke-dasharray:62 290;transform-origin:60px 60px;animation:dm-splash-turn 1.2s linear infinite}" +
  ".dm-splash .dsp-art{fill:none;stroke:var(--dm-cocoa-ink,#f7f1ea);stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}" +
  ".dm-splash .dsp-brand{display:flex;flex-direction:column;align-items:center;max-width:100%}" +
  ".dm-splash .dsp-logo{display:block;max-width:min(220px,70vw);max-height:72px;width:auto;height:auto;object-fit:contain}" +
  ".dm-splash .dsp-name{font:italic 600 var(--dsp-fs,42px)/1.05 \"Cormorant\",\"Cormorant Garamond\",Georgia,serif;text-transform:lowercase;letter-spacing:0;color:var(--dm-cocoa-ink,#f7f1ea);max-width:100%;overflow-wrap:anywhere}" +
  ".dm-splash .dsp-dot{display:inline-block;width:.16em;height:.16em;border-radius:50%;background:var(--dm-act-dk,#b9d398);margin-left:.06em;vertical-align:baseline}" +
  ".dm-splash .dsp-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}" +
  "@keyframes dm-splash-turn{to{transform:rotate(360deg)}}" +
  "@media (max-width:420px){.dm-splash .dsp-mark{width:92px;height:92px}.dm-splash .dsp-name{font-size:var(--dsp-fs-s,36px)}.dm-splash .dsp-logo{max-height:56px}}" +
  "@media (prefers-reduced-motion:reduce){.dm-splash .dsp-arc{animation:none}.dm-splash{transition:none}}";
/* The frame's own font request (already in the browser's cache from the frame), so the name is
   not drawn in a stand-in face first. */
const FONTS = "https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@1,600&family=Jost:wght@500&display=swap";

const KEY = "domino-splash";
const MIN_MS = 1200; // one turn of the ring and the drawing seen once
const PHOTO_MS = 2500; // a slow photo does not hold the page
const CAP_MS = 4000; // always gone by then
const now = () => (window.performance ? performance.now() : 0);
const reduced = () => !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

function firstVisit() {
  const stub = window.__dmSplash;
  try {
    const flag = localStorage.getItem(KEY);
    if (navigator.webdriver && flag !== "test" && !stub) return false;
    if (sessionStorage.getItem(KEY) && !stub) return false;
    sessionStorage.setItem(KEY, "1");
  } catch (e) {
    if (navigator.webdriver) return false;
  }
  return true;
}

export default {
  name: "DominoSplash",
  data() {
    const on = firstVisit() && now() < CAP_MS;
    return { on, out: false, photoAt: 0, photoOk: false, failed: false, timers: [] };
  },
  computed: {
    stub() {
      return window.__dmSplash || null;
    },
    shop() {
      return this.$store?.getters?.getShop || window.shop || null;
    },
    /** the header's wordmark (DominoLogo): BRAND.name or the shop's title, in lower case */
    word() {
      const w = this.stub?.name ?? BRAND.name ?? this.shop?.title ?? "";
      return String(w || "").trim().toLowerCase();
    },
    logo() {
      return this.stub?.logo || SPLASH.logo || null;
    },
    /** the frame's size: 42px for a short name, smaller as it grows (make-loading.cjs) */
    size() {
      const n = Math.max(1, Array.from(this.word).length);
      return Math.max(22, Math.min(42, Math.round(420 / n + 8)));
    },
    sizeSmall() {
      return Math.max(20, Math.round(this.size * 0.86));
    },
    art() {
      return ART[SPLASH.art] || "";
    },
    phase() {
      return `-${Math.round(now() % 1200)}ms`;
    },
    srText() {
      const name = this.shop?.title || this.word;
      return name ? t("domino.splash.loading", "Loading {shop}", { shop: name }) : t("domino.splash.loadingShop", "Loading the shop");
    },
  },
  created() {
    if (!this.on) return;
    if (!document.getElementById("dm-splash-css")) {
      const st = document.createElement("style");
      st.id = "dm-splash-css";
      st.textContent = CSS;
      document.head.appendChild(st);
      const ln = document.createElement("link");
      ln.rel = "stylesheet";
      ln.href = FONTS;
      document.head.appendChild(ln);
    }
  },
  mounted() {
    if (!this.on) return;
    if (this.stub?.hold) return;
    /* never over an error */
    this.$router?.onError?.(() => this.hide(true));
    this.onPreload = () => this.hide(true);
    window.addEventListener("vite:preloadError", this.onPreload);
    this.timers.push(setTimeout(() => this.hide(), Math.max(0, CAP_MS - now())));
    this.poll = setInterval(() => this.check(), 100);
  },
  beforeUnmount() {
    this.stop();
  },
  methods: {
    stop() {
      clearInterval(this.poll);
      this.timers.forEach(clearTimeout);
      if (this.onPreload) window.removeEventListener("vite:preloadError", this.onPreload);
    },
    /** the shop and the first page's data are in */
    dataIn() {
      if (!this.$store?.getters?.getShop) return false;
      const main = document.querySelector(".v-main");
      if (!main) {
        /* a page without v-main (a private shop's check): ready once the app has drawn */
        return !!document.querySelector(".v-application") && now() > 1500;
      }
      if (!dm.ready || !dm.catsReady) return false;
      if (!main.firstElementChild || (main.innerText || "").trim().length < 40) return false;
      const skel = main.querySelector(".dm-skel, .dm-pd-skel, .dm-bc-skel, .dm-sk-l, .sk-l, .v-skeleton-loader");
      return !(skel && skel.getClientRects().length);
    },
    /** the first photo in the window has decoded (or has had 2.5 s) */
    photoIn() {
      if (this.photoOk) return true;
      if (this.photoAt) return now() - this.photoAt > PHOTO_MS;
      const img = [...document.querySelectorAll(".v-main img")].find((i) => {
        const r = i.getBoundingClientRect();
        return r.width >= 160 && r.height >= 120 && r.top < innerHeight && r.bottom > 0;
      });
      if (!img) return true;
      this.photoAt = now();
      const done = () => (this.photoOk = true);
      if (img.complete && img.naturalWidth) img.decode?.().then(done, done) || done();
      else img.decode ? img.decode().then(done, done) : img.addEventListener("load", done, { once: true });
      return false;
    },
    check() {
      if (this.out) return;
      if (!this.dataIn()) return;
      if (!this.photoIn()) return;
      if (!reduced() && now() < MIN_MS) return;
      this.hide();
    },
    hide(now_ = false) {
      if (this.out || !this.on) return;
      this.stop();
      this.out = true;
      this.timers = [setTimeout(() => (this.on = false), now_ || reduced() ? 0 : 320)];
    },
  },
};
</script>
