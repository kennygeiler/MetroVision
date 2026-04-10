import { NextRequest } from "next/server";

import { searchShots } from "@/db/queries";
import { logServerEvent } from "@/lib/server-log";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q")?.trim();

    if (!query) {
      return Response.json([]);
    }

    const shots = await searchShots(query, {
      openAiApiKey: process.env.OPENAI_API_KEY,
    });

    return Response.json(shots);
  } catch (error) {
    logServerEvent("error", "api_search_failed", {
      err:
        error instanceof Error
          ? { name: error.name, message: error.message }
          : String(error),
    });

    return Response.json(
      { error: "Failed to search shots." },
      { status: 500 },
    );
  }
}
