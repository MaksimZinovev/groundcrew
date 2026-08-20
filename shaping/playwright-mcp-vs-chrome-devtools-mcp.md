# @playwright/mcp vs chrome-devtools-mcp — MCP Server Selection

**Date:** 2026-08-20
**Status:** Accepted — `@playwright/mcp` selected
**Related:** `Unified-MCP-Architecture.md`, `ADR-001-bot-runtime-decision.md`, `ci-telegram-bot-shaping.md` (C2.4, R8.2)

---

## Context

The browser agent spike (`shaping/GitHub-Stars-Manager-browser-agent.md`) recommended chrome-devtools-mcp as the MCP interface for the Site-Inspector node (C2.4). The Unified MCP Architecture doc proposed a hybrid: chrome-devtools-mcp as the MCP server, local Chrome by default, Cloudflare as a remote escape hatch via one env var.

Before accepting, we asked: should we reconsider `@playwright/mcp` instead? Both are MCP servers. Both drive a headless browser. Both support CDP endpoints for remote backends. The question is which one fits our constraints better.

This document is grounded in the npm package pages and official docs of both packages (retrieved 2026-08-20).

---

## Comparison

| Dimension | `@playwright/mcp` | `chrome-devtools-mcp` |
|-----------|-------------------|----------------------|
| **Browser engine** | Playwright (Chromium, Firefox, WebKit) | Puppeteer (Chrome only) |
| **Programmatic TS API** | Yes — `createConnection()` export, importable directly | No — npx/MCP client only |
| **Snapshot approach** | Accessibility tree, ~200-400 tokens per snapshot | `take_snapshot` (a11y tree) + screenshot-focused |
| **Default tool count** | Core tools only, opt-in via `--caps` | 50+ tools on by default, `--slim` mode for 3 |
| **CDP remote support** | `--cdp-endpoint` + `--cdp-headers` | `--wsEndpoint` + `--wsHeaders` |
| **Headless mode** | `--headless` flag | `--headless` flag |
| **Isolated mode** | `--isolated` (temp profile, auto-cleanup) | `--isolated` (temp profile, auto-cleanup) |
| **Publisher** | Microsoft (same team as Playwright) | Google/ChromeDevTools |
| **Version** | 0.0.79 (12 days ago) | 1.7.0 |
| **Weekly downloads** | — | 2.2M |
| **Docker image** | `mcr.microsoft.com/playwright/mcp` | — |

---

## Decision: `@playwright/mcp`

Five concrete reasons, all from the package docs:

### 1. One browser stack, not two

The `@playwright/mcp` npm page says: *"provides browser automation capabilities using Playwright."* The `chrome-devtools-mcp` npm page says: *"Uses puppeteer to automate actions in Chrome."* The reference project (`~/repos/scool-playwright`) already has Playwright + Chromium installed on the GitHub Actions runner. Using `@playwright/mcp` means the same browser binaries are already there. Using `chrome-devtools-mcp` means a second Chrome download via Puppeteer — a second ~300MB on the runner.

### 2. Programmatic TypeScript API — no npx subprocess

The `@playwright/mcp` npm page documents a `createConnection()` export under "Programmatic usage" — you import it directly in TypeScript, no child process. `chrome-devtools-mcp` has no documented programmatic API; it's `npx`-only. This matters for R4 (single TypeScript project, no process boundary). The Ax workflow can embed `@playwright/mcp` as a library, not spawn it.

### 3. LLM token efficiency by design

The `@playwright/mcp` npm page says: *"Uses Playwright's accessibility tree, not pixel-based input"* and *"~200-400 tokens per snapshot vs thousands for DOM/screenshots."* Its docs explicitly position MCP for *"specialized agentic loops that benefit from persistent state, rich introspection, and iterative reasoning over page structure"* — which is our use case. `chrome-devtools-mcp` defaults to 50+ tools (heap snapshots, performance traces, PWA management, extension management) — much heavier tool schema in the LLM context. It has a `--slim` mode (3 tools) but that's too minimal for site inspection.

### 4. Same escape hatch — Cloudflare CDP works identically

`@playwright/mcp` supports `--cdp-endpoint` and `--cdp-headers` (documented in its config options table). `chrome-devtools-mcp` supports `--wsEndpoint` and `--wsHeaders`. Both connect to a remote CDP endpoint. The hybrid architecture from the Unified MCP Architecture doc works with either — the env-var switch is the same pattern.

### 5. Tool surface defaults are lighter

`@playwright/mcp` defaults to core tools (navigate, click, type, snapshot, screenshot, etc.) and uses `--caps` to opt into additional capabilities (pdf, vision, devtools). `chrome-devtools-mcp` defaults to everything on — performance, network, emulation, memory debugging all loaded. Fewer default tools = less schema in the LLM context = less tokens (R7.1).

---

## What the spike got right and wrong

The spike correctly identified chrome-devtools-mcp as "most MCP-native" compared to Playwright's *programmatic API*. But the spike did not compare chrome-devtools-mcp against `@playwright/mcp` — which is also an MCP server. That comparison was the gap.

`@playwright/mcp` is equally MCP-native, uses the same browser stack as the reference project, has a programmatic TypeScript API, and has a lighter default tool surface. It is a better fit for our constraints.

---

## Trade-off of switching

`chrome-devtools-mcp` has DevTools-specific tools (performance traces, heap snapshots, Lighthouse audits) that `@playwright/mcp` doesn't. If the bot ever needs to diagnose performance issues or memory leaks on the live site, chrome-devtools-mcp has that built in. But that's not R2's scope — R2 is "inspect live website and combine with CI data," which is navigation + content + screenshots + network requests. `@playwright/mcp` covers all of that.

If performance diagnostics become a future requirement, `@playwright/mcp` has a `--caps=devtools` opt-in that enables DevTools features. Or chrome-devtools-mcp could be added as a second MCP server for that specific use case — the plugin architecture (C6) supports it.

---

## Impact on other documents

- `Unified-MCP-Architecture.md` — update to use `@playwright/mcp` instead of `chrome-devtools-mcp`, update code examples and flag names
- `ci-telegram-bot-shaping.md` — C2.4 updated to reference `@playwright/mcp`, R8.2 ❌→✅, open items updated
- `ADR-001-bot-runtime-decision.md` — Cloudflare acknowledged as documented escape hatch for the browser backend (not used by default)
