import { createSuggestion, getBindings, hasD1Database } from "@/db";
import { buildSuggestionAbuseContext } from "@/lib/suggestion-abuse";
import { parseSuggestionSubmission } from "@/lib/suggestion-validation";

export const dynamic = "force-dynamic";
const MAX_REQUEST_BYTES = 16 * 1024;

export async function POST(request: Request) {
  try {
    const submission = parseSuggestionSubmission(await readJson(request));
    if (submission.honeypot) {
      return Response.json(
        { accepted: true },
        { status: 201, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (!hasD1Database()) {
      return Response.json(
        { error: "Dịch vụ góp ý tạm thời chưa sẵn sàng." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    const abuse = await buildSuggestionAbuseContext(
      request,
      submission.input,
      getBindings().SUGGESTION_RATE_LIMIT_SECRET,
    );
    await createSuggestion(submission.input, abuse);
    return Response.json(
      { accepted: true },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return publicErrorResponse(error);
  }
}

async function readJson(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json" && !contentType?.endsWith("+json")) {
    throw requestError("Yêu cầu phải dùng định dạng JSON.", 415);
  }
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    throw requestError("Nội dung gửi lên quá lớn.", 413);
  }
  if (!request.body) throw requestError("Nội dung JSON không hợp lệ.", 400);

  try {
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_REQUEST_BYTES) {
        await reader.cancel();
        throw requestError("Nội dung gửi lên quá lớn.", 413);
      }
      chunks.push(value);
    }
    const payload = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      payload.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder().decode(payload)) as unknown;
  } catch (error) {
    if (error instanceof Error && "status" in error) throw error;
    throw requestError("Nội dung JSON không hợp lệ.", 400);
  }
}

function requestError(message: string, status: number): Error {
  const error = new Error(message);
  Object.assign(error, { status });
  return error;
}

function publicErrorResponse(error: unknown): Response {
  const rawStatus =
    error instanceof Error && "status" in error
      ? Number((error as Error & { status: number }).status)
      : 500;
  const status = Number.isInteger(rawStatus) && rawStatus >= 400 && rawStatus < 500 ? rawStatus : 500;
  if (status === 500) console.error("Unable to create suggestion", error);
  const message = status === 500
    ? "Không thể gửi góp ý lúc này. Vui lòng thử lại sau."
    : error instanceof Error
      ? error.message
      : "Dữ liệu góp ý không hợp lệ.";
  const retryAfterSeconds = error instanceof Error && "retryAfterSeconds" in error
    ? Number((error as Error & { retryAfterSeconds?: number }).retryAfterSeconds)
    : 0;
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (status === 429 && Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    headers["Retry-After"] = String(Math.ceil(retryAfterSeconds));
  }
  return Response.json(
    { error: message },
    { status, headers },
  );
}
