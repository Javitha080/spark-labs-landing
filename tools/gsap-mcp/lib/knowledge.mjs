/**
 * GSAP 3.15 knowledge base for the local GSAP MCP server.
 *
 * Kept dependency-free and offline on purpose: the MCP must answer instantly,
 * work on a locked-down Windows box, and never drift with a remote API.
 * Docs URLs are canonical gsap.com links so tools can always expand on a hit.
 */

export const GSAP_VERSION = '3.15.0';
export const GSAP_RELEASED = '2026-04-13';

const DOC = {
  core: 'https://gsap.com/docs/v3/GSAP/',
  tween: 'https://gsap.com/docs/v3/GSAP/Tween',
  timeline: 'https://gsap.com/docs/v3/GSAP/Timeline',
  context: 'https://gsap.com/docs/v3/GSAP/gsap.context()',
  matchMedia: 'https://gsap.com/docs/v3/GSAP/gsap.matchMedia()',
  quickTo: 'https://gsap.com/docs/v3/GSAP/gsap.quickTo()',
  ticker: 'https://gsap.com/docs/v3/GSAP/gsap.ticker()',
  utils: 'https://gsap.com/docs/v3/GSAP/UtilityMethods',
  eases: 'https://gsap.com/docs/v3/Eases',
  plugins: 'https://gsap.com/docs/v3/Plugins/',
  react: 'https://gsap.com/resources/React',
  cheatsheet: 'https://gsap.com/cheatsheet/',
  demos: 'https://demos.gsap.com/',
};

export const CORE = [
  {
    name: 'gsap.to()',
    signature: 'gsap.to(targets, vars)',
    summary: 'Animate from current values to the values in vars. The default workhorse tween.',
    keywords: ['tween', 'to', 'animate', 'css', 'transform'],
    docs: DOC.tween,
  },
  {
    name: 'gsap.from()',
    signature: 'gsap.from(targets, vars)',
    summary: 'Animate from the values in vars to the current values. Great for entrances; immediateRender is true by default.',
    keywords: ['tween', 'from', 'entrance', 'reveal'],
    docs: DOC.tween,
  },
  {
    name: 'gsap.fromTo()',
    signature: 'gsap.fromTo(targets, fromVars, toVars)',
    summary: 'Explicit start and end values. Use when the current state is unknown or when you need deterministic resets.',
    keywords: ['tween', 'fromTo', 'reset', 'deterministic'],
    docs: DOC.tween,
  },
  {
    name: 'gsap.set()',
    signature: 'gsap.set(targets, vars)',
    summary: 'Immediately apply values with no animation. Ideal for initial states and clearProps resets.',
    keywords: ['set', 'instant', 'initial', 'clearProps'],
    docs: DOC.tween,
  },
  {
    name: 'gsap.timeline()',
    signature: 'gsap.timeline(vars)',
    summary: 'Sequence tweens with the position parameter, labels, nesting, and full playback control.',
    keywords: ['timeline', 'sequence', 'choreography', 'labels', 'position'],
    docs: DOC.timeline,
  },
  {
    name: 'gsap.delayedCall()',
    signature: 'gsap.delayedCall(delay, callback, params, scope)',
    summary: 'A cancellable timer on the GSAP ticker, synchronized with the rest of the animation system.',
    keywords: ['delay', 'timer', 'callback', 'scheduled'],
    docs: DOC.core,
  },
  {
    name: 'gsap.quickTo()',
    signature: 'gsap.quickTo(target, property, vars)',
    summary: 'Returns a reusable setter that redirects one property quickly. Best for pointer followers and rapid updates.',
    keywords: ['quickTo', 'performance', 'pointer', 'cursor', 'follow'],
    docs: DOC.quickTo,
  },
  {
    name: 'gsap.quickSetter()',
    signature: 'gsap.quickSetter(target, property, unit)',
    summary: 'A lower-level, faster setter without easing. Use only when you already compute the final value.',
    keywords: ['quickSetter', 'performance', 'setter'],
    docs: DOC.quickTo,
  },
  {
    name: 'gsap.context()',
    signature: 'gsap.context(func, scope)',
    summary: 'Collects animations and ScrollTriggers created during func so ctx.revert() cleans all of them up at once. Scopes selector strings when scope is passed.',
    keywords: ['context', 'cleanup', 'revert', 'scope', 'react'],
    docs: DOC.context,
  },
  {
    name: 'gsap.matchMedia()',
    signature: 'gsap.matchMedia()',
    summary: 'Runs setup only while a media query matches; reverts automatically when it stops matching. Use for breakpoints and prefers-reduced-motion.',
    keywords: ['matchMedia', 'responsive', 'reduced motion', 'accessibility', 'breakpoints'],
    docs: DOC.matchMedia,
  },
  {
    name: 'gsap.matchMediaRefresh()',
    signature: 'gsap.matchMediaRefresh()',
    summary: 'Reverts and re-runs every gsap.matchMedia() context. Use after a forced layout change when breakpoint state may be stale.',
    keywords: ['matchMediaRefresh', 'matchMedia', 'responsive', 'refresh', 'breakpoints'],
    docs: DOC.matchMedia,
  },
  {
    name: 'gsap.registerPlugin()',
    signature: 'gsap.registerPlugin(...plugins)',
    summary: 'Registers plugins once per app. Required before using plugin-specific properties or APIs.',
    keywords: ['register', 'plugin', 'setup'],
    docs: DOC.plugins,
  },
  {
    name: 'gsap.registerEffect()',
    signature: 'gsap.registerEffect({ name, effect, defaults, extendTimeline })',
    summary: 'Package a reusable animation recipe and call it with gsap.effects.name(...) or from a timeline.',
    keywords: ['effect', 'reusable', 'recipe', 'registerEffect'],
    docs: DOC.core,
  },
  {
    name: 'gsap.effects',
    signature: 'gsap.effects.name(targets, vars)',
    summary: 'Registry of effects created by gsap.registerEffect(). Each effect is also available as a timeline method when extendTimeline is true.',
    keywords: ['effects', 'registerEffect', 'registry', 'reusable'],
    docs: 'https://gsap.com/docs/v3/GSAP/gsap.effects',
  },
  {
    name: 'gsap.registerEase()',
    signature: 'gsap.registerEase(name, ease)',
    summary: 'Register a named ease function globally so it can be referenced by string anywhere, including timeline defaults.',
    keywords: ['registerEase', 'ease', 'custom ease', 'register'],
    docs: 'https://gsap.com/docs/v3/GSAP/gsap.registerEase()',
  },
  {
    name: 'gsap.exportRoot()',
    signature: 'gsap.exportRoot(vars, includeDelayedCalls)',
    summary: 'Wraps every existing root tween/timeline into a new timeline so you can pause, slow, or reverse all current motion without affecting animations created afterwards.',
    keywords: ['exportRoot', 'global', 'pause all', 'timeScale', 'root'],
    docs: 'https://gsap.com/docs/v3/GSAP/gsap.exportRoot()',
  },
  {
    name: 'gsap.updateRoot()',
    signature: 'gsap.updateRoot(time)',
    summary: 'Advanced: moves the root timeline playhead to a specific time. Intended for custom render loops and virtual time, not normal app code.',
    keywords: ['updateRoot', 'root', 'playhead', 'advanced', 'virtual time'],
    docs: 'https://gsap.com/docs/v3/GSAP/gsap.updateRoot()',
  },
  {
    name: 'gsap.getById()',
    signature: 'gsap.getById(id)',
    summary: 'Returns the tween or timeline whose vars.id matches, or undefined. Useful for debug handles without keeping a global reference.',
    keywords: ['getById', 'id', 'lookup', 'debug'],
    docs: 'https://gsap.com/docs/v3/GSAP/gsap.getById()',
  },
  {
    name: 'gsap.isTweening()',
    signature: 'gsap.isTweening(target, properties)',
    summary: 'Returns true while any tween is actively animating the target (optionally only the given properties). Ignores paused tweens.',
    keywords: ['isTweening', 'check', 'active', 'state'],
    docs: 'https://gsap.com/docs/v3/GSAP/gsap.isTweening()',
  },
  {
    name: 'gsap.parseEase()',
    signature: 'gsap.parseEase(ease)',
    summary: 'Converts an ease name or config into the underlying ease function. Useful when passing eases to non-GSAP code.',
    keywords: ['parseEase', 'ease', 'function', 'convert'],
    docs: 'https://gsap.com/docs/v3/GSAP/gsap.parseEase()',
  },
  {
    name: 'gsap.version',
    signature: 'gsap.version',
    summary: 'The running GSAP version string (e.g. "3.15.0"). Handy for diagnostics and feature gates.',
    keywords: ['version', 'diagnostics', 'release'],
    docs: 'https://gsap.com/docs/v3/GSAP/gsap.version',
  },
  {
    name: 'gsap.ticker',
    signature: 'gsap.ticker.add(fn) / remove(fn) / fps() / lagSmoothing()',
    summary: 'The single requestAnimationFrame loop that drives GSAP. Integrate virtual scrollers (e.g. Lenis) here instead of starting another RAF loop.',
    keywords: ['ticker', 'raf', 'lenis', 'smooth scroll', 'fps'],
    docs: DOC.ticker,
  },
  {
    name: 'gsap.config()',
    signature: 'gsap.config({ autoSleep, force3D, nullTargetWarn, units })',
    summary: 'Global engine settings. Prefer per-tween values unless the whole app needs the same behavior.',
    keywords: ['config', 'global', 'force3D', 'settings'],
    docs: DOC.core,
  },
  {
    name: 'gsap.defaults()',
    signature: 'gsap.defaults({ duration, ease, ... })',
    summary: 'Set default vars inherited by every tween created afterwards.',
    keywords: ['defaults', 'global', 'duration', 'ease'],
    docs: DOC.core,
  },
  {
    name: 'gsap.getProperty() / gsap.setProperty()',
    signature: 'gsap.getProperty(target, property, unit)',
    summary: 'Read or write a single property without creating a tween, including transform aliases and CSS variables.',
    keywords: ['getProperty', 'setProperty', 'read', 'css variable'],
    docs: DOC.core,
  },
  {
    name: 'gsap.getTweensOf() / gsap.killTweensOf()',
    signature: 'gsap.getTweensOf(targets) / gsap.killTweensOf(targets, properties)',
    summary: 'Inspect or kill tweens that target specific elements. Prefer scoped cleanup over global kills.',
    keywords: ['getTweensOf', 'killTweensOf', 'cleanup', 'overwrite'],
    docs: DOC.core,
  },
  {
    name: 'gsap.globalTimeline',
    signature: 'gsap.globalTimeline',
    summary: 'The root timeline. Useful for pausing all animation, but almost never for killing individual component work.',
    keywords: ['globalTimeline', 'global', 'pause', 'root'],
    docs: DOC.core,
  },
  {
    name: 'gsap.install()',
    signature: 'gsap.install(target)',
    summary: 'Advanced/rare: copies the gsap globals onto another object and returns it. Only for wrapper libraries that need a second gsap-shaped namespace.',
    keywords: ['install', 'advanced', 'wrapper', 'namespace'],
    docs: 'https://gsap.com/docs/v3/GSAP/gsap.install()',
  },
];

