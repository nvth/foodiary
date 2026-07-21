import { hasCloudflareStorage, listCategories } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasCloudflareStorage()) {
    return Response.json(
      { categories: [], mode: "demo" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const categories = await listCategories();
    return Response.json(
      { categories, mode: "cloudflare" },
      { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=300" } },
    );
  } catch (error) {
    console.error("Unable to read cuisine categories", error);
    return Response.json(
      { categories: [], mode: "demo" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
