import SQLite3Database from 'better-sqlite3'
import { ColumnType, SqliteDialect } from 'kysely'
import { createDatabase } from 'kysely-tables'

export interface FooTable {
  field: ColumnType<Date, never, Date>
  field_nullable: ColumnType<Date | null, never, Date>
}

export interface Database {
  foo: FooTable
}

const driver = new SQLite3Database('database.sqlite')
const dialect = new SqliteDialect({ database: driver })

export default createDatabase<Database>({
  driver,
  config: {
    dialect,
  },
})
