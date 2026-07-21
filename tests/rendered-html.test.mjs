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
  assert.match(page, /Về blog/i);
  assert.doesNotMatch(page, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("declares Cloudflare-native persistence and protected mutations", async () => {
  const [hosting, schema, adminRoute, categoryRoute, publicCategoryRoute, adminAboutRoute, publicAboutRoute, adminSidebar, mediaRoute, adminPage, adminAuth, publicPage, envExample] = await Promise.all([
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/reviews/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/categories/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/categories/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/about/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/about/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/admin-sidebar.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/media/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/admin-page-auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../.env.example", import.meta.url), "utf8"),
  ]);

  const hostingConfig = JSON.parse(hosting);
  assert.equal(hostingConfig.d1, "DB");
  assert.equal(hostingConfig.r2, "MEDIA");
  assert.match(hostingConfig.project_id, /^appgprj_/);
  assert.match(schema, /sqliteTable\(\s*"restaurants"/);
  assert.match(schema, /sqliteTable\(\s*"reviews"/);
  assert.match(schema, /sqliteTable\(\s*"photos"/);
  assert.match(schema, /sqliteTable\(\s*"cuisine_categories"/);
  assert.match(schema, /sqliteTable\(\s*"blog_settings"/);
  assert.match(adminRoute, /requireAdmin\(request\)/);
  assert.match(categoryRoute, /requireAdmin\(request\)/);
  assert.match(publicCategoryRoute, /listCategories/);
  assert.match(adminAboutRoute, /requireAdmin\(request\)/);
  assert.match(publicAboutRoute, /getBlogAbout/);
  assert.match(adminSidebar, /\/admin\/about/);
  assert.match(mediaRoute, /MAX_IMAGE_BYTES/);
  assert.match(adminPage, /<AdminDashboard/);
  assert.match(adminAuth, /getAdminState\(request\)/);
  assert.match(adminAuth, /redirect\("\/"\)/);
  assert.match(publicPage, /return <FoodBlog \/>/);
  assert.match(envExample, /ADMIN_EMAILS=/);
});
