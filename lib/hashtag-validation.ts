export const MAX_REVIEW_HASHTAGS = 10;
export const MAX_REVIEW_HASHTAG_LENGTH = 32;

export function parseReviewHashtags(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw badRequest("Hashtag phải là một danh sách.");
  if (value.length > MAX_REVIEW_HASHTAGS) {
    throw badRequest(`Mỗi bài review có tối đa ${MAX_REVIEW_HASHTAGS} hashtag.`);
  }

  return normalizeHashtagList(value, true);
}

export function parseStoredReviewHashtags(value: string | null): string[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? normalizeHashtagList(parsed, false) : [];
  } catch {
    return [];
  }
}

function normalizeHashtagList(values: unknown[], strict: boolean): string[] {
  const hashtags: string[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (typeof value !== "string") {
      if (strict) throw badRequest(`Hashtag ${index + 1} không hợp lệ.`);
      continue;
    }

    const hashtag = normalizeHashtag(value);
    const length = [...hashtag].length;
    const invalid =
      !hashtag ||
      length > MAX_REVIEW_HASHTAG_LENGTH ||
      hashtag.includes("#") ||
      /[\u0000-\u001f\u007f]/u.test(hashtag);
    if (invalid) {
      if (strict) {
        throw badRequest(
          `Hashtag ${index + 1} phải có từ 1 đến ${MAX_REVIEW_HASHTAG_LENGTH} ký tự và không chứa dấu #.`,
        );
      }
      continue;
    }

    const key = hashtag.toLocaleLowerCase("vi");
    if (seen.has(key)) continue;
    seen.add(key);
    hashtags.push(hashtag);
    if (hashtags.length === MAX_REVIEW_HASHTAGS) break;
  }

  return hashtags;
}

function normalizeHashtag(value: string): string {
  let hashtag = value.normalize("NFKC").trim();
  while (hashtag.startsWith("#")) hashtag = hashtag.slice(1).trimStart();
  return hashtag.replace(/\s+/gu, " ").trim();
}

function badRequest(message: string): Error {
  const error = new Error(message);
  Object.assign(error, { status: 400 });
  return error;
}
