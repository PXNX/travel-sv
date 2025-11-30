// src/lib/server/db.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DATABASE_URL } from '$env/static/private';
import * as schema from './schema';

// For query purposes
const queryClient = postgres(DATABASE_URL);
export const db = drizzle(queryClient, { schema });

// Optional: For migrations (use only when running migrations)
// const migrationClient = postgres(DATABASE_URL, { max: 1 });
// export const migrationDb = drizzle(migrationClient, { schema });
