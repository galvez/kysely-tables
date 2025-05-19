import { Pool } from 'pg'
import { PostgresDialect } from 'kysely'
import { createDatabase, Sized, Text } from 'kysely-tables'

// TODO Text<string | null>

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

const connectionString = process.env.DATABASE_URI
const driver = new Pool({ connectionString })
const dialect = new PostgresDialect({ pool: driver })

export default createDatabase<Database>({
  driver,
  config: {
    dialect,
  },
})
