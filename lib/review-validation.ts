import type { ReviewInput } from "@/db";

const allowedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_REVIEW_PHOTOS = 5;
export { allowedImageTypes };

export function parseReviewInput(value: unknown): ReviewInput {
  if (!value || typeof value !== "object") throw badRequest("Dữ liệu bài viết không hợp lệ.");
  const input = value as Record<string, unknown>;
  const rating = Number(input.rating);
  const photos = Array.isArray(input.photoKeys) ? input.photoKeys : [];
  const rawDishes = Array.isArray(input.dishes) && input.dishes.length
    ? input.dishes
    : [{ name: input.dish, photoIndex: 0 }];

  if (rating < 1 || rating > 5 || !Number.isInteger(rating * 2)) {
    throw badRequest("Điểm đánh giá phải từ 1 đến 5, theo bước 0,5.");
  }
  if (photos.length < 1 || photos.length > MAX_REVIEW_PHOTOS) {
    throw badRequest("Mỗi bài review cần từ 1 đến 5 ảnh.");
  }
  if (rawDishes.length < 1 || rawDishes.length > 12) {
    throw badRequest("Menu cần từ 1 đến 12 món.");
  }
  const dishes = rawDishes.map((dish, index) => parseDish(dish, index, photos.length));

  return {
    name: requiredString(input.name, "Tên quán", 120),
    area: requiredString(input.area, "Khu vực", 80),
    address: requiredString(input.address, "Địa chỉ", 240),
    categoryId: requiredString(input.categoryId, "Loại món", 120),
    priceLabel: requiredString(input.priceLabel, "Mức giá", 40),
    dish: dishes[0].name,
    rating,
    excerpt: requiredString(input.excerpt, "Mô tả ngắn", 320),
    content: requiredString(input.content, "Bài review", 8000),
    visitedAt: validDate(input.visitedAt),
    isFavorite: Boolean(input.isFavorite),
    isFeatured: Boolean(input.isFeatured),
    dishes,
    photoKeys: photos.map((photo, index) => parsePhoto(photo, index)),
  };
}

function parseDish(value: unknown, index: number, photoCount: number) {
  if (!value || typeof value !== "object") throw badRequest(`Món ${index + 1} không hợp lệ.`);
  const dish = value as Record<string, unknown>;
  const photoIndex = Number(dish.photoIndex);
  if (!Number.isInteger(photoIndex) || photoIndex < 0 || photoIndex >= photoCount) {
    throw badRequest(`Món ${index + 1} chưa được gắn với một ảnh hợp lệ.`);
  }
  return {
    name: requiredString(dish.name, `Tên món ${index + 1}`, 120),
    photoIndex,
  };
}

function parsePhoto(value: unknown, index: number) {
  if (!value || typeof value !== "object") throw badRequest(`Ảnh ${index + 1} không hợp lệ.`);
  const photo = value as Record<string, unknown>;
  const contentType = requiredString(photo.contentType, "Loại ảnh", 80);
  const sizeBytes = Number(photo.sizeBytes);
  if (!allowedImageTypes.has(contentType)) throw badRequest(`Ảnh ${index + 1} sai định dạng.`);
  if (!Number.isInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > MAX_IMAGE_BYTES) {
    throw badRequest(`Ảnh ${index + 1} vượt quá 8 MB.`);
  }
  return {
    objectKey: requiredString(photo.objectKey, "Mã ảnh", 400),
    altText: requiredString(photo.altText, `Caption ảnh ${index + 1}`, 240),
    contentType,
    sizeBytes,
  };
}

function requiredString(value: unknown, label: string, max: number): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw badRequest(`${label} là bắt buộc.`);
  if (text.length > max) throw badRequest(`${label} không được quá ${max} ký tự.`);
  return text;
}

function validDate(value: unknown): string {
  const text = requiredString(value, "Ngày ghé quán", 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00Z`))) {
    throw badRequest("Ngày ghé quán không hợp lệ.");
  }
  return text;
}

function badRequest(message: string): Error {
  const error = new Error(message);
  Object.assign(error, { status: 400 });
  return error;
}
