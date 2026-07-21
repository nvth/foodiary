import { env } from "cloudflare:workers";
import type { AboutInput } from "@/lib/about-validation";
import { normalizeCategoryKey, normalizeCategoryName, type CategoryInput } from "@/lib/category-validation";
import { parseStoredReviewHashtags } from "@/lib/hashtag-validation";
import type {
  SuggestionInput,
  SuggestionListOptions,
  SuggestionStatus,
} from "@/lib/suggestion-validation";

const BLOG_SETTINGS_ID = "main";

export type BlogAbout = AboutInput;

export const DEFAULT_BLOG_ABOUT: BlogAbout = Object.freeze({
  title: "Mỗi tuần một câu chuyện ngon.",
  body: "Một email nhỏ về quán mới, món ngon và những góc phố mình vừa đi qua.",
});

export type ReviewInput = {
  name: string;
  area: string;
  address: string;
  categoryId: string;
  priceLabel: string;
  dish: string;
  rating: number;
  excerpt: string;
  content: string;
  hashtags: string[];
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
  categoryId: string;
  cuisine: string;
  dish: string;
  rating: number;
  price: string;
  excerpt: string;
  review: string;
  hashtags: string[];
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
  postedAt: string;
  favorite: boolean;
  featured: boolean;
  dishes: Array<{ id: string; name: string; photoIndex: number }>;
};

export type CuisineCategory = {
  id: string;
  name: string;
  usageCount: number;
};

