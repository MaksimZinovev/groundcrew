import { readFileSync } from 'node:fs';
import { ai, flow } from '@ax-llm/ax';
import { fetchFailedLogs } from './github-logs.js';

// ── Config (N20, S2) ──────────────────────────────────────────────

const aiService = ai({
  name: 'openai-compatible',
  apiKey: process.env.OLLAMA_API_KEY!,
  apiURL: process.env.LLM_API_URL || 'https://ollama.com/v1',
  config: { model: process.env.LLM_MODEL || 'glm-5.1' },
});

// ── Telegram (N14) ────────────────────────────────────────────────

async function sendTelegram(text: string): Promise<void> {
  const res = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'Markdown',
      }),
    },
  );
  if (!res.ok) throw new Error(`Telegram send failed: ${res.status} ${await res.text()}`);
}

// ── Ax Flow (N5 → N8 → N9 → N11 → N12 → N14) ──────────────────────

interface FlowInput {
  runId: number;
  repo: string;
  conclusion: string;
  runInfo: string;
}

interface FlowOutput {
  summary: string;
}

const ciSummaryFlow = flow<FlowInput, FlowOutput>()
  // N8: Planner — deterministic passthrough (becomes .branch() in M3)
  .map((state) => ({ ...state, plan: 'ci-analyst' }))
  // N9a: Fetch + filter logs (deterministic async map → N13a)
  .map(async (state) => {
    const failedLogs = await fetchFailedLogs(state.runId, state.repo, state.conclusion);
    return { ...state, failedLogs };
  })
  // N9b: CI-Analyst (LLM node)
  .node(
    'ciAnalyst',
    'failedLogs:string, runInfo:string -> verdict:string, failedTests:string, rootCause:string, keyFindings:string[]',
  )
  .execute('ciAnalyst', (state) => ({
    failedLogs: state.failedLogs,
    runInfo: state.runInfo,
  }))
  // N11: Synthesizer (LLM node) — critique is fed back on retry
  .node(
    'synthesizer',
    'verdict:string, failedTests:string, rootCause:string, keyFindings:string[], critique?:string -> summary:string',
  )
  // N12: Reflection (LLM node)
  .node('reflection', 'summary:string, runInfo:string -> approved:boolean, critique:string')
  // Pre-loop: init critique + retry counter
  .map((state) => ({
    ...state,
    tries: 0,
    critique: undefined as string | undefined,
  }))
  // Reflection loop: max 2 retries (3 total attempts)
  .label('reflect')
    .map((state) => ({ ...state, tries: state.tries + 1 }))
    .execute('synthesizer', (state) => ({
      verdict: state.ciAnalystResult.verdict,
      failedTests: state.ciAnalystResult.failedTests,
      rootCause: state.ciAnalystResult.rootCause,
      keyFindings: state.ciAnalystResult.keyFindings,
      critique: state.critique,
    }))
    .execute('reflection', (state) => ({
      summary: state.synthesizerResult.summary,
      runInfo: state.runInfo,
    }))
    // Carry reflection's critique into state for the next synthesizer iteration
    .map((state) => ({ ...state, critique: state.reflectionResult.critique }))
  .feedback((state) => !state.reflectionResult.approved && state.tries < 3, 'reflect')
  // N14: Send to Telegram (deterministic async map)
  .map(async (state) => {
    await sendTelegram(state.synthesizerResult.summary);
    return state;
  })
  .returns((state) => ({ summary: state.synthesizerResult.summary }));

// ── Entry point (N1 → N5) ─────────────────────────────────────────

async function main(): Promise<void> {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) throw new Error('GITHUB_EVENT_PATH not set (are we in GitHub Actions?)');

  let event: any;
  try {
    event = JSON.parse(readFileSync(eventPath, 'utf8'));
  } catch {
    throw new Error(`Invalid workflow_run event at ${eventPath}`);
  }

  const wf = event.workflow_run;
  if (!wf?.id) throw new Error('Not a workflow_run event: missing workflow_run.id');

  const runInfo = [
    `Workflow: ${wf.name}`,
    `Branch: ${wf.head_branch}`,
    `Commit: ${wf.head_sha?.slice(0, 7)}`,
    `Conclusion: ${wf.conclusion}`,
  ].join('\n');

  console.log(`Groundcrew: analyzing run #${wf.id} (${wf.conclusion})`);

  const result = await ciSummaryFlow.forward(aiService, {
    runId: wf.id,
    repo: process.env.GITHUB_REPOSITORY!,
    conclusion: wf.conclusion,
    runInfo,
  });

  console.log('Summary posted to Telegram:\n', result.summary);
}

main().catch((err) => {
  console.error('Groundcrew failed:', err);
  process.exit(1);
});