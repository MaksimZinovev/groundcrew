# Browser Agent Spike — Comparison

## Goal

Find a browser automation tool from the user's GitHub starred repos that can run headless Chromium on GitHub Actions runners, is lightweight enough to complete site inspections in minutes, and can be wrapped as an Ax `fn()` node or MCP tool in the Groundcrew CI+Telegram bot.

## Criteria

| ID | Criterion | Status | Weight |
|----|-----------|----------|--------|
| R0 | Wrappable as Ax fn() or MCP — programmatic/MCP interface, not just a UI/extension | Must-have | 1.0 |
| R1 | Runs on GitHub Actions runner — self-contained headless browser OR callable via API from runner | Must-have | 1.0 |
| R2 | Active maintenance — last push within 6 months, has releases or active commits | Important | 0.7 |
| R3 | Lightweight — setup + execution within a short GH Actions session (10-15 min) | Important | 0.7 |
| R4 | TypeScript/JS native — preferred for R4 compliance, but any language OK if wrappable | Nice-to-have | 0.4 |

---

## Fit Check

| Req | Requirement | Status | microsoft/playwright | ChromeDevTools/chrome-devtools-mcp | vercel-labs/agent-browser | GoogleChrome/lighthouse | SawyerHood/dev-browser | nicobailon/surf-cli | unclecode/crawl4ai | D4Vinci/Scrapling | lightpanda-io/browser | h4ckf0r0day/obscura | browser-use/browser-use | firecrawl/firecrawl | alibaba/page-agent | jackwener/OpenCLI | microsoft/magentic-ui |
|-----|-------------|----------|------------|---------------------|----------------|------------|-------------|----------|----------|-----------|------------|---------|-------------|-----------|------------|---------|-------------|
| R0 | Wrappable as Ax fn/MCP | Must-have | ✅ [facts/microsoft_playwright_facts.json] | ✅ [facts/ChromeDevTools_chrome-devtools-mcp_facts.json] | ✅ [facts/vercel-labs_agent-browser_facts.json] | ✅ [facts/GoogleChrome_lighthouse_facts.json] | ✅ [facts/SawyerHood_dev-browser_facts.json] | ✅ [facts/nicobailon_surf-cli_facts.json] | ✅ [facts/unclecode_crawl4ai_facts.json] | ✅ [facts/D4Vinci_Scrapling_facts.json] | ✅ [facts/lightpanda-io_browser_facts.json] | ✅ [facts/h4ckf0r0day_obscura_facts.json] | ✅ [facts/browser-use_browser-use_facts.json] | ✅ [facts/firecrawl_firecrawl_facts.json] | ✅ [facts/alibaba_page-agent_facts.json] | ✅ [facts/jackwener_OpenCLI_facts.json] | ❌ [facts/microsoft_magentic-ui_facts.json] |
| R1 | Runs on GH Actions runner | Must-have | ✅ [facts/microsoft_playwright_facts.json] | ✅ [facts/ChromeDevTools_chrome-devtools-mcp_facts.json] | ✅ [facts/vercel-labs_agent-browser_facts.json] | ✅ [facts/GoogleChrome_lighthouse_facts.json] | ✅ [facts/SawyerHood_dev-browser_facts.json] | ✅ [facts/nicobailon_surf-cli_facts.json] | ✅ [facts/unclecode_crawl4ai_facts.json] | ✅ [facts/D4Vinci_Scrapling_facts.json] | ✅ [facts/lightpanda-io_browser_facts.json] | ✅ [facts/h4ckf0r0day_obscura_facts.json] | ✅ [facts/browser-use_browser-use_facts.json] | ❌ [facts/firecrawl_firecrawl_facts.json] | ❌ [facts/alibaba_page-agent_facts.json] | ❌ [facts/jackwener_OpenCLI_facts.json] | ❌ [facts/microsoft_magentic-ui_facts.json] |
| R2 | Active maintenance (<6mo) | Important | ✅ [meta/microsoft_playwright_meta.json] | ✅ [meta/ChromeDevTools_chrome-devtools-mcp_meta.json] | ✅ [meta/vercel-labs_agent-browser_meta.json] | ✅ [meta/GoogleChrome_lighthouse_meta.json] | ✅ [meta/SawyerHood_dev-browser_meta.json] | ✅ [meta/nicobailon_surf-cli_meta.json] | ✅ [meta/unclecode_crawl4ai_meta.json] | ✅ [meta/D4Vinci_Scrapling_meta.json] | ✅ [meta/lightpanda-io_browser_meta.json] | ✅ [meta/h4ckf0r0day_obscura_meta.json] | ✅ [meta/browser-use_browser-use_meta.json] | ✅ [meta/firecrawl_firecrawl_meta.json] | ✅ [meta/alibaba_page-agent_meta.json] | ✅ [meta/jackwener_OpenCLI_meta.json] | ✅ [meta/microsoft_magentic-ui_meta.json] |
| R3 | Lightweight | Important | ✅ [facts/microsoft_playwright_facts.json] | ✅ [facts/ChromeDevTools_chrome-devtools-mcp_facts.json] | ✅ [facts/vercel-labs_agent-browser_facts.json] | ✅ [facts/GoogleChrome_lighthouse_facts.json] | ✅ [facts/SawyerHood_dev-browser_facts.json] | ✅ [facts/nicobailon_surf-cli_facts.json] | ✅ [facts/unclecode_crawl4ai_facts.json] | ✅ [facts/D4Vinci_Scrapling_facts.json] | ✅ [facts/lightpanda-io_browser_facts.json] | ✅ [facts/h4ckf0r0day_obscura_facts.json] | ❌ [facts/browser-use_browser-use_facts.json] | ❌ [facts/firecrawl_firecrawl_facts.json] | ❌ [facts/alibaba_page-agent_facts.json] | ❌ [facts/jackwener_OpenCLI_facts.json] | ❌ [facts/microsoft_magentic-ui_facts.json] |
| R4 | TypeScript/JS native | Nice-to-have | ✅ [meta/microsoft_playwright_meta.json] | ✅ [meta/ChromeDevTools_chrome-devtools-mcp_meta.json] | ❌ [meta/vercel-labs_agent-browser_meta.json] | ✅ [meta/GoogleChrome_lighthouse_meta.json] | ✅ [meta/SawyerHood_dev-browser_meta.json] | ✅ [meta/nicobailon_surf-cli_meta.json] | ❌ [meta/unclecode_crawl4ai_meta.json] | ❌ [meta/D4Vinci_Scrapling_meta.json] | ❌ [meta/lightpanda-io_browser_meta.json] | ❌ [meta/h4ckf0r0day_obscura_meta.json] | ❌ [meta/browser-use_browser-use_meta.json] | ✅ [meta/firecrawl_firecrawl_meta.json] | ✅ [meta/alibaba_page-agent_meta.json] | ✅ [meta/jackwener_OpenCLI_meta.json] | ❌ [meta/microsoft_magentic-ui_meta.json] |

