/**
 * Turning a caught value into something worth showing somebody.
 *
 * This was defined identically in ten separate modules. The real work happens
 * in `services/api/client.ts`, which already translates Postgres errors into
 * sentences a person can act on and throws them; this is only the last step
 * that unwraps whatever arrives in a `catch`.
 */

export function messageFromError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  // Nothing useful to say, so say that rather than rendering "[object Object]"
  // at somebody.
  return "Something went wrong. Please try again.";
}
