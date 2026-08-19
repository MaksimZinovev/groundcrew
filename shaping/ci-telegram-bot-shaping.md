---
shaping: true
---

# CI + Telegram Bot — Shaping

> See `ci-telegram-bot-frame.md` for source, problem, and outcome. See `self-improving.md` for the self-improvement design that informed R5 and the Ax flow shape.

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

## Selected Shape: C — Eve + Ax

Single TypeScript deployable project. Eve owns triggers/channels/deploy shape; Ax owns the reasoning workflow as a typed, branching flow graph.

> Options A (Eve + LangGraph, Python boundary) and B (Eve alone, no formal branching) were explored in the frame and rejected. See frame's "Pre-work: Architecture Options Considered" for the full comparison. Shape C is the only option that is both single-language and gives explicit branching control (R3 + R4).

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
| R7.3 | 🟡 Minimal but extensible — platform-agnostic, extend to other CI/frameworks | Must-have | ⚠️→❌ |
| R8.1 | 🟡 Entire bot runs on GitHub Actions — no external server | Must-have | ❌ |
| R8.2 | 🟡 Browser agent lightweight enough for GitHub Actions runner | Must-have | ❌ |

**Notes:**

- R7.2 fails: Shape C has no CLI wizard, AI skill, or sample project component. These are new capabilities not in C1–C5.
- R7.3 fails: C1.1 is hardcoded to GitHub Actions `workflow_run` webhook. The shape needs a pluggable CI provider interface to be platform-agnostic. Mechanism not yet described.
- R8.1 fails: Shape C uses Eve, which is a Vercel-first framework for durable agents. GitHub Actions is ephemeral (each run is a fresh container). Eve's durable-agent model (channels, schedules, persistent state) does not map cleanly to GitHub Actions' event-driven workflow model. This is a shape-level question — see Open Items.
- R8.2 fails: C2.4 says "Playwright" but the browser tool has not been evaluated against GitHub Actions runner constraints. 32 candidates in `shaping/GitHub-Stars-Manager-browser-agent.md` need a spike to resolve.

---

## Components (C1–C5)

### C1: Trigger/channel layer (Eve)

| Part | Mechanism | Flag |
|------|-----------|:----:|
| **C1** | **Trigger/channel layer (Eve)** | |
| C1.1 | Eve `channels/` receives GitHub Actions `workflow_run` webhook event | |
| C1.2 | Eve `channels/` receives Telegram messages (interactive trigger — wired in M2, designed for in M1) | ⚠️ |
| C1.3 | Eve `tools/` wrap external calls: fetch CI run logs via GitHub REST API, send Telegram message | |

> **C1.2 is ⚠️** — the Telegram *send* channel is needed in M1 (posting summaries); the Telegram *receive* channel (interactive trigger) is deferred to M2. The mechanism is understood (Eve Telegram channel), but not yet wired. This is a sequencing decision, not an unknown.

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

> **C2.1 is ⚠️** — recall() needs a memory store (C3) that doesn't exist yet. The mechanism is understood (Ax `onMemoriesSearch`/`recall` pattern from self-improving.md), but the store backing it is a design choice (see C3 alternatives below).
>
> **C2.4 is ⚠️** — browser inspection is deferred to M3. The mechanism (Playwright in an Ax node) is understood but not yet wired. Sequencing decision, not an unknown.

### C3: Memory store

| Part | Mechanism | Flag |
|------|-----------|:----:|
| **C3** | **Memory store** | |
| C3.1 | Simple KV/JSON file store for past executions, outcomes, human corrections (v1) | |
| C3.2 | Upgrade to vector search for semantic recall (later, when recall needs it) | ⚠️ |

> **C3.2 is ⚠️** — deferred upgrade. The v1 store (C3.1) is a plain JSON/KV file; semantic search is a later enhancement when the store grows large enough that keyword matching isn't enough.

### C4: Offline GEPA optimizer (deferred)

| Part | Mechanism | Flag |
|------|-----------|:----:|
| **C4** | **Offline GEPA optimizer — separate periodic job, NOT part of live execution** | |
| C4.1 | Weekly GitHub Action pulls accumulated logs/corrections from memory store | ⚠️ |
| C4.2 | AxGEPA optimizer uses corrections as training signal, optimizes signatures/few-shot examples | ⚠️ |
| C4.3 | Deploys improved signature/prompt config that future executions pick up | ⚠️ |

> **All C4 parts are ⚠️** — the entire GEPA optimizer is deferred to a later milestone. The mechanism is designed (see self-improving.md), but not yet built. This is intentional: you can't optimize against corrections you haven't accumulated yet.

### C5: Config and packaging

| Part | Mechanism | Flag |
|------|-----------|:----:|
| **C5** | **Config and packaging** | |
| C5.1 | `.env.example` ships with placeholder values and documentation | |
| C5.2 | All team-specific values read from `process.env` at runtime | |
| C5.3 | Template docs, forker README, "how to adapt this" guides | ⚠️ |
| C5.4 | 🟡 CLI wizard (`npx groundcrew init`) — prompts for CI provider, Telegram token, chat ID, target URL; generates `.env` and workflow file | ⚠️ |
| C5.5 | 🟡 Sample project — a repo with a Playwright test suite and GitHub Actions workflow that triggers Groundcrew on `workflow_run` | ⚠️ |
| C5.6 | 🟡 AI skill — a reusable skill (pi/Claude Code) that helps users adapt Groundcrew to their stack | ⚠️ |

> **C5.4–C5.6 are ⚠️** — new components from R7.2. The mechanisms are described at a high level but not yet concretely designed.

