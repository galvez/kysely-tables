PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "foo" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "created" TEXT DEFAULT (datetime('now')),
  "updated" TEXT DEFAULT (datetime('now')) NOT NULL
);