export const PLUGINS = [
  {
    name: 'ScrollTrigger',
    import: 'gsap/ScrollTrigger',
    category: 'scroll',
    summary: 'Scroll-linked animation, pinning, scrubbing, snapping, batching, and viewport callbacks.',
    keyOptions: ['trigger', 'start', 'end', 'scrub', 'pin', 'snap', 'toggleActions', 'invalidateOnRefresh', 'refreshPriority', 'anticipatePin', 'fastScrollEnd', 'once', 'containerAnimation'],
    notes: 'Never combine scrub with toggleActions. Create top-to-bottom or set refreshPriority. Call ScrollTrigger.refresh() after fonts/images/dynamic layout.',
    docs: 'https://gsap.com/docs/v3/Plugins/ScrollTrigger/',
  },
  {
    name: 'ScrollSmoother',
    import: 'gsap/ScrollSmoother',
    category: 'scroll',
    summary: 'GSAP-native smooth scrolling with data-speed/data-lag effects. Requires ScrollTrigger.',
    keyOptions: ['wrapper', 'content', 'smooth', 'smoothTouch', 'effects', 'normalizeScroll', 'speed'],
    notes: 'Do not pair with another virtual scroller (Lenis) on the same page. This repo uses Lenis instead.',
    docs: 'https://gsap.com/docs/v3/Plugins/ScrollSmoother/',
  },
  {
    name: 'ScrollToPlugin',
    import: 'gsap/ScrollToPlugin',
    category: 'scroll',
    summary: 'Animate the scroll position of the window or a scrollable element.',
    keyOptions: ['y', 'x', 'offsetY', 'autoKill', 'onAutoKill'],
    notes: 'Use for in-page navigation; keep native anchor behavior and focus management intact.',
    docs: 'https://gsap.com/docs/v3/Plugins/ScrollToPlugin/',
  },
  {
    name: 'SplitText',
    import: 'gsap/SplitText',
    category: 'text',
    summary: 'Split text into chars, words, and/or lines for staggered reveals, with autoSplit and masking support.',
    keyOptions: ['type', 'autoSplit', 'onSplit', 'mask', 'smartWrap', 'linesClass', 'wordsClass', 'charsClass', 'aria'],
    notes: 'Create animations inside onSplit() and return them so re-splits stay in sync. Revert on unmount (useGSAP does it automatically).',
    docs: 'https://gsap.com/docs/v3/Plugins/SplitText/',
  },
  {
    name: 'ScrambleTextPlugin',
    import: 'gsap/ScrambleTextPlugin',
    category: 'text',
    summary: 'Scramble/decode text characters with configurable speed, reveal delay, and character set.',
    keyOptions: ['text', 'chars', 'revealDelay', 'speed', 'delimiter', 'tweenLength'],
    notes: 'Great for terminal/cyber headings; keep the final text in the DOM for accessibility and reduce it for prefers-reduced-motion.',
    docs: 'https://gsap.com/docs/v3/Plugins/ScrambleTextPlugin/',
  },
  {
    name: 'TextPlugin',
    import: 'gsap/TextPlugin',
    category: 'text',
    summary: 'Replace text content over time, optionally with class changes for old/new text.',
    keyOptions: ['text', 'newClass', 'oldClass', 'preserveSpaces'],
    notes: 'Text replacement changes layout; measure and refresh ScrollTrigger if the element affects page height.',
    docs: 'https://gsap.com/docs/v3/Plugins/TextPlugin/',
  },
  {
    name: 'Flip',
    import: 'gsap/Flip',
    category: 'ui',
    summary: 'FLIP layout transitions: capture state, change the DOM, then animate from the previous layout.',
    keyOptions: ['getState', 'from', 'batch', 'fit', 'absolute', 'props', 'scale', 'simple', 'nested', 'targets'],
    notes: 'The safest way to animate layout changes (grid/list, expand/collapse) without animating width/height directly.',
    docs: 'https://gsap.com/docs/v3/Plugins/Flip/',
  },
  {
    name: 'Draggable',
    import: 'gsap/Draggable',
    category: 'ui',
    summary: 'Drag, spin, snap, and bounds-aware interaction for DOM, SVG, and canvas targets.',
    keyOptions: ['type', 'bounds', 'trigger', 'edgeResistance', 'inertia', 'snap', 'liveSnap', 'allowNativeTouchScrolling', 'onDragStart', 'onDragEnd'],
    notes: 'Store the returned instance(s) and kill them on unmount. gsap.context() does not reliably kill Draggable instances.',
    docs: 'https://gsap.com/docs/v3/Plugins/Draggable/',
  },
  {
    name: 'InertiaPlugin',
    import: 'gsap/InertiaPlugin',
    category: 'ui',
    summary: 'Momentum/physics for Draggable and standalone tweens, with velocity tracking and resistance.',
    keyOptions: ['inertia', 'velocity', 'resistance', 'min', 'max', 'end', 'linked'],
    notes: 'Requires registration alongside Draggable. Prefer inertia over re-implementing throw physics.',
    docs: 'https://gsap.com/docs/v3/Plugins/InertiaPlugin/',
  },
  {
    name: 'Observer',
    import: 'gsap/Observer',
    category: 'ui',
    summary: 'Unified pointer, wheel, touch, and scroll intent detection with direction callbacks.',
    keyOptions: ['type', 'onChange', 'onUp', 'onDown', 'onLeft', 'onRight', 'tolerance', 'lockAxis', 'preventDefault', 'wheelSpeed', 'dragMinimum'],
    notes: 'Useful for gesture-driven sections and horizontal snap navigation without hijacking native scroll globally.',
    docs: 'https://gsap.com/docs/v3/Plugins/Observer/',
  },
  {
    name: 'DrawSVGPlugin',
    import: 'gsap/DrawSVGPlugin',
    category: 'svg',
    summary: 'Animate the visible segment of an SVG stroke for line drawing and progress effects.',
    keyOptions: ['drawSVG', 'getLength', 'getPosition'],
    notes: 'Only affects stroke, not fill. Prefer single-segment paths for predictable rendering.',
    docs: 'https://gsap.com/docs/v3/Plugins/DrawSVGPlugin/',
  },
  {
    name: 'MorphSVGPlugin',
    import: 'gsap/MorphSVGPlugin',
    category: 'svg',
    summary: 'Morph between SVG paths/shapes with automatic point matching.',
    keyOptions: ['morphSVG', 'shape', 'shapeIndex', 'map', 'type', 'smooth', 'curveMode', 'render', 'updateTarget'],
    notes: 'GSAP 3.14 adds smooth (number | "auto" | {points, redraw}) and curveMode for kink-free morphs. Convert circle/rect/ellipse/line with MorphSVGPlugin.convertToPath().',
    docs: 'https://gsap.com/docs/v3/Plugins/MorphSVGPlugin/',
  },
  {
    name: 'MotionPathPlugin',
    import: 'gsap/MotionPathPlugin',
    category: 'svg',
    summary: 'Move elements along an SVG path or point array with alignment and auto-rotation.',
    keyOptions: ['path', 'align', 'alignOrigin', 'autoRotate', 'start', 'end', 'curviness', 'resolution'],
    notes: 'Use MotionPathHelper during development to tune alignment; remove the helper in production.',
    docs: 'https://gsap.com/docs/v3/Plugins/MotionPathPlugin/',
  },
  {
    name: 'MotionPathHelper',
    import: 'gsap/MotionPathHelper',
    category: 'svg',
    summary: 'Interactive visual editor for MotionPath alignment, start/end, and rotation.',
    keyOptions: ['create'],
    notes: 'Development-only tool; keep it out of production bundles.',
    docs: 'https://gsap.com/docs/v3/Plugins/MotionPathHelper/',
  },
  {
    name: 'CustomEase',
    import: 'gsap/CustomEase',
    category: 'easing',
    summary: 'Create arbitrary cubic-bezier or SVG-path easing curves.',
    keyOptions: ['create', 'getSVGData', 'map'],
    notes: 'Use only when built-in eases cannot express the motion; name curves for reuse.',
    docs: 'https://gsap.com/docs/v3/Plugins/CustomEase/',
  },
  {
    name: 'EasePack',
    import: 'gsap/EasePack',
    category: 'easing',
    summary: 'RoughEase, ExpoScaleEase, and SlowMo eases in one plugin.',
    keyOptions: ['RoughEase', 'ExpoScaleEase', 'SlowMo'],
    notes: 'RoughEase suits organic jitter; SlowMo amplifies or reduces initial velocity; ExpoScaleEase fixes scale-easing perception.',
    docs: 'https://gsap.com/docs/v3/Plugins/EasePack/',
  },
  {
    name: 'CustomWiggle',
    import: 'gsap/CustomWiggle',
    category: 'easing',
    summary: 'Create wiggle eases with configurable wiggles and type (easeOut, easeInOut, anticipate, random, etc.).',
    keyOptions: ['create', 'wiggles', 'type', 'amplitude'],
    notes: 'Best for attention shakes and playful micro-interactions; respect reduced motion.',
    docs: 'https://gsap.com/docs/v3/Plugins/CustomWiggle/',
  },
  {
    name: 'CustomBounce',
    import: 'gsap/CustomBounce',
    category: 'easing',
    summary: 'Create bounce eases with squash/stretch support.',
    keyOptions: ['create', 'strength', 'endAtStart', 'squash'],
    notes: 'The squash effect requires an extra DOM element; animate transform only.',
    docs: 'https://gsap.com/docs/v3/Plugins/CustomBounce/',
  },
  {
    name: 'Physics2DPlugin',
    import: 'gsap/Physics2DPlugin',
    category: 'physics',
    summary: '2D velocity, angle, gravity, and friction for particles and throw effects.',
    keyOptions: ['velocity', 'angle', 'gravity', 'friction'],
    notes: 'Use for canvas/DOM particle bursts; cap particle count and respect reduced motion.',
    docs: 'https://gsap.com/docs/v3/Plugins/Physics2DPlugin/',
  },
  {
    name: 'PhysicsPropsPlugin',
    import: 'gsap/PhysicsPropsPlugin',
    category: 'physics',
    summary: 'Physics-based animation of arbitrary numeric properties with velocity/acceleration/friction.',
    keyOptions: ['physicsProps', 'velocity', 'acceleration', 'friction'],
    notes: 'Niche; prefer InertiaPlugin for UI momentum and Draggable.',
    docs: 'https://gsap.com/docs/v3/Plugins/PhysicsPropsPlugin/',
  },
  {
    name: 'GSDevTools',
    import: 'gsap/GSDevTools',
    category: 'dev',
    summary: 'Visual timeline scrubber, global speed control, and animation inspector.',
    keyOptions: ['create', 'animation', 'paused', 'timeScale'],
    notes: 'Development-only. Guard imports so it never ships to production.',
    docs: 'https://gsap.com/docs/v3/Plugins/GSDevTools/',
  },
  {
    name: 'PixiPlugin',
    import: 'gsap/PixiPlugin',
    category: 'rendering',
    summary: 'Animate PixiJS display objects with GSAP (position, scale, tint, alpha, etc.).',
    keyOptions: ['pixi', 'tint', 'alpha'],
    notes: 'Useful for WebGL/canvas app UIs; not needed for DOM-only sites.',
    docs: 'https://gsap.com/docs/v3/Plugins/PixiPlugin/',
  },
  {
    name: 'CSSRulePlugin',
    import: 'gsap/CSSRulePlugin',
    category: 'rendering',
    summary: 'Animate CSS rules (e.g. pseudo-elements) directly instead of DOM nodes.',
    keyOptions: ['getRule'],
    notes: 'Use sparingly; pseudo-element animation can be harder to debug and test.',
    docs: 'https://gsap.com/docs/v3/Plugins/CSSRulePlugin/',
  },
  {
    name: 'EaselPlugin',
    import: 'gsap/EaselPlugin',
    category: 'rendering',
    summary: 'Animate CreateJS/EaselJS display objects with GSAP.',
    keyOptions: ['createjs'],
    notes: 'Legacy canvas stack; only relevant to existing CreateJS projects.',
    docs: 'https://gsap.com/docs/v3/Plugins/EaselPlugin/',
  },
];

