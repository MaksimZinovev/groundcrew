# ADR-001: Bot Runtime — Why We Chose GitHub Actions Only

**Status:** Accepted
**Date:** 2026-08-20
**Related doc:** CI + Telegram + Live-Site Analysis Bot — Frame

---

## Context

We are building a bot that:

1. Posts a daily CI summary in Telegram.
2. Lets a person chat with the bot for follow-up questions, in short live sessions.
3. Can browse a live website when asked, and combine that with CI data.

Early in the design, we assumed the bot needed to run 24/7 and react instantly to any incoming Telegram message. That assumption drove us toward always-on platforms (Vercel, Cloudflare Workers) and a full agent framework (Eve) to handle triggers, memory, and browser tooling.

Later, we clarified the real usage pattern:

- Every day: one CI summary is posted. No follow-up.
- Every second day: one live chat session, 10–15 minutes max.
- On demand, occasionally: a person starts a short session to ask something without waiting for CI.

This is a **low-frequency, bounded-duration** usage pattern, not a 24/7 service. That change in understanding is what shaped the final decision.

---

## Decision Drivers

These are the constraints and facts that pushed the decision:

1. **Usage is rare and short.** The bot is idle almost all the time. Paying for (or operating) an always-on service does not match this.
2. **Browsing a live website needs a real browser.** Small edge functions (Cloudflare Workers, Vercel Edge) do not include a full browser. Getting one usually means paying for an external browser API.
3. **Telegram supports "pull" as well as "push."** A bot can either wait for Telegram to send it a message (needs a public URL, listening all the time) or ask Telegram directly: "any new messages for me?" (`getUpdates`, long polling). The second option does not need a public URL or an always-on listener.
4. **GitHub Actions runners are full virtual machines**, not tiny edge functions. They can install and run a real headless browser (Playwright) directly inside a job.
5. **We want one platform to operate, not several.** Every extra platform (Vercel, Cloudflare, a database) is one more thing to configure, secure, and pay attention to.
6. **Team data must stay private.** Whatever we choose must make it easy to keep real CI secrets, git tokens, and target website details out of any public code.
7. **Cost should stay near zero.** This is a small-team, low-traffic tool.

---

## Options Considered

### Option 1: Eve + LangGraph

Two frameworks, two languages (TypeScript + Python), connected across a process boundary.
**Rejected:** adds a language boundary and a second runtime, for capabilities we did not end up needing at this usage scale.

### Option 2: Eve alone

One TypeScript project. Simple to deploy, but all logic lives inside the agent's own reasoning — no clear way to say "always run this exact deterministic step, and only sometimes let the model decide."
**Rejected:** does not give predictable control over deterministic vs. LLM-judged steps.

### Option 3: Eve + Ax, deployed on Vercel

Eve handles triggers and durable sessions; Ax provides typed, branching workflow logic. This gives real durability (a paused session survives a crash or a long wait), human-approval gates, and multi-agent support.
**Rejected for now:** these features (durable pause, human-in-the-loop approval, subagents) solve problems we do not currently have. Our sessions are short and finish in one sitting. Paying the setup and hosting cost for durability we do not need is not justified today. This may be worth revisiting if the bot later needs long, unpredictable waits for human approval.

### Option 4: GitHub Actions + Cloudflare/Vercel relay

GitHub Actions handles the CI-triggered summary. A small serverless function on Cloudflare or Vercel receives Telegram's webhook and starts a workflow. Cloudflare's Browser Rendering API or a similar service handles the actual page browsing.
**Rejected as default:** this works, but adds a second platform (Cloudflare or Vercel) purely to receive a message and relay it. Once we realized Telegram supports long polling, this relay step became unnecessary. Cloudflare Browser Rendering is, however, retained as a documented escape hatch for the browser backend only — see the Decision section below and `Unified-MCP-Architecture.md`.

### Option 5: GitHub Actions only (chosen)

GitHub Actions runs everything:

- A `workflow_run` trigger posts the daily CI summary.
- A `schedule` trigger opens a time-boxed (10–15 minute) live chat session on the every-second-day pattern, using Telegram long polling (`getUpdates`) instead of a webhook.
- A `workflow_dispatch` trigger lets a person start an on-demand session manually.
- Playwright runs directly inside the GitHub Actions runner for live browser checks — no external browser service needed.
- Anything worth remembering between sessions is written to a file and committed to a dedicated `bot-memory` git branch, then read back in at the start of the next session.

**Accepted.** This removes the extra platform, removes the need for a database, and matches how rarely and briefly the bot is actually used.

---

## Decision

We will build the bot using **GitHub Actions only**, with three workflow triggers (`workflow_run`, `schedule`, `workflow_dispatch`), Telegram long polling instead of a webhook, Playwright running inside the runner for browsing, and cross-session memory stored as files on a dedicated git branch.

No Cloudflare, Vercel, Eve, or external database is used in the default configuration.

**Cloudflare as a documented escape hatch:** The browser inspection capability (C2.4, deferred to M3) uses `@playwright/mcp` as its MCP server. By default, Chromium runs locally inside the GitHub Actions runner — no external service. If local Chromium hits constraints (runner too slow, browser crashes, need residential IPs), the same MCP code can switch to Cloudflare Browser Rendering's CDP endpoint via one environment variable. This is not used by default and requires no Cloudflare account to start. See `Unified-MCP-Architecture.md` for the full hybrid design.

---

## Consequences

### Positive

- One platform to operate (GitHub Actions), which we already use for CI.
- Effectively free at this usage level (public repos: unlimited free minutes; private repos: well within the free monthly minutes for this usage pattern).
- Real headless browser available with no extra service or extra cost.
- Memory between sessions is stored in git, so it is versioned and readable like any other file, with no database to maintain.
- Simple to keep team secrets private: they live only in GitHub Actions secrets, never in code.

### Negative / accepted trade-offs

- The bot cannot react the instant someone sends a Telegram message out of nowhere. A session must be started first — either by a schedule or by a person manually running the workflow. This is an accepted limitation given the usage pattern (nobody needs an instant cold-start reply).
- Starting a new GitHub Actions run takes roughly 10–30 seconds before it actually begins. Acceptable for a deliberately-started session; would not be acceptable for an always-on assistant.
- Only one long-polling session can run at a time per bot token, or Telegram will return an error. We handle this with GitHub Actions' `concurrency` setting so a second run cannot start while one is active.
- We are giving up Eve's durable session pause and human-approval gate. If a future requirement needs the bot to wait an unpredictable, possibly long time for a human decision (hours or days), this decision should be revisited — GitHub Actions is not built for a job to sit open that long.
- We are giving up Eve's subagent and skill-loading features. Ax's own multi-agent support covers what we currently need instead.

---

## Revisit This Decision If

- The bot needs to react instantly to an unscheduled Telegram message, without a person starting a session first.
- A workflow needs to pause for an unpredictable, possibly long wait on a human decision.
- Usage grows enough that repeated short-lived runner startups become a real cost or delay problem.
