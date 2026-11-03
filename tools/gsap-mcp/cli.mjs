#!/usr/bin/env node
/**
 * Human/CI CLI for the GSAP knowledge base and auditor.
 * The MCP server exposes the same logic over stdio; this is the terminal door.
 *
 * Usage:
 *   node tools/gsap-mcp/cli.mjs audit [path] [--severity=high] [--json]
 *   node tools/gsap-mcp/cli.mjs map [path] [--json]
 *   node tools/gsap-mcp/cli.mjs lookup "scroll pinning"
 *   node tools/gsap-mcp/cli.mjs snippet horizontal-pin
 *   node tools/gsap-mcp/cli.mjs capabilities [category]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { searchKnowledge, capabilitiesMarkdown, SNIPPETS } from './lib/knowledge.mjs';
import { analyzeCode, analyzeProject, auditMarkdown, projectMapMarkdown } from './lib/audit.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');

const [command = 'audit', ...rest] = process.argv.slice(2);
const flags = new Set(rest.filter((arg) => arg.startsWith('--')));
const positional = rest.filter((arg) => !arg.startsWith('--'));
const severity = (rest.find((arg) => arg.startsWith('--severity=')) || '').split('=')[1] || 'all';
const json = flags.has('--json');

function resolveTarget(target) {
  const absolute = path.isAbsolute(target || '') ? target : path.resolve(ROOT, target || '.');
  const relative = path.relative(ROOT, absolute);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to scan outside the project root (${ROOT}).`);
  }
  return absolute;
}

function filterFindings(findings) {
  if (severity === 'all') return findings;
  const wanted = new Set(severity.split(',').map((value) => value.trim().toLowerCase()));
  return findings.filter((finding) => wanted.has(finding.severity));
}

switch (command) {
  case 'audit': {
    const target = resolveTarget(positional[0]);
    if (fs.statSync(target).isDirectory()) {
      const result = analyzeProject(target);
      result.findings = filterFindings(result.findings);
      process.stdout.write(`${json ? JSON.stringify(result, null, 2) : auditMarkdown(result)}\n`);
      if (result.findings.some((finding) => finding.severity === 'critical')) process.exitCode = 2;
    } else {
      const code = fs.readFileSync(target, 'utf8');
      const result = analyzeCode(code, path.relative(ROOT, target).replace(/\\/g, '/'));
      const findings = filterFindings(result.findings);
      if (json) {
        process.stdout.write(`${JSON.stringify({ ...result, findings }, null, 2)}\n`);
      } else {
        process.stdout.write(`# GSAP review — ${result.file}\n\n`);
        if (!findings.length) process.stdout.write('No issues matched the audit rules.\n');
        for (const finding of findings) {
          process.stdout.write(`- ${finding.file}:${finding.line} — **${finding.rule}** — ${finding.message}\n  - Fix: ${finding.hint}\n`);
        }
      }
    }
    break;
  }

  case 'map': {
    const target = resolveTarget(positional[0]);
    const result = analyzeProject(target);
    process.stdout.write(`${json ? JSON.stringify(result, null, 2) : projectMapMarkdown(result)}\n`);
    break;
  }

  case 'lookup': {
    const query = positional.join(' ');
    const hits = searchKnowledge(query, 10);
    if (!hits.length) {
      process.stdout.write(`No GSAP entry matched "${query}".\n`);
      break;
    }
    for (const hit of hits) {
      process.stdout.write(`## ${hit.name} (${hit.type})\n${hit.summary}\n${hit.docs || ''}\n\n`);
    }
    break;
  }

  case 'snippet': {
    const id = positional[0];
    if (!id) {
      for (const snippet of SNIPPETS) process.stdout.write(`- ${snippet.id} — ${snippet.name}\n`);
      break;
    }
    const snippet = SNIPPETS.find((item) => item.id === id || item.id.includes(id));
    if (!snippet) {
      process.stdout.write(`No snippet matched "${id}".\n`);
      break;
    }
    process.stdout.write(`${snippet.name}\n\n${snippet.code}\n\n${snippet.notes}\n`);
    break;
  }

  case 'capabilities':
    process.stdout.write(`${capabilitiesMarkdown(positional[0] || 'all')}\n`);
    break;

  default:
    process.stderr.write(`Unknown command "${command}". Try audit, map, lookup, snippet, capabilities.\n`);
    process.exit(1);
}
