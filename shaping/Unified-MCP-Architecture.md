# Unified MCP Architecture — Browser Inspection for Groundcrew

**Status:** Accepted
**Date:** 2026-08-20
**Related:** `playwright-mcp-vs-chrome-devtools-mcp.md` (MCP server selection), `ADR-001-bot-runtime-decision.md` (runtime decision), `ci-telegram-bot-shaping.md` (C2.4, R8.2)

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
// Local mode — browser runs on the GHA runner
// No --cdp-endpoint flag = @playwright/mcp launches local Chromium
const endpointArgs = [];

// Remote mode — browser runs on Cloudflare's edge
// Just add the --cdp-endpoint flag pointing to Cloudflare's CDP endpoint
const endpointArgs = [
  '--cdp-endpoint', process.env.CF_BROWSER_ENDPOINT,
  '--cdp-headers', `{"Authorization":"Bearer ${process.env.CF_API_TOKEN}"}`,
];

// The switch is just:
const endpointArgs = process.env.CF_BROWSER_ENDPOINT
  ? ['--cdp-endpoint', process.env.CF_BROWSER_ENDPOINT,
     '--cdp-headers', `{"Authorization":"Bearer ${process.env.CF_API_TOKEN}"}`]
  : []; // empty = local Chromium
```

### In GitHub Actions workflow YAML

```yaml
# Option A: Local Chromium (default — no extra config)
env:
  # No CF_BROWSER_ENDPOINT set → @playwright/mcp launches local Chromium
  PLAYWRIGHT_BROWSERS_PATH: /opt/hostedtoolcache

# Option B: Cloudflare remote (just add two secrets)
env:
  CF_BROWSER_ENDPOINT: wss://api.cloudflare.com/client/v4/accounts/${{ secrets.CF_ACCOUNT_ID }}/browser-rendering/devtools/browser?keep_alive=600000
  CF_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
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

### 2. R8.1 compliance by default, escape hatch when needed

The ADR-001 decision says "no external server." Option A (local Chromium) satisfies this completely — no external dependency, no Cloudflare account, no API token. But if you later hit constraints (runner too slow to install Chromium, need residential IPs for anti-bot, need browsers closer to the target site for speed), you flip to Option B by adding two env vars. No code change.

### 3. Development vs production divergence

During **development**: use local Chromium. Free, instant, no account setup, no network latency. Run the workflow on your laptop.

In **production on GHA**: start with local Chromium too (it works, proven by scool-playwright). But if the 300MB Chromium download is eating into your 10-15 minute session budget, or if Chrome crashes on the runner, switch to Cloudflare. The workflow code doesn't change.

### 4. One browser stack across the ecosystem

`@playwright/mcp` uses Playwright under the hood — the same browser stack as the reference project (`~/repos/scool-playwright`). The CI tests use Playwright, the bot's site inspection uses Playwright. One install, one set of browser binaries, one API to know.

### 5. LLM token efficiency by design

`@playwright/mcp` uses Playwright's accessibility tree for snapshots — ~200-400 tokens per snapshot vs thousands for DOM/screenshots. Defaults to core tools only. Additional capabilities (pdf, vision, devtools) are opt-in via `--caps`. This means less schema in the LLM context and less token usage per inspection (R7.1).

### 6. Future-proofs against new CDP-compatible services

Any cloud browser service that speaks CDP over WebSocket can be a backend. Today it's Cloudflare. Tomorrow it could be Browserbase, Steel, or a self-hosted browser pool. The `--cdp-endpoint` flag is the only thing that changes. The Ax workflow is insulated from the browser infrastructure layer.

---

## Summary: three integration tiers

| Tier | Integration | Browser location | R8.1 | Weight | Flexibility |
|------|-----------|-----------------|------|--------|-------------|
| **1. Simplest** | Ax `fn()` → Cloudflare Quick Actions (HTTP POST) | Cloudflare remote | ❌ External service | Zero (just fetch) | Read-only (no clicking) |
| **2. MCP local** | Ax MCP client → `@playwright/mcp` → local Chromium | GHA runner | ✅ No external service | ~300MB Chromium | Full CDP control |
| **3. MCP remote** | Ax MCP client → `@playwright/mcp` → Cloudflare CDP | Cloudflare remote | ❌ External service | Zero (no browser) | Full CDP control |
| **4. Hybrid** | Same MCP code, switch backend via env var | Runner OR Cloudflare | ✅ default, ❌ optional | Configurable | Full CDP control, swappable |

**The recommendation is Tier 4 (Hybrid):** Write the MCP integration once using `@playwright/mcp`. Default to local Chromium (R8.1 compliant, proven pattern, same browser stack as the reference project). Keep Cloudflare as an escape hatch — if local Chromium is too heavy or unreliable, switch with one env var. The Ax workflow never knows the difference.
