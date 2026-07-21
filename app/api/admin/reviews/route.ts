import { createReview, deleteReview, getR2, updateReview } from "@/db";
import { adminErrorResponse, requireAdmin } from "@/lib/admin-auth";
import { parseReviewInput } from "@/lib/review-validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    requireAdmin(request);
    const input = parseReviewInput(await request.json());
    const id = await createReview(input);
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    requireAdmin(request);
    const id = new URL(request.url).searchParams.get("id")?.trim();
    if (!id) return Response.json({ error: "Thiếu mã bài review." }, { status: 400 });
    const objectKeys = await deleteReview(id);
    if (objectKeys.length) await getR2().delete(objectKeys);
    return Response.json({ deleted: true });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    requireAdmin(request);
    const id = new URL(request.url).searchParams.get("id")?.trim();
    if (!id) return Response.json({ error: "Thiếu mã bài review." }, { status: 400 });
    const input = parseReviewInput(await request.json());
    const removedObjectKeys = await updateReview(id, input);
    if (removedObjectKeys.length) await getR2().delete(removedObjectKeys);
    return Response.json({ id, updated: true });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
