// src/lib/server/schema.ts
import {
	pgTable,
	varchar,
	boolean,
	integer,
	text,
	doublePrecision,
	timestamp,
	serial,
	index,
	pgEnum
} from 'drizzle-orm/pg-core';

// Enums
export const categoryEnum = pgEnum('category', ['food', 'museum', 'nature']);
export const editStatusEnum = pgEnum('edit_status', ['pending', 'approved', 'rejected']);
export const bestTimeEnum = pgEnum('best_time', ['morning', 'afternoon', 'evening', 'any']);

export const users = pgTable('users', {
	id: text('id').primaryKey(),
	email: text('email').notNull().unique(),
	name: text('name').notNull(),
	isAdmin: boolean('is_admin').notNull().default(false),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const sessions = pgTable('sessions', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull()
});

export const travelTips = pgTable(
	'travel_tips',
	{
		id: serial('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),

		// Location
		title: varchar('title', { length: 255 }).notNull(),
		description: text('description').notNull(),
		latitude: doublePrecision('latitude').notNull(),
		longitude: doublePrecision('longitude').notNull(),
		address: text('address'),

		// Category: food, museum, nature
		category: categoryEnum('category').notNull(),

		// Duration in minutes - how long to stay at this place
		durationMinutes: integer('duration_minutes').notNull().default(60),
		bestTimeToVisit: bestTimeEnum('best_time_to_visit'),

		googleMapsUrl: text('google_maps_url'),

		// Additional
		tags: text('tags'), // JSON array of tags
		imageUrl: text('image_url'),

		// Metadata
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => ({
		categoryIdx: index('category_idx').on(table.category),
		locationIdx: index('location_idx').on(table.latitude, table.longitude)
	})
);

export const pendingEdits = pgTable('pending_edits', {
	id: serial('id').primaryKey(),
	tipId: integer('tip_id')
		.notNull()
		.references(() => travelTips.id, { onDelete: 'cascade' }),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),

	// Editable fields
	title: varchar('title', { length: 255 }),
	description: text('description'),
	category: categoryEnum('category'),
	durationMinutes: integer('duration_minutes'),
	bestTimeToVisit: bestTimeEnum('best_time_to_visit'),
	googleMapsUrl: text('google_maps_url'),
	tags: text('tags'),
	imageUrl: text('image_url'),

	// Edit metadata
	status: editStatusEnum('status').notNull().default('pending'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
	reviewedBy: text('reviewed_by').references(() => users.id)
});

export const tipLikes = pgTable(
	'tip_likes',
	{
		id: serial('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		tipId: integer('tip_id')
			.notNull()
			.references(() => travelTips.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => ({
		userTipIdx: index('user_tip_idx').on(table.userId, table.tipId)
	})
);

export const trips = pgTable('trips', {
	id: serial('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	name: varchar('name', { length: 255 }).notNull(),
	description: text('description'),
	startDate: timestamp('start_date', { withTimezone: true }),
	endDate: timestamp('end_date', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const tripLocations = pgTable('trip_locations', {
	id: serial('id').primaryKey(),
	tripId: integer('trip_id')
		.notNull()
		.references(() => trips.id, { onDelete: 'cascade' }),
	locationId: integer('location_id')
		.notNull()
		.references(() => travelTips.id, { onDelete: 'cascade' }),
	order: integer('order').notNull().default(0),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export type TravelTip = typeof travelTips.$inferSelect;
export type Trip = typeof trips.$inferSelect;
export type TripLocation = typeof tripLocations.$inferSelect;
export type NewTravelTip = typeof travelTips.$inferInsert;
export type PendingEdit = typeof pendingEdits.$inferSelect;
export type NewPendingEdit = typeof pendingEdits.$inferInsert;
export type User = typeof users.$inferSelect;
