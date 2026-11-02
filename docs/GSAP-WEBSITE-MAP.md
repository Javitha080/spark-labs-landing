# GSAP Website Map — Spark Labs Landing

Complete inventory of every GSAP-powered animation in `src/`, how the pieces
connect, what is broken or risky, and what GSAP could add next.

- Stack: `gsap@3.15.0`, `@gsap/react@2.1.2`, Lenis (smooth scroll), React 18 + Vite.
- Audit date: 2026-10-31.
- Source of findings: `node tools/gsap-mcp/cli.mjs audit src` (14 findings on
  2026-10-31, all since resolved; current run reports 0),
  plus manual review of the animation files.
- Coverage: **17 files import GSAP directly** (including `SmoothScroll.tsx`,
  whose dynamic `import('gsap')` was missed by the first static pass) and **9
  more consume GSAP-backed ReactBits components directly** (`SplitText`,
  `FadeContent`, `ScrollReveal`, `AnimatedContent`, `ScrollFloat`).
- Status: all findings resolved on 2026-10-31 (14 → 0); `Hero.tsx` lost its dead
  GSAP imports, so it moved to the indirect list.
- Related: `docs/GSAP-MASTERY.md` (capability reference), `.agents/skills/gsap-mastery/SKILL.md` (router).

---

## 1. Executive summary

| Metric | Value |
| --- | ---: |
| Source files scanned | 315 |
| Files importing GSAP directly | 17 |
| Additional files consuming GSAP-backed ReactBits directly | 9 |
| GSAP plugins imported | 3 (`ScrollTrigger`, `Draggable`, `SplitText`) + `useGSAP` hook |
| Audit findings | 0 (14 resolved) |
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |
| Info | 0 |

**Indirect GSAP surface** (no direct `gsap` import in these files):

- Pages: `Blog`, `CourseDetail`, `WorkshopDetail` → `SplitText`; `NotFound` →
  `FadeContent`; `ProjectsPage` → `ScrollReveal`.
- Components: `animation/Reveal` → `AnimatedContent` (used by `FeatureGrid`,
  `StatsSection`, `Partners`); `Events` → `FadeContent`; `JoinUs` → `ScrollFloat`;
  `Hero` → `SplitText` (dead direct imports removed).
- `LandingLeadership` imports GSAP directly but most of its visible motion comes
  from ReactBits components.

What works well:

- Lenis and ScrollTrigger are integrated correctly through one ticker, with
  refresh after fonts, load, resize, and lazy content.
- Reduced motion, touch, and low-power fallbacks exist in the shared primitives
  and in most components.
- `useGSAP` is used with scopes almost everywhere; cleanup is mostly automatic.
- Boot sequence is deliberately imperative and refreshes ScrollTrigger on exit.

What changed on 2026-10-31 (all findings resolved):

1. **Draggable instances are killed** in `MacOsWindow` and `MacOsFolder`; the
   folder effect also keys off `defaultPosition.x/y` instead of object identity.
2. **The horizontal pin re-measures** its width on every refresh and sets
   `anticipatePin: 1`; card lookups are cached outside `onUpdate`.
3. **The achievements timeline** derives its active index from overall scroll
   progress, updates React state only when the index changes, and scales a
   full-height rail (`scaleY`) instead of animating `height`.
4. **The footer reveal is one-shot** (`once`, no `scrub`).
5. **Hero lost its dead GSAP imports**; GSAP now reaches it only through
   ReactBits `SplitText`.
6. **SplitText kills its own trigger**, not a global scan, and the `blur` effect
   variants were removed from `SplitText` and `ScrollFloat` (AGENTS.md forbids
   animated `filter: blur()`).
7. **The macOS maximize/restore tweens keep `width`/`height`** because a real
   window resize must reflow; both calls carry a reasoned
   `gsap-audit-disable-next-line layout-property-animation` comment.

Remaining maintenance notes (not audit findings):

- `MacOsDock.tsx` is unused dead code.

