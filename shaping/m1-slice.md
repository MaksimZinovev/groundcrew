---
shaping: true
---

# Groundcrew — M1 Slice: CI Summary

> Input: `breadboard.md` (affordance tables, wiring). This document slices the M1 milestone into vertical implementation increments. See `ax-agent-skills.md` for Ax skills to load during implementation.

---

## M1 Overview

**Flow:** `workflow_run` trigger → recall → CI-Analyst → synthesize → reflect → send to Telegram → log outcome

**Demo:** A CI run completes. The bot posts an intelligent summary to Telegram. The outcome is logged to the `bot-memory` git branch.

**Affordances in M1:** N1, N5, N7, N8, N9, N11, N12, N13, N13a, N14, N16, N17, N20, S1, S2, U1

---

## Slices

| # | Slice | Mechanism | Demo |
|---|-------|-----------|------|
| V1 | CI summary posted to Telegram | C1.1, C1.3, C2.2–C2.3, C2.5–C2.7, C5.1–C5.2 | "CI run #142 completes. Bot posts: 'Build failed. 3 tests broke in the auth flow...'" |
| V2 | Memory: recall + feedback logging | C2.1, C2.8, C3.1 | "Bot recalls past corrections before analyzing. Check the `bot-memory` branch — outcome is logged." |

---

## V1: CI Summary Posted to Telegram

The core path: trigger fires → fetch CI logs → LLM analyzes → synthesize → reflect → post to Telegram. No memory yet — the bot analyzes without recalling past runs. Proves the plumbing and the Ax flow.

### Affordances in this slice

| # | Place | Component | Affordance | Control | Wires Out | Returns To |
|---|-------|-----------|------------|---------|-----------|------------|
| N1 | P2 | workflow-trigger | `workflow_run` event | event | → N5 | — |
| N5 | P2 | ax-flow | `flow.run()` entry | call | → N8 | — |
| N8 | P2 | ax-flow | Planner node | call | → N9 | → N11 |
| N9 | P2 | ax-flow | CI-Analyst node | call | → N13a | → N11 |
| N13a | P3 | github-api | `GET /repos/{owner}/{repo}/actions/runs/{id}/logs` | call | — | → N9 |
| N11 | P2 | ax-flow | Synthesizer node | call | → N12 | → N14 |
| N12 | P2 | ax-flow | Reflection node (max 2 retries) | call | → N11, → N14 | — |
| N14 | P2 | telegram-api | `sendMessage()` | call | — | → U1 |
| N20 | P2 | config | Read env vars | read | → S2 | → N9, → N14 |
| S2 | P2 | `process.env` | Config: `GITHUB_TOKEN`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `OPENAI_API_KEY` | store | — | → N9, → N14 |
| U1 | P1 | telegram-chat | CI summary message | render | — | — |

### Wiring trace

```
N1 (workflow_run)
  → N5 (flow.run)
    → N8 (Planner: decides to invoke CI-Analyst)
      → N9 (CI-Analyst: fetches logs via N13a, LLM analyzes)
        → N13a (GitHub REST API: GET logs)
        ← returns logs to N9
      ← N9 returns analysis to N11
    → N11 (Synthesizer: drafts summary)
      → N12 (Reflection: self-critique)
        ↻ retry → N11 (up to 2 times)
        → N14 (sendMessage: post to Telegram)
          → U1 (CI summary message appears in chat)
```

### Stubbed wires (not yet implemented)

- N8 → N10 (Site-Inspector) — M3
- N7 (recall) — V2
- N13 (log outcome) — V2
- N16/N17 (memory read/write) — V2

### What V1 proves

- GitHub Actions `workflow_run` trigger works
- GitHub REST API log fetching works
- Ax flow runs: planner → analyst → synthesizer → reflection loop → send
- Telegram message posting works
- Env-var config works (C5.1–C5.2)
- Token efficiency: only relevant log parts sent to LLM (R7.1)

### What V1 does NOT do

