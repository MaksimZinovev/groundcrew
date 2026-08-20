# ADR-002: Browser Backend — Cloudflare as Default

**Status:** Accepted
**Date:** 2026-08-20
**Supersedes:** ADR-001's "No Cloudflare" language (for browser backend only)
**Related:** `Unified-MCP-Architecture.md`, `ADR-001-bot-runtime-decision.md`

---

## Context

ADR-001 decided GitHub Actions only, no Cloudflare. The browser was deferred to M3. The spike (`playwright-mcp-vs-chrome-devtools-mcp.md`) and the Unified MCP Architecture doc proposed a hybrid: local Chromium default, Cloudflare escape hatch.

In practice, the low-frequency, bounded-duration usage pattern (daily CI summary + occasional 10–15 min sessions) makes the ~300MB Chromium download per run wasteful. Cloudflare Browser Rendering's free tier covers this usage. The bot already calls external APIs (GitHub REST, Telegram Bot API) — the browser backend is the same category.

## Decision

**Cloudflare Browser Rendering is the default browser backend.** The `@playwright/mcp` MCP server connects to Cloudflare's CDP endpoint via `CF_BROWSER_ENDPOINT` and `CF_API_TOKEN` env vars. No Chromium is installed on the runner.

The bot's runtime is still GitHub Actions (R8.1 holds — the bot runs on GHA, calls external APIs like GitHub, Telegram, and Cloudflare). The browser is an external API, not a deployment platform.

## Alternatives (for future config)

| Variant | When | How |
|--------|------|-----|
| **Local Chromium** | Offline dev, no Cloudflare account, air-gapped runner | Omit `CF_BROWSER_ENDPOINT`. `@playwright/mcp` launches local Chromium. |
| **System Chrome** | GHA `ubuntu-latest` (Chrome pre-installed, no download) | `--browser=chrome` flag. Still local, no Cloudflare. |
| **User choice** | Future: let forkers pick their backend | Config flag or env var selects local vs Cloudflare vs other CDP endpoint. |

A future milestone may add a config option so forkers choose between these variants without code changes.

## Consequences

- **Faster M3 startup:** no browser download, near-instant CDP connection.
- **External dependency:** requires `CF_ACCOUNT_ID` and `CF_API_TOKEN` as GitHub Actions secrets. Free tier covers this usage pattern.
- **R8.1:** bot runtime is still GitHub Actions. The browser is an external API call (same as GitHub API and Telegram API).
- **R8.2:** even more satisfied — zero browser weight on the runner.
- **Offline development:** needs a fallback to local Chromium (set `CF_BROWSER_ENDPOINT` to empty).
