import { Generated } from 'kysely'
import { Primary } from 'kysely-tables'

export interface TableWithGeneratedTable {
  field_generated_primary: Generated<Primary<number>>
  field_generated: Generated<number>
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
