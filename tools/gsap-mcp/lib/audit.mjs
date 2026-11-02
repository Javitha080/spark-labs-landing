/**
 * Static GSAP auditing for the local MCP.
 *
 * This is deliberately heuristic, not a parser: it targets the high-signal
 * mistakes that actually break GSAP work (plugin registration, scroll config,
 * cleanup, deprecated APIs, layout animation). Every finding includes a file,
 * line, why it matters, and a concrete fix.
 */

import fs from 'node:fs';
import path from 'node:path';

const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.svelte']);
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', 'coverage', '.next', '.nuxt', '.svelte-kit',
  '.wrangler', '.turbo', '.cache', '.agents', '.agent', 'docs', 'public', 'assets', 'static',
]);

const PLUGIN_IMPORTS = {
  'gsap/ScrollTrigger': 'ScrollTrigger',
  'gsap/ScrollSmoother': 'ScrollSmoother',
  'gsap/ScrollToPlugin': 'ScrollToPlugin',
  'gsap/SplitText': 'SplitText',
  'gsap/ScrambleTextPlugin': 'ScrambleTextPlugin',
  'gsap/TextPlugin': 'TextPlugin',
  'gsap/Flip': 'Flip',
  'gsap/Draggable': 'Draggable',
  'gsap/InertiaPlugin': 'InertiaPlugin',
  'gsap/Observer': 'Observer',
  'gsap/DrawSVGPlugin': 'DrawSVGPlugin',
  'gsap/MorphSVGPlugin': 'MorphSVGPlugin',
  'gsap/MotionPathPlugin': 'MotionPathPlugin',
  'gsap/MotionPathHelper': 'MotionPathHelper',
  'gsap/CustomEase': 'CustomEase',
  'gsap/EasePack': 'EasePack',
  'gsap/CustomWiggle': 'CustomWiggle',
  'gsap/CustomBounce': 'CustomBounce',
  'gsap/Physics2DPlugin': 'Physics2DPlugin',
  'gsap/PhysicsPropsPlugin': 'PhysicsPropsPlugin',
  'gsap/GSDevTools': 'GSDevTools',
  'gsap/PixiPlugin': 'PixiPlugin',
  'gsap/CSSRulePlugin': 'CSSRulePlugin',
  'gsap/EaselPlugin': 'EaselPlugin',
  '@gsap/react': 'useGSAP',
};

const PLUGIN_ALIASES = {
  GSAPSplitText: 'SplitText',
  SplitText: 'SplitText',
  ScrollTrigger: 'ScrollTrigger',
  ScrollSmoother: 'ScrollSmoother',
  ScrollToPlugin: 'ScrollToPlugin',
  ScrambleTextPlugin: 'ScrambleTextPlugin',
  TextPlugin: 'TextPlugin',
  Flip: 'Flip',
  Draggable: 'Draggable',
  InertiaPlugin: 'InertiaPlugin',
  Observer: 'Observer',
  DrawSVGPlugin: 'DrawSVGPlugin',
  MorphSVGPlugin: 'MorphSVGPlugin',
  MotionPathPlugin: 'MotionPathPlugin',
  MotionPathHelper: 'MotionPathHelper',
  CustomEase: 'CustomEase',
  EasePack: 'EasePack',
  CustomWiggle: 'CustomWiggle',
  CustomBounce: 'CustomBounce',
  Physics2DPlugin: 'Physics2DPlugin',
  PhysicsPropsPlugin: 'PhysicsPropsPlugin',
  GSDevTools: 'GSDevTools',
  PixiPlugin: 'PixiPlugin',
  CSSRulePlugin: 'CSSRulePlugin',
  EaselPlugin: 'EaselPlugin',
  useGSAP: 'useGSAP',
};

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

function lineOf(code, index) {
  return code.slice(0, Math.max(0, index)).split(/\r?\n/).length;
}

function relative(root, file) {
  return path.relative(root, file).replace(/\\/g, '/');
}

export function walkSourceFiles(root) {
  const absolute = path.resolve(root);
  const stat = fs.statSync(absolute);
  if (stat.isFile()) {
    return CODE_EXTENSIONS.has(path.extname(absolute).toLowerCase()) ? [absolute] : [];
  }

  const results = [];
  const visit = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        visit(path.join(dir, entry.name));
        continue;
      }
      if (!entry.isFile()) continue;
      if (CODE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        results.push(path.join(dir, entry.name));
      }
    }
  };
  visit(absolute);
  return results;
}