---

## Weighted Scores

| Repo | R0 (×1.0) | R1 (×1.0) | R2 (×0.7) | R3 (×0.7) | R4 (×0.4) | Total | Rank |
|------|-----------|-----------|-----------|-----------|-----------|-------|------|
| microsoft/playwright | 1.0 | 1.0 | 0.7 | 0.7 | 0.4 | 3.8 | 🥇 |
| ChromeDevTools/chrome-devtools-mcp | 1.0 | 1.0 | 0.7 | 0.7 | 0.4 | 3.8 | 🥇 |
| GoogleChrome/lighthouse | 1.0 | 1.0 | 0.7 | 0.7 | 0.4 | 3.8 | 🥇 |
| SawyerHood/dev-browser | 1.0 | 1.0 | 0.7 | 0.7 | 0.4 | 3.8 | 🥇 |
| nicobailon/surf-cli | 1.0 | 1.0 | 0.7 | 0.7 | 0.4 | 3.8 | 🥇 |
| vercel-labs/agent-browser | 1.0 | 1.0 | 0.7 | 0.7 | 0.0 | 3.4 | 🥈 |
| unclecode/crawl4ai | 1.0 | 1.0 | 0.7 | 0.7 | 0.0 | 3.4 | 🥈 |
| D4Vinci/Scrapling | 1.0 | 1.0 | 0.7 | 0.7 | 0.0 | 3.4 | 🥈 |
| lightpanda-io/browser | 1.0 | 1.0 | 0.7 | 0.7 | 0.0 | 3.4 | 🥈 |
| h4ckf0r0day/obscura | 1.0 | 1.0 | 0.7 | 0.7 | 0.0 | 3.4 | 🥈 |
| browser-use/browser-use | 1.0 | 1.0 | 0.7 | 0.0 | 0.0 | 2.7 | 🥉 |
| firecrawl/firecrawl | 1.0 | 0.0 | 0.7 | 0.0 | 0.4 | 2.1 | 4 |
| alibaba/page-agent | 1.0 | 0.0 | 0.7 | 0.0 | 0.4 | 2.1 | 4 |
| jackwener/OpenCLI | 1.0 | 0.0 | 0.7 | 0.0 | 0.4 | 2.1 | 4 |
| microsoft/magentic-ui | 0.0 | 0.0 | 0.7 | 0.0 | 0.0 | 0.7 | 5 |

