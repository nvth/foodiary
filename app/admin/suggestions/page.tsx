import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin-page-auth";
import AdminSidebar from "../admin-sidebar";
import SuggestionsInbox from "./suggestions-inbox";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Góp ý quán — Ăn đâu hôm nay?",
  robots: { index: false, follow: false },
};

export default async function SuggestionsPage() {
  await requireAdminPage("/admin/suggestions");

  return (
    <main className="admin-dashboard">
      <AdminSidebar active="suggestions" />
      <SuggestionsInbox />
    </main>
  );
}