- No memory recall (the bot doesn't remember past runs or corrections)
- No feedback logging (the outcome isn't stored anywhere)
- No interactive chat (user can't respond)
- No browser inspection

---

## V2: Memory — Recall + Feedback Logging

Adds the self-improvement v1 layer: read past executions and corrections at the start, log the outcome at the end. The bot now recalls before analyzing and learns after posting.

### Affordances added in this slice

| # | Place | Component | Affordance | Control | Wires Out | Returns To |
|---|-------|-----------|------------|---------|-----------|------------|
| N7 | P2 | ax-flow | `recall()` node | call | → N16 | → N8 |
| N13 | P2 | ax-flow | Log outcome node | call | → N17 | — |
| N16 | P2 | memory-store | Read memory from `bot-memory` branch | call | → S1 | → N7 |
| N17 | P2 | memory-store | Write outcome + corrections to `bot-memory` branch | call | → S1 | — |
| S1 | P2 | `bot-memory` git branch | Past executions, outcomes, corrections — tagged by topic | store | — | → N7 |

### Wiring trace (additions to V1)

```
N1 (workflow_run)
  → N5 (flow.run)
    → N7 (recall: reads S1, returns relevant past failures + corrections)
      → N16 (git clone bot-memory, read files)
      ← returns memories to N7
    ← N7 returns memories to N8
    → N8 (Planner: now sees recalled context)
      → N9 (CI-Analyst) → N13a → N11 → N12 → N14 → U1
    → N13 (Log outcome: writes to S1 via N17)
      → N17 (git commit + push to bot-memory branch)
```

### What V2 proves

- Memory store works: `bot-memory` git branch is read at start, written at end
- Recall works: the Ax flow's `recall()` node queries memory before planning
- Feedback logging works: outcome (accepted/corrected) + correction text is stored
- Self-improvement v1 is functional: recall + feedback logging (per `self-improving.md`)

### What V2 does NOT do

- No semantic/vector search (plain keyword matching — M4)
- No GEPA optimization (M4)
- No user corrections yet (those come from M2 interactive chat)

---

## Slice Summary

| # | Slice | Mechanism | Affordances | Demo |
|---|-------|-----------|-------------|------|
| V1 | CI summary posted to Telegram | C1.1, C1.3, C2.2–C2.3, C2.5–C2.7, C5.1–C5.2 | N1, N5, N8, N9, N11, N12, N13a, N14, N20, S2, U1 | "CI run completes. Bot posts intelligent summary to Telegram." |
| V2 | Memory: recall + feedback logging | C2.1, C2.8, C3.1 | N7, N13, N16, N17, S1 | "Bot recalls past corrections before analyzing. Outcome logged to `bot-memory` branch." |

---

## Implementation Notes

### V1 implementation order

1. GitHub Actions workflow file with `workflow_run` trigger (N1)
2. Config reader from env vars (N20, S2)
3. GitHub REST API client for CI logs (N13a)
4. Telegram `sendMessage` client (N14)
5. Ax flow skeleton: planner → CI-Analyst → synthesizer → reflection → send (N5, N8, N9, N11, N12)
6. Test: trigger a CI run, verify summary appears in Telegram

### V2 implementation order

1. `bot-memory` git branch read/clone (N16)
2. `recall()` Ax node wired into flow before planner (N7)
3. Log outcome Ax node wired after send (N13)
4. `bot-memory` git branch write/commit/push (N17)
5. Test: run twice, verify second run recalls first run's outcome

### Tech stack for V1

- `@ax-llm/ax` — Ax flow framework. Provider config via `ai()` factory. Default: Ollama Cloud (OpenAI-compatible, `apiURL: 'https://ollama.com/v1'`). Switching to OpenAI, Anthropic, or any OpenAI-compatible endpoint is an env-var change — no code change. Ax falls back to prompt-mode extraction when the provider lacks native `response_format` support.
- `@octokit/rest` or plain `fetch` — GitHub REST API
- Plain `fetch` — Telegram Bot API (`sendMessage`)
- Node.js 20+ — runtime on GitHub Actions runner
- TypeScript — single language (R4)

### LLM provider config

```typescript
import { ai } from '@ax-llm/ax';

// Default: Ollama Cloud (OpenAI-compatible)
const aiService = ai({
  name: 'openai',
  apiKey: process.env.OLLAMA_API_KEY,
  apiURL: process.env.LLM_API_URL || 'https://ollama.com/v1',
  config: { model: process.env.LLM_MODEL || 'glm-5.1' },
});

// To switch to OpenAI: set LLM_API_URL=https://api.openai.com/v1, LLM_MODEL=gpt-4o, OPENAI_API_KEY=...
// To switch to Anthropic: change `name` to 'anthropic' (requires code change or future config layer)
```
