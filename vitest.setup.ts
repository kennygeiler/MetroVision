/**
 * Vitest loads DB-backed route modules; Neon client only needs a well-formed URL at import time.
 */
process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:5432/metrovision_vitest";
process.env.NEXT_PUBLIC_SITE_URL ||= "http://127.0.0.1:3000";
