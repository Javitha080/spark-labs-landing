#!/usr/bin/env node
/**
 * GSAP MCP server — zero-dependency stdio JSON-RPC.
 *
 * Exists because both public "GSAP MCP" projects are unusable (one repo is
 * gone, the other is a static 2025 prompt dump). This one is offline, fast,
 * and knows this repository's animation code.
 *
 * Protocol: newline-delimited JSON-RPC 2.0 over stdin/stdout.
 * IMPORTANT: never write to stdout outside send(); logs go to stderr.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  GSAP_VERSION,
  GSAP_RELEASED,
  SNIPPETS,
  searchKnowledge,
  capabilitiesMarkdown,
} from './lib/knowledge.mjs';
import {
  analyzeCode,
  analyzeProject,
  auditMarkdown,
  projectMapMarkdown,
} from './lib/audit.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = process.env.GSAP_MCP_ROOT
  ? path.resolve(process.env.GSAP_MCP_ROOT)
  : path.resolve(HERE, '..', '..');

const SERVER_INFO = { name: 'gsap-mcp', version: '1.0.0' };
const DEFAULT_PROTOCOL = '2024-11-05';
const SUPPORTED_PROTOCOLS = ['2024-11-05', '2025-03-26', '2025-06-18'];

const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'];

/* ─────────────────────────── helpers ─────────────────────────── */

function resolveTarget(target) {
  if (!target) return PROJECT_ROOT;
  const absolute = path.isAbsolute(target) ? target : path.resolve(PROJECT_ROOT, target);
  return absolute;
}

function guardRoot(target) {
  const absolute = path.resolve(target);
  const root = path.resolve(PROJECT_ROOT);
  const relative = path.relative(root, absolute);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to scan outside the project root (${root}).`);
  }
  return absolute;
}

function filterFindings(findings, severity) {
  if (!severity || severity === 'all') return findings;
  const wanted = new Set(String(severity).split(',').map((value) => value.trim().toLowerCase()));
  return findings.filter((finding) => wanted.has(finding.severity));
}

function formatFindingMarkdown(finding) {
  const location = finding.line ? `\`${finding.file}:${finding.line}\`` : `\`${finding.file}\``;
  const lines = [`- ${location} — **${finding.rule}** — ${finding.message}`];
  lines.push(`  - Fix: ${finding.hint}`);
  if (finding.docs) lines.push(`  - Docs: ${finding.docs}`);
  return lines.join('\n');
}

function reviewMarkdown(result, severity) {
  const findings = filterFindings(result.findings, severity);
  const lines = [`# GSAP review — ${result.file}`, ''];
  lines.push(`Imports: ${result.imports.length ? result.imports.join(', ') : 'none'}`);
  lines.push(`Registered: ${result.registered.length ? result.registered.join(', ') : 'none'}`);
  lines.push(`Findings: ${findings.length} (of ${result.findings.length})`);
  lines.push('');
  if (!findings.length) {
    lines.push('No issues matched the audit rules.');
    return lines.join('\n');
  }
  for (const finding of findings) lines.push(formatFindingMarkdown(finding));
  return lines.join('\n');
}

function findSnippet(args) {
  const id = String(args.id || '').trim().toLowerCase();
  const query = String(args.query || '').trim().toLowerCase();

  if (id) {
    const exact = SNIPPETS.find((snippet) => snippet.id === id);
    if (exact) return exact;
    const loose = SNIPPETS.find(
      (snippet) => snippet.id.includes(id) || snippet.name.toLowerCase().includes(id)
    );
    if (loose) return loose;
  }

  if (query) {
    return (
      SNIPPETS.find((snippet) => snippet.id.includes(query)) ||
      SNIPPETS.find((snippet) => snippet.name.toLowerCase().includes(query)) ||
      SNIPPETS.find((snippet) => snippet.when.toLowerCase().includes(query)) ||
      null
    );
  }

  return null;
}

function snippetMarkdown(snippet) {
  return [
    `# ${snippet.name}`,
    `id: \`${snippet.id}\``,
    '',
    `**When:** ${snippet.when}`,
    '',
    '```js',
    snippet.code,
    '```',
    '',
    `**Notes:** ${snippet.notes}`,
  ].join('\n');
}

function snippetListMarkdown() {
  const lines = ['# GSAP snippets', ''];
  for (const snippet of SNIPPETS) {
    lines.push(`- \`${snippet.id}\` — **${snippet.name}** — ${snippet.when}`);
  }
  lines.push('', 'Call `gsap_snippet` with an `id` to get the full code.');
  return lines.join('\n');
}

