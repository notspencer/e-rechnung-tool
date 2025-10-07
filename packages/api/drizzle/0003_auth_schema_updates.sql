-- Migration: Add auth schema updates for domain claim and refresh tokens
-- Generated: 2025-01-07

-- Add new columns to existing tables
ALTER TABLE "tenants" ADD COLUMN "claimed_domains" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamptz;
ALTER TABLE "users" ADD COLUMN "last_login_at" timestamptz;

-- Create refresh_tokens table
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"family_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"revoked" boolean DEFAULT false NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"expires_at" timestamptz NOT NULL
);

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_user_id" ON "refresh_tokens" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_tenant_id" ON "refresh_tokens" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_family_id" ON "refresh_tokens" ("family_id");
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_expires_at" ON "refresh_tokens" ("expires_at");
CREATE INDEX IF NOT EXISTS "idx_users_email_verified_at" ON "users" ("email_verified_at");

-- Add RLS policies for refresh_tokens
ALTER TABLE "refresh_tokens" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "refresh_tokens_tenant_isolation" ON "refresh_tokens"
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);