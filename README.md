# Groundcrew

Groundcrew is a bot that monitors CI runs and sends results to Telegram. The bot tells you what failed, why it failed, and where to look. It is built for small development teams. These teams do not have a QA engineer, a code reviewer, or someone who monitors CI.

## Who is this for

You are an AI engineer who works with a small team. The team may be a startup, a volunteer project, or a group of two or three people. One developer does most of the work part-time. The team does not have dedicated roles. CI runs but no one checks the results. The bottleneck is not tools. It is human time.

Groundcrew puts AI where the team already works. The team does not learn a new tool. They already use Telegram. The bot works in that same chat.

## What it does

### CI run completes

When a CI run finishes, the bot gets the results and sends a summary to your Telegram chat:

> Build #142 failed. 3 tests broke, all in the auth flow. `login.spec.ts` — timeout waiting for the dashboard after submit. Likely cause: the redirect changed in PR #891. The other 2 failures cascade from the same timeout.

The bot does the work for you. It gets the logs. It finds which tests failed. It connects the failures to recent code changes. Then it writes the summary in plain language.

### You message the bot

When you send a message to the bot in Telegram, it answers with CI data and live website inspection:

> You: why did the deploy break checkout?  
> Bot: Last CI run failed on `checkout-e2e.spec.ts` — the Stripe webhook URL changed in config but the test still points at the old endpoint. The live site returns 502 on `/api/webhooks/stripe`. Check `STRIPE_WEBHOOK_URL` in your deploy config.

### The bot learns over time

The bot stores past results and human corrections. If a test failed three times last week and the cause was always the same, the bot tells you:

> This is the fourth time `login.spec.ts` timed out. Last three times it was a test race condition, not a real regression. Check the `beforeEach` hook.

The bot improves because it recalls what happened before and what a human corrected.

## Why this approach

- **Small teams cannot add more process.** A part-time developer cannot start doing code reviews, writing tests, or monitoring CI. The AI must work where the team already works. It does the work in the background.
- **Deterministic steps stay as code.** The bot fetches logs, calls APIs, and checks config with plain code. The LLM only makes judgments where judgment is necessary. The branching is explicit. You can inspect it.
- **The bot improves from feedback, not from retraining.** When the bot says "the cause is X" and you correct it with "no, it is Y," the bot stores your correction. Next time a similar failure occurs, the bot recalls your correction. The full optimization of prompts is a separate offline job. It does not run on every message.
- **Less token usage. Workflow is broken down to smaller tasks.** This allows easily switch to local LLMs or cheap APIs. The bot does not need to send the entire CI log to the LLM. It only sends the relevant parts. The bot does not need to send the entire website to the LLM. It only sends the relevant pages and API responses.
- **Dead-simple setup (future).** CLI wizard, AI skill, and sample project will make it easy to get started in minutes. This is a planned improvement, not yet built.
- **Minimal but extensible**. The project is relatively lightweight. It aims not just solve the problem but do it in a most efficient way, avoid overkills. Architecture is designed to be extensible, platform agnostic. Start with built in example where bot can analyze CI results of running UI/Playwright tests. Easily extend to other types of CI, testing frameworks, tools, customize logic and routing, learning patterns, etc. All teams are different, so the bot is designed to be easily adaptable to different teams and their workflows, needs.
- **Agent running browser**. The bot inspects live websites using `@playwright/mcp` — the same Playwright browser stack the tests use. Local Chromium by default, Cloudflare as a remote fallback via one env var.

## Reuse

This repository is a working tool and a starting point for others. If you help a small team adopt AI, you can fork this repo. Point it at your own CI and Telegram. Change the analysis prompts for your stack. All team-specific values are environment variables. Nothing is hardcoded.

## Architecture

- **GitHub Actions** — handles triggers. `workflow_run` fires when CI completes. `schedule` and `workflow_dispatch` open live chat sessions. Telegram long polling receives messages. No external server.
- **Ax** — handles the reasoning workflow. The flow is explicit: `recall → plan → analyze → synthesize → reflect → send → log`. Deterministic steps use plain code. LLM steps use typed signatures with validation.
- **Playwright MCP** — `@playwright/mcp` as the MCP server for live website inspection. Cloudflare Browser Rendering is the default backend (no browser install on the runner). Local Chromium is the fallback for offline dev.
- One TypeScript project. No cross-language boundary. Everything runs on GitHub Actions.

See [`shaping/`](shaping/) for the design documents, [`shaping/ADR-001-bot-runtime-decision.md`](shaping/ADR-001-bot-runtime-decision.md) for the runtime decision, and [`shaping/Unified-MCP-Architecture.md`](shaping/Unified-MCP-Architecture.md) for the browser inspection architecture.

## Status

**Shaping complete.** All must-have requirements pass fit check. Implementation has not started.

Design documents in [`shaping/`](shaping/):

| Document | What it covers |
|----------|---------------|
| [`ci-telegram-bot-frame.md`](shaping/ci-telegram-bot-frame.md) | Problem, source, outcome |
| [`ci-telegram-bot-shaping.md`](shaping/ci-telegram-bot-shaping.md) | Requirements, selected shape, components, fit check, milestones |
| [`ADR-001-bot-runtime-decision.md`](shaping/ADR-001-bot-runtime-decision.md) | Why GitHub Actions only — no Eve, no Vercel, no external server |
| [`Unified-MCP-Architecture.md`](shaping/Unified-MCP-Architecture.md) | Browser inspection: `@playwright/mcp` with hybrid local/Cloudflare backend |
| [`playwright-mcp-vs-chrome-devtools-mcp.md`](shaping/playwright-mcp-vs-chrome-devtools-mcp.md) | MCP server comparison and selection |
| [`self-improving.md`](shaping/self-improving.md) | Recall + feedback logging design (v1), GEPA optimizer (deferred) |

**Next step:** Breadboarding Shape C into concrete affordances and wiring, then slicing into vertical implementation increments (M1 first).

## Config

Copy `.env.example` to `.env`. Add your values. All configuration — CI tokens, Telegram bot token, chat ID, target website URL, LLM API key — uses environment variables. Do not commit these values.

## License

MIT