/**
 * Callable APIs that are not tween vars. Tween-level properties stay in
 * PLUGINS[].keyOptions; this covers statics, instance methods, and properties.
 */
export const PLUGIN_API = [
  {
    plugin: 'ScrollTrigger',
    docs: 'https://gsap.com/docs/v3/Plugins/ScrollTrigger/',
    statics: [
      { name: 'ScrollTrigger.create(vars)', summary: 'Create a standalone trigger without attaching it to a tween.' },
      { name: 'ScrollTrigger.refresh(safe)', summary: 'Recalculate every trigger position. Pass true to wait for a render tick.' },
      { name: 'ScrollTrigger.update()', summary: 'Re-check scroll position and fire callbacks without recalculating start/end.' },
      { name: 'ScrollTrigger.getAll()', summary: 'Return every live ScrollTrigger instance.' },
      { name: 'ScrollTrigger.getById(id)', summary: 'Return the trigger whose vars.id matches.' },
      { name: 'ScrollTrigger.killAll()', summary: 'Kill every trigger. Full teardown only, never per component.' },
      { name: 'ScrollTrigger.batch(targets, vars)', summary: 'Group enter/leave callbacks so many elements animate in one batch.' },
      { name: 'ScrollTrigger.isScrolling()', summary: 'True while the scroller is moving.' },
      { name: 'ScrollTrigger.isInViewport(el, proportion, horizontal)', summary: 'True when the element is inside the viewport.' },
      { name: 'ScrollTrigger.positionInViewport(el, reference, horizontal)', summary: 'Where the element sits in the viewport (0–1).' },
      { name: 'ScrollTrigger.maxScroll(scroller, horizontal)', summary: 'Maximum scroll value; safe upper bound for computed starts.' },
      { name: 'ScrollTrigger.normalizeScroll(vars)', summary: 'Normalize address-bar/overscroll behavior. Conflicts with Lenis; pick one strategy.' },
      { name: 'ScrollTrigger.config(vars)', summary: 'Global config: ignoreMobileResize, limitCallbacks, autoRefreshEvents.' },
      { name: 'ScrollTrigger.defaults(vars)', summary: 'Defaults applied to future triggers.' },
      { name: 'ScrollTrigger.sort(fn)', summary: 'Control refresh order (default is creation order).' },
      { name: 'ScrollTrigger.observe(vars)', summary: 'Create an Observer wired to ScrollTrigger terminology.' },
      { name: 'ScrollTrigger.addEventListener(type, fn)', summary: 'Listen for refresh, refreshInit, scrollStart, scrollEnd, or matchMedia.' },
      { name: 'ScrollTrigger.removeEventListener(type, fn)', summary: 'Remove a listener added with addEventListener().' },
      { name: 'ScrollTrigger.clearScrollMemory()', summary: 'Forget saved scroll positions used during refresh.' },
      { name: 'ScrollTrigger.saveStyles(targets)', summary: 'Record inline styles so refresh can restore them.' },
      { name: 'ScrollTrigger.scrollerProxy(scroller, vars)', summary: 'Adapt a custom scroller (virtual list, iframe) to ScrollTrigger.' },
      { name: 'ScrollTrigger.snapDirectional(increment)', summary: 'Build a snap function that respects scroll direction.' },
      { name: 'ScrollTrigger.matchMedia(vars)', summary: 'Legacy API. Use gsap.matchMedia() instead.' },
      { name: 'ScrollTrigger.clearMatchMedia(query)', summary: 'Legacy cleanup for ScrollTrigger.matchMedia().' },
    ],
    methods: [
      { name: '.refresh()', summary: 'Recalculate this trigger only.' },
      { name: '.enable(revert)', summary: 'Re-enable a disabled trigger.' },
      { name: '.disable(revert)', summary: 'Disable callbacks/animation without killing the trigger.' },
      { name: '.kill(revert, allowAnimation)', summary: 'Remove the trigger and its pin; optionally revert inline styles.' },
      { name: '.getTween()', summary: 'Return the linked tween/timeline, if any.' },
      { name: '.getVelocity()', summary: 'Current scroll velocity.' },
      { name: '.labelToScroll(label)', summary: 'Convert a timeline label to a scroll position.' },
      { name: '.next(vars)', summary: 'Scroll to the next snap point.' },
      { name: '.previous(vars)', summary: 'Scroll to the previous snap point.' },
      { name: '.scroll(position)', summary: 'Scroll the scroller to a position (number or "max").' },
    ],
    properties: [
      { name: '.animation', summary: 'The linked tween/timeline.' },
      { name: '.direction', summary: '1 while scrolling down, -1 while scrolling up.' },
      { name: '.start / .end', summary: 'Resolved start and end scroll positions.' },
      { name: '.isActive', summary: 'True while between start and end.' },
      { name: '.pin', summary: 'The pinned element, if any.' },
      { name: '.progress', summary: '0–1 progress between start and end.' },
      { name: '.scroller', summary: 'The scroller element/window.' },
      { name: '.trigger', summary: 'The trigger element.' },
      { name: '.vars', summary: 'The original configuration object.' },
      { name: 'ScrollTrigger.isTouch', summary: '1 = touch-only, 0 = no touch, 0.5 = hybrid.' },
    ],
  },
  {
    plugin: 'ScrollSmoother',
    docs: 'https://gsap.com/docs/v3/Plugins/ScrollSmoother/',
    statics: [
      { name: 'ScrollSmoother.create(vars)', summary: 'Create the smoother; requires ScrollTrigger registered.' },
      { name: 'ScrollSmoother.get()', summary: 'Return the active instance, if any.' },
    ],
    methods: [
      { name: '.paused(value)', summary: 'Pause or resume smoothing (does not stop native scroll).' },
      { name: '.scrollTo(target, smooth, position)', summary: 'Animate to an element, selector, or numeric position.' },
      { name: '.scrollTop(value)', summary: 'Get or set the smoothed scroll position.' },
      { name: '.offset(target, position)', summary: 'Measure the offset of an element within the content.' },
      { name: '.smooth(value)', summary: 'Get or set the smoothness amount at runtime.' },
      { name: '.effects(targets, vars)', summary: 'Apply data-speed/data-lag-style effects to elements.' },
      { name: '.kill()', summary: 'Destroy the instance and restore native scrolling.' },
    ],
    properties: [
      { name: '.wrapper / .content', summary: 'The wrapper and content elements.' },
    ],
  },
  {
    plugin: 'SplitText',
    docs: 'https://gsap.com/docs/v3/Plugins/SplitText/',
    statics: [
      { name: 'SplitText.create(target, vars)', summary: 'Preferred factory; returns a SplitText instance.' },
    ],
    methods: [
      { name: '.split(vars)', summary: 'Split again, optionally with new options.' },
      { name: '.revert()', summary: 'Restore the original text and remove wrapper elements.' },
    ],
    properties: [
      { name: '.chars / .words / .lines', summary: 'Arrays of the generated elements.' },
      { name: '.masks', summary: 'Mask elements created by mask: "lines" | "words" | "chars".' },
    ],
  },
  {
    plugin: 'Flip',
    docs: 'https://gsap.com/docs/v3/Plugins/Flip/',
    statics: [
      { name: 'Flip.getState(targets, vars)', summary: 'Capture positions before a DOM/layout change.' },
      { name: 'Flip.from(state, vars)', summary: 'Animate from the captured state to the current layout.' },
      { name: 'Flip.batch(name)', summary: 'Coordinate multiple Flip animations as one batch.' },
      { name: 'Flip.fit(target, destination, vars)', summary: 'Fit one element to another without a state capture.' },
      { name: 'Flip.makeAbsolute(targets)', summary: 'Move elements into an absolute-positioned container.' },
      { name: 'Flip.isFlipping(target)', summary: 'True while a Flip animation is active on the target.' },
    ],
  },
  {
    plugin: 'Draggable',
    docs: 'https://gsap.com/docs/v3/Plugins/Draggable/',
    statics: [
      { name: 'Draggable.create(target, vars)', summary: 'Create one or more draggable instances; always store and kill them.' },
      { name: 'Draggable.get(target)', summary: 'Return the existing instance for a target.' },
      { name: 'Draggable.hitTest(a, b, threshold)', summary: 'Test overlap between two elements or points.' },
      { name: 'Draggable.isDragging(target)', summary: 'True while the target is being dragged.' },
      { name: 'Draggable.isThrowing(target)', summary: 'True while inertia is still moving the target.' },
    ],
    methods: [
      { name: '.kill()', summary: 'Remove listeners and release the instance.' },
      { name: '.enable() / .disable()', summary: 'Toggle interaction without destroying the instance.' },
      { name: '.update(applyBounds, sticky)', summary: 'Re-read bounds/position after layout changes.' },
      { name: '.applyBounds()', summary: 'Re-apply the configured bounds.' },
      { name: '.startDrag(event) / .endDrag(event)', summary: 'Programmatically start or end a drag.' },
      { name: '.getDirection(fromPoint)', summary: 'Direction of the current drag.' },
    ],
    properties: [
      { name: '.target / .vars', summary: 'The dragged element and its configuration.' },
      { name: '.x / .y / .rotation', summary: 'Current transform values.' },
      { name: '.deltaX / .deltaY', summary: 'Movement since the last drag event.' },
      { name: '.pointerX / .pointerY', summary: 'Current pointer position.' },
      { name: '.isDragging / .isThrowing / .isPressed', summary: 'Interaction state.' },
    ],
  },
  {
    plugin: 'Observer',
    docs: 'https://gsap.com/docs/v3/Plugins/Observer/',
    statics: [
      { name: 'Observer.create(vars)', summary: 'Create a unified wheel/touch/pointer observer.' },
    ],
    methods: [
      { name: '.kill()', summary: 'Remove all listeners.' },
      { name: '.enable() / .disable()', summary: 'Toggle observation.' },
    ],
    properties: [
      { name: '.deltaX / .deltaY', summary: 'Movement since the previous event.' },
      { name: '.velocityX / .velocityY', summary: 'Current velocity.' },
      { name: '.isDragging / .isPressed', summary: 'Pointer state.' },
      { name: '.event / .target', summary: 'The originating event and target.' },
    ],
  },
  {
    plugin: 'InertiaPlugin',
    docs: 'https://gsap.com/docs/v3/Plugins/InertiaPlugin/',
    statics: [
      { name: 'InertiaPlugin.track(targets, props)', summary: 'Track velocity for one or more properties.' },
      { name: 'InertiaPlugin.getVelocity(target, prop)', summary: 'Read the tracked velocity.' },
      { name: 'InertiaPlugin.isTracking(target, prop)', summary: 'True when a property is being tracked.' },
    ],
  },
  {
    plugin: 'DrawSVGPlugin',
    docs: 'https://gsap.com/docs/v3/Plugins/DrawSVGPlugin/',
    statics: [
      { name: 'DrawSVGPlugin.getLength(element)', summary: 'Total stroke length of an SVG element.' },
      { name: 'DrawSVGPlugin.getPosition(element)', summary: 'Current visible stroke segment.' },
    ],
  },
  {
    plugin: 'MorphSVGPlugin',
    docs: 'https://gsap.com/docs/v3/Plugins/MorphSVGPlugin/',
    statics: [
      { name: 'MorphSVGPlugin.convertToPath(targets, toSVG)', summary: 'Convert circle/rect/ellipse/line/polygon to path data.' },
      { name: 'MorphSVGPlugin.stringToRawPath(str)', summary: 'Parse path data into a raw path array.' },
      { name: 'MorphSVGPlugin.rawPathToString(rawPath)', summary: 'Serialize a raw path array back to path data.' },
      { name: 'MorphSVGPlugin.getRawPath(target)', summary: 'Read an element’s raw path data.' },
    ],
  },
  {
    plugin: 'MotionPathPlugin',
    docs: 'https://gsap.com/docs/v3/Plugins/MotionPathPlugin/',
    statics: [
      { name: 'MotionPathPlugin.getRawPath(path)', summary: 'Parse a path/selector into a raw path array.' },
      { name: 'MotionPathPlugin.getRelativePosition(element, target, origin, targetOrigin)', summary: 'Measure the offset between two elements.' },
      { name: 'MotionPathPlugin.convertToPath(targets)', summary: 'Convert SVG primitives to paths.' },
      { name: 'MotionPathPlugin.arrayToRawPath(array)', summary: 'Convert an array of points to a raw path.' },
      { name: 'MotionPathPlugin.rawPathToString(rawPath)', summary: 'Serialize a raw path.' },
      { name: 'MotionPathPlugin.stringToRawPath(str)', summary: 'Parse path data.' },
      { name: 'MotionPathPlugin.pointsToSegment(points, curviness)', summary: 'Build a path segment from points.' },
      { name: 'MotionPathPlugin.getLength(path)', summary: 'Total path length.' },
      { name: 'MotionPathPlugin.getPositionOnPath(path, progress)', summary: 'Coordinates at a progress value.' },
    ],
  },
  {
    plugin: 'MotionPathHelper',
    docs: 'https://gsap.com/docs/v3/Plugins/MotionPathHelper/',
    statics: [
      { name: 'MotionPathHelper.create(target, vars)', summary: 'Open the interactive path editor. Development only.' },
    ],
  },
  {
    plugin: 'CustomEase',
    docs: 'https://gsap.com/docs/v3/Plugins/CustomEase/',
    statics: [
      { name: 'CustomEase.create(id, ease, vars)', summary: 'Create a named ease from SVG path data or cubic-bezier values.' },
      { name: 'CustomEase.getSVGData(ease, vars)', summary: 'Export an ease as SVG path data.' },
    ],
  },
  {
    plugin: 'CustomWiggle',
    docs: 'https://gsap.com/docs/v3/Plugins/CustomWiggle/',
    statics: [
      { name: 'CustomWiggle.create(name, vars)', summary: 'Create a named wiggle ease.' },
    ],
  },
  {
    plugin: 'CustomBounce',
    docs: 'https://gsap.com/docs/v3/Plugins/CustomBounce/',
    statics: [
      { name: 'CustomBounce.create(name, vars)', summary: 'Create a named bounce ease, optionally with squash.' },
    ],
  },
  {
    plugin: 'GSDevTools',
    docs: 'https://gsap.com/docs/v3/Plugins/GSDevTools/',
    statics: [
      { name: 'GSDevTools.create(vars)', summary: 'Open the timeline scrubber. Development only.' },
    ],
  },
  {
    plugin: 'PixiPlugin',
    docs: 'https://gsap.com/docs/v3/Plugins/PixiPlugin/',
    statics: [
      { name: 'PixiPlugin.registerPIXI(PIXI)', summary: 'Connect the PixiJS namespace before animating display objects.' },
    ],
  },
  {
    plugin: 'CSSRulePlugin',
    docs: 'https://gsap.com/docs/v3/Plugins/CSSRulePlugin/',
    statics: [
      { name: 'CSSRulePlugin.getRule(selector)', summary: 'Return the CSSRule for a selector, including pseudo-elements.' },
    ],
  },
];

