# Groundcrew

A bot that monitors CI pipeline runs and reports to Telegram. It wakes on CI completion events, analyzes results, and posts summaries to a Telegram chat. Designed to also inspect live websites and combine that context with CI data, and to improve over time using past run history and human corrections.

## Status

Early stage — shaping in progress. See [`shaping/`](shaping/) for design documents.

## Architecture

- **Eve** — triggers and channels (CI webhook, Telegram)
- **Ax** — typed reasoning workflow with explicit deterministic/LLM branching
- Single TypeScript project, no cross-language boundary

## Config

All team-specific values are supplied via environment variables. Copy `.env.example` to `.env` and fill in your values. Nothing is committed.

## License

MIT
