Good instinct to want this — but worth being precise about what "learn within each execution" can actually mean, since there's a real difference between *recalling* past experience and *actually updating* the model's behavior. Let me sketch both layers, because conflating them is where these designs usually go wrong.The honest split, since "learn within each execution" has a real ceiling:

**What genuinely happens *within* an execution — in-context adaptation:**
- `recall()` runs *before* planning, pulling similar past cases and prior human corrections from the memory store. This is Ax's `onMemoriesSearch`/`recall` pattern from the README — the planner and synthesizer literally see "last time this exact CI error showed up, the root cause was a flaky test, not a real regression" as context.
- This is real, useful, and cheap — but it's retrieval-augmented reasoning, not learning. The model's weights and prompts don't change; it's just better-informed *because you handed it relevant history*.

**What happens *after* an execution — feedback capture:**
- Every response gets logged with an outcome: accepted (no correction, or a 👍) or corrected (user pushed back with the right answer). That correction text gets written to the memory store, tagged by topic — this is the raw material for actual improvement.

**What can't honestly happen within a single execution — actual optimization:**
- Turning "the bot was wrong 6 times about flaky-test false positives" into "the bot now reliably avoids that mistake" requires re-optimizing the prompt/signature against accumulated examples — that's what `AxGEPA` does, and it needs a batch of examples, not one live conversation. I've sketched this as a **separate periodic job** (weekly GitHub Action, say) that pulls logged corrections, runs GEPA, and deploys an improved signature that future executions then pick up.

**Practical takeaway:** the "self-improving" feeling comes from the combination — recall makes each execution smarter using what happened *before* it, and the periodic GEPA job makes the underlying agent genuinely better over time using what users corrected. Trying to fold real optimization into the live execution path would add real latency/cost for a gain you can get for free by batching it weekly instead — worth resisting the urge to over-engineer this part.