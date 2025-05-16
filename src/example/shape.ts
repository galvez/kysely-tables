import SQLite3Database from 'better-sqlite3'
// prettier-ignore
import { createRunner, Unique, Default, Primary, Text, Sized } from 'kysely-tables'
// prettier-ignore
import { SqliteDialect, Generated, Insertable, Selectable, Updateable } from 'kysely'

export interface UsersTable {
  id: Generated<Primary<number>>
  name: Sized<string, 100> | null
  email: Unique<Sized<string, 255>>
  passwordHash: Text<string>
  role: Default<string, "'member'">
  createdAt: Default<Date, 'now()'>
  updatedAt: Default<Date, 'now()'>
  deletedAt: null | Date
}

export interface Database {
  users: UsersTable
}

export type User = Selectable<UsersTable>
export type CreateUser = Insertable<UsersTable>
export type UpdateUser = Updateable<UsersTable>

export default createRunner<Database>({
  dialect: new SqliteDialect({
    database: new SQLite3Database('data.sqlite')
  }),
})
