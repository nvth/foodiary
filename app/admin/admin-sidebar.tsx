/* eslint-disable @next/next/no-img-element -- The local transparent logo is a small static asset. */

import Link from "next/link";

type AdminSidebarProps = {
  active: "posts" | "categories" | "about";
};

export default function AdminSidebar({ active }: AdminSidebarProps) {
  return (
    <aside className="admin-sidebar">
      <Link className="admin-brand" href="/admin">
        <img className="admin-logo" src="/frog-logo.png" alt="" aria-hidden="true" />
        <strong>Ăn đâu<br />hôm nay?</strong>
      </Link>
      <nav aria-label="Điều hướng quản trị">
        <Link className={active === "posts" ? "active" : undefined} aria-current={active === "posts" ? "page" : undefined} href="/admin">Bài viết</Link>
        <Link className={active === "categories" ? "active" : undefined} aria-current={active === "categories" ? "page" : undefined} href="/admin/categories">Loại món</Link>
        <Link className={active === "about" ? "active" : undefined} aria-current={active === "about" ? "page" : undefined} href="/admin/about">Về blog</Link>
        <Link href="/admin/editor">Thêm bài mới</Link>
        <Link href="/">Xem trang chủ ↗</Link>
      </nav>
      <small>Chỉ dành cho tác giả</small>
    </aside>
  );
}
