import SQLite3Database from 'better-sqlite3'

import {
  createDatabase,
  Unique,
  Default,
  Primary,
  Text,
  Sized,
} from 'kysely-tables'

import {
  SqliteDialect,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from 'kysely'

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

const driver = new SQLite3Database('db.sqlite')
const dialect = new SqliteDialect({ database: driver })

export default createDatabase<Database>({
  driver,
  config: {
    dialect,
  },
})
