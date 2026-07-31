# Flott — Design Manifest

A "requirements.txt" for the website design: everything the site is built from — tech, tokens,
components, motion, and the method behind the animation work. Everything below is drawn from the
actual source ([index.html](index.html), [style.css](style.css), [script.js](script.js)).

---

## 1. Tech stack (the actual "requirements")

No framework, no build step, no package manager, no `node_modules`. Pure static files.

| Requirement | Version / note |
| --- | --- |
| HTML5 | single page — [index.html](index.html) |
| CSS3 | one hand-written stylesheet — [style.css](style.css) (~2200 lines) |
| JavaScript | vanilla, ES5-flavored (no transpile) — [script.js](script.js) |
| Dev server | `python -m http.server` (see [.claude/launch.json](../.claude/launch.json)) |
| External deps | **only** Google Fonts — everything else is local |

**Browser APIs relied on** (all with graceful fallbacks):
`<dialog>` + `showModal`, `IntersectionObserver`, Canvas 2D, `matchMedia`, Pointer Events,
`requestAnimationFrame`, CSS `@starting-style` + `transition-behavior: allow-discrete`,
`backdrop-filter`.

---

## 2. Typography

Loaded via Google Fonts (`display=swap`):

- **Inter** — the whole page, body and headings alike, weights 400–800
- **Playfair Display** — italic only (400/500), used for the first line of the
  hero headline and nothing else
