/**
 * Environment configuration - loads environment variables first
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

// Load environment variables from the API package directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try multiple possible paths for the .env file
const possiblePaths = [
    resolve(__dirname, '../../.env'),
    resolve(__dirname, '../../../.env'),
    resolve(process.cwd(), 'packages/api/.env'),
    resolve(process.cwd(), '.env'),
];

let envPath = null;
for (const path of possiblePaths) {
    if (existsSync(path)) {
        envPath = path;
        break;
    }
}

if (envPath) {
    console.log(`Loading environment from: ${envPath}`);
    const result = config({ path: envPath });
    if (result.error) {
        console.error('Error loading .env file:', result.error);
    } else {
        console.log(`Loaded ${Object.keys(result.parsed || {}).length} environment variables`);
    }
} else {
    console.warn('No .env file found in any of the expected locations:', possiblePaths);
}

// Export environment variables with defaults
export const env = {
    DATABASE_URL: process.env.DATABASE_URL || '',
    DATABASE_POOL_MAX: parseInt(process.env.DATABASE_POOL_MAX || '10'),
    JWT_SECRET: process.env.JWT_SECRET || '',
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '3000'),
    HOST: process.env.HOST || '0.0.0.0',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',

    // Auth configuration
    SIGNUP_MODE: process.env.SIGNUP_MODE || 'self_serve',
    TENANT_CREATION: process.env.TENANT_CREATION || 'self_serve_first_user',
    AUTOJOIN_SAME_DOMAIN: process.env.AUTOJOIN_SAME_DOMAIN === 'true',
    REQUIRE_OWNER_APPROVAL: process.env.REQUIRE_OWNER_APPROVAL === 'true',
    REQUIRE_EMAIL_VERIFICATION: process.env.REQUIRE_EMAIL_VERIFICATION === 'true',
    ALLOW_UNVERIFIED_IN_DEV: process.env.ALLOW_UNVERIFIED_IN_DEV === 'true',
    ENABLE_CAPTCHA: process.env.ENABLE_CAPTCHA === 'true',
    WAITLIST_ENABLED: process.env.WAITLIST_ENABLED === 'true',

    // Password configuration
    PASSWORD_MIN_LENGTH: parseInt(process.env.PASSWORD_MIN_LENGTH || '12'),
    BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12'),

    // Token configuration
    SESSION_TTL_DAYS: parseInt(process.env.SESSION_TTL_DAYS || '7'),
    ACCESS_TTL_MIN: parseInt(process.env.ACCESS_TTL_MIN || '15'),
    REFRESH_TTL_DAYS: parseInt(process.env.REFRESH_TTL_DAYS || '7'),
};

// Validate required environment variables
if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
}

if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}
