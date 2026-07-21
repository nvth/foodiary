import { sql } from "drizzle-orm";
import { check, index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const blogSettings = sqliteTable("blog_settings", {
  id: text("id").primaryKey(),
  aboutTitle: text("about_title").notNull(),
  aboutBody: text("about_body").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const cuisineCategories = sqliteTable(
  "cuisine_categories",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull().unique(),
    nameKey: text("name_key").notNull().unique(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("cuisine_categories_name_idx").on(table.name)],
);

export const restaurants = sqliteTable(
  "restaurants",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    area: text("area").notNull(),
    address: text("address").notNull(),
    cuisine: text("cuisine").notNull(),
    categoryId: text("category_id").references(() => cuisineCategories.id, { onDelete: "restrict" }),
    priceLabel: text("price_label").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("restaurants_area_idx").on(table.area),
    index("restaurants_cuisine_idx").on(table.cuisine),
    index("restaurants_category_idx").on(table.categoryId),
  ],
);

export const reviews = sqliteTable(
  "reviews",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    dish: text("dish").notNull(),
    rating: real("rating").notNull(),
    excerpt: text("excerpt").notNull(),
    content: text("content").notNull(),
    hashtags: text("hashtags", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    visitedAt: text("visited_at").notNull(),
    isFavorite: integer("is_favorite", { mode: "boolean" }).notNull().default(false),
    isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
    status: text("status", { enum: ["draft", "published"] }).notNull().default("published"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("reviews_restaurant_idx").on(table.restaurantId),
    index("reviews_status_visited_idx").on(table.status, table.visitedAt),
  ],
);

export const suggestions = sqliteTable(
  "suggestions",
  {
    id: text("id").primaryKey(),
    username: text("username"),
    message: text("message").notNull(),
    status: text("status", { enum: ["unread", "read"] }).notNull().default("unread"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("suggestions_created_idx").on(table.createdAt),
    index("suggestions_status_created_idx").on(table.status, table.createdAt),
    check("suggestions_status_check", sql`${table.status} IN ('unread', 'read')`),
  ],
);

export const photos = sqliteTable(
  "photos",
  {
    id: text("id").primaryKey(),
    reviewId: text("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    objectKey: text("object_key").notNull().unique(),
    altText: text("alt_text").notNull().default(""),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("photos_review_sort_idx").on(table.reviewId, table.sortOrder)],
);

export const reviewDishes = sqliteTable(
  "review_dishes",
  {
    id: text("id").primaryKey(),
    reviewId: text("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    photoSortOrder: integer("photo_sort_order").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("review_dishes_review_sort_idx").on(table.reviewId, table.sortOrder)],
);
