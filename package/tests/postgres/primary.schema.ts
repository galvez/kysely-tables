import { createDatabase, Primary } from 'kysely-tables'
import { Pool } from 'pg'
import { PostgresDialect } from 'kysely'

export interface WithNumberPrimaryFieldTable {
  field_primary_number: Primary<number>
}

export interface WithStringPrimaryFieldTable {
  field_primary_string: Primary<string>
}

export interface Database {
  withNumberPrimaryField: WithNumberPrimaryFieldTable
  withStringPrimaryField: WithStringPrimaryFieldTable
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