export const SCROLLTRIGGER = PLUGIN_API.find((entry) => entry.plugin === 'ScrollTrigger');

export const EASES = [
  { name: 'none / linear', summary: 'Constant speed. Use for scrub-linked motion.', docs: DOC.eases },
  { name: 'power1.out … power4.out', summary: 'Default family. power2.out is a good general entrance; power4 is dramatic.', docs: DOC.eases },
  { name: 'back.out(1.7)', summary: 'Overshoots then settles. Good for playful pop-ins.', docs: DOC.eases },
  { name: 'elastic.out(1, 0.3)', summary: 'Springy oscillation. Use sparingly and never for large layout moves.', docs: DOC.eases },
  { name: 'bounce.out', summary: 'Ball-style bounce.', docs: DOC.eases },
  { name: 'circ / expo / sine', summary: 'Alternative acceleration profiles.', docs: DOC.eases },
  { name: 'steps(n)', summary: 'Discrete stepped motion.', docs: DOC.eases },
  { name: 'rough({...})', summary: 'RoughEase from EasePack for organic jitter.', docs: DOC.eases },
  { name: 'slow(n)', summary: 'SlowMo from EasePack; adjusts initial velocity.', docs: DOC.eases },
  { name: 'expoScale(start, end, ease)', summary: 'ExpoScaleEase for perceptually even scale changes.', docs: DOC.eases },
  { name: 'CustomEase.create(name, path)', summary: 'Arbitrary curve; register the plugin first.', docs: DOC.eases },
  { name: 'easeReverse (3.15)', summary: 'Tween-level reverse ease; true reuses the forward ease, or pass a different ease string. Prefer over yoyoEase.', docs: 'https://gsap.com/blog/3-15/' },
];

