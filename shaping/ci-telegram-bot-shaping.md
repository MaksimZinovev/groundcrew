---
shaping: true
---

# CI + Telegram Bot — Shaping

> See `ci-telegram-bot-frame.md` for source, problem, and outcome. See `self-improving.md` for the self-improvement design that informed R5 and the Ax flow shape. See `ADR-001-bot-runtime-decision.md` for the runtime decision that removed Eve and settled GitHub Actions as the only platform.

---

## Requirements (R)

| ID | Requirement | Status |
|----|-------------|--------|
| R0 | CI run results summarized and posted to Telegram automatically | Core goal |
| R1 | Bot wakes on two trigger types: CI completion event and incoming Telegram message | Must-have |
| R2 | Bot can inspect live website and combine that with CI data before responding | Nice-to-have |
| R3 | Explicit, predictable control over which steps are deterministic code vs LLM judgment | Must-have |
| R4 | Single-language (TypeScript) implementation — no cross-language process boundary | Must-have |
| R5 | **Self-improvement** | |
| R5.1 | Recall relevant past runs and human corrections before responding (in-context, within execution) | Must-have |
| R5.2 | Improve prompts/signatures over time via periodic offline optimization (GEPA) | Nice-to-have |
| R6 | **Packaging** | |
| R6.1 | Repo structured as a publishable, forkable template others can adapt | Must-have |
| R6.2 | All team-specific values (CI tokens, git secrets, Telegram bot token, target website URL, chat IDs) in env vars — never committed | Must-have |
| R6.3 | Template docs and forker-facing README (how to adapt this) | Nice-to-have |
| R7 | 🟡 **Efficiency and simplicity** | |
| R7.1 | 🟡 Token efficiency — workflow broken into smaller tasks, only relevant parts sent to LLM, supports local/cheap LLMs | Must-have |
| R7.2 | 🟡 Dead-simple setup — CLI wizard, AI skill, and sample project (Playwright/CI) so users can get started in minutes | Must-have |
| R7.3 | 🟡 Minimal but extensible — platform-agnostic, easily extend to other CI types, testing frameworks, tools, customize logic and routing | Must-have |
| R8 | 🟡 **Lean deployment on GitHub Actions** | |
| R8.1 | 🟡 Entire bot runs on GitHub Actions — no external server, no Vercel, no container | Must-have |
| R8.2 | 🟡 Browser agent lightweight enough to run on GitHub Actions runner (Ubuntu, limited time, no persistent browser infra) | Must-have |

---

## Selected Shape: C — Ax on GitHub Actions

Single TypeScript project. GitHub Actions workflow triggers own the trigger layer (replacing Eve per ADR-001). Ax owns the reasoning workflow as a typed, branching flow graph. Everything runs inside GitHub Actions runners — no external server, no Vercel, no Eve, no database.

