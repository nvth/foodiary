import { env } from "cloudflare:workers";

export type ReviewInput = {
  name: string;
  area: string;
  address: string;
  cuisine: string;
  priceLabel: string;
  dish: string;
  rating: number;
  excerpt: string;
  content: string;
  visitedAt: string;
  isFavorite: boolean;
  isFeatured: boolean;
  dishes: Array<{ name: string; photoIndex: number }>;
  photoKeys: Array<{
    objectKey: string;
    altText: string;
    contentType: string;
    sizeBytes: number;
  }>;
};

export type PublishedSpot = {
  id: string;
  name: string;
  area: string;
  address: string;
  cuisine: string;
  dish: string;
  rating: number;
  price: string;
  excerpt: string;
  review: string;
  image: string;
  gallery: string[];
  galleryCaptions: string[];
  photos: Array<{
    objectKey: string;
    url: string;
    caption: string;
    contentType: string;
    sizeBytes: number;
  }>;
  date: string;
  favorite: boolean;
  featured: boolean;
  dishes: Array<{ id: string; name: string; photoIndex: number }>;
};

type Bindings = {
  DB?: D1Database;
  MEDIA?: R2Bucket;
  ADMIN_EMAILS?: string;
  DEV_ADMIN_BYPASS?: string;
};

let schemaReady: Promise<void> | null = null;

export function getBindings(): Bindings {
  return env as unknown as Bindings;
}

export function getD1(): D1Database {
  const database = getBindings().DB;
  if (!database) throw new Error("D1 binding DB is unavailable");
  return database;
}

export function getR2(): R2Bucket {
  const bucket = getBindings().MEDIA;
  if (!bucket) throw new Error("R2 binding MEDIA is unavailable");
  return bucket;
}

export function hasCloudflareStorage(): boolean {
  const bindings = getBindings();
  return Boolean(bindings.DB && bindings.MEDIA);
}

export async function ensureDatabase(): Promise<void> {
  if (schemaReady) return schemaReady;

  const db = getD1();
  schemaReady = db
    .batch([
      db.prepare("PRAGMA foreign_keys = ON"),
      db.prepare(`CREATE TABLE IF NOT EXISTS restaurants (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        area TEXT NOT NULL,
        address TEXT NOT NULL,
        cuisine TEXT NOT NULL,
        price_label TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY NOT NULL,
        restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        dish TEXT NOT NULL,
        rating REAL NOT NULL CHECK (rating >= 1 AND rating <= 5),
        excerpt TEXT NOT NULL,
        content TEXT NOT NULL,
        visited_at TEXT NOT NULL,
        is_favorite INTEGER NOT NULL DEFAULT 0,
        is_featured INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS photos (
        id TEXT PRIMARY KEY NOT NULL,
        review_id TEXT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
        object_key TEXT NOT NULL UNIQUE,
        alt_text TEXT NOT NULL DEFAULT '',
        content_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS review_dishes (
        id TEXT PRIMARY KEY NOT NULL,
        review_id TEXT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        photo_sort_order INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`),
      db.prepare("CREATE INDEX IF NOT EXISTS restaurants_area_idx ON restaurants(area)"),
      db.prepare("CREATE INDEX IF NOT EXISTS restaurants_cuisine_idx ON restaurants(cuisine)"),
      db.prepare("CREATE INDEX IF NOT EXISTS reviews_restaurant_idx ON reviews(restaurant_id)"),
      db.prepare("CREATE INDEX IF NOT EXISTS reviews_status_visited_idx ON reviews(status, visited_at)"),
      db.prepare("CREATE INDEX IF NOT EXISTS photos_review_sort_idx ON photos(review_id, sort_order)"),
      db.prepare("CREATE INDEX IF NOT EXISTS review_dishes_review_sort_idx ON review_dishes(review_id, sort_order)"),
    ])
    .then(() => undefined)
    .catch((error) => {
      schemaReady = null;
      throw error;
    });

  return schemaReady;
}

type ReviewRow = {
  id: string;
  name: string;
  area: string;
  address: string;
  cuisine: string;
  price_label: string;
  dish: string;
  rating: number;
  excerpt: string;
  content: string;
  visited_at: string;
  is_favorite: number;
  is_featured: number;
};

