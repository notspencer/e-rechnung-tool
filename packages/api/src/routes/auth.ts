/**
 * Authentication routes
 */

import { FastifyPluginAsync } from 'fastify';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { users, tenants, userTenants, refreshTokens } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '../plugins/auth.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Note: Validation schemas are defined inline in the route handlers for now

// Helper functions
function extractDomain(email: string): string {
    return email.split('@')[1]?.toLowerCase() || '';
}

function generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

async function createTenant(name: string, domain: string) {
    const slug = generateSlug(name);

    // Ensure unique slug
    let finalSlug = slug;
    let counter = 1;
    while (true) {
        const existing = await db.select().from(tenants).where(eq(tenants.slug, finalSlug)).limit(1);
        if (existing.length === 0) break;
        finalSlug = `${slug}-${counter}`;
        counter++;
    }

    const [tenant] = await db.insert(tenants).values({
        name,
        slug: finalSlug,
        claimedDomains: [domain],
    }).returning();

    return tenant;
}

async function createRefreshToken(userId: string, tenantId: string) {
    const token = generateToken();
    const tokenHash = hashToken(token);
    const familyId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + env.REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

    await db.insert(refreshTokens).values({
        userId,
        tenantId,
        familyId,
        tokenHash,
        expiresAt,
    });

    return { token, familyId };
}

async function revokeRefreshTokenFamily(familyId: string) {
    await db.update(refreshTokens)
        .set({ revoked: true })
        .where(eq(refreshTokens.familyId, familyId));
}

