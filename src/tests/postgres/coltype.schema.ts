import { ColumnType } from 'kysely'

export interface FooTable {
  field: ColumnType<Date, never, Date>
  field_nullable: ColumnType<Date | null, never, Date>
}
