/** Message of whatever was thrown, for showing/storing in a store's `error`. */
export const errorMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err))
