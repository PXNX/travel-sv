import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config();
const sql = postgres(process.env.DATABASE_URL!);
await sql`ALTER TABLE segments ADD COLUMN IF NOT EXISTS transit_summary text`;
console.log('Added transit_summary column');
await sql.end();
