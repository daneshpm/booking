/**
 * Structured logging.
 *
 * Everything in this application logged through bare `console.error` with a
 * human sentence and whatever object was to hand. That is unsearchable once
 * there is more than one request in flight, and it leaked whatever the object
 * happened to contain — password hashes, session tokens and customer email
 * addresses all reachable from the objects being passed.
 *
 * This emits one JSON object per line, redacts sensitive keys by structure
 * rather than by remembering to, and carries a request id so a single
 * customer's failed booking can be followed across every line it produced.
 *
 * Deliberately free of `next/*` imports so the Edge middleware, server actions
 * and the worker can all use the same logger.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_RANK: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

/**
 * Node's `process`, reached through `globalThis` rather than an import.
 *
 * This package is platform-neutral by design — it carries no `@types/node` and
 * is bundled into client components. Depending on `process` directly would
 * either force Node types on every consumer or break in a browser. Reached
 * this way, a browser simply gets `undefined` and falls back to `console`.
 */
interface ProcessLike {
  env?: Record<string, string | undefined>;
  stdout?: { write(chunk: string): unknown };
  stderr?: { write(chunk: string): unknown };
}

function runtime(): ProcessLike | undefined {
  return (globalThis as { process?: ProcessLike }).process;
}

/** `silent` is not a log level, only a threshold — it switches logging off. */
function threshold(): number {
  const env = runtime()?.env ?? {};
  const configured = (env.LOG_LEVEL ?? '').toLowerCase();
  if (configured === 'silent') return Number.POSITIVE_INFINITY;
  if (configured in LEVEL_RANK) return LEVEL_RANK[configured as LogLevel];
  // Tests are silent by default so a deliberate error-path test does not print
  // a stack trace that looks like a real failure.
  if (env.NODE_ENV === 'test') return Number.POSITIVE_INFINITY;
  return LEVEL_RANK.info;
}

export const REDACTED = '[redacted]';

/**
 * Keys whose values never belong in a log, matched on the key rather than the
 * value so a new field carrying a secret is covered the day it is added rather
 * than the day someone notices.
 */
const SENSITIVE_KEY =
  /pass(word|hash)?|token|secret|signature|authorization|cookie|api[-_]?key|credential|salt|otp|cvv/i;

/** Keys that are personal data: kept, but reduced to something non-identifying. */
const EMAIL_KEY = /email/i;
const PHONE_KEY = /phone|mobile/i;

const MAX_DEPTH = 4;
const MAX_ARRAY = 20;
const MAX_STRING = 512;

/**
 * Show enough of an address to correlate two lines, not enough to identify
 * the person: `ravi@example.com` becomes `r***@example.com`.
 */
export function maskEmail(value: string): string {
  const at = value.indexOf('@');
  if (at < 1) return REDACTED;
  return `${value[0]}***${value.slice(at)}`;
}

/** Keep the last two digits only, which is enough to match against a record. */
export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 3) return REDACTED;
  return `***${digits.slice(-2)}`;
}

function serialiseError(error: Error): Record<string, unknown> {
  return {
    name: error.name,
    message: error.message.slice(0, MAX_STRING),
    stack: error.stack?.split('\n').slice(0, 8).join('\n'),
  };
}

/**
 * Walk a value and replace anything sensitive. Depth, array length and string
 * length are all capped: a log line that dumps an entire Prisma result is a
 * denial of service against whoever has to read the log, and against the disk.
 */
export function redact(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Error) return serialiseError(value);
  if (value instanceof Date) return value.toISOString();

  if (typeof value === 'string') {
    return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…[truncated]` : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'function' || typeof value === 'symbol') return undefined;

  if (depth >= MAX_DEPTH) return '[depth-limit]';

  if (Array.isArray(value)) {
    const shown = value.slice(0, MAX_ARRAY).map((item) => redact(item, depth + 1));
    return value.length > MAX_ARRAY ? [...shown, `…${value.length - MAX_ARRAY} more`] : shown;
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY.test(key)) {
        out[key] = REDACTED;
      } else if (EMAIL_KEY.test(key) && typeof item === 'string') {
        out[key] = maskEmail(item);
      } else if (PHONE_KEY.test(key) && typeof item === 'string') {
        out[key] = maskPhone(item);
      } else {
        out[key] = redact(item, depth + 1);
      }
    }
    return out;
  }

  return undefined;
}

export interface LogFields {
  /** Correlates every line produced while serving one request. */
  requestId?: string;
  /** Which tenant, so one workspace's noise can be separated from another's. */
  workspaceId?: string;
  [key: string]: unknown;
}

function emit(level: LogLevel, message: string, fields: LogFields = {}): void {
  if (LEVEL_RANK[level] < threshold()) return;

  const line = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...(redact(fields) as Record<string, unknown>),
  };

  let serialised: string;
  try {
    serialised = JSON.stringify(line);
  } catch {
    // A circular reference must not take down the request that logged it.
    serialised = JSON.stringify({ ts: line.ts, level, msg: message, error: 'unserialisable' });
  }

  // Warnings and errors to stderr so a log shipper can split them without
  // parsing, matching what every other service on this host does. In a browser
  // there are no streams, so the console takes the same JSON line.
  const proc = runtime();
  const isProblem = level === 'error' || level === 'warn';
  const stream = isProblem ? proc?.stderr : proc?.stdout;

  if (stream) {
    stream.write(`${serialised}\n`);
  } else if (isProblem) {
    console.error(serialised);
  } else {
    console.log(serialised);
  }
}

export const logger = {
  debug: (message: string, fields?: LogFields) => emit('debug', message, fields),
  info: (message: string, fields?: LogFields) => emit('info', message, fields),
  warn: (message: string, fields?: LogFields) => emit('warn', message, fields),
  error: (message: string, fields?: LogFields) => emit('error', message, fields),
};

/**
 * Bind fields once so every line from one request carries them without each
 * call site having to remember.
 */
export function childLogger(base: LogFields): typeof logger {
  return {
    debug: (message, fields) => emit('debug', message, { ...base, ...fields }),
    info: (message, fields) => emit('info', message, { ...base, ...fields }),
    warn: (message, fields) => emit('warn', message, { ...base, ...fields }),
    error: (message, fields) => emit('error', message, { ...base, ...fields }),
  };
}
