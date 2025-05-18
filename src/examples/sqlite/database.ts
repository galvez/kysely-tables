import SQLite3Database from 'better-sqlite3'

import {
  createDatabase,
  Unique,
  Default,
  Primary,
  Text,
  Sized,
  Reference,
} from 'kysely-tables'

import {
  SqliteDialect,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from 'kysely'

export interface UsersTable {
  ida: Generated<Primary<number>>
  fname: Sized<string, 100> | null
  email: Unique<Sized<string, 255>>
  passwordHash: Text<string>
  role: Default<string, "'member2'">
  createdAt: Default<Date, 'now()'>
  updatedAt: Default<Date, 'now()'>
}

// export interface ActivityLogTable {
//   id: number
//   teamId: number
//   userId: Reference<UsersTable, 'id', number>
//   action: string
//   timestamp: Date
//   ipAddress: string | null
// }

export interface Database {
  users: UsersTable
  // activityLog: ActivityLogTable
}

export type User = Selectable<UsersTable>
export type CreateUser = Insertable<UsersTable>
export type UpdateUser = Updateable<UsersTable>

// export type ActivityLog = Selectable<ActivityLogTable>
// export type CreateActivityLog = Insertable<ActivityLogTable>
// export type UpdateActivityLog = Updateable<ActivityLogTable>

const driver = new SQLite3Database('database.sqlite')
const dialect = new SqliteDialect({ database: driver })

export default createDatabase<Database>({
  driver,
  config: {
    dialect,
  },
})
