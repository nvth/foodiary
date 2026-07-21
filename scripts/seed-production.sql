PRAGMA foreign_keys = ON;

UPDATE `blog_settings`
SET
  `about_title` = 'Mỗi tuần một câu chuyện ngon.',
  `about_body` = 'Một email nhỏ về quán mới, món ngon và những góc phố mình vừa đi qua.',
  `updated_at` = '2026-07-21 19:39:15'
WHERE `id` = 'main';

INSERT OR IGNORE INTO `cuisine_categories`
  (`id`, `name`, `name_key`, `created_at`, `updated_at`)
VALUES
  ('0ae741a6-9844-4b70-8776-bff20138a65d', 'Bình Dân', 'bình dân', '2026-07-21 19:13:28', '2026-07-21 21:01:23');

INSERT OR IGNORE INTO `restaurants`
  (`id`, `name`, `slug`, `area`, `address`, `cuisine`, `price_label`, `created_at`, `updated_at`, `category_id`)
VALUES
  (
    '24e07644-ad75-4b17-bd50-36ab50554f43',
    'bún riêu cô lúa',
    'bun-rieu-co-lua-24e07644',
    'Ng. 28 P. Hương Viên',
    '2V64+M26, Ng. 28 P. Hương Viên, Hai Bà Trưng, Hà Nội, Vietnam',
    'Bình Dân',
    '50k',
    '2026-07-21 15:37:30',
    '2026-07-21 21:01:23',
    '0ae741a6-9844-4b70-8776-bff20138a65d'
  ),
  (
    '7ae02965-481c-4efd-8df3-e68d1fa52813',
    'Bếp Nhà',
    'bep-nha-7ae02965',
    'Hà Nội',
    '12 phố Hàng Bún, phường Ba Đình, Hà Nội',
    'Bình Dân',
    '120k',
    '2026-07-21 18:14:48',
    '2026-07-21 21:10:11',
    '0ae741a6-9844-4b70-8776-bff20138a65d'
  );

INSERT OR IGNORE INTO `reviews`
  (`id`, `restaurant_id`, `dish`, `rating`, `excerpt`, `content`, `hashtags`, `is_favorite`, `is_featured`, `status`, `created_at`, `updated_at`)
VALUES
  (
    '65172a30-bbae-46de-bb8d-024b1b27293f',
    '24e07644-ad75-4b17-bd50-36ab50554f43',
    'Bún riêu giò trứng',
    4.0,
    'beautiful',
    'quá tuyệt vời',
    '[]',
    1,
    1,
    'published',
    '2026-07-21 15:37:30',
    '2026-07-21 19:33:45'
  ),
  (
    '884f7a22-913a-427a-a19b-80aaf7252819',
    '7ae02965-481c-4efd-8df3-e68d1fa52813',
    'Bún riêu cua',
    5.0,
    'Một tô bún riêu đậm vị Bắc, riêu cua thơm và nước dùng thanh vừa đủ.',
    'Bếp Nhà mang cảm giác như một bữa cơm gia đình giữa lòng Hà Nội. Bún riêu có nước dùng trong, vị chua nhẹ từ cà chua, riêu cua mềm và thơm. Không gian ấm cúng, phục vụ gần gũi; phù hợp cho một bữa trưa chậm rãi cùng bạn bè.',
    '["bun"]',
    1,
    1,
    'published',
    '2026-07-21 18:14:48',
    '2026-07-21 21:10:11'
  );

INSERT OR IGNORE INTO `photos`
  (`id`, `review_id`, `object_key`, `alt_text`, `content_type`, `size_bytes`, `sort_order`, `created_at`)
VALUES
  (
    'bc23ac0f-1f62-4371-835c-78334910c729',
    '65172a30-bbae-46de-bb8d-024b1b27293f',
    'reviews/2026/07/4affe1a8-7986-4fd4-b0e9-f36bb6bb787e.png',
    'Bún riêu giò trứng tại bún riêu cô lúa',
    'image/png',
    1632805,
    0,
    '2026-07-21 19:33:45'
  ),
  (
    '33a45973-3620-4ca3-9ed3-303339196367',
    '65172a30-bbae-46de-bb8d-024b1b27293f',
    'reviews/2026/07/c9e31100-c1ff-495b-a557-683ef96a1271.png',
    'bún riêu 2',
    'image/png',
    66586,
    1,
    '2026-07-21 19:33:45'
  ),
  (
    '7080dc54-152b-49ae-a7ca-85b3f301019e',
    '884f7a22-913a-427a-a19b-80aaf7252819',
    'reviews/2026/07/0dba61c4-ea69-4975-82db-8af19f5cc7e4.png',
    'Bún riêu cua đậm vị Bắc',
    'image/png',
    2645463,
    0,
    '2026-07-21 21:10:11'
  ),
  (
    '6e2b2d6c-4be5-484c-94b2-f430fecd9f1b',
    '884f7a22-913a-427a-a19b-80aaf7252819',
    'reviews/2026/07/8c2089cb-b6e4-454a-814c-784adbe6e6cd.png',
    'Nem cua bể giòn vàng',
    'image/png',
    2278047,
    1,
    '2026-07-21 21:10:11'
  );

INSERT OR IGNORE INTO `review_dishes`
  (`id`, `review_id`, `name`, `photo_sort_order`, `sort_order`, `created_at`)
VALUES
  (
    '25fa9b8d-de3f-4d6b-87dc-da45d9db6fee',
    '65172a30-bbae-46de-bb8d-024b1b27293f',
    'Bún riêu giò trứng',
    0,
    0,
    '2026-07-21 19:33:45'
  ),
  (
    '67c5414f-f89d-42c2-b807-57a5bb83a2e5',
    '65172a30-bbae-46de-bb8d-024b1b27293f',
    'bún riêu',
    1,
    1,
    '2026-07-21 19:33:45'
  ),
  (
    'ce259188-c0ea-4603-be41-ecd0380f5267',
    '884f7a22-913a-427a-a19b-80aaf7252819',
    'Bún riêu cua',
    0,
    0,
    '2026-07-21 21:10:11'
  ),
  (
    '7794aad5-8e1e-4aed-afce-e6a911233f0c',
    '884f7a22-913a-427a-a19b-80aaf7252819',
    'Nem cua bể',
    1,
    1,
    '2026-07-21 21:10:11'
  );