type PhotoRow = {
  review_id: string;
  object_key: string;
  alt_text: string;
  content_type: string;
  size_bytes: number;
};

type DishRow = {
  id: string;
  review_id: string;
  name: string;
  photo_sort_order: number;
};

export async function listPublishedSpots(): Promise<PublishedSpot[]> {
  await ensureDatabase();
  const db = getD1();
  const [reviewsResult, photosResult, dishesResult] = await Promise.all([
    db.prepare(`SELECT
      reviews.id,
      restaurants.name,
      restaurants.area,
      restaurants.address,
      restaurants.cuisine,
      restaurants.price_label,
      reviews.dish,
      reviews.rating,
      reviews.excerpt,
      reviews.content,
      reviews.visited_at,
      reviews.is_favorite,
      reviews.is_featured
    FROM reviews
    INNER JOIN restaurants ON restaurants.id = reviews.restaurant_id
    WHERE reviews.status = 'published'
    ORDER BY reviews.is_featured DESC, reviews.visited_at DESC, reviews.created_at DESC`).all<ReviewRow>(),
    db.prepare("SELECT review_id, object_key, alt_text, content_type, size_bytes FROM photos ORDER BY review_id, sort_order, created_at").all<PhotoRow>(),
    db.prepare("SELECT id, review_id, name, photo_sort_order FROM review_dishes ORDER BY review_id, sort_order, created_at").all<DishRow>(),
  ]);

  const photosByReview = new Map<string, PublishedSpot["photos"]>();
  for (const photo of photosResult.results) {
    const list = photosByReview.get(photo.review_id) ?? [];
    list.push({
      objectKey: photo.object_key,
      url: `/api/media?key=${encodeURIComponent(photo.object_key)}`,
      caption: photo.alt_text,
      contentType: photo.content_type,
      sizeBytes: photo.size_bytes,
    });
    photosByReview.set(photo.review_id, list);
  }
  const dishesByReview = new Map<string, PublishedSpot["dishes"]>();
  for (const dish of dishesResult.results) {
    const list = dishesByReview.get(dish.review_id) ?? [];
    list.push({ id: dish.id, name: dish.name, photoIndex: dish.photo_sort_order });
    dishesByReview.set(dish.review_id, list);
  }

  return reviewsResult.results.map((row) => {
    const photos = photosByReview.get(row.id) ?? [];
    const gallery = photos.map((photo) => photo.url);
    return {
      id: row.id,
      name: row.name,
      area: row.area,
      address: row.address,
      cuisine: row.cuisine,
      dish: row.dish,
      rating: row.rating,
      price: row.price_label,
      excerpt: row.excerpt,
      review: row.content,
      image: gallery[0] ?? "/globe.svg",
      gallery,
      galleryCaptions: photos.map((photo) => photo.caption),
      photos,
      date: row.visited_at,
      favorite: Boolean(row.is_favorite),
      featured: Boolean(row.is_featured),
      dishes: dishesByReview.get(row.id) ?? [{ id: `${row.id}-primary`, name: row.dish, photoIndex: 0 }],
    };
  });
}

