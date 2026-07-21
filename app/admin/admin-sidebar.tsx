/* eslint-disable @next/next/no-img-element, @next/next/no-html-link-for-pages -- Admin links intentionally use full document navigation behind Cloudflare Access. */

import ThemeToggle from "../theme-toggle";

type AdminSidebarProps = {
  active: "posts" | "categories" | "suggestions" | "about";
};

export default function AdminSidebar({ active }: AdminSidebarProps) {
  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-heading">
        <a className="admin-brand" href="/admin">
          <img className="admin-logo" src="/frog-logo.png" alt="" aria-hidden="true" />
          <strong>Ăn đâu<br />hôm nay?</strong>
        </a>
        <ThemeToggle className="theme-toggle-sidebar" />
      </div>
      <nav aria-label="Điều hướng quản trị">
        <a className={active === "posts" ? "active" : undefined} aria-current={active === "posts" ? "page" : undefined} href="/admin">Bài viết</a>
        <a className={active === "categories" ? "active" : undefined} aria-current={active === "categories" ? "page" : undefined} href="/admin/categories">Loại món</a>
        <a className={active === "suggestions" ? "active" : undefined} aria-current={active === "suggestions" ? "page" : undefined} href="/admin/suggestions">Góp ý quán</a>
        <a className={active === "about" ? "active" : undefined} aria-current={active === "about" ? "page" : undefined} href="/admin/about">Về blog</a>
        <a href="/">Xem trang chủ ↗</a>
      </nav>
      <small>Chỉ dành cho tác giả</small>
    </aside>
  );
}
