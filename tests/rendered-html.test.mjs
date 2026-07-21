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
  assert.doesNotMatch(page, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("declares Cloudflare-native persistence and protected mutations", async () => {
  const [hosting, schema, adminRoute, mediaRoute, adminPage, adminAuth, publicPage, envExample] = await Promise.all([
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/reviews/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/media/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/admin-page-auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../.env.example", import.meta.url), "utf8"),
  ]);

  assert.deepEqual(JSON.parse(hosting), { d1: "DB", r2: "MEDIA" });
  assert.match(schema, /sqliteTable\(\s*"restaurants"/);
  assert.match(schema, /sqliteTable\(\s*"reviews"/);
  assert.match(schema, /sqliteTable\(\s*"photos"/);
  assert.match(adminRoute, /requireAdmin\(request\)/);
  assert.match(mediaRoute, /MAX_IMAGE_BYTES/);
  assert.match(adminPage, /<AdminDashboard/);
  assert.match(adminAuth, /getAdminState\(request\)/);
  assert.match(adminAuth, /redirect\("\/"\)/);
  assert.match(publicPage, /return <FoodBlog \/>/);
  assert.match(envExample, /ADMIN_EMAILS=/);
});
