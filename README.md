# Ăn đâu hôm nay?

Blog ẩm thực cá nhân chạy trên Vinext và Cloudflare Workers. Nội dung review được lưu trong D1, ảnh được lưu trong R2, còn giao diện public được tối ưu cho đọc và khám phá quán ăn.

## Kiến trúc

- `app/`: giao diện public và các API route.
- `db/schema.ts`: schema D1 bằng Drizzle.
- `drizzle/`: migration SQL được commit cùng source.
- `app/api/reviews`: dữ liệu review và hashtag công khai.
- `app/api/suggestions`: nhận góp ý quán mới từ độc giả.
- `app/api/admin/*`: upload ảnh và thao tác ghi có kiểm tra email tác giả.
- `/admin`: giao diện quản lý bài viết, loại món, góp ý và phần giới thiệu dành riêng cho tác giả.
- `app/api/media`: đọc ảnh từ R2 với cache dài hạn.
- `wrangler.jsonc`: cấu hình deploy trực tiếp Worker, static assets, D1, R2 và Cloudflare Images.
- `.openai/hosting.json`: metadata tương thích với bản preview Cloudflare Sites.

## Chạy local

Yêu cầu Node.js `>=22.13.0`.

```bash
npm install
cp .dev.vars.example .dev.vars
npm run dev
```

`DEV_ADMIN_BYPASS=true` chỉ nằm trong `.dev.vars` local để mở khu vực quản trị khi phát triển; không đưa biến này lên production. Dữ liệu thật luôn dùng platform storage, không dùng localStorage làm nguồn chính.

## Kiểm tra trước khi deploy

```bash
npm run check
```

Lệnh này chạy typecheck, lint, production build và các bài kiểm tra tự động.

Sau khi thay đổi schema:

```bash
npm run db:generate
```

Luôn kiểm tra migration mới trong `drizzle/` trước khi deploy.

## Cấu hình Cloudflare

`wrangler.jsonc` cấu hình Worker `foodiary`, bật URL `workers.dev`, dùng compatibility date `2026-05-15` và khai báo bốn bindings:

- `DB`: D1 database `an-dau-hom-nay-db` (`2c7233ff-8df0-4f51-a0a3-00f59be95187`), migration nằm trong `drizzle/`.
- `MEDIA`: R2 bucket `an-dau-hom-nay-media` (storage class Standard, location APAC).
- `ASSETS`: static assets được build vào `dist/client`.
- `IMAGES`: Cloudflare Images binding dùng để tối ưu ảnh.

Storage class và location là thuộc tính của bucket R2 đã được tạo, không phải thuộc tính của binding trong Wrangler. Có thể kiểm tra tài nguyên trước khi deploy:

```bash
npx wrangler d1 info an-dau-hom-nay-db
npx wrangler r2 bucket info an-dau-hom-nay-media
```

Thiết lập biến môi trường production:

```text
TEAM_DOMAIN=myteam.cloudflareaccess.com
POLICY_AUD=access-application-audience-tag
ADMIN_EMAILS=email-cua-ban@example.com
SUGGESTION_RATE_LIMIT_SECRET=chuoi-bi-mat-dai-ngau-nhien
```

`TEAM_DOMAIN` là hostname (hoặc HTTPS origin) của Cloudflare Access team và `POLICY_AUD` chứa một hoặc nhiều Audience tag của Access Application, phân tách bằng dấu phẩy. Có thể liệt kê nhiều email trong `ADMIN_EMAILS` theo cùng cách. Không đặt `DEV_ADMIN_BYPASS=true` trong production.

## Bảo vệ khu vực viết bài

Trang chủ chỉ cho phép độc giả đọc nội dung review. Ngoại lệ duy nhất là `POST /api/suggestions`, dùng để gửi username tùy chọn và nội dung góp ý đã được giới hạn/kiểm tra phía server; độc giả không thể đọc lại danh sách tin. Các endpoint dưới `/api/admin/*` xác minh JWT trong header `Cf-Access-Jwt-Assertion` bằng JWKS của `TEAM_DOMAIN`, kiểm tra audience khớp `POLICY_AUD`, rồi mới so email trong token với `ADMIN_EMAILS`. Header email thuần không được dùng làm bằng chứng xác thực.

Khi deploy Cloudflare thông thường, tạo Access Application bảo vệ các path:

```text
/admin*
/api/admin/*
```

Allow policy chỉ nên chứa email của tác giả và phải trùng `ADMIN_EMAILS`. Việc ẩn nút ở frontend không phải là lớp bảo mật; API luôn kiểm tra quyền ở server.

## Quy tắc ảnh

- Mỗi review cần 1–5 ảnh.
- Định dạng: JPG, PNG, WebP hoặc AVIF.
- Tối đa 8 MB mỗi ảnh.
- R2 object key dùng UUID và được phục vụ với cache immutable.
- D1 chỉ lưu metadata và thứ tự ảnh, không lưu binary/base64.

## Deploy

Đăng nhập đúng Cloudflare account (hoặc đặt `CLOUDFLARE_ACCOUNT_ID` trong môi trường nếu tài khoản có nhiều account):

```bash
npx wrangler login
npx wrangler whoami
```

Thiết lập secrets production; mỗi lệnh sẽ yêu cầu nhập giá trị và không ghi secret vào Git:

```bash
npx wrangler secret put TEAM_DOMAIN
npx wrangler secret put POLICY_AUD
npx wrangler secret put ADMIN_EMAILS
npx wrangler secret put SUGGESTION_RATE_LIMIT_SECRET
```

Build và kiểm tra gói Worker mà không upload:

```bash
npm run build
npx wrangler deploy --dry-run
```

Áp dụng migration D1 từ `drizzle/`, sau đó build và deploy trực tiếp lên Cloudflare Workers:

```bash
npx wrangler d1 migrations apply DB --remote
npx vinext deploy
```

Để áp dụng migration vào D1 local khi phát triển, dùng `npx wrangler d1 migrations apply DB --local`. Sau khi deploy, kiểm tra URL `foodiary.nvth.workers.dev` và Access policy cho `/admin*` cùng `/api/admin/*`.
