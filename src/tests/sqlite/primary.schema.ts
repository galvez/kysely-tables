import { Primary } from 'kysely-tables'

export interface WithNumberPrimaryFieldTable {
  field_primary_number: Primary<number>
}

export interface WithStringPrimaryFieldTable {
  field_primary_string: Primary<string>
}

import SQLite3Database from 'better-sqlite3'

const driver = new SQLite3Database('database.sqlite')
const dialect = new SqliteDialect({ database: driver })

export default createDatabase<Database>({
  driver,
  config: {
    dialect,
  },
})
