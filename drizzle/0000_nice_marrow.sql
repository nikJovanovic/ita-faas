CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snippet_id" uuid,
	"user_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"file_name" text,
	"mime_type" text,
	"size_bytes" bigint,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attachments_storage_path_unique" UNIQUE("storage_path")
);
--> statement-breakpoint
CREATE TABLE "digests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"period" date NOT NULL,
	"summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"username" text,
	"display_name" text,
	"snippet_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "snippets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"language" text DEFAULT 'plaintext' NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tag_counts" (
	"user_id" uuid NOT NULL,
	"tag" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "tag_counts_user_id_tag_pk" PRIMARY KEY("user_id","tag")
);
--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_snippet_id_snippets_id_fk" FOREIGN KEY ("snippet_id") REFERENCES "public"."snippets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attachments_snippet_idx" ON "attachments" USING btree ("snippet_id");--> statement-breakpoint
CREATE UNIQUE INDEX "digests_user_period_idx" ON "digests" USING btree ("user_id","period");--> statement-breakpoint
CREATE INDEX "snippets_user_id_idx" ON "snippets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "snippets_tags_idx" ON "snippets" USING gin ("tags");