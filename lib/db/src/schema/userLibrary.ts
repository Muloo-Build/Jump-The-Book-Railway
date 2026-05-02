import {
  pgTable,
  text,
  integer,
  timestamp,
  jsonb,
  uuid,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const appUsersTable = pgTable("app_users", {
  userId: text("user_id").primaryKey(),
  email: text("email"),
  defaultVisualStyle: text("default_visual_style")
    .notNull()
    .default("fantasy-illustration"),
  spoilerMode: text("spoiler_mode").notNull().default("no-spoilers"),
  readingMode: text("reading_mode").notNull().default("reading"),
  onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AppUserRow = typeof appUsersTable.$inferSelect;
export type AppUserInsert = typeof appUsersTable.$inferInsert;

export const userBooksTable = pgTable(
  "user_books",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => appUsersTable.userId, { onDelete: "cascade" }),
    title: text("title").notNull(),
    author: text("author").notNull(),
    format: text("format").notNull().default("Paperback"),
    source: text("source").notNull(),
    demoBookId: text("demo_book_id"),
    coverGradient: jsonb("cover_gradient").notNull().default([]),
    visualStyle: text("visual_style").notNull(),
    spoilerMode: text("spoiler_mode").notNull(),
    currentChapter: integer("current_chapter").notNull().default(1),
    currentPage: integer("current_page").notNull().default(0),
    currentAudioTimestamp: text("current_audio_timestamp")
      .notNull()
      .default("00:00:00"),
    progress: integer("progress").notNull().default(0),
    userNote: text("user_note").notNull().default(""),
    tagline: text("tagline"),
    heroImage: text("hero_image"),
    totalChapters: integer("total_chapters"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userIdx: index("user_books_user_idx").on(t.userId),
    demoUniq: uniqueIndex("user_books_demo_uniq").on(t.userId, t.demoBookId),
  }),
);

export type UserBookRow = typeof userBooksTable.$inferSelect;
export type UserBookInsert = typeof userBooksTable.$inferInsert;

export const userScenesTable = pgTable(
  "user_scenes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => appUsersTable.userId, { onDelete: "cascade" }),
    userBookId: uuid("user_book_id")
      .notNull()
      .references(() => userBooksTable.id, { onDelete: "cascade" }),
    chapterNumber: integer("chapter_number").notNull(),
    sceneIndex: integer("scene_index").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    narration: text("narration"),
    location: text("location"),
    mood: text("mood"),
    characters: jsonb("characters").notNull().default([]),
    gradientColors: jsonb("gradient_colors").notNull().default([]),
    imagePrompt: text("image_prompt"),
    imageUrl: text("image_url"),
    visualStyle: text("visual_style"),
    sceneCacheKey: text("scene_cache_key"),
    imageCacheKey: text("image_cache_key"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userIdx: index("user_scenes_user_idx").on(t.userId),
    bookChapterIdx: index("user_scenes_book_chapter_idx").on(
      t.userBookId,
      t.chapterNumber,
    ),
    sceneUniq: uniqueIndex("user_scenes_uniq").on(
      t.userBookId,
      t.chapterNumber,
      t.sceneIndex,
    ),
  }),
);

export type UserSceneRow = typeof userScenesTable.$inferSelect;
export type UserSceneInsert = typeof userScenesTable.$inferInsert;
