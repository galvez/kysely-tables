PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "foo" (
  "role" TEXT DEFAULT 'member' NOT NULL,
  "created" TEXT DEFAULT (datetime('now')) NOT NULL,
  "updated" TEXT DEFAULT (datetime('now')) NOT NULL
);


