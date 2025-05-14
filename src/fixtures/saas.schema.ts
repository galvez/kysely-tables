import { Generated } from 'kysely'

import {
  Reference,
  Unique,
  Default,
  Primary,
  UniqueIndex,
  Keys,
  Text,
  Sized,
} from '../index.js'

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

export type Indexes = UniqueIndex<TeamMembersTable, Keys<['teamId', 'userId']>>

export enum ActivityType {
  SIGN_UP = 'SIGN_UP',
  SIGN_IN = 'SIGN_IN',
  SIGN_OUT = 'SIGN_OUT',
  UPDATE_PASSWORD = 'UPDATE_PASSWORD',
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
  UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
  CREATE_TEAM = 'CREATE_TEAM',
  REMOVE_TEAM_MEMBER = 'REMOVE_TEAM_MEMBER',
  INVITE_TEAM_MEMBER = 'INVITE_TEAM_MEMBER',
  ACCEPT_INVITATION = 'ACCEPT_INVITATION',
}
