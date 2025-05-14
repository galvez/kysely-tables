import { Generated, ColumnType } from 'kysely'
import { Primary, Default } from 'kysely-tables'

export interface TableWithDefaultsTable {
  filed_string: Default<string, "'member'">
  field_number: Default<number, 99>
  field_boolean: Default<boolean, false>
  field_coltype_null: Default<ColumnType<Date, string | null, never>, 'now()'>
  field_default_coltype: Default<ColumnType<Date, never, Date>, 'now()'>
  field_coltype_default: ColumnType<Default<Date, 'now()'>, never, Date>
}
