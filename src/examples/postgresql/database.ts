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
  email: number | null
  passwordHash: Text<string>
  role: Default<string, "'member'">
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

const driver = new Pool({
  connectionString:
    'postgresql://galvez:0TuQbI6phPsr@ep-gentle-queen-680373-pooler.us-east-2.aws.neon.tech/saas?sslmode=require',
})
const dialect = new PostgresDialect({ pool: driver })

export default createDatabase<Database>({
  driver,
  config: {
    dialect,
  },
})
