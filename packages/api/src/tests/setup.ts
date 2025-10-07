/**
 * Test setup for E-Rechnung Tool API tests
 */

import { beforeAll } from 'vitest';

// Set test environment variables
beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/einvoice';
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.SESSION_SECRET = 'test-session-secret';
    process.env.LOG_LEVEL = 'error'; // Reduce logging noise in tests
    process.env.STORAGE_PROVIDER = 'fs';
    process.env.FS_STORAGE_PATH = './.data';
});
