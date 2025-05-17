# kysely-tables

An attempt to give [Kysely]() the same level of DX from [Prisma]() and [Drizzle]().

Use the **same Kysely types** for your **SQL table schema**, **migrations** and **queries**.

- No need for an intermediary [schema defining API](https://orm.drizzle.team/docs/schemas) or [schema language](https://www.prisma.io/docs/orm/prisma-schema/overview).
- No need to [connect to the database to retrieve the schema structure](https://github.com/RobinBlomberg/kysely-codegen).
- No need to [bloat](https://github.com/drizzle-team/drizzle-kysely) [your](https://github.com/eoin-obrien/prisma-extension-kysely) [setup](https://github.com/valtyr/prisma-kysely) mixing multiple database libraries.

**Your Kysely types** become the **single source of truth** for your `CREATE TABLE` statements.

**And also** for **creating and running migrations**, very much like Prisma and Drizzle.

## Tutorial

1. Check out this repository, `pnpm install` and `cd` to [`./example`](https://github.com/galvez/kysely-tables/tree/main/src/example).

2. Inspect `database.ts` to see how tables are defined. Note that these types are fully Kysely-compatible. The schema-oriented types are used as annotations, but Kysely queries get at they expect.

   ```ts
   export interface UsersTable {
     id: Generated<Primary<number>>
     fname: Sized<string, 100> | null
     email: Unique<Sized<string, 255>>
     passwordHash: Text<string>
     role: Default<string, "'member'">
     createdAt: Default<Date, 'now()'>
     updatedAt: Default<Date, 'now()'>
   }
   
   export interface ActivityLogTable {
     id: number
     teamId: number
     userId: Reference<UsersTable, 'id', number>
     action: string
     timestamp: Date
     ipAddress: string | null
   }
   ```
   
   In order for a table to recognized as such, the interface name needs to end with `Table`. Note also how we can use Kysely's `Generated` type together with this library's schema types.

## Syntax

<table>
<thead>
<tr>
<td><b>Type Utility</b></td>
<td><b>Description</b></td>
</tr>
</thead>
<tbody>
<tr>
<td>

`Sized<T, Size extends number>`

</td>
<td>

Generates `VARCHAR` columns (when available).

</td>
</tr>
<tr>
<td>

`Text<T>`

</td>
<td>

Generates `TEXT` columns.

</td>
</tr>
<tr>
<td>

`Reference<Table, Key, T>`

</td>
<td>

Generates `FOREIGN KEY` constraints.

</td>
</tr>
<tr>
<td>

`Default<T, value>`

</td>
<td>

Generates `DEFAULT <value>` clauses.

</td>
</tr>
<tr>
<td>

`Primary<T>`

</td>
<td>

Generates `PRIMARY KEY` clauses.

</td>
</tr>
<tr>
<td>

`Unique<T>`

</td>
<td>

Generates `UNIQUE` clauses and associated indexes.

</td>
</tr>
</tbody>
</table>

## Internals

I wrote this because I was unhappy with the APIs and workflows available in other libraries. I wanted my database management layer to be extremely light, but also architected in an transparent way, that would make me feel like I know what's going behind the scenes.

The main class is `KyselyTables`, which provides the `buildSchema()`, `buildSchemaReset()` and `buildSchemaRevision()` methods. The main code that analyzes the table interfaces and their column fields is `#registerTableColumns()`. They all use [TypeScript's compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API) to properly parse the source file, no regexes involved. The whole API is heavily inspired by Kysely, and of course, compatible with Kysely — the special types serve as hints for schema generation, but Kysely gets what it's expecting:

```ts
export type Unique<T> = T
export type Default<T, _V> = T
export type Primary<T> = T
export type Sized<T, _Size extends number> = T
```

The main class uses a `DialectAdapter` to generate the correct SQL statements for the database used.

As for parsing each column definition, it's done by a helper function called `extractType()`, which will check for all special types and use them to populate flags in each `ColumnDefinition`.

This should be enough for you to start digging and contribute if you wish!

## License

MIT
