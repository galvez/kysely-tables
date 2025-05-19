import { Pool } from 'pg'

import {
  createDatabase,
  Unique,
  Default,
  Primary,
  Text,
  Sized,
} from 'kysely-tables'

import {
  PostgresDialect,
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

const driver = new Pool({
  connectionString: process.env.DATABASE_URI,
})
const dialect = new PostgresDialect({ pool: driver })

export default createDatabase<Database>({
  driver,
  config: {
    dialect,
  },
})
