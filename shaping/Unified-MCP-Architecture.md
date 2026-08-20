# Unified MCP Architecture — Browser Inspection for Groundcrew

**Status:** Accepted
**Date:** 2026-08-20
**Related:** `playwright-mcp-vs-chrome-devtools-mcp.md` (MCP server selection), `ADR-001-bot-runtime-decision.md` (runtime decision), `ADR-002-browser-backend-decision.md` (browser backend decision), `ci-telegram-bot-shaping.md` (C2.4, R8.2)

---

## How it works — concrete code

### The Ax workflow code (written ONCE, never changes)

The Site-Inspector node in Ax speaks MCP. It calls browser tools like `browser_navigate`, `browser_snapshot`, `browser_take_screenshot`. It doesn't know or care where the browser runs:

```typescript
// Ax workflow — C2.4 Site-Inspector node
// This code is identical regardless of which browser backend is used

const siteInspector = ax.defineNode({
  name: 'site-inspector',
  tools: mcpClient({
    // The MCP server config — this is the ONLY thing that changes
    command: 'npx',
    args: ['@playwright/mcp@latest', '--headless', ...endpointArgs],
  }),
  prompt: `You are a site inspector. Navigate to the given URL,
           take a snapshot, take a screenshot, and report
           what you observe (page status, content, errors, layout).`,
});
```

### The config switch (one environment variable)

```typescript
// Cloudflare mode — DEFAULT. Browser runs on Cloudflare's edge.
// No Chromium download, no browser install on the runner.
const endpointArgs = [
  '--cdp-endpoint', process.env.CF_BROWSER_ENDPOINT,
  '--cdp-headers', `{"Authorization":"Bearer ${process.env.CF_API_TOKEN}"}`,
];

// Local mode — FALLBACK. For offline dev or air-gapped runners.
// Omit CF_BROWSER_ENDPOINT → @playwright/mcp launches local Chromium.
const endpointArgs = [];

// The switch is just:
const endpointArgs = process.env.CF_BROWSER_ENDPOINT
  ? ['--cdp-endpoint', process.env.CF_BROWSER_ENDPOINT,
     '--cdp-headers', `{"Authorization":"Bearer ${process.env.CF_API_TOKEN}"}`]
  : []; // empty = local Chromium (fallback)
```

### In GitHub Actions workflow YAML

```yaml
# DEFAULT: Cloudflare Browser Rendering (no Chromium on runner)
env:
  CF_BROWSER_ENDPOINT: wss://api.cloudflare.com/client/v4/accounts/${{ secrets.CF_ACCOUNT_ID }}/browser-rendering/devtools/browser?keep_alive=600000
  CF_API_TOKEN: ${{ secrets.CF_API_TOKEN }}

# FALLBACK: Local Chromium (for offline dev or air-gapped runners)
# Omit CF_BROWSER_ENDPOINT. Optionally use --browser=chrome for system Chrome.
env:
  PLAYWRIGHT_BROWSERS_PATH: /opt/hostedtoolcache
```

### Programmatic API (alternative to npx)

`@playwright/mcp` also exports `createConnection()`, which can be imported directly in TypeScript — no npx subprocess:

```typescript
import { createConnection } from '@playwright/mcp';

// Embed the MCP server directly in the Ax workflow process
const connection = await createConnection({
  browser: { launchOptions: { headless: true } },
});
```

This satisfies R4 (single TypeScript project, no process boundary) more cleanly than spawning an npx child process.

---

## Why this is powerful

### 1. One integration, two backends

The Ax workflow's LLM calls the same MCP tools (`browser_navigate`, `browser_snapshot`, `browser_take_screenshot`, `browser_evaluate`) regardless of where the browser runs. CDP is CDP — the commands are identical whether the browser is 1ms away on localhost or 50ms away on Cloudflare's edge. You write the browser integration once.

### 2. Fast startup, no browser install on runner

Cloudflare Browser Rendering is the default (ADR-002). No ~300MB Chromium download per run. Near-instant CDP connection to Cloudflare's edge. The runner only needs the `@playwright/mcp` npm package (a few MB). Local Chromium is a fallback for offline dev or air-gapped runners — omit `CF_BROWSER_ENDPOINT` and `@playwright/mcp` launches local Chromium.

### 3. Development vs production

During **development**: set `CF_BROWSER_ENDPOINT` to empty to use local Chromium. Free, no network latency, no Cloudflare account needed. Run the workflow on your laptop.

In **production on GHA**: Cloudflare is the default. Faster startup (no browser download), reliable (Cloudflare manages the browser), and the free tier covers the low-frequency usage pattern.

### 4. One browser stack across the ecosystem

`@playwright/mcp` uses Playwright under the hood — the same browser stack as the reference project (`~/repos/scool-playwright`). The CI tests use Playwright, the bot's site inspection uses Playwright. One install, one set of browser binaries, one API to know.

### 5. LLM token efficiency by design

`@playwright/mcp` uses Playwright's accessibility tree for snapshots — ~200-400 tokens per snapshot vs thousands for DOM/screenshots. Defaults to core tools only. Additional capabilities (pdf, vision, devtools) are opt-in via `--caps`. This means less schema in the LLM context and less token usage per inspection (R7.1).

### 6. Future-proofs against new CDP-compatible services

Any cloud browser service that speaks CDP over WebSocket can be a backend. Today it's Cloudflare. Tomorrow it could be Browserbase, Steel, or a self-hosted browser pool. The `--cdp-endpoint` flag is the only thing that changes. The Ax workflow is insulated from the browser infrastructure layer.

---

## Summary: three integration tiers

| Tier | Integration | Browser location | Default? | Weight | Flexibility |
|------|-----------|-----------------|----------|--------|-------------|
| **1. Simplest** | Ax `fn()` → Cloudflare Quick Actions (HTTP POST) | Cloudflare remote | No | Zero (just fetch) | Read-only (no clicking) |
| **2. MCP local** | Ax MCP client → `@playwright/mcp` → local Chromium | GHA runner | Fallback | ~300MB Chromium | Full CDP control |
| **3. MCP remote** | Ax MCP client → `@playwright/mcp` → Cloudflare CDP | Cloudflare remote | **✅ Default** | Zero (no browser) | Full CDP control |
| **4. Hybrid** | Same MCP code, switch backend via env var | Cloudflare OR local | Configurable | Configurable | Full CDP control, swappable |

**Default is Tier 3 (Cloudflare remote).** Write the MCP integration once using `@playwright/mcp`. Cloudflare Browser Rendering is the default — no Chromium on the runner, fast startup, free tier covers this usage. Local Chromium is the fallback for offline dev (omit `CF_BROWSER_ENDPOINT`). A future milestone may add a config option so forkers choose their backend without code changes. See `ADR-002-browser-backend-decision.md`.
