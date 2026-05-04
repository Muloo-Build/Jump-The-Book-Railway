import { pgTable, text, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { appUsersTable } from "./userLibrary";

export const SCENE_CACHE_VERSION = 1;
export const IMAGE_CACHE_VERSION = 3;

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
    hitCount: integer("hit_count").notNull().default(0),
    lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }).notNull().defaultNow(),
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
    // Who first generated this image. Nullable because legacy rows
    // pre-date the per-user opt-in (and a few server-side flows may
    // generate without an authed user). Only rows whose creator has
    // `shareToTrending = true` ever surface as public sample images on
    // the Discover/trending feed. Set ON DELETE SET NULL so deleting an
    // app user doesn't blow up the shared cache.
    creatorUserId: text("creator_user_id").references(
      () => appUsersTable.userId,
      { onDelete: "set null" },
    ),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
    hitCount: integer("hit_count").notNull().default(0),
    lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    bookIdx: index("image_cache_book_idx").on(t.bookTitle, t.author, t.chapterNumber),
    creatorIdx: index("image_cache_creator_idx").on(t.creatorUserId),
  }),
);

export type ImageCacheRow = typeof imageCacheTable.$inferSelect;
export type ImageCacheInsert = typeof imageCacheTable.$inferInsert;
