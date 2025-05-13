
CREATE TABLE IF NOT EXISTS "foo" (
  "role" varchar(255) DEFAULT 'member' NOT NULL,
  "created" text DEFAULT now() NOT NULL,
  "updated" text DEFAULT now() NOT NULL
);


