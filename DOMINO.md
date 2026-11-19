# Domino Cocoa Patisserie — Selldone Layout

**Domino Cocoa Patisserie** (package `domino-cocoa-patisserie`, first version `1.0.0`) is a Layout of
the Selldone shop **Bakio** (shop 15740, xapi name `bakio`, `https://bakio.myselldone.com`): one
pâtisserie selling individual pastries for courier delivery, worldwide shipping and pickup, cash on
delivery, guest checkout. Single seller, English only, USD only. It is built for
**domino.selldone.shop** only; Bakio's shop default (Layout 36, Bakini Noir) and domain 1247 are never
touched by this Layout.

The design is mockup set **B, "Cocoa & Pistachio"** (`../domino-design/`: `home-b.html` and `src/`,
the inner pages as `<page>-b.html`, the photo prompts in `CODEX-PROMPTS.md`; build brief
`BUILD-DOMINO.md`): a cream ground, cocoa ink and a cocoa header, a pistachio accent, rounded photos and
pill buttons, Cormorant over Jost; light by default, dark through the footer's Theme row.

It started from Bakini Noir 1.0.5 (`bakini-layout`, `git clone`, history kept), so every Selldone flow
of that Layout is kept (bag drawer, checkout, address/map sheet, payment, order, account, sign-in,
journal, compare, i18n `t()` with Arabic right to left, the region pill, the theme switcher row,
fit-in-circle, the release scripts and the live checks).

## Phase 1 — setup, shell and home (13 November 2026)

