import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ships the Vietnamese food journal experience", async () => {
  const [page, layout] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /Ăn đâu hôm nay\? — Nhật ký vị giác/i);
  assert.match(page, /Đi ăn/);
  assert.match(page, /Những nơi mình đã ăn/);
  assert.match(page, /\/api\/reviews/);
  assert.match(page, /\/api\/categories/);
  assert.match(page, /\/api\/about/);
  assert.match(page, /\/api\/suggestions/);
  assert.match(page, /Góp ý quán mới/i);
  assert.match(page, /name="hashtags"/);
  assert.match(page, /#hashtag/i);
  assert.match(page, /normalizeSearchText/);
  assert.match(page, /searchHashtag/);
  assert.match(page, /Tìm bài có hashtag/);
  assert.match(page, /PostTimestamp/);
  assert.doesNotMatch(page, /Ngày ghé quán|name="visitedAt"/i);
  assert.match(page, /Về blog/i);
  assert.doesNotMatch(page, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("provides a persistent system-aware night mode across public and admin views", async () => {
  const [layout, toggle, page, sidebar, styles, suggestionStyles] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/theme-toggle.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/admin-sidebar.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/suggestions/suggestions.module.css", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /suppressHydrationWarning/);
  assert.match(layout, /foodblog-theme/);
  assert.match(layout, /prefers-color-scheme:\s*dark/);
  assert.match(layout, /document\.documentElement\.dataset\.theme/);
  assert.match(toggle, /localStorage\.setItem\(STORAGE_KEY/);
  assert.match(toggle, /addEventListener\("storage"/);
  assert.match(toggle, /aria-pressed/);
  assert.match(toggle, /Chuyển sang giao diện (sáng|tối)/);
  assert.match(page, /<ThemeToggle/);
  assert.match(page, /editor-theme-toggle/);
  assert.match(sidebar, /theme-toggle-sidebar/);
  assert.match(styles, /:root\[data-theme="dark"\]/);
  assert.match(styles, /color-scheme:\s*dark/);
  assert.match(styles, /--surface-control:/);
  assert.match(suggestionStyles, /:global\(html\[data-theme="dark"\]\)/);
});

test("declares Cloudflare-native persistence and protected mutations", async () => {
  const [hosting, schema, visitDateMigration, suggestionRateMigration, suggestionAbuse, adminRoute, categoryRoute, publicCategoryRoute, adminAboutRoute, publicAboutRoute, publicSuggestionRoute, adminSuggestionRoute, adminSuggestionPage, adminSidebar, mediaRoute, adminPage, adminAuth, publicPage, envExample] = await Promise.all([
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0005_light_rocket_racer.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0006_handy_ares.sql", import.meta.url), "utf8"),
    readFile(new URL("../lib/suggestion-abuse.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/reviews/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/categories/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/categories/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/about/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/about/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/suggestions/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/suggestions/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/suggestions/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/admin-sidebar.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/media/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/admin-page-auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../.env.example", import.meta.url), "utf8"),
  ]);

  const hostingConfig = JSON.parse(hosting);
  const [database, adminDashboard] = await Promise.all([
    readFile(new URL("../db/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/admin-dashboard.tsx", import.meta.url), "utf8"),
  ]);
  assert.equal(hostingConfig.d1, "DB");
  assert.equal(hostingConfig.r2, "MEDIA");
  assert.match(hostingConfig.project_id, /^appgprj_/);
  assert.match(schema, /sqliteTable\(\s*"restaurants"/);
  assert.match(schema, /sqliteTable\(\s*"reviews"/);
  assert.match(schema, /sqliteTable\(\s*"photos"/);
  assert.match(schema, /sqliteTable\(\s*"cuisine_categories"/);
  assert.match(schema, /sqliteTable\(\s*"blog_settings"/);
  assert.match(schema, /sqliteTable\(\s*"suggestions"/);
  assert.match(schema, /sqliteTable\(\s*"suggestion_rate_limits"/);
  assert.match(schema, /hashtags: text\("hashtags"/);
  assert.doesNotMatch(schema, /visitedAt|visited_at/);
  assert.match(visitDateMigration, /DROP INDEX IF EXISTS `reviews_status_visited_idx`/);
  assert.match(visitDateMigration, /ALTER TABLE `reviews` DROP COLUMN `visited_at`/);
  assert.match(suggestionRateMigration, /CREATE TABLE IF NOT EXISTS `suggestion_rate_limits`/);
  assert.match(suggestionAbuse, /HMAC/);
  assert.match(suggestionAbuse, /cf-connecting-ip/);
  assert.match(adminRoute, /requireAdmin\(request\)/);
  assert.match(categoryRoute, /requireAdmin\(request\)/);
  assert.match(publicCategoryRoute, /listCategories/);
  assert.match(adminAboutRoute, /requireAdmin\(request\)/);
  assert.match(publicAboutRoute, /getBlogAbout/);
  assert.match(publicSuggestionRoute, /export async function POST/);
  assert.match(publicSuggestionRoute, /buildSuggestionAbuseContext/);
  assert.match(publicSuggestionRoute, /MAX_REQUEST_BYTES/);
  assert.match(publicSuggestionRoute, /Retry-After/);
  assert.match(adminSuggestionRoute, /requireAdmin\(request\)/);
  assert.match(adminSuggestionPage, /requireAdminPage\("\/admin\/suggestions"\)/);
  assert.match(adminSidebar, /\/admin\/suggestions/);
  assert.match(adminSidebar, /\/admin\/about/);
  assert.doesNotMatch(adminSidebar, /href="\/admin\/editor"/);
  assert.match(mediaRoute, /MAX_IMAGE_BYTES/);
  assert.match(adminPage, /<AdminDashboard/);
  assert.match(database, /reviews\.created_at/);
  assert.match(database, /postedAt: row\.created_at/);
  assert.doesNotMatch(database, /INSERT INTO reviews[\s\S]{0,300}visited_at/);
  assert.match(database, /reviews_status_created_idx/);
  assert.match(database, /ON CONFLICT\(fingerprint\) DO UPDATE/);
  assert.match(database, /SUGGESTION_RATE_LIMIT_MAX/);
  assert.match(database, /ORDER BY reviews\.is_featured DESC, reviews\.created_at DESC/);
  assert.match(adminDashboard, /Ngày giờ đăng/);
  assert.match(adminAuth, /getAdminState\(request\)/);
  assert.match(adminAuth, /redirect\("\/"\)/);
  assert.match(publicPage, /return <FoodBlog \/>/);
  assert.match(envExample, /ADMIN_EMAILS=/);
  assert.match(envExample, /SUGGESTION_RATE_LIMIT_SECRET=/);
});