---

## 2. Runtime pipeline

```
App mount
  └─ SmoothScroll (marketing routes only)
       ├─ registers ScrollTrigger
       ├─ ignoreMobileResize, refresh on fonts/load/resize/1.2s settle
       └─ Lenis (desktop, fine pointer, no reduced motion, ≥1024px)
            └─ lenis.on('scroll', ScrollTrigger.update)
            └─ gsap.ticker.add(time => lenis.raf(time * 1000))

Index route
  └─ BootScreen (full-screen intro, manual gsap.context)
       └─ on finish: ScrollTrigger.refresh(), Lenis.start()

Sections mount
  └─ useGSAP + ScrollTrigger per component (scoped)
       └─ shared primitives from GSAPResponsiveReveal
```

Key facts:

- Lenis is **not** active on `/admin` or `/student`, touch devices, reduced
  motion, low-power devices, or viewports `<1024px`. ScrollTrigger still works
  against native scroll there.
- ScrollSmoother is not used and must not be added while Lenis is present.
- `ScrollTrigger.config({ ignoreMobileResize: true })` prevents mobile URL-bar
  refresh jumps.
- All plugin registration happens at module scope in each file. There is no
  single animation bootstrap module.

---

## 3. Page-by-page map

### `/` — Home (`src/pages/Index.tsx`)

| Section | Component | GSAP work |
| --- | --- | --- |
| Intro | `loading/BootScreen.tsx` | Full boot intro: logo/particles/3D stage, text entrance, exit timelines, `ScrollTrigger.refresh()` on finish. |
| Hero | `home/Hero.tsx` | No direct GSAP (dead imports removed); uses ReactBits SplitText/CountUp/RotatingText/Magnet/ClickSpark/DotGrid/BlurText/StarBorder/GradualBlur and `GSAPButtonHaptic` on the CTA. |
| Showcase | `home/HorizontalShowcase.tsx` | Pinned horizontal scroll, per-card 3D depth driven from ScrollTrigger `onUpdate`. |
| Features | `home/FeatureGrid.tsx` | `animation/Reveal` → ReactBits `AnimatedContent` (scroll/mount entrance). |
| Stats | `home/StatsSection.tsx` | `animation/Reveal` → ReactBits `AnimatedContent`; CountUp/ScrollVelocity are non-GSAP but share the scroll surface. |
| Timeline | `home/AchievementsTimeline.tsx` | Scrubbed milestone timeline: rail fill, node pop, card slide, title split reveal, active-node state. |
| Leadership | `home/LandingLeadership.tsx` | 3D flip cards (`rotateY`) + ReactBits `ScrollFloat` heading. |
| Events | `components/Events.tsx` | ReactBits `FadeContent` noise-mask reveal (GSAP context + ScrollTrigger). |
| Partners | `home/Partners.tsx` | `animation/Reveal` → ReactBits `AnimatedContent` (GSAP). |
| FAQ | `home/FAQ.tsx` | ReactBits `GradientText` only (no GSAP timeline). |
| Join | `components/JoinUs.tsx` | ReactBits `ScrollFloat` heading (GSAP + ScrollTrigger). |
| Footer | `components/Footer.tsx` | One-shot footer reveal timeline + `GSAPButtonHaptic` social/CTA buttons. |

### `/projects` — Projects (`ProjectsPage.tsx`)

- ReactBits `ScrollStack` (stacking cards) and `ScrollReveal` (per-word/char
  scrub reveal for the caption/deck). `ScrollReveal` uses `clamp()` starts and
  writes transforms directly in `onUpdate` — a good pattern.
- No pinning; no Draggable.

### `/blog` and `/blog/:slug` (`Blog.tsx`, `BlogPost.tsx`)

- **Indirect GSAP:** `Blog.tsx` imports `components/reactbits/SplitText`, which
  owns the `gsap` + `SplitText` + `ScrollTrigger` code. The page itself has no
  GSAP import.
