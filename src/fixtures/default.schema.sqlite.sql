PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "table_with_defaults" (
  "filed_string" TEXT DEFAULT "'member'" NOT NULL,
  "field_number" INTEGER DEFAULT 99 NOT NULL,
  "field_boolean" INTEGER DEFAULT false NOT NULL,
  "field_coltype_null" TEXT DEFAULT 'now()',
  "field_default_coltype" TEXT DEFAULT 'now()' NOT NULL,
  "field_coltype_default" TEXT DEFAULT 'now()' NOT NULL
);

