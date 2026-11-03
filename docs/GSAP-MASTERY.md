# GSAP 3.15 — Complete Capability Map

Reference for this repository. Verified against `gsap@3.15.0` (released
2026-04-13) and `@gsap/react@2.1.2`, installed in `package.json`.

- GSAP docs: <https://gsap.com/docs/v3/>
- 3.15 release: <https://gsap.com/blog/3-15/>
- 3.14 release: <https://gsap.com/blog/3-14/>
- React guide: <https://gsap.com/resources/React>
- Cheatsheet: <https://gsap.com/cheatsheet/>

Everything below is available from the public `gsap` npm package. No Club
membership, license key, or private registry is required.

---

## 1. Install and registration

```bash
npm install gsap @gsap/react
```

```js
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);
```

Rules:

- Register once per module (module scope), before any tween that needs the plugin.
- Registering the same plugin twice is harmless; registering it inside render is not.
- Import plugins from their own entry points (`gsap/ScrollTrigger`, not `gsap`).
- `@gsap/react` is optional but preferred in React; it is a plugin registration and a hook.

---

## 2. Core API

| API | Signature | Use |
| --- | --- | --- |
| `gsap.to` | `gsap.to(targets, vars)` | Animate from current values to `vars`. |
| `gsap.from` | `gsap.from(targets, vars)` | Animate from `vars` to current. Entrances. `immediateRender: true` by default. |
| `gsap.fromTo` | `gsap.fromTo(targets, fromVars, toVars)` | Explicit start and end. Deterministic resets. |
| `gsap.set` | `gsap.set(targets, vars)` | Apply instantly, no tween. Initial states, `clearProps`. |
| `gsap.timeline` | `gsap.timeline(vars)` | Sequence tweens; position parameter, labels, nesting. |
| `gsap.delayedCall` | `gsap.delayedCall(delay, fn, params, scope)` | Cancellable timer on the GSAP ticker. |
| `gsap.quickTo` | `gsap.quickTo(target, prop, vars)` | Reusable eased setter for rapid updates (cursor followers). |
| `gsap.quickSetter` | `gsap.quickSetter(target, prop, unit)` | Raw setter, no easing. |
| `gsap.context` | `gsap.context(fn, scope)` | Collect animations/ScrollTriggers for one `revert()`. |
| `gsap.matchMedia` | `gsap.matchMedia()` | Setup that auto-reverts when a media query stops matching. |
| `gsap.matchMediaRefresh` | `gsap.matchMediaRefresh()` | Revert and re-run every matchMedia context. |
| `gsap.registerPlugin` | `gsap.registerPlugin(...plugins)` | Enable plugin properties/APIs. |
| `gsap.registerEffect` | `gsap.registerEffect({ name, effect, defaults, extendTimeline })` | Reusable named animation recipe. |
| `gsap.effects` | `gsap.effects.name(targets, vars)` | Registry of registered effects. |
| `gsap.registerEase` | `gsap.registerEase(name, ease)` | Register a named ease for string references. |
| `gsap.exportRoot` | `gsap.exportRoot(vars, includeDelayedCalls)` | Wrap all current root animations for global control. |
| `gsap.updateRoot` | `gsap.updateRoot(time)` | Advanced: move the root playhead (custom render loops). |
| `gsap.getById` | `gsap.getById(id)` | Find a tween/timeline by `vars.id`. |
| `gsap.isTweening` | `gsap.isTweening(target, props)` | True while the target is actively tweening. |
| `gsap.install` | `gsap.install(target)` | Advanced: copy the gsap globals onto another object (wrapper libraries). |
| `gsap.defaults` | `gsap.defaults(vars)` | Defaults inherited by future tweens. |
| `gsap.config` | `gsap.config({ autoSleep, force3D, nullTargetWarn, units })` | Global engine settings. |
| `gsap.getProperty` | `gsap.getProperty(target, prop, unit)` | Read a transform/CSS/custom property. |
| `gsap.setProperty` | `gsap.setProperty(target, prop, value)` | Write one property without a tween. |
| `gsap.getTweensOf` | `gsap.getTweensOf(targets)` | Inspect tweens for a target. |
| `gsap.killTweensOf` | `gsap.killTweensOf(targets, props)` | Kill tweens for a target (optionally only some props). |
| `gsap.ticker` | `gsap.ticker.add/remove/fps/lagSmoothing` | The single RAF loop. Integrate Lenis here. |
| `gsap.globalTimeline` | — | Root timeline; pause everything (rarely the right cleanup). |
| `gsap.version` | — | Running version string (e.g. `"3.15.0"`). |
| `gsap.parseEase` | `gsap.parseEase("power2.out")` | Convert an ease name to a function. |
| `gsap.utils` | see §6 | Math/selector helpers. |