- `SplitText` for the identity headline (word/line entrance) and list headings.
- `BlogPost` uses ReactBits `SpotlightCard` / `DecryptedText` (non-GSAP).
- No ScrollTrigger pin.

### `/courses/:id` and `/workshops/:id`

- **Indirect GSAP:** `CourseDetail.tsx` and `WorkshopDetail.tsx` import
  `components/reactbits/SplitText` for the title entrance; they do not import
  `gsap` themselves.
- Standard page content; no other GSAP.

### `/leadership` (`LeadershipPage.tsx`)

| Component | GSAP work |
| --- | --- |
| `MacOsBootScreen` | Logo fade/scale, progress bar `scaleX`, container fade, fallback timeout → `onComplete`. |
| `MacOsWindow` | `Draggable` window, maximize/restore tween (`width`/`height`), genie minimize (`scale`/`y`/`skewX`), pop-in. |
| `MacOsFolder` | `Draggable` desktop folders, hover/press scale, click sound. |
| `MacOsMenuBar` | No GSAP. |
| `MacOsDock` | GSAP magnification on hover, but **not imported anywhere** — dead code. |
| Page cursor | `gsap.quickTo` trailing cursor (desktop, fine pointer only). |

### `/events` (`EventsPage.tsx` → `components/Events.tsx`)

- ReactBits `FadeContent` with noise-mask reveal (GSAP context + ScrollTrigger).

### `/contact` (`ContactPage.tsx`)

- `components/JoinUs.tsx` → ReactBits `ScrollFloat` heading (GSAP +
  ScrollTrigger). No other GSAP on the page.

### `/404` (`NotFound.tsx`)

- ReactBits `FadeContent`, `FaultyTerminal`, `FuzzyText`, `Magnet` — GSAP appears
  only through `FadeContent`.

### Global

- `SmoothScroll.tsx` — Lenis/ScrollTrigger infrastructure (dynamic GSAP import).
- `animation/PageTransition.tsx`, `animation/ScrollAnimations.tsx` — not GSAP
  (Framer Motion / CSS); they share the same scroll surface but are out of scope.

---

## 4. Component inventory

| File | Lines | GSAP surface | Trigger | Health |
| --- | ---: | --- | --- | --- |
| `components/SmoothScroll.tsx` | 146 | dynamic `gsap` + ScrollTrigger, ticker + Lenis | Infrastructure | Good; only dynamic import |
| `components/animation/GSAPResponsiveReveal.tsx` | 375 | `useGSAP`, ScrollTrigger, tweens | Scroll | Good; reuse first |
| `components/Footer.tsx` | 306 | timeline + ScrollTrigger (one-shot) | Scroll | Resolved: no scrub+once conflict |
| `components/home/AchievementsTimeline.tsx` | 453 | timeline + ScrollTrigger scrub, guarded state | Scroll | Resolved: scaleY rail, state on index change |
| `components/home/HorizontalShowcase.tsx` | 202 | `useGSAP`, ScrollTrigger pin, `onUpdate` | Scroll | Resolved: live width, `anticipatePin`, cached cards |
| `components/home/LandingLeadership.tsx` | 251 | `useGSAP` flip, ReactBits ScrollFloat | Interaction/scroll | Good |
| `components/leadership/MacOsBootScreen.tsx` | 212 | `useGSAP` tweens | Mount | Good |
| `components/leadership/MacOsDock.tsx` | 272 | `useGSAP` magnification | Hover | **Unused** |
| `components/leadership/MacOsFolder.tsx` | 178 | `Draggable`, tweens | Interaction | Resolved: instance killed in cleanup |
| `components/leadership/MacOsWindow.tsx` | 658 | `Draggable`, maximize/genie tweens | Interaction | Resolved: instance killed; width/height accepted |
| `components/loading/BootScreen.tsx` | 727 | `gsap.context`, timelines, ScrollTrigger.refresh | Mount | Complex but intentional |
| `components/reactbits/AnimatedContent.tsx` | 249 | context + ScrollTrigger | Scroll/mount | Good (vendored) |
| `components/reactbits/FadeContent.tsx` | 415 | context + ScrollTrigger + noise masks | Scroll | Good (vendored) |
| `components/reactbits/ScrollFloat.tsx` | 280 | matchMedia + ScrollTrigger + manual paint | Scroll | Resolved: blur effect removed |
| `components/reactbits/ScrollReveal.tsx` | 336 | matchMedia + ScrollTrigger + manual paint | Scroll | Resolved: default blur removed |
| `components/reactbits/SplitText.tsx` | 454 | SplitText + ScrollTrigger + RAF springs | Scroll/interaction | Resolved: own trigger; blur removed |
| `pages/LeadershipPage.tsx` | 435 | `quickTo`, Draggable composition | Interaction | Good |