- Stack: `"Inter", -apple-system, "Segoe UI", Roboto, sans-serif`
- `--font-head` resolves to `var(--font)`; there is no separate display face.
  (Voltaire was the display face until the hero was replaced — it's gone.)

Fluid type scale (all `clamp()`-based):

| Role | Size |
| --- | --- |
| `h1` | `clamp(3.2rem, 8.2vw, 6.6rem)`, line-height 0.98, weight 400 |
| `h2` | `clamp(2.2rem, 4.6vw, 3.8rem)`, weight 400 |
| `.h2-sm` | `clamp(1.9rem, 3.4vw, 2.8rem)`, weight 400 |
| `h3` | `1.25rem`, weight 600 — small enough that 400 reads flabby |
| `.ihero-h1` | `clamp(40px, min(7.4vw, 7.8vh), 96px)`, weight 400 |
| `.eyebrow` | `0.8rem`, uppercase, letter-spacing `0.14em`, blue |
| body | 1rem / line-height 1.5, `-webkit-font-smoothing: antialiased` |

---

## 3. Color tokens

**Light system** (`:root`, [style.css:6](style.css)) — fruitful.com-inspired blue / white / black:

| Token | Value | Use |
| --- | --- | --- |
| `--black` | `#0a0b10` | text, dark sections |
| `--ink-60` / `--ink-40` | `rgba(10,11,16,.62 / .42)` | secondary text |
| `--white` | `#ffffff` | surfaces |
| `--blue` | `#2353e8` | primary brand / accents |
| `--blue-deep` | `#1a3fc4` | hover states |
| `--blue-ink` | `#12309e` | text-on-white accents |
| `--blue-text-on` | `#d9e4ff` | text on blue fills |
| `--tint-blue` | `#eaf1ff` | soft blue backgrounds |
| `--tint-gray` | `#f5f7fb` | panels, chat body |
| `--tint-chip` | `#d7e4ff` | chips / button hover |
| `--line` / `--line-strong` | `rgba(10,11,16,.08 / .14)` | borders |

**Hero** (`.ihero` scope) — no palette of its own: it's the ice still and the
water clip, white type over both, and the site's own `.panel` for the invoice
card. The seam rule is `#b3d3ea`, sampled from the ice highlights down the
centre strip so it sits in the image's own tonal range.

The deep-navy/cyan tokens below (`--grad-start`, `--cyan`, `--navy-deep`,
`--btn-navy`, `--text-soft`, `--hero-video-bg`) belong to the retired
full-bleed-video hero and are no longer referenced by `style.css`.

---

## 4. Shape & motion tokens

| Token | Value | Meaning |
| --- | --- | --- |
| `--r-lg` / `--r-md` / `--r-sm` | `28px` / `20px` / `14px` | corner radii |
| `--ease` | `cubic-bezier(0.16, 1, 0.3, 1)` | the house curve (expo-out) — used everywhere |
| `--ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | same curve, hero-scope alias |

**Motion conventions applied** (see §7): UI transitions kept **< 300ms**; entrances use
ease-out/expo (never ease-in); only `transform` + `opacity` animated on the GPU;
`prefers-reduced-motion` honored throughout; hover effects gated to fine pointers.

---

## 5. Component inventory

| Component | Where | Notes |
| --- | --- | --- |
| **Brand mark** | `.brand-mark` (navbar badge, merge centre, footer) | the official ₣ glyph from the brand pack (`Flott.zip` → `Union.svg`), inlined once per place as a single filled path with `fill="currentColor"`, so one geometry serves white-on-blue and blue-on-dark. It is portrait (1013×1770) — size it by `height` with `width: auto`, never a square box |
| **Brand lockup** | `flott-logo.svg` | mark over wordmark, blue on white (`Flott.zip` → `Vector.svg`); used for the round hero badge. The pack's lockups carry an opaque white background, so they only sit on white surfaces |
| Floating pill **navbar** | `.navbar` | glass, unfolds on load, solidifies on scroll, mobile burger→X + drop-down menu |
| **Hero** (ice / water split) | `.ihero` | two looping clips, `ice.mp4` + `water_flow.mp4` (both 1280×720, one shared fit rule so they crop identically; `ice.png` stays as the poster/fallback), hard cut down a swelling seam (canvas mask + SVG rule, both from one wave function in `script.js`) |
| **Hero money blocks** | `.ihero-cards` | frozen invoice + «Доступно сегодня». Overlaid on the hero above 980px (one either side of the seam), following it down the page below that |
| Trust **marquee** | `.marquee` | infinite partner/registration ticker |
| **Flott AI** cards | `.section-ai`, `.ai-grid`, `.ai-card`, `.ai-demo` | section is one blue card over `ai-hands.jpg` (the reaching-hands render); the two panels are glass (`backdrop-filter`) so the image carries through them; typewriter demo bubbles → open chat dialog |
| **AI chat dialog** | `<dialog class="ai-dialog">` | FLIP open, flying avatar, shrink-back close, typing sequence |
| **How it works** merge scene | `#mergeScene` | scroll-driven SVG "wires": three parties merge up into the mark (each role card carries its 3D glass render, `role-bank/supplier/buyer.png`), then the wires drop and six steps rain down under it in a 3×2 grid |
| **Cabinet** demo | `.cab`, `#cabNav` | interactive dashboard, opens on «Обзор», tab-switch with re-render animation; «Обзор» and «Денежный поток» carry SVG charts ported from the `flott-website-main` dashboard (90-day inflow/outflow/balance area + monthly comparison bars) with a hover readout. Charts are drawn by hand in `script.js` — the site has no chart library — and sized to the panel it already had, so no tab scrolls. The bell opens a notifications dropdown (`.cab-notifs`), also ported from that dashboard |
| **Feature rows** (01/02/03) | `.feature-row` | bank card-deck (swap + tilt), client & underwriter panels (tilt) |
| **Live / traction** | `.live-grid`, `.pipeline`, `.backing` | result cards, deal-cycle pipeline, and the two investment announcements (AloqaVentures / United Ventures) with the amounts set as text rather than left inside the JPEGs |
| **Security** certs | `.cert-grid`, `.cert-card` | registration/audit cards |
| **CTA** contact form | `.contact-card` | 4-field form on the left, blue panel on the right (closing line + the `hourglass.png` render, which overhangs the panel's right and bottom edges rather than being sized to fit); static site, so submit composes a `mailto:` for the visitor's own client |
| **Footer** | `.site-footer` | brand + link columns |

---

## 6. Animation inventory

**CSS keyframes** ([style.css](style.css)):

| Name | Purpose |
| --- | --- |
| `navbar-unfold` | navbar expands from a thin center line on load |
| `fade-rise` / `fade-rise-scale` | staggered entrance for hero + navbar items |
| `marquee` | infinite horizontal ticker |
| `float` / `pulse` | ambient idle motion |
| `unreadFlicker` | "1" unread dot on AI bubbles |
| `aiCaret` / `typingDot` | typewriter caret + chat typing indicator |
| `aiDimIn` / `aiDlgIn` | chat backdrop dim + message entrance |
| `cabIn` | cabinet content on tab switch |
| `flow` | animated flow along the merge-scene wires |

**JS-driven motion** ([script.js](script.js)):

| Effect | Type |
| --- | --- |
| Hero reveal choreography (video → navbar unfold + text stagger) | timed, video-gated |
| Navbar solid-on-scroll | scroll state toggle |
| Mobile menu open/close | `@starting-style` + `allow-discrete` transition |
| Hero "pipe" background | Canvas 2D animation loop |
| Merge scene | scroll-driven (rAF, `getBoundingClientRect`) |
| Bank card deck | click-swap + scroll parallax + hover fan |
| Panel tilt (01/02/03 cards) | cursor-reactive 3D via `--tx/--ty` vars |
| Magnetic CTA button | cursor-follow translate |
| AI grid parallax | scroll parallax |
| AI chat open | two-phase FLIP + flying avatar (Telegram-style) |
| AI chat close | reverse FLIP — shrinks back into the source bubble |
| Cabinet chart hover readout | pointer-driven SVG cursor line + tooltip |
| Typewriter bubbles | `IntersectionObserver` + timed typing |
| Section reveals | `IntersectionObserver` (`.reveal` → `.in`) |

---

## 7. Design method — the "skills" applied

The motion work follows **Emil Kowalski's animation philosophy** (animations.dev), applied through
three review skills used during development:

- **review-animations** — audits motion against a high craft bar (the "ten non-negotiable standards").
- **find-animation-opportunities** — finds places that *should* animate, rejects the rest (restraint-first).
- **animation-vocabulary** — names effects precisely (e.g. *shared-element transition*, *magnetic*, *FLIP*).

**Standards enforced across the site:**

1. Every animation has a purpose (feedback / spatial continuity / state / delight) — no motion for its own sake.
2. Frequency-appropriate: frequent interactions are subtle & fast; first-load/rare moments carry the delight budget.
3. Responsive easing — ease-out / custom expo curve; **never** ease-in on UI.
4. UI transitions **< 300ms** (longer only for the deliberately showy first-load hero/chat sequences).
5. Correct origins & physicality — popovers/menus scale from their trigger, never from `scale(0)`.
6. Interruptible where needed (CSS transitions / retargeting, not restart-from-zero keyframes).
7. **GPU-only** — `transform` + `opacity` only; no animating layout properties.
8. Accessibility — `prefers-reduced-motion` honored (gentler, not zero); hover gated to `(hover: hover) and (pointer: fine)`.
9. Asymmetric enter/exit where it reads better (e.g. slow, showy chat open vs quick close).
10. Cohesion — one house easing curve (`cubic-bezier(0.16, 1, 0.3, 1)`) unifies the whole product.

Design language: **fruitful.com-inspired** — blue / white / black, generous whitespace, rounded pills,
soft blue-tinted shadows.

---

## 8. Accessibility & resilience

- `@media (prefers-reduced-motion: reduce)` blocks throughout — every scroll/FLIP/parallax effect degrades to a static or fade-only state.
- Hover effects (tilt, magnetic, nav links) gated behind `(hover: hover) and (pointer: fine)`.
- `<noscript>` fallback forces all entrance animations to their final visible state.
- ARIA: labeled dialog, burger (`aria-expanded`/`aria-controls`), mute toggle (`aria-pressed`), nav landmarks.
- Semantic HTML, `<dialog>` for the modal (native focus trap + Esc), keyboard-openable AI cards.
