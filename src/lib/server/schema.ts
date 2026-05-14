import {
	pgTable,
	text,
	serial,
	integer,
	boolean,
	timestamp,
	doublePrecision,
	uuid
} from 'drizzle-orm/pg-core';

// T09 — Users
export const users = pgTable('users', {
	id: text('id').primaryKey(),
	provider: text('provider').notNull(),
	providerId: text('provider_id').notNull(),
	email: text('email').notNull().unique(),
	displayName: text('display_name').notNull(),
	avatarUrl: text('avatar_url')
});

// T10 — Sessions
export const sessions = pgTable('sessions', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull()
});

// T06 — Journeys
export const journeys = pgTable('journeys', {
	id: serial('id').primaryKey(),
	ownerId: text('owner_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	title: text('title').notNull().default('Untitled Journey'),
	description: text('description'),
	isPublic: boolean('is_public').notNull().default(false),
	shareToken: uuid('share_token'),
	startDatetime: timestamp('start_datetime', { withTimezone: true, mode: 'date' }),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow()
});

// T07 — Stops
export const stops = pgTable('stops', {
	id: serial('id').primaryKey(),
	journeyId: integer('journey_id')
		.notNull()
		.references(() => journeys.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	lat: doublePrecision('lat').notNull(),
	lon: doublePrecision('lon').notNull(),
	orderIndex: integer('order_index').notNull(),
	stayDurationMinutes: integer('stay_duration_minutes'),
	notes: text('notes')
});

// T08 — Segments
export const segments = pgTable('segments', {
	id: serial('id').primaryKey(),
	journeyId: integer('journey_id')
		.notNull()
		.references(() => journeys.id, { onDelete: 'cascade' }),
	fromStopId: integer('from_stop_id')
		.notNull()
		.references(() => stops.id, { onDelete: 'cascade' }),
	toStopId: integer('to_stop_id')
		.notNull()
		.references(() => stops.id, { onDelete: 'cascade' }),
	distanceM: doublePrecision('distance_m'),
	elevationUpM: doublePrecision('elevation_up_m'),
	elevationDownM: doublePrecision('elevation_down_m'),
	travelDurationMinutes: doublePrecision('travel_duration_minutes'),
	mode: text('mode').notNull().default('walk'),
	transitSummary: text('transit_summary'),
	transitLegs: text('transit_legs'),
	walkToStationMin: doublePrecision('walk_to_station_min'),
	walkFromStationMin: doublePrecision('walk_from_station_min'),
	transfers: integer('transfers'),
	walkGeometry: text('walk_geometry'),
	driveGeometry: text('drive_geometry'),
	transitGeometry: text('transit_geometry')
});
