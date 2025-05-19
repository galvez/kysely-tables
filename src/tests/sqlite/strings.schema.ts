import { Sized, Text } from 'kysely-tables'

export interface WithStringFieldsTable {
  field_string: string
  field_string_large: Text<string>
  field_string_sized: Sized<string, 100>
  field_string_nullable: string | null
  field_string_large_nullable: Text<string> | null
  field_string_sized_nullable: Sized<string, 100> | null
}

export interface Database {
  withStringsField: WithStringFieldsTable
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
