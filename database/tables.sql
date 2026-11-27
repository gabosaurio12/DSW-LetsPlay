CREATE TYPE "request_status" AS ENUM (
  'PENDING',
  'ACCEPTED',
  'REJECTED'
);

CREATE TYPE "community_type" AS ENUM (
  'PUBLIC',
  'PRIVATE'
);

CREATE TYPE "community_role" AS ENUM (
  'ADMIN',
  'MEMBER'
);

CREATE TYPE "account_status" AS ENUM (
  'ACTIVE',
  'DELETED'
);

CREATE TYPE "post_status" AS ENUM (
  'ACTIVE',
  'DELETED'
);

CREATE TYPE "videogame_status" AS ENUM (
  'ACTIVE',
  'DISABLED'
);

CREATE TYPE "community_status" AS ENUM (
  'ACTIVE',
  'DELETED'
);

CREATE TYPE "gender" AS ENUM (
  'UNDEFINED',
  'MALE',
  'FEMALE',
  'NON_BINARY',
  'OTHER'
);

CREATE TYPE "report_content_type" AS ENUM (
  'POST',
  'COMMENT',
  'USER',
  'COMMUNITY'
);

CREATE TYPE "report_reason" AS ENUM (
  'TOXICITY',
  'INAPPROPRIATE',
  'SPAM',
  'SPOILER',
  'PIRACY',
  'OTHER'
);

CREATE TYPE "report_status" AS ENUM (
  'PENDING',
  'IN_REVIEW',
  'ATTENDED',
  'CLOSED'
);

CREATE TYPE "poll_status" AS ENUM (
  'ACTIVE',
  'CLOSED'
);

CREATE TYPE "play_style" AS ENUM (
  'CASUAL',
  'COMPETITIVE',
  'COOPERATIVE',
  'INDIFFERENT'
);

CREATE TYPE "lfg_post_status" AS ENUM (
  'OPEN',
  'COMPLETE',
  'CANCELLED'
);

CREATE TABLE "User" (
  "id_user" uuid PRIMARY KEY,
  "username" varchar(12) UNIQUE NOT NULL,
  "email" varchar(255) UNIQUE NOT NULL,
  "birth_date" date NOT NULL,
  "gender" gender NOT NULL,
  "password_hash" varchar(255) NOT NULL,
  "display_name" varchar(100),
  "description" text,
  "profile_photo_url" varchar(500),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz,
  "account_status" account_status NOT NULL,
  CONSTRAINT "chk_user_username_format" CHECK ("username" ~ '^[A-Za-z0-9_]+$')
);

CREATE TABLE "UserVideogames" (
  "id_user" uuid,
  "id_videogame" uuid,
  "added_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id_user", "id_videogame")
);

CREATE TABLE "GamerPreference" (
  "id_preference" uuid PRIMARY KEY,
  "id_user" uuid NOT NULL UNIQUE,
  "favorite_genres" jsonb NOT NULL,
  "active_platforms" jsonb NOT NULL,
  "availability" jsonb NOT NULL,
  "preferred_style" play_style NOT NULL DEFAULT 'INDIFFERENT',
  "looking_to_play" boolean NOT NULL DEFAULT true,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "chk_preference_genres_range" CHECK (jsonb_array_length("favorite_genres") BETWEEN 1 AND 5),
  CONSTRAINT "chk_preference_platforms_range" CHECK (jsonb_array_length("active_platforms") BETWEEN 1 AND 5),
  CONSTRAINT "chk_preference_availability_range" CHECK (jsonb_array_length("availability") >= 1)
);

CREATE TABLE "ActiveSessions" (
  "token_hash" varchar(64) PRIMARY KEY,
  "id_user" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "expires_at" timestamptz NOT NULL,
  CONSTRAINT "chk_session_expiry_after_creation" CHECK ("expires_at" > "created_at")
);

CREATE TABLE "Follows" (
  "id_follower" uuid,
  "id_followed" uuid,
  "followed_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id_follower", "id_followed"),
  CONSTRAINT "chk_follows_no_self" CHECK ("id_follower" <> "id_followed")
);

CREATE TABLE "Blocks" (
  "id_blocker" uuid,
  "id_blocked" uuid,
  "blocked_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id_blocker", "id_blocked"),
  CONSTRAINT "chk_blocks_no_self" CHECK ("id_blocker" <> "id_blocked")
);

