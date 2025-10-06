/**
 * Logging plugin for Fastify using Pino
 */

import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

export const loggingPlugin: FastifyPluginAsync = fp(async (fastify) => {
    // Configure Pino logger
    fastify.register(require('@fastify/pino'), {
        level: process.env.LOG_LEVEL || 'info',
        redact: {
            paths: [
                'email',
                'buyer.email',
                'seller.email',
                'payment.iban',
                'req.headers.authorization',
                'password',
                'passwordHash',
            ],
            censor: '[REDACTED]',
        },
        serializers: {
            req: (req: any) => ({
                method: req.method,
                url: req.url,
                headers: {
                    'user-agent': req.headers['user-agent'],
                    'content-type': req.headers['content-type'],
                },
                remoteAddress: req.ip,
                remotePort: req.connection?.remotePort,
            }),
            res: (res: any) => ({
                statusCode: res.statusCode,
                headers: {
                    'content-type': res.headers['content-type'],
                },
            }),
        },
    });

    // Add request ID for correlation
    fastify.addHook('onRequest', async (request, reply) => {
        request.id = request.headers['x-request-id'] as string || generateRequestId();
    });

    // Log request/response
    fastify.addHook('onResponse', async (request, reply) => {
        const duration = reply.getResponseTime();

        request.log.info({
            req: request,
            res: reply,
            duration,
            tenantId: request.tenantId,
            userId: request.user?.id,
        }, 'Request completed');
    });
});

function generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
}
