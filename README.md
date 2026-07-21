# Ăn đâu hôm nay?

Blog ẩm thực cá nhân chạy trên Vinext và Cloudflare Workers. Nội dung review được lưu trong D1, ảnh được lưu trong R2, còn giao diện public được tối ưu cho đọc và khám phá quán ăn.

## Kiến trúc

- `app/`: giao diện public và các API route.
- `db/schema.ts`: schema D1 bằng Drizzle.
- `drizzle/`: migration SQL được commit cùng source.
- `app/api/reviews`: dữ liệu review công khai.
- `app/api/admin/*`: upload ảnh và thao tác ghi có kiểm tra email tác giả.
- `/admin`: giao diện thêm, sửa, xóa dành riêng cho tác giả; trang chủ luôn chỉ đọc.
- `app/api/media`: đọc ảnh từ R2 với cache dài hạn.
- `.openai/hosting.json`: khai báo logical bindings `DB` và `MEDIA` cho Cloudflare Sites.

## Chạy local

Yêu cầu Node.js `>=22.13.0`.

```bash
npm install
npm run dev
```

Trang local tự nhận quyền tác giả để tiện phát triển. Nếu D1/R2 local chưa sẵn sàng, trang public vẫn hiển thị bộ dữ liệu minh họa; dữ liệu thật luôn dùng platform storage, không dùng localStorage làm nguồn chính.

## Kiểm tra trước khi deploy

```bash
npm run check
```

Lệnh này chạy typecheck, lint, production build và các bài kiểm tra cấu hình Cloudflare.

Sau khi thay đổi schema:

```bash
npm run db:generate
```

Luôn kiểm tra migration mới trong `drizzle/` trước khi deploy.

## Cấu hình Cloudflare

Ứng dụng yêu cầu hai bindings:

- D1 binding: `DB`
- R2 binding: `MEDIA`

Các tên logic đã được khai báo trong `.openai/hosting.json`. Khi triển khai bằng Cloudflare Sites, nền tảng tạo/gắn tài nguyên thật và áp dụng migration đi kèm.

Thiết lập biến môi trường production:

```text
ADMIN_EMAILS=email-cua-ban@example.com
```

Có thể liệt kê nhiều email, phân tách bằng dấu phẩy. Không đặt `DEV_ADMIN_BYPASS=true` trong production.

## Bảo vệ khu vực viết bài

Public API chỉ cho phép đọc. Các endpoint dưới `/api/admin/*` kiểm tra email phía server từ một trong hai header:

- `Cf-Access-Authenticated-User-Email` khi dùng Cloudflare Access.
- `oai-authenticated-user-email` khi chạy qua Sites có xác thực workspace.

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

Khi sẵn sàng, tạo site trên Cloudflare Sites từ source này, cấu hình `ADMIN_EMAILS`, kiểm tra Access policy, sau đó lưu và deploy một version. Không cần đổi framework hoặc thay lớp database khi chuyển từ local lên Cloudflare.
