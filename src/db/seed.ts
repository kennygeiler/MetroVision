import { eq } from "drizzle-orm";

import { db } from "@/db";
import { films } from "@/db/schema";

async function main() {
  const existing = await db
    .select({ id: films.id })
    .from(films)
    .where(eq(films.title, "Seed (dev)"))
    .limit(1);

  if (existing.length > 0) {
    console.info("Seed skipped: dev film already exists.");
    return;
  }

  await db.insert(films).values({
    title: "Seed (dev)",
    director: "MetroVision",
    year: 1970,
  });

  console.info("Seed complete: inserted dev film.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
