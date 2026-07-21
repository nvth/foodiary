import { hasCloudflareStorage, listPublishedSpots } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasCloudflareStorage()) {
    return Response.json({ spots: [], mode: "demo" }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const spots = await listPublishedSpots();
    return Response.json(
      { spots, mode: "cloudflare" },
      { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=300" } },
    );
  } catch (error) {
    console.error("Unable to read reviews", error);
    return Response.json({ spots: [], mode: "demo" }, { headers: { "Cache-Control": "no-store" } });
  }
}