function scanImports(code) {
  const imports = new Set();
  const lines = code.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/(?:from\s+|import\s*\(\s*|require\s*\(\s*|import\s+)['"]([^'"]+)['"]/);
    if (!match) continue;
    const source = match[1];
    if (PLUGIN_IMPORTS[source]) imports.add(PLUGIN_IMPORTS[source]);
  }
  return imports;
}

function scanRegistrations(code) {
  const registered = new Set();
  const regex = /registerPlugin\s*\(([^)]*)\)/g;
  let match;
  while ((match = regex.exec(code))) {
    for (const raw of match[1].split(',')) {
      const identifier = raw.trim().replace(/^gsap\./, '');
      if (!identifier) continue;
      if (PLUGIN_ALIASES[identifier]) registered.add(PLUGIN_ALIASES[identifier]);
    }
  }
  return registered;
}

/** Extract a full call starting at the opening parenthesis, quote/comment aware. */
function extractCall(code, openIndex) {
  if (code[openIndex] !== '(') return '';
  let depth = 1;
  let quote = null;
  let escaped = false;
  for (let i = openIndex + 1; i < code.length; i += 1) {
    const char = code[i];
    const next = code[i + 1];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '/' && next === '/') {
      const end = code.indexOf('\n', i);
      i = end === -1 ? code.length : end;
      continue;
    }
    if (char === '/' && next === '*') {
      const end = code.indexOf('*/', i + 2);
      i = end === -1 ? code.length : end + 1;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      continue;
    }
    if (char === '(') depth += 1;
    else if (char === ')') {
      depth -= 1;
      if (depth === 0) return code.slice(openIndex, i + 1);
    }
  }
  return code.slice(openIndex, Math.min(code.length, openIndex + 2000));
}

/**
 * Find tween calls on any receiver: gsap.to(), tl.to(), master.fromTo(), ...
 * The receiver is captured so known non-GSAP APIs (Array.from, Object.from)
 * can be skipped.
 */
const NON_GSAP_RECEIVERS = new Set([
  'Array', 'Object', 'Buffer', 'Promise', 'Map', 'Set', 'String', 'Number', 'Date', 'Uint8Array', 'Int8Array',
]);

