#!/usr/bin/env node
/**
 * End-to-end protocol test for tools/gsap-mcp/server.mjs.
 *
 * Spawns the real server over stdio and exercises every tool + error path.
 * Run: node tools/gsap-mcp/test/client.mjs
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SERVER = path.resolve(HERE, '..', 'server.mjs');

let passed = 0;
const failures = [];

function check(name, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`ok   ${name}`);
  } else {
    failures.push(name);
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

class Client {
  constructor() {
    this.nextId = 1;
    this.pending = new Map();
    this.buffer = '';
    this.stderr = '';
    this.proc = spawn(process.execPath, [SERVER], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, GSAP_MCP_ROOT: path.resolve(HERE, '..', '..', '..') },
    });

    this.proc.stdout.setEncoding('utf8');
    this.proc.stdout.on('data', (chunk) => this.onData(chunk));
    this.proc.stderr.setEncoding('utf8');
    this.proc.stderr.on('data', (chunk) => {
      this.stderr += chunk;
    });
  }

  onData(chunk) {
    this.buffer += chunk;
    let newline = this.buffer.indexOf('\n');
    while (newline !== -1) {
      const line = this.buffer.slice(0, newline).trim();
      this.buffer = this.buffer.slice(newline + 1);
      newline = this.buffer.indexOf('\n');
      if (!line) continue;
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        failures.push('stdout-contained-non-json');
        continue;
      }
      const pending = this.pending.get(message.id);
      if (!pending) continue;
      this.pending.delete(message.id);
      clearTimeout(pending.timer);
      if (message.error) pending.reject(new Error(`${message.error.code}: ${message.error.message}`));
      else pending.resolve(message.result);
    }
  }

  request(method, params, timeoutMs = 10000) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`timeout waiting for ${method}`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.proc.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
    });
  }

  notify(method, params) {
    this.proc.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`);
  }

  async call(name, args = {}, timeoutMs = 10000) {
    const result = await this.request('tools/call', { name, arguments: args }, timeoutMs);
    const text = result.content?.map((item) => item.text).join('\n') || '';
    return { result, text };
  }

  close() {
    this.proc.stdin.end();
  }
}

async function main() {
  const client = new Client();

  try {
    const init = await client.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'gsap-mcp-test', version: '1.0.0' },
    });
    check('initialize returns requested protocol', init.protocolVersion === '2025-06-18', init.protocolVersion);
    check('initialize advertises tools', Boolean(init.capabilities?.tools));
    check('initialize names the server', init.serverInfo?.name === 'gsap-mcp', JSON.stringify(init.serverInfo));
    client.notify('notifications/initialized');

    const list = await client.request('tools/list');
    const names = (list.tools || []).map((tool) => tool.name).sort();
    check(
      'tools/list returns all six tools',
      names.join(',') ===
        ['gsap_audit', 'gsap_capabilities', 'gsap_lookup', 'gsap_project_map', 'gsap_review', 'gsap_snippet'].join(','),
      names.join(',')
    );
    check('every tool has an input schema', (list.tools || []).every((tool) => tool.inputSchema?.type === 'object'));

    const ping = await client.request('ping');
    check('ping returns an empty object', JSON.stringify(ping) === '{}');

    const capabilities = await client.call('gsap_capabilities', { category: 'all' });
    check('capabilities mention GSAP 3.15', capabilities.text.includes('GSAP 3.15.0'));
    check('capabilities cover ScrollTrigger', capabilities.text.includes('ScrollTrigger'));
    check('capabilities cover easeReverse', capabilities.text.includes('easeReverse'));

    const pluginApi = await client.call('gsap_capabilities', { category: 'plugin-api' });
    check('plugin-api includes ScrollTrigger.create', pluginApi.text.includes('ScrollTrigger.create(vars)'));
    check('plugin-api includes Draggable methods', pluginApi.text.includes('Draggable.kill()') || pluginApi.text.includes('.kill()'));

    const lookup = await client.call('gsap_lookup', { query: 'easeReverse', limit: 5 });
    check('lookup finds easeReverse', lookup.text.toLowerCase().includes('easereverse'), lookup.text.slice(0, 200));

    const coreLookup = await client.call('gsap_lookup', { query: 'exportRoot', limit: 3 });
    check('lookup finds exportRoot', coreLookup.text.includes('exportRoot'));

    const utilLookup = await client.call('gsap_lookup', { query: 'checkPrefix', limit: 3 });
    check('lookup finds checkPrefix', utilLookup.text.includes('checkPrefix'));

    const lookupMiss = await client.call('gsap_lookup', { query: 'zzzz-not-real-zzzz' });
    check('lookup miss explains what to try', lookupMiss.text.includes('No GSAP entry matched'));

    const snippet = await client.call('gsap_snippet', { id: 'horizontal-pin' });
    check('snippet horizontal-pin returned', snippet.text.includes('invalidateOnRefresh'), snippet.text.slice(0, 120));

    const snippetList = await client.call('gsap_snippet', {});
    check('snippet list mentions draggable-cleanup', snippetList.text.includes('draggable-cleanup'));

    const badCode = `
      import { gsap } from 'gsap';
      import { Draggable } from 'gsap/Draggable';
      gsap.to('.x', { yoyoEase: true, height: 100, filter: 'blur(8px)' });
      ScrollTrigger.create({ trigger: '.x', scrub: true, toggleActions: 'play none none reverse' });
      Draggable.create('.x', { type: 'x,y' });
      gsap.to('.x', { y: 1, onUpdate: () => setState(1) });
    `;
    const review = await client.call('gsap_review', { code: badCode });
    for (const rule of [
      'draggable-cleanup',
      'deprecated-yoyoease',
      'scrolltrigger-scrub-toggleactions',
      'layout-property-animation',
      'filter-blur-animation',
      'onupdate-setstate',
    ]) {
      check(`review catches ${rule}`, review.text.includes(rule), review.text.slice(0, 300));
    }

    const reviewJson = await client.call('gsap_review', { code: badCode, format: 'json' });
    const parsed = JSON.parse(reviewJson.text);
    check('review json is valid and sorted by severity', parsed.findings[0]?.severity === 'critical', parsed.findings[0]?.severity);

    const styleBlur = await client.call('gsap_review', {
      code: "const paint = (el, t) => { el.style.filter = `blur(${(1 - t) * 4}px)`; };",
    });
    check('review catches direct style.filter blur', styleBlur.text.includes('filter-blur-animation'), styleBlur.text.slice(0, 200));

    const guardedReview = await client.call('gsap_review', {
      code: "import { gsap } from 'gsap'; gsap.to('.x', { y: 1, onUpdate: () => { if (index !== lastIndex) { lastIndex = index; setActive(index); } } });",
    });
    check('review allows guarded setState', !guardedReview.text.includes('onupdate-setstate'), guardedReview.text.slice(0, 200));

    const suppressedReview = await client.call('gsap_review', {
      code: "// gsap-audit-disable-next-line layout-property-animation\ngsap.to('.x', { height: 100 });",
    });
    check('review honors suppression comments', !suppressedReview.text.includes('layout-property-animation'), suppressedReview.text.slice(0, 200));

    const audit = await client.call('gsap_audit', { path: 'tools/gsap-mcp/test/fixtures/audit/draggable-leak.tsx' });
    check('audit finds the Draggable leak', audit.text.includes('draggable-cleanup'), audit.text.slice(0, 300));

    const map = await client.call('gsap_project_map', { path: 'tools/gsap-mcp/test/fixtures/map' }, 15000);
    check('project map lists SplitText', map.text.includes('SplitText'));
    check('project map reports files', /\*\*1\*\* GSAP file/.test(map.text), map.text.slice(0, 160));

    const escaped = await client.call('gsap_audit', { path: '../../../' });
    check('audit rejects paths outside the root', escaped.result.isError === true && escaped.text.includes('Refusing to scan'), escaped.text);

    const unknown = await client.request('tools/call', { name: 'nope', arguments: {} }).catch(() => null);
    check('unknown tool is a protocol error', unknown === null);

    const unknownMethod = await client.request('nonsense/method', {}).catch((error) => error);
    check('unknown method returns -32601', String(unknownMethod).includes('-32601'), String(unknownMethod));

    check('server logged to stderr, not stdout', client.stderr.includes('gsap-mcp'), client.stderr.slice(0, 120));
  } finally {
    client.close();
  }

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    console.log(`Failures: ${failures.join(', ')}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
