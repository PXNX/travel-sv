-- T06-T10: Initial schema for Journey Planner
-- Users
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"provider_id" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"display_name" text NOT NULL,
	"avatar_url" text
);

-- Sessions
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"expires_at" timestamp with time zone NOT NULL
);

-- Journeys
CREATE TABLE IF NOT EXISTS "journeys" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"title" text NOT NULL DEFAULT 'Untitled Journey',
	"description" text,
	"is_public" boolean NOT NULL DEFAULT false,
	"share_token" uuid,
	"start_datetime" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Stops
CREATE TABLE IF NOT EXISTS "stops" (
	"id" serial PRIMARY KEY NOT NULL,
	"journey_id" integer NOT NULL REFERENCES "journeys"("id") ON DELETE CASCADE,
	"name" text NOT NULL,
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL,
	"order_index" integer NOT NULL,
	"stay_duration_minutes" integer,
	"notes" text
);

-- Segments
CREATE TABLE IF NOT EXISTS "segments" (
	"id" serial PRIMARY KEY NOT NULL,
	"journey_id" integer NOT NULL REFERENCES "journeys"("id") ON DELETE CASCADE,
	"from_stop_id" integer NOT NULL REFERENCES "stops"("id") ON DELETE CASCADE,
	"to_stop_id" integer NOT NULL REFERENCES "stops"("id") ON DELETE CASCADE,
	"distance_m" double precision,
	"elevation_up_m" double precision,
	"elevation_down_m" double precision,
	"travel_duration_minutes" double precision,
	"mode" text NOT NULL DEFAULT 'walk'
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_sessions_user_id" ON "sessions"("user_id");
CREATE INDEX IF NOT EXISTS "idx_journeys_owner_id" ON "journeys"("owner_id");
CREATE INDEX IF NOT EXISTS "idx_journeys_share_token" ON "journeys"("share_token");
CREATE INDEX IF NOT EXISTS "idx_stops_journey_id" ON "stops"("journey_id");
CREATE INDEX IF NOT EXISTS "idx_segments_journey_id" ON "segments"("journey_id");