export const UTILS = [
  { name: 'gsap.utils.clamp()', summary: 'Constrain a value to a min/max range.', docs: DOC.utils },
  { name: 'gsap.utils.mapRange()', summary: 'Map a value from one range to another.', docs: DOC.utils },
  { name: 'gsap.utils.normalize()', summary: 'Map a range to 0–1.', docs: DOC.utils },
  { name: 'gsap.utils.interpolate()', summary: 'Interpolate numbers, colors, strings, arrays, or objects.', docs: DOC.utils },
  { name: 'gsap.utils.random()', summary: 'Random number or element, with optional snapping.', docs: DOC.utils },
  { name: 'gsap.utils.snap()', summary: 'Snap values to increments or an array.', docs: DOC.utils },
  { name: 'gsap.utils.toArray()', summary: 'Convert selector/NodeList/array to a real array, optionally scoped.', docs: DOC.utils },
  { name: 'gsap.utils.selector()', summary: 'Create a scoped selector function for a container.', docs: DOC.utils },
  { name: 'gsap.utils.wrap() / wrapYoyo()', summary: 'Wrap values into a range, optionally back and forth.', docs: DOC.utils },
  { name: 'gsap.utils.distribute()', summary: 'Build stagger values from start/center/edges/random.', docs: DOC.utils },
  { name: 'gsap.utils.pipe()', summary: 'Compose utility functions left-to-right.', docs: DOC.utils },
  { name: 'gsap.utils.unitize()', summary: 'Add a unit to a function-based value.', docs: DOC.utils },
  { name: 'gsap.utils.splitColor()', summary: 'Split a color into RGB/HSL components.', docs: DOC.utils },
  { name: 'gsap.utils.getUnit()', summary: 'Read the unit from a value.', docs: DOC.utils },
  { name: 'gsap.utils.checkPrefix()', summary: 'Find the browser-prefixed CSS property name, or null when unsupported.', docs: DOC.utils },
  { name: 'gsap.utils.shuffle()', summary: 'Shuffle an array in place and return it.', docs: DOC.utils },
];