---

## 5. Findings and fixes (all resolved)

Audit on 2026-10-31: **0 findings** across 17 GSAP files. What was wrong and
what changed:

| # | Severity | File | Problem | Fix |
| --- | --- | --- | --- | --- |
| 1 | High | `MacOsWindow`, `MacOsFolder` | Draggable instances were never killed | Cleanup returned from `useGSAP` calls `instance.kill()`; folder effect keys on `defaultPosition.x/y` |
| 2 | Medium | `HorizontalShowcase` | Pin measured `container.offsetWidth` once | `end: () => "+=" + container.offsetWidth`, `anticipatePin: 1`, cached card nodes |
| 3 | Medium | `AchievementsTimeline` | Per-frame `setState`; active index from local progress | Index from ScrollTrigger `self.progress`, guarded by a ref; rail uses `scaleY` |
| 4 | Medium | `MacOsWindow` | `width`/`height` maximize tween | Kept (a real resize must reflow) and suppressed per line with a reason |
| 5 | Medium | `SplitText`, `ScrollFloat` | Animatable `filter: blur()` variants | `blur` dropped from both effect unions and switch branches |
| 6 | Medium | `SplitText` | `ScrollTrigger.getAll()` on cleanup | Stores its own `introTrigger` and kills that |
| 7 | Low | `Footer` | `scrub` + `once` | One-shot reveal (`start` + `once`), no scrub |
| 8 | Info | `HorizontalShowcase` | Missing `anticipatePin` | `anticipatePin: 1` |
| 9 | — | `Hero` | Dead GSAP imports/registration | Removed; Hero is now an indirect consumer |

### Draggable cleanup

`gsap.context()` (and therefore `useGSAP`) does not kill `Draggable` instances.
Every route visit left listeners on the old node, and a remount could attach a
second instance to the same target.

```js
// before
useGSAP(() => {
  Draggable.create(windowRef.current, { type: "x,y", bounds: ".macos-desktop" });
}, []);

// after
useGSAP(() => {
  const [draggable] = Draggable.create(windowRef.current, {
    type: "x,y",
    bounds: ".macos-desktop",
  });
  return () => draggable?.kill();
}, { scope: windowRef });
```

`MacOsFolder` does the same and uses `[defaultPosition.x, defaultPosition.y]`
instead of the object, so a re-render with an equal position no longer stacks
instances.

### Horizontal pin measurement

```js
// before — measured once, never updated
const totalWidth = container.offsetWidth;
end: () => "+=" + totalWidth,

// after — re-measured on every refresh
end: () => "+=" + container.offsetWidth,
anticipatePin: 1,
```

`invalidateOnRefresh: true` cannot help a value captured outside the function.
Card lookups also moved into a `cards` array created once, because `onUpdate`
runs every frame.

### Per-frame setState and wrong active index

Two bugs in one block:

1. `this.progress()` was the **local** progress of each rail segment tween, not
   the overall timeline. Every segment recomputed `activeIndex` from 0→1, so the
   highlighted milestone cycled instead of advancing once.
2. `setActiveMilestone` ran every frame, forcing a React re-render during a
   scrubbed scroll.

