/**
 * Storage provider interface for blob storage
 */

export interface StorageProvider {
    /**
     * Store a blob and return its key
     */
    put(params: {
        tenantId: string;
        path: string;
        data: Buffer;
        contentType: string;
        metadata?: Record<string, string>;
    }): Promise<{ key: string; checksum: string }>;

    /**
     * Retrieve a blob by key
     */
    get(params: {
        tenantId: string;
        key: string;
    }): Promise<{ data: Buffer; contentType: string; metadata?: Record<string, string> }>;

    /**
     * Generate a signed download URL (expires in N seconds)
     */
    getSignedUrl(params: {
        tenantId: string;
        key: string;
        expiresIn: number;
    }): Promise<string>;

    /**
     * Delete a blob (for cleanup/testing)
     */
    delete(params: {
        tenantId: string;
        key: string;
    }): Promise<void>;
}

export interface BlobMetadata {
    invoiceId: string;
    tenantId: string;
    originalFilename: string;
    contentType: string;
    sizeBytes: number;
    checksum: string;
    uploadedBy: string;
    uploadedAt: string;
}
