# kysely-tables

Give [Kysely]() the same level of DX from [Prisma]() and [Drizzle]().

Use your **Kysely-compatible types** **as your database schema**. 

No need for an intermediary [schema defining API](https://orm.drizzle.team/docs/schemas) or [schema language](https://www.prisma.io/docs/orm/prisma-schema/overview).

Use the **same types** for your **SQL table schema**, **migrations** and **queries**.

```ts
import { Generated } from 'kysely'
import { Unique, Default, Primary, Text, Sized } from 'kysely-tables'

export interface UsersTable {
  id: Generated<Primary<number>>
  name: Sized<string, 100> | null
  email: Unique<Sized<string, 255>>
  passwordHash: Text<string>
  role: Default<string, "'member'">
  createdAt: Default<Date, 'now()'>
  updatedAt: Default<Data, 'now()'>
  deletedAt: null | Date
}

export interface TeamMembersTable {
  id: Generated<Primary<number>>
  userId: Reference<UsersTable, 'id', number>
  teamId: Reference<TeamsTable, 'id', number>
  role: string
  joinedAt: Date
}
```

No need to [connect to the database to retrieve the schema structure](https://github.com/RobinBlomberg/kysely-codegen). 

No need for [`drizzle-kysely`](https://github.com/drizzle-team/drizzle-kysely), [`prisma-extension-kysely`](https://github.com/eoin-obrien/prisma-extension-kysely), [`prisma-kysely`](https://github.com/valtyr/prisma-kysely). 

Don't bloat your setup with redundant libraries.

This **will parse your Kysely types** and turn them into the proper `CREATE TABLE` statements.

**And** use your Kysely types to do your migrations, very much like Prisma and Drizze.

Simply change your types to generate SQL migrations using Postgrator under the hood.

<br>

### Using your Kysely types as your database schema

Create a `db/manager.ts` file as follows:

```ts
import { Pool } from 'pg'
import { Kysely, PostgresDialect } from 'kysely'
import { Manager } from 'kysely-tables'
import { Database } from './schema'

const dialect = new PostgresDialect({
  pool: new Pool()
})

export const db = new Kysely<Database>({
  dialect,
})

export default new Manager()
```

Create a `db/schema.ts` file as follows:

```ts
import { Generated, Insertable, Selectable, Updateable } from 'kysely'
import { Unique, Default, Primary, Text, Sized, createRunner } from 'kysely-tables'

export interface UsersTable {
  id: Generated<Primary<number>>
  name: Sized<string, 100> | null
  email: Unique<Sized<string, 255>>
  passwordHash: Text<string>
  role: Default<string, "'member'">
  createdAt: Default<Date, 'now()'>
  updatedAt: Default<Data, 'now()'>
  deletedAt: null | Date
}

export interface Database {
  users: UsersTable
}

export type User = Selectable<UsersTable>
export type CreateUser = Insertable<UsersTable>
export type UpdateUser = Updateable<UsersTable>

export default createRunner()
```

Run the following command to create `schema.sql` and apply it to the database.

```sh
% tsx db/manager.ts --apply
```

This is what the generated SQL schema looks like:

```sql
CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(100),
  "email" varchar(255) NOT NULL,
  "passwordHash" text NOT NULL,
  "role" varchar(255) DEFAULT 'member' NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "deletedAt" timestamp,
  CONSTRAINT "users_email_unique" UNIQUE("email")
);
```
