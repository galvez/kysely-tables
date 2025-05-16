import { db } from './schema'

export function findUserById(id: number) {
  return db.selectFrom('users').where('id', '=', id).selectAll().compile()
}

console.log(findUserById(1))
