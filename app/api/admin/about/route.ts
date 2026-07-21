import { getBlogAbout, updateBlogAbout } from "@/db";
import { adminErrorResponse, requireAdmin } from "@/lib/admin-auth";
import { parseAboutInput } from "@/lib/about-validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    requireAdmin(request);
    return Response.json(
      { about: await getBlogAbout() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    requireAdmin(request);
    const about = await updateBlogAbout(parseAboutInput(await request.json()));
    return Response.json({ about });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
