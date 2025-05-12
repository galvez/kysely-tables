import { Pool } from 'pg'
import { Kysely, PostgresDialect } from 'kysely'
import { Database } from './types'

const dialect = new PostgresDialect({
  pool: new Pool({
    connectionString: 'postgresql://galvez:0TuQbI6phPsr@ep-gentle-queen-680373-pooler.us-east-2.aws.neon.tech/saas?sslmode=require'
  })
})

export const db = new Kysely<Database>({
  dialect,
})


export function findUserById(id: number) {
  return db.selectFrom('users')
    .where('id', '=', id)
    .selectAll()
    .compile()
}

console.log(findUserById(1))