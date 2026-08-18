---
shaping: true
---

# CI + Telegram + Live-Site Analysis Bot — Frame

## Source

### Maks (Aug 19, 2026)

> "What if I want a bot which could 1) Annalize CI execution results and post summary in Telegram chat ; 2) wake up when CI run completed or when user messaged bot In the chat ; 3) could use browser to inspect website and provide analysis based on combined context - CI execution and Browsing live website"

This is the founding ask: three capabilities in one bot — CI result analysis, dual triggering (CI event or chat message), and live-site inspection combined with CI context.

> "So without langchain, i cannot have a workflow with combination of deterministic and LLL actions? Sometimes just run deterministic code and action based on result , sometimes let LLM judge and act"

Raised while reviewing a single-framework (Eve-only) sketch — surfaces a requirement that got lost in the initial ask: explicit, predictable control over *when* the bot runs plain code versus when it lets the model judge, not just an agent improvising the whole thing.

> "Would be t be reasonable combine eve and https://github.com/ax-llm/ax? Same typescript"

Direct proposal to resolve the deterministic/LLM-mixing gap while staying in one language.

> "Can we bake it n self bake in self improvement that uses historical context and human feedback to learn within each execution?"

Extends the original scope: the bot shouldn't just answer once and forget — it should get better using what happened in past runs and what a human corrected.

> "this should be packaged as close as possible to a standalone github repo that 1) other people can use as a starting point and adjust for their need in a similar space 2) I could share this repo, make public, post about it 3) keep using this repo for my specific use case - I am helping a real small team with this project so their details should stay private, for example, git and CI secrets, configurable target website, etc."

States the motivation for making the repo public directly: it's meant to be shared and posted about as a reusable starting point for others in a similar space — not just a working tool. This is paired with a hard requirement that the real team's operational details stay private.

---

## Pre-work: Architecture Options Considered

No competing *problems* surfaced in this thread — the problem stayed fixed from the first message. What surfaced with traction were competing **architectures** for building the same bot:

| Option | What it does | Who benefits | Signal strength |
|--------|-------------|--------------|-----------------|
| **A. Eve + LangGraph** | Eve handles triggers/channels (CI webhook, Telegram); a separate Python LangGraph agent handles reasoning, thread-based memory, and browser tool use | Gets the strongest conversational-thread checkpointing and mature branching | Raised as the initial recommendation; Maks asked for a sketch of it ("Yes, sketch it") — one round of engagement, then moved on when a single-framework version was requested |
| **B. Eve alone** | One TypeScript project; triggers, tools, and reasoning all live in Eve's convention-based structure (channels/tools/instructions.md) | Simplest deploy — one project, no process/language boundary | Explicitly requested ("Give me sketch for single-framework") — but the next message ("...combination of deterministic and LLL actions?") revealed this option can't give explicit branching control, since Eve's logic lives in prose instructions rather than a formal graph |
| **C. Eve + Ax** | Eve still handles triggers/channels; Ax's `AxFlow` supplies the typed, branching workflow graph (deterministic + LLM nodes) that Eve alone couldn't provide | Closes the exact gap Option B exposed, without leaving TypeScript | Directly proposed by Maks, and every subsequent design step (agentic-patterns sketch, self-improvement sketch) was built on this combination — the sustained signal of the three |

**Why C now:** Option A works but crosses a Python/TypeScript process boundary that Option C avoids ("Same typescript"). Option B stays in one language too, but can't satisfy the explicit deterministic-vs-LLM branching Maks asked for directly. Option C is the only one of the three that is both single-language and gives formal branching control — and it's the one all later design work in this thread assumed.

---

## Problem

- No existing way to get CI run results summarized and delivered to Telegram automatically
- The bot needs to respond to two different kinds of triggers — a completed CI run, or an incoming chat message — not just one
- CI results alone aren't enough context in some cases; the bot also needs to inspect the live website and combine that with CI data before responding
- Plain agent-driven reasoning isn't sufficient on its own — some steps need to be deterministic code with the LLM only judging where actually necessary
- A single response per run isn't enough — the bot should account for what happened in prior runs and any corrections a human gave it
- The real deployment involves a specific team's CI/git secrets and target website, which can't be exposed if the project is shared

