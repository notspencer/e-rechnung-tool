/**
 * Drizzle Kit configuration
 */

import type { Config } from 'drizzle-kit';

export default {
    schema: './src/db/schema.ts',
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL || 'postgresql://einvoice:einvoice@localhost:5432/einvoice',
    },
    verbose: true,
    strict: true,
} satisfies Config;
