/**
 * Small string helpers that were copy-pasted across the feature modules.
 *
 * `labelFromKey` existed eight times under two names (`labelFromKey` and
 * `labelValue`); `trimToUndefined` six times.
 */

/**
 * Turns a stored enum value into something readable: `due_soon` → `Due Soon`.
 *
 * Only for values the database defines and the interface has no better word
 * for. Anything a person reads often deserves a written label instead.
 */
export function labelFromKey(value: string): string {
  return value
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * An empty field means "not given", not "the empty string". Postgres columns
 * here are nullable rather than defaulting to `''`, so this keeps the two from
 * being confused on the way in.
 */
export function trimToUndefined(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