## Outcome

- One bot, one deploy, that wakes up on either a CI-completion event or a Telegram message
- Responses that draw on CI execution data and live-site inspection together, not either in isolation
- Predictable, inspectable control over which steps are deterministic code and which are left to the model's judgment
- A single-language (TypeScript) implementation, avoiding a cross-language process boundary
- A bot whose answers improve over successive runs, informed by historical context and human corrections
- A repo structured so it can be published and reused by others as a starting point, while the actual working deployment (real team's CI/git secrets, target website, credentials) stays private and swappable — not hardcoded into the public code
- A public repo Maks is comfortable sharing and posting about as a reusable template for others working in a similar space

> **Note (added after initial framing):** the intended packaging changed the shape of the outcome — this needs to work as a public, forkable template *and* a live private deployment for one real team at the same time, not just a working bot for one team's internal use.

---

## Less about

- A one-off private script hardcoded to one team's repo, secrets, and target website
- A finished product tuned only for this specific team's CI setup

## More about

- A reusable, documented starting point someone else could fork and point at their own CI + website + chat platform
- Clean separation between the public template (code, structure, docs) and private configuration (secrets, target URLs, chat IDs) so the same codebase serves both the public repo and Maks's real deployment

---

## References

Tools discussed and settled on during this design pass (linked here for convenience — not part of the sourced transcript, since the Eve link itself was introduced earlier in the broader conversation, outside this frame's scope):

- **Eve** — filesystem-first framework for durable AI agents (triggers/channels/schedules): https://github.com/vercel/eve
- **Ax** — TypeScript-first DSPy-style framework (typed signatures, `AxFlow` workflow graphs, GEPA optimizer): https://github.com/ax-llm/ax

## Project Name Options

Three candidates proposed for the project/repo name, none yet confirmed as available on GitHub/npm:

1. **Kettlewatch** — evokes something that "wakes up" and signals when ready, mirroring the CI-complete / chat-ping triggers
2. **Squawkbox** — an intercom that only speaks when there's something worth reporting
3. **Groundcrew** — ground crew inspects before a flight and radios the tower; maps to "inspect live site + CI, then report to Telegram"

---

## Appendix: System Context (for engineers new to this project)

*This section goes beyond a standard frame document's scope — included here specifically so this doc can be handed to someone with zero prior context.*

**What this project is:** A bot that monitors CI pipeline runs and can also be interactively questioned in a Telegram chat. It wakes up on two kinds of events — a CI run completing, or a user sending it a message — and can additionally browse a live website to combine that context with CI results before responding.

**Chosen architecture (Option C above):** Eve + Ax, both TypeScript, both running in a single deployable project (e.g. on Vercel).
- **Eve** owns triggering and deployment shape: `channels/` receive the CI webhook and Telegram messages, `schedules/` would handle any time-based checks if needed, `tools/` wrap external calls (fetch CI logs, browse the site, send a Telegram message).
- **Ax** owns the reasoning workflow: typed signatures define what each step takes in and returns, and `AxFlow` expresses the branching logic explicitly — e.g. only invoke the browser-inspection step if the CI verdict isn't a clean pass, cap any self-critique/revision loop at a small retry count.

**Design principles carried through from framing:**
- Keep deterministic steps (fetching logs, calling APIs) as plain code; reserve LLM calls for judgment/summarization steps specifically.
- Any "self-improvement" behavior is in-context recall from a memory store (past runs, past human corrections) *within* a run — not live retraining. Actual optimization of prompts/signatures (via Ax's GEPA optimizer) is a separate, periodic offline job, not part of the live request path.
- All team-specific values (CI provider tokens, GitHub secrets, Telegram bot token, target website URL, chat IDs) must live in environment variables / the deploy platform's secret manager — never committed to the repo, public or private.

**Repo structure intent:** Single public repository, config-driven. A `config.example` (or `.env.example`) ships with placeholder values and documentation; the real team's values are supplied only as environment variables at deploy time, never as committed files.
