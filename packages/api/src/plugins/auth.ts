/**
 * Authentication plugin for Fastify
 */

import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { db, users, userTenants, apiKeys } from '../db/client.js';
import { eq, and } from 'drizzle-orm';

declare module 'fastify' {
    interface FastifyRequest {
        user?: {
            id: string;
            email: string;
            tenantId: string;
            role: string;
        };
        apiKey?: {
            id: string;
            tenantId: string;
            scopes: string[];
        };
    }
}

export const authPlugin: FastifyPluginAsync = fp(async (fastify) => {
    // JWT secret
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new Error('JWT_SECRET environment variable is required');
    }

    // Add authentication hook
    fastify.addHook('onRequest', async (request, reply) => {
        // Skip auth for public routes
        if (isPublicRoute(request.url)) {
            return;
        }

        // Try JWT token first
        const token = extractToken(request);
        if (token) {
            try {
                const decoded = jwt.verify(token, jwtSecret) as any;

                // Get user with tenant info
                const userWithTenant = await db
                    .select({
                        userId: users.id,
                        email: users.email,
                        tenantId: userTenants.tenantId,
                        role: userTenants.role,
                    })
                    .from(users)
                    .innerJoin(userTenants, eq(users.id, userTenants.userId))
                    .where(eq(users.id, decoded.userId))
                    .limit(1);

                if (userWithTenant.length > 0) {
                    const user = userWithTenant[0];
                    request.user = {
                        id: user.userId,
                        email: user.email,
                        tenantId: user.tenantId,
                        role: user.role,
                    };
                    return;
                }
            } catch (error) {
                // Invalid token, try API key
            }
        }

        // Try API key
        const apiKey = extractApiKey(request);
        if (apiKey) {
            const keyRecord = await db
                .select()
                .from(apiKeys)
                .where(eq(apiKeys.prefix, apiKey.prefix))
                .limit(1);

            if (keyRecord.length > 0) {
                const key = keyRecord[0];
                const isValid = await bcrypt.compare(apiKey.secret, key.secretHash);

                if (isValid) {
                    request.apiKey = {
                        id: key.id,
                        tenantId: key.tenantId,
                        scopes: key.scopes,
                    };

                    // Update last used timestamp
                    await db
                        .update(apiKeys)
                        .set({ lastUsedAt: new Date() })
                        .where(eq(apiKeys.id, key.id));

                    return;
                }
            }
        }

        // No valid authentication found
        reply.code(401).send({ error: 'Unauthorized' });
    });
});

function isPublicRoute(url: string): boolean {
    const publicRoutes = [
        '/health',
        '/api/auth/login',
    ];

    return publicRoutes.some(route => url.startsWith(route));
}

function extractToken(request: any): string | null {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    return null;
}

function extractApiKey(request: any): { prefix: string; secret: string } | null {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);

        // Check if it looks like an API key (prefix_secret format)
        if (token.includes('_') && token.length > 20) {
            const parts = token.split('_');
            if (parts.length >= 2) {
                const prefix = parts[0] + '_';
                const secret = parts.slice(1).join('_');
                return { prefix, secret };
            }
        }
    }
    return null;
}

// Helper function to hash passwords
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '12'));
}

// Helper function to verify passwords
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}
