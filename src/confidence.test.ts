// Self-check: verify confidence heuristic override + formatting logic
// No LLM needed — mocks the confidenceRater output and tests the code path
// Run: npx tsx src/confidence.test.ts

interface MockState {
	confidence: string;
	failedLogs: string;
	verdict: string;
	summary: string;
}

// Extracted from index.ts — the heuristic override + formatting logic
function applyConfidence(state: MockState): { confidence: string; message: string } {
	let confidence = state.confidence.toLowerCase().trim();

	if (
		state.failedLogs.includes("Logs not matched") ||
		state.verdict.toLowerCase().includes("unknown")
	) {
		confidence = "low";
	}

	const emoji =
		confidence === "high" ? "🟢" :
		confidence === "medium" ? "🟡" : "🔴";
	let message =
		`${state.summary}\n\n${emoji} Confidence: ${confidence.toUpperCase()}`;
	if (confidence === "low") {
		message +=
			"\n\n⚠️ Low confidence — verify raw logs before acting on this summary";
	}

	return { confidence, message };
}

// ── Tests ────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
	if (condition) {
		console.log(`  ✅ ${label}`);
		passed++;
	} else {
		console.error(`  ❌ ${label}`);
		failed++;
	}
}

console.log("Test 1: AI says high, no ambiguity → stays high");
{
	const r = applyConfidence({
		confidence: "high",
		failedLogs: "=== job logs here ===\nError: missing semicolon",
		verdict: "build failure",
		summary: "Lint failed on line 42",
	});
	assert(r.confidence === "high", "confidence stays high");
	assert(r.message.includes("🟢 Confidence: HIGH"), "shows green emoji");
	assert(!r.message.includes("⚠️"), "no warning when high");
}

console.log("Test 2: AI says high, but logs truncated → downgraded to low");
{
	const r = applyConfidence({
		confidence: "high",
		failedLogs: "Failed jobs: test. Logs not matched in archive.",
		verdict: "test failure",
		summary: "Tests failed",
	});
	assert(r.confidence === "low", "downgraded to low");
	assert(r.message.includes("🔴 Confidence: LOW"), "shows red emoji");
	assert(r.message.includes("⚠️ Low confidence"), "has warning");
}

console.log("Test 3: AI says medium, verdict unknown → downgraded to low");
{
	const r = applyConfidence({
		confidence: "medium",
		failedLogs: "=== logs ===\nsome error",
		verdict: "unknown error pattern",
		summary: "Could not determine root cause",
	});
	assert(r.confidence === "low", "downgraded to low");
	assert(r.message.includes("🔴 Confidence: LOW"), "shows red emoji");
	assert(r.message.includes("⚠️ Low confidence"), "has warning");
}

console.log("Test 4: AI says low, no ambiguity signals → stays low (AI's call)");
{
	const r = applyConfidence({
		confidence: "low",
		failedLogs: "=== logs ===\nError: timeout",
		verdict: "timeout",
		summary: "Job timed out after 30s",
	});
	assert(r.confidence === "low", "stays low");
	assert(r.message.includes("🔴 Confidence: LOW"), "shows red emoji");
	assert(r.message.includes("⚠️ Low confidence"), "has warning");
}

console.log("Test 5: AI says medium, no ambiguity → stays medium");
{
	const r = applyConfidence({
		confidence: "medium",
		failedLogs: "=== logs ===\nError: test failed",
		verdict: "test failure",
		summary: "2 tests failed",
	});
	assert(r.confidence === "medium", "stays medium");
	assert(r.message.includes("🟡 Confidence: MEDIUM"), "shows yellow emoji");
	assert(!r.message.includes("⚠️"), "no warning when medium");
}

console.log("Test 6: Confidence value with extra whitespace/caps → normalized");
{
	const r = applyConfidence({
		confidence: "  HIGH  ",
		failedLogs: "=== logs ===",
		verdict: "build error",
		summary: "Build failed",
	});
	assert(r.confidence === "high", "normalized to lowercase trimmed");
	assert(r.message.includes("🟢 Confidence: HIGH"), "display is uppercase");
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);