> **Evolution note:** Shape C was originally "Eve + Ax" (see frame's architecture options). ADR-001 removed Eve after clarifying the real usage pattern: low-frequency, bounded-duration sessions, not 24/7. GitHub Actions triggers (`workflow_run`, `schedule`, `workflow_dispatch`) + Telegram long polling replace Eve's channels. Playwright runs directly inside the runner for browsing. Memory is stored as files on a `bot-memory` git branch. See `ADR-001-bot-runtime-decision.md` for the full rationale.

### Fit Check: R × C

| Req | Requirement | Status | C |
|-----|-------------|--------|---|
| R0 | CI run results summarized and posted to Telegram automatically | Core goal | ✅ |
| R1 | Bot wakes on two trigger types: CI completion event and incoming Telegram message | Must-have | ✅ |
| R2 | Bot can inspect live website and combine that with CI data before responding | Nice-to-have | ✅ |
| R3 | Explicit, predictable control over which steps are deterministic code vs LLM judgment | Must-have | ✅ |
| R4 | Single-language (TypeScript) implementation — no cross-language process boundary | Must-have | ✅ |
| R5.1 | Recall relevant past runs and human corrections before responding | Must-have | ✅ |
| R5.2 | Improve prompts/signatures over time via periodic offline optimization (GEPA) | Nice-to-have | ✅ |
| R6.1 | Repo structured as a publishable, forkable template others can adapt | Must-have | ✅ |
| R6.2 | All team-specific values in env vars — never committed | Must-have | ✅ |
| R6.3 | Template docs and forker-facing README | Nice-to-have | ✅ |
| R7.1 | 🟡 Token efficiency — smaller tasks, only relevant parts to LLM, local/cheap LLM support | Must-have | ✅ |
| R7.2 | 🟡 Dead-simple setup — CLI wizard, AI skill, sample project | Must-have | ❌ |
| R7.3 | 🟡 Minimal but extensible — platform-agnostic, extend to other CI/frameworks | Must-have | ✅ |
| R8.1 | 🟡 Entire bot runs on GitHub Actions — no external server | Must-have | ✅ |
| R8.2 | 🟡 Browser agent lightweight enough for GitHub Actions runner | Must-have | ❌ |

**Notes:**

- R7.2 fails: Shape C has no CLI wizard, AI skill, or sample project component. These are new capabilities not in C1–C6.
- R7.3 resolved via C6: plugins are npm packages exporting Ax `fn()` tool definitions. No plugin framework — TypeScript imports are the composition mechanism. CI provider adapters (C6.3) use the same pattern. See C6 component below.
- R8.1 resolved via ADR-001: GitHub Actions only. No Eve, no Vercel, no Cloudflare, no external server. Three triggers: `workflow_run` (CI summary), `schedule` (live chat sessions), `workflow_dispatch` (on-demand). Telegram long polling instead of webhook. See `ADR-001-bot-runtime-decision.md`.
- R8.2 fails: C2.4 says "Playwright" but the browser tool has not been evaluated against GitHub Actions runner constraints. 32 candidates in `shaping/GitHub-Stars-Manager-browser-agent.md` need a spike to resolve.

---

## Components (C1–C6)

### C1: Trigger layer (GitHub Actions) 🟡

| Part | Mechanism | Flag |
|------|-----------|:----:|
| **C1** | **Trigger layer (GitHub Actions workflows)** | |
| C1.1 | 🟡 GitHub Actions `workflow_run` trigger fires when a CI workflow completes | |
| C1.2 | 🟡 GitHub Actions `schedule` + `workflow_dispatch` triggers open time-boxed Telegram long-polling sessions (M2) | ⚠️ |
| C1.3 | 🟡 Plain TypeScript functions for external calls: fetch CI run logs via GitHub REST API, send Telegram message via HTTP POST | |
| C1.4 | 🟡 `concurrency` setting prevents overlapping long-polling sessions (one bot token = one session at a time) | |

> **C1.2 is ⚠️** — the `workflow_run` trigger (C1.1) is needed in M1 (posting CI summaries to Telegram). The interactive Telegram session (`schedule` + `workflow_dispatch` + long polling) is deferred to M2. The mechanism is understood (Telegram `getUpdates` long polling per ADR-001), but not yet wired. This is a sequencing decision, not an unknown.

### C2: Reasoning workflow (Ax AxFlow)

| Part | Mechanism | Flag |
|------|-----------|:----:|
| **C2** | **Reasoning workflow (Ax AxFlow)** | |
| C2.1 | `recall()` node — queries memory store for similar past CI failures + human corrections, before planning | ⚠️ |
| C2.2 | Planner node — sees recalled context, decides which specialist(s) to invoke (deterministic routing logic) | |
| C2.3 | CI-Analyst node — deterministic fetch of CI logs + LLM analysis of results | |
| C2.4 | Site-Inspector node — browses live site via Playwright, returns observations (deferred to M3, designed for now) | ⚠️ |
| C2.5 | Synthesizer node — drafts answer from recalled history + specialist output | |
| C2.6 | Reflection node — self-critique with max 2 retries (Ax flow loop) | |
| C2.7 | Send node — posts summary to Telegram via C1.3 | |
| C2.8 | Log outcome node — logs accepted/corrected + stores correction text, tagged by topic | |

> **C2.1 is ⚠️** — recall() needs a memory store (C3) that doesn't exist yet. The mechanism is understood (Ax `onMemoriesSearch`/`recall` pattern from self-improving.md), but the store backing it is a design choice (see C3 below).
>
> **C2.4 is ⚠️** — browser inspection is deferred to M3. The mechanism (Playwright in an Ax node/agent) is understood but not yet wired. Sequencing decision, not an unknown.

### C3: Memory store (git branch) 🟡

| Part | Mechanism | Flag |
|------|-----------|:----:|
| **C3** | **Memory store** | |
| C3.1 | 🟡 Files committed to a dedicated `bot-memory` git branch — past executions, outcomes, human corrections, tagged by topic. Read at start of each run, written at end. | |
| C3.2 | Upgrade to vector search for semantic recall (later, when recall needs it) | ⚠️ |

> **C3.1 updated per ADR-001:** GitHub Actions has no persistent filesystem between runs. Memory is stored as files on a `bot-memory` git branch — versioned, readable, no database to maintain. Each run reads the branch at start, writes at end.
>
> **C3.2 is ⚠️** — deferred upgrade. The v1 store is plain files on a git branch; semantic search is a later enhancement when the store grows large enough that keyword matching isn't enough.

### C4: Offline GEPA optimizer (deferred)

| Part | Mechanism | Flag |
|------|-----------|:----:|
| **C4** | **Offline GEPA optimizer — separate periodic job, NOT part of live execution** | |
| C4.1 | Weekly GitHub Action pulls accumulated logs/corrections from `bot-memory` branch | ⚠️ |
| C4.2 | AxGEPA optimizer uses corrections as training signal, optimizes signatures/few-shot examples | ⚠️ |
| C4.3 | Deploys improved signature/prompt config that future executions pick up | ⚠️ |

> **All C4 parts are ⚠️** — the entire GEPA optimizer is deferred to a later milestone. The mechanism is designed (see self-improving.md), but not yet built. This is intentional: you can't optimize against corrections you haven't accumulated yet.

### C5: Config and packaging

| Part | Mechanism | Flag |
|------|-----------|:----:|
| **C5** | **Config and packaging** | |
| C5.1 | `.env.example` ships with placeholder values and documentation | |
| C5.2 | All team-specific values read from `process.env` / GitHub Actions secrets at runtime | |
| C5.3 | Template docs, forker README, "how to adapt this" guides | ⚠️ |
| C5.4 | 🟡 CLI wizard (`npx groundcrew init`) — prompts for CI provider, Telegram token, chat ID, target URL; generates `.env` and workflow file | ⚠️ |
| C5.5 | 🟡 Sample project — a repo with a Playwright test suite and GitHub Actions workflow that triggers Groundcrew on `workflow_run` | ⚠️ |
| C5.6 | 🟡 AI skill — a reusable skill (pi/Claude Code) that helps users adapt Groundcrew to their stack | ⚠️ |

> **C5.4–C5.6 are ⚠️** — new components from R7.2. The mechanisms are described at a high level but not yet concretely designed.
>
> **C5.3 is ⚠️** — deferred. The env-var config (C5.1–C5.2) is in from line one; the forker-facing documentation is extracted after the bot works for the real team.

### C6: Plugin interface 🟡

| Part | Mechanism | Flag |
|------|-----------|:----:|
| **C6** | **Plugin interface — npm packages as plugins, no framework** | |
| C6.1 | 🟡 Plugins are npm packages exporting Ax `fn()` tool definitions — no loader, no registry, no dynamic discovery. TypeScript imports are the composition mechanism. | |
| C6.2 | 🟡 Core defines AxFlow node slots where plugins plug in: context tools (extra `fn()` for the analyze agent), inspector tools (browser capabilities), CI provider adapters | |
| C6.3 | 🟡 CI provider adapter interface — the pluggable CI provider (R7.3) is itself a plugin. GitHub Actions adapter ships in-repo; others (CircleCI, GitLab CI) are separate npm packages. | |
| C6.4 | 🟡 Community plugin convention: `@groundcrew/plugin-*` naming on npm, each published as a separate GitHub repo. Core README links to community plugins. No central registry. | ⚠️ |

> **C6.1–C6.3 are understood** — the mechanism is Ax's `fn()` API + TypeScript imports. No new infrastructure to build. The "plugin system" is npm.
>
> **C6.4 is ⚠️** — the community convention and documentation is deferred to M5 (template packaging). The code interface (C6.1–C6.3) is in from M1.

---

## Resolved Alternatives

### ADR-001: Eve removed, GitHub Actions only 🟡

**Decision:** Eve is removed from the architecture entirely. GitHub Actions workflow triggers replace Eve's channels. Telegram long polling replaces Eve's webhook listener. Playwright runs directly inside the GitHub Actions runner. Memory is stored as files on a `bot-memory` git branch.

**Rationale:** The real usage pattern is low-frequency and bounded-duration (daily CI summary, every-second-day 10-15 min chat sessions). An always-on durable agent framework does not match this. One platform (GitHub Actions) is simpler to operate and effectively free. See `ADR-001-bot-runtime-decision.md` for the full decision, options considered, and trade-offs.

**Impact on shape:** Shape C evolves from "Eve + Ax" to "Ax on GitHub Actions." Component C1 (trigger layer) is rewritten. R8.1 fit check changes from ❌ to ✅.

### C1 trigger scope: CI webhook first, interactive later

| Req | Requirement | C1-A (both from day one) | C1-B (CI first, interactive M2) |
|-----|-------------|:---:|:---:|
| R0 | CI run results summarized and posted to Telegram automatically | ✅ | ✅ |
| R1 | Bot wakes on two trigger types | ✅ | ✅ |

**Selected: C1-B.** Ship the `workflow_run` → summarize → Telegram post path first. The interactive Telegram session (`schedule`/`workflow_dispatch` + long polling) is M2. **Rationale (ponytail):** two triggers = two workflows to wire, two debug paths. One trigger proves the value; the second is additive. **User note:** "design with future in mind" — the interactive trigger should be accommodated in the GitHub Actions workflow structure without rearchitecting.

### C2 reasoning: Ax from day one

| Req | Requirement | C2-A (plain functions, add Ax later) | C2-B (Ax from day one) |
|-----|-------------|:---:|:---:|
| R3 | Explicit deterministic vs LLM step control | ❌ | ✅ |
| R5.1 | Recall past runs + corrections before responding | ❌ | ✅ |

**Selected: C2-B.** Ax from day one. **Rationale:** The recall() step, feedback-capture step, and planner/synthesizer/reflection nodes are natural Ax flow nodes. Building them as plain functions first and bolting Ax on later means rewriting the same pipeline as a graph. The self-improving.md doc makes the case: recall() before planning and feedback logging after responses are woven into the Ax flow. Only GEPA (C4) is deferred.

### C2.4 browser inspection: deferred

| Req | Requirement | C2.4-A (from day one) | C2.4-B (defer to M3) |
|-----|-------------|:---:|:---:|
| R2 | Bot can inspect live website and combine with CI data | ✅ | ✅ |

**Selected: C2.4-B.** Defer browser inspection to M3. Ship v1 as CI-summary-only. **Rationale (ponytail):** browsing is the heaviest capability — needs a browser runtime, which is a deploy constraint. The first time a failure summary isn't enough and you wish the bot could see the live site, that's when you add it.

### C3 + C4 self-improvement: recall + logging from v1, GEPA deferred

| Req | Requirement | C3/C4-A (defer entirely) | C3/C4-B (recall+logging v1, GEPA deferred) |
|-----|-------------|:---:|:---:|
| R5.1 | Recall past runs + corrections before responding | ❌ | ✅ |
| R5.2 | Improve prompts/signatures over time via GEPA | ✅ | ✅ |

**Selected: C3/C4-B.** Include recall() + feedback logging from v1 (simple/cheap), defer GEPA to offline periodic job. **Rationale (user):** The cheap version is genuinely cheap — recall() is one read from the `bot-memory` git branch, feedback capture is logging outcomes + storing correction text. Not speculative — it's the raw material that makes the eventual GEPA job possible.

### CI provider: GitHub Actions

**Confirmed.** GitHub Actions is the CI provider. The trigger is `workflow_run`, logs are fetched via GitHub REST API. Real project reference: `~/repos/scool-playwright`.

### Deploy target: GitHub Actions only 🟡

**Resolved per ADR-001.** GitHub Actions only. No Vercel, no Cloudflare, no external server, no database.

---

## Milestone Sequence

| Milestone | Scope | Components active |
|-----------|-------|-------------------|
| **M1** | `workflow_run` trigger → recall → CI-Analyst → synthesize → reflect → send to Telegram → log outcome. Env-var config. GitHub Actions. CI provider adapter interface. | C1.1, C1.3, C2.1–C2.3, C2.5–C2.8, C3.1, C5.1–C5.2, C6.1–C6.3 |
| **M2** | Interactive Telegram session — `schedule`/`workflow_dispatch` trigger + long polling. User messages bot, bot responds. Reuses M1's Ax flow. | + C1.2, C1.4 |
| **M3** | 🟡 Browser inspection on CI failure. Browser tool selected from spike (must run on GitHub Actions). | + C2.4 |
| **M4** | Memory recall upgrade (vector search) + GEPA offline optimizer (weekly GitHub Action). | + C3.2, C4.1–C4.3 |
| **M5** | Template packaging — forker README, example configs, adaptation docs, community plugin docs. | + C5.3, C6.4 |

---

## Open Items

| Item | Status | Notes |
|------|--------|-------|
| 🟡 **Browser agent selection** | **Open — blocks R8.2** | 32 candidates in `shaping/GitHub-Stars-Manager-browser-agent.md`. Must run on GitHub Actions Ubuntu runner. Needs spike to evaluate top candidates against constraints: TypeScript, lightweight, no external browser infra, works as Ax node/agent, runs within GitHub Actions time limits. |
| 🟡 **CLI wizard + sample project design** | **Open — blocks R7.2** | C5.4–C5.6 described but not concretely designed. Need to detail the `npx groundcrew init` flow and the sample project structure. |
| ~~Eve vs plain GitHub Actions workflow~~ | **Resolved per ADR-001** | Eve removed. GitHub Actions only. |
| ~~Deploy target~~ | **Resolved per ADR-001** | GitHub Actions only. No Vercel, no Cloudflare. |
| ~~CI provider pluggability~~ | **Resolved via C6.3** | CI providers are plugins. GitHub Actions adapter ships in-repo. |
| Memory store backend | Resolved: `bot-memory` git branch | Files committed to a dedicated branch. Versioned, readable, no database. Upgrade to vector search in M4. |
| Project name | Confirmed: Groundcrew | Repo at github.com/MaksimZinovev/groundcrew. |
