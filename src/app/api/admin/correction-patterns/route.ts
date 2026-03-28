import { getCorrectionPatterns } from "@/db/queries";

export async function GET() {
  try {
    const patterns = await getCorrectionPatterns();

    return Response.json(patterns);
  } catch (error) {
    console.error("Failed to compute correction patterns.", error);

    return Response.json(
      { error: "Failed to compute correction patterns." },
      { status: 500 },
    );
  }
}