**Priority weights:** Must-have=1.0, Important=0.7, Nice-to-have=0.4

---

## Top 3 Ranked — Trade-offs and Recommendation

### 🥇 1. microsoft/playwright (score 3.8, ★94.8K, TypeScript, Apache-2.0)

**Why it wins:** Playwright is the industry standard for headless browser automation on CI. It is TypeScript-native (satisfies R4), exposes all three integration interfaces — programmatic TS SDK, MCP server (`@playwright/mcp`), and CLI (`@playwright/cli`) — giving maximum flexibility for wrapping as an Ax `fn()`. The reference project (`~/repos/scool-playwright`) already uses Playwright on GitHub Actions, confirming the proven pattern. It runs headless by default on `ubuntu-latest`, with optimized CI setup (`npm ci` + `npx playwright install --with-deps`).

**Trade-offs:**

- **Weight:** Downloads Chromium/Firefox/WebKit binaries (~300MB+ per browser). Heavier than Rust-binary alternatives. Mitigated by Docker images with pre-installed browsers and `playwright-core` (no browser download).
- **Not agent-specific:** Playwright is a general-purpose browser automation library, not designed specifically for AI agents. The MCP server (`@playwright/mcp`) adds the agent layer, but it's a separate package.
- **Overkill potential:** For simple site inspection (navigate, read content, screenshot), the full Playwright API is more than needed. But this also means it can grow with requirements.

**Integration path:** `import { chromium } from 'playwright'` → wrap as Ax `fn()`. Or use `@playwright/mcp` as MCP server in the Ax workflow.

### 🥈 2. ChromeDevTools/chrome-devtools-mcp (score 3.8, ★49.5K, TypeScript, Apache-2.0)

**Why it's #2:** This is the most MCP-native option. Its primary interface IS an MCP server (`npx chrome-devtools-mcp@latest`), designed specifically for AI agents to control and inspect a live Chrome browser. It's TypeScript-native, has a CLI, and a programmatic API. If the Ax workflow speaks MCP, this is the most natural integration — no wrapping needed, just configure the MCP client.

**Trade-offs:**

- **Dependency stack:** Uses Puppeteer under the hood (which downloads Chromium). The dependency tree is larger than Playwright alone. `PUPPETEER_SKIP_DOWNLOAD` can mitigate.
- **Narrower scope:** Focused on Chrome DevTools specifically. No Firefox/WebKit support. For site inspection of the user's own site, Chrome-only is fine.
- **Maturity:** v1.7.0 — relatively new but actively maintained by the ChromeDevTools team.
- **CI setup:** Requires AppArmor to be disabled on Ubuntu (documented in their CI workflow).

**Integration path:** Configure as MCP server in Ax workflow → `npx chrome-devtools-mcp@latest` → agent calls MCP tools directly.

### 🥉 3. vercel-labs/agent-browser (score 3.4, ★41.0K, Rust, Apache-2.0)

**Why it's #3:** The lightweight dark horse. At 7MB install (down from 710MB after removing the Node.js/Playwright daemon), 8MB memory, and 617ms cold start, it's an order of magnitude lighter than any other candidate. It exposes an MCP server (stdio JSON-RPC with tool profiles), a CLI (`--json` flag for machine-readable output), and a TypeScript API for serverless environments. Designed specifically for AI agents with ref-based deterministic interactions.

**Trade-offs:**

- **Rust, not TypeScript:** Fails R4 (nice-to-have). The Ax workflow is TS-native, so calling a Rust binary via child_process or MCP adds a process boundary (R4 concern). The `@agent-browser/sandbox/vercel` TS wrapper mitigates this for serverless, but on GHA the MCP server path is cleaner.
- **Requires Chrome:** Still needs Chrome installed (`agent-browser install`). Unlike obscura/lightpanda which have native rendering, agent-browser drives a real Chrome instance.
- **Newer project:** v0.34.0. Backed by Vercel Labs but less battle-tested than Playwright.

**Integration path:** `agent-browser mcp` as MCP server in Ax workflow, or `agent-browser open <url> --json` as CLI called from Ax `fn()`.

---

## Honorable Mentions (score 3.4, not TS/JS)

