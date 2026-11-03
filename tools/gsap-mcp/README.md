# GSAP MCP (offline, project-aware)

`tools/gsap-mcp/` is a zero-dependency MCP server plus a static auditor for this
repository. It exists because neither public "GSAP MCP" project was usable:

| Project | Verdict |
| --- | --- |
| `mojo-solo/gsap-mcp-server` | Repo and npm package are gone (404/nonexistent); 1/5 rating. |
| `bruzethegreat/gsap-master-mcp-server` | Static 2025 prompt dump; outdated and includes advice this repo forbids. |

This server is offline, answers instantly, and audits the actual code.

## Tools

| Tool | Purpose |
| --- | --- |
| `gsap_capabilities` | GSAP 3.15 capability map by category (`core`, `plugins`, `plugin-api`, `eases`, `utils`, `react`, `release`, `all`), including static/instance plugin APIs. |
| `gsap_lookup` | Ranked search over APIs, plugins, eases, utils, React, release notes, snippets. |
| `gsap_audit` | Static findings for a file or directory, filtered by severity, markdown or JSON. |
| `gsap_project_map` | Plugin/technique inventory for the repo. |
| `gsap_snippet` | Production-shaped recipes by id or query. |
| `gsap_review` | Review a code string or file with line-numbered findings. |

## Wire-up

`opencode.json` (machine-local, gitignored):

```json
"gsap": {
  "type": "local",
  "command": [
    "C:\\nvm4w\\nodejs\\node.exe",
    "C:\\Users\\Xe0n0\\Desktop\\spark-labs-landing\\tools\\gsap-mcp\\server.mjs"
  ],
  "timeout": { "startup": 30000 }
}
```

The server resolves the project root from its own location. Override with
`GSAP_MCP_ROOT` when running it against another checkout.

## CLI

```bash
node tools/gsap-mcp/cli.mjs audit src
node tools/gsap-mcp/cli.mjs audit src/components/home/HorizontalShowcase.tsx --severity=medium
node tools/gsap-mcp/cli.mjs map src
node tools/gsap-mcp/cli.mjs lookup "scroll pinning"
node tools/gsap-mcp/cli.mjs snippet horizontal-pin
node tools/gsap-mcp/cli.mjs capabilities plugins
```

`audit` exits with code `2` when a critical finding exists, so it can gate CI.

To accept a known, intentional finding, put the directive on the line directly
above the tween/call:

```ts
// gsap-audit-disable-next-line layout-property-animation
gsap.to(windowRef.current, { width: viewportWidth });
```

`all` suppresses every rule for the next line. Suppressions are per line, so
moving the tween without the comment re-enables the finding.

## Protocol

Newline-delimited JSON-RPC 2.0 over stdio:

- `initialize` → echoes a supported protocol version, advertises `tools`.
- `tools/list`, `tools/call`, `ping`.
- `resources/list`, `resources/templates/list`, `prompts/list` return empty lists.
- Unknown method → `-32601`; parse error → `-32700`; tool failure → `isError: true` in the result.

No writes to stdout outside protocol messages; diagnostics go to stderr.

## Tests

```bash
node tools/gsap-mcp/test/client.mjs
```

Spawns the real server and covers initialization, tool discovery, all six tools,
error paths, path containment, suppressions, and stdout hygiene (34 assertions).

## Layout

```
tools/gsap-mcp/
├─ server.mjs              # MCP stdio server
├─ cli.mjs                 # human/CI CLI
├─ lib/knowledge.mjs       # GSAP 3.15 catalog, plugin APIs, deltas, snippets, search
├─ lib/audit.mjs           # source walker, rules, markdown/JSON formatters
└─ test/
   ├─ client.mjs           # end-to-end protocol test
   └─ fixtures/
      ├─ map/              # tiny GSAP project for the map test
      └─ audit/            # known-bad canary for the Draggable rule
```

## Extending

- Add APIs/plugins/snippets in `lib/knowledge.mjs` (single source for lookup,
  capabilities, and snippets).
- Add rules in `analyzeCode()` in `lib/audit.mjs`; keep each finding actionable
  (`message`, `hint`, `docs`) and severity-ranked.
- Never add a runtime dependency: the MCP must start offline on a locked-down box.
- Keep the server read-only. It must not modify source files.
