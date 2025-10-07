/**
 * Database client setup with Drizzle ORM
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import { env } from '../config/env.js';

// Create postgres client
const client = postgres(env.DATABASE_URL, {
    max: env.DATABASE_POOL_MAX,
});

// Create drizzle instance
export const db = drizzle(client, { schema });

// Export schema for use in other modules
export * from './schema.js';