CREATE TABLE "Mutes" (
  "id_muter" uuid,
  "id_muted" uuid,
  "muted_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id_muter", "id_muted"),
  CONSTRAINT "chk_mutes_no_self" CHECK ("id_muter" <> "id_muted")
);

CREATE TABLE "Post" (
  "id_post" uuid PRIMARY KEY,
  "id_user" uuid NOT NULL,
  "id_videogame" uuid NOT NULL,
  "id_community" uuid,
  "content" text,
  "image_url" varchar(500),
  "is_spoiler" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz,
  "status" post_status NOT NULL,
  CONSTRAINT "chk_post_not_empty" CHECK (
    ("content" IS NOT NULL AND btrim("content") <> '')
    OR ("image_url" IS NOT NULL AND btrim("image_url") <> '')
  )
);

CREATE TABLE "Comment" (
  "id_comment" uuid PRIMARY KEY,
  "id_post" uuid NOT NULL,
  "id_user" uuid NOT NULL,
  "content" text NOT NULL,
  "is_spoiler" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "chk_comment_not_empty" CHECK (btrim("content") <> ''),
  CONSTRAINT "chk_comment_max_length" CHECK (char_length("content") <= 500)
);

CREATE TABLE "Reaction" (
  "id_user" uuid,
  "id_post" uuid,
  "reacted_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id_user", "id_post")
);

CREATE TABLE "Poll" (
  "id_poll" uuid PRIMARY KEY,
  "id_post" uuid NOT NULL UNIQUE,
  "question" varchar(250) NOT NULL,
  "closes_at" timestamptz,
  "status" poll_status NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "chk_poll_question" CHECK (char_length("question") BETWEEN 5 AND 250 AND btrim("question") <> '')
);

CREATE TABLE "PollOption" (
  "id_option" uuid PRIMARY KEY,
  "id_poll" uuid NOT NULL,
  "text" varchar(100) NOT NULL,
  "position" int NOT NULL,
  CONSTRAINT "chk_poll_option_text" CHECK (btrim("text") <> ''),
  CONSTRAINT "chk_poll_option_position" CHECK ("position" BETWEEN 1 AND 5),
  CONSTRAINT "uq_poll_option_position" UNIQUE ("id_poll", "position")
);

CREATE TABLE "PollVote" (
  "id_vote" uuid PRIMARY KEY,
  "id_poll" uuid NOT NULL,
  "id_option" uuid NOT NULL,
  "id_user" uuid NOT NULL,
  "voted_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uq_poll_vote_user" UNIQUE ("id_poll", "id_user")
);

CREATE TABLE "LfgPost" (
  "id_lfg" uuid PRIMARY KEY,
  "id_user" uuid NOT NULL,
  "id_videogame" uuid NOT NULL,
  "platform" varchar(50) NOT NULL,
  "spots_available" int NOT NULL,
  "scheduled_time" varchar(100) NOT NULL,
  "description" text NOT NULL,
  "accepts_beginners" boolean NOT NULL DEFAULT true,
  "status" lfg_post_status NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "chk_lfg_spots_range" CHECK ("spots_available" BETWEEN 1 AND 16),
  CONSTRAINT "chk_lfg_description_length" CHECK (char_length(btrim("description")) BETWEEN 10 AND 500)
);

CREATE TABLE "Videogames" (
  "id_videogame" uuid PRIMARY KEY,
  "name" varchar(150) UNIQUE NOT NULL,
  "description" text NOT NULL,
  "genre" varchar(100),
  "platform" varchar(100),
  "cover_url" varchar(500),
  "additional_info" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "status" videogame_status NOT NULL
);

CREATE TABLE "VideogameRequests" (
  "id_request" uuid PRIMARY KEY,
  "id_requester" uuid NOT NULL,
  "name" varchar(150) NOT NULL,
  "description" text NOT NULL,
  "genre" varchar(100),
  "platform" varchar(100),
  "cover_url" varchar(500),
  "additional_info" text,
  "status" request_status NOT NULL,
  "id_admin" uuid,
  "rejection_reason" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "reviewed_at" timestamptz,
  "id_approved_videogame" uuid,
  CONSTRAINT "chk_videogame_request_status" CHECK (
    ("status" = 'PENDING'
      AND "id_admin" IS NULL
      AND "reviewed_at" IS NULL
      AND "rejection_reason" IS NULL
      AND "id_approved_videogame" IS NULL)
    OR ("status" IN ('ACCEPTED', 'REJECTED')
      AND "id_admin" IS NOT NULL
      AND "reviewed_at" IS NOT NULL)
  ),
  CONSTRAINT "chk_videogame_request_rejection" CHECK (
    "status" <> 'REJECTED'
    OR ("rejection_reason" IS NOT NULL AND btrim("rejection_reason") <> '')
  ),
  CONSTRAINT "chk_videogame_request_approval" CHECK (
    "status" <> 'ACCEPTED' OR "id_approved_videogame" IS NOT NULL
  )
);

