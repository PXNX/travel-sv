ALTER TABLE "journeys"
ADD COLUMN IF NOT EXISTS "deutschlandticket_only" boolean NOT NULL DEFAULT true;
