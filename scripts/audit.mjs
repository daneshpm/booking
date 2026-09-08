#!/usr/bin/env node
/**
 * Dependency audit with a reviewable allowlist.
 *
 * `npm audit` alone leaves two bad options: fail on advisories that have no
 * fix short of a major framework upgrade, or turn the gate off entirely. This
 * does neither. Advisories assessed as not exposed are listed in
 * .github/audit-allowlist.json with a reason and a review date; anything else
 * at high or critical severity fails the build, and an expired entry fails too
 * so accepted risk is revisited rather than forgotten.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const ALLOWLIST_PATH = join(repoRoot, '.github', 'audit-allowlist.json');
const BLOCKING_SEVERITIES = new Set(['high', 'critical']);

function runAudit() {
  try {
    // npm exits non-zero whenever it finds anything, so the output is read from
    // the error path as well as the success path.
    return execFileSync('npm', ['audit', '--json', '--omit=dev'], {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      shell: process.platform === 'win32',
    });
  } catch (err) {
    if (typeof err.stdout === 'string' && err.stdout.trim()) return err.stdout;
    throw err;
  }
}

function loadAllowlist() {
  const parsed = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'));
  const byAdvisory = new Map();
  for (const entry of parsed.allow ?? []) {
    byAdvisory.set(entry.advisory, entry);
  }
  return byAdvisory;
}

/** Every advisory in the report, flattened out of npm's nested structure. */
function collectAdvisories(report) {
  const found = [];
  for (const [name, vuln] of Object.entries(report.vulnerabilities ?? {})) {
    if (!BLOCKING_SEVERITIES.has(vuln.severity)) continue;

    for (const via of vuln.via ?? []) {
      // A string entry means "vulnerable only through another package"; the
      // advisory itself appears on that package's own record.
      if (typeof via === 'string') continue;
      found.push({
        package: via.name ?? name,
        severity: via.severity ?? vuln.severity,
        title: via.title ?? 'Unknown advisory',
        advisory: (via.url ?? '').split('/').pop() ?? '',
        url: via.url ?? '',
      });
    }
  }
  return found;
}

function main() {
  const report = JSON.parse(runAudit());
  const allowlist = loadAllowlist();
  const advisories = collectAdvisories(report);

  const today = new Date();
  const blocking = [];
  const accepted = [];
  const expired = [];

  for (const advisory of advisories) {
    const entry = allowlist.get(advisory.advisory);
    if (!entry) {
      blocking.push(advisory);
      continue;
    }
    if (new Date(entry.reviewOn) < today) {
      expired.push({ ...advisory, reviewOn: entry.reviewOn });
    } else {
      accepted.push({ ...advisory, reviewOn: entry.reviewOn });
    }
  }

  if (accepted.length > 0) {
    console.log(`Accepted advisories (${accepted.length}):`);
    for (const a of accepted) {
      console.log(`  - ${a.package}: ${a.advisory} (review by ${a.reviewOn})`);
    }
    console.log('');
  }

  if (expired.length > 0) {
    console.error(`Allowlist entries past their review date (${expired.length}):`);
    for (const a of expired) {
      console.error(`  - ${a.package}: ${a.advisory}, due ${a.reviewOn}`);
      console.error(`    ${a.url}`);
    }
    console.error('\nRe-assess these and either fix them or extend reviewOn with a reason.\n');
  }

  if (blocking.length > 0) {
    console.error(`Unreviewed high or critical advisories (${blocking.length}):`);
    for (const a of blocking) {
      console.error(`  - ${a.package} [${a.severity}]: ${a.title}`);
      console.error(`    ${a.url}`);
    }
    console.error(
      '\nFix these, or add them to .github/audit-allowlist.json with a reason ' +
        'and a review date once you have assessed the exposure.\n'
    );
  }

  if (blocking.length > 0 || expired.length > 0) {
    process.exit(1);
  }

  console.log('No unreviewed high or critical advisories.');
}

main();
