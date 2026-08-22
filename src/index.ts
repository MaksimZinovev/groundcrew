import { readFileSync } from "node:fs";
import { ai, flow } from "@ax-llm/ax";
import { fetchFailedLogs } from "./github-logs.js";

// ── Env var validation (fail fast at startup) ───────────────────

function requireEnv(name: string): string {
	const val = process.env[name];
	if (!val) throw new Error(`Missing required env var: ${name}`);
	return val;
}

// ── Config (N20, S2) ──────────────────────────────────────────────

const aiService = ai({
	name: "openai-compatible",
	apiKey: requireEnv("OLLAMA_API_KEY"),
	apiURL: process.env.LLM_API_URL || "https://ollama.com/v1",
	config: { model: process.env.LLM_MODEL || "glm-5.1" },
});

// ── Telegram (N14) ────────────────────────────────────────────────

async function sendTelegram(text: string): Promise<void> {
	const res = await fetch(
		`https://api.telegram.org/bot${requireEnv("TELEGRAM_BOT_TOKEN")}/sendMessage`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				chat_id: requireEnv("TELEGRAM_CHAT_ID"),
				text,
			}),
		},
	);
	if (!res.ok)
		throw new Error(`Telegram HTTP ${res.status}: ${await res.text()}`);
	const body = (await res.json()) as { ok: boolean; description?: string };
	if (!body.ok)
		throw new Error(`Telegram API error: ${body.description ?? "unknown"}`);
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
	confidence: string;
}

const ciSummaryFlow = flow<FlowInput, FlowOutput>()
	// N8: Planner — deterministic passthrough (becomes .branch() in M3)
	.map((state) => ({ ...state, plan: "ci-analyst" }))
	// N9a: Fetch + filter logs (deterministic async map → N13a)
	.map(async (state) => {
		console.log("  → Fetching failed CI logs...");
		const failedLogs = await fetchFailedLogs(
			state.runId,
			state.repo,
			state.conclusion,
		);
		console.log(`  → Logs fetched: ${failedLogs.length} chars`);
		return { ...state, failedLogs };
	})
	// N9b: CI-Analyst (LLM node)
	.node(
		"ciAnalyst",
		"failedLogs:string, runInfo:string -> verdict:string, failedTests:string, rootCause:string, keyFindings:string[]",
	)
	.execute("ciAnalyst", (state) => {
		console.log("  → CI-Analyst: analyzing logs...");
		return { failedLogs: state.failedLogs, runInfo: state.runInfo };
	})
	// N11: Synthesizer (LLM node) — critique is fed back on retry
	.node(
		"synthesizer",
		"verdict:string, failedTests:string, rootCause:string, keyFindings:string[], critique?:string -> summary:string",
	)
	// N12: Reflection (LLM node)
	.node(
		"reflection",
		"summary:string, runInfo:string -> approved:boolean, critique:string",
	)
	// N12b: Confidence Rater (LLM node) — rates the approved summary
	.node(
		"confidenceRater",
		"summary:string, verdict:string, rootCause:string, keyFindings:string[] -> confidence:class \"high, medium, low\"",
	)
	// Pre-loop: init critique + retry counter
	.map((state) => ({
		...state,
		tries: 0,
		critique: undefined as string | undefined,
	}))
	// Reflection loop: max 2 retries (3 total attempts)
	.label("reflect")
	.map((state) => {
		console.log(`  → Synthesis attempt ${state.tries + 1}/3...`);
		return { ...state, tries: state.tries + 1 };
	})
	.execute("synthesizer", (state) => ({
		verdict: state.ciAnalystResult.verdict,
		failedTests: state.ciAnalystResult.failedTests,
		rootCause: state.ciAnalystResult.rootCause,
		keyFindings: state.ciAnalystResult.keyFindings,
		critique: state.critique,
	}))
	.execute("reflection", (state) => ({
		summary: state.synthesizerResult.summary,
		runInfo: state.runInfo,
	}))
	// Carry reflection's critique into state for the next synthesizer iteration
	.map((state) => {
		const approved = state.reflectionResult.approved;
		console.log(`  → Reflection: ${approved ? "✅ approved" : "❌ needs revision"} — ${state.reflectionResult.critique.slice(0, 120)}`);
		return { ...state, critique: state.reflectionResult.critique };
	})
	.feedback(
		(state) => !state.reflectionResult.approved && state.tries < 3,
		"reflect",
	)
	// N12b: Rate confidence on the approved summary
	.execute("confidenceRater", (state) => {
		console.log("  → Confidence Rater: rating summary...");
		return {
			summary: state.synthesizerResult.summary,
			verdict: state.ciAnalystResult.verdict,
			rootCause: state.ciAnalystResult.rootCause,
			keyFindings: state.ciAnalystResult.keyFindings,
		};
	})
	// Heuristic override: code can downgrade AI confidence on ambiguity signals
	.map((state) => {
		let confidence = state.confidenceRaterResult.confidence.toLowerCase().trim();
		console.log(`  → AI confidence: ${confidence}`);

		// ponytail: simple string checks — covers truncated logs + unknown verdict
		if (
			state.failedLogs.includes("Logs not matched") ||
			state.ciAnalystResult.verdict.toLowerCase().includes("unknown")
		) {
			confidence = "low";
			console.log("  → Heuristic override: downgraded to low (ambiguity detected)");
		}

		const emoji =
			confidence === "high" ? "🟢" :
			confidence === "medium" ? "🟡" : "🔴";
		let message =
			`${state.synthesizerResult.summary}\n\n${emoji} Confidence: ${confidence.toUpperCase()}`;
		if (confidence === "low") {
			message +=
				"\n\n⚠️ Low confidence — verify raw logs before acting on this summary";
		}

		console.log(`  → Final confidence: ${confidence}`);
		return { ...state, confidence, formattedMessage: message };
	})
	// N14: Send to Telegram (deterministic async map)
	.map(async (state) => {
		console.log("  → Sending to Telegram...");
		await sendTelegram(state.formattedMessage);
		console.log("  → Telegram sent successfully");
		return state;
	})
	.returns((state) => ({
		summary: state.synthesizerResult.summary,
		confidence: state.confidence,
	}));

