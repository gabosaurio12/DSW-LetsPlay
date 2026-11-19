-- Database creation is documented in README.md: it must be run once,
-- connected to "postgres" and outside a transaction block.

-- ==========================================
-- LETSPLAY: ROLE DEFINITIONS
-- ==========================================

-- PostgreSQL does not support IF NOT EXISTS for CREATE ROLE/CREATE USER,
-- so pg_roles is checked explicitly to keep this script re-runnable.
DO $$
BEGIN
  -- Permission roles
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'letsplay_readonly') THEN
    CREATE ROLE letsplay_readonly NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'letsplay_writeonly') THEN
    CREATE ROLE letsplay_writeonly NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'letsplay_updateonly') THEN
    CREATE ROLE letsplay_updateonly NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'letsplay_deleteonly') THEN
    CREATE ROLE letsplay_deleteonly NOLOGIN;
  END IF;

  -- Demo credentials: replace them before any non-local deployment.
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'letsplay_admin') THEN
    CREATE USER letsplay_admin WITH PASSWORD 'adminPl4y';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'letsplay_guest') THEN
    CREATE USER letsplay_guest WITH PASSWORD 'guestPl4y';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'letsplay_user') THEN
    CREATE USER letsplay_user WITH PASSWORD 'userPl4y';
  END IF;
END
$$;

-- Roles assignation

-- Admin
GRANT letsplay_readonly TO letsplay_admin;
GRANT letsplay_writeonly TO letsplay_admin;
GRANT letsplay_updateonly TO letsplay_admin;
GRANT letsplay_deleteonly TO letsplay_admin;

-- Guest
GRANT letsplay_readonly TO letsplay_guest;

-- User
GRANT letsplay_readonly TO letsplay_user;
GRANT letsplay_writeonly TO letsplay_user;
GRANT letsplay_updateonly TO letsplay_user;
