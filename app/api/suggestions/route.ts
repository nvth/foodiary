import { createSuggestion, hasD1Database } from "@/db";
import { parseSuggestionSubmission } from "@/lib/suggestion-validation";

export const dynamic = "force-dynamic";

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

    const suggestion = await createSuggestion(submission.input);
    return Response.json(
      { accepted: true, suggestion },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return publicErrorResponse(error);
  }
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    const error = new Error("Nội dung JSON không hợp lệ.");
    Object.assign(error, { status: 400 });
    throw error;
  }
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
  return Response.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
