import type { Metadata } from "next";
import { getBlogAbout } from "@/db";
import { requireAdminPage } from "@/lib/admin-page-auth";
import AdminSidebar from "../admin-sidebar";
import AboutEditor from "./about-editor";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chỉnh sửa Về blog — Ăn đâu hôm nay?",
  robots: { index: false, follow: false },
};

export default async function AboutPage() {
  await requireAdminPage("/admin/about");
  const about = await getBlogAbout();

  return (
    <main className="admin-dashboard">
      <AdminSidebar active="about" />
      <AboutEditor initialAbout={about} />
    </main>
  );
}
