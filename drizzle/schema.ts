import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  bigint,
  timestamp,
  jsonb,
  date,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// NOTE: `user_id` / `profiles.id` reference Supabase's `auth.users(id)`.
// We do NOT model auth.users here (Drizzle would try to CREATE it). The
// foreign keys to auth.users are added in the custom SQL migration instead.

// One row per auth user. Bootstrapped by the `on-user-created` Edge Function.
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  username: text("username").unique(),
  displayName: text("display_name"),
  snippetCount: integer("snippet_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// The core entity.
export const snippets = pgTable(
  "snippets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    language: text("language").notNull().default("plaintext"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    isPublic: boolean("is_public").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("snippets_user_id_idx").on(t.userId),
    index("snippets_tags_idx").using("gin", t.tags),
  ],
);

// Per-user tag histogram, recomputed by the `on-snippet-change` Edge Function.
export const tagCounts = pgTable(
  "tag_counts",
  {
    userId: uuid("user_id").notNull(),
    tag: text("tag").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.tag] })],
);

// File metadata, filled in by the `on-attachment-uploaded` Edge Function.
export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    snippetId: uuid("snippet_id").references(() => snippets.id, {
      onDelete: "cascade",
    }),
    userId: uuid("user_id").notNull(),
    storagePath: text("storage_path").notNull().unique(),
    fileName: text("file_name"),
    mimeType: text("mime_type"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    processed: boolean("processed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("attachments_snippet_idx").on(t.snippetId)],
);

// Daily per-user summary, written by the `daily-digest` Edge Function (cron).
export const digests = pgTable(
  "digests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    period: date("period").notNull(),
    summary: jsonb("summary").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("digests_user_period_idx").on(t.userId, t.period)],
);
