/**
 * Database entry point.
 *
 * Re-exports the generated Prisma types alongside the shared client, so callers
 * import model types, enums and the client from one place.
 *
 * Prisma 7 routes its public types through `.prisma/client`; importing from
 * `@prisma/client` alone yields the client class without the model and enum
 * types, which is why both are re-exported here.
 */
export * from '@prisma/client';
export * from './client';