export async function createReview(input: ReviewInput): Promise<string> {
  await ensureDatabase();
  const db = getD1();
  const restaurantId = crypto.randomUUID();
  const reviewId = crypto.randomUUID();
  const slugBase = slugify(input.name) || "quan-an";
  const slug = `${slugBase}-${restaurantId.slice(0, 8)}`;

  const statements = [
    db.prepare(`INSERT INTO restaurants
      (id, name, slug, area, address, cuisine, price_label)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .bind(restaurantId, input.name, slug, input.area, input.address, input.cuisine, input.priceLabel),
    db.prepare(`INSERT INTO reviews
      (id, restaurant_id, dish, rating, excerpt, content, visited_at, is_favorite, is_featured, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')`)
      .bind(
        reviewId,
        restaurantId,
        input.dish,
        input.rating,
        input.excerpt,
        input.content,
        input.visitedAt,
        input.isFavorite ? 1 : 0,
        input.isFeatured ? 1 : 0,
      ),
    ...input.photoKeys.map((photo, index) =>
      db.prepare(`INSERT INTO photos
        (id, review_id, object_key, alt_text, content_type, size_bytes, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .bind(
          crypto.randomUUID(),
          reviewId,
          photo.objectKey,
          photo.altText,
          photo.contentType,
          photo.sizeBytes,
          index,
        ),
    ),
    ...input.dishes.map((dish, index) =>
      db.prepare(`INSERT INTO review_dishes
        (id, review_id, name, photo_sort_order, sort_order)
        VALUES (?, ?, ?, ?, ?)`)
        .bind(crypto.randomUUID(), reviewId, dish.name, dish.photoIndex, index),
    ),
  ];

  await db.batch(statements);
  return reviewId;
}

export async function deleteReview(reviewId: string): Promise<string[]> {
  await ensureDatabase();
  const db = getD1();
  const review = await db
    .prepare("SELECT restaurant_id FROM reviews WHERE id = ?")
    .bind(reviewId)
    .first<{ restaurant_id: string }>();
  if (!review) return [];

  const photoRows = await db
    .prepare("SELECT object_key FROM photos WHERE review_id = ?")
    .bind(reviewId)
    .all<{ object_key: string }>();

  await db.batch([
    db.prepare("DELETE FROM reviews WHERE id = ?").bind(reviewId),
    db.prepare("DELETE FROM restaurants WHERE id = ?").bind(review.restaurant_id),
  ]);
  return photoRows.results.map((photo) => photo.object_key);
}

export async function updateReview(reviewId: string, input: ReviewInput): Promise<string[]> {
  await ensureDatabase();
  const db = getD1();
  const review = await db
    .prepare("SELECT restaurant_id FROM reviews WHERE id = ?")
    .bind(reviewId)
    .first<{ restaurant_id: string }>();
  if (!review) {
    const error = new Error("Không tìm thấy bài review cần chỉnh sửa.");
    Object.assign(error, { status: 404 });
    throw error;
  }

  const oldPhotos = await db
    .prepare("SELECT object_key FROM photos WHERE review_id = ?")
    .bind(reviewId)
    .all<{ object_key: string }>();
  const retainedKeys = new Set(input.photoKeys.map((photo) => photo.objectKey));
  const removedKeys = oldPhotos.results
    .map((photo) => photo.object_key)
    .filter((objectKey) => !retainedKeys.has(objectKey));

  await db.batch([
    db.prepare(`UPDATE restaurants SET
      name = ?, slug = ?, area = ?, address = ?, cuisine = ?, price_label = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`)
      .bind(
        input.name,
        `${slugify(input.name) || "quan-an"}-${review.restaurant_id.slice(0, 8)}`,
        input.area,
        input.address,
        input.cuisine,
        input.priceLabel,
        review.restaurant_id,
      ),
    db.prepare(`UPDATE reviews SET
      dish = ?, rating = ?, excerpt = ?, content = ?, visited_at = ?,
      is_favorite = ?, is_featured = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`)
      .bind(
        input.dish,
        input.rating,
        input.excerpt,
        input.content,
        input.visitedAt,
        input.isFavorite ? 1 : 0,
        input.isFeatured ? 1 : 0,
        reviewId,
      ),
    db.prepare("DELETE FROM photos WHERE review_id = ?").bind(reviewId),
    db.prepare("DELETE FROM review_dishes WHERE review_id = ?").bind(reviewId),
    ...input.photoKeys.map((photo, index) =>
      db.prepare(`INSERT INTO photos
        (id, review_id, object_key, alt_text, content_type, size_bytes, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .bind(
          crypto.randomUUID(),
          reviewId,
          photo.objectKey,
          photo.altText,
          photo.contentType,
          photo.sizeBytes,
          index,
        ),
    ),
    ...input.dishes.map((dish, index) =>
      db.prepare(`INSERT INTO review_dishes
        (id, review_id, name, photo_sort_order, sort_order)
        VALUES (?, ?, ?, ?, ?)`)
        .bind(crypto.randomUUID(), reviewId, dish.name, dish.photoIndex, index),
    ),
  ]);

  return removedKeys;
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
