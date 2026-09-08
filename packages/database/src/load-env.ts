import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Load KEY=VALUE pairs from a .env file at the repository root, if one exists.
 *
 * Node's --env-file flag throws when the file is missing, which breaks CI and
 * container runs where configuration comes from the real environment. This
 * loader is a no-op in that case.
 *
 * Values already present in process.env always win, so an explicit environment
 * variable is never overwritten by the file.
 */
export function loadEnvFile(relativePath = '../../.env'): void {
  const path = resolve(process.cwd(), relativePath);
  if (!existsSync(path)) return;

  for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    if (!key || key in process.env) continue;

    let value = line.slice(separator + 1).trim();
    // Strip one layer of matching quotes, the usual .env convention.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}
