/**
 * Stand-in for the `server-only` package.
 *
 * The real module throws when imported outside a React Server Component, which
 * is the point of it. Integration tests call these modules directly, so it is
 * aliased to nothing here.
 */
export {};
