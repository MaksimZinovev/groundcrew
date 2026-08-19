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
- **Dead-simple setup with CLI wizard, AI skill and sample project.**. This is why this project might be more attractive despite the fact there are a lot of alternatives.
- **Minimal but extensible**. The project is relatively lightweight. It aims not just solve the problem but do it in a most efficient way, avoid overkills. Architecture is designed to be extensible, platform agnostic. Start with built in example where bot can analyze CI results of running UI/Playwright tests. Easily extend to other types of CI, testing frameworks, tools, customize logic and routing, learning patterns, etc. All teams are different, so the bot is designed to be easily adaptable to different teams and their workflows, needs. 
- **Agent running browser**. This is typically the heaviest capability. That's why the project intentionally has chosen the most lightweight and efficient way to run the browser.

## Reuse

This repository is a working tool and a starting point for others. If you help a small team adopt AI, you can fork this repo. Point it at your own CI and Telegram. Change the analysis prompts for your stack. All team-specific values are environment variables. Nothing is hardcoded.

## Architecture

- **Eve** — handles triggers and channels (CI webhook, Telegram). This is how the bot wakes up.
- **Ax** — handles the reasoning workflow. The flow is explicit: `recall → plan → analyze → synthesize → reflect → send → log`. Deterministic steps use plain code. LLM steps use typed signatures with validation.
- One TypeScript project. No cross-language boundary.

See [`shaping/`](shaping/) for the design documents.

## Status

Early stage. The design is complete. Implementation has not started. The documents in `shaping/` define what to build and in what order.

## Config

Copy `.env.example` to `.env`. Add your values. All configuration — CI tokens, Telegram bot token, chat ID, target website URL, LLM API key — uses environment variables. Do not commit these values.

## License

MIT
