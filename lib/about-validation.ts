export const MAX_ABOUT_TITLE_LENGTH = 160;
export const MAX_ABOUT_BODY_LENGTH = 2_000;

export type AboutInput = {
  title: string;
  body: string;
};

export function parseAboutInput(value: unknown): AboutInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw aboutRequestError("Dữ liệu phần Về blog không hợp lệ.");
  }

  const record = value as Record<string, unknown>;
  const title = normalizeAboutTitle(record.title);
  const body = normalizeAboutBody(record.body);

  if (!title) throw aboutRequestError("Tiêu đề phần Về blog là bắt buộc.");
  if (title.length > MAX_ABOUT_TITLE_LENGTH) {
    throw aboutRequestError(`Tiêu đề không được quá ${MAX_ABOUT_TITLE_LENGTH} ký tự.`);
  }
  if (!body) throw aboutRequestError("Nội dung phần Về blog là bắt buộc.");
  if (body.length > MAX_ABOUT_BODY_LENGTH) {
    throw aboutRequestError(`Nội dung không được quá ${MAX_ABOUT_BODY_LENGTH} ký tự.`);
  }

  return { title, body };
}

export function normalizeAboutTitle(value: unknown): string {
  return typeof value === "string"
    ? value.normalize("NFC").trim().replace(/\s+/gu, " ")
    : "";
}

export function normalizeAboutBody(value: unknown): string {
  if (typeof value !== "string") return "";

  return value
    .normalize("NFC")
    .replace(/\r\n?/gu, "\n")
    .split("\n")
    .map((line) => line.trim().replace(/[\t\f\v ]+/gu, " "))
    .join("\n")
    .trim();
}

function aboutRequestError(message: string): Error {
  const error = new Error(message);
  Object.assign(error, { status: 400 });
  return error;
}
