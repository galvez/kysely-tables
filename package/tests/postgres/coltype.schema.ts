import { Pool } from 'pg'
import { createDatabase } from 'kysely-tables'
import { PostgresDialect, ColumnType } from 'kysely'

export interface FooTable {
  field: ColumnType<Date, never, Date>
  field_nullable: ColumnType<Date | null, never, Date>
}

export interface Database {
  foo: FooTable
}

const connectionString = process.env.DATABASE_URI
const driver = new Pool({ connectionString })
const dialect = new PostgresDialect({ pool: driver })

export default createDatabase<Database>({
  driver,
  config: {
    dialect,
  },
})
