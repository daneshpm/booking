/**
 * Stand-in for next/cache. Cache revalidation is a no-op outside a request,
 * and the real function throws when there is no Next.js context.
 */
export function revalidatePath(_path: string): void {}
export function revalidateTag(_tag: string): void {}