CREATE TABLE "Communities" (
  "id_community" uuid PRIMARY KEY,
  "id_creator" uuid NOT NULL,
  "name" varchar(150) NOT NULL,
  "description" text NOT NULL,
  "type" community_type NOT NULL,
  "image_url" varchar(500),
  "rules" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz,
  "status" community_status NOT NULL
);

CREATE TABLE "CommunityVideogames" (
  "id_community" uuid,
  "id_videogame" uuid,
  "associated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id_community", "id_videogame")
);

CREATE TABLE "CommunityMembers" (
  "id_community" uuid,
  "id_user" uuid,
  "role" community_role NOT NULL,
  "joined_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id_community", "id_user")
);

CREATE TABLE "CommunityJoinRequests" (
  "id_request" uuid PRIMARY KEY,
  "id_community" uuid NOT NULL,
  "id_user" uuid NOT NULL,
  "message" text,
  "status" request_status NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "answered_at" timestamptz,
  "id_admin" uuid,
  "admin_comment" text,
  CONSTRAINT "chk_community_join_request_status" CHECK (
    ("status" = 'PENDING'
      AND "answered_at" IS NULL
      AND "id_admin" IS NULL
      AND "admin_comment" IS NULL)
    OR ("status" IN ('ACCEPTED', 'REJECTED')
      AND "answered_at" IS NOT NULL
      AND "id_admin" IS NOT NULL)
  )
);

CREATE TABLE "Report" (
  "id_report" uuid PRIMARY KEY,
  "id_reporter" uuid NOT NULL,
  "content_type" report_content_type NOT NULL,
  "id_reported_content" uuid NOT NULL,
  "reason" report_reason NOT NULL,
  "description" text NOT NULL,
  "evidence_url" varchar(500),
  "status" report_status NOT NULL,
  "id_reviewed_by" uuid,
  "review_comment" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "reviewed_at" timestamptz,
  CONSTRAINT "chk_report_description" CHECK (btrim("description") <> ''),
  CONSTRAINT "chk_report_status_review" CHECK (
    ("status" = 'PENDING'
      AND "id_reviewed_by" IS NULL
      AND "reviewed_at" IS NULL)
    OR ("status" IN ('IN_REVIEW', 'ATTENDED', 'CLOSED')
      AND "id_reviewed_by" IS NOT NULL
      AND "reviewed_at" IS NOT NULL)
  )
);

CREATE TABLE "Conversation" (
  "id_conversation" uuid PRIMARY KEY,
  "id_user_1" uuid NOT NULL,
  "id_user_2" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uq_conversation_users" UNIQUE ("id_user_1", "id_user_2"),
  CONSTRAINT "chk_conversation_distinct_users" CHECK ("id_user_1" <> "id_user_2"),
  CONSTRAINT "chk_conversation_canonical_order" CHECK ("id_user_1" < "id_user_2")
);

CREATE TABLE "Message" (
  "id_message" uuid PRIMARY KEY,
  "id_conversation" uuid NOT NULL,
  "id_sender" uuid NOT NULL,
  "id_recipient" uuid NOT NULL,
  "content" text NOT NULL,
  "sent_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "chk_message_not_empty" CHECK (btrim("content") <> ''),
  CONSTRAINT "chk_message_distinct_users" CHECK ("id_sender" <> "id_recipient")
);

