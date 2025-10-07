/**
 * Fastify API server for E-Rechnung Tool
 */

import 'dotenv/config';
import Fastify from 'fastify';
import { loggingPlugin } from './plugins/logging.js';
import { authPlugin } from './plugins/auth.js';
import { rlsPlugin } from './plugins/rls.js';

// Extend Fastify types for multipart
declare module 'fastify' {
    interface FastifyRequest {
        file(): Promise<{
            filename: string;
            mimetype: string;
            toBuffer(): Promise<Buffer>;
        }>;
    }
}

// Create Fastify instance
const fastify = Fastify({
    logger: {
        level: process.env.LOG_LEVEL || 'info',
    },
});

// Register plugins
fastify.register(loggingPlugin);
fastify.register(require('@fastify/multipart'));
fastify.register(require('@fastify/static'), {
    root: require('path').join(__dirname, '../public'),
    prefix: '/',
});
fastify.register(authPlugin);
fastify.register(rlsPlugin);

// Health check endpoint
fastify.get('/health', async () => {
    return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    };
});

// API routes (to be implemented)
fastify.register(async function (fastify) {
    // Auth routes
    fastify.post('/api/auth/login', async () => {
        // TODO: Implement login
        return { message: 'Login endpoint - TODO' };
    });

    // Invoice routes
    fastify.post('/api/invoices/upload', async (request, reply) => {
        try {
            const data = await request.file();

            if (!data) {
                return reply.status(400).send({ error: 'No file uploaded' });
            }

            const buffer = await data.toBuffer();
            const filename = data.filename;
            const mimetype = data.mimetype;

            // Validate file type
            if (!mimetype.includes('xml') && !mimetype.includes('pdf')) {
                return reply.status(400).send({
                    error: 'Invalid file type. Only XML and PDF files are supported.'
                });
            }

            // Import required modules
            const { db } = await import('./db/client.js');
            const { invoices, suppliers, events } = await import('./db/schema.js');
            const { eq } = await import('drizzle-orm');
            const crypto = await import('crypto');

            // Calculate checksum
            const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

            // Check for duplicate (deduplication)
            const existingInvoice = await db
                .select({ id: invoices.id })
                .from(invoices)
                .where(eq(invoices.checksum, checksum))
                .limit(1);

            if (existingInvoice.length > 0) {
                return reply.status(409).send({
                    error: 'Duplicate invoice detected',
                    invoiceId: existingInvoice[0]?.id,
                    message: 'An invoice with the same content already exists'
                });
            }

            let parsedInvoice;
            let validationResult;
            let supplierId;

            if (mimetype.includes('xml')) {
                // Parse XML invoice - simplified for now
                try {
                    // Basic XML parsing - extract key fields
                    const xmlContent = buffer.toString('utf-8');

                    // Extract invoice number (simplified regex)
                    const invoiceNumberMatch = xmlContent.match(/<cbc:ID[^>]*>([^<]+)<\/cbc:ID>/);
                    const invoiceNumber = invoiceNumberMatch ? invoiceNumberMatch[1] : filename.replace('.xml', '');

                    // Extract issue date
                    const issueDateMatch = xmlContent.match(/<cbc:IssueDate[^>]*>([^<]+)<\/cbc:IssueDate>/);
                    const issueDate = issueDateMatch ? issueDateMatch[1] : new Date().toISOString().split('T')[0];

                    // Extract totals (simplified)
                    const totalGrossMatch = xmlContent.match(/<cac:TaxTotal[^>]*>[\s\S]*?<cbc:TaxAmount[^>]*>([^<]+)<\/cbc:TaxAmount>/);
                    const totalGross = totalGrossMatch ? totalGrossMatch[1] : '0.00';

                    parsedInvoice = {
                        invoiceNumber,
                        issueDate,
                        currency: 'EUR',
                        totalNet: '0.00',
                        totalTax: '0.00',
                        totalGross,
                        seller: { name: 'Unknown Supplier', vatId: '', email: '' },
                        buyer: { name: 'Unknown Buyer', vatId: '', email: '' },
                        lineItems: [],
                    };

                    validationResult = {
                        valid: true,
                        errors: [],
                        warnings: [{ code: 'XML_PARSED', message: 'Basic XML parsing completed' }]
                    };

                    // Create a default supplier for now
                    const newSupplier = await db.insert(suppliers).values({
                        tenantId: (request as any).tenantId,
                        name: 'Unknown Supplier',
                        vatId: '',
                        email: '',
                        address: null,
                    }).returning({ id: suppliers.id });
                    supplierId = newSupplier[0]?.id;

                } catch (parseError) {
                    request.log.error({ error: parseError }, 'XML parsing failed');
                    return reply.status(400).send({
                        error: 'Invalid XML format',
                        details: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
                    });
                }
            } else {
                // PDF handling - create manual entry
                parsedInvoice = {
                    invoiceNumber: filename.replace('.pdf', ''),
                    issueDate: new Date().toISOString().split('T')[0],
                    currency: 'EUR',
                    totalNet: '0.00',
                    totalTax: '0.00',
                    totalGross: '0.00',
                    seller: { name: 'Unknown', vatId: '', email: '' },
                    buyer: { name: 'Unknown', vatId: '', email: '' },
                    lineItems: [],
                };
                validationResult = {
                    valid: false,
                    errors: [{ code: 'MANUAL_REQUIRED', message: 'PDF requires manual data entry' }],
                    warnings: []
                };

                // Create a default supplier for PDF
                const newSupplier = await db.insert(suppliers).values({
                    tenantId: (request as any).tenantId,
                    name: 'Unknown Supplier',
                    vatId: '',
                    email: '',
                    address: null,
                }).returning({ id: suppliers.id });
                supplierId = newSupplier[0]?.id;
            }

            // Determine invoice status based on validation
            let status = 'PENDING';
            if (validationResult.valid) {
                status = 'VALID';
            } else if (validationResult.errors.some((e: any) => e.level === 'FAIL')) {
                status = 'FAILED';
            }

            // Store invoice in database
            const invoiceData = {
                tenantId: (request as any).tenantId,
                supplierId: supplierId,
                type: (mimetype.includes('xml') ? 'e_invoice' : 'other') as 'e_invoice' | 'other',
                format: mimetype.includes('xml') ? 'xrechnung' : 'pdf',
                status: status as 'PENDING' | 'VALID' | 'FAILED' | 'ARCHIVED' | 'MANUAL',
                invoiceNumber: parsedInvoice.invoiceNumber || 'UNKNOWN',
                issueDate: (parsedInvoice.issueDate || new Date().toISOString().split('T')[0]) as string,
                currency: parsedInvoice.currency,
                totalNet: parsedInvoice.totalNet,
                totalTax: parsedInvoice.totalTax,
                totalGross: parsedInvoice.totalGross || '0.00',
                sellerData: parsedInvoice.seller,
                buyerData: parsedInvoice.buyer,
                lineItems: parsedInvoice.lineItems,
                validation: validationResult,
                xmlBlobKey: mimetype.includes('xml') ? `invoices/${Date.now()}/${filename}` : null,
                pdfBlobKey: mimetype.includes('pdf') ? `invoices/${Date.now()}/${filename}` : null,
                checksum: checksum,
                source: 'manual_upload' as 'email' | 'manual_upload' | 'imap',
            };

            const newInvoice = await db.insert(invoices).values(invoiceData).returning({ id: invoices.id });

            // Create event record
            await db.insert(events).values({
                tenantId: (request as any).tenantId,
                invoiceId: newInvoice[0]?.id,
                type: 'invoice_received',
                payload: {
                    filename,
                    mimetype,
                    size: buffer.length,
                    source: 'manual_upload',
                },
                userId: (request as any).user?.id,
            });

            // TODO: Store file in blob storage
            // For now, we just store the metadata

            return {
                message: 'File uploaded and processed successfully',
                invoiceId: newInvoice[0]?.id,
                filename,
                mimetype,
                size: buffer.length,
                status,
                validation: validationResult,
                tenantId: (request as any).tenantId,
            };
        } catch (error) {
            request.log.error({ error }, 'Upload failed');
            return reply.status(500).send({ error: 'Upload failed' });
        }
    });

    fastify.get('/api/invoices', async (request, reply) => {
        try {
            const query = request.query as any;
            const limit = Math.min(parseInt(query.limit) || 50, 100);
            const offset = parseInt(query.offset) || 0;
            const status = query.status;
            const supplierId = query.supplier_id;

            // Import database client and schema
            const { db } = await import('./db/client.js');
            const { invoices, suppliers } = await import('./db/schema.js');
            const { eq, and, desc, count } = await import('drizzle-orm');

            // Build where conditions
            const conditions = [];
            if (status) {
                conditions.push(eq(invoices.status, status));
            }
            if (supplierId) {
                conditions.push(eq(invoices.supplierId, supplierId));
            }

            // Get invoices with supplier info
            const invoiceList = await db
                .select({
                    id: invoices.id,
                    invoiceNumber: invoices.invoiceNumber,
                    issueDate: invoices.issueDate,
                    currency: invoices.currency,
                    totalNet: invoices.totalNet,
                    totalTax: invoices.totalTax,
                    totalGross: invoices.totalGross,
                    status: invoices.status,
                    supplierName: suppliers.name,
                    supplierEmail: suppliers.email,
                    receivedAt: invoices.receivedAt,
                    createdAt: invoices.createdAt,
                })
                .from(invoices)
                .leftJoin(suppliers, eq(invoices.supplierId, suppliers.id))
                .where(conditions.length > 0 ? and(...conditions) : undefined)
                .orderBy(desc(invoices.createdAt))
                .limit(limit)
                .offset(offset);

            // Get total count
            const totalResult = await db
                .select({ count: count() })
                .from(invoices)
                .where(conditions.length > 0 ? and(...conditions) : undefined);

            const total = totalResult[0]?.count || 0;

            return {
                invoices: invoiceList,
                pagination: {
                    limit,
                    offset,
                    total,
                    hasMore: offset + limit < total,
                },
                filters: {
                    status,
                    supplierId,
                },
            };
        } catch (error) {
            request.log.error({ error }, 'Failed to list invoices');
            return reply.status(500).send({ error: 'Failed to list invoices' });
        }
    });

    fastify.get('/api/invoices/:id', async (request, reply) => {
        try {
            const params = request.params as any;
            const invoiceId = params.id;

            if (!invoiceId) {
                return reply.status(400).send({ error: 'Invoice ID is required' });
            }

            // Import database client and schema
            const { db } = await import('./db/client.js');
            const { invoices, suppliers } = await import('./db/schema.js');
            const { eq } = await import('drizzle-orm');

            // Get invoice with supplier info
            const invoiceResult = await db
                .select({
                    id: invoices.id,
                    invoiceNumber: invoices.invoiceNumber,
                    issueDate: invoices.issueDate,
                    currency: invoices.currency,
                    totalNet: invoices.totalNet,
                    totalTax: invoices.totalTax,
                    totalGross: invoices.totalGross,
                    status: invoices.status,
                    type: invoices.type,
                    format: invoices.format,
                    sellerData: invoices.sellerData,
                    buyerData: invoices.buyerData,
                    lineItems: invoices.lineItems,
                    paymentTerms: invoices.paymentTerms,
                    validation: invoices.validation,
                    manualData: invoices.manualData,
                    xmlBlobKey: invoices.xmlBlobKey,
                    pdfBlobKey: invoices.pdfBlobKey,
                    checksum: invoices.checksum,
                    source: invoices.source,
                    supplierName: suppliers.name,
                    supplierVatId: suppliers.vatId,
                    supplierEmail: suppliers.email,
                    supplierAddress: suppliers.address,
                    receivedAt: invoices.receivedAt,
                    archivedAt: invoices.archivedAt,
                    createdAt: invoices.createdAt,
                })
                .from(invoices)
                .leftJoin(suppliers, eq(invoices.supplierId, suppliers.id))
                .where(eq(invoices.id, invoiceId))
                .limit(1);

            if (invoiceResult.length === 0) {
                return reply.status(404).send({ error: 'Invoice not found' });
            }

            return {
                invoice: invoiceResult[0],
            };
        } catch (error) {
            request.log.error({ error }, 'Failed to get invoice');
            return reply.status(500).send({ error: 'Failed to get invoice' });
        }
    });

    fastify.post('/api/invoices/:id/archive', async (request, reply) => {
        try {
            const params = request.params as any;
            const invoiceId = params.id;

            if (!invoiceId) {
                return reply.status(400).send({ error: 'Invoice ID is required' });
            }

            // Import database client and schema
            const { db } = await import('./db/client.js');
            const { invoices, events } = await import('./db/schema.js');
            const { eq } = await import('drizzle-orm');

            // Check if invoice exists
            const existingInvoice = await db
                .select({ id: invoices.id, status: invoices.status })
                .from(invoices)
                .where(eq(invoices.id, invoiceId))
                .limit(1);

            if (existingInvoice.length === 0) {
                return reply.status(404).send({ error: 'Invoice not found' });
            }

            if (existingInvoice[0]?.status === 'ARCHIVED') {
                return reply.status(400).send({ error: 'Invoice is already archived' });
            }

            const archivedAt = new Date();

            // Update invoice status
            await db
                .update(invoices)
                .set({
                    status: 'ARCHIVED',
                    archivedAt: archivedAt,
                })
                .where(eq(invoices.id, invoiceId));

            // Create event record
            await db.insert(events).values({
                tenantId: (request as any).tenantId,
                invoiceId: invoiceId,
                type: 'invoice_archived',
                payload: {
                    archivedAt: archivedAt.toISOString(),
                    archivedBy: (request as any).user?.id || (request as any).apiKey?.id,
                },
                userId: (request as any).user?.id,
            });

            return {
                message: 'Invoice archived successfully',
                invoiceId,
                archivedAt: archivedAt.toISOString(),
            };
        } catch (error) {
            request.log.error({ error }, 'Failed to archive invoice');
            return reply.status(500).send({ error: 'Failed to archive invoice' });
        }
    });

    // Export routes
    fastify.post('/api/exports', async (request, reply) => {
        try {
            const body = request.body as any;
            const { format, fromDate, toDate, filters } = body;

            if (!format || !fromDate || !toDate) {
                return reply.status(400).send({
                    error: 'Format, fromDate, and toDate are required'
                });
            }

            // TODO: Implement actual export creation with RLS
            // For now, return mock export
            return {
                export: {
                    id: 'export-' + Date.now(),
                    status: 'PENDING',
                    format,
                    fromDate,
                    toDate,
                    filters: filters || {},
                    createdAt: new Date().toISOString(),
                },
            };
        } catch (error) {
            request.log.error({ error }, 'Failed to create export');
            return reply.status(500).send({ error: 'Failed to create export' });
        }
    });

    fastify.get('/api/exports/:id', async (request, reply) => {
        try {
            const params = request.params as any;
            const exportId = params.id;

            if (!exportId) {
                return reply.status(400).send({ error: 'Export ID is required' });
            }

            // TODO: Implement actual database query with RLS
            // For now, return mock data
            return {
                export: {
                    id: exportId,
                    status: 'COMPLETED',
                    format: 'csv',
                    fromDate: '2024-01-01',
                    toDate: '2024-01-31',
                    invoiceCount: '10',
                    blobKey: 'exports/202401/bundle.zip',
                    checksum: 'sha256:abc123...',
                    createdAt: new Date().toISOString(),
                    completedAt: new Date().toISOString(),
                },
            };
        } catch (error) {
            request.log.error({ error }, 'Failed to get export');
            return reply.status(500).send({ error: 'Failed to get export' });
        }
    });

    // Analytics routes
    fastify.get('/api/analytics/summary', async (request, reply) => {
        try {
            const query = request.query as any;
            const fromDate = query.from_date;
            const toDate = query.to_date;

            // Import database client and schema
            const { db } = await import('./db/client.js');
            const { invoices, suppliers } = await import('./db/schema.js');
            const { eq, and, gte, lte, sum, count, desc } = await import('drizzle-orm');

            // Build date filter conditions
            const dateConditions = [];
            if (fromDate) {
                dateConditions.push(gte(invoices.issueDate, fromDate));
            }
            if (toDate) {
                dateConditions.push(lte(invoices.issueDate, toDate));
            }

            // Get total invoices and amount
            const totalResult = await db
                .select({
                    count: count(),
                    totalAmount: sum(invoices.totalGross),
                })
                .from(invoices)
                .where(dateConditions.length > 0 ? and(...dateConditions) : undefined);

            // Get status breakdown
            const statusBreakdown = await db
                .select({
                    status: invoices.status,
                    count: count(),
                })
                .from(invoices)
                .where(dateConditions.length > 0 ? and(...dateConditions) : undefined)
                .groupBy(invoices.status);

            // Get top suppliers
            const topSuppliers = await db
                .select({
                    supplierName: suppliers.name,
                    supplierVatId: suppliers.vatId,
                    count: count(),
                    totalAmount: sum(invoices.totalGross),
                })
                .from(invoices)
                .leftJoin(suppliers, eq(invoices.supplierId, suppliers.id))
                .where(dateConditions.length > 0 ? and(...dateConditions) : undefined)
                .groupBy(suppliers.name, suppliers.vatId)
                .orderBy(desc(count()))
                .limit(10);

            // Get monthly trend (simplified - would need more complex query for real implementation)
            const monthlyTrend = await db
                .select({
                    month: invoices.issueDate,
                    count: count(),
                    totalAmount: sum(invoices.totalGross),
                })
                .from(invoices)
                .where(dateConditions.length > 0 ? and(...dateConditions) : undefined)
                .groupBy(invoices.issueDate)
                .orderBy(invoices.issueDate)
                .limit(12);

            // Format results
            const statusBreakdownObj = {
                PENDING: 0,
                VALID: 0,
                FAILED: 0,
                ARCHIVED: 0,
                MANUAL: 0,
            };

            statusBreakdown.forEach(item => {
                statusBreakdownObj[item.status as keyof typeof statusBreakdownObj] = item.count;
            });

            return {
                summary: {
                    totalInvoices: totalResult[0]?.count || 0,
                    totalAmount: totalResult[0]?.totalAmount || '0.00',
                    currency: 'EUR',
                    statusBreakdown: statusBreakdownObj,
                    topSuppliers: topSuppliers.map(s => ({
                        name: s.supplierName,
                        vatId: s.supplierVatId,
                        invoiceCount: s.count,
                        totalAmount: s.totalAmount,
                    })),
                    monthlyTrend: monthlyTrend.map(m => ({
                        month: m.month,
                        invoiceCount: m.count,
                        totalAmount: m.totalAmount,
                    })),
                },
                period: {
                    fromDate: fromDate || '2024-01-01',
                    toDate: toDate || '2024-12-31',
                },
            };
        } catch (error) {
            request.log.error({ error }, 'Failed to get analytics');
            return reply.status(500).send({ error: 'Failed to get analytics' });
        }
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