### Targets

Selectors, elements, arrays, NodeLists, objects, SVG elements, canvas objects
(via plugins), or any mix. GSAP converts selector strings with
`document.querySelectorAll` unless a scope is supplied (`gsap.context`,
`useGSAP`, `gsap.utils.selector`).

### gsap.ticker

`add(fn)`, `remove(fn)`, `fps(value)`, `lagSmoothing(threshold, adjustedLag)`,
`sleep()`, `wake()`, `tick()`, plus `ticker.time`, `ticker.frame`, and
`ticker.deltaRatio()`. It is the only RAF loop GSAP needs; integrate Lenis here.

### gsap.context() / gsap.matchMedia()

`ctx.add(fn)`, `ctx.ignore(fn)`, `ctx.revert()`, `ctx.kill()`, `ctx.clear()`.
`mm.add(query, fn, scope)`, `mm.revert()`, `mm.kill()`.

### Common tween vars

| Var | Meaning |
| --- | --- |
| `duration` | Seconds (default `0.5`). |
| `delay` | Seconds before start. |
| `ease` | Ease name/function (default `power1.out`). |
| `stagger` | Number, object (`{ each, from, amount, grid, axis }`), or function. |
| `repeat`, `repeatDelay`, `yoyo` | Repetition. |
| `easeReverse` | **3.15+** reverse-direction ease (`true` = reuse forward). Replaces `yoyoEase`. |
| `paused`, `reversed` | Initial playback state. |
| `immediateRender` | Render start values immediately (`from`/`fromTo` default true). |
| `overwrite` | `false`, `true`, `"auto"` — resolve conflicting tweens. |
| `lazy` | Delay first render to the next tick (default true). |
| `onStart`, `onUpdate`, `onComplete`, `onRepeat`, `onReverseComplete` | Callbacks. |
| `callbackScope` | `this` for callbacks. |
| `id` | Debug/selection identifier. |
| `data` | Arbitrary payload on the tween. |
| `runBackwards`, `flipY` | `from` helpers. |
| `transformPerspective`, `transformOrigin`, `force3D` | Transform setup. |
| `clearProps` | Remove inline props on completion (`"all"` or comma list). |

### Tween controls

```js
const tween = gsap.to(".box", { x: 100, paused: true });
tween.play(); tween.pause(); tween.reverse(); tween.restart(); tween.resume();
tween.progress(0.5); tween.time(0.2); tween.totalProgress(0.8);
tween.timeScale(2); tween.seek(1); tween.invalidate(); tween.kill(); tween.revert();
tween.then(() => {/* promise */});
```

- `progress()` is tween/timeline-local; `totalProgress()` includes repeats.
- `invalidate()` clears recorded start values so the next render re-reads the DOM.
- `revert()` restores pre-animation inline styles (what `useGSAP`/`context` cleanup uses).

### Full tween/timeline members

| Member | Use |
| --- | --- |
| `play/pause/resume/reverse/restart/seek` | Playback control. |
| `progress()`, `totalProgress()` | Local progress vs. progress including repeats. |
| `time()`, `totalTime()`, `globalTime()` | Local time, total time, and time on the global timeline. |
| `delay()`, `duration()`, `totalDuration()` | Timing read/write. |
| `startTime()`, `endTime()` | Position within the parent timeline. |
| `iteration()`, `repeat()`, `repeatDelay()`, `yoyo()` | Repetition state. |
| `paused()`, `reversed()`, `isActive()`, `timeScale()` | Playback state and speed. |
| `eventCallback(type, fn, params)` | Add/replace `onStart`, `onUpdate`, `onComplete`, etc. |
| `then(fn)` | Promise-style completion callback. |
| `invalidate()`, `revert()`, `kill()` | Re-read start values, restore inline styles, destroy. |
| `data`, `ratio`, `vars` | Payload, eased progress, and original configuration. |

Timeline-only members:

| Member | Use |
| --- | --- |
| `add(child, position)`, `to/from/fromTo/set(...)` | Insert animations. |
| `addLabel(name, position)`, `removeLabel(name)` | Named positions. |
| `addPause(position, callback, params)` | Pause the timeline at a position. |
| `call(fn, params, position)` | Schedule a callback. |
| `currentLabel()`, `recent()` | Label/position inspection. |
| `getById(id)`, `getChildren()` | Child lookup. |
| `remove(child)`, `clear()` | Remove one child or all children. |
| `shiftChildren(amount, adjustLabels)` | Move all children in time. |
| `tweenTo(position, vars)`, `tweenFromTo(from, to, vars)` | Animate the playhead itself. |
| `smoothChildTiming`, `autoRemoveChildren` | Timeline-level vars. |

