/**
 * S3-compatible storage provider implementation
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash } from 'crypto';
import type { StorageProvider, BlobMetadata } from '@e-rechnung/core';

export interface S3StorageConfig {
    endpoint?: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    forcePathStyle?: boolean;
}

export class S3StorageProvider implements StorageProvider {
    private s3Client: S3Client;
    private bucket: string;

    constructor(config: S3StorageConfig) {
        this.bucket = config.bucket;

        this.s3Client = new S3Client({
            endpoint: config.endpoint,
            region: config.region,
            credentials: {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
            },
            forcePathStyle: config.forcePathStyle || false,
        });
    }

    async put(params: {
        tenantId: string;
        path: string;
        data: Buffer;
        contentType: string;
        metadata?: Record<string, string>;
    }): Promise<{ key: string; checksum: string }> {
        const { tenantId, path, data, contentType, metadata } = params;

        // Create key following S3 structure
        const key = `tenants/${tenantId}/${path}`;

        // Calculate checksum
        const checksum = this.calculateChecksum(data);

        // Prepare metadata
        const s3Metadata: Record<string, string> = {
            'content-type': contentType,
            'x-checksum': `sha256:${checksum}`,
            ...metadata,
        };

        // Upload to S3
        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: data,
            ContentType: contentType,
            Metadata: s3Metadata,
        });

        await this.s3Client.send(command);

        return { key, checksum: `sha256:${checksum}` };
    }

    async get(params: {
        tenantId: string;
        key: string;
    }): Promise<{ data: Buffer; contentType: string; metadata?: Record<string, string> }> {
        const { tenantId, key } = params;

        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });

        const response = await this.s3Client.send(command);

        if (!response.Body) {
            throw new Error(`No data found for key: ${key}`);
        }

        // Convert stream to buffer
        const chunks: Uint8Array[] = [];
        const stream = response.Body as any;

        for await (const chunk of stream) {
            chunks.push(chunk);
        }

        const data = Buffer.concat(chunks);

        return {
            data,
            contentType: response.ContentType || 'application/octet-stream',
            metadata: response.Metadata,
        };
    }

    async getSignedUrl(params: {
        tenantId: string;
        key: string;
        expiresIn: number;
    }): Promise<string> {
        const { tenantId, key } = params;

        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });

        return getSignedUrl(this.s3Client, command, { expiresIn: params.expiresIn });
    }

    async delete(params: {
        tenantId: string;
        key: string;
    }): Promise<void> {
        const { tenantId, key } = params;

        const command = new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });

        await this.s3Client.send(command);
    }

    private calculateChecksum(data: Buffer): string {
        return createHash('sha256').update(data).digest('hex');
    }
}
