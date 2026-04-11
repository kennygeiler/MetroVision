/**
 * Normalize ESM `default` vs namespace object when importing app TS from the worker bundle.
 */

export function interopNamespace<T extends object>(mod: T & { default?: T }): T {
  const d = (mod as { default?: T }).default;
  return d !== undefined ? d : mod;
}
