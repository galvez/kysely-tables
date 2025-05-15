PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "users" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "name" TEXT,
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "role" TEXT DEFAULT 'member' NOT NULL,
  "createdAt" TEXT DEFAULT now() NOT NULL,
  "updatedAt" TEXT DEFAULT now() NOT NULL,
  "deletedAt" TEXT
);

CREATE TABLE IF NOT EXISTS "teams" (
  "id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TEXT DEFAULT now() NOT NULL,
  "updatedAt" TEXT DEFAULT now() NOT NULL,
  "stripeCustomerId" TEXT UNIQUE,
  "stripeSubscriptionId" TEXT UNIQUE,
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
  FOREIGN KEY("userId") REFERENCES "UsersTable"("'id'"),
  FOREIGN KEY("teamId") REFERENCES "TeamsTable"("'id'")
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
  "invitedAt" TEXT DEFAULT now() NOT NULL,
  "status" TEXT NOT NULL,
  FOREIGN KEY("teamId") REFERENCES "TeamsTable"("'id'"),
  FOREIGN KEY("invitedBy") REFERENCES "UsersTable"("'id'")
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_team_members_team_id_user_id" ON "team_members" ("teamId", "userId");

