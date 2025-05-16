import 'kysely-tables/runner'

import { Pool } from 'pg'
import { Kysely, PostgresDialect } from 'kysely'
import { Generated, Insertable, Selectable, Updateable } from 'kysely'
import { Unique, Default, Primary, Text, Sized } from 'kysely-tables'

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool(),
  }),
})

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
