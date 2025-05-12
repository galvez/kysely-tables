
CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(100),
  "email" varchar(255) NOT NULL,
  "passwordHash" text NOT NULL,
  "role" varchar(255) DEFAULT ''member' NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "deletedAt" timestamp,
  CONSTRAINT "users_email_unique" UNIQUE("email")
);


