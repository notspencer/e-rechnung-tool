/**
 * Simple logging plugin for Fastify
 */

import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

export const loggingPlugin: FastifyPluginAsync = fp(async (fastify) => {
    // Add request ID for correlation
    fastify.addHook('onRequest', async (request) => {
        request.id = request.headers['x-request-id'] as string || generateRequestId();
    });

    // Log request/response
    fastify.addHook('onResponse', async (request, reply) => {
        const duration = reply.getResponseTime();

        fastify.log.info({
            req: {
                method: request.method,
                url: request.url,
                id: request.id,
            },
            res: {
                statusCode: reply.statusCode,
            },
            duration,
            tenantId: (request as any).tenantId,
            userId: (request as any).user?.id,
        }, 'Request completed');
    });
});

function generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
}
