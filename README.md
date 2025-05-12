# kysely-tables

Give [Kysely]() the same level of DX from [Prisma]() and [Drizzle]().

- Use your Kysely types as your database schema — no need to use kysely-codegen and connect to the database to retrieve the schema structure. No need to use [this](https://github.com/drizzle-team/drizzle-kysely), or [this](https://github.com/eoin-obrien/prisma-extension-kysely), or [this](https://github.com/valtyr/prisma-kysely) and bloat your setup with redundant libraries.
  - This **will parse your Kysely types** and turn them into the proper `CREATE TABLE` statements.

- Use your Kysely types to do your migrations, very much like Prisma and Drizze — change your types and the bundled CLI will generate SQL migrations using Postgrator under the hood. Postgrator is a lean and well tested library used by Platformatic.

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
