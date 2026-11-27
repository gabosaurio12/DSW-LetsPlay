BEGIN;

ALTER TABLE "User"
ADD COLUMN "is_private" boolean NOT NULL DEFAULT false;

CREATE TABLE "FollowRequests" (
  "id_follower" uuid NOT NULL,
  "id_followed" uuid NOT NULL,
  "requested_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id_follower", "id_followed"),
  CONSTRAINT "chk_follow_requests_no_self" CHECK ("id_follower" <> "id_followed"),
  CONSTRAINT "fk_follow_requests_follower"
    FOREIGN KEY ("id_follower") REFERENCES "User" ("id_user") DEFERRABLE INITIALLY IMMEDIATE,
  CONSTRAINT "fk_follow_requests_followed"
    FOREIGN KEY ("id_followed") REFERENCES "User" ("id_user") DEFERRABLE INITIALLY IMMEDIATE
);

CREATE INDEX "idx_follows_id_followed" ON "Follows" ("id_followed");
CREATE INDEX "idx_follow_requests_followed_requested_at"
ON "FollowRequests" ("id_followed", "requested_at");

DELETE FROM "Follows" f
USING "Blocks" b
WHERE (f."id_follower" = b."id_blocker" AND f."id_followed" = b."id_blocked")
   OR (f."id_follower" = b."id_blocked" AND f."id_followed" = b."id_blocker");

COMMIT;
