/**
 * Fastify API server for E-Rechnung Tool
 */

import Fastify from 'fastify';
import { loggingPlugin } from './plugins/logging.js';
import { authPlugin } from './plugins/auth.js';
import { rlsPlugin } from './plugins/rls.js';

// Create Fastify instance
const fastify = Fastify({
    logger: {
        level: process.env.LOG_LEVEL || 'info',
    },
});

// Register plugins
fastify.register(loggingPlugin);
fastify.register(authPlugin);
fastify.register(rlsPlugin);

// Health check endpoint
fastify.get('/health', async (request, reply) => {
    return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    };
});

// API routes (to be implemented)
fastify.register(async function (fastify) {
    // Auth routes
    fastify.post('/api/auth/login', async (request, reply) => {
        // TODO: Implement login
        return { message: 'Login endpoint - TODO' };
    });

    // Invoice routes
    fastify.post('/api/invoices/upload', async (request, reply) => {
        // TODO: Implement upload
        return { message: 'Upload endpoint - TODO' };
    });

    fastify.get('/api/invoices', async (request, reply) => {
        // TODO: Implement list
        return { message: 'List endpoint - TODO' };
    });

    fastify.get('/api/invoices/:id', async (request, reply) => {
        // TODO: Implement get
        return { message: 'Get endpoint - TODO' };
    });

    fastify.post('/api/invoices/:id/archive', async (request, reply) => {
        // TODO: Implement archive
        return { message: 'Archive endpoint - TODO' };
    });

    // Export routes
    fastify.post('/api/exports', async (request, reply) => {
        // TODO: Implement export
        return { message: 'Export endpoint - TODO' };
    });

    fastify.get('/api/exports/:id', async (request, reply) => {
        // TODO: Implement get export
        return { message: 'Get export endpoint - TODO' };
    });

    // Analytics routes
    fastify.get('/api/analytics/summary', async (request, reply) => {
        // TODO: Implement analytics
        return { message: 'Analytics endpoint - TODO' };
    });
}, { prefix: '' });

// Error handler
fastify.setErrorHandler(async (error, request, reply) => {
    request.log.error({
        error: error.message,
        stack: error.stack,
        req: request,
    }, 'Request error');

    reply.status(500).send({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    });
});

// Start server
const start = async () => {
    try {
        const port = parseInt(process.env.PORT || '3000');
        const host = process.env.HOST || '0.0.0.0';

        await fastify.listen({ port, host });

        console.log(`🚀 E-Rechnung API server running on http://${host}:${port}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully...');
    await fastify.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    await fastify.close();
    process.exit(0);
});

// Start the server
if (require.main === module) {
    start();
}

export default fastify;