export const REACT = [
  {
    name: 'useGSAP()',
    summary: 'Drop-in useLayoutEffect replacement from @gsap/react that scopes selectors, auto-reverts animations/ScrollTriggers, and provides contextSafe.',
    docs: DOC.react,
    notes: 'Register useGSAP with gsap.registerPlugin(useGSAP). Pass { scope: containerRef }. Return cleanup for non-GSAP resources (listeners, Draggable, SplitText, observers).',
  },
  {
    name: 'contextSafe()',
    summary: 'Wrap callbacks created after the hook runs (click/pointer handlers) so their animations join the component context.',
    docs: DOC.react,
    notes: 'Only needed for GSAP work created in event handlers. Plain DOM listeners still need manual removal.',
  },
  {
    name: 'SSR safety',
    summary: 'useGSAP falls back to useEffect on the server; never touch window/document during render.',
    docs: DOC.react,
    notes: 'Guard matchMedia and window access, or run it inside the hook/effect.',
  },
];

export const DELTAS = [
  {
    version: '3.15.0',
    date: '2026-04-13',
    title: 'Adaptive directional easing (easeReverse)',
    summary: 'New tween property easeReverse defines a different ease when the playhead moves backwards. true reuses the forward ease; a string sets a distinct reverse feel. Works in nested timelines and via timeline defaults. yoyoEase is deprecated and internally mapped to easeReverse.',
    example: `gsap.to('.sheet', {\n  y: 0,\n  ease: 'expo.out',\n  easeReverse: true\n});\n\nconst tl = gsap.timeline({ defaults: { ease: 'back.out', easeReverse: 'expo.in' } });\ntl.to('.hero', { y: -100 });\ntl.reverse();`,
    docs: 'https://gsap.com/blog/3-15/',
  },
  {
    version: '3.14.0',
    date: '2025-12-08',
    title: 'MorphSVG smooth + curveMode',
    summary: 'smooth adds evenly spaced anchors for difficult morphs: a number (e.g. 80), "auto", or { points, redraw: false }. curveMode helps avoid mid-morph kinks. Anchor distribution also improved without smooth.',
    example: `gsap.to('#blob', {\n  morphSVG: { shape: '#star', smooth: 'auto', curveMode: true },\n  duration: 1.2,\n  ease: 'power2.inOut'\n});`,
    docs: 'https://gsap.com/blog/3-14/',
  },
  {
    version: '3.13.0',
    date: '2025-04-29',
    title: 'All plugins free + SplitText upgrades',
    summary: 'Every plugin (SplitText, MorphSVG, DrawSVG, etc.) is free for commercial use from the public gsap npm package. SplitText adds autoSplit/onSplit, mask, smartWrap, and SplitText.create().',
    example: `const split = SplitText.create('.title', {\n  type: 'lines',\n  autoSplit: true,\n  mask: 'lines',\n  onSplit: (self) => gsap.from(self.lines, { yPercent: 100, stagger: 0.08 })\n});`,
    docs: 'https://gsap.com/blog/3-13/',
  },
  {
    version: '3.12.0',
    date: '2023-05-19',
    title: 'ScrollTrigger clamp + ScrollSmoother speed',
    summary: 'clamp() keeps start/end inside page bounds so above-the-fold triggers do not start partially scrubbed. ScrollSmoother gained speed and clamp(data-speed).',
    example: `scrollTrigger: { start: 'clamp(top bottom)', end: 'clamp(bottom top)' }`,
    docs: 'https://gsap.com/blog/3-12/',
  },
  {
    version: '3.11.0',
    date: '2022-08-15',
    title: 'matchMedia, context, revert',
    summary: 'gsap.matchMedia() and gsap.context() simplify responsive setup and cleanup. Every animation can revert() to its original state.',
    example: `const mm = gsap.matchMedia();\nmm.add('(prefers-reduced-motion: no-preference)', () => {\n  gsap.to('.card', { y: 0, opacity: 1 });\n});`,
    docs: 'https://gsap.com/blog/3-11/',
  },
];

