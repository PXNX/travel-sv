import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import { DATABASE_URL } from '$env/static/private';

const connectionString = DATABASE_URL || 'postgresql://localhost:5432/trainstation';
const client = postgres(connectionString);
export const db = drizzle(client, { schema });
