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
  'UNDEFINED'
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
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp,
  "account_status" account_status NOT NULL
);

CREATE TABLE "UserVideogames" (
  "id_user" uuid,
  "id_videogame" uuid,
  "added_at" timestamp NOT NULL,
  PRIMARY KEY ("id_user", "id_videogame")
);

CREATE TABLE "Follows" (
  "id_follower" uuid,
  "id_followed" uuid,
  "followed_at" timestamp NOT NULL,
  PRIMARY KEY ("id_follower", "id_followed")
);

CREATE TABLE "Blocks" (
  "id_blocker" uuid,
  "id_blocked" uuid,
  "blocked_at" timestamp NOT NULL,
  PRIMARY KEY ("id_blocker", "id_blocked")
);

CREATE TABLE "Mutes" (
  "id_muter" uuid,
  "id_muted" uuid,
  "muted_at" timestamp NOT NULL,
  PRIMARY KEY ("id_muter", "id_muted")
);

CREATE TABLE "Post" (
  "id_post" uuid PRIMARY KEY,
  "id_user" uuid NOT NULL,
  "id_videogame" uuid NOT NULL,
  "id_community" uuid,
  "content" text,
  "image_url" varchar(500),
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp,
  "status" post_status NOT NULL
);

CREATE TABLE "Comment" (
  "id_comment" uuid PRIMARY KEY,
  "id_post" uuid NOT NULL,
  "id_user" uuid NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp NOT NULL
);

CREATE TABLE "Reaction" (
  "id_user" uuid,
  "id_post" uuid,
  "reacted_at" timestamp NOT NULL,
  PRIMARY KEY ("id_user", "id_post")
);

CREATE TABLE "Videogames" (
  "id_videogame" uuid PRIMARY KEY,
  "name" varchar(150) UNIQUE NOT NULL,
  "description" text NOT NULL,
  "genre" varchar(100),
  "platform" varchar(100),
  "cover_url" varchar(500),
  "additional_info" text,
  "created_at" timestamp NOT NULL,
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
  "created_at" timestamp NOT NULL,
  "reviewed_at" timestamp,
  "id_approved_videogame" uuid
);

CREATE TABLE "Communities" (
  "id_community" uuid PRIMARY KEY,
  "id_creator" uuid NOT NULL,
  "name" varchar(150) NOT NULL,
  "description" text NOT NULL,
  "type" community_type NOT NULL,
  "image_url" varchar(500),
  "rules" text,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp,
  "status" community_status NOT NULL
);

CREATE TABLE "CommunityVideogames" (
  "id_community" uuid,
  "id_videogame" uuid,
  "associated_at" timestamp NOT NULL,
  PRIMARY KEY ("id_community", "id_videogame")
);

CREATE TABLE "CommunityMembers" (
  "id_community" uuid,
  "id_user" uuid,
  "role" community_role NOT NULL,
  "joined_at" timestamp NOT NULL,
  PRIMARY KEY ("id_community", "id_user")
);

CREATE TABLE "CommunityJoinRequests" (
  "id_request" uuid PRIMARY KEY,
  "id_community" uuid NOT NULL,
  "id_user" uuid NOT NULL,
  "message" text,
  "status" request_status NOT NULL,
  "created_at" timestamp NOT NULL,
  "answered_at" timestamp,
  "id_admin" uuid,
  "admin_comment" text
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