export const SNIPPETS = [
  {
    id: 'scroll-reveal-batch',
    name: 'Batch scroll reveal (React)',
    when: 'Reveal many cards/sections on scroll without creating one ScrollTrigger per item.',
    code: `import { useRef } from 'react';\nimport { gsap } from 'gsap';\nimport { ScrollTrigger } from 'gsap/ScrollTrigger';\nimport { useGSAP } from '@gsap/react';\n\ngsap.registerPlugin(useGSAP, ScrollTrigger);\n\nexport function RevealGrid({ children }) {\n  const root = useRef(null);\n\n  useGSAP(() => {\n    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;\n\n    ScrollTrigger.batch('.reveal-card', {\n      scope: root.current,\n      start: 'top 88%',\n      once: true,\n      onEnter: (batch) => gsap.fromTo(batch,\n        { autoAlpha: 0, y: 28 },\n        { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out', overwrite: true }\n      )\n    });\n  }, { scope: root });\n\n  return <div ref={root}>{children}</div>;\n}`,
    notes: 'ScrollTrigger.batch accepts a scope only in recent versions; if your version does not, use gsap.utils.selector(root) to build the target array.',
  },
  {
    id: 'horizontal-pin',
    name: 'Horizontal pin with resize-safe end',
    when: 'A row of full-width panels that scrolls horizontally while the section is pinned.',
    code: `gsap.to(panels, {\n  xPercent: -100 * (panels.length - 1),\n  ease: 'none',\n  scrollTrigger: {\n    trigger: wrapper,\n    pin: true,\n    scrub: 1,\n    snap: 1 / (panels.length - 1),\n    end: () => '+=' + container.offsetWidth, // function = fresh on every refresh\n    invalidateOnRefresh: true\n  }\n});`,
    notes: 'Never capture offsetWidth outside the end function; it goes stale when the viewport changes. Keep ease: "none" so scroll and x positions stay aligned.',
  },
  {
    id: 'split-text-lines',
    name: 'SplitText line reveal with autoSplit',
    when: 'Headlines that must re-split after fonts load or width changes.',
    code: `import { SplitText } from 'gsap/SplitText';\nimport { useGSAP } from '@gsap/react';\n\ngsap.registerPlugin(SplitText, useGSAP);\n\nuseGSAP(() => {\n  const split = SplitText.create(headingRef.current, {\n    type: 'lines',\n    autoSplit: true,\n    mask: 'lines',\n    onSplit: (self) => gsap.from(self.lines, {\n      yPercent: 110,\n      duration: 0.8,\n      stagger: 0.08,\n      ease: 'power3.out'\n    })\n  });\n  return () => split.revert();\n}, { scope: rootRef });`,
    notes: 'useGSAP reverts GSAP objects automatically, but returning split.revert() makes the intent explicit and covers manual SplitText instances.',
  },
  {
    id: 'flip-layout',
    name: 'FLIP layout transition',
    when: 'Grid/list toggles, expanding cards, or any layout change you would otherwise animate with width/height.',
    code: `import { Flip } from 'gsap/Flip';\ngsap.registerPlugin(Flip);\n\nconst state = Flip.getState('.card');\ncontainer.classList.toggle('is-list');\n\nFlip.from(state, {\n  duration: 0.6,\n  ease: 'power3.inOut',\n  absolute: true,\n  stagger: 0.03,\n  onEnter: (els) => gsap.fromTo(els, { autoAlpha: 0, scale: 0.9 }, { autoAlpha: 1, scale: 1 }),\n  onLeave: (els) => gsap.to(els, { autoAlpha: 0, scale: 0.9 })\n});`,
    notes: 'Flip is the correct answer for layout animation. It avoids animating width/height and preserves scroll position.',
  },
  {
    id: 'draggable-cleanup',
    name: 'Draggable with explicit cleanup',
    when: 'Draggable windows, cards, or carousels inside React.',
    code: `useGSAP(() => {\n  const instances = Draggable.create(windowRef.current, {\n    type: 'x,y',\n    bounds: '.desktop',\n    edgeResistance: 0.85\n  });\n\n  return () => instances.forEach((instance) => instance.kill());\n}, { scope: desktopRef });`,
    notes: 'gsap.context() does not reliably kill Draggable. Always return an explicit cleanup.',
  },
  {
    id: 'reversible-ui-easereverse',
    name: 'Reversible drawer with easeReverse (3.15)',
    when: 'Modals, drawers, menus, and toggles that reverse mid-animation.',
    code: `const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out', easeReverse: 'power2.in' } });\ntl.to('.backdrop', { autoAlpha: 1, duration: 0.25 })\n  .to('.drawer', { x: 0, duration: 0.45 }, '<');\n\nconst toggle = (open) => open ? tl.timeScale(1).play() : tl.timeScale(1.25).reverse();`,
    notes: 'easeReverse adapts from the exact interruption point, unlike yoyoEase. Combine with timeScale for snappier closes.',
  },
  {
    id: 'morph-smooth',
    name: 'MorphSVG smooth morph (3.14)',
    when: 'Icon/shape morphs that look kinked or uneven with default settings.',
    code: `gsap.registerPlugin(MorphSVGPlugin);\nMorphSVGPlugin.convertToPath('circle, rect, ellipse, line');\n\ngsap.to('#shape', {\n  morphSVG: {\n    shape: '#target',\n    smooth: 'auto',      // or 80, or { points: 80, redraw: false }\n    curveMode: true\n  },\n  duration: 1.1,\n  ease: 'power2.inOut'\n});`,
    notes: 'smooth redraws the path by default and loses some fidelity; set redraw: false if the original contour matters.',
  },
  {
    id: 'usejsap-contextsafe',
    name: 'useGSAP + contextSafe event handler',
    when: 'Animations created in click/pointer handlers that must clean up on unmount.',
    code: `const { contextSafe } = useGSAP({ scope: rootRef });\n\nconst onClick = contextSafe(() => {\n  gsap.to('.panel', { x: 100, duration: 0.4 });\n});\n\nreturn <button onClick={onClick}>Open</button>;`,
    notes: 'Without contextSafe, animations created in later event handlers are outside the hook context and leak on unmount.',
  },
  {
    id: 'scrolltrigger-refresh',
    name: 'Refresh ScrollTrigger after layout settles',
    when: 'Fonts, images, lazy sections, or async data change the page height.',
    code: `const refresh = () => ScrollTrigger.refresh();\ndocument.fonts?.ready.then(refresh);\nwindow.addEventListener('load', refresh, { once: true });\n\n// Lazy sections / CMS content:\nconst observer = new ResizeObserver(refresh);\nobserver.observe(document.body);\nreturn () => observer.disconnect();`,
    notes: 'Debounce refresh on resize; ScrollTrigger already handles viewport resize but not async content. Set ScrollTrigger.config({ ignoreMobileResize: true }) to avoid URL-bar jumps.',
  },
  {
    id: 'observer-gesture',
    name: 'Gesture section with Observer',
    when: 'A section should react to swipe/wheel intent without hijacking the whole page.',
    code: `Observer.create({\n  target: sectionRef.current,\n  type: 'wheel,touch,pointer',\n  tolerance: 10,\n  lockAxis: true,\n  onChangeY: (self) => {\n    if (self.deltaY > 0) next();\n    else prev();\n  }\n});`,
    notes: 'Return observer.kill() from the effect. Keep native scroll available and respect reduced motion.',
  },
];