---

## 3. Timelines and sequencing

```js
const tl = gsap.timeline({
  paused: true,
  defaults: { duration: 0.5, ease: "power2.out", easeReverse: "power2.in" },
});

tl.addLabel("intro")
  .from(".title", { y: 24, autoAlpha: 0 })
  .to(".panel", { x: 0 }, "intro+=0.2")
  .to(".cta", { scale: 1 }, "<0.1")
  .addLabel("outro", "+=0.3");
```

Position parameter:

| Value | Placement |
| --- | --- |
| omitted | End of the timeline. |
| `0` / `2.5` | Absolute seconds. |
| `"label"` | At a label. |
| `"label+=0.3"` / `"-=0.2"` | Relative to a label or the end. |
| `"<"` | Start of the previous animation. |
| `">"` | End of the previous animation. |
| `"<0.1"` / `">-0.1"` | Offset from previous start/end. |

Playback: `play`, `pause`, `reverse`, `restart`, `resume`, `seek`, `progress`,
`time`, `timeScale`, `kill`, `clear`, `invalidate`, `then`.
Nesting: `tl.add(childTimeline, position)`, `tl.addLabel`, `tl.remove`, `tl.getChildren`.

Timeline-specific vars: `defaults`, `repeat`, `yoyo`, `onComplete`, `onStart`,
`onUpdate`, `onRepeat`, `smoothChildTiming`, `autoRemoveChildren`.

---

## 4. Easing

### Built-in families

`none`, `power1`–`power4`, `back`, `bounce`, `circ`, `elastic`, `expo`, `sine`,
each with `.in`, `.out`, `.inOut` (bare name = `.out`). Configurable forms:
`back.out(1.7)`, `elastic.out(1, 0.3)`, `steps(5)`.

EasePack (register it first) adds `rough({ strength, points })`, `slow(0.7, 0.7)`,
and `expoScale(1, 100, "none")`.

### `easeReverse` (3.15+)

```js
gsap.to(".drawer", {
  x: 0,
  ease: "expo.out",
  easeReverse: "power2.in", // or `true` to reuse the forward ease
});

const tl = gsap.timeline({
  paused: true,
  defaults: { ease: "power3.out", easeReverse: "power2.in" },
});
```

- Applies when the playhead moves backwards, including a reverse started mid-tween.
- `true` reuses the forward ease, recalculated from the interruption point for the reverse direction.
- `yoyoEase` is deprecated in 3.15 and internally mapped to `easeReverse`.
- Best for drawers, modals, menus, toggles, and anything interrupted by the user.

### Custom eases

```js
CustomEase.create("hop", "M0,0 C0,0 0.056,0.442 0.175,0.442 0.294,0.442 0.332,0 0.332,0 0.332,0 0.414,1 0.671,1 0.991,1 1,0 1,0");
CustomEase.create("css-like", ".17,.67,.83,.67");
```

- `CustomEase` accepts SVG path data or cubic-bezier values.
- `EasePack`: `RoughEase`, `ExpoScaleEase`, `SlowMo`.
- `CustomWiggle.create("wiggle", { wiggles: 6, type: "easeOut" })`.
- `CustomBounce.create("bounce", { strength: 0.7, squash: 2 })` (squash needs an extra element).

Ease choice heuristics:

| Intent | Ease |
| --- | --- |
| General entrance | `power2.out` / `power3.out` |
| Dramatic entrance | `expo.out` / `power4.out` |
| Playful pop | `back.out(1.7)` |
| Springy attention | `elastic.out(1, 0.3)` — small elements only |
| Scroll-linked | `none` (linear) |
| Exit | `power2.in` / `power3.in` |
| Reversible UI | forward `.out`, `easeReverse` `.in` |

---

## 5. Utility methods

| Utility | Use |
| --- | --- |
| `clamp(min, max, value)` | Constrain to a range. |
| `mapRange(inMin, inMax, outMin, outMax, value)` | Remap a number. |
| `normalize(min, max, value)` | Map a range to 0–1. |
| `interpolate(start, end, progress)` | Numbers, colors, strings, arrays, objects. |
| `random(min, max, snap)` | Random number or array element. |
| `snap(increment, value)` / `snap(array, value)` | Snap to steps or list. |
| `toArray(targets, scope)` | Real array, optionally scoped. |
| `selector(scope)` | Scoped selector function. |
| `wrap(min, max, value)` / `wrapYoyo` | Wrap values into a range. |
| `distribute({ base, amount, from, grid, axis })` | Stagger values from start/center/edges/random. |
| `pipe(...fns)` | Compose utilities left-to-right. |
| `unitize(fn, unit)` | Add a unit to a function-based value. |
| `splitColor(color, type)` | RGB/HSL components. |
| `getUnit(value)` | Read the unit from a value. |
| `checkPrefix(prop)` | Browser-prefixed property name, or `null` when unsupported. |
| `shuffle(array)` | Shuffle an array in place. |

