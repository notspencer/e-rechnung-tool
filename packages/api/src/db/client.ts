/**
 * Database client setup with Drizzle ORM
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

// Create postgres client
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
}

const client = postgres(connectionString, {
    max: parseInt(process.env.DATABASE_POOL_MAX || '10'),
});

// Create drizzle instance
export const db = drizzle(client, { schema });

// Export schema for use in other modules
export * from './schema.js';
