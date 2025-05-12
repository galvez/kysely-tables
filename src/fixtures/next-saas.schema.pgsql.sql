
CREATE TABLE IF NOT EXISTS "users" (
  "id" text NOT NULL,
  "name" varchar(100),
  "email" text NOT NULL,
  "passwordHash" text NOT NULL,
  "role" text NOT NULL,
  "createdAt" text NOT NULL,
  "updatedAt" text NOT NULL,
  "deletedAt" timestamp
);

CREATE TABLE IF NOT EXISTS "teams" (
  "id" integer NOT NULL,
  "name" varchar(255) NOT NULL,
  "createdAt" text NOT NULL,
  "updatedAt" text NOT NULL,
  "stripeCustomerId" text NOT NULL,
  "stripeSubscriptionId" text NOT NULL,
  "stripeProductId" varchar(255),
  "planName" varchar(255),
  "subscriptionStatus" varchar(255)
);

CREATE TABLE IF NOT EXISTS "team_members" (
  "id" integer NOT NULL,
  "userId" integer NOT NULL,
  "teamId" integer NOT NULL,
  "role" varchar(255) NOT NULL,
  "joinedAt" timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS "activity_log" (
  "id" integer NOT NULL,
  "teamId" integer NOT NULL,
  "userId" integer,
  "action" varchar(255) NOT NULL,
  "timestamp" timestamp NOT NULL,
  "ipAddress" varchar(255)
);

CREATE TABLE IF NOT EXISTS "invitations" (
  "id" integer NOT NULL,
  "teamId" integer NOT NULL,
  "email" varchar(255) NOT NULL,
  "role" varchar(255) NOT NULL,
  "invitedBy" integer NOT NULL,
  "invitedAt" text NOT NULL,
  "status" varchar(255) NOT NULL
);

CREATE UNIQUE INDEX "idx_team_members_team_id_user_id" ON "team_members"("teamId", "userId");

DO $$ BEGIN
 ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk"
 FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk"
 FOREIGN KEY ("teamId") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "invitations" ADD CONSTRAINT "invitations_team_id_teams_id_fk"
 FOREIGN KEY ("teamId") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_users_id_fk"
 FOREIGN KEY ("invitedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

