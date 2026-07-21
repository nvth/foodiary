/**
 * Set by the outer Cloudflare Worker only after it verifies an Access JWT.
 * The Worker removes any client-supplied copy before the app sees a request.
 */
export const VERIFIED_ADMIN_EMAIL_HEADER = "x-foodblog-verified-admin-email";

export type AdminState = {
  isAdmin: boolean;
  email: string | null;
  configured: boolean;
};

export function getAdminState(request: Request): AdminState {
  const email = request.headers.get(VERIFIED_ADMIN_EMAIL_HEADER)?.trim().toLowerCase() || null;

  // Access configuration and JWT claims are checked at the Worker boundary.
  // App code deliberately trusts no public Cloudflare or OpenAI identity header.
  return { isAdmin: email !== null, email, configured: email !== null };
}

export function requireAdmin(request: Request): AdminState {
  const state = getAdminState(request);
  if (!state.isAdmin) {
    const error = new Error("Bạn không có quyền chỉnh sửa blog này.");
    Object.assign(error, { status: 401 });
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
