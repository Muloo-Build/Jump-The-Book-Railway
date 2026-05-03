import { pgTable, text, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";

export const SCENE_CACHE_VERSION = 1;
export const IMAGE_CACHE_VERSION = 2;

export const sceneCacheTable = pgTable(
  "scene_cache",
  {
    cacheKey: text("cache_key").primaryKey(),
    version: integer("version").notNull(),
    bookTitle: text("book_title").notNull(),
    author: text("author").notNull(),
    chapterNumber: integer("chapter_number").notNull(),
    chapterTitle: text("chapter_title").notNull(),
    visualStyle: text("visual_style").notNull(),
    spoilerMode: text("spoiler_mode").notNull(),
    excerptHash: text("excerpt_hash"),
    scenes: jsonb("scenes").notNull(),
    source: text("source"),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    bookIdx: index("scene_cache_book_idx").on(t.bookTitle, t.author, t.chapterNumber),
  }),
);

export type SceneCacheRow = typeof sceneCacheTable.$inferSelect;
export type SceneCacheInsert = typeof sceneCacheTable.$inferInsert;

export const imageCacheTable = pgTable(
  "image_cache",
  {
    cacheKey: text("cache_key").primaryKey(),
    version: integer("version").notNull(),
    bookTitle: text("book_title").notNull(),
    author: text("author").notNull(),
    chapterNumber: integer("chapter_number").notNull(),
    sceneIndex: integer("scene_index").notNull(),
    visualStyle: text("visual_style").notNull(),
    promptHash: text("prompt_hash").notNull(),
    objectPath: text("object_path").notNull(),
    bytes: integer("bytes").notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    bookIdx: index("image_cache_book_idx").on(t.bookTitle, t.author, t.chapterNumber),
  }),
);

export type ImageCacheRow = typeof imageCacheTable.$inferSelect;
export type ImageCacheInsert = typeof imageCacheTable.$inferInsert;
