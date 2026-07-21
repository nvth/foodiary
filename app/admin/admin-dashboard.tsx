"use client";

/* eslint-disable @next/next/no-img-element -- Thumbnails are served directly from R2. */

import Link from "next/link";
import { useMemo, useState } from "react";
import type { PublishedSpot } from "@/db";
import { formatPostDate } from "@/lib/post-date";
import AdminSidebar from "./admin-sidebar";

function AdminPostTimestamp({ value }: { value: string }) {
  const timestamp = formatPostDate(value);
  return timestamp
    ? <time className="admin-posted-at" dateTime={timestamp.dateTime}>{timestamp.label}</time>
    : <span aria-label="Không rõ thời điểm đăng">—</span>;
}

export default function AdminDashboard({ initialSpots }: { initialSpots: PublishedSpot[] }) {
  const [spots, setSpots] = useState(initialSpots);
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return spots;
    return spots.filter((spot) => {
      const hashtagText = (spot.hashtags ?? []).flatMap((tag) => [tag, `#${tag}`]).join(" ");
      return `${spot.name} ${spot.area} ${spot.cuisine} ${spot.dish} ${hashtagText}`.toLowerCase().includes(normalized);
    });
  }, [query, spots]);

  const areaCount = new Set(spots.map((spot) => spot.area)).size;
  const featuredCount = spots.filter((spot) => spot.featured).length;

  async function deletePost(spot: PublishedSpot) {
    if (!window.confirm(`Xóa bài “${spot.name}” cùng toàn bộ ảnh?`)) return;
    setDeletingId(spot.id);
    try {
      const response = await fetch(`/api/admin/reviews?id=${encodeURIComponent(spot.id)}`, { method: "DELETE" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Không thể xóa bài review.");
      setSpots((current) => current.filter((item) => item.id !== spot.id));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Đã có lỗi xảy ra.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="admin-dashboard">
      <AdminSidebar active="posts" />

      <section className="admin-workspace" id="posts">
        <header className="admin-page-header">
          <div><p>Quản trị nội dung</p><h1>Bài viết</h1></div>
          <Link className="admin-primary-action" href="/admin/editor">＋ Thêm bài mới</Link>
        </header>

        <div className="admin-stats" aria-label="Thống kê bài viết">
          <article><span>Tổng bài viết</span><strong>{spots.length}</strong></article>
          <article><span>Bài nổi bật</span><strong>{featuredCount}</strong></article>
          <article><span>Khu vực</span><strong>{areaCount}</strong></article>
        </div>

        <section className="admin-panel">
          <div className="admin-panel-toolbar">
            <div><h2>Danh sách bài viết</h2><p>Quản lý nội dung, ảnh và menu món.</p></div>
            <label><span className="sr-only">Tìm bài viết</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm quán, món, khu vực hoặc hashtag..." /></label>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-post-table">
              <thead><tr><th>Bài viết</th><th>Khu vực</th><th>Điểm</th><th>Ngày ghé</th><th>Ngày giờ đăng</th><th>Trạng thái</th><th><span className="sr-only">Thao tác</span></th></tr></thead>
              <tbody>
                {filtered.map((spot) => (
                  <tr key={spot.id}>
                    <td><div className="admin-post-cell"><img src={spot.image} alt="" /><span><strong>{spot.name}</strong><small>{spot.dishes.length} món · {spot.gallery.length} ảnh</small></span></div></td>
                    <td>{spot.area}</td>
                    <td><span className="admin-rating">★ {spot.rating.toFixed(1)}</span></td>
                    <td>{spot.date}</td>
                    <td><AdminPostTimestamp value={spot.postedAt} /></td>
                    <td><span className={spot.featured ? "admin-status featured" : "admin-status"}>{spot.featured ? "Nổi bật" : "Đã đăng"}</span></td>
                    <td><div className="admin-row-actions"><Link href={`/admin/editor?id=${encodeURIComponent(spot.id)}`}>Sửa</Link><button onClick={() => deletePost(spot)} disabled={deletingId === spot.id}>{deletingId === spot.id ? "Đang xóa" : "Xóa"}</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && <div className="admin-empty"><strong>Không có bài viết phù hợp</strong><span>Thử từ khóa khác hoặc thêm một bài mới.</span></div>}
          </div>
        </section>
      </section>
    </main>
  );
}
