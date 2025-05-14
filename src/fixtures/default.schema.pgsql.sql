
CREATE TABLE IF NOT EXISTS "table_with_defaults" (
  "filed_string" varchar(255) DEFAULT "'member'" NOT NULL,
  "field_number" integer DEFAULT 99 NOT NULL,
  "field_boolean" boolean DEFAULT false NOT NULL,
  "field_coltype_null" timestamp DEFAULT 'now()',
  "field_default_coltype" timestamp DEFAULT 'now()' NOT NULL,
  "field_coltype_default" timestamp DEFAULT 'now()' NOT NULL
);

