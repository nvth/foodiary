export const MAX_SUGGESTION_USERNAME_LENGTH = 60;
export const MAX_SUGGESTION_MESSAGE_LENGTH = 1200;
export const MAX_SUGGESTIONS_PER_PAGE = 100;

export type SuggestionStatus = "unread" | "read";

export type SuggestionInput = {
  username: string | null;
  message: string;
};

export type SuggestionListOptions = {
  status?: SuggestionStatus;
  limit: number;
};

export type ParsedSuggestionSubmission =
  | { honeypot: true }
  | { honeypot: false; input: SuggestionInput };

export function parseSuggestionSubmission(value: unknown): ParsedSuggestionSubmission {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw badRequest("Dữ liệu góp ý không hợp lệ.");
  }
  const body = value as Record<string, unknown>;
  if (body.website !== undefined && body.website !== null && typeof body.website !== "string") {
    throw badRequest("Trường website không hợp lệ.");
  }
  if (typeof body.website === "string" && body.website.trim()) return { honeypot: true };

  return {
    honeypot: false,
    input: {
      username: optionalUsername(body.username),
      message: requiredMessage(body.message),
    },
  };
}

export function parseSuggestionStatusInput(value: unknown): SuggestionStatus {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw badRequest("Dữ liệu trạng thái không hợp lệ.");
  }
  const status = (value as Record<string, unknown>).status;
  if (status !== "unread" && status !== "read") {
    throw badRequest("Trạng thái góp ý phải là unread hoặc read.");
  }
  return status;
}

export function parseSuggestionListOptions(request: Request): SuggestionListOptions {
  const params = new URL(request.url).searchParams;
  const rawStatus = params.get("status");
  const rawLimit = params.get("limit");
  if (rawStatus !== null && rawStatus !== "unread" && rawStatus !== "read") {
    throw badRequest("Bộ lọc trạng thái phải là unread hoặc read.");
  }
  if (rawLimit !== null && !/^\d+$/.test(rawLimit)) {
    throw badRequest("Giới hạn danh sách góp ý không hợp lệ.");
  }
  const limit = rawLimit === null ? 50 : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_SUGGESTIONS_PER_PAGE) {
    throw badRequest(`Giới hạn danh sách góp ý phải từ 1 đến ${MAX_SUGGESTIONS_PER_PAGE}.`);
  }
  return { status: rawStatus ?? undefined, limit };
}

export function parseSuggestionId(request: Request): string {
  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id || id.length > 120) throw badRequest("Thiếu mã góp ý hợp lệ.");
  return id;
}

function optionalUsername(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw badRequest("Tên người gửi không hợp lệ.");
  const username = value.normalize("NFKC").replace(/\s+/gu, " ").trim();
  if (!username) return null;
  if ([...username].length > MAX_SUGGESTION_USERNAME_LENGTH) {
    throw badRequest(`Tên người gửi không được quá ${MAX_SUGGESTION_USERNAME_LENGTH} ký tự.`);
  }
  if (/[\u0000-\u001f\u007f]/u.test(username)) throw badRequest("Tên người gửi chứa ký tự không hợp lệ.");
  return username;
}

function requiredMessage(value: unknown): string {
  if (typeof value !== "string") throw badRequest("Nội dung góp ý là bắt buộc.");
  const message = value
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/gu, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!message) throw badRequest("Nội dung góp ý là bắt buộc.");
  if ([...message].length > MAX_SUGGESTION_MESSAGE_LENGTH) {
    throw badRequest(`Nội dung góp ý không được quá ${MAX_SUGGESTION_MESSAGE_LENGTH} ký tự.`);
  }
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(message)) {
    throw badRequest("Nội dung góp ý chứa ký tự không hợp lệ.");
  }
  return message;
}

function badRequest(message: string): Error {
  const error = new Error(message);
  Object.assign(error, { status: 400 });
  return error;
}
