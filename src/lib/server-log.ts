/**
 * One-line JSON logs for server/worker paths (parseable in log drains; still readable locally).
 */

export type ServerLogLevel = "error" | "warn" | "info";

export function logServerEvent(
  level: ServerLogLevel,
  event: string,
  fields?: Record<string, unknown>,
): void {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    service: "metrovision",
    ...fields,
  };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