The index now comes from the ScrollTrigger's own progress and only calls
`setState` when it changes. Click-to-activate writes the same ref so the guard
cannot swallow a user selection.

```js
ScrollTrigger.create({
  animation: tl,
  trigger: timelineRef.current,
  scrub: 1.2,
  onUpdate: (self) => {
    const index = Math.min(
      Math.floor(self.progress * milestones.length),
      milestones.length - 1
    );
    if (index !== activeMilestoneRef.current) {
      activeMilestoneRef.current = index;
      setActiveMilestone(index);
    }
  },
});
```

The rail fill is full-height and scaled (`scaleY`, `transformOrigin: "top
center"`) instead of animating `height`, so the scrub never triggers layout.

### Layout-property animation in the macOS window

Maximize/restore still tweens `width` and `height`: a window that genuinely
grows must reflow its contents, and Flip would scale the text instead. Both
calls carry a reasoned suppression so the audit stays actionable:

```ts
// gsap-audit-disable-next-line layout-property-animation
gsap.to(windowRef.current, { width: window.innerWidth, height: window.innerHeight - 28 });
```

### Footer scrub killed by `once`

The reveal is now a one-shot timeline (`start: "top 85%"`, `once: true`) with no
`scrub` and no `end`. Pick one model: scrubbed (`scrub`, no `once`) or discrete
(`toggleActions` or `once`).

### Dead GSAP imports in Hero

`gsap`, `ScrollTrigger`, and `useGSAP` were imported and registered but never
used. Removed; Hero now gets GSAP only through ReactBits `SplitText`.

### SplitText global trigger scan

```js
// before
ScrollTrigger.getAll().forEach(st => {
  if (st.trigger === el) st.kill();
});

// after
introTrigger = intro.scrollTrigger ?? null;
// …
introTrigger?.kill();
```

The trigger is captured when the intro is created, so no other component's
trigger is touched or scanned.

### Blur effects in vendored components

All animated `filter: blur()` paths are gone from the vendored ReactBits
components this site uses:

- `ScrollFloat` and `SplitText`: the `blur` effect was deleted from the type
  union and the switch.
- `ScrollReveal`: `enableBlur` / `blurStrength` were removed. They defaulted to
  `true` / `4`, so every `ScrollReveal` on the site (`ProjectsPage`) was
  animating a 4px blur — this was a live rule violation, not just a latent one.
- `FadeContent`: the `blur` prop and the `blur()` term in the `focus`,
  `develop`, and noise-mask paths were removed; `focus` is now scale + opacity
  and `develop` keeps only grayscale/contrast/brightness.

AGENTS.md forbids animated `filter: blur()` — do not reintroduce it.

### Unused animation code

- `components/leadership/MacOsDock.tsx` (272 lines) is never imported.
- `GSAPDecryptText`, `GSAPMagnetic`, `GSAPCard3DTilt`, `GSAPScrollReveal` are
  exported but unused. They are tree-shaken, so the cost is maintenance only.
  Keep them as primitives or delete them deliberately — do not let them rot.

### Correct patterns worth copying

- `GSAPResponsiveReveal.tsx` — watchdog, reduced-motion branch, `clearProps:
  "willChange"` on completion, mobile fallback.
- `ScrollReveal.tsx` — `clamp()` starts, direct style writes (no setState),
  ResizeObserver for line re-measure, `mm.revert()` cleanup.
- `SmoothScroll.tsx` — one ticker, `ignoreMobileResize`, debounced refresh,
  Lenis `prevent` list for Radix overlays.
- `BootScreen.tsx` — explicit `gsap.context` and timeline cleanup, refresh after
  exit, Lenis resume.

---

## 6. What GSAP can add here

Ordered by payoff for this site.