export type Suggestion = {
  id: string;
  username: string | null;
  message: string;
  status: SuggestionStatus;
  createdAt: string;
  updatedAt: string;
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

export function hasD1Database(): boolean {
  return Boolean(getBindings().DB);
}

export function hasCloudflareStorage(): boolean {
  const bindings = getBindings();
  return Boolean(bindings.DB && bindings.MEDIA);
}

export async function ensureDatabase(): Promise<void> {
  if (schemaReady) return schemaReady;

  const db = getD1();
  schemaReady = initializeDatabase(db)
    .catch((error) => {
      schemaReady = null;
      throw error;
    });

  return schemaReady;
}

async function initializeDatabase(db: D1Database): Promise<void> {
  await db.batch([
    db.prepare("PRAGMA foreign_keys = ON"),
    db.prepare(`CREATE TABLE IF NOT EXISTS blog_settings (
      id TEXT PRIMARY KEY NOT NULL,
      about_title TEXT NOT NULL,
      about_body TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`INSERT OR IGNORE INTO blog_settings (id, about_title, about_body)
      VALUES (?, ?, ?)`)
      .bind(BLOG_SETTINGS_ID, DEFAULT_BLOG_ABOUT.title, DEFAULT_BLOG_ABOUT.body),
    db.prepare(`CREATE TABLE IF NOT EXISTS cuisine_categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL UNIQUE,
      name_key TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS restaurants (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      area TEXT NOT NULL,
      address TEXT NOT NULL,
      cuisine TEXT NOT NULL,
      category_id TEXT REFERENCES cuisine_categories(id) ON DELETE RESTRICT,
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
      hashtags TEXT NOT NULL DEFAULT '[]',
      visited_at TEXT NOT NULL,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      is_featured INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS suggestions (
      id TEXT PRIMARY KEY NOT NULL,
      username TEXT,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read')),
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
    db.prepare("CREATE INDEX IF NOT EXISTS cuisine_categories_name_idx ON cuisine_categories(name)"),
    db.prepare("CREATE INDEX IF NOT EXISTS restaurants_area_idx ON restaurants(area)"),
    db.prepare("CREATE INDEX IF NOT EXISTS restaurants_cuisine_idx ON restaurants(cuisine)"),
    db.prepare("CREATE INDEX IF NOT EXISTS reviews_restaurant_idx ON reviews(restaurant_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS reviews_status_visited_idx ON reviews(status, visited_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS suggestions_created_idx ON suggestions(created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS suggestions_status_created_idx ON suggestions(status, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS photos_review_sort_idx ON photos(review_id, sort_order)"),
    db.prepare("CREATE INDEX IF NOT EXISTS review_dishes_review_sort_idx ON review_dishes(review_id, sort_order)"),
  ]);

  const [restaurantColumns, reviewColumns] = await Promise.all([
    db.prepare("PRAGMA table_info(restaurants)").all<{ name: string }>(),
    db.prepare("PRAGMA table_info(reviews)").all<{ name: string }>(),
  ]);
  if (!restaurantColumns.results.some((column) => column.name === "category_id")) {
    try {
      await db
        .prepare("ALTER TABLE restaurants ADD COLUMN category_id TEXT REFERENCES cuisine_categories(id) ON DELETE RESTRICT")
        .run();
    } catch (error) {
      if (!(error instanceof Error) || !/duplicate column/i.test(error.message)) throw error;
    }
  }
  if (!reviewColumns.results.some((column) => column.name === "hashtags")) {
    try {
      await db.prepare("ALTER TABLE reviews ADD COLUMN hashtags TEXT NOT NULL DEFAULT '[]'").run();
    } catch (error) {
      if (!(error instanceof Error) || !/duplicate column/i.test(error.message)) throw error;
    }
  }

  await backfillRestaurantCategories(db);
  await db.batch([
    db.prepare("CREATE INDEX IF NOT EXISTS restaurants_category_idx ON restaurants(category_id)"),
    db.prepare(`CREATE TRIGGER IF NOT EXISTS restaurants_category_required_insert
      BEFORE INSERT ON restaurants
      WHEN NEW.category_id IS NULL OR trim(NEW.category_id) = ''
      BEGIN SELECT RAISE(ABORT, 'restaurants.category_id is required'); END`),
    db.prepare(`CREATE TRIGGER IF NOT EXISTS restaurants_category_required_update
      BEFORE UPDATE ON restaurants
      WHEN NEW.category_id IS NULL OR trim(NEW.category_id) = ''
      BEGIN SELECT RAISE(ABORT, 'restaurants.category_id is required'); END`),
  ]);
}

type BlogSettingsRow = {
  about_title: string;
  about_body: string;
};

type SuggestionRow = {
  id: string;
  username: string | null;
  message: string;
  status: SuggestionStatus;
  created_at: string;
  updated_at: string;
};

export async function getBlogAbout(): Promise<BlogAbout> {
  await ensureDatabase();
  const row = await getD1()
    .prepare("SELECT about_title, about_body FROM blog_settings WHERE id = ?")
    .bind(BLOG_SETTINGS_ID)
    .first<BlogSettingsRow>();

  return row
    ? { title: row.about_title, body: row.about_body }
    : { ...DEFAULT_BLOG_ABOUT };
}

export async function updateBlogAbout(input: BlogAbout): Promise<BlogAbout> {
  await ensureDatabase();
  await getD1()
    .prepare(`INSERT INTO blog_settings (id, about_title, about_body, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        about_title = excluded.about_title,
        about_body = excluded.about_body,
        updated_at = CURRENT_TIMESTAMP`)
    .bind(BLOG_SETTINGS_ID, input.title, input.body)
    .run();

  return { title: input.title, body: input.body };
}

export async function createSuggestion(input: SuggestionInput): Promise<Suggestion> {
  await ensureDatabase();
  const db = getD1();
  const id = crypto.randomUUID();
  await db.prepare(`INSERT INTO suggestions (id, username, message, status)
    VALUES (?, ?, ?, 'unread')`)
    .bind(id, input.username, input.message)
    .run();

  const suggestion = await findSuggestionById(db, id);
  if (!suggestion) throw new Error("Unable to read the newly created suggestion");
  return suggestion;
}

export async function listSuggestions(options: SuggestionListOptions): Promise<Suggestion[]> {
  await ensureDatabase();
  const db = getD1();
  const result = options.status
    ? await db.prepare(`SELECT id, username, message, status, created_at, updated_at
        FROM suggestions
        WHERE status = ?
        ORDER BY created_at DESC, id DESC
        LIMIT ?`)
      .bind(options.status, options.limit)
      .all<SuggestionRow>()
    : await db.prepare(`SELECT id, username, message, status, created_at, updated_at
        FROM suggestions
        ORDER BY created_at DESC, id DESC
        LIMIT ?`)
      .bind(options.limit)
      .all<SuggestionRow>();

  return result.results.map(suggestionFromRow);
}

export async function updateSuggestionStatus(
  id: string,
  status: SuggestionStatus,
): Promise<Suggestion> {
  await ensureDatabase();
  const db = getD1();
  if (!(await findSuggestionById(db, id))) throw httpError("Không tìm thấy góp ý.", 404);

  await db.prepare(`UPDATE suggestions
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`)
    .bind(status, id)
    .run();

  const suggestion = await findSuggestionById(db, id);
  if (!suggestion) throw httpError("Không tìm thấy góp ý.", 404);
  return suggestion;
}

export async function deleteSuggestion(id: string): Promise<void> {
  await ensureDatabase();
  const db = getD1();
  if (!(await findSuggestionById(db, id))) throw httpError("Không tìm thấy góp ý.", 404);
  await db.prepare("DELETE FROM suggestions WHERE id = ?").bind(id).run();
}

async function findSuggestionById(db: D1Database, id: string): Promise<Suggestion | null> {
  const row = await db.prepare(`SELECT id, username, message, status, created_at, updated_at
    FROM suggestions
    WHERE id = ?`)
    .bind(id)
    .first<SuggestionRow>();
  return row ? suggestionFromRow(row) : null;
}

function suggestionFromRow(row: SuggestionRow): Suggestion {
  return {
    id: row.id,
    username: row.username,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type StoredCategoryRow = { id: string; name: string; name_key: string };
type RestaurantCategoryRow = { id: string; cuisine: string; category_id: string | null };

async function backfillRestaurantCategories(db: D1Database): Promise<void> {
  const [categoryResult, restaurantResult] = await Promise.all([
    db.prepare("SELECT id, name, name_key FROM cuisine_categories ORDER BY created_at, id").all<StoredCategoryRow>(),
    db.prepare("SELECT id, cuisine, category_id FROM restaurants ORDER BY created_at, id").all<RestaurantCategoryRow>(),
  ]);
  const existingByKey = new Map(
    categoryResult.results.map((category) => [normalizeCategoryKey(category.name), category]),
  );
  const namesToCreate = new Map<string, string>();

  for (const restaurant of restaurantResult.results) {
    if (restaurant.category_id) continue;
    const name = normalizeCategoryName(restaurant.cuisine) || "Chưa phân loại";
    const key = normalizeCategoryKey(name);
    if (!existingByKey.has(key)) namesToCreate.set(key, name);
  }

  if (namesToCreate.size) {
    await db.batch(
      [...namesToCreate].map(([nameKey, name]) =>
        db.prepare(`INSERT OR IGNORE INTO cuisine_categories (id, name, name_key)
          VALUES (?, ?, ?)`)
          .bind(crypto.randomUUID(), name, nameKey),
      ),
    );
  }

  const refreshedCategories = namesToCreate.size
    ? await db.prepare("SELECT id, name, name_key FROM cuisine_categories ORDER BY created_at, id").all<StoredCategoryRow>()
    : categoryResult;
  const categoryByKey = new Map(
    refreshedCategories.results.map((category) => [normalizeCategoryKey(category.name), category]),
  );
  const updates = restaurantResult.results
    .filter((restaurant) => !restaurant.category_id)
    .map((restaurant) => {
      const name = normalizeCategoryName(restaurant.cuisine) || "Chưa phân loại";
      const category = categoryByKey.get(normalizeCategoryKey(name));
      if (!category) throw new Error(`Không thể tạo loại món cho nhà hàng ${restaurant.id}.`);
      return db.prepare("UPDATE restaurants SET category_id = ?, cuisine = ? WHERE id = ? AND category_id IS NULL")
        .bind(category.id, category.name, restaurant.id);
    });
  if (updates.length) await db.batch(updates);

  await db.prepare(`UPDATE restaurants
    SET cuisine = (SELECT name FROM cuisine_categories WHERE cuisine_categories.id = restaurants.category_id)
    WHERE category_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM cuisine_categories WHERE cuisine_categories.id = restaurants.category_id)
      AND cuisine <> (SELECT name FROM cuisine_categories WHERE cuisine_categories.id = restaurants.category_id)`).run();
}

type ReviewRow = {
  id: string;
  name: string;
  area: string;
  address: string;
  category_id: string;
  cuisine: string;
  price_label: string;
  dish: string;
  rating: number;
  excerpt: string;
  content: string;
  hashtags: string;
  visited_at: string;
  created_at: string;
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

type CategoryUsageRow = StoredCategoryRow & { usage_count: number };

export async function listCategories(): Promise<CuisineCategory[]> {
  await ensureDatabase();
  const result = await getD1().prepare(`SELECT
    cuisine_categories.id,
    cuisine_categories.name,
    cuisine_categories.name_key,
    COUNT(restaurants.id) AS usage_count
  FROM cuisine_categories
  LEFT JOIN restaurants ON restaurants.category_id = cuisine_categories.id
  GROUP BY cuisine_categories.id, cuisine_categories.name, cuisine_categories.name_key
  ORDER BY cuisine_categories.name_key, cuisine_categories.id`).all<CategoryUsageRow>();

  return result.results.map(categoryFromRow);
}

export async function createCategory(input: CategoryInput): Promise<CuisineCategory> {
  await ensureDatabase();
  const db = getD1();
  await assertCategoryNameAvailable(db, input.nameKey);
  const id = crypto.randomUUID();
  try {
    await db.prepare("INSERT INTO cuisine_categories (id, name, name_key) VALUES (?, ?, ?)")
      .bind(id, input.name, input.nameKey)
      .run();
  } catch (error) {
    throwCategoryConflict(error);
  }
  return { id, name: input.name, usageCount: 0 };
}

export async function renameCategory(categoryId: string, input: CategoryInput): Promise<CuisineCategory> {
  await ensureDatabase();
  const db = getD1();
  const current = await getCategoryRow(db, categoryId);
  await assertCategoryNameAvailable(db, input.nameKey, categoryId);

  try {
    await db.batch([
      db.prepare(`UPDATE cuisine_categories
        SET name = ?, name_key = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`)
        .bind(input.name, input.nameKey, categoryId),
      db.prepare(`UPDATE restaurants
        SET cuisine = ?, updated_at = CURRENT_TIMESTAMP
        WHERE category_id = ?`)
        .bind(input.name, categoryId),
    ]);
  } catch (error) {
    throwCategoryConflict(error);
  }

  const usageCount = await categoryUsageCount(db, current.id);
  return { id: current.id, name: input.name, usageCount };
}

export async function deleteCategory(categoryId: string): Promise<void> {
  await ensureDatabase();
  const db = getD1();
  await getCategoryRow(db, categoryId);
  const usageCount = await categoryUsageCount(db, categoryId);
  if (usageCount > 0) {
    throw httpError(
      `Không thể xóa loại món đang được dùng trong ${usageCount} bài viết. Hãy chuyển các bài viết sang loại khác trước.`,
      409,
    );
  }

  try {
    await db.prepare("DELETE FROM cuisine_categories WHERE id = ?").bind(categoryId).run();
  } catch (error) {
    if (error instanceof Error && /foreign key/i.test(error.message)) {
      throw httpError("Không thể xóa loại món đang được sử dụng.", 409);
    }
    throw error;
  }
}

async function getCategoryRow(db: D1Database, categoryId: string): Promise<StoredCategoryRow> {
  const category = await db.prepare("SELECT id, name, name_key FROM cuisine_categories WHERE id = ?")
    .bind(categoryId)
    .first<StoredCategoryRow>();
  if (!category) throw httpError("Không tìm thấy loại món.", 404);
  return category;
}

async function assertCategoryNameAvailable(
  db: D1Database,
  nameKey: string,
  excludedId?: string,
): Promise<void> {
  const categories = await db.prepare("SELECT id, name, name_key FROM cuisine_categories").all<StoredCategoryRow>();
  const duplicate = categories.results.find(
    (category) => category.id !== excludedId && normalizeCategoryKey(category.name) === nameKey,
  );
  if (duplicate) throw httpError("Loại món này đã tồn tại.", 409);
}

async function categoryUsageCount(db: D1Database, categoryId: string): Promise<number> {
  const row = await db.prepare("SELECT COUNT(*) AS usage_count FROM restaurants WHERE category_id = ?")
    .bind(categoryId)
    .first<{ usage_count: number }>();
  return Number(row?.usage_count ?? 0);
}

function categoryFromRow(row: CategoryUsageRow): CuisineCategory {
  return { id: row.id, name: row.name, usageCount: Number(row.usage_count) };
}

function throwCategoryConflict(error: unknown): never {
  if (error instanceof Error && /(unique|constraint)/i.test(error.message)) {
    throw httpError("Loại món này đã tồn tại.", 409);
  }
  throw error;
}

export async function listPublishedSpots(): Promise<PublishedSpot[]> {
  await ensureDatabase();
  const db = getD1();
  const [reviewsResult, photosResult, dishesResult] = await Promise.all([
    db.prepare(`SELECT
      reviews.id,
      restaurants.name,
      restaurants.area,
      restaurants.address,
      restaurants.category_id,
      COALESCE(cuisine_categories.name, restaurants.cuisine) AS cuisine,
      restaurants.price_label,
      reviews.dish,
      reviews.rating,
      reviews.excerpt,
      reviews.content,
      reviews.hashtags,
      reviews.visited_at,
      reviews.created_at,
      reviews.is_favorite,
      reviews.is_featured
    FROM reviews
    INNER JOIN restaurants ON restaurants.id = reviews.restaurant_id
    LEFT JOIN cuisine_categories ON cuisine_categories.id = restaurants.category_id
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
      categoryId: row.category_id,
      cuisine: row.cuisine,
      dish: row.dish,
      rating: row.rating,
      price: row.price_label,
      excerpt: row.excerpt,
      review: row.content,
      hashtags: parseStoredReviewHashtags(row.hashtags),
      image: gallery[0] ?? "/globe.svg",
      gallery,
      galleryCaptions: photos.map((photo) => photo.caption),
      photos,
      date: row.visited_at,
      postedAt: row.created_at,
      favorite: Boolean(row.is_favorite),
      featured: Boolean(row.is_featured),
      dishes: dishesByReview.get(row.id) ?? [{ id: `${row.id}-primary`, name: row.dish, photoIndex: 0 }],
    };
  });
}

export async function createReview(input: ReviewInput): Promise<string> {
  await ensureDatabase();
  const db = getD1();
  const category = await getCategoryRow(db, input.categoryId);
  const restaurantId = crypto.randomUUID();
  const reviewId = crypto.randomUUID();
  const slugBase = slugify(input.name) || "quan-an";
  const slug = `${slugBase}-${restaurantId.slice(0, 8)}`;

  const statements = [
    db.prepare(`INSERT INTO restaurants
      (id, name, slug, area, address, cuisine, category_id, price_label)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(restaurantId, input.name, slug, input.area, input.address, category.name, category.id, input.priceLabel),
    db.prepare(`INSERT INTO reviews
      (id, restaurant_id, dish, rating, excerpt, content, hashtags, visited_at, is_favorite, is_featured, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')`)
      .bind(
        reviewId,
        restaurantId,
        input.dish,
        input.rating,
        input.excerpt,
        input.content,
        JSON.stringify(input.hashtags),
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
  const category = await getCategoryRow(db, input.categoryId);
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
      name = ?, slug = ?, area = ?, address = ?, cuisine = ?, category_id = ?, price_label = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`)
      .bind(
        input.name,
        `${slugify(input.name) || "quan-an"}-${review.restaurant_id.slice(0, 8)}`,
        input.area,
        input.address,
        category.name,
        category.id,
        input.priceLabel,
        review.restaurant_id,
      ),
    db.prepare(`UPDATE reviews SET
      dish = ?, rating = ?, excerpt = ?, content = ?, hashtags = ?, visited_at = ?,
      is_favorite = ?, is_featured = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`)
      .bind(
        input.dish,
        input.rating,
        input.excerpt,
        input.content,
        JSON.stringify(input.hashtags),
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

function httpError(message: string, status: number): Error {
  const error = new Error(message);
  Object.assign(error, { status });
  return error;
}
