import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminState } from "@/lib/admin-auth";

export async function requireAdminPage(pathname: string) {
  const requestHeaders = await headers();
  const request = new Request(new URL(pathname, "https://foodblog.internal"), {
    headers: new Headers(requestHeaders),
  });
  const admin = getAdminState(request);
  if (!admin.isAdmin) redirect("/");
  return admin;
}
