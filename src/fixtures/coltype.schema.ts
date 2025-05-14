import { Generated, ColumnType } from 'kysely'
import { Primary, Default } from 'kysely-tables'

export interface FooTable {
  field: ColumnType<Date, never, Date>
  field_nullable: ColumnType<Date | null, never, Date>
}