```js
const stagger = gsap.utils.distribute({ base: 0, amount: 0.6, from: "center", grid: [4, 3] });
gsap.to(".cell", { scale: 1, stagger });
```

---

## 6. Plugins

All plugins are free. Register before use.

| Plugin | Import | Category | What it does |
| --- | --- | --- | --- |
| ScrollTrigger | `gsap/ScrollTrigger` | scroll | Scroll-linked animation, pinning, scrub, snap, batch, callbacks. |
| ScrollSmoother | `gsap/ScrollSmoother` | scroll | GSAP-native smooth scrolling with `data-speed`/`data-lag`. Requires ScrollTrigger. |
| ScrollToPlugin | `gsap/ScrollToPlugin` | scroll | Animate window/element scroll position. |
| SplitText | `gsap/SplitText` | text | Split into chars/words/lines; `autoSplit`, `mask`, `onSplit`. |
| ScrambleTextPlugin | `gsap/ScrambleTextPlugin` | text | Decode/scramble text. |
| TextPlugin | `gsap/TextPlugin` | text | Replace text content over time. |
| Flip | `gsap/Flip` | UI | FLIP layout transitions (`getState`, `from`, `batch`). |
| Draggable | `gsap/Draggable` | UI | Drag/spin/snap with bounds; needs explicit cleanup. |
| InertiaPlugin | `gsap/InertiaPlugin` | UI | Momentum/physics for Draggable and tweens. |
| Observer | `gsap/Observer` | UI | Unified wheel/touch/pointer intent detection. |
| DrawSVGPlugin | `gsap/DrawSVGPlugin` | SVG | Animate the visible portion of a stroke. |
| MorphSVGPlugin | `gsap/MorphSVGPlugin` | SVG | Morph between paths/shapes. |
| MotionPathPlugin | `gsap/MotionPathPlugin` | SVG | Move along a path; auto-rotate. |
| MotionPathHelper | `gsap/MotionPathHelper` | SVG | Dev-only interactive path editor. |
| CustomEase | `gsap/CustomEase` | easing | Arbitrary easing curves. |
| EasePack | `gsap/EasePack` | easing | RoughEase, ExpoScaleEase, SlowMo. |
| CustomWiggle | `gsap/CustomWiggle` | easing | Wiggle eases. |
| CustomBounce | `gsap/CustomBounce` | easing | Bounce eases with squash/stretch. |
| Physics2DPlugin | `gsap/Physics2DPlugin` | physics | Velocity, angle, gravity, friction. |
| PhysicsPropsPlugin | `gsap/PhysicsPropsPlugin` | physics | Physics on arbitrary numeric props. |
| GSDevTools | `gsap/GSDevTools` | dev | Timeline scrubber/inspector. Dev only. |
| PixiPlugin | `gsap/PixiPlugin` | rendering | Animate PixiJS display objects. |
| CSSRulePlugin | `gsap/CSSRulePlugin` | rendering | Animate CSS rules/pseudo-elements. |
| EaselPlugin | `gsap/EaselPlugin` | rendering | Animate CreateJS/EaselJS objects. |

### ScrollTrigger

```js
gsap.to(".panel", {
  xPercent: -100 * (panels.length - 1),
  ease: "none",
  scrollTrigger: {
    trigger: wrapper,
    pin: true,
    scrub: 1,
    snap: 1 / (panels.length - 1),
    anticipatePin: 1,
    invalidateOnRefresh: true,
    end: () => "+=" + container.offsetWidth, // re-measured on refresh
  },
});
```

Key options: `trigger`, `start`, `end`, `scrub`, `pin`, `pinSpacing`, `snap`,
`toggleActions`, `once`, `anticipatePin`, `invalidateOnRefresh`,
`refreshPriority`, `fastScrollEnd`, `containerAnimation`, `horizontal`,
`scroller`, `onEnter/onLeave/onEnterBack/onLeaveBack/onUpdate/onToggle/onRefresh`.

Rules:

