import { Generated, ColumnType } from 'kysely'
import { Primary, Default } from 'kysely-tables'

export interface FooTable {
  role: Default<string, "'member'">
  created: Default<ColumnType<Date, string | null, never>, 'now()'>
  updated: Default<ColumnType<Date, never, Date>, 'now()'>
}
