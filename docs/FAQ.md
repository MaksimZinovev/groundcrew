# FAQ: Groundcrew Risks and Mitigations

Common questions about what can go wrong with the Groundcrew bot and how we handle it. Answers reflect the current version (V1) and planned improvements.

## Can the bot give a wrong explanation for a CI failure?

Q: Can the AI misread logs and tell the team a test failed for the wrong reason?

A: Yes. The AI can misunderstand logs and give an incorrect explanation. To reduce this risk, every Telegram summary includes a confidence level (low, medium, or high) and a clickable link to the raw CI logs on GitHub. The team can verify the bot analysis in one click. When confidence is low, the team should check the raw logs before acting on the summary.

## Can API keys or bot tokens leak?

Q: Can secrets stored in GitHub be exposed?

A: Unlikely but possible. GitHub encrypts secrets at rest and masks them in workflow logs. As an extra layer, the bot runs a startup check that prevents secrets from appearing in console output. For production use, the bot runs from a private repository with no public access. The public repository serves only as a template and demo.

## Can the bot remember past incidents?

Q: Does the bot recall previous CI failures and their fixes?

A: Not yet. In V1, each analysis starts from scratch. The bot has no memory of past incidents. Two mitigations are planned. First, each Telegram summary includes keyword tags (such as "timeout", "flaky", "missing-dep") so the team can search past summaries manually in Telegram. Second, V2 adds a memory store on a git branch (bot-memory). When the same error pattern appears again, the bot recalls the past fix and uses it in the analysis.

## What happens if the AI provider goes down?

Q: If OpenRouter, OpenCode, or Cloudflare changes their free tier or shuts down, does the bot stop working?

A: The bot has two fallbacks. First, it tries a second AI provider if the first one fails. Second, if both AI providers are unavailable, the bot posts a plain notification to Telegram: "CI failed but AI analysis is unavailable. Check logs: <link>." The team still gets alerted and can check the logs manually. Switching providers is an environment variable change, not a code change.

## Is it a risk that the bot code is public?

Q: Can someone read the code and prompts to find weaknesses?

A: We accept this risk. The public repository serves as a forkable template for other teams. The code has no embedded secrets. Transparency is a feature for a template project. Production runs from a private repository with real secrets.
