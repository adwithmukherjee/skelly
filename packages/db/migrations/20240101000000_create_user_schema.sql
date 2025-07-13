-- +migrate Up

-- Create user schema
CREATE SCHEMA IF NOT EXISTS "user";

-- Create users table
CREATE TABLE IF NOT EXISTS "user"."users" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL UNIQUE,
  "username" TEXT UNIQUE,
  "password_hash" TEXT NOT NULL,
  "first_name" TEXT,
  "last_name" TEXT,
  "role" TEXT NOT NULL DEFAULT 'user' CHECK ("role" IN ('user', 'admin', 'moderator')),
  "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_login_at" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "user"."users" ("email");
CREATE INDEX IF NOT EXISTS "idx_users_username" ON "user"."users" ("username") WHERE "username" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_users_role" ON "user"."users" ("role");
CREATE INDEX IF NOT EXISTS "idx_users_created_at" ON "user"."users" ("created_at");

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE
    ON "user"."users" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- +migrate Down

-- Drop trigger and function
DROP TRIGGER IF EXISTS update_users_updated_at ON "user"."users";
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop indexes
DROP INDEX IF EXISTS "user"."idx_users_created_at";
DROP INDEX IF EXISTS "user"."idx_users_role";
DROP INDEX IF EXISTS "user"."idx_users_username";
DROP INDEX IF EXISTS "user"."idx_users_email";

-- Drop table
DROP TABLE IF EXISTS "user"."users";

-- Drop schema
DROP SCHEMA IF EXISTS "user";
