-- Seed data migration for E-Rechnung Tool
-- This migration creates test data for development

-- Insert test tenant
INSERT INTO tenants (id, slug, name, email_address, email_token) VALUES 
('123e4567-e89b-12d3-a456-426614174000', 'acme', 'ACME Consulting GmbH', 'invoices+acme+abc123@einvoice.e-rechnung.example', 'abc123');

-- Insert test user (password: admin123)
INSERT INTO users (id, email, password_hash) VALUES 
('123e4567-e89b-12d3-a456-426614174001', 'admin@acme-consulting.de', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J1j5QqK2C');

-- Link user to tenant
INSERT INTO user_tenants (user_id, tenant_id, role) VALUES 
('123e4567-e89b-12d3-a456-426614174001', '123e4567-e89b-12d3-a456-426614174000', 'OWNER');

-- Insert test API key (prefix: pdm_live_, secret: test_secret_123)
INSERT INTO api_keys (id, tenant_id, name, prefix, secret_hash, scopes) VALUES 
('123e4567-e89b-12d3-a456-426614174002', '123e4567-e89b-12d3-a456-426614174000', 'Test API Key', 'pdm_live_', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J1j5QqK2C', ARRAY['ingest:email', 'read:invoice', 'export']);

-- Insert test supplier
INSERT INTO suppliers (id, tenant_id, name, vat_id, email, address) VALUES 
('123e4567-e89b-12d3-a456-426614174003', '123e4567-e89b-12d3-a456-426614174000', 'Beta Corporation Ltd', 'DE987654321', 'billing@beta-corp.de', '{"country": "DE", "city": "Munich", "postalCode": "80331", "street": "Business Avenue 456"}');

-- Insert test invoice
INSERT INTO invoices (
    id, tenant_id, supplier_id, type, format, status, invoice_number, issue_date, currency,
    total_net, total_tax, total_gross, seller_data, buyer_data, line_items, validation,
    checksum, source
) VALUES (
    '123e4567-e89b-12d3-a456-426614174004',
    '123e4567-e89b-12d3-a456-426614174000',
    '123e4567-e89b-12d3-a456-426614174003',
    'e_invoice',
    'xrechnung_ubl',
    'VALID',
    'INV-2024-001',
    '2024-01-15',
    'EUR',
    2000.00,
    380.00,
    2380.00,
    '{"name": "ACME Consulting GmbH", "vatId": "DE123456789", "address": {"country": "DE", "city": "Berlin"}}',
    '{"name": "Beta Corporation Ltd", "vatId": "DE987654321", "address": {"country": "DE", "city": "Munich"}}',
    '[{"id": "1", "description": "Consulting services", "quantity": 40, "unit": "HUR", "unitPrice": 50.00, "netAmount": 2000.00, "taxRate": 19.00, "taxAmount": 380.00}]',
    '{"status": "PASS", "errors": [], "warnings": []}',
    'sha256:abc123def456',
    'email'
);

-- Insert test events
INSERT INTO events (id, tenant_id, invoice_id, type, payload, user_id) VALUES 
('123e4567-e89b-12d3-a456-426614174005', '123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174004', 'invoice_received', '{"invoiceId": "123e4567-e89b-12d3-a456-426614174004", "format": "xrechnung_ubl", "source": "email"}', '123e4567-e89b-12d3-a456-426614174001'),
('123e4567-e89b-12d3-a456-426614174006', '123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174004', 'validation_completed', '{"invoiceId": "123e4567-e89b-12d3-a456-426614174004", "status": "PASS", "errorCount": 0, "warningCount": 0}', '123e4567-e89b-12d3-a456-426614174001');
