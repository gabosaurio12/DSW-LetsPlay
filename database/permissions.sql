-- ==========================================
-- LETSPLAY: DATABASE PERMISSIONS
-- Run after tables.sql, connected to the letsplay database.
-- ==========================================

-- Schema access
GRANT USAGE ON SCHEMA public
TO letsplay_readonly,
   letsplay_writeonly,
   letsplay_updateonly,
   letsplay_deleteonly;

-- No role reads base tables directly: the views below are the only read
-- surface for guest and user, and they never expose password_hash or email.
REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM PUBLIC, letsplay_readonly;

-- Views that use app.current_user_id return no rows until the backend sets
-- it with SET LOCAL at the start of each request transaction.

CREATE VIEW "v_public_videogame" AS
SELECT "id_videogame", "name", "description", "genre", "platform",
       "cover_url", "additional_info", "created_at", "status"
FROM "Videogames"
WHERE "status" = 'ACTIVE';

CREATE VIEW "v_public_community" AS
SELECT "id_community", "name", "description", "type", "image_url",
       "rules", "created_at", "updated_at"
FROM "Communities"
WHERE "status" = 'ACTIVE' AND "type" = 'PUBLIC';

CREATE VIEW "v_user_profile" AS
SELECT u."id_user", u."username", u."display_name", u."description",
       u."profile_photo_url", u."created_at", u."account_status"
FROM "User" u
WHERE u."account_status" = 'ACTIVE'
  AND NOT EXISTS (
    SELECT 1 FROM "Blocks" b
    WHERE (b."id_blocker" = u."id_user"
           AND b."id_blocked" = current_setting('app.current_user_id', true)::uuid)
       OR (b."id_blocker" = current_setting('app.current_user_id', true)::uuid
           AND b."id_blocked" = u."id_user")
  );

CREATE VIEW "v_user_post" AS
SELECT p."id_post", p."id_user", p."id_videogame", p."id_community",
       p."content", p."image_url", p."created_at", p."updated_at"
FROM "Post" p
WHERE p."status" = 'ACTIVE'
  AND (
    p."id_community" IS NULL
    OR EXISTS (
      SELECT 1 FROM "Communities" c
      WHERE c."id_community" = p."id_community"
        AND c."type" = 'PUBLIC' AND c."status" = 'ACTIVE'
    )
    OR EXISTS (
      SELECT 1 FROM "CommunityMembers" m
      WHERE m."id_community" = p."id_community"
        AND m."id_user" = current_setting('app.current_user_id', true)::uuid
    )
  )
  AND NOT EXISTS (
    SELECT 1 FROM "Blocks" b
    WHERE (b."id_blocker" = p."id_user"
           AND b."id_blocked" = current_setting('app.current_user_id', true)::uuid)
       OR (b."id_blocker" = current_setting('app.current_user_id', true)::uuid
           AND b."id_blocked" = p."id_user")
  );

CREATE VIEW "v_user_comment" AS
SELECT c."id_comment", c."id_post", c."id_user", c."content", c."created_at"
FROM "Comment" c
WHERE EXISTS (SELECT 1 FROM "v_user_post" p WHERE p."id_post" = c."id_post")
  AND NOT EXISTS (
    SELECT 1 FROM "Blocks" b
    WHERE (b."id_blocker" = c."id_user"
           AND b."id_blocked" = current_setting('app.current_user_id', true)::uuid)
       OR (b."id_blocker" = current_setting('app.current_user_id', true)::uuid
           AND b."id_blocked" = c."id_user")
  );

CREATE VIEW "v_user_conversation" AS
SELECT "id_conversation", "id_user_1", "id_user_2", "created_at"
FROM "Conversation"
WHERE "id_user_1" = current_setting('app.current_user_id', true)::uuid
   OR "id_user_2" = current_setting('app.current_user_id', true)::uuid;

CREATE VIEW "v_user_message" AS
SELECT "id_message", "id_conversation", "id_sender", "id_recipient",
       "content", "sent_at"
FROM "Message"
WHERE "id_conversation" IN (
  SELECT "id_conversation" FROM "v_user_conversation"
);

CREATE VIEW "v_user_report" AS
SELECT "id_report", "content_type", "id_reported_content", "reason",
       "description", "status", "created_at", "reviewed_at"
FROM "Report"
WHERE "id_reporter" = current_setting('app.current_user_id', true)::uuid;

-- Read permissions
GRANT SELECT ON "v_public_videogame", "v_public_community" TO letsplay_guest;

GRANT SELECT ON
   "v_public_videogame",
   "v_public_community",
   "v_user_profile",
   "v_user_post",
   "v_user_comment",
   "v_user_conversation",
   "v_user_message",
   "v_user_report"
TO letsplay_user;

-- Write permissions
GRANT INSERT ON ALL TABLES IN SCHEMA public
TO letsplay_writeonly;

-- Update permissions
GRANT UPDATE ON ALL TABLES IN SCHEMA public
TO letsplay_updateonly;

-- Delete permissions
GRANT DELETE ON ALL TABLES IN SCHEMA public
TO letsplay_deleteonly;

-- Admin keeps direct access to base tables for moderation and maintenance
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON ALL TABLES IN SCHEMA public
TO letsplay_admin;

-- Future tables created by the script owner should also be usable by admin.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO letsplay_admin;
