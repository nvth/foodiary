import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listPublishedSpots } from "@/db";
import { requireAdminPage } from "@/lib/admin-page-auth";
import { FoodBlog } from "../../page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Biên tập bài viết — Ăn đâu hôm nay?",
  robots: { index: false, follow: false },
};

export default async function EditorPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  await requireAdminPage("/admin/editor");
  const { id } = await searchParams;
  const spots = id ? await listPublishedSpots() : [];
  const spot = id ? spots.find((item) => item.id === id) : null;
  if (id && !spot) redirect("/admin");
  return <FoodBlog adminMode editorOnly initialEditorSpot={spot} />;
}
