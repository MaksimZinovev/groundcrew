import JSZip from 'jszip';

const GITHUB_API = 'https://api.github.com';

interface Job {
  id: number;
  name: string;
  conclusion: string | null;
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

/**
 * Fetch CI run logs, unzip, and keep only failed jobs' logs (R7.1 — token efficiency).
 * N13a: GET /repos/{owner}/{repo}/actions/runs/{id}/logs
 */
export async function fetchFailedLogs(
  runId: number,
  repo: string,
  conclusion: string,
): Promise<string> {
  if (conclusion === 'success') {
    return 'CI run succeeded. No failures to analyze.';
  }

  const headers = authHeaders();

  // Identify failed jobs from the run's job list
  const jobsRes = await fetch(`${GITHUB_API}/repos/${repo}/actions/runs/${runId}/jobs`, { headers });
  if (!jobsRes.ok) throw new Error(`Failed to fetch jobs: ${jobsRes.status}`);
  const jobsData = (await jobsRes.json()) as { jobs: Job[] };
  const failedJobs = jobsData.jobs.filter((j) => j.conclusion === 'failure');

  if (failedJobs.length === 0) {
    return `Run conclusion: ${conclusion}, but no individual jobs reported failure.`;
  }

  const failedNames = failedJobs.map((j) => j.name);
  const failedIds = failedJobs.map((j) => String(j.id));

  // Fetch the logs zip (302 redirect to temp URL — fetch follows by default)
  const logsRes = await fetch(`${GITHUB_API}/repos/${repo}/actions/runs/${runId}/logs`, { headers });
  if (!logsRes.ok) throw new Error(`Failed to fetch logs: ${logsRes.status}`);
  const zipBuffer = await logsRes.arrayBuffer();
  const zip = await JSZip.loadAsync(zipBuffer);

  // ponytail: match log files by job name or job ID in path. GitHub's zip structure
  // is not formally documented; this fuzzy match covers the common layouts. If no
  // match, we fall back to returning the failed job names as context.
  const failedLogs: string[] = [];
  for (const [path, file] of Object.entries(zip.files)) {
    if (file.dir) continue;
    const matches = failedNames.some((n) => path.includes(n)) || failedIds.some((id) => path.includes(id));
    if (matches) {
      const content = await file.async('string');
      failedLogs.push(`=== ${path} ===\n${content}`);
    }
  }

  if (failedLogs.length === 0) {
    return `Failed jobs: ${failedNames.join(', ')}. Logs not matched in archive.`;
  }

  return failedLogs.join('\n\n');
}