export function searchKnowledge(query, limit = 10) {
  const q = String(query || '').toLowerCase().trim();
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);

  const entries = [
    ...CORE.map((item) => ({ type: 'core', name: item.name, summary: item.summary, docs: item.docs, keywords: item.keywords || [] })),
    ...PLUGINS.map((item) => ({ type: 'plugin', name: item.name, summary: item.summary, docs: item.docs, keywords: [item.category, ...(item.keyOptions || [])] })),
    ...PLUGIN_API.flatMap((entry) => [
      ...entry.statics.map((item) => ({ type: 'plugin-api', name: item.name, summary: item.summary, docs: entry.docs, keywords: ['plugin-api', 'static', entry.plugin.toLowerCase()] })),
      ...(entry.methods || []).map((item) => ({ type: 'plugin-api', name: `${entry.plugin}${item.name}`, summary: item.summary, docs: entry.docs, keywords: ['plugin-api', 'method', entry.plugin.toLowerCase()] })),
      ...(entry.properties || []).map((item) => ({ type: 'plugin-api', name: `${entry.plugin} ${item.name}`, summary: item.summary, docs: entry.docs, keywords: ['plugin-api', 'property', entry.plugin.toLowerCase()] })),
    ]),
    ...EASES.map((item) => ({ type: 'ease', name: item.name, summary: item.summary, docs: item.docs, keywords: ['ease', 'easing'] })),
    ...UTILS.map((item) => ({ type: 'util', name: item.name, summary: item.summary, docs: item.docs, keywords: ['utils'] })),
    ...REACT.map((item) => ({ type: 'react', name: item.name, summary: item.summary, docs: item.docs, keywords: ['react', 'cleanup', 'hook'] })),
    ...DELTAS.map((item) => ({ type: 'delta', name: `${item.version} — ${item.title}`, summary: item.summary, docs: item.docs, keywords: ['release', 'new', item.version] })),
    ...SNIPPETS.map((item) => ({ type: 'snippet', name: item.name, summary: item.when, docs: null, keywords: [item.id, 'snippet', 'example'] })),
  ];

  return entries
    .map((entry) => {
      const haystack = `${entry.name} ${entry.summary} ${(entry.keywords || []).join(' ')}`.toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (entry.name.toLowerCase().includes(term)) score += 4;
        if (haystack.includes(term)) score += 2;
        if ((entry.keywords || []).some((keyword) => String(keyword).toLowerCase() === term)) score += 2;
      }
      return { ...entry, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, Math.max(1, Math.min(Number(limit) || 10, 50)));
}

function table(headers, rows) {
  const head = `| ${headers.join(' | ')} |`;
  const separator = `| ${headers.map(() => '---').join(' | ')} |`;
  return [head, separator, ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n');
}

export function capabilitiesMarkdown(category = 'all') {
  const selected = String(category || 'all').toLowerCase();
  const parts = [];

  parts.push(`# GSAP ${GSAP_VERSION} capability map`);
  parts.push(`Released ${GSAP_RELEASED}. GSAP is 100% free, including every plugin; install everything with \`npm install gsap\`.`);
  parts.push(`Docs: ${DOC.core} · Cheatsheet: ${DOC.cheatsheet} · Demos: ${DOC.demos}`);

  if (selected === 'all' || selected === 'core') {
    parts.push('## Core API');
    parts.push(table(['API', 'Signature', 'What it does'], CORE.map((item) => [item.name, `\`${item.signature}\``, item.summary])));
  }

  if (selected === 'all' || selected === 'plugins' || selected === 'plugin-api') {
    if (selected !== 'plugin-api') {
      parts.push('## Plugins');
      parts.push(table(['Plugin', 'Import', 'Category', 'What it does'], PLUGINS.map((item) => [item.name, `\`${item.import}\``, item.category, item.summary])));
    }
    parts.push('## Plugin APIs');
    parts.push('Callable statics, instance methods, and properties. Tween-only plugins (ScrollTo, ScrambleText, Text, EasePack, Physics2D, PhysicsProps, Easel) are driven through their vars.');
    for (const entry of PLUGIN_API) {
      parts.push(`### ${entry.plugin}`);
      if (entry.statics?.length) parts.push(`- Static: ${entry.statics.map((item) => `\`${item.name}\` — ${item.summary}`).join(' · ')}`);
      if (entry.methods?.length) parts.push(`- Methods: ${entry.methods.map((item) => `\`${item.name}\` — ${item.summary}`).join(' · ')}`);
      if (entry.properties?.length) parts.push(`- Properties: ${entry.properties.map((item) => `\`${item.name}\` — ${item.summary}`).join(' · ')}`);
      parts.push(`Docs: ${entry.docs}`);
    }
  }

  if (selected === 'all' || selected === 'eases') {
    parts.push('## Eases');
    parts.push(table(['Ease', 'Use'], EASES.map((item) => [item.name, item.summary])));
  }

  if (selected === 'all' || selected === 'utils') {
    parts.push('## Utility methods');
    parts.push(table(['Utility', 'Use'], UTILS.map((item) => [item.name, item.summary])));
  }

  if (selected === 'all' || selected === 'react') {
    parts.push('## React');
    parts.push(table(['Tool', 'Use'], REACT.map((item) => [item.name, item.summary])));
  }

  if (selected === 'all' || selected === 'release' || selected === 'deltas') {
    parts.push('## Release deltas');
    for (const delta of DELTAS) {
      parts.push(`### ${delta.version} — ${delta.title} (${delta.date})`);
      parts.push(delta.summary);
      if (delta.example) parts.push('```js\n' + delta.example + '\n```');
      parts.push(`Docs: ${delta.docs}`);
    }
  }

  return parts.join('\n\n');
}