// ── Entry point (N1 → N5) ─────────────────────────────────────────

async function main(): Promise<void> {
	// Validate remaining env vars (OLLAMA_API_KEY checked at module load)
	requireEnv("GITHUB_TOKEN");

	const eventPath = process.env.GITHUB_EVENT_PATH;
	if (!eventPath)
		throw new Error("GITHUB_EVENT_PATH not set (are we in GitHub Actions?)");

	const raw = readFileSync(eventPath, "utf8");
	let event: any;
	try {
		event = JSON.parse(raw);
	} catch (err) {
		if (err instanceof Error)
			err.message = `Invalid workflow_run event at ${eventPath}: ${err.message}`;
		throw err;
	}

	const wf = event.workflow_run;
	if (!wf?.id)
		throw new Error("Not a workflow_run event: missing workflow_run.id");

	const runInfo = [
		`Workflow: ${wf.name}`,
		`Branch: ${wf.head_branch}`,
		`Commit: ${wf.head_sha?.slice(0, 7)}`,
		`Conclusion: ${wf.conclusion}`,
	].join("\n");

	console.log(`Groundcrew: analyzing run #${wf.id} (${wf.conclusion})`);

	const result = await ciSummaryFlow.forward(aiService, {
		runId: wf.id,
		repo: process.env.GITHUB_REPOSITORY!,
		conclusion: wf.conclusion,
		runInfo,
	});

	console.log(`Summary posted to Telegram (confidence: ${result.confidence}):\n`, result.summary);
}

main().catch((err) => {
	console.error("Groundcrew failed:", err);
	process.exit(1);
});