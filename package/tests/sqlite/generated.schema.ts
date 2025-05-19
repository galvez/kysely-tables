import SQLite3Database from 'better-sqlite3'
import { SqliteDialect, Generated } from 'kysely'
import { createDatabase, Primary } from 'kysely-tables'

export interface WithGeneratedFieldsTable {
  field_generated_primary: Generated<Primary<number>>
  field_generated: Generated<number>
}

export interface Database {
  withGeneratedFields: WithGeneratedFieldsTable
}

const driver = new SQLite3Database('database.sqlite')
const dialect = new SqliteDialect({ database: driver })

export default createDatabase<Database>({
  driver,
  config: {
    dialect,
  },
})
