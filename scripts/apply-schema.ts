import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL!);

async function run() {
    console.log('Applying schema...');

    // Check if users table exists and has old schema
    const existingCols = await sql`
		SELECT column_name FROM information_schema.columns 
		WHERE table_name = 'users' AND table_schema = 'public'
	`;
    const colNames = existingCols.map((r: any) => r.column_name);

    if (colNames.includes('name') && !colNames.includes('display_name')) {
        console.log('Migrating existing users table...');
        // Rename old columns, add new ones
        await sql`ALTER TABLE "users" RENAME COLUMN "name" TO "display_name"`;
        await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "provider" text NOT NULL DEFAULT 'google'`;
        await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "provider_id" text NOT NULL DEFAULT ''`;
        await sql`UPDATE "users" SET "provider_id" = "id" WHERE "provider_id" = ''`;
        await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" text`;
        // Copy picture to avatar_url if picture column exists
        if (colNames.includes('picture')) {
            await sql`UPDATE "users" SET "avatar_url" = "picture" WHERE "avatar_url" IS NULL AND "picture" IS NOT NULL`;
            await sql`ALTER TABLE "users" DROP COLUMN IF EXISTS "picture"`;
        }
        // Drop old columns
        await sql`ALTER TABLE "users" DROP COLUMN IF EXISTS "is_admin"`;
        console.log('Users table migrated.');
    } else if (!colNames.length) {
        console.log('Creating users table...');
        await sql`
			CREATE TABLE "users" (
				"id" text PRIMARY KEY NOT NULL,
				"provider" text NOT NULL,
				"provider_id" text NOT NULL,
				"email" text NOT NULL UNIQUE,
				"display_name" text NOT NULL,
				"avatar_url" text
			)
		`;
    } else {
        console.log('Users table already has correct schema.');
    }

    // Sessions
    await sql`
		CREATE TABLE IF NOT EXISTS "sessions" (
			"id" text PRIMARY KEY NOT NULL,
			"user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
			"expires_at" timestamp with time zone NOT NULL
		)
	`;
    console.log('Sessions table ready.');

    // Journeys
    await sql`
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
		)
	`;
    console.log('Journeys table ready.');

    // Stops
    await sql`
		CREATE TABLE IF NOT EXISTS "stops" (
			"id" serial PRIMARY KEY NOT NULL,
			"journey_id" integer NOT NULL REFERENCES "journeys"("id") ON DELETE CASCADE,
			"name" text NOT NULL,
			"lat" double precision NOT NULL,
			"lon" double precision NOT NULL,
			"order_index" integer NOT NULL,
			"stay_duration_minutes" integer,
			"notes" text
		)
	`;
    console.log('Stops table ready.');

    // Segments
    await sql`
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
		)
	`;
    console.log('Segments table ready.');

    // Indexes
    await sql`CREATE INDEX IF NOT EXISTS "idx_sessions_user_id" ON "sessions"("user_id")`;
    await sql`CREATE INDEX IF NOT EXISTS "idx_journeys_owner_id" ON "journeys"("owner_id")`;
    await sql`CREATE INDEX IF NOT EXISTS "idx_journeys_share_token" ON "journeys"("share_token")`;
    await sql`CREATE INDEX IF NOT EXISTS "idx_stops_journey_id" ON "stops"("journey_id")`;
    await sql`CREATE INDEX IF NOT EXISTS "idx_segments_journey_id" ON "segments"("journey_id")`;
    console.log('Indexes created.');

    console.log('Schema applied successfully!');
    await sql.end();
}

run().catch((e) => {
    console.error('Failed:', e);
    process.exit(1);
});
