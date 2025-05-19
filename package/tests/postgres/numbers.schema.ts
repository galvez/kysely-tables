import { Pool } from 'pg'
import { PostgresDialect } from 'kysely'
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

const connectionString = process.env.DATABASE_URI
const driver = new Pool({ connectionString })
const dialect = new PostgresDialect({ pool: driver })

export default createDatabase<Database>({
  driver,
  config: {
    dialect,
  },
})
