import { getBindings } from "@/db";

const IDENTITY_HEADERS = [
  "cf-access-authenticated-user-email",
  "oai-authenticated-user-email",
] as const;

export type AdminState = {
  isAdmin: boolean;
  email: string | null;
  configured: boolean;
};

export function getAdminState(request: Request): AdminState {
  const hostname = new URL(request.url).hostname;
  const bindings = getBindings();
  const localBypass = hostname === "localhost" || hostname === "127.0.0.1";

  const email = IDENTITY_HEADERS
    .map((header) => request.headers.get(header)?.trim().toLowerCase())
    .find(Boolean) ?? null;
  const allowedEmails = (bindings.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (localBypass) {
    return { isAdmin: true, email: email ?? "local-author", configured: true };
  }

  return {
    isAdmin: Boolean(email && allowedEmails.includes(email)),
    email,
    configured: allowedEmails.length > 0,
  };
}

export function requireAdmin(request: Request): AdminState {
  const state = getAdminState(request);
  if (!state.isAdmin) {
    const error = new Error(
      state.configured
        ? "Bạn không có quyền chỉnh sửa blog này."
        : "Chưa cấu hình ADMIN_EMAILS trên Cloudflare.",
    );
    Object.assign(error, { status: state.email ? 403 : 401 });
    throw error;
  }
  return state;
}

export function adminErrorResponse(error: unknown): Response {
  const status =
    error instanceof Error && "status" in error
      ? Number((error as Error & { status: number }).status)
      : 500;
  const message = error instanceof Error ? error.message : "Đã có lỗi xảy ra.";
  return Response.json({ error: message }, { status });
}