ALTER TABLE "UserVideogames" ADD FOREIGN KEY ("id_user") REFERENCES "User" ("id_user") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "UserVideogames" ADD FOREIGN KEY ("id_videogame") REFERENCES "Videogames" ("id_videogame") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Follows" ADD FOREIGN KEY ("id_follower") REFERENCES "User" ("id_user") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Follows" ADD FOREIGN KEY ("id_followed") REFERENCES "User" ("id_user") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Blocks" ADD FOREIGN KEY ("id_blocker") REFERENCES "User" ("id_user") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Blocks" ADD FOREIGN KEY ("id_blocked") REFERENCES "User" ("id_user") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Mutes" ADD FOREIGN KEY ("id_muter") REFERENCES "User" ("id_user") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Mutes" ADD FOREIGN KEY ("id_muted") REFERENCES "User" ("id_user") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Post" ADD FOREIGN KEY ("id_user") REFERENCES "User" ("id_user") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Post" ADD FOREIGN KEY ("id_videogame") REFERENCES "Videogames" ("id_videogame") DEFERRABLE INITIALLY IMMEDIATE;

-- A composite FK is what actually enforces RN-14: a post in a community
-- may only use one of the videogames linked to that community. Rows with a
-- NULL id_community (general posts) skip the check under MATCH SIMPLE.
ALTER TABLE "Post" ADD FOREIGN KEY ("id_community", "id_videogame")
REFERENCES "CommunityVideogames" ("id_community", "id_videogame") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Post" ADD FOREIGN KEY ("id_community") REFERENCES "Communities" ("id_community") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Comment" ADD FOREIGN KEY ("id_post") REFERENCES "Post" ("id_post") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Comment" ADD FOREIGN KEY ("id_user") REFERENCES "User" ("id_user") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Reaction" ADD FOREIGN KEY ("id_user") REFERENCES "User" ("id_user") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Reaction" ADD FOREIGN KEY ("id_post") REFERENCES "Post" ("id_post") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "VideogameRequests" ADD FOREIGN KEY ("id_requester") REFERENCES "User" ("id_user") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "VideogameRequests" ADD FOREIGN KEY ("id_admin") REFERENCES "User" ("id_user") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "VideogameRequests" ADD FOREIGN KEY ("id_approved_videogame") REFERENCES "Videogames" ("id_videogame") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Communities" ADD FOREIGN KEY ("id_creator") REFERENCES "User" ("id_user") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "CommunityVideogames" ADD FOREIGN KEY ("id_community") REFERENCES "Communities" ("id_community") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "CommunityVideogames" ADD FOREIGN KEY ("id_videogame") REFERENCES "Videogames" ("id_videogame") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "CommunityMembers" ADD FOREIGN KEY ("id_community") REFERENCES "Communities" ("id_community") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "CommunityMembers" ADD FOREIGN KEY ("id_user") REFERENCES "User" ("id_user") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "CommunityJoinRequests" ADD FOREIGN KEY ("id_community") REFERENCES "Communities" ("id_community") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "CommunityJoinRequests" ADD FOREIGN KEY ("id_user") REFERENCES "User" ("id_user") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "CommunityJoinRequests" ADD FOREIGN KEY ("id_admin") REFERENCES "User" ("id_user") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Report" ADD FOREIGN KEY ("id_reporter") REFERENCES "User" ("id_user") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Report" ADD FOREIGN KEY ("id_reviewed_by") REFERENCES "User" ("id_user") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Conversation" ADD FOREIGN KEY ("id_user_1") REFERENCES "User" ("id_user") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Conversation" ADD FOREIGN KEY ("id_user_2") REFERENCES "User" ("id_user") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Message" ADD FOREIGN KEY ("id_conversation") REFERENCES "Conversation" ("id_conversation") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Message" ADD FOREIGN KEY ("id_sender") REFERENCES "User" ("id_user") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Message" ADD FOREIGN KEY ("id_recipient") REFERENCES "User" ("id_user") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "GamerPreference" ADD FOREIGN KEY ("id_user") REFERENCES "User" ("id_user") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "ActiveSessions" ADD FOREIGN KEY ("id_user") REFERENCES "User" ("id_user") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX "idx_active_sessions_id_user" ON "ActiveSessions" ("id_user");

ALTER TABLE "Poll" ADD FOREIGN KEY ("id_post") REFERENCES "Post" ("id_post") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "PollOption" ADD FOREIGN KEY ("id_poll") REFERENCES "Poll" ("id_poll") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "PollVote" ADD FOREIGN KEY ("id_poll") REFERENCES "Poll" ("id_poll") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "PollVote" ADD FOREIGN KEY ("id_option") REFERENCES "PollOption" ("id_option") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "PollVote" ADD FOREIGN KEY ("id_user") REFERENCES "User" ("id_user") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "LfgPost" ADD FOREIGN KEY ("id_user") REFERENCES "User" ("id_user") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "LfgPost" ADD FOREIGN KEY ("id_videogame") REFERENCES "Videogames" ("id_videogame") DEFERRABLE INITIALLY IMMEDIATE;