| Opportunity | Where | Why |
| --- | --- | --- |
| **Flip for layout changes** | Gallery filters, projects grid/list, blog card layout, macOS maximize | Removes width/height tweens and keeps scroll position. |
| **`easeReverse`** | Leadership flip cards, FAQ accordion, mobile menu, any modal/drawer | Reversing mid-animation feels intentional; replaces `yoyoEase`. |
| **ScrollTrigger.batch** | Blog list, projects grid, gallery | One trigger for many cards instead of one per card; staggered entrances. |
| **Observer for touch** | HorizontalShowcase `<768px` (currently static) | Swipe between panels without hijacking page scroll. |
| **SplitText `mask` + `autoSplit`** | Hero/Blog/Course titles | Clean line reveals that survive font loading and resize. |
| **DrawSVG** | Logo mark, section dividers, timeline rail | Draw-on-scroll line work instead of animating height. |
| **MotionPath** | Boot/hero particles, connector lines | Deterministic curved paths instead of manual x/y math. |
| **`quickTo` for the dock** | MacOsDock (if wired up) | Pointer-speed magnification without a tween per mouse move. |
| **`gsap.matchMedia`** | All breakpoint branches | Replaces manual `resize` state and auto-reverts on breakpoint change. |
| **`ScrollTrigger.clamp`** | Above-the-fold reveals | Prevents sections starting part-scrubbed on load. |
| **`registerEffect`** | Repeated card/heading entrances | One named recipe instead of copy-pasted tweens. |
| **GSDevTools (dev only)** | Complex timelines (BootScreen, Achievements) | Scrub and inspect without replaying the whole page. |

### Not recommended

- **ScrollSmoother** — conflicts with Lenis.
- **Animating blur** — banned by AGENTS.md; use opacity/transform cross-fades.
- **A second RAF loop** — use `gsap.ticker` or `quickTo`.
- **Pinning more sections** — the home page already has one pin; more pins
  increase scroll length and mobile risk.

---

## 7. Verification checklist for animation changes

```bash
node tools/gsap-mcp/cli.mjs audit src
node tools/gsap-mcp/cli.mjs map src
npm run test
npm run build
```

Manual checks:

- Desktop 1440px: horizontal showcase pins, scrubs, and releases cleanly;
  resize while pinned and confirm the end distance updates.
- Mobile 390px: no pin, no Lenis, reveals still fire, content never stays hidden.
- `prefers-reduced-motion: reduce`: final states render immediately; flip cards
  still expose the bio.
- `/leadership`: open/close windows repeatedly, navigate away and back, confirm
  no duplicate drag behavior and no console listener warnings.
- Throttle CPU 4×: achievements timeline and footer reveal stay smooth.
- Screen reader: SplitText headings still read as complete text.

---

## 8. File index

| Concern | Files |
| --- | --- |
| Scroll infrastructure | `src/components/SmoothScroll.tsx`, `src/lib/scroll.ts` |
| Shared motion guards | `src/lib/motion.ts` |
| Shared reveals | `src/components/animation/GSAPResponsiveReveal.tsx` |
| Home animations | `src/components/home/{Hero,HorizontalShowcase,AchievementsTimeline,LandingLeadership}.tsx` |
| Boot | `src/components/loading/BootScreen.tsx`, `src/components/leadership/MacOsBootScreen.tsx` |
| macOS desktop | `src/components/leadership/{MacOsWindow,MacOsFolder,MacOsDock,MacOsMenuBar}.tsx`, `src/pages/LeadershipPage.tsx` |
| Vendored scroll/text | `src/components/reactbits/{AnimatedContent,FadeContent,ScrollFloat,ScrollReveal,SplitText}.tsx` |
| Indirect ReactBits GSAP | `pages/{Blog,CourseDetail,WorkshopDetail,NotFound,ProjectsPage}.tsx`, `components/{Events,JoinUs}.tsx`, `components/home/Hero.tsx`, `components/animation/Reveal.tsx` |
| Footer | `src/components/Footer.tsx` |
| Tooling | `tools/gsap-mcp/`, `docs/GSAP-MASTERY.md` |
