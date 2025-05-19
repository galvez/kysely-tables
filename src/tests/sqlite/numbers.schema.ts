export interface WithNumberFieldsTable {
  field_number: number
  field_number_nullable: number | null
}

// TODO bigint
// TODO decimal(12,2)
// TODO custom

import SQLite3Database from 'better-sqlite3'

const driver = new SQLite3Database('database.sqlite')
const dialect = new SqliteDialect({ database: driver })

export default createDatabase<Database>({
  driver,
  config: {
    dialect,
  },
})