-- Deferred constraint triggers let a full 1-5 list be replaced in one
-- transaction: deleting all rows and inserting the new ones is valid as long
-- as the final count is within range.
CREATE FUNCTION "fn_enforce_user_videogame_limit"() RETURNS trigger AS $$
DECLARE
  v_user_id uuid;
  v_count integer;
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_user_id := NEW."id_user";
    SELECT COUNT(*) INTO v_count
    FROM "UserVideogames" WHERE "id_user" = v_user_id;

    IF v_count < 1 OR v_count > 5 THEN
      RAISE EXCEPTION 'User % must have between 1 and 5 videogames (found %)', v_user_id, v_count;
    END IF;
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_user_id := OLD."id_user";
    SELECT COUNT(*) INTO v_count
    FROM "UserVideogames" WHERE "id_user" = v_user_id;

    IF v_count < 1 OR v_count > 5 THEN
      RAISE EXCEPTION 'User % must have between 1 and 5 videogames (found %)', v_user_id, v_count;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "fn_enforce_community_videogame_limit"() RETURNS trigger AS $$
DECLARE
  v_community_id uuid;
  v_count integer;
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_community_id := NEW."id_community";
    SELECT COUNT(*) INTO v_count
    FROM "CommunityVideogames" WHERE "id_community" = v_community_id;

    IF v_count < 1 OR v_count > 5 THEN
      RAISE EXCEPTION 'Community % must have between 1 and 5 videogames (found %)', v_community_id, v_count;
    END IF;
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_community_id := OLD."id_community";
    SELECT COUNT(*) INTO v_count
    FROM "CommunityVideogames" WHERE "id_community" = v_community_id;

    IF v_count < 1 OR v_count > 5 THEN
      RAISE EXCEPTION 'Community % must have between 1 and 5 videogames (found %)', v_community_id, v_count;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER "trg_user_videogame_limit"
AFTER INSERT OR UPDATE OR DELETE ON "UserVideogames"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "fn_enforce_user_videogame_limit"();

CREATE CONSTRAINT TRIGGER "trg_community_videogame_limit"
AFTER INSERT OR UPDATE OR DELETE ON "CommunityVideogames"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "fn_enforce_community_videogame_limit"();

CREATE FUNCTION "fn_set_updated_at"() RETURNS trigger AS $$
BEGIN
  NEW."updated_at" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_user_updated_at"
BEFORE UPDATE ON "User" FOR EACH ROW EXECUTE FUNCTION "fn_set_updated_at"();

CREATE TRIGGER "trg_post_updated_at"
BEFORE UPDATE ON "Post" FOR EACH ROW EXECUTE FUNCTION "fn_set_updated_at"();

CREATE TRIGGER "trg_community_updated_at"
BEFORE UPDATE ON "Communities" FOR EACH ROW EXECUTE FUNCTION "fn_set_updated_at"();

CREATE TRIGGER "trg_gamer_preference_updated_at"
BEFORE UPDATE ON "GamerPreference" FOR EACH ROW EXECUTE FUNCTION "fn_set_updated_at"();

-- A CHECK cannot consult other rows, so message participants and the block
-- restriction from CU-35 are validated here instead.
CREATE FUNCTION "fn_validate_message"() RETURNS trigger AS $$
DECLARE
  v_user_1 uuid;
  v_user_2 uuid;
BEGIN
  SELECT "id_user_1", "id_user_2" INTO v_user_1, v_user_2
  FROM "Conversation" WHERE "id_conversation" = NEW."id_conversation";

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation % does not exist', NEW."id_conversation";
  END IF;

  IF NEW."id_sender" NOT IN (v_user_1, v_user_2)
    OR NEW."id_recipient" NOT IN (v_user_1, v_user_2) THEN
    RAISE EXCEPTION 'Message participants must belong to the conversation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "Blocks"
    WHERE ("id_blocker" = v_user_1 AND "id_blocked" = v_user_2)
      OR ("id_blocker" = v_user_2 AND "id_blocked" = v_user_1)
  ) THEN
    RAISE EXCEPTION 'Messages are not allowed between blocked users';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_message_validation"
BEFORE INSERT OR UPDATE ON "Message"
FOR EACH ROW EXECUTE FUNCTION "fn_validate_message"();