- Never combine `scrub` with `toggleActions`; `scrub` wins.
- Measure inside `start`/`end` functions; a function that returns a cached number is still stale.
- Create triggers top-to-bottom, or set `refreshPriority` (higher = refreshed first).
- `ScrollTrigger.refresh()` after fonts, images, lazy content, or layout changes.
- `ScrollTrigger.config({ ignoreMobileResize: true })` avoids URL-bar thrash.
- `clamp(start)` / `clamp(end)` keeps above-the-fold triggers from starting part-scrubbed (3.12+).
- `ScrollTrigger.batch()` for grids/lists instead of one trigger per item.
- Pinned sections need `anticipatePin: 1` when a header precedes them.
- `ScrollTrigger.maxScroll(scroller)` is the safe upper bound for computed starts.

#### ScrollTrigger static API

| Call | Use |
| --- | --- |
| `create(vars)` | Standalone trigger without a tween. |
| `refresh(safe)` | Recalculate every trigger; `true` waits for a render tick. |
| `update()` | Re-check scroll position without recalculating start/end. |
| `getAll()` / `getById(id)` | Enumerate instances or fetch one by `vars.id`. |
| `killAll()` | Full teardown only — never per component. |
| `batch(targets, vars)` | Batched enter/leave callbacks for grids/lists. |
| `isScrolling()` | True while the scroller is moving. |
| `isInViewport(el, proportion, horizontal)` | Viewport membership test. |
| `positionInViewport(el, reference, horizontal)` | Position within the viewport (`0–1`). |
| `maxScroll(scroller, horizontal)` | Maximum scroll value. |
| `normalizeScroll(vars)` | Normalize address-bar/overscroll behavior; conflicts with Lenis. |
| `config(vars)` | Global config (`ignoreMobileResize`, `limitCallbacks`, `autoRefreshEvents`). |
| `defaults(vars)` | Defaults for future triggers. |
| `sort(fn)` | Refresh order. |
| `observe(vars)` | Observer wired to ScrollTrigger terminology. |
| `addEventListener` / `removeEventListener` | `refresh`, `refreshInit`, `scrollStart`, `scrollEnd`, `matchMedia`. |
| `clearScrollMemory()` / `saveStyles(targets)` | Scroll-position memory and inline-style snapshots. |
| `scrollerProxy(scroller, vars)` | Adapt a custom scroller. |
| `snapDirectional(increment)` | Direction-aware snap helper. |
| `matchMedia(vars)` / `clearMatchMedia(query)` | Legacy; use `gsap.matchMedia()`. |

`ScrollTrigger.isTouch` is a static property: `1` touch-only, `0` no touch,
`0.5` hybrid.

#### ScrollTrigger instance API

| Member | Use |
| --- | --- |
| `.refresh()` | Recalculate this trigger only. |
| `.enable(revert)` / `.disable(revert)` | Toggle without killing. |
| `.kill(revert, allowAnimation)` | Remove the trigger and pin. |
| `.getTween()` | Linked tween/timeline. |
| `.getVelocity()` | Current scroll velocity. |
| `.labelToScroll(label)` | Timeline label → scroll position. |
| `.next(vars)` / `.previous(vars)` | Snap navigation. |
| `.scroll(position)` | Scroll the scroller to a position. |
| `.animation`, `.direction`, `.start`, `.end`, `.isActive`, `.pin`, `.progress`, `.scroller`, `.trigger`, `.vars` | Live state. |

### Flip

```js
const state = Flip.getState(".card");
container.classList.toggle("is-list");
Flip.from(state, { duration: 0.6, ease: "power3.inOut", absolute: true, stagger: 0.03 });
```

Use Flip instead of animating `width`, `height`, `top`, or `left`. It also
handles enter/leave (`onEnter`, `onLeave`) and `batch()` for complex grids.

### Draggable

```js
const instances = Draggable.create(box, {
  type: "x,y",
  bounds: ".desktop",
  edgeResistance: 0.85,
  inertia: true, // requires InertiaPlugin
});
// cleanup:
instances.forEach((instance) => instance.kill());
```

- `Draggable.get(target)` returns the existing instance.
- `disable()`/`enable()` toggles interaction (useful while maximized).
- `gsap.context()` does **not** reliably kill Draggable. Always kill explicitly.
- `onPress`, `onDragStart`, `onDrag`, `onDragEnd`, `onClick` for behavior.

### SplitText

```js
const split = SplitText.create(heading, {
  type: "lines",
  autoSplit: true,
  mask: "lines",
  onSplit: (self) =>
    gsap.from(self.lines, { yPercent: 110, duration: 0.8, stagger: 0.08, ease: "power3.out" }),
});
// cleanup: split.revert();
```

- Create animations inside `onSplit` and return them; they replay after a re-split.
- `autoSplit: true` re-splits on font load/width changes.
- `mask: "lines"` (or `"words"`/`"chars"`) wraps pieces in overflow-hidden containers for clean reveals.
- Keep the accessible text intact; SplitText adds `aria` handling, but test with a screen reader.
- Revert on unmount — `useGSAP` handles it if the split is created in the hook.

