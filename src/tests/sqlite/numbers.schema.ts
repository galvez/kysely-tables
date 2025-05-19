import SQLite3Database from 'better-sqlite3'
import { SqliteDialect } from 'kysely'
import { createDatabase } from 'kysely-tables'

// TODO bigint
// TODO decimal(12,2)
// TODO custom

export interface WithNumberFieldsTable {
  field_number: number
  field_number_nullable: number | null
}

export interface Database {
  withNumberFields: WithNumberFieldsTable
}

const driver = new SQLite3Database('database.sqlite')
const dialect = new SqliteDialect({ database: driver })

export default createDatabase<Database>({
  driver,
  config: {
    dialect,
  },
})
