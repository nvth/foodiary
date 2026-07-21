import { getR2 } from "@/db";
import { adminErrorResponse, requireAdmin } from "@/lib/admin-auth";
import { allowedImageTypes, MAX_IMAGE_BYTES } from "@/lib/review-validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    requireAdmin(request);
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return Response.json({ error: "Chưa chọn ảnh." }, { status: 400 });
    if (!allowedImageTypes.has(file.type)) {
      return Response.json({ error: "Chỉ nhận JPG, PNG, WebP hoặc AVIF." }, { status: 400 });
    }
    if (file.size < 1 || file.size > MAX_IMAGE_BYTES) {
      return Response.json({ error: "Mỗi ảnh phải nhỏ hơn 8 MB." }, { status: 400 });
    }

    const extension = extensionFor(file.type);
    const now = new Date();
    const objectKey = `reviews/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}.${extension}`;
    await getR2().put(objectKey, file.stream(), {
      httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" },
      customMetadata: { originalName: safeFileName(file.name) },
    });

    return Response.json({
      objectKey,
      url: `/api/media?key=${encodeURIComponent(objectKey)}`,
      contentType: file.type,
      sizeBytes: file.size,
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    requireAdmin(request);
    const objectKey = new URL(request.url).searchParams.get("key")?.trim();
    if (!objectKey || !objectKey.startsWith("reviews/")) {
      return Response.json({ error: "Mã ảnh không hợp lệ." }, { status: 400 });
    }
    await getR2().delete(objectKey);
    return Response.json({ deleted: true });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

function extensionFor(contentType: string): string {
  return ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" } as Record<string, string>)[contentType] ?? "bin";
}

function safeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120);
}