function jsonResult(payload) {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
  };
}

function textResult(text) {
  return { content: [{ type: 'text', text }] };
}

/* ─────────────────────────── tools ─────────────────────────── */

const TOOLS = [
  {
    name: 'gsap_capabilities',
    title: 'GSAP capability map',
    description:
      `Return the GSAP ${GSAP_VERSION} capability map: core API, plugins, eases, utils, React, and release deltas. ` +
      'Use it to answer "what can GSAP do" questions without touching the network.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['all', 'core', 'plugins', 'plugin-api', 'eases', 'utils', 'react', 'release'],
          default: 'all',
          description: 'Section to return. Defaults to everything.',
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'gsap_lookup',
    title: 'GSAP knowledge lookup',
    description:
      'Search the offline GSAP knowledge base (APIs, plugins, eases, utilities, React, release notes, snippets). ' +
      'Returns ranked hits with docs URLs.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'What to look up, e.g. "scroll pinning" or "easeReverse".' },
        limit: { type: 'number', minimum: 1, maximum: 50, default: 10 },
      },
      required: ['query'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'gsap_audit',
    title: 'Audit GSAP code',
    description:
      'Statically audit a file or directory for GSAP problems: unregistered plugins, missing scope/cleanup, ' +
      'Draggable leaks, scrub+toggleActions conflicts, deprecated APIs, layout-property animation, blur filters, ' +
      'per-frame setState. Heuristic, high-signal, no network.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File or directory, relative to the project root. Defaults to the whole repo.' },
        severity: {
          type: 'string',
          enum: ['all', ...SEVERITIES],
          default: 'all',
          description: 'Only report findings at this severity (or "all").',
        },
        format: { type: 'string', enum: ['markdown', 'json'], default: 'markdown' },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'gsap_project_map',
    title: 'Map GSAP usage in the project',
    description:
      'Inventory every GSAP file: plugins imported/registered, techniques used (ScrollTrigger, SplitText, Draggable, ...), ' +
      'and the severity summary. Use before changing animation architecture.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory to map, relative to the project root. Defaults to the whole repo.' },
        format: { type: 'string', enum: ['markdown', 'json'], default: 'markdown' },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'gsap_snippet',
    title: 'Get a GSAP snippet',
    description:
      'Return a production-shaped GSAP recipe (including this repo\'s conventions) by id or search query. ' +
      'Call with nothing to list all recipes.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Exact or partial snippet id, e.g. "horizontal-pin".' },
        query: { type: 'string', description: 'Search text when the id is unknown.' },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'gsap_review',
    title: 'Review GSAP code',
    description:
      'Review a code string or file and return prioritized, line-numbered GSAP findings with fixes. ' +
      'Use on a diff or a single component before shipping animation changes.',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Source code to review. Takes precedence over `path`.' },
        path: { type: 'string', description: 'File to review, relative to the project root.' },
        severity: { type: 'string', enum: ['all', ...SEVERITIES], default: 'all' },
        format: { type: 'string', enum: ['markdown', 'json'], default: 'markdown' },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
];