function scanTweenCalls(code) {
  const calls = [];
  const regex = /\b([A-Za-z_$][\w$]*)\.(to|from|fromTo)\s*\(/g;
  let match;
  while ((match = regex.exec(code))) {
    if (NON_GSAP_RECEIVERS.has(match[1])) continue;
    const openIndex = code.indexOf('(', match.index);
    if (openIndex === -1) continue;
    calls.push({ name: `${match[1]}.${match[2]}`, start: match.index, text: extractCall(code, openIndex) });
  }
  return calls;
}

function pluginNameFromIdentifier(identifier) {
  return PLUGIN_ALIASES[identifier] || identifier;
}

export function analyzeCode(code, file = 'snippet.tsx') {
  const findings = [];
  const imports = scanImports(code);
  const registered = scanRegistrations(code);

  // `// gsap-audit-disable-next-line <rule>` (or `all`) suppresses one finding.
  const suppressions = new Map();
  code.split(/\r?\n/).forEach((text, i) => {
    const match = text.match(/gsap-audit-disable-next-line\s+([\w-]+)/);
    if (!match) return;
    const target = i + 2;
    if (!suppressions.has(target)) suppressions.set(target, new Set());
    suppressions.get(target).add(match[1]);
  });

  const add = (rule, severity, message, hint, index, docs) => {
    const line = lineOf(code, index);
    const suppressed = suppressions.get(line);
    if (suppressed && (suppressed.has(rule) || suppressed.has('all'))) return;
    findings.push({
      rule,
      severity,
      file,
      line,
      message,
      hint,
      docs: docs || null,
    });
  };

  // 1. useGSAP selector calls without a scope.
  const useGsapRegex = /useGSAP\s*\(/g;
  let useGsapMatch;
  while ((useGsapMatch = useGsapRegex.exec(code))) {
    const openIndex = code.indexOf('(', useGsapMatch.index);
    const call = extractCall(code, openIndex);
    if (!call) continue;
    const hasScope = /\bscope\s*:/.test(call);
    const usesSelector = /gsap\.(?:to|from|fromTo|set)\s*\(\s*['"`]/.test(call);
    if (!hasScope && usesSelector) {
      add(
        'usegsap-scope',
        'medium',
        'useGSAP() animates selector strings without a scope.',
        'Pass { scope: containerRef } so selectors cannot reach outside the component, and return cleanup for non-GSAP resources.',
        useGsapMatch.index,
        'https://gsap.com/resources/React'
      );
    }
  }

  // 2. Draggable instances need explicit kill on unmount.
  if (/Draggable\.create\s*\(/.test(code) && !/\.kill\s*\(/.test(code)) {
    const index = code.search(/Draggable\.create\s*\(/);
    add(
      'draggable-cleanup',
      'high',
      'Draggable.create() is never killed.',
      'Store the returned instances and call instance.kill() in the cleanup. gsap.context() does not reliably kill Draggable.',
      index,
      'https://gsap.com/docs/v3/Plugins/Draggable/'
    );
  }

  // 3. Deprecated ScrollTrigger.matchMedia.
  const deprecatedMatchMedia = code.search(/ScrollTrigger\.matchMedia\s*\(/);
  if (deprecatedMatchMedia !== -1) {
    add(
      'deprecated-scrolltrigger-matchmedia',
      'high',
      'ScrollTrigger.matchMedia() is deprecated.',
      'Use gsap.matchMedia() instead; it reverts automatically when a query stops matching.',
      deprecatedMatchMedia,
      'https://gsap.com/docs/v3/GSAP/gsap.matchMedia()'
    );
  }

  // 4. yoyoEase deprecated in 3.15.
  const yoyoEase = code.search(/\byoyoEase\s*:/);
  if (yoyoEase !== -1) {
    add(
      'deprecated-yoyoease',
      'medium',
      'yoyoEase is deprecated in GSAP 3.15.',
      'Use easeReverse instead: true reuses the forward ease, or pass a different ease for the reverse direction.',
      yoyoEase,
      'https://gsap.com/blog/3-15/'
    );
  }

  // 5. Filter blur animation is not compositor-safe.
  const blurRegex = /filter\s*:\s*[^,\n}]*?blur\s*\(/g;
  let blurMatch;
  while ((blurMatch = blurRegex.exec(code))) {
    add(
      'filter-blur-animation',
      'medium',
      'Animates filter: blur(), which is expensive and not compositor-safe.',
      'Animate opacity and transform instead. If blur is essential, keep it static and cross-fade, and never combine it with scroll scrubbing.',
      blurMatch.index,
      'https://gsap.com/docs/v3/GSAP/CorePlugins/CSS'
    );
  }

  // 5b. Direct writes (`el.style.filter = ...`), which bypass tween configs.
  const styleBlurRegex = /\.style\.filter\s*=\s*([^;\n]*)/g;
  let styleBlurMatch;
  while ((styleBlurMatch = styleBlurRegex.exec(code))) {
    if (!/blur\s*\(/.test(styleBlurMatch[1])) continue;
    add(
      'filter-blur-animation',
      'medium',
      'Writes a blurred filter per frame (style.filter), which is expensive and not compositor-safe.',
      'Animate opacity and transform instead. Static blur belongs in CSS, not in a scroll/RAF paint loop.',
      styleBlurMatch.index,
      'https://gsap.com/docs/v3/GSAP/CorePlugins/CSS'
    );
  }

  // 6. ScrollTrigger scrub + toggleActions conflict.
  // Matches both inline configs (`scrollTrigger: {`) and
  // `ScrollTrigger.create({ ... })`.
  const scrollTriggerRegex = /(?:scrollTrigger\s*:\s*\{|ScrollTrigger\.create\s*\(\s*\{)/g;
  let scrollTriggerMatch;
  while ((scrollTriggerMatch = scrollTriggerRegex.exec(code))) {
    const openBrace = code.indexOf('{', scrollTriggerMatch.index);
    let depth = 1;
    let end = openBrace + 1;
    for (; end < code.length; end += 1) {
      if (code[end] === '{') depth += 1;
      else if (code[end] === '}') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    const config = code.slice(openBrace, end + 1);
    if (/\bscrub\s*:/.test(config) && /\btoggleActions\s*:/.test(config)) {
      add(
        'scrolltrigger-scrub-toggleactions',
        'critical',
        'ScrollTrigger config combines scrub with toggleActions.',
        'Choose one: scrub for continuous scroll-linked progress, or toggleActions for discrete play/reverse. If both exist, scrub wins and toggleActions is ignored.',
        scrollTriggerMatch.index,
        'https://gsap.com/docs/v3/Plugins/ScrollTrigger/'
      );
    }
    if (/\bscrub\s*:/.test(config) && /\bonce\s*:\s*true/.test(config)) {
      add(
        'scrolltrigger-scrub-once',
        'low',
        'ScrollTrigger combines scrub with once: true.',
        'once kills the trigger after the end is reached, which is usually meaningless with scrub. Remove once or use toggleActions.',
        scrollTriggerMatch.index,
        'https://gsap.com/docs/v3/Plugins/ScrollTrigger/'
      );
    }
    if (/\bpin\s*:/.test(config) && !/\banticipatePin\s*:/.test(config)) {
      add(
        'scrolltrigger-pin-anticipate',
        'info',
        'Pinned ScrollTrigger has no anticipatePin.',
        'Set anticipatePin: 1 when pinning after a header/hero to avoid a visible jump when the pin engages.',
        scrollTriggerMatch.index,
        'https://gsap.com/docs/v3/Plugins/ScrollTrigger/'
      );
    }
  }

  // 7. Global ScrollTrigger kills are dangerous in component code.
  const globalKill = code.search(/ScrollTrigger\.getAll\s*\(\s*\)\s*\.forEach/);
  if (globalKill !== -1) {
    add(
      'scrolltrigger-global-kill',
      'medium',
      'ScrollTrigger.getAll().forEach(...) scans and may kill triggers owned by other components.',
      'Kill only the trigger(s) this component created, or rely on useGSAP/gsap.context() scoped cleanup.',
      globalKill,
      'https://gsap.com/docs/v3/Plugins/ScrollTrigger/'
    );
  }

  // 8. Layout properties in animated calls.
  const tweenCalls = scanTweenCalls(code);
  for (const call of tweenCalls) {
    const match = call.text.match(/\b(width|height|top|left|right|bottom|margin|padding|fontSize|lineHeight)\s*:/);
    if (!match) continue;
    add(
      'layout-property-animation',
      'medium',
      `Animates the layout property "${match[1]}".`,
      'Prefer transform aliases (x/y/scale) or Flip for layout changes. Layout properties trigger reflow every frame and jank on low-end devices.',
      call.start,
      'https://gsap.com/docs/v3/Plugins/Flip/'
    );
  }

  // 9. setState inside onUpdate = React re-render every frame.
  const onUpdateRegex = /onUpdate\s*:/g;
  let onUpdateMatch;
  while ((onUpdateMatch = onUpdateRegex.exec(code))) {
    const tail = code.slice(onUpdateMatch.index, onUpdateMatch.index + 700);
    const setStateMatch = /\bset[A-Z]\w*\s*\(/.exec(tail);
    if (!setStateMatch) continue;
    // A comparison guard (e.g. `if (index !== lastIndex) setActive(index)`)
    // means React re-renders only when the derived value changes.
    const before = tail.slice(0, setStateMatch.index);
    const guarded = /if\s*\([^)]*(?:!==|===|!=|==|<|>)[^)]*\)/.test(before);
    if (guarded) continue;
    add(
      'onupdate-setstate',
      'medium',
      'onUpdate calls a React setState on every animation frame.',
      'Write directly to the DOM/refs, or update state only when a derived value actually changes. Per-frame re-renders are a common source of scroll jank.',
      onUpdateMatch.index,
      'https://gsap.com/docs/v3/GSAP/Tween'
    );
  }

  // 10. gsap.context / SplitText cleanup.
  const contextIndex = code.search(/gsap\.context\s*\(/);
  if (contextIndex !== -1 && !/\.revert\s*\(/.test(code)) {
    add(
      'context-cleanup',
      'low',
      'gsap.context() is used but no revert() cleanup was found.',
      'Return () => ctx.revert() from the effect, or use useGSAP() which does it automatically.',
      contextIndex,
      'https://gsap.com/docs/v3/GSAP/gsap.context()'
    );
  }

  const splitIndex = code.search(/new\s+SplitText\s*\(|SplitText\.create\s*\(/);
  if (splitIndex !== -1 && !/\.revert\s*\(/.test(code) && !/onSplit\s*:/.test(code)) {
    add(
      'splittext-cleanup',
      'low',
      'SplitText is created without revert() or onSplit() cleanup.',
      'Return split.revert() from the effect, or create it with autoSplit/onSplit inside useGSAP so cleanup is automatic.',
      splitIndex,
      'https://gsap.com/docs/v3/Plugins/SplitText/'
    );
  }

  // 11. ScrollTrigger start/end that closes over a measurement captured once.
  // `const totalWidth = el.offsetWidth; end: () => '+=' + totalWidth` looks
  // resize-safe (it is a function) but still returns the stale number.
  const measurementRegex = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*[^;\n]*(?:offsetWidth|offsetHeight|scrollWidth|scrollHeight|clientWidth|clientHeight)\b/g;
  const reportedMeasurements = new Set();
  let measurementMatch;
  while ((measurementMatch = measurementRegex.exec(code))) {
    const name = measurementMatch[1];
    if (reportedMeasurements.has(name)) continue;
    // A function that measures on demand is the fix, not the bug.
    if (/=>|\bfunction\b/.test(measurementMatch[0])) continue;
    const assignments = code.match(new RegExp(`\\b${name}\\s*=(?!=)`, 'g')) || [];
    if (assignments.length > 1) continue;
    const usage = new RegExp(`\\b(?:start|end)\\s*:\\s*[^\\n]*\\b${name}\\b`);
    const usageIndex = code.search(usage);
    if (usageIndex === -1) continue;
    reportedMeasurements.add(name);
    add(
      'scrolltrigger-stale-measurement',
      'medium',
      `ScrollTrigger start/end uses "${name}", a measurement cached outside the refresh cycle.`,
      `Measure inside the function so every refresh re-reads layout: end: () => "+=" + container.offsetWidth, plus invalidateOnRefresh: true.`,
      usageIndex,
      'https://gsap.com/docs/v3/Plugins/ScrollTrigger/'
    );
  }

  const unique = new Map();
  for (const finding of findings) {
    const key = `${finding.rule}:${finding.line}`;
    if (!unique.has(key)) unique.set(key, finding);
  }

  return {
    file,
    lineCount: code.split(/\r?\n/).length,
    imports: [...imports],
    registered: [...registered],
    findings: [...unique.values()].sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9) || a.line - b.line),
  };
}

function collectTechniques(code) {
  const checks = {
    tween: /gsap\.(?:to|from|fromTo|set)\s*\(/,
    timeline: /gsap\.timeline\s*\(/,
    scrollTrigger: /ScrollTrigger\.create\s*\(|scrollTrigger\s*:/,
    useGSAP: /useGSAP\s*\(/,
    matchMedia: /gsap\.matchMedia\s*\(/,
    context: /gsap\.context\s*\(/,
    quickTo: /gsap\.quickTo\s*\(/,
    ticker: /gsap\.ticker/,
    exportRoot: /gsap\.exportRoot\s*\(/,
    draggable: /Draggable\.create\s*\(/,
    splitText: /new\s+SplitText\s*\(|SplitText\.create\s*\(/,
    flip: /Flip\.(?:getState|from|batch)\s*\(/,
    observer: /Observer\.create\s*\(/,
    drawSVG: /drawSVG\s*:/,
    morphSVG: /morphSVG\s*:/,
    motionPath: /motionPath\s*:/,
    scrollSmoother: /ScrollSmoother\.create\s*\(/,
    scrollTo: /scrollTo\s*:/,
  };
  return Object.fromEntries(Object.entries(checks).filter(([, regex]) => regex.test(code)).map(([name]) => [name, true]));
}

export function analyzeProject(root) {
  const absolute = path.resolve(root);
  const files = walkSourceFiles(absolute);
  const perFile = [];
  const findings = [];
  const projectImports = new Set();
  const projectRegistered = new Set();

  for (const file of files) {
    let code;
    try {
      code = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const result = analyzeCode(code, relative(absolute, file));
    const techniques = collectTechniques(code);
    const hasGsap = result.imports.length > 0 || Object.keys(techniques).length > 0;
    if (!hasGsap) continue;

    result.imports.forEach((plugin) => projectImports.add(plugin));
    result.registered.forEach((plugin) => projectRegistered.add(plugin));
    findings.push(...result.findings);

    perFile.push({
      file: result.file,
      lines: result.lineCount,
      imports: result.imports,
      registered: result.registered,
      techniques: Object.keys(techniques),
    });
  }

  // Plugin imported somewhere but never registered project-wide.
  for (const plugin of projectImports) {
    if (!projectRegistered.has(plugin)) {
      findings.push({
        rule: 'plugin-not-registered',
        severity: 'high',
        file: '(project)',
        line: 0,
        message: `Plugin "${plugin}" is imported but never registered with gsap.registerPlugin().`,
        hint: `Register it once at app/module scope: gsap.registerPlugin(${plugin}).`,
        docs: 'https://gsap.com/docs/v3/Plugins/',
      });
    }
  }

  const pluginUsage = {};
  for (const entry of perFile) {
    for (const plugin of entry.imports) {
      pluginUsage[plugin] = (pluginUsage[plugin] || 0) + 1;
    }
  }

  const summary = {
    filesScanned: files.length,
    gsapFiles: perFile.length,
    findings: findings.length,
    bySeverity: findings.reduce((acc, finding) => {
      acc[finding.severity] = (acc[finding.severity] || 0) + 1;
      return acc;
    }, {}),
    plugins: Object.keys(pluginUsage).sort(),
    registered: [...projectRegistered].sort(),
  };

  findings.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9) || a.file.localeCompare(b.file) || a.line - b.line);

  return {
    root: absolute,
    files: perFile,
    pluginUsage,
    projectRegistered: [...projectRegistered].sort(),
    findings,
    summary,
  };
}

export function auditMarkdown(result) {
  const lines = [];
  lines.push(`# GSAP audit — ${result.root}`);
  lines.push('');
  lines.push(`Scanned **${result.summary.filesScanned}** source files, **${result.summary.gsapFiles}** use GSAP. Found **${result.summary.findings}** issue(s).`);
  const severityCounts = result.summary.bySeverity;
  lines.push('');
  lines.push(`Critical: ${severityCounts.critical || 0} · High: ${severityCounts.high || 0} · Medium: ${severityCounts.medium || 0} · Low: ${severityCounts.low || 0} · Info: ${severityCounts.info || 0}`);
  lines.push('');

  if (!result.findings.length) {
    lines.push('No issues matched the audit rules.');
    return lines.join('\n');
  }

  const groups = ['critical', 'high', 'medium', 'low', 'info'];
  for (const severity of groups) {
    const group = result.findings.filter((finding) => finding.severity === severity);
    if (!group.length) continue;
    lines.push(`## ${severity.toUpperCase()}`);
    for (const finding of group) {
      const location = finding.line ? `\`${finding.file}:${finding.line}\`` : `\`${finding.file}\``;
      lines.push(`- ${location} — **${finding.rule}** — ${finding.message}`);
      lines.push(`  - Fix: ${finding.hint}`);
      if (finding.docs) lines.push(`  - Docs: ${finding.docs}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

export function projectMapMarkdown(result) {
  const lines = [];
  lines.push(`# GSAP project map — ${result.root}`);
  lines.push('');
  lines.push(`**${result.summary.gsapFiles}** GSAP files · **${result.summary.plugins.length}** plugins imported · **${result.summary.findings}** audit finding(s).`);
  lines.push('');

  lines.push('## Plugin usage');
  lines.push('| Plugin | Files | Registered |');
  lines.push('| --- | ---: | --- |');
  const plugins = Object.keys(result.pluginUsage).sort();
  for (const plugin of plugins) {
    const registered = result.projectRegistered.includes(plugin) ? 'yes' : '**no**';
    lines.push(`| ${plugin} | ${result.pluginUsage[plugin]} | ${registered} |`);
  }
  lines.push('');

  lines.push('## Files');
  lines.push('| File | Lines | Plugins | Techniques |');
  lines.push('| --- | ---: | --- | --- |');
  for (const entry of result.files) {
    const plugins = entry.imports.length ? entry.imports.join(', ') : '—';
    const techniques = entry.techniques.length ? entry.techniques.join(', ') : '—';
    lines.push(`| \`${entry.file}\` | ${entry.lines} | ${plugins} | ${techniques} |`);
  }
  lines.push('');

  lines.push('## Findings by severity');
  const bySeverity = result.summary.bySeverity;
  lines.push(`Critical ${bySeverity.critical || 0} · High ${bySeverity.high || 0} · Medium ${bySeverity.medium || 0} · Low ${bySeverity.low || 0} · Info ${bySeverity.info || 0}`);
  lines.push('');
  lines.push('Run `gsap_audit` for file/line details and fixes.');

  return lines.join('\n');
}
