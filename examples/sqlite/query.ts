import db from './db.js'

export function findUserById(id: number) {
  return db.selectFrom('users').where('id', '=', id).selectAll()
}

console.log(findUserById(1).compile())
