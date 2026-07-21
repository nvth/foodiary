import { createCategory, deleteCategory, listCategories, renameCategory } from "@/db";
import { adminErrorResponse, requireAdmin } from "@/lib/admin-auth";
import { parseCategoryInput } from "@/lib/category-validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    requireAdmin(request);
    return Response.json(
      { categories: await listCategories() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    requireAdmin(request);
    const category = await createCategory(parseCategoryInput(await request.json()));
    return Response.json({ category }, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    requireAdmin(request);
    const id = requiredCategoryId(request);
    const category = await renameCategory(id, parseCategoryInput(await request.json()));
    return Response.json({ category });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    requireAdmin(request);
    await deleteCategory(requiredCategoryId(request));
    return Response.json({ deleted: true });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

function requiredCategoryId(request: Request): string {
  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id || id.length > 120) {
    const error = new Error("Thiếu mã loại món.");
    Object.assign(error, { status: 400 });
    throw error;
  }
  return id;
}
