import { Generated, ColumnType } from 'kysely'

export interface FooTable {
  id: Generated<Primary<number>>
  created: Default<ColumnType<Date, string | null, never>, 'now()'>
  updated: Default<ColumnType<Date, never, Date>, 'now()'>
}
