import { getAdminState } from "@/lib/admin-auth";
import { hasCloudflareStorage } from "@/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return Response.json(
    { ...getAdminState(request), storageReady: hasCloudflareStorage() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
