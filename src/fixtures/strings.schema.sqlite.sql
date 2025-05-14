PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "with_string_fields" (
  "field_string" TEXT NOT NULL,
  "field_string_large" TEXT NOT NULL,
  "field_string_sized" VARCHAR(100) NOT NULL,
  "field_string_nullable" TEXT,
  "field_string_large_nullable" TEXT,
  "field_string_sized_nullable" VARCHAR(100)
);