| Area | What is set |
| --- | --- |
| Repo | `domino-layout`, branch `domino`; remotes `bakini` (the local Bakini repo, push disabled), `upstream` (selldone/storefront, push disabled) and `origin` (`selldone-custom-layouts/official-domino`, not pushed yet). `modules/` (the six Selldone modules with `patches/*.patch` applied) and `node_modules/` copied from Bakini (same `package.json` and lock); `/modules/` and `/dist.zip` are ignored |
| Names | `manifest.json`: `domino-cocoa-patisserie`, "Domino Cocoa Patisserie", `1.0.0`; `selldone-layout.json`; `package.json` repository `official-domino` |
| Dev server | port **9140**, shop `bakio`, home = shop page (`.env`); `npm run serve` in this folder (launch entry `domino-layout` in `../.claude/launch.json`) |
| Tokens | `style/domino-theme.scss`: the mockup's B tokens with a `--dm-` prefix. `:root` = light (cream, cocoa, pistachio), `html.dm-dark` = the cocoa night. Everything that follows the palette (check marks, the bag's count, the header's hover, the wordmark's dot) reads `--dm-act*` |
| Mockup CSS | `scripts/domino-css.cjs` turns `domino-design/src/{domino,b}.css` into `style/domino/*.css` (generated, never edited): every rule scoped to Domino's markup (`:is(.dm, .dm *)`, a bare element rule `:where()`), variables `--dm-`, `[data-mode=dark]` → `html.dm-dark`, `body` → the `.dm` root, the mockup's theme band `.ts-*` → `.dts-*` (the kit's row owns `.ts-*`), keyframes `dm-*`. The Layout's own touches are `style/domino-layout.scss` |
| Theme | `components/domino/domino-theme.ts` (config) and `domino-theme.settings.ts` (the one file a merchant edits): Pistachio (the brand, the mockup's hand-set values), Cherry, Caramel, Blueberry (built by `paletteFromColor` with the mockup's surfaces, as its `palVars` does) + Custom + Light/Dark; light by default; storage key `domino-theme`; dark class `dm-dark`; Bakio 15740 in `showcaseShops`. The switcher also writes the inherited `--bk-act*` names, so Vuetify's `--v-theme-primary` (kalio-tokens.scss) and the pages not yet ported follow the palette |
| Type | Cormorant + Jost from JS (`components/kalio/kalio-fonts.ts`); Instrument Serif and Manrope are no longer loaded |
| Shell | `components/domino/shell/`: `DominoHeader.vue` (top bar with the counter's days and hours, the way to pay, "Pickup at <street>", the language & currency pill `EN · USD`, phone and email; the sticky cocoa bar with Shop ⌄ (each collection with its best seller and its lowest price), Deals, Journal, About, Contact, the centred wordmark, search with live suggestions, the account, the bag with its count, "Order now"; the phone menu with "Show N more" past 8 collections and the "Language & currency" row and sheet), `DominoBagDrawer.vue`, `DominoFooter.vue` (texture slot, the line, address, contact, the kit's Theme row, the legal row) |
| Home | `components/domino/DominoHome.vue`: every section of `home-b.html` from live data (hero, counters on the cocoa band, About, the four collections people order most, how ordering works, counters + offer + the ways to receive it, the gallery, today's selection with the add box, the photo band, the marquee, the journal) |
| Wordmark | `components/domino/DominoLogo.vue`: the shop's live title in lower case, Cormorant italic, a dot in the palette's light shade; a long title steps down in size |
| Shared state | `components/domino/dm.ts` (the collections and the catalogue read once, the layers, the shop's facts): one layer state for every page |
| Removed | the Noir header, footer, logo, home and carousel, Bakini's theme config, and `assets/bakini/` (the collection photos moved to `assets/domino/`) |

**Photo slots.** `components/domino/dm-photos.ts` lists the files in `assets/domino/` at build time
(`import.meta.glob`): the eight Domino slots by name (`domino-hero-back`, `domino-hero-inset`,
`domino-about`, `domino-how`, `domino-offer`, `domino-parallax`, `domino-journal`, `domino-footer`) and
one portrait photo per collection, `hero-<collection name>.webp` (the six shared with Noir).
`DmPhoto.vue` shows a slot's photo when its file exists; otherwise its designed fallback, never a
caption, file name or size:

| Slot | Fallback |
| --- | --- |
| `domino-hero-back` (deep, collection names over it) | the deep cocoa surface with the mockup's cake drawing |
| `domino-hero-inset` | the most-ordered collection's second best seller as a cut-out on the cream surface |
| `domino-about` | five pieces, one per collection, spread across the surface |
| `domino-how` | the cream surface with the tart drawing |
| `domino-offer` (deep, words at the foot) | the piece with the biggest saving, in the upper middle |
| `domino-parallax` (deep band) | the best seller of each collection in a row |
| `domino-journal` (deep, "Journal" over it) | the deep surface with the whisk drawing |
| `domino-footer` | the mockup's fine dot texture on the dark footer |
| a collection photo | its three best sellers on a plate |

Since 1.0.3 all fourteen files are Bakio's Magnific photos (phase 4). To change one: put
`assets/domino/<slot>.webp` with exactly these names and sizes, build and upload a new version. Keep the
file count low: the upload limit is about 360 files (1.0.3: 281).

**Reversible choices made in phase 1.**

- The counters band shows collections, the saving, the counter's days and hours and the ways to
  receive an order, not the mockup's "60 pieces on the counter": the owner's rule says no product count
  in customer text. For the same reason the Shop menu shows each collection's lowest price ("From
  $2.81") instead of "10 pieces".
- The home's About lines are written from the shop's own facts (address, collections, ways, payment),
  so they carry no "Sample text" tag; the About page itself keeps its sample label.
- The About section's links: Delivery and Payment jump to the home's own "ways" and "how" sections,
  Pickup opens Contact (the mockup's delivery and payment pages are checkout sheets, not pages).
- "Shop ⌄" opens on a click only (the owner's rule: a click opens, a second click closes); the
  mockup's hover-open is left out.
- Today's selection is the best sellers mixed across collections (in stock), so a row never shows
  one kind only.
- The language & currency pill sits in the top bar's right end (the mockup set's later shell puts it
  there); with one language and one currency it still reads "EN · USD".

**Dev screenshots.** `node --use-system-ca scripts/dev-shots.cjs http://localhost:9140/
docs/dev-shots 1440,390 light,dark` (one browser at a time, `/buy/` blocked; `OVERLAYS="menu,drawer"`
also shoots the layers). The PNGs stay out of git (`.gitignore`).

## Phase 2 — every page (14 November 2026)

Every page is the mockup's `<page>-b.html` with live data; the Noir components, styles and generator
are gone (`components/bakini/noir/`, `style/noir/`, `style/bakini-noir*.scss`, `scripts/noir-css.cjs`).
`scripts/domino-css.cjs` now also turns `domino-design/src/pages.css` into `style/domino/pages.css`.

| Page | Where |
| --- | --- |
| Shared | `components/domino/ui/` (DmPt title band, DmEmpty, DmModal, DmCard, DmQuickView, DmIcLine, DmNumeral, DmSampleTag, DmMark) |
| Category, search, deals | `components/domino/shop/DmListing.vue` (in `pages/products/StorefrontPageProducts.vue`) |
| Product | `components/domino/product/` (overview, add box, tabs, buy together), `pages/product/` |
| Compare | `components/domino/compare/DmCompare.vue` |
| Bag, checkout, delivery sheet | `pages/basket/cart/` (Selldone's script, Domino's markup) with `components/domino/buy/dm-cart.ts` |
| Address sheet, payment window | Kalio's sheet and Selldone's window, dressed by `style/domino-sd.scss` (map on or off) |
| Order | `pages/basket/order/` (title band, missing order) and its physical dashboard; `components/domino/order/` (DmOrderPay, DmOrderReceiver, DmOrderChat over Kalio's scripts; `od.ts` the steps and words) |
| Account, orders, addresses, profile, sign-in | `components/kalio/account/` (KalioAccountShell, KalioAccountHome, KalioOrdersBoard in Domino markup), `pages/user/addresses/`, `pages/user/profile/`, `components/kalio/shell/KalioSignIn.vue` |
| Journal, article, About, Contact, FAQ, Terms, Privacy | `pages/blog/`, `pages/official/`, `pages/faq/`; `components/domino/read/` (DmPost, DmLegal, DmMap = the counter on the shop's real map, `rd.ts` the sample copy from the shop's facts) |
| 404 | `pages/errors/404/` |

**Reversible choices made in phase 2.**

- The order page's crumbs are Home · Your orders · the order's code; its title is "Order SM-41" with
  where it stands ("Thank you — it's in the oven.") and when it was placed, instead of the mockup's
  "Sample order". A pickup order's steps read Placed · Baking · Ready to collect · Collected.
- The order's Invoice and Share sit beside "Pastries" as quiet links; the chat opens with the
  Layout's own invitation in the shop's voice, then Selldone's messages; starters show while empty.
- The address book adds and edits in the address sheet (the checkout's, with the map when the shop
  uses maps) rather than an inline form under the list.
- A guest's account shows the orders kept on this device with "Sign in" in the menu; the mockup's
  login page (an empty state) is the same sheet.
- Contact shows the shop's real map (Selldone's map service) in place of the mockup's drawn streets;
  without a location or a map key, the map's calm colour and the pin.
- Article links are not underlined (the owner's rule: no line under any text).

**Build.** `vite.config.ts` groups code only lazy routes use (Domino's small shared pieces, Selldone's
rare pages — community, Avocado, POS, hyper, Instagram, maps, vendor listings, other kinds of order —
and Selldone's language packs four to a file), and only when everything a grouped module imports
outside core is in the same group, so no common page loads a group's file: **273 files** in the archive (was 359).

**Words.** `components/kalio/i18n/domino.en.ts` (Domino's own `domino.*` words, generated by the
kit's `i18n-extract.cjs` with the prefix `domino.`) and `domino.ar.ts`; `bakini.en.ts`/`bakini.ar.ts`
now hold only the `bakini.*` keys the code still uses.

**Checks.** `bash scripts/run-checks.sh http://localhost:9140 <log folder>` runs every kit check one
after the other (palette `pistachio`, key `domino-theme`, Arabic forced through `local-shop-bakio`).

## Phase 3 — live checks (14 November 2026)

On domino.selldone.shop (domain 1248): `CIRCLE_CURRENCIES=USD,AED,DKK,SAR bash scripts/run-checks.sh
https://domino.selldone.shop <logs>` (28 checks, 1440 and 390, light, dark, yellow, Arabic) at TOTAL 0 on
1.0.0 and again on 1.0.1. Bakio sells in USD only, so the other currencies stay USD; the circles' long
made-up amount stands in for them. A console sweep (every page type opened in-app, the sign-in sheet, the
bag drawer, checkout, the delivery and address sheets and the payment window; light and dark, English and
Arabic, 1440 and 390) found no console or page error, and every grouped chunk of the release (language
packs, the rare pages, Domino's shared pieces) evaluates on its own. The guest checkout was walked to the
payment window on desktop and phone (a guard refuses any pay/buy request; nothing is ordered; the bag is
emptied after each run); its findings became 1.0.1. Docs: `scripts/doc-shots.cjs` takes
`docs/screenshots/` from the live shop (and empties its bag).

Final pass on live **1.0.2** (pinned on domain 1248): the 28 checks at TOTAL 0; the console sweep at 0
(light and dark, English and Arabic, 1440 and 390); the checkout walk to the payment window clean on
desktop and phone; the README and docs screenshots retaken from it.

## Phase 4 — wide screens, the photos, the loading screen (15 November 2026, 1.0.3)

**Wide screens.** The owner zooms Windows Chrome out (75/67/50/33% ≈ 1920/2150/2880/3840 CSS px).
v-main stops at 1720px (`layouts/StorefrontLayout.vue`), but Domino sized its bleed paddings from the
window: `--dm-hero-pad: … (100vw - var(--dm-wrap)) / 2 …` gave the home journal's text column an 820px
left padding at 2880, its post titles 13px wide. Now:

- **One page frame** (the owner on Pralino at 3840–8000px: the hero ran to the window's edge while the
  sections below were a narrow column). `--dm-frame-max: 1920px`: v-main stops there, in the middle
  (`layouts/StorefrontLayout.vue`; Selldone's default was 1720px). The photos that run off the edge at
  1440 (the hero's, How ordering works, the journal) run to the frame's edge, never past it, so the hero
  and the sections below share the same two edges; the text beside those photos starts on the wrap's edge
  at every frame width (`justify-self: stretch; max-width: none`). The content wrap grows a little:
  `--dm-wrap: clamp(1320px, 1320px + (pw - 1440px) * .35, 1600px)` (1320 at 1440, 1488 at 1920); the
  grids keep their columns.
- `style/domino-theme.scss`: `--dm-pw`, a registered `<length>` (`@property`): the frame's width.
  `100cqw` on each page (`.v-main` is an `inline-size` container, `.v-main > *` sets it);
  `min(100cqw, 1920px)` in the header and footer (`.dm-hdrwrap`, `.dm-ftrwrap` are containers too), so
  their content lines up with the page's; `min(100vw, 1920px)` on `:root` for the layers. Registered, it
  inherits as pixels, so a card that is its own size container (`.pc`, `.cr`, `.mc`, …) does not change
  it. `--dm-wrap`, `--dm-gut`, `--dm-hero-pad`, Bakini's `--bk-gut(-r)` and Kalio's `--k-gutter` are built
  from it and set again on each of those (a custom property's `var()` is filled in where it is declared).
- `scripts/domino-css.cjs` turns every mockup `<n>vw` into `calc(var(--dm-pw) * n/100)` (`100vw` →
  `var(--dm-pw)`): 95 sizes on 81 lines of `style/domino/{domino,b,pages}.css`; the fixed layers (`.panel`,
  `.menu`, `.toast`, `.fp.panel`) keep `vw`. The 28 `clamp(…vw…)` sizes in the inherited `kalio-*.scss`
  and the category card's `min(300px, 78vw)` read `--dm-pw` too. Left on `vw`, on purpose: fixed or
  window-sized layers (`.rgp`, the Shop menu `.k-mega`, the sticky buy widget, the snackbar, the drawers,
  the phone filter sheet, Selldone's product dialog) and image `sizes` attributes.
- Past the frame (`style/domino-layout.scss`, the end): the plain coloured bands (`.nums-band`, `.pt`
  cocoa; the About `.band`s, `.pd-tabs`, `.ct-info`) run their ground on to the window's edges with a
  `border-image` outset (ink only: no scroll, nothing moves), as the header, top bar and footer do; How ordering works and
  the journal end at the frame with their photo; from 1940px the cocoa bands' scallops run on with their
  ground and the marquee fades out at the frame's edges. Everywhere else the sides are the page's cream.
- `scripts/wide-check.cjs`: every page at 1100–5120: no text over 12 characters under 60px, no paragraph
  under 240px, no word broken mid-word, no sideways scroll. `scripts/run-checks.sh` runs it (`wide`,
  `wide-dark`) and runs box, corner-clear and card-edge at 2560, 2880 and 3840 too. It found one more
  narrow column, at 1100 (How ordering works' four notes at 210px): `.feats` now go two by two only while
  each keeps 240px.

**Photos.** Bakio's fourteen Magnific photos (generated by the coordinator with the owner's Magnific
(Freepik) MCP, Premium plan; originals in `../domino-photos-magnific/`, never shipped) are in
`assets/domino/`: the eight slots and six new collection portraits (900 × 1125). Crops in
`style/domino-layout.scss` ("The photos' crops"): the hero's big photo `10% 50%` (its dark left under the
collection names), How ordering works `20% 50%`, the Danish pastries' and the tarts' portraits `50% 60%`
(the rest keep the mockup's `50% 78%`). `scripts/photo-contrast.cjs` measures the words that sit right on a
photo against the photo under them (the hero's collection names, the offer card, "Journal"). No slot draws a
caption. `scripts/box-check.cjs` now counts OVERLAP only where the picture is painted above the words
(`elementsFromPoint`): with real photos in the offer card and the footer's texture, the words set on them on
purpose would otherwise count.

**Loading screen.** `scripts/loading/` (copies of `new-shop-kits/loading/`): `make-loading.cjs` +
`configs/domino.json` make the domain's custom loading (set on domain 1248 by the coordinator);
`test-loading.cjs` tries it with other brands (TOTAL 0). Selldone removes that frame 150ms after the app
starts, so `components/domino/DominoSplash.vue` (mounted in `StorefrontApp.vue`, outside `v-app`)
continues the same picture (`new-shop-kits/loading/IN-APP-SPLASH.md`) on a session's first page until
the page is ready (data, first photo decoded or 2.5 s, 1.2 s since the visit began; cap 4 s; never over
an error). Automated browsers skip it unless `localStorage["domino-splash"] = "test"`;
`scripts/splash-check.mjs` checks it on the built bundle.

**Checks for 1.0.3** (dev, only what these changes can break; 15 November 2026): `wide-check` every page
at 1100–5120 **0**; `photo-contrast` light at 1440/390/1100/2880/5120 and dark at 1440/390 **0** (lowest:
"Journal" 4.11:1 on a phone, large words); `box-check` light at 1440/390/2560/2880/3840 with the open states
**0**; `corner-clear` at 1440/1920/2560/2880/3840 **0**; `card-edge-dm` at 1440/2560/2880/3840 **0**; kit
`card-edge` at 2560/2880/3840 **0**. Built bundle: `domino-prod-check.mjs` home → collection → product →
journal → post → bag → checkout, 0 page errors; `splash-check.mjs` **0** (the hand-over at 1440 and 390
with no gap and no jump, no splash on the session's second load, long / Arabic / wide-logo / tall-logo
brands, the name at 12.2:1 light and 13.4:1 dark in every palette and Custom, slow 3G never past the cap).
`test-loading.cjs` **0**. Left for the live pass: the full 28-check suite, Arabic and the dark/yellow
contrast runs (colours did not change), ring and underline (no shape or line changed).
Seen at 1440, 1920, 2560, 3840 and 5120 (home, a collection, a product, About, the journal): the hero's
photo, How ordering works and the journal share the frame's two edges; every wrap (header, page, footer)
shares the same content edges.

**Docs from live 1.0.3** (pinned on domain 1248 by the coordinator): `scripts/doc-shots.cjs` retook
`docs/screenshots/` (cover, desktop 1440 and phone 390 of home, collection, product and a filled bag, the
dark home, the Theme row) and adds `loading.png` (the domain's loading screen from `scripts/loading/`, still,
as with reduced motion). Every check tool now finds Playwright and sharp through `PW` / `SHARP`, else the
installed package, else the workspace's copy beside the repo (a relative path): no absolute Windows path in
the repository.

At 390 the probe would count the selection rows' collection label ("Danish Pastries", two words on two
lines in the mockup's 52px index column, 37px wide): the phone design, not a squeeze; the probe's widths
are 1100 and up.

## Releases

Layout id **38** (`https://selldone.com/developer/layouts/38`). Upload with
`bash ../new-shop-kits/upload-guard.sh env LAYOUT_ID=38 SELLDONE_CLI_SRC=<cli clone> bash scripts/release.sh <version> desk`;
never reuse a version number. Pinned on domino.selldone.shop (Selldone domain 1248) by the coordinator.

| Version | Date | Deploy | Files | What |
| --- | --- | --- | --- | --- |
| 1.0.0 | 14 Nov 2026 | 639 | 273 | Every page ported to the B mockups; all 28 kit checks TOTAL 0 on dev (1440/390, light, dark, yellow, Arabic). Verified on the server: extracting false, error null, shop.js and shop.css match |
| 1.0.1 | 14 Nov 2026 | 642 | 273 | From the live checks and the guest checkout walk (desktop and phone, stopped at the payment window, no order): the delivery sheet as delivery-b's rows (each way with its days, fee line and its own windows), the fee alone on the method card, "Almost there" only after a place attempt, the checkout never wider than a phone (Selldone's coupon row), the discount code and coupons in Domino's dress, a window shown only for a way that offers it. Live 1.0.0: all kit checks TOTAL 0; console sweep 0 errors on every page type (en, ar, 390); every grouped chunk evaluates without error. Verified on the server |
| 1.0.2 | 14 Nov 2026 | 646 | 273 | Selldone's pickup chip under the product's price as a Domino pill (soft accent; it was a black label) and its hover card on Domino's surface; Selldone's cookie-settings icon in the legal row in the footer's light ink (it was blue and gold). A probe of every page type found no other Selldone-default chip. Live 1.0.1 before it: all 28 checks TOTAL 0, console sweep 0, checkout walk clean. Verified on the server |
| 1.0.3 | 15 Nov 2026 | 666 | 281 | Wide screens and zoom-out (phase 4): one 1920px page frame; every size from the frame's width (`--dm-pw`), never `vw` (the home journal's titles were 13px at 2880); bleed photos to the frame's edge; plain bands' grounds to the window's edge; the wrap grows to ~1490px; How ordering works' notes one under the other below 240px columns. Bakio's fourteen Magnific photos with their crops; words on photos at AA. The in-app splash continuing the domain's loading frame; `scripts/loading/`. Dev checks above at 0, prod-bundle check and splash check 0. Release `01M7FJFSDTJ54KT0JER7K3GR23`; verified on the server: extracting false, error null, shop.js and shop.css match |
| 1.0.5 | 19 Nov 2026 | 761 | 281 | Checkout: the buyer's delivery address comes back after a detour through pickup (before, the courier, then pickup, then the courier again left an empty address, and Place order opened the address sheet instead of the payment window). Same change as layout-base da6d73f. Packed with `scripts/package-layout.mjs` (a Node port of Selldone's packager) on a computer without Python; server js/css match. Pinned on domino.selldone.shop (1248) only. Detour check on live, 1440 and 390: the address stays and Place order opens the payment window; no order. |
| 1.0.6 | 19 Nov 2026 | 767 | 281 | Checkout: a just-chosen delivery way is the one priced. The bill counts as busy while a throttled basket update waits or is on its way (the answer to an update is dropped while a newer one waits), and Place order opens Selldone's payment window only once it has settled (at most 15 s). Found on Galio 1.0.6 (pickup after shipping showed the shipping fee for a few seconds, payment window included); same change as layout-base b10322f. Server js/css match. Pinned on domino.selldone.shop (1248) only. Checked on live, 1440 and 390: shipping, then pickup and Place order 0.3 s later: the payment window shows the pickup's $2.81 (the free courier's), not the shipping fee; the pickup → courier detour keeps the address; no order. |
