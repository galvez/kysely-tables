PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "users" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "name" text,
  "email" text NOT NULL,
  "passwordHash" text NOT NULL,
  "role" text DEFAULT 'member' NOT NULL,
  "createdAt" text DEFAULT (datetime('now') NOT NULL,
  "updatedAt" text DEFAULT (datetime('now') NOT NULL,
  "deletedAt" text,
  CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE IF NOT EXISTS "teams" (
  "id" integer NOT NULL,
  "name" text NOT NULL,
  "createdAt" text DEFAULT (datetime('now') NOT NULL,
  "updatedAt" text DEFAULT (datetime('now') NOT NULL,
  "stripeCustomerId" text,
  "stripeSubscriptionId" text,
  "stripeProductId" text,
  "planName" text,
  "subscriptionStatus" text,
  CONSTRAINT "teams_stripe_customer_id_unique" UNIQUE("stripeCustomerId"),
  CONSTRAINT "teams_stripe_subscription_id_unique" UNIQUE("stripeSubscriptionId")
);

CREATE TABLE IF NOT EXISTS "team_members" (
  "id" integer NOT NULL,
  "userId" integer NOT NULL,
  "teamId" integer NOT NULL,
  "role" text NOT NULL,
  "joinedAt" text NOT NULL,
  CONSTRAINT "user_id_id_users_table_fk" FOREIGN KEY("userId") REFERENCES "users_table"("id"),
  CONSTRAINT "team_id_id_teams_table_fk" FOREIGN KEY("teamId") REFERENCES "teams_table"("id")
);

CREATE TABLE IF NOT EXISTS "activity_log" (
  "id" integer NOT NULL,
  "teamId" integer NOT NULL,
  "userId" integer,
  "action" text NOT NULL,
  "timestamp" text NOT NULL,
  "ipAddress" text
);

CREATE TABLE IF NOT EXISTS "invitations" (
  "id" integer NOT NULL,
  "teamId" integer NOT NULL,
  "email" text NOT NULL,
  "role" text NOT NULL,
  "invitedBy" integer NOT NULL,
  "invitedAt" text DEFAULT (datetime('now') NOT NULL,
  "status" text NOT NULL,
  CONSTRAINT "team_id_id_teams_table_fk" FOREIGN KEY("teamId") REFERENCES "teams_table"("id"),
  CONSTRAINT "invited_by_id_users_table_fk" FOREIGN KEY("invitedBy") REFERENCES "users_table"("id")
);