// Routes
export const authRoutes: FastifyPluginAsync = async (fastify) => {
    // Register endpoint
    fastify.post('/register', {
        schema: {
            body: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 12 },
                    tenantName: { type: 'string', minLength: 1 }
                }
            }
        },
    }, async (request, reply) => {
        const { email, password, tenantName } = request.body as { email: string; password: string; tenantName?: string };
        const domain = extractDomain(email);
        const signupMode = env.SIGNUP_MODE;
        const requireEmailVerification = env.REQUIRE_EMAIL_VERIFICATION;
        const allowUnverifiedInDev = env.ALLOW_UNVERIFIED_IN_DEV;
        const isDev = env.NODE_ENV === 'development';

        try {
            // Check if user already exists
            const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
            if (existingUser.length > 0) {
                return reply.code(400).send({ error: 'User already exists' });
            }

            // Find existing tenant by domain
            const existingTenants = await db.select().from(tenants);
            const tenantWithDomain = existingTenants.find(t =>
                t.claimedDomains && Array.isArray(t.claimedDomains) && t.claimedDomains.includes(domain)
            );

            let tenant;
            let userRole = 'FINANCE';

            if (tenantWithDomain) {
                // Domain already claimed - join existing tenant
                tenant = tenantWithDomain;

                if (env.AUTOJOIN_SAME_DOMAIN) {
                    if (env.REQUIRE_OWNER_APPROVAL) {
                        // TODO: Create join request for owner approval
                        return reply.code(400).send({
                            error: 'Domain already claimed. Join request pending owner approval.'
                        });
                    } else {
                        userRole = 'FINANCE';
                    }
                } else {
                    return reply.code(400).send({
                        error: 'Domain already claimed. Invitation required.'
                    });
                }
            } else {
                // No tenant claims this domain
                if (signupMode === 'invite_only') {
                    return reply.code(400).send({
                        error: 'Registration is invite-only. Please request an invitation.'
                    });
                }

                if (signupMode === 'domain_claim' && env.WAITLIST_ENABLED) {
                    // TODO: Add to waitlist
                    return reply.code(400).send({
                        error: 'Domain not yet available. Added to waitlist.'
                    });
                }

                // Create new tenant (first user becomes OWNER)
                const name = tenantName || `${domain} Company`;
                tenant = await createTenant(name, domain);
                userRole = 'OWNER';
            }

            // Hash password
            const passwordHash = await hashPassword(password);

            // Create user
            const [user] = await db.insert(users).values({
                email,
                passwordHash,
                emailVerifiedAt: (!requireEmailVerification || (isDev && allowUnverifiedInDev)) ? new Date() : null,
            }).returning();

            // Link user to tenant
            if (!user || !tenant) {
                throw new Error('Failed to create user or tenant');
            }

            await db.insert(userTenants).values({
                userId: user.id,
                tenantId: tenant.id,
                role: userRole as any,
            });

            // Generate tokens
            if (!user || !tenant) {
                throw new Error('Failed to create user or tenant');
            }

            const accessToken = jwt.sign(
                { userId: user.id, tenantId: tenant.id },
                env.JWT_SECRET,
                { expiresIn: `${env.ACCESS_TTL_MIN}m` }
            );

            const { token: refreshToken } = await createRefreshToken(user.id, tenant.id);

            // Update last login
            await db.update(users)
                .set({ lastLoginAt: new Date() })
                .where(eq(users.id, user.id));

            const response: any = {
                user: {
                    id: user.id,
                    email: user.email,
                    emailVerified: !!user.emailVerifiedAt,
                    tenant: {
                        id: tenant.id,
                        name: tenant.name,
                        slug: tenant.slug,
                    },
                    role: userRole,
                },
                accessToken,
                refreshToken,
            };

            if (requireEmailVerification && !user.emailVerifiedAt) {
                // TODO: Send verification email
                response.emailVerificationRequired = true;
                response.message = 'Please check your email to verify your account.';
            }

            return reply.code(201).send(response);

        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Registration failed' });
        }
    });

    // Login endpoint
    fastify.post('/login', {
        schema: {
            body: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 1 }
                }
            }
        },
    }, async (request, reply) => {
        const { email, password } = request.body as { email: string; password: string };

        try {
            // Find user
            const userWithTenant = await db
                .select({
                    userId: users.id,
                    email: users.email,
                    passwordHash: users.passwordHash,
                    emailVerifiedAt: users.emailVerifiedAt,
                    tenantId: userTenants.tenantId,
                    role: userTenants.role,
                })
                .from(users)
                .innerJoin(userTenants, eq(users.id, userTenants.userId))
                .where(eq(users.email, email))
                .limit(1);

            if (userWithTenant.length === 0) {
                return reply.code(401).send({ error: 'Invalid credentials' });
            }

            const user = userWithTenant[0];

            if (!user) {
                return reply.code(401).send({ error: 'Invalid credentials' });
            }

            // Verify password
            const isValidPassword = await verifyPassword(password, user.passwordHash);
            if (!isValidPassword) {
                return reply.code(401).send({ error: 'Invalid credentials' });
            }

            // Check email verification
            const requireEmailVerification = env.REQUIRE_EMAIL_VERIFICATION;
            const allowUnverifiedInDev = env.ALLOW_UNVERIFIED_IN_DEV;
            const isDev = env.NODE_ENV === 'development';

            if (requireEmailVerification && !user.emailVerifiedAt && !(isDev && allowUnverifiedInDev)) {
                return reply.code(403).send({
                    error: 'Email verification required',
                    emailVerificationRequired: true
                });
            }

            // Generate tokens
            if (!user) {
                throw new Error('User not found');
            }

            const accessToken = jwt.sign(
                { userId: user.userId, tenantId: user.tenantId },
                env.JWT_SECRET,
                { expiresIn: `${env.ACCESS_TTL_MIN}m` }
            );

            const { token: refreshToken } = await createRefreshToken(user.userId, user.tenantId);

            // Update last login
            await db.update(users)
                .set({ lastLoginAt: new Date() })
                .where(eq(users.id, user.userId));

            return reply.send({
                user: {
                    id: user.userId,
                    email: user.email,
                    emailVerified: !!user.emailVerifiedAt,
                    tenant: {
                        id: user.tenantId,
                        role: user.role,
                    },
                },
                accessToken,
                refreshToken,
            });

        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Login failed' });
        }
    });

    // Refresh token endpoint
    fastify.post('/refresh', async (request, reply) => {
        const { refreshToken } = request.body as { refreshToken: string };

        if (!refreshToken) {
            return reply.code(401).send({ error: 'Refresh token required' });
        }

        try {
            const tokenHash = hashToken(refreshToken);

            // Find valid refresh token
            const tokenRecord = await db
                .select({
                    id: refreshTokens.id,
                    userId: refreshTokens.userId,
                    tenantId: refreshTokens.tenantId,
                    familyId: refreshTokens.familyId,
                    expiresAt: refreshTokens.expiresAt,
                })
                .from(refreshTokens)
                .where(
                    and(
                        eq(refreshTokens.tokenHash, tokenHash),
                        eq(refreshTokens.revoked, false)
                    )
                )
                .limit(1);

            if (tokenRecord.length === 0) {
                return reply.code(401).send({ error: 'Invalid refresh token' });
            }

            const token = tokenRecord[0];

            if (!token) {
                return reply.code(401).send({ error: 'Invalid refresh token' });
            }

            // Check expiration
            if (new Date() > token.expiresAt) {
                return reply.code(401).send({ error: 'Refresh token expired' });
            }

            // Revoke old token family
            await revokeRefreshTokenFamily(token.familyId);

            // Generate new tokens
            const accessToken = jwt.sign(
                { userId: token.userId, tenantId: token.tenantId },
                env.JWT_SECRET,
                { expiresIn: `${env.ACCESS_TTL_MIN}m` }
            );

            const { token: newRefreshToken } = await createRefreshToken(token.userId, token.tenantId);

            return reply.send({
                accessToken,
                refreshToken: newRefreshToken,
            });

        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Token refresh failed' });
        }
    });

    // Get current user endpoint
    fastify.get('/me', async (request, reply) => {
        if (!request.user) {
            return reply.code(401).send({ error: 'Authentication required' });
        }

        try {
            const userWithTenant = await db
                .select({
                    userId: users.id,
                    email: users.email,
                    emailVerifiedAt: users.emailVerifiedAt,
                    lastLoginAt: users.lastLoginAt,
                    tenantId: userTenants.tenantId,
                    role: userTenants.role,
                    tenantName: tenants.name,
                    tenantSlug: tenants.slug,
                })
                .from(users)
                .innerJoin(userTenants, eq(users.id, userTenants.userId))
                .innerJoin(tenants, eq(userTenants.tenantId, tenants.id))
                .where(eq(users.id, request.user.id))
                .limit(1);

            if (userWithTenant.length === 0) {
                return reply.code(404).send({ error: 'User not found' });
            }

            const user = userWithTenant[0];

            if (!user) {
                return reply.code(404).send({ error: 'User not found' });
            }

            return reply.send({
                user: {
                    id: user.userId,
                    email: user.email,
                    emailVerified: !!user.emailVerifiedAt,
                    lastLoginAt: user.lastLoginAt,
                    tenant: {
                        id: user.tenantId,
                        name: user.tenantName,
                        slug: user.tenantSlug,
                    },
                    role: user.role,
                },
            });

        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to get user info' });
        }
    });

    // Email verification endpoint
    fastify.post('/verify-email', {
        schema: {
            body: {
                type: 'object',
                required: ['token'],
                properties: {
                    token: { type: 'string', minLength: 1 }
                }
            }
        },
    }, async (request, reply) => {
        const { token } = request.body as { token: string };

        try {
            // TODO: Implement email verification token validation
            // For now, just return success
            return reply.send({
                message: 'Email verification endpoint - implementation pending',
                token
            });

        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Email verification failed' });
        }
    });
};
