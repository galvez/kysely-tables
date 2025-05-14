
CREATE TABLE IF NOT EXISTS "table_with_defaults" (
  "filed_string" varchar(255) DEFAULT 'member' NOT NULL,
  "field_number" integer DEFAULT 99 NOT NULL,
  "field_boolean" boolean DEFAULT false NOT NULL,
  "filed_string_nullable" varchar(255) DEFAULT 'member',
  "field_number_nullable" integer DEFAULT 99,
  "field_boolean_nullable" boolean DEFAULT false,
  "field_coltype_nullable" timestamp DEFAULT now(),
  "field_default_coltype" timestamp DEFAULT now() NOT NULL,
  "field_coltype_default" timestamp DEFAULT now() NOT NULL
);

