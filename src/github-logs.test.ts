import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Test the filtering logic without real API calls — simulate the matching
// logic from github-logs.ts with mock zip entries.

describe('log filtering logic', () => {
  it('matches failed job logs by name', () => {
    const failedNames = ['test', 'build'];
    const paths = ['test/0_step.txt', 'build/1_lint.txt', 'deploy/0_deploy.txt'];
    const matched = paths.filter((p) =>
      failedNames.some((n) => p.includes(n)),
    );
    assert.deepEqual(matched, ['test/0_step.txt', 'build/1_lint.txt']);
  });

  it('returns empty when no failed jobs', () => {
    const failedNames: string[] = [];
    const paths = ['test/0_step.txt'];
    const matched = paths.filter((p) =>
      failedNames.some((n) => p.includes(n)),
    );
    assert.equal(matched.length, 0);
  });

  it('matches by job ID fallback', () => {
    const failedIds = ['12345678'];
    const paths = ['logs/12345678/0_step.txt', 'logs/99999/0_step.txt'];
    const matched = paths.filter((p) =>
      failedIds.some((id) => p.includes(id)),
    );
    assert.deepEqual(matched, ['logs/12345678/0_step.txt']);
  });
});