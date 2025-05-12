
CREATE TABLE IF NOT EXISTS "foo" (
  "id" serial PRIMARY KEY NOT NULL,
  "created" timestamp DEFAULT now(),
  "updated" timestamp DEFAULT now() NOT NULL
);