> **C5.3 is ⚠️** — deferred. The env-var config (C5.1–C5.2) is in from line one; the forker-facing documentation is extracted after the bot works for the real team.

---

## Resolved Alternatives (from grilling session)

Decisions locked in during the ponytail grilling session (Aug 18, 2026). Each was an alternative for a component; the selected option is recorded here for the audit trail.

### C1 trigger scope: CI webhook first, interactive later

| Req | Requirement | C1-A (both from day one) | C1-B (CI first, interactive M2) |
|-----|-------------|:---:|:---:|
| R0 | CI run results summarized and posted to Telegram automatically | ✅ | ✅ |
| R1 | Bot wakes on two trigger types | ✅ | ✅ |

**Selected: C1-B.** Ship the CI webhook → summarize → Telegram post path first. The interactive Telegram path is M2 — it reuses the same Telegram channel. **Rationale (ponytail):** two triggers = two channels to wire, two auth flows, two debug paths. One trigger proves the value; the second is additive. **User note:** "design with future in mind" — the Telegram receive channel should be accommodated in the Eve structure without rearchitecting.

### C2 reasoning: Ax from day one

| Req | Requirement | C2-A (Eve + plain functions, add Ax later) | C2-B (Eve + Ax from day one) |
|-----|-------------|:---:|:---:|
| R3 | Explicit deterministic vs LLM step control | ❌ | ✅ |
| R5.1 | Recall past runs + corrections before responding | ❌ | ✅ |

**Selected: C2-B.** Ax from day one. **Rationale (user, overriding ponytail's initial recommendation):** The recall() step, feedback-capture step, and planner/synthesizer/reflection nodes are natural Ax flow nodes. Building them as plain functions first and bolting Ax on later means rewriting the same pipeline as a graph. The self-improving.md doc makes the case: recall() before planning and feedback logging after responses are woven into the Ax flow. Only GEPA (C4) is deferred.

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

**Selected: C3/C4-B.** Include recall() + feedback logging from v1 (simple/cheap), defer GEPA to offline periodic job. **Rationale (user, overriding ponytail's initial recommendation):** The cheap version is genuinely cheap — recall() is one read from a memory store (start as JSON/KV file, no vector DB), feedback capture is logging outcomes + storing correction text. Maybe 20 lines on top of the core flow. Not speculative — it's the raw material that makes the eventual GEPA job possible. GEPA itself needs a batch of examples, so it's correctly deferred.

### C5 CI provider: GitHub Actions

**Confirmed.** GitHub Actions is the CI provider. The webhook event is `workflow_run`, logs are fetched via GitHub REST API. Real project reference: `~/repos/scool-playwright`.

### C6 deploy target: lean (GitHub or Cloudflare)

**TBD — discuss separately.** User preference: "stay in GitHub only or maybe Cloudflare. As lean as possible." Key implication: if not Vercel, Eve's Vercel-first deploy model may need adaptation. This is a separate conversation that could affect the trigger/channel architecture.

---

## Milestone Sequence

| Milestone | Scope | Components active |
|-----------|-------|-------------------|
| **M1** | CI webhook → recall → CI-Analyst → synthesize → reflect → send to Telegram → log outcome. Env-var config. GitHub Actions. | C1.1, C1.3, C2.1–C2.3, C2.5–C2.8, C3.1, C5.1–C5.2 |
| **M2** | Interactive Telegram trigger — user messages bot, bot responds. Reuses M1's Telegram channel + Ax flow. | + C1.2 |
| **M3** | 🟡 Browser inspection on CI failure. Browser tool selected from spike (must run on GitHub Actions). | + C2.4 |
| **M4** | Memory recall upgrade (vector search) + GEPA offline optimizer (weekly GitHub Action). | + C3.2, C4.1–C4.3 |
| **M5** | Template packaging — forker README, example configs, adaptation docs. | + C5.3 |

---

## Open Items

| Item | Status | Notes |
|------|--------|-------|
| 🟡 **Eve vs plain GitHub Actions workflow** | **Open — blocks R8.1** | R8.1 requires running on GitHub Actions. Eve is Vercel-first (durable agent, channels, schedules). GitHub Actions is ephemeral (fresh container per run). Options: (a) drop Eve, use plain GitHub Actions workflow as trigger + Ax for reasoning — simplest, fewest deps; (b) keep Eve, adapt it to GitHub Actions — may not be feasible or worth the effort; (c) keep Eve for M2 (interactive Telegram) but use plain GH Actions for M1. **Recommendation:** spike option (a) — it may be simpler and more aligned with R7.3 (minimal). |
| 🟡 **Browser agent selection** | **Open — blocks R8.2** | 32 candidates in `shaping/GitHub-Stars-Manager-browser-agent.md`. Must run on GitHub Actions Ubuntu runner. Needs spike to evaluate top candidates against constraints: TypeScript, lightweight, no external browser infra, works as Ax node, runs within GitHub Actions time limits. |
| 🟡 **CI provider pluggability** | **Open — blocks R7.3** | C1.1 is hardcoded to GitHub Actions. Need a pluggable interface so other CI providers (CircleCI, GitLab CI) can be added without rearchitecting. Mechanism not yet described. |
| Deploy target | 🟡 Resolved: GitHub Actions | R8.1 settles this. No Vercel, no Cloudflare, no external server. |
| Memory store backend | 🟡 Updated | GitHub Actions has no persistent filesystem between runs. Options: GitHub Actions cache, GitHub artifacts, or external KV (e.g. GitHub repo as KV via API). JSON file alone won't persist across runs. |
| Project name | Confirmed: Groundcrew | Repo created at github.com/MaksimZinovev/groundcrew. |
