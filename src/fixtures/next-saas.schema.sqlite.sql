PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(100),
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL,
  "deletedAt" TEXT
);

CREATE TABLE IF NOT EXISTS "teams" (
  "id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL,
  "stripeCustomerId" TEXT NOT NULL,
  "stripeSubscriptionId" TEXT NOT NULL,
  "stripeProductId" TEXT,
  "planName" TEXT,
  "subscriptionStatus" TEXT
);

CREATE TABLE IF NOT EXISTS "team_members" (
  "id" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "teamId" INTEGER NOT NULL,
  "role" TEXT NOT NULL,
  "joinedAt" TEXT NOT NULL,
  FOREIGN KEY("userId") REFERENCES "users"("id"),
  FOREIGN KEY("teamId") REFERENCES "teams"("id")
);

CREATE TABLE IF NOT EXISTS "activity_log" (
  "id" INTEGER NOT NULL,
  "teamId" INTEGER NOT NULL,
  "userId" INTEGER,
  "action" TEXT NOT NULL,
  "timestamp" TEXT NOT NULL,
  "ipAddress" TEXT
);

CREATE TABLE IF NOT EXISTS "invitations" (
  "id" INTEGER NOT NULL,
  "teamId" INTEGER NOT NULL,
  "email" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "invitedBy" INTEGER NOT NULL,
  "invitedAt" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  FOREIGN KEY("teamId") REFERENCES "teams"("id"),
  FOREIGN KEY("invitedBy") REFERENCES "users"("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_team_members_team_id_user_id" ON "team_members" ("teamId", "userId");

