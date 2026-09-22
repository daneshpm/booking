import { describe, it, expect } from 'vitest';
import { redact, REDACTED, logger } from '@bookings/core';

/**
 * Regression tests for the one property the logging layer exists to provide:
 * a secret cannot reach the log stream, whoever writes the call.
 *
 * These assert on the *serialised line*, not on the redactor's return value,
 * because the serialised line is what actually lands on disk. A redactor that
 * is correct but bypassed on the way to output would still pass a test of
 * `redact()` alone.
 */

/** Capture what the logger actually writes, as the process would receive it. */
function captureLine(fn: () => void): string {
  const chunks: string[] = [];
  const proc = globalThis as unknown as {
    process: { env: Record<string, string | undefined>; stdout: any; stderr: any };
  };
  const realOut = proc.process.stdout.write;
  const realErr = proc.process.stderr.write;
  const realLevel = proc.process.env.LOG_LEVEL;
  const realNodeEnv = proc.process.env.NODE_ENV;

  proc.process.stdout.write = (c: string) => (chunks.push(String(c)), true);
  proc.process.stderr.write = (c: string) => (chunks.push(String(c)), true);
  // Tests are silent by default; force output so there is a line to inspect.
  proc.process.env.LOG_LEVEL = 'debug';
  proc.process.env.NODE_ENV = 'production';
  try {
    fn();
  } finally {
    proc.process.stdout.write = realOut;
    proc.process.stderr.write = realErr;
    proc.process.env.LOG_LEVEL = realLevel;
    proc.process.env.NODE_ENV = realNodeEnv;
  }
  return chunks.join('');
}

const SECRETS = {
  password: 'hunter2-PLAINTEXT',
  passwordHash: '$2b$12$UNIQUEHASHVALUE',
  accessToken: 'at_UNIQUEACCESS',
  refreshToken: 'rt_UNIQUEREFRESH',
  sessionToken: 'st_UNIQUESESSION',
  authorization: 'Bearer UNIQUEBEARER',
  cookie: 'rb_session=UNIQUECOOKIE',
  apiKey: 'sk_live_UNIQUEAPIKEY',
  secret: 'UNIQUESECRET',
};

describe('secrets cannot reach the log stream', () => {
  it('writes none of the original secret values to the output line', () => {
    const line = captureLine(() => logger.error('auth failed', { user: SECRETS }));

    for (const [key, value] of Object.entries(SECRETS)) {
      expect(line, `${key} leaked into the log line`).not.toContain(value);
    }
    // The line was actually produced -- otherwise the assertions above are vacuous.
    expect(line).toContain('auth failed');
    expect(line).toContain(REDACTED);
  });

  it('masks personal data in the output line', () => {
    const line = captureLine(() =>
      logger.info('booking created', {
        customerEmail: 'ravi.shankar@example.com',
        customerPhone: '+91 98765 43210',
      })
    );

    expect(line).not.toContain('ravi.shankar');
    expect(line).not.toContain('98765');
    expect(line).toContain('r***@example.com');
  });

  it('redacts secrets nested inside objects', () => {
    const out = redact({ a: { b: { c: { password: 'deep' } } } }) as any;
    expect(out.a.b.c.password).toBe(REDACTED);
  });

  it('redacts secrets inside arrays of objects', () => {
    const out = redact({
      sessions: [{ accessToken: 'one' }, { accessToken: 'two' }],
    }) as any;

    expect(out.sessions.map((s: any) => s.accessToken)).toEqual([REDACTED, REDACTED]);
  });

  it('drops a secret buried deeper than the depth cap rather than printing it', () => {
    // Past MAX_DEPTH the walker stops and emits a marker. That is the
    // fail-safe direction: the subtree is not inspected, so it is not
    // emitted either. What matters is that the value never reaches output.
    const line = captureLine(() =>
      logger.error('deep', {
        // `items` is deliberately a neutral key: a sensitive container name
        // such as `credentials` would be redacted wholesale and this would
        // then not be testing the depth cap at all.
        users: [{ profile: { items: [{ refreshToken: 'rt_BURIED_UNIQUE' }] } }],
      })
    );

    expect(line).not.toContain('rt_BURIED_UNIQUE');
    expect(line).toContain('depth-limit');
  });

  it('protects a sensitive key nobody has written yet', () => {
    // The guarantee is structural: redaction matches the key, so a field added
    // in a future change is covered without this test being updated.
    const out = redact({
      someFutureUserPasswordField: 'x',
      vendorRefreshTokenV2: 'y',
      billingApiKeyRotated: 'z',
      webhookSigningSecretNext: 'w',
    }) as Record<string, unknown>;

    expect(Object.values(out)).toEqual([REDACTED, REDACTED, REDACTED, REDACTED]);
  });

  it('keeps the diagnostics that make a log line worth reading', () => {
    const line = captureLine(() =>
      logger.error('booking failed', {
        requestId: 'req-abc',
        workspaceId: 'ws-1',
        bookingId: 'bk-9',
        serviceId: 'svc-3',
        status: 'PENDING',
        durationMinutes: 45,
        err: new Error('exclusion constraint violated'),
      })
    );

    for (const keep of [
      'req-abc',
      'ws-1',
      'bk-9',
      'svc-3',
      'PENDING',
      '45',
      'exclusion constraint violated',
    ]) {
      expect(line, `${keep} was lost`).toContain(keep);
    }
  });

  it('cannot be made to emit an unescaped newline that forges a second line', () => {
    const line = captureLine(() =>
      logger.error('injection attempt', { note: 'a\n{"level":"info","msg":"forged"}' })
    );

    // JSON.stringify escapes the newline, so the payload stays one line.
    expect(line.trimEnd().split('\n')).toHaveLength(1);
    expect(line).toContain('\n');
  });
});
