import SQLite3Database from 'better-sqlite3'
import { Generated, SqliteDialect } from 'kysely'
import {
  createDatabase,
  Reference,
  Unique,
  Default,
  Primary,
  Text,
  Sized,
} from 'kysely-tables'

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

export interface TeamsTable {
  id: number
  name: string
  createdAt: Default<Date, 'now()'>
  updatedAt: Default<Date, 'now()'>
  stripeCustomerId: Unique<string | null>
  stripeSubscriptionId: Unique<string | null>
  stripeProductId: string | null
  planName: string | null
  subscriptionStatus: string | null
}

export interface TeamMembersTable {
  id: number
  userId: Reference<UsersTable, 'id', number>
  teamId: Reference<TeamsTable, 'id', number>
  role: string
  joinedAt: Date
}

export interface ActivityLogTable {
  id: number
  teamId: number
  userId: number | null
  action: string
  timestamp: Date
  ipAddress: string | null
}

export interface InvitationsTable {
  id: number
  teamId: Reference<TeamsTable, 'id', number>
  email: string
  role: string
  invitedBy: Reference<UsersTable, 'id', number>
  invitedAt: Default<Date, 'now()'>
  status: string
}

export interface Database {
  users: UsersTable
  teams: TeamsTable
  teamMembers: TeamMembersTable
  activityLog: ActivityLogTable
  invitations: InvitationsTable
}

const driver = new SQLite3Database('database.sqlite')
const dialect = new SqliteDialect({ database: driver })

export default createDatabase<Database>({
  driver,
  config: {
    dialect,
  },
})
