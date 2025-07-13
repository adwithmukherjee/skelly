-- Initial database setup for Skelly
-- This script runs when the PostgreSQL container is first created

-- Enable useful extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create a development user with limited privileges (optional)
-- CREATE USER skelly_dev WITH PASSWORD 'dev_password';
-- GRANT CREATE ON DATABASE skelly_dev TO skelly_dev;

-- Create initial schema
CREATE SCHEMA IF NOT EXISTS public;

-- Set search path
SET search_path TO public;

-- Add any initial tables or seed data here
-- Example: Create a migrations tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);