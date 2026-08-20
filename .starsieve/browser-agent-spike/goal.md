# Goal: Find a browser automation tool from the user's GitHub starred repos that can run headless Chromium on GitHub Actions runners, is TypeScript-native, is lightweight enough to complete site inspections in minutes, and can be wrapped as an Ax `fn()` node or MCP tool in the Groundcrew CI+Telegram bot

## Context

- Project: Groundcrew — CI results analysis bot that posts to Telegram, runs entirely on GitHub Actions using Ax (`@ax-llm/ax`)
- Spike target: C2.4 (Site-Inspector node, deferred to M3). Resolves R8.2.
- Key requirements from shaping docs:
  - R4: Single-language (TypeScript) implementation — no cross-language process boundary
  - R8.1: Entire bot runs on GitHub Actions — no external server, no Vercel, no container
  - R8.2: Browser agent lightweight enough to run on GitHub Actions runner (Ubuntu, limited time, no persistent browser infra)
- C2.4: Site-Inspector node — browses live site via browser, returns observations
- Tool must wrap as Ax `fn()` or MCP
- 32 candidates pre-identified in GitHub Stars Manager export
- Reference project: ~/repos/scool-playwright — already runs Playwright on GitHub Actions
- The bot is low-frequency, bounded-duration (10-15 min sessions, every other day)

## Locked Criteria

| ID | Criterion | Priority | Constraint |
|----|-----------|----------|------------|
| R0 | Wrappable as Ax fn() or MCP — the tool can be integrated into the Ax workflow as a native fn(), MCP server, or CLI callable from TS | Must-have | Must have a programmatic or MCP interface, not just a standalone UI/extension |
| R1 | Runs on GitHub Actions runner — works within GH Actions constraints (Ubuntu runner, 10-15 min session, no persistent infra). Both self-contained and cloud-API tools are acceptable | Must-have | Must either run headless browser on the runner OR be callable via API from the runner |
| R2 | Active maintenance — last push within 6 months, has releases or active commits | Important | Browser automation breaks when Chrome updates; stale tools are a liability |
| R3 | Lightweight — setup + execution completes within a short GH Actions session. Not heavyweight in dependencies or install time | Important | The bot runs in 10-15 min bounded sessions; tool must not dominate that budget |
| R4 | TypeScript/JS native — preferred for no cross-language boundary, but not a hard filter. Any language OK if wrappable | Nice-to-have | TS/JS native is lower friction; Python/Rust/Go OK if they expose MCP or ship as binary |

## Priority Weights

- Must-have = 1.0 (R0, R1)
- Important = 0.7 (R2, R3)
- Nice-to-have = 0.4 (R4)

## Notes

- User explicitly requested: do NOT pre-filter based on assumptions. Gather actual facts from repos. Keep all languages in the pool if wrappable as MCP/fn/binary.
- User explicitly requested: evaluate both self-hosted and cloud-browser tools. Do not eliminate cloud browser services upfront — let facts decide.
- User explicitly requested: evaluate both thin-library and full-agent design modes. Some tools support both.
- User instruction: 'Do not work from memory. Your memory is limited. There might be tools and solutions out there and you do not know about them yet.'
- The 32 candidates from the GitHub Stars Manager export are the initial pool, but starsieve will also pull the user's actual starred list.
- Reference project: ~/repos/scool-playwright already runs Playwright on GH Actions — proven pattern exists.