### SVG

- **DrawSVG**: `drawSVG: "0%"` → `"100%"`; `DrawSVGPlugin.getLength(el)`.
- **MorphSVG** (3.14+):
  ```js
  gsap.to("#shape", {
    morphSVG: { shape: "#target", smooth: "auto", curveMode: true },
    duration: 1,
    ease: "power2.inOut",
  });
  ```
  `smooth` accepts a number, `"auto"`, or `{ points, redraw, persist }`.
  `curveMode` interpolates handle angle/length to avoid kinks.
  Convert primitives first: `MorphSVGPlugin.convertToPath("circle, rect")`.
  `shapeIndex` (number or array) fixes twisting; `type: "rotational"` is an alternative.
- **MotionPath**: `motionPath: { path: "#path", align: "#path", alignOrigin: [0.5, 0.5], autoRotate: true }`.
- **MotionPathHelper**: dev-only; never ship.

### Text

- **ScrambleText**: `scrambleText: { text: "DECRYPTED", chars: "01", revealDelay: 0.2, speed: 0.4 }`. Keep the final text in the DOM for accessibility.
- **TextPlugin**: `text: { value: "New copy", newClass: "is-new" }`. Text changes layout; refresh ScrollTrigger afterward.
- Prefer SplitText for per-character/line choreography; prefer ScrambleText for terminal effects.

### Plugin instance APIs

| Plugin | API | Use |
| --- | --- | --- |
| ScrollSmoother | `create(vars)`, `get()` | Create/retrieve the smoother. |
| ScrollSmoother | `.scrollTo(target, smooth, position)`, `.scrollTop(value)` | Programmatic scrolling. |
| ScrollSmoother | `.paused(value)`, `.smooth(value)`, `.offset(target, position)` | Runtime control and measurement. |
| ScrollSmoother | `.effects(targets, vars)`, `.kill()` | Apply speed/lag effects; destroy. |
| SplitText | `SplitText.create(target, vars)` | Preferred factory. |
| SplitText | `.split(vars)`, `.revert()` | Re-split or restore the original text. |
| SplitText | `.chars`, `.words`, `.lines`, `.masks` | Generated elements. |
| Flip | `getState(targets, vars)`, `from(state, vars)` | Capture and animate layout. |
| Flip | `batch(name)`, `fit(target, destination, vars)` | Coordinate batches; fit without a capture. |
| Flip | `makeAbsolute(targets)`, `isFlipping(target)` | Absolute containers; active-state check. |
| Draggable | `create(target, vars)`, `get(target)` | Create/retrieve instances. |
| Draggable | `hitTest(a, b, threshold)`, `isDragging(target)`, `isThrowing(target)` | Collision and state queries. |
| Draggable | `.kill()`, `.enable()`, `.disable()`, `.update()`, `.applyBounds()` | Lifecycle and bounds. |
| Draggable | `.startDrag(event)`, `.endDrag(event)`, `.getDirection()` | Programmatic dragging. |
| Draggable | `.x`, `.y`, `.rotation`, `.deltaX`, `.deltaY`, `.pointerX`, `.pointerY`, `.isDragging`, `.isThrowing`, `.isPressed` | Live state. |
| Observer | `Observer.create(vars)`; `.kill()`, `.enable()`, `.disable()` | Create and control. |
| Observer | `.deltaX`, `.deltaY`, `.velocityX`, `.velocityY`, `.isDragging`, `.isPressed`, `.event`, `.target` | Live gesture state. |
| InertiaPlugin | `track(targets, props)`, `getVelocity(target, prop)`, `isTracking(target, prop)` | Velocity tracking for inertia. |
| DrawSVGPlugin | `getLength(el)`, `getPosition(el)` | Measure the stroke. |
| MorphSVGPlugin | `convertToPath(targets, toSVG)` | Convert primitives to paths. |
| MorphSVGPlugin | `stringToRawPath`, `rawPathToString`, `getRawPath` | Raw path helpers. |
| MotionPathPlugin | `getRawPath(path)`, `convertToPath(targets)`, `arrayToRawPath(array)` | Path conversion. |
| MotionPathPlugin | `getRelativePosition(el, target, origin, targetOrigin)` | Offset between elements. |
| MotionPathPlugin | `getLength(path)`, `getPositionOnPath(path, progress)` | Measure/pick a point. |
| MotionPathHelper | `create(target, vars)` | Dev-only path editor. |
| CustomEase | `create(id, ease, vars)`, `getSVGData(ease, vars)` | Build/export custom curves. |
| CustomWiggle / CustomBounce | `create(name, vars)` | Build named wiggle/bounce eases. |
| GSDevTools | `create(vars)` | Dev-only timeline scrubber. |
| PixiPlugin | `registerPIXI(PIXI)` | Connect the PixiJS namespace. |
| CSSRulePlugin | `getRule(selector)` | Animate a CSS rule/pseudo-element. |

