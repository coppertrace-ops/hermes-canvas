/**
 * @hermes/ui — internal helpers.
 */

/** Join truthy class names. Keeps component JSX readable without a dependency. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
