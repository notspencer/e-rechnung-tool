/**
 * Local filesystem storage provider implementation
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';
import type { StorageProvider, BlobMetadata } from '@e-rechnung/core';

export interface FsStorageConfig {
    basePath: string;
}

export class FsStorageProvider implements StorageProvider {
    private basePath: string;

    constructor(config: FsStorageConfig) {
        this.basePath = config.basePath;
    }

    async put(params: {
        tenantId: string;
        path: string;
        data: Buffer;
        contentType: string;
        metadata?: Record<string, string>;
    }): Promise<{ key: string; checksum: string }> {
        const { tenantId, path, data, contentType, metadata } = params;

        // Create key following S3-like structure
        const key = `tenants/${tenantId}/${path}`;
        const fullPath = join(this.basePath, key);

        // Ensure directory exists
        await fs.mkdir(dirname(fullPath), { recursive: true });

        // Write file
        await fs.writeFile(fullPath, data);

        // Calculate checksum
        const checksum = this.calculateChecksum(data);

        // Write metadata
        if (metadata) {
            const metadataPath = fullPath + '.metadata.json';
            const blobMetadata: BlobMetadata = {
                invoiceId: metadata.invoiceId || '',
                tenantId,
                originalFilename: metadata.originalFilename || path.split('/').pop() || '',
                contentType,
                sizeBytes: data.length,
                checksum: `sha256:${checksum}`,
                uploadedBy: metadata.uploadedBy || 'system',
                uploadedAt: new Date().toISOString(),
            };

            await fs.writeFile(metadataPath, JSON.stringify(blobMetadata, null, 2));
        }

        return { key, checksum: `sha256:${checksum}` };
    }

    async get(params: {
        tenantId: string;
        key: string;
    }): Promise<{ data: Buffer; contentType: string; metadata?: Record<string, string> }> {
        const { tenantId, key } = params;
        const fullPath = join(this.basePath, key);

        // Read file
        const data = await fs.readFile(fullPath);

        // Try to read metadata
        let metadata: Record<string, string> | undefined;
        try {
            const metadataPath = fullPath + '.metadata.json';
            const metadataContent = await fs.readFile(metadataPath, 'utf-8');
            const blobMetadata: BlobMetadata = JSON.parse(metadataContent);

            metadata = {
                contentType: blobMetadata.contentType,
                originalFilename: blobMetadata.originalFilename,
                sizeBytes: blobMetadata.sizeBytes.toString(),
                checksum: blobMetadata.checksum,
                uploadedBy: blobMetadata.uploadedBy,
                uploadedAt: blobMetadata.uploadedAt,
            };
        } catch {
            // Metadata file doesn't exist, use default content type
        }

        return {
            data,
            contentType: metadata?.contentType || 'application/octet-stream',
            metadata,
        };
    }

    async getSignedUrl(params: {
        tenantId: string;
        key: string;
        expiresIn: number;
    }): Promise<string> {
        const { tenantId, key } = params;
        const fullPath = join(this.basePath, key);

        // For local development, return file:// URL
        // In production, this would generate a signed URL
        return `file://${fullPath}`;
    }

    async delete(params: {
        tenantId: string;
        key: string;
    }): Promise<void> {
        const { tenantId, key } = params;
        const fullPath = join(this.basePath, key);

        try {
            await fs.unlink(fullPath);

            // Also delete metadata file if it exists
            const metadataPath = fullPath + '.metadata.json';
            try {
                await fs.unlink(metadataPath);
            } catch {
                // Metadata file doesn't exist, ignore
            }
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                throw error;
            }
            // File doesn't exist, ignore
        }
    }

    private calculateChecksum(data: Buffer): string {
        return createHash('sha256').update(data).digest('hex');
    }
}
