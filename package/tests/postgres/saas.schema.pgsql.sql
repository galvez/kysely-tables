
CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(100),
  "email" varchar(255) NOT NULL,
  "passwordHash" text NOT NULL,
  "role" varchar(255) DEFAULT 'member' NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "deletedAt" timestamp,
  CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE IF NOT EXISTS "teams" (
  "id" integer NOT NULL,
  "name" varchar(255) NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "stripeCustomerId" varchar(255),
  "stripeSubscriptionId" varchar(255),
  "stripeProductId" varchar(255),
  "planName" varchar(255),
  "subscriptionStatus" varchar(255),
  CONSTRAINT "teams_stripe_customer_id_unique" UNIQUE("stripeCustomerId"),
  CONSTRAINT "teams_stripe_subscription_id_unique" UNIQUE("stripeSubscriptionId")
);

CREATE TABLE IF NOT EXISTS "team_members" (
  "id" integer NOT NULL,
  "userId" integer NOT NULL,
  "teamId" integer NOT NULL,
  "role" varchar(255) NOT NULL,
  "joinedAt" timestamp NOT NULL,
  CONSTRAINT "user_id_UsersTable_'id'_fk" FOREIGN KEY("userId") REFERENCES "UsersTable"("'id'"),
  CONSTRAINT "team_id_TeamsTable_'id'_fk" FOREIGN KEY("teamId") REFERENCES "TeamsTable"("'id'")
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
  "invitedAt" timestamp DEFAULT now() NOT NULL,
  "status" varchar(255) NOT NULL,
  CONSTRAINT "team_id_TeamsTable_'id'_fk" FOREIGN KEY("teamId") REFERENCES "TeamsTable"("'id'"),
  CONSTRAINT "invited_by_UsersTable_'id'_fk" FOREIGN KEY("invitedBy") REFERENCES "UsersTable"("'id'")
);

CREATE UNIQUE INDEX "idx_team_members_team_id_user_id" ON "team_members"("teamId", "userId");

