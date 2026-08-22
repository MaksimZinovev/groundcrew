// Self-check: verify confidenceRater LLM node produces valid output
// Uses real LLM (Ollama Cloud) via local .env
// Run: npx tsx src/confidence-llm.test.ts

import { ax, ai } from "@ax-llm/ax";
import { readFileSync } from "node:fs";

// ponytail: parse .env manually — no dotenv dependency needed
const envFile = readFileSync(".env", "utf8");
for (const line of envFile.split("\n")) {
	const [k, ...v] = line.split("=");
	if (k && !k.startsWith("#") && v.length) process.env[k.trim()] = v.join("=").trim();
}

const llm = ai({
	name: "openai-compatible",
	apiKey: process.env.OLLAMA_API_KEY!,
	apiURL: process.env.LLM_API_URL || "https://ollama.com/v1",
	config: { model: process.env.LLM_MODEL || "glm-5.1" },
});

// Same signature as the confidenceRater node in index.ts
const rater = ax(
	'summary:string, verdict:string, rootCause:string, keyFindings:string[] -> confidence:class "high, medium, low"',
);

const mockInput = {
	summary:
		"Lint job failed. Missing semicolon on line 42 in src/index.ts. The fix is to add a semicolon at the end of the console.log statement.",
	verdict: "build failure",
	rootCause: "Missing semicolon on line 42",
	keyFindings: [
		"Error: missing semicolon on line 42",
		"File: src/index.ts",
		"Fix: add semicolon after console.log statement",
	],
};

console.log("Calling confidenceRater node with mock CI analysis...\n");
const result = await rater.forward(llm, mockInput);

console.log("Raw result:", JSON.stringify(result, null, 2));

const confidence = (result.confidence || "").toLowerCase().trim();
const valid = ["high", "medium", "low"].includes(confidence);

console.log(`\nConfidence: "${confidence}"`);
console.log(`Valid output: ${valid ? "✅" : "❌"}`);

if (!valid) {
	console.error(`Expected one of: high, medium, low. Got: "${confidence}"`);
	process.exit(1);
}

// Verify emoji mapping works with the real output
const emoji =
	confidence === "high" ? "🟢" :
	confidence === "medium" ? "🟡" : "🔴";
console.log(`Display: ${emoji} Confidence: ${confidence.toUpperCase()}`);
console.log("\n✅ LLM confidence rater produces valid output");
process.exit(0);