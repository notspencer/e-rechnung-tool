/**
 * Tests for filesystem storage provider
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { FsStorageProvider } from './fs-storage.js';

describe('FsStorageProvider', () => {
    const testDir = join(process.cwd(), '.test-storage');
    const provider = new FsStorageProvider({ basePath: testDir });

    beforeEach(async () => {
        // Clean up test directory
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch {
            // Directory doesn't exist, ignore
        }
    });

    afterEach(async () => {
        // Clean up test directory
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch {
            // Directory doesn't exist, ignore
        }
    });

    it('should store and retrieve a file', async () => {
        const testData = Buffer.from('Hello, World!');
        const tenantId = 'test-tenant';
        const path = 'invoices/test-invoice.xml';

        // Store file
        const result = await provider.put({
            tenantId,
            path,
            data: testData,
            contentType: 'application/xml',
            metadata: {
                invoiceId: 'test-invoice',
                originalFilename: 'invoice.xml',
            },
        });

        expect(result.key).toBe(`tenants/${tenantId}/${path}`);
        expect(result.checksum).toMatch(/^sha256:/);

        // Retrieve file
        const retrieved = await provider.get({
            tenantId,
            key: result.key,
        });

        expect(retrieved.data).toEqual(testData);
        expect(retrieved.contentType).toBe('application/xml');
        expect(retrieved.metadata).toBeDefined();
        expect(retrieved.metadata?.originalFilename).toBe('invoice.xml');
    });

    it('should generate signed URLs', async () => {
        const testData = Buffer.from('Test data');
        const tenantId = 'test-tenant';
        const path = 'test/file.txt';

        // Store file
        const result = await provider.put({
            tenantId,
            path,
            data: testData,
            contentType: 'text/plain',
        });

        // Get signed URL
        const signedUrl = await provider.getSignedUrl({
            tenantId,
            key: result.key,
            expiresIn: 3600,
        });

        expect(signedUrl).toMatch(/^file:\/\//);
        expect(signedUrl).toContain(result.key);
    });

    it('should delete files', async () => {
        const testData = Buffer.from('Test data');
        const tenantId = 'test-tenant';
        const path = 'test/file.txt';

        // Store file
        const result = await provider.put({
            tenantId,
            path,
            data: testData,
            contentType: 'text/plain',
        });

        // Verify file exists
        const retrieved = await provider.get({
            tenantId,
            key: result.key,
        });
        expect(retrieved.data).toEqual(testData);

        // Delete file
        await provider.delete({
            tenantId,
            key: result.key,
        });

        // Verify file is deleted
        try {
            await provider.get({
                tenantId,
                key: result.key,
            });
            expect.fail('File should not exist after deletion');
        } catch (error) {
            // Expected error
        }
    });

    it('should handle non-existent files gracefully', async () => {
        const tenantId = 'test-tenant';
        const key = 'tenants/test-tenant/non-existent/file.txt';

        // Delete non-existent file should not throw
        await expect(provider.delete({ tenantId, key })).resolves.not.toThrow();

        // Get non-existent file should throw
        await expect(provider.get({ tenantId, key })).rejects.toThrow();
    });

    it('should create nested directories', async () => {
        const testData = Buffer.from('Nested file data');
        const tenantId = 'test-tenant';
        const path = 'deeply/nested/path/file.xml';

        const result = await provider.put({
            tenantId,
            path,
            data: testData,
            contentType: 'application/xml',
        });

        expect(result.key).toBe(`tenants/${tenantId}/${path}`);

        const retrieved = await provider.get({
            tenantId,
            key: result.key,
        });

        expect(retrieved.data).toEqual(testData);
    });
});
