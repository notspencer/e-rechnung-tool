-- Initialize database for E-Rechnung Tool development

-- Create database if it doesn't exist
CREATE DATABASE einvoice;

-- Connect to the database
\c einvoice;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Create application role
CREATE ROLE app_user;
GRANT CONNECT ON DATABASE einvoice TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT CREATE ON SCHEMA public TO app_user;

-- Set up RLS policies (will be created by migrations)
-- This is just a placeholder to show the structure

-- Grant permissions to app_user for all tables
-- (These will be updated by Drizzle migrations)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_user;

-- Create a test tenant for development
INSERT INTO tenants (id, slug, name, email_address, email_token) VALUES 
('123e4567-e89b-12d3-a456-426614174000', 'acme', 'ACME Consulting GmbH', 'invoices+acme+abc123@einvoice.e-rechnung.example', 'abc123');

-- Create a test user
INSERT INTO users (id, email, password_hash) VALUES 
('123e4567-e89b-12d3-a456-426614174001', 'admin@acme-consulting.de', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J1j5QqK2C'); -- password: admin123

-- Link user to tenant
INSERT INTO user_tenants (user_id, tenant_id, role) VALUES 
('123e4567-e89b-12d3-a456-426614174001', '123e4567-e89b-12d3-a456-426614174000', 'OWNER');

-- Create a test API key
INSERT INTO api_keys (id, tenant_id, name, prefix, secret_hash, scopes) VALUES 
('123e4567-e89b-12d3-a456-426614174002', '123e4567-e89b-12d3-a456-426614174000', 'Test API Key', 'pdm_live_', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J1j5QqK2C', ARRAY['ingest:email', 'read:invoice', 'export']);

COMMIT;
