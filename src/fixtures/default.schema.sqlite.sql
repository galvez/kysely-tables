PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "table_with_defaults" (
  "filed_string" TEXT DEFAULT 'member' NOT NULL,
  "field_number" INTEGER DEFAULT 99 NOT NULL,
  "field_boolean" INTEGER DEFAULT false NOT NULL,
  "filed_string_nullable" TEXT DEFAULT 'member',
  "field_number_nullable" INTEGER DEFAULT 99,
  "field_boolean_nullable" INTEGER DEFAULT false,
  "field_coltype_nullable" TEXT DEFAULT now(),
  "field_default_coltype" TEXT DEFAULT now() NOT NULL,
  "field_coltype_default" TEXT DEFAULT now() NOT NULL
);

