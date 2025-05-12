# kysely-tables

Give [Kysely]() the same level of DX from [Prisma]() and [Drizzle]().

- Use your Kysely types as your database schema — no need to use kysely-codegen and connect to the database to retrieve the schema structure. This **will parse your Kysely types** and turn them into the proper `CREATE TABLE` statements.

- Use your Kysely types to do your migrations, very much like Prisma and Drizze — change your types and the bundled CLI will generate SQL migrations using Postgrator under the hood. Postgrator is the same database migration library used by Platformatic.

<br>

### 1. Use your Kysely types as your database schema

<table>

<tr>

<td valign=top width="400px">

**Kysely TypeScript Schema**

```ts
export interface UsersTable {
  id: Generated<Primary<number>>
  name: Sized<string, 100> | null
  email: Unique<Sized<string, 255>>
  passwordHash: Text<string>
  role: Default<string, 'member'>
  createdAt: Default<Date, 'now()'>
  updatedAt: Default<Date, 'now()'>
  deletedAt: null | Date
}
```

</td>


<td valign=top>

**SQL Schema**

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
</td>


</tr>
  
</table>

</td>

</tr>
  
</table>
