ALTER TABLE "journeys"
ADD COLUMN IF NOT EXISTS "minimum_transfer_minutes" integer NOT NULL DEFAULT 5;
