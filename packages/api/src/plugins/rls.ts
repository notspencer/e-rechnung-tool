/**
 * Row-Level Security (RLS) plugin for Fastify
 */

import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { db } from '../db/client.js';

declare module 'fastify' {
    interface FastifyRequest {
        tenantId?: string;
    }
}

export const rlsPlugin: FastifyPluginAsync = fp(async (fastify) => {
    // Add hook to set tenant context for RLS
    fastify.addHook('onRequest', async (request, reply) => {
        // Extract tenant ID from request context
        const tenantId = extractTenantId(request);

        if (tenantId) {
            // Set session variable for RLS
            await db.execute(`SET LOCAL app.tenant_id = '${tenantId}'`);
            request.tenantId = tenantId;
        }
    });
});

function extractTenantId(request: any): string | null {
    // From user session (will be set by auth plugin)
    if (request.user?.tenantId) {
        return request.user.tenantId;
    }

    // From API key (will be set by auth plugin)
    if (request.apiKey?.tenantId) {
        return request.apiKey.tenantId;
    }

    return null;
}
