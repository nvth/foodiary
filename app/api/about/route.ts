import { DEFAULT_BLOG_ABOUT, getBlogAbout, hasD1Database } from "@/db";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET() {
  if (!hasD1Database()) {
    return fallbackResponse();
  }

  try {
    return Response.json(
      { about: await getBlogAbout(), mode: "cloudflare" },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error("Unable to read blog about settings", error);
    return fallbackResponse();
  }
}

function fallbackResponse(): Response {
  return Response.json(
    { about: { ...DEFAULT_BLOG_ABOUT }, mode: "demo" },
    { headers: NO_STORE_HEADERS },
  );
}
