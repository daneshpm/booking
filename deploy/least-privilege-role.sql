-- Least-privilege application role.
--
-- Every container currently connects as the Postgres superuser. That is more
-- authority than the application has ever needed at runtime: migrations are a
-- separate step, and superuser additionally grants COPY ... FROM PROGRAM,
-- which turns any SQL-injection or compromised-process foothold into command
-- execution on the database container.
--
-- This role can read and write rows and nothing else. It deliberately cannot
-- create, alter or drop objects, so `prisma migrate deploy` must keep running
-- as the superuser.
--
-- Usage (psql, connected to the application database as a superuser):
--     \set app_password 'the-password'
--     \i least-privilege-role.sql
--
-- Idempotent: safe to re-run, including after a migration adds tables.

\set ON_ERROR_STOP on

-- Created without privileges; everything it can do is granted explicitly below.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bookings_app') THEN
    CREATE ROLE bookings_app LOGIN;
  END IF;
END
$$;

ALTER ROLE bookings_app WITH PASSWORD :'app_password';

-- No inherited superuser-adjacent authority.
ALTER ROLE bookings_app NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;

GRANT CONNECT ON DATABASE bookings_prod TO bookings_app;
GRANT USAGE ON SCHEMA public TO bookings_app;

-- Row-level access to what exists today.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bookings_app;

-- Prisma's uuid defaults are generated client-side, but sequences still back
-- any serial columns a future migration introduces.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO bookings_app;

-- And to whatever the next migration creates, so this does not have to be
-- re-run after every deploy. Applies to objects created by the superuser,
-- which is the role migrations run as.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO bookings_app;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO bookings_app;

-- Explicitly withheld, as a statement of intent rather than a no-op: CREATE on
-- the schema would let this role add objects the migration history does not
-- know about.
REVOKE CREATE ON SCHEMA public FROM bookings_app;
