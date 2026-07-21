import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminState } from "@/lib/admin-auth";

export async function requireAdminPage(pathname: string) {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const request = new Request(`${protocol}://${host}${pathname}`, { headers: new Headers(requestHeaders) });
  const admin = getAdminState(request);
  if (!admin.isAdmin) redirect("/");
  return admin;
}
