// next/cache → be cache (kliente duomenys ir taip kešuojami client-cache.ts / IndexedDB).
export function unstable_cache<T extends (...a: never[]) => unknown>(fn: T): T { return fn }
export function revalidateTag(): void {}
export function revalidatePath(): void {}