Tween-only plugins (ScrollTo, ScrambleText, Text, EasePack, Physics2D,
PhysicsProps, Easel) expose no callable API — drive them through their vars.

---

## 7. React

```js
import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function Panel() {
  const root = useRef(null);

  const { contextSafe } = useGSAP(
    () => {
      gsap.from(".card", { y: 24, autoAlpha: 0, stagger: 0.08 });
    },
    { scope: root }
  );

  const onClick = contextSafe(() => {
    gsap.to(".card", { scale: 1.02, duration: 0.2 });
  });

  return <div ref={root}><button onClick={onClick}>Pulse</button></div>;
}
```

- `useGSAP` is a `useLayoutEffect` replacement (falls back to `useEffect` on the server).
- It creates a `gsap.context()` and reverts it on unmount/dependency change.
- `scope` scopes selector strings; pass a ref, element, or selector.
- `dependencies` re-runs the hook; `revertOnUpdate: true` reverts before re-running.
- `contextSafe` wraps handlers created **after** the hook runs so their tweens join the context.
- `useGSAP` does not manage non-GSAP resources: remove DOM listeners, kill Draggable, revert Splits, cancel RAF loops, disconnect observers.
- Never touch `window`/`document` during render; do it inside the hook.

### React StrictMode

In development, effects mount → unmount → mount. `useGSAP` reverts cleanly, so
animations restart as expected. If a component creates non-GSAP resources, its
cleanup must be idempotent.

---

## 8. Performance and accessibility

- Animate `opacity` and `transform` (`x`, `y`, `scale`, `rotation`). Avoid
  `width`, `height`, `top`, `left`, `margin`, `padding`, and animated `filter`.
- Add `will-change: transform` only while animating; remove it on completion
  (`clearProps: "willChange"`) so GPU memory does not accumulate.
- Use `gsap.quickTo` for pointer followers, not a new tween per event.
- Batch DOM reads/writes. Do not call `getBoundingClientRect()` in `onUpdate`.
- Use one ticker: `gsap.ticker` (Lenis integration lives here). Do not start a
  second RAF loop for scroll work.
- ScrollTrigger: `invalidateOnRefresh` for layout-dependent animations;
  `fastScrollEnd` for long scrubs; `batch` for lists.
- Reduced motion: `gsap.matchMedia()` or a `prefers-reduced-motion` branch that
  renders the final state without transforms.
- Touch/low-power devices: skip pinning, scrubbing, and heavy 3D; provide a
  static layout. This repo's `src/lib/motion.ts` centralizes the checks.
- Do not animate `filter: blur()`; cross-fade a static blur layer if needed.
- Cap particles (this repo: 8 hero particles) and avoid WebGL stacks on mobile.
- Test at 4× CPU throttling and with `prefers-reduced-motion: reduce`.

---

## 9. Release deltas worth knowing

### 3.15.0 — 2026-04-13

- **`easeReverse`** — adaptive directional easing. `true` reuses the forward
  ease, adapted for reverse; a string sets the reverse feel. Works on tweens and
  timeline defaults.
- **`yoyoEase` deprecated** — still functional, mapped to `easeReverse`.

### 3.14.0 — 2025-12-08

- **MorphSVG `smooth`** — number, `"auto"`, or `{ points, redraw, persist }`.
- **MorphSVG `curveMode`** — interpolates control-handle angle/length to avoid kinks.
- MorphSVG anchor distribution improved even without `smooth`.
- All formerly Club plugins are free in the public package.

### 3.13.0 — 2025-04-29

- **SplitText** `autoSplit`, `onSplit`, `mask`, `smartWrap`, `SplitText.create()`.
- Every plugin free for commercial use.

### 3.12.0 — 2023-05-19

- ScrollTrigger `clamp()` start/end.
- ScrollSmoother `speed` and `clamp(data-speed)`.

### 3.11.0 — 2022-08-15

- `gsap.matchMedia()` and `gsap.context()`; universal `revert()`.

---

## 10. Choosing the right tool

