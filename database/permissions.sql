
-- ==========================================
-- LETSPLAY: DATABASE PERMISSIONS
-- ==========================================

-- Scheme access
GRANT USAGE ON SCHEMA public
TO letsplay_readonly,
   letsplay_writeonly,
   letsplay_updateonly,
   letsplay_deleteonly;

-- Read permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public
TO letsplay_readonly;

-- Write permissions
GRANT INSERT ON ALL TABLES IN SCHEMA public
TO letsplay_writeonly;

-- Update permissions
GRANT UPDATE ON ALL TABLES IN SCHEMA public
TO letsplay_updateonly;

-- Delete permissions
GRANT DELETE ON ALL TABLES IN SCHEMA public
TO letsplay_deleteonly;

-- Admin additional permissions
GRANT TRUNCATE, REFERENCES, TRIGGER
ON ALL TABLES IN SCHEMA public
TO letsplay_admin;

-- Secuences permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public
TO letsplay_writeonly;
