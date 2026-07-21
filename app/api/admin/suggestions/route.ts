import { deleteSuggestion, listSuggestions, updateSuggestionStatus } from "@/db";
import { adminErrorResponse, requireAdmin } from "@/lib/admin-auth";
import {
  parseSuggestionId,
  parseSuggestionListOptions,
  parseSuggestionStatusInput,
} from "@/lib/suggestion-validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    requireAdmin(request);
    const suggestions = await listSuggestions(parseSuggestionListOptions(request));
    return Response.json(
      { suggestions },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    requireAdmin(request);
    const id = parseSuggestionId(request);
    const status = parseSuggestionStatusInput(await readJson(request));
    const suggestion = await updateSuggestionStatus(id, status);
    return Response.json(
      { suggestion },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    requireAdmin(request);
    const id = parseSuggestionId(request);
    await deleteSuggestion(id);
    return Response.json(
      { deleted: true, id },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return adminErrorResponse(error);
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