| Need | Use |
| --- | --- |
| One-off entrance | `gsap.from` / `gsap.fromTo` |
| Sequence with overlaps | `gsap.timeline` + position parameter |
| Scroll-linked progress | ScrollTrigger `scrub` |
| Play once on enter | ScrollTrigger `toggleActions` / `once` |
| Pinned horizontal section | ScrollTrigger `pin` + `containerAnimation`/`xPercent` |
| Layout change (grid/list, expand) | Flip |
| Drag window/card | Draggable (+ Inertia) |
| Gesture intent without hijacking scroll | Observer |
| Text line/char reveal | SplitText |
| Terminal decode | ScrambleTextPlugin |
| SVG line drawing | DrawSVGPlugin |
| Shape morph | MorphSVGPlugin (`smooth`/`curveMode` when jagged) |
| Move along a path | MotionPathPlugin |
| Custom curve | CustomEase |
| Reversible drawer/modal | timeline + `easeReverse` |
| Smooth scrolling | Lenis (this repo) **or** ScrollSmoother, never both |
| Cursor follower | `gsap.quickTo` |
| Many cards revealing | `ScrollTrigger.batch` |
| Count-up numbers | tween a proxy object + `onUpdate` writing to a ref (not `setState` per frame) |

---

## 11. Anti-patterns and migrations

| Anti-pattern | Replace with |
| --- | --- |
| `ScrollTrigger.matchMedia()` | `gsap.matchMedia()` |
| `yoyoEase` in new code | `easeReverse` |
| `end: () => "+=" + cachedWidth` | measure inside: `end: () => "+=" + el.offsetWidth` |
| `scrub` + `toggleActions` | pick one |
| `useGSAP` selector without `scope` | `{ scope: ref }` |
| `Draggable.create()` with no cleanup | store instances, `kill()` on unmount |
| `ScrollTrigger.getAll().forEach(kill)` | kill only this component's triggers / `useGSAP` |
| `onUpdate: () => setState(...)` | write to a ref/DOM; setState only on change |
| Animating `height`/`width` | transform + Flip |
| Animating `filter: blur()` | opacity/transform cross-fade |
| `from()` with `immediateRender: false` surprises | `fromTo()` for deterministic states |
| Multiple RAF loops | one `gsap.ticker` |
| `gsap.globalTimeline.pause()` for one modal | pause that timeline only |
| Forgetting `split.revert()` | `useGSAP` or explicit cleanup |
| Importing GSDevTools in production | dev-only dynamic import |

---

## 12. This repository's conventions

- **Smooth scroll**: Lenis in `src/components/SmoothScroll.tsx`, driven by
  `gsap.ticker` and wired to `ScrollTrigger.update`. Disabled on admin/student
  routes, touch, low-power, reduced-motion, and `<1024px`. Do not add ScrollSmoother.
- **Refresh policy**: `ignoreMobileResize: true`; refresh after `document.fonts.ready`,
  window `load`, debounced resize, and a 1.2s settle timer for lazy sections.
- **Shared reveal primitives**: `src/components/animation/GSAPResponsiveReveal.tsx`
  (`GSAPDecryptText`, `GSAPMagnetic`, `GSAPButtonHaptic`, `GSAPCard3DTilt`,
  `GSAPScrollReveal`). Reuse before adding a new reveal.
- **Motion helpers**: `src/lib/motion.ts` (`prefersReducedMotion`, `isTouchLike`,
  `isLowPowerDevice`, `revealWatchdog`).
- **Vendored ReactBits**: `src/components/reactbits/**` is third-party, excluded
  from ESLint, and should be treated as read-only except for narrow fixes.
- **Boot sequence**: `src/components/loading/BootScreen.tsx` uses an imperative
  `gsap.context` + `requestAnimationFrame` orchestration and calls
  `ScrollTrigger.refresh()` on exit. It is intentionally not a `useGSAP` effect;
  keep its cleanup intact.
- **MCP**: `tools/gsap-mcp/` exposes the knowledge base and auditor. See
  `docs/GSAP-WEBSITE-MAP.md` and the `gsap-mastery` skill.

---

## 13. Local tooling

```bash
node tools/gsap-mcp/cli.mjs audit src          # findings by severity
node tools/gsap-mcp/cli.mjs map src            # plugin/technique inventory
node tools/gsap-mcp/cli.mjs lookup "easeReverse"
node tools/gsap-mcp/cli.mjs snippet horizontal-pin
node tools/gsap-mcp/test/client.mjs            # MCP protocol self-test
```

MCP tools: `gsap_capabilities`, `gsap_lookup`, `gsap_audit`, `gsap_project_map`,
`gsap_snippet`, `gsap_review`.

The knowledge base lives in `tools/gsap-mcp/lib/knowledge.mjs`; audit rules in
`tools/gsap-mcp/lib/audit.mjs`. Update both when a new GSAP release changes the
surface.
