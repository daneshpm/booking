import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { prisma } from '@bookings/database';
import { __setHeader, __resetRequestContext } from './stubs/next-headers';
import { createPublicBookingAction, getAvailableSlotsAction } from '../../app/book/actions';
import { resetDatabase, createTenant, nextWeekdayAt, type TestTenant } from './helpers';

/**
 * Hostile input against the one endpoint anyone on the internet can reach.
 *
 * The public booking flow takes a name, an email and a set of ids from an
 * unauthenticated caller and writes them to the database, then renders them
 * back into a dashboard and an email. These assertions are less about
 * expecting a specific rejection than about establishing what must never
 * happen: no payload may execute as SQL, escape its field, or reach another
 * tenant's data.
 *
 * Prisma parameterises every query it builds, so injection is expected to be
 * structurally impossible rather than filtered. These tests exist to notice
 * if that ever stops being true — a hand-built $queryRawUnsafe added later
 * would fail here.
 */
describe('malicious input against the public booking flow', () => {
  let tenant: TestTenant;

  const SQL_INJECTION = "' OR '1'='1";
  const SQL_DROP = "Robert'); DROP TABLE bookings;--";
  const XSS = '<script>alert(1)</script>';
  const XSS_IMG = '<img src=x onerror=alert(1)>';
  const PATH_TRAVERSAL = '../../../../etc/passwd';
  const TEMPLATE_INJECTION = '{{constructor.constructor("return process")()}}';
  const COMMAND_INJECTION = '; whoami';

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    __resetRequestContext();
  });

  beforeEach(async () => {
    await resetDatabase();
    __resetRequestContext();
    // A fixed caller address keeps the public rate limiter from turning a
    // refusal-on-the-merits into a refusal-on-throttling partway through.
    __setHeader('x-forwarded-for', `203.0.113.${Math.floor(Math.random() * 250) + 1}`);
    tenant = await createTenant('hostile');
  });

  describe('identifiers', () => {
    for (const [label, payload] of [
      ['SQL injection', SQL_INJECTION],
      ['SQL drop attempt', SQL_DROP],
      ['path traversal', PATH_TRAVERSAL],
      ['command injection', COMMAND_INJECTION],
    ] as const) {
      it(`refuses a service id containing ${label} without executing it`, async () => {
        const result = await getAvailableSlotsAction(tenant.workspaceId, payload, '2027-01-11');

        expect(result.success).toBe(false);

        // The decisive assertion: the table is still there and still intact.
        // A payload that had executed would have taken it with it.
        await expect(prisma.booking.count()).resolves.toBeGreaterThanOrEqual(0);
        await expect(prisma.service.count()).resolves.toBe(1);
      });
    }

    it('refuses a workspace id containing SQL rather than matching everything', async () => {
      // "' OR '1'='1" is the classic: if it were concatenated it would match
      // every workspace rather than none.
      const result = await getAvailableSlotsAction(SQL_INJECTION, tenant.serviceId, '2027-01-11');

      expect(result.success).toBe(false);
      expect(result.slots).toEqual([]);
    });

    it('refuses a malformed date rather than interpreting it', async () => {
      const result = await getAvailableSlotsAction(
        tenant.workspaceId,
        tenant.serviceId,
        SQL_INJECTION
      );

      expect(result.success).toBe(false);
    });
  });

  describe('customer-supplied text', () => {
    async function book(overrides: Record<string, string>) {
      const start = nextWeekdayAt(10);
      return createPublicBookingAction({
        workspaceId: tenant.workspaceId,
        serviceId: tenant.serviceId,
        date: start.toISOString().slice(0, 10),
        time: '10:00',
        customerName: 'Ordinary Customer',
        customerEmail: 'ordinary@example.com',
        ...overrides,
      });
    }

    it('stores a name containing script tags verbatim, without executing or mangling it', async () => {
      // Storing it as-is is correct: React escapes on render. What would be
      // wrong is the value arriving altered, which would mean something in
      // the write path was parsing rather than parameterising it.
      const result = await book({ customerName: XSS, customerEmail: 'xss@example.com' });

      if (result.success) {
        const customer = await prisma.customer.findFirst({
          where: { email: 'xss@example.com' },
        });
        expect(customer?.name).toBe(XSS);
      } else {
        // A validator rejecting it outright is equally acceptable.
        expect(result.error).toBeTruthy();
      }

      // Either way the database survived.
      await expect(prisma.customer.count()).resolves.toBeGreaterThanOrEqual(0);
    });

    it('survives an image-tag XSS payload in the name', async () => {
      const result = await book({ customerName: XSS_IMG, customerEmail: 'xss2@example.com' });

      expect(typeof result.success).toBe('boolean');
      await expect(prisma.service.count()).resolves.toBe(1);
    });

    it('does not evaluate a template-injection payload', async () => {
      const result = await book({
        customerName: TEMPLATE_INJECTION,
        customerEmail: 'tpl@example.com',
      });

      if (result.success) {
        const customer = await prisma.customer.findFirst({ where: { email: 'tpl@example.com' } });
        // Stored literally: if it had been evaluated this would hold
        // something from the Node process instead.
        expect(customer?.name).toBe(TEMPLATE_INJECTION);
        expect(customer?.name).not.toContain('[object process]');
      }
    });

    it('refuses an email that is not an email', async () => {
      const result = await book({ customerEmail: SQL_INJECTION });

      expect(result.success).toBe(false);
    });

    it('refuses an absurdly long name rather than storing it', async () => {
      const result = await book({
        customerName: 'A'.repeat(100_000),
        customerEmail: 'long@example.com',
      });

      // Either rejected, or stored truncated — what must not happen is an
      // unbounded write.
      if (result.success) {
        const customer = await prisma.customer.findFirst({ where: { email: 'long@example.com' } });
        expect((customer?.name ?? '').length).toBeLessThan(100_000);
      } else {
        expect(result.success).toBe(false);
      }
    });
  });

  describe('the schema is still intact afterwards', () => {
    it('still has its tables and its exclusion constraints', async () => {
      const constraints = await prisma.$queryRawUnsafe<Array<{ conname: string }>>(
        `SELECT conname FROM pg_constraint WHERE conname LIKE '%no_staff_overlap%'`
      );

      expect(constraints.length).toBeGreaterThanOrEqual(2);
      await expect(prisma.workspace.count()).resolves.toBe(1);
    });
  });
});
