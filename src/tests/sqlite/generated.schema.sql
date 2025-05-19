PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "table_with_generated" (
  "field_generated_primary" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "field_generated" INTEGER NOT NULL
);

