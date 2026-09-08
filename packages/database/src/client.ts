import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

/**
 * Shared Prisma client.
 *
 * Construction is deferred until the first query. Building it at import time
 * would mean every module that merely mentions the database needs a reachable
 * DATABASE_URL, which breaks pure unit tests and forces a placeholder URL into
 * the production build just to get past module loading.
 *
 * Prisma 7 no longer reads the connection URL from schema.prisma; the client is
 * handed a driver adapter instead.
 *
 * In development the instance is cached on globalThis, because hot reload would
 * otherwise open a new connection pool on every edit until the database refused
 * more.
 */

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. The application cannot reach its database without it.'
    );
  }

  const client = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  if (process.env.NODE_ENV !== 'production') {
    globalThis.prismaGlobal = client;
  }

  return client;
}

let instance: PrismaClient | undefined;

function resolveClient(): PrismaClient {
  instance ??= globalThis.prismaGlobal ?? createClient();
  return instance;
}

/**
 * The client, resolved on first use.
 *
 * A Proxy is used rather than a getter function so every existing
 * `prisma.booking.findMany(...)` call site keeps working unchanged.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const client = resolveClient();
    const value = Reflect.get(client as object, property, receiver);
    // Methods must stay bound to the real client, not to the proxy.
    return typeof value === 'function' ? value.bind(client) : value;
  },
  has(_target, property) {
    return Reflect.has(resolveClient() as object, property);
  },
  getPrototypeOf() {
    return Reflect.getPrototypeOf(resolveClient() as object);
  },
});
