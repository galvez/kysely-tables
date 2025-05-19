import { Pool } from 'pg'
import { PostgresDialect, Generated } from 'kysely'
import { createDatabase, Primary } from 'kysely-tables'

export interface WithGeneratedFieldsTable {
  field_generated_primary: Generated<Primary<number>>
  field_generated: Generated<number>
}

export interface Database {
  withGeneratedFields: WithGeneratedFieldsTable
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
