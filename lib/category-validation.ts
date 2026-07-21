const MAX_CATEGORY_NAME_LENGTH = 80;

export type CategoryInput = {
  name: string;
  nameKey: string;
};

export function parseCategoryInput(value: unknown): CategoryInput {
  if (!value || typeof value !== "object") {
    throw categoryRequestError("Dữ liệu loại món không hợp lệ.");
  }

  const rawName = (value as Record<string, unknown>).name;
  const name = normalizeCategoryName(rawName);
  if (!name) throw categoryRequestError("Tên loại món là bắt buộc.");
  if (name.length > MAX_CATEGORY_NAME_LENGTH) {
    throw categoryRequestError(`Tên loại món không được quá ${MAX_CATEGORY_NAME_LENGTH} ký tự.`);
  }

  return { name, nameKey: normalizeCategoryKey(name) };
}

export function normalizeCategoryName(value: unknown): string {
  return typeof value === "string"
    ? value.normalize("NFC").trim().replace(/\s+/gu, " ")
    : "";
}

export function normalizeCategoryKey(value: string): string {
  return normalizeCategoryName(value).toLocaleLowerCase("vi-VN");
}

function categoryRequestError(message: string): Error {
  const error = new Error(message);
  Object.assign(error, { status: 400 });
  return error;
}
