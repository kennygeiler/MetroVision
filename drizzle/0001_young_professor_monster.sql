CREATE TABLE "batch_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"film_id" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"jsonl_path" text,
	"batch_api_name" text,
	"shot_count" integer,
	"result_count" integer,
	"error" text,
	"submitted_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pipeline_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"film_id" uuid,
	"shot_id" uuid,
	"stage" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"worker_id" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"error" text,
	"attempts" integer DEFAULT 0,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scenes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"film_id" uuid NOT NULL,
	"scene_number" integer NOT NULL,
	"title" text,
	"description" text,
	"start_tc" real,
	"end_tc" real,
	"total_duration" real,
	"video_url" text,
	"thumbnail_url" text,
	"location" text,
	"interior_exterior" text,
	"time_of_day" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shot_objects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shot_id" uuid NOT NULL,
	"track_id" text NOT NULL,
	"label" text NOT NULL,
	"category" text,
	"confidence" real,
	"yolo_class" text,
	"yolo_confidence" real,
	"cinematic_label" text,
	"description" text,
	"significance" text,
	"keyframes" jsonb NOT NULL,
	"start_time" real NOT NULL,
	"end_time" real NOT NULL,
	"attributes" jsonb,
	"scene_context" jsonb
);
--> statement-breakpoint
ALTER TABLE "shot_embeddings" DROP CONSTRAINT "shot_embeddings_shot_id_unique";--> statement-breakpoint
ALTER TABLE "films" ADD COLUMN "poster_url" text;--> statement-breakpoint
ALTER TABLE "films" ADD COLUMN "backdrop_url" text;--> statement-breakpoint
ALTER TABLE "films" ADD COLUMN "overview" text;--> statement-breakpoint
ALTER TABLE "films" ADD COLUMN "runtime" integer;--> statement-breakpoint
ALTER TABLE "films" ADD COLUMN "genres" text[];--> statement-breakpoint
ALTER TABLE "films" ADD COLUMN "source_url" text;--> statement-breakpoint
ALTER TABLE "shot_metadata" ADD COLUMN "confidence" real;--> statement-breakpoint
ALTER TABLE "shot_metadata" ADD COLUMN "review_status" text DEFAULT 'unreviewed';--> statement-breakpoint
ALTER TABLE "shot_metadata" ADD COLUMN "validation_flags" text[];--> statement-breakpoint
ALTER TABLE "shots" ADD COLUMN "scene_id" uuid;--> statement-breakpoint
ALTER TABLE "batch_jobs" ADD CONSTRAINT "batch_jobs_film_id_films_id_fk" FOREIGN KEY ("film_id") REFERENCES "public"."films"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_jobs" ADD CONSTRAINT "pipeline_jobs_film_id_films_id_fk" FOREIGN KEY ("film_id") REFERENCES "public"."films"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_jobs" ADD CONSTRAINT "pipeline_jobs_shot_id_shots_id_fk" FOREIGN KEY ("shot_id") REFERENCES "public"."shots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_film_id_films_id_fk" FOREIGN KEY ("film_id") REFERENCES "public"."films"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shot_objects" ADD CONSTRAINT "shot_objects_shot_id_shots_id_fk" FOREIGN KEY ("shot_id") REFERENCES "public"."shots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shots" ADD CONSTRAINT "shots_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE set null ON UPDATE no action;