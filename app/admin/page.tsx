import type { Metadata } from "next";
import { listPublishedSpots } from "@/db";
import { requireAdminPage } from "@/lib/admin-page-auth";
import AdminDashboard from "./admin-dashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quản lý bài viết — Ăn đâu hôm nay?",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  await requireAdminPage("/admin");
  const spots = await listPublishedSpots();
  return <AdminDashboard initialSpots={spots} />;
}
