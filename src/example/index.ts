import { Pool } from 'pg'
import { Kysely, PostgresDialect } from 'kysely'
import { Database } from './types'

const dialect = new PostgresDialect({
  pool: new Pool(),
})

export const db = new Kysely<Database>({
  dialect,
})

export function findUserById(id: number) {
  return db.selectFrom('users').where('id', '=', id).selectAll().compile()
}

console.log(findUserById(1))