- **h4ckf0r0day/obscura** (Rust, ★21.7K): 70MB single binary, 30MB memory, no Chromium needed (native V8 rendering), CDP + MCP server. Extremely promising for zero-dependency CI, but v0.2.0 and native rendering has CSS compatibility gaps vs real Chromium. Worth watching.
- **lightpanda-io/browser** (Zig, ★34.1K): Similar concept to obscura — single binary, no Chromium, CDP-compatible. But nightly builds only (no stable release). Less mature.
- **unclecode/crawl4ai** (Python, ★78.8K): Excellent for LLM-friendly web crawling, but crawl-focused rather than general browser interaction. Good if the use case evolves toward content extraction.

---

## Score False Positives (qualitative analysis beyond binary scoring)

- **GoogleChrome/lighthouse** (score 3.8): Passes all criteria on paper, but it's a performance auditing tool, not a browser agent. It can audit a page but can't navigate, click, fill forms, or return general page content. It returns Lighthouse metrics, not site observations. Not suitable for the Site-Inspector node.
- **nicobailon/surf-cli** (score 3.8): Passes all criteria, but requires loading a browser extension into Chrome — impractical on a headless GitHub Actions runner without complex Xvfb + manual extension loading workarounds. The extension-based architecture is designed for interactive use, not CI.
- **SawyerHood/dev-browser** (score 3.8): Passes all criteria, but scripts run in a QuickJS sandbox with limited globals (not the full browser API). No MCP server. CLI-only. Smaller project (6.5K stars). Good as a Claude Skill but less flexible for an Ax workflow.

---

## Recommendation

**Use Playwright as the foundation, with chrome-devtools-mcp as the MCP interface.**

Playwright is the proven, safe choice — TypeScript-native, already used in the reference project, with the largest ecosystem and best documentation. For the Ax workflow integration, two paths are viable:

1. **Direct fn() wrapping** (simplest): Wrap Playwright's programmatic API as an Ax `fn()` node. The Site-Inspector node calls `chromium.launch()`, navigates to the URL, extracts content, and returns observations. Full control, no process boundary, TypeScript throughout. Best for R3 (predictable control over deterministic vs LLM steps).

2. **MCP via chrome-devtools-mcp** (most agent-native): Use `chrome-devtools-mcp` as an MCP server in the Ax workflow. The agent calls MCP tools (navigate_page, take_screenshot, get_dom_snapshot) directly. This gives the Ax workflow's LLM direct browser control without writing custom browser automation code. Best for flexibility and rapid iteration.

**If weight is a critical concern:** Replace the Chromium download with `agent-browser` (7MB, MCP server) or `obscura` (70MB, no Chromium, MCP + CDP). Both expose MCP servers that the Ax workflow can call, and both are dramatically lighter than Playwright + Chromium. The trade-off is the language boundary (Rust) and less maturity.

---

## Notes

- microsoft/playwright ✅ R0: Programmatic TS API + MCP server (@playwright/mcp) + CLI [facts/microsoft_playwright_facts.json]
- microsoft/playwright ✅ R1: Runs headless on ubuntu-latest, npm ci + playwright install [facts/microsoft_playwright_facts.json]
- ChromeDevTools/chrome-devtools-mcp ✅ R0: MCP server (primary) + CLI + TS API [facts/ChromeDevTools_chrome-devtools-mcp_facts.json]
- vercel-labs/agent-browser ✅ R3: 7MB install, 8MB memory, 617ms cold start [facts/vercel-labs_agent-browser_facts.json]
- h4ckf0r0day/obscura ✅ R3: 70MB binary, 30MB memory, 85ms page load, no Chromium needed [facts/h4ckf0r0day_obscura_facts.json]
- firecrawl/firecrawl ❌ R1: Primarily hosted service, self-hosting requires Redis + microservices [facts/firecrawl_firecrawl_facts.json]
- alibaba/page-agent ❌ R1: In-page JS agent, needs separate browser to inject script [facts/alibaba_page-agent_facts.json]
- jackwener/OpenCLI ❌ R1: Requires browser extension loading, impractical on headless CI [facts/jackwener_OpenCLI_facts.json]
- microsoft/magentic-ui ❌ R0: No programmatic API/MCP, web UI only [facts/microsoft_magentic-ui_facts.json]
- GoogleChrome/lighthouse: Passes all criteria but is an auditing tool, not a browser agent (qualitative false positive)
- nicobailon/surf-cli: Passes all criteria but requires browser extension loading, impractical on headless CI (qualitative false positive)
- SawyerHood/dev-browser: Passes all criteria but scripts run in QuickJS sandbox with limited globals (qualitative limitation)

---

## Gaps

No gaps found. All 15 candidates have facts for all criteria. See [gaps.md](gaps.md).

## Validation

PASS — 5/5 claims sourced, 15 fact files + 15 meta files loaded, 0 gaps. All source references verified.