function runTool(name, args = {}) {
  switch (name) {
    case 'gsap_capabilities': {
      const category = String(args.category || 'all');
      return textResult(capabilitiesMarkdown(category));
    }

    case 'gsap_lookup': {
      const hits = searchKnowledge(args.query, args.limit);
      if (!hits.length) {
        return textResult(
          `No GSAP entry matched "${args.query}". Try a broader term (timeline, scroll, split, draggable, ease, morph) or call gsap_capabilities.`
        );
      }
      const lines = [`# GSAP lookup — ${args.query}`, ''];
      for (const hit of hits) {
        lines.push(`## ${hit.name}`);
        lines.push(`type: \`${hit.type}\` · score: ${hit.score}`);
        lines.push(hit.summary);
        if (hit.docs) lines.push(`Docs: ${hit.docs}`);
        lines.push('');
      }
      return textResult(lines.join('\n'));
    }

    case 'gsap_audit': {
      const target = guardRoot(resolveTarget(args.path));
      // Single read, EISDIR decides the directory branch - no statSync/read
      // race window on the target.
      try {
        const code = fs.readFileSync(target, 'utf8');
        const result = analyzeCode(code, path.relative(PROJECT_ROOT, target).replace(/\\/g, '/'));
        if (args.format === 'json') return jsonResult(result);
        return textResult(reviewMarkdown(result, args.severity));
      } catch (err) {
        if (!err || err.code !== 'EISDIR') throw err;
        const dirResult = analyzeProject(target);
        dirResult.findings = filterFindings(dirResult.findings, args.severity);
        if (args.format === 'json') return jsonResult(dirResult);
        return textResult(auditMarkdown(dirResult));
      }
    }

    case 'gsap_project_map': {
      const target = guardRoot(resolveTarget(args.path));
      const result = analyzeProject(target);
      if (args.format === 'json') return jsonResult(result);
      return textResult(projectMapMarkdown(result));
    }

    case 'gsap_snippet': {
      if (!args.id && !args.query) return textResult(snippetListMarkdown());
      const snippet = findSnippet(args);
      if (!snippet) {
        return textResult(`No snippet matched. Available ids:\n\n${SNIPPETS.map((item) => `- ${item.id}`).join('\n')}`);
      }
      return textResult(snippetMarkdown(snippet));
    }

    case 'gsap_review': {
      let code = args.code;
      let file = 'snippet.tsx';
      if (!code && args.path) {
        const target = guardRoot(resolveTarget(args.path));
        code = fs.readFileSync(target, 'utf8');
        file = path.relative(PROJECT_ROOT, target).replace(/\\/g, '/');
      }
      if (!code) throw new Error('Provide either `code` or `path`.');
      const result = analyzeCode(code, file);
      if (args.format === 'json') return jsonResult(result);
      return textResult(reviewMarkdown(result, args.severity));
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

/* ─────────────────────────── protocol ─────────────────────────── */

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function sendResult(id, result) {
  send({ jsonrpc: '2.0', id, result });
}

function sendError(id, code, message, data) {
  const error = { code, message };
  if (data !== undefined) error.data = data;
  send({ jsonrpc: '2.0', id, error });
}

function handleRequest(message) {
  const { id, method, params } = message;
  const isNotification = id === undefined || id === null;

  try {
    switch (method) {
      case 'initialize': {
        const requested = params?.protocolVersion;
        const protocolVersion = SUPPORTED_PROTOCOLS.includes(requested) ? requested : DEFAULT_PROTOCOL;
        sendResult(id, {
          protocolVersion,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { ...SERVER_INFO, title: 'GSAP MCP (offline, project-aware)' },
          instructions:
            'Offline GSAP 3.15 knowledge base plus a static auditor for this repository. ' +
            'Use gsap_project_map before architectural changes, gsap_review on a diff, ' +
            'and gsap_capabilities to answer capability questions.',
        });
        return;
      }

      case 'notifications/initialized':
      case 'notifications/cancelled':
        return;

      case 'ping':
        sendResult(id, {});
        return;

      case 'tools/list':
        sendResult(id, { tools: TOOLS });
        return;

      case 'tools/call': {
        const name = params?.name;
        const args = params?.arguments || {};
        if (!TOOLS.some((tool) => tool.name === name)) {
          sendError(id, -32602, `Unknown tool: ${name}`);
          return;
        }
        try {
          sendResult(id, runTool(name, args));
        } catch (error) {
          sendResult(id, {
            content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
            isError: true,
          });
        }
        return;
      }

      case 'resources/list':
        sendResult(id, { resources: [] });
        return;

      case 'resources/templates/list':
        sendResult(id, { resourceTemplates: [] });
        return;

      case 'prompts/list':
        sendResult(id, { prompts: [] });
        return;

      default:
        if (isNotification) return;
        sendError(id, -32601, `Method not found: ${method}`);
    }
  } catch (error) {
    if (isNotification) return;
    sendError(id, -32603, error instanceof Error ? error.message : String(error));
  }
}

function main() {
  let buffer = '';

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    buffer += chunk;
    let newline = buffer.indexOf('\n');
    while (newline !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      newline = buffer.indexOf('\n');
      if (!line) continue;

      let message;
      try {
        message = JSON.parse(line);
      } catch {
        sendError(null, -32700, 'Parse error');
        continue;
      }

      if (Array.isArray(message)) {
        for (const item of message) handleRequest(item);
      } else {
        handleRequest(message);
      }
    }
  });

  process.stdin.on('end', () => process.exit(0));
  process.stdin.resume();

  process.stderr.write(
    `gsap-mcp ${SERVER_INFO.version} ready · GSAP ${GSAP_VERSION} (${GSAP_RELEASED}) · root=${PROJECT_ROOT}\n`
  );
}

main();
