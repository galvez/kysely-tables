import { ColumnType } from 'kysely'
import { Default } from 'kysely-tables'

export interface WithDefaultsTable {
  filed_string: Default<string, "'member'">
  field_number: Default<number, 99>
  field_boolean: Default<boolean, false>
  filed_string_nullable: Default<string, "'member'"> | null
  field_number_nullable: Default<number, 99> | null
  field_boolean_nullable: Default<boolean, false> | null
  field_coltype_nullable: Default<
    ColumnType<Date, string | null, never>,
    'now()'
  >
  field_default_coltype: Default<ColumnType<Date, never, Date>, 'now()'>
}
