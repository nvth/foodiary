import type { Metadata } from "next";
import { listCategories } from "@/db";
import { requireAdminPage } from "@/lib/admin-page-auth";
import AdminSidebar from "../admin-sidebar";
import CategoryManager from "./category-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quản lý loại món — Ăn đâu hôm nay?",
  robots: { index: false, follow: false },
};

export default async function CategoriesPage() {
  await requireAdminPage("/admin/categories");
  const categories = await listCategories();

  return (
    <main className="admin-dashboard">
      <AdminSidebar active="categories" />
      <CategoryManager initialCategories={categories} />
    </main>
  );
}
