# Ax Agent Skills — Relevant to Groundcrew

**Date:** 2026-08-20
**Source:** DeepWiki query on `ax-llm/ax` (section 4.5 — Agent Functions, Tools, Memories, and Skills)

> Ax provides built-in agent skills — runbooks the LLM loads on demand to write correct Ax code. Skills are defined in `website/static/typescript/.well-known/agent-skills/`. They can be loaded via `skillsCatalog`, `onSkillsSearch`, or preloaded into an `AxAgent`. This document lists which skills are relevant to Groundcrew's implementation phases.

---

## V1 — CI Summary (implement now)

| Skill | What it does | Why we need it |
|-------|-------------|----------------|
| **ax-flow** | Generates correct `AxFlow` workflow code | C2 reasoning workflow: recall → plan → analyze → synthesize → reflect → send → log |
| **ax-gen** | Generates correct `AxGen` code for structured outputs | CI-Analyst and Synthesizer nodes produce structured output (failure summary, verdict) |
| **ax-signature** | Generates correct DSPy signature code | Typed signatures for each Ax flow node (R3 — explicit control) |
| **ax-ai** | Generates correct AI provider setup and config | LLM provider configuration (OpenAI, etc.) |
| **ax-llm** | General `@ax-llm/ax` library usage | Catch-all for Ax API questions during implementation |

## V2 — Memory (implement after V1)

| Skill | What it does | Why we need it |
|-------|-------------|----------------|
| **ax-agent-memory-skills** | Memory retrieval, context-map, dynamic skill-loading | C2.1 `recall()` node, C3.1 `bot-memory` git branch read/write |
| **ax-event-runtime** | Ingest events, wake/resume AxGen/AxAgent/AxFlow, persist state, route outputs | C1 triggers (`workflow_run`), state persistence across runs |

## M3 — Browser Inspection (future)

| Skill | What it does | Why we need it |
|-------|-------------|----------------|
| **ax-mcp** | Builds correct native MCP integrations | `@playwright/mcp` MCP client (C2.4 Site-Inspector) |
| **ax-agent** | Generates correct core `AxAgent` code | Site-Inspector is an AxAgent with browser tools in a ReAct loop |
| **ax-agent-rlm** | AxAgent RLM/runtime code for long context | M2/M3 — combining user messages + browser observations in context |

## M4 — GEPA Optimizer (future)

| Skill | What it does | Why we need it |
|-------|-------------|----------------|
| **ax-gepa** | Generates correct `AxGEPA` optimization code | C4.2 — offline prompt/signature optimization |
| **ax-agent-optimize** | Agent tuning and evaluation | C4 — agent optimization with accumulated corrections |
| **ax-refine** | `bestOfN`/refine code, reward functions, thresholds | C2.6 reflection node — self-critique with retries |

## Maybe useful (all milestones)

| Skill | What it does | Why |
|-------|-------------|-----|
| **ax-agent-observability** | Observability code | Debugging the bot in production |
| **ax-agent-context** | Pick the right context tool | Context management for interactive sessions |
| **ax-playbook** | Playbook code | Agentic context engineering (M4+) |

---

## How skills work in Ax

Skills are loaded into `AxAgent` via three mechanisms:

1. **`skillsCatalog`** — static array of `{ id, name, description, content }`. Ax does built-in local search over this catalog.
2. **`onSkillsSearch`** — async callback for dynamic retrieval from a backend (e.g., vector database).
3. **Preloaded `skills`** — directly injected into the agent's executor prompt at init or `forward()` time.

The built-in skills are published at `website/static/typescript/.well-known/agent-skills/index.json` in the `ax-llm/ax` repo. They can be fetched and used as a `skillsCatalog` or loaded on demand.

---

## References

- DeepWiki: [ax-llm/ax section 4.5](https://deepwiki.com/ax-llm/ax/4.5-agent-functions-tools-memories-and-skills)
- Ax repo: [agent-skills index.json](https://github.com/ax-llm/ax/blob/main/website/static/typescript/.well-known/agent-skills/index.json)
- Groundcrew shaping: `ci-telegram-bot-shaping.md` (C2 — Ax flow components), `breadboard.md` (N5–N13 — Ax flow affordances), `m1-slice.md` (V1/V2 implementation plan)
