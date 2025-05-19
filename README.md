# kysely-tables

<br><img width="492" src="https://github.com/user-attachments/assets/89f956f4-10a8-40e0-9a5c-73a9d9cb9bbf" />

<br>Use the **same Kysely types** for your **SQL table schema**, **migrations** and **queries**.

- No need for an intermediary [schema defining API](https://orm.drizzle.team/docs/schemas) or [schema language](https://www.prisma.io/docs/orm/prisma-schema/overview).
- No need to [connect to the database to retrieve the schema structure](https://github.com/RobinBlomberg/kysely-codegen).
- No need to [bloat](https://github.com/drizzle-team/drizzle-kysely) [your](https://github.com/eoin-obrien/prisma-extension-kysely) [setup](https://github.com/valtyr/prisma-kysely) mixing multiple database libraries.

**Your Kysely types** become the **single source of truth** for your `CREATE TABLE` statements.

**And also** for **creating and running migrations**, very much like Prisma and Drizzle.

> [!IMPORTANT]
>
> This is a **proof-of-concept** project.
>
> The idea is to use _annotation types_ to enhance regular Kysely types while keeping them working as before.
>
> The _annotations_ are then used by a processor to generate SQL schemas and migrations (when diffing).
>
> It's in a state where it's **just about good enough** to start being tested in real projects.
>
> Bug reports and feature requests are extremely welcome.

## Tutorial

1. Check out this repository, `pnpm install` and `cd` to [`./example/sqlite`](https://github.com/galvez/kysely-tables/tree/main/examples/sqlite).

2. Inspect `db.ts` to see how tables are defined. Note that these types are fully Kysely-compatible. The schema types serve as hints for schema generation, but Kysely receives the underlying types it expects.

   ```ts
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
   ```

   In order for a table to recognized as such, the interface name needs to end with `Table`. Note also how we can use Kysely's [`Generated`](https://kysely-org.github.io/kysely-apidoc/types/Generated.html) type together with this library's schema types. Same is true for [`ColumnType`](https://kysely-org.github.io/kysely-apidoc/types/ColumnType.html).

3. Still in `db.ts`, you'll notice how the Kysely database instance is created through a wrapper, `createDatabase()`, and also that `dialect` is a top-level export.

   ```ts
   const driver = new SQLite3Database('db.sqlite')
   const dialect = new SqliteDialect({ database: driver })

   export default createDatabase<Database>({
     driver,
     config: {
       dialect,
     },
   })
   ```

   This is to ensure the **runner** knows which dialect to use.

4. Now it gets interesting: instead of packing a CLI, `kysely-tables` turns your schema file into one. This is what the `createDatabase()` wrapper is responsible for: parsing and understanding certain CLI flags when this file is executed directly. This is called the **runner**.

5. Let's begin by creating the database and applying the initial table schema:

   `% tsx db.tb --create`

   <img width="612" alt="SCR-20250518-uhmg" src="https://github.com/user-attachments/assets/722062b9-dcb7-4b2f-a015-35cae2ef063a" />

   Proceed and you'll see that both `database.sql` and `database.snapshot.ts` are created.

   <img width="612" alt="SCR-20250518-uiux" src="https://github.com/user-attachments/assets/9f875afd-bac8-470f-9ba1-764aebbe4254" />

   This _snapshot_ file is used for diffing purposes: when you change `db.ts`, the runner can know how the schema changed. Now let's create a **migration**, referred to as **schema revision** in this library.

6. Edit `db.ts` and remove any column from `UsersTable`:

   ```diff
     export interface UsersTable {
       id: Generated<Primary<number>>
       name: Sized<string, 100> | null
       email: Unique<Sized<string, 255>>
   -   passwordHash: Text<string>
       role: Default<string, "'member'">
       createdAt: Default<Date, 'now()'>
       updatedAt: Default<Date, 'now()'>
       deletedAt: null | Date
     }
   ```
   
   Then run:

   `% tsx db.tb --revision`

   <img width="612" alt="SCR-20250518-ukwr" src="https://github.com/user-attachments/assets/f0ddeb7d-4511-4d76-95f7-052d434e8923" />

> [!CAUTION]
> 
> Automated revisions are the most fragile part of this library at this moment. There are no tests for this feature yet, and it may break badly depending on the schema changes you carry out. It should handle most basic cases fine, but if you see anything wrong, [**please file a bug report**](https://github.com/galvez/kysely-tables/issues/new). To goal is to polish it to perfection. In case you want to dive in and debug it yourself, check out the [`schemaDiff()`](https://github.com/galvez/kysely-tables/blob/dev/package/dialects/base.ts#L158) function, though that is one extremely delicate piece of code. See the <a href="#internals"><b>Internals</b></a> section for more info.

Running with `--revision <rev>` gives a custom name to the revision.

Running with `--apply` bypasses the prompt check.

Running only with `--apply` will sync up to the latest revision.

Running only with `--apply <rev>` will sync up (or down) to the specified revision.

Even though `kysely-tables` is responsible for diffing and generating the SQL statements, the migrations run through [Postgrator](https://github.com/rickbergfalk/postgrator) under the hood. Postgrator is a mature and extremely well tested migration runner with support for PostgreSQL, SQLite, MySQL and MSSQL. It's used by [Platformatic](https://github.com/platformatic/platformatic).

## Reset

For convenience, a `--reset` flag is also available:

<img width="612" alt="SCR-20250519-bkcm" src="https://github.com/user-attachments/assets/286b033b-a249-481b-8e7e-30f92fa037b5" />

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

I wrote this because I was unhappy with the APIs and workflows available in [other](https://orm.drizzle.team/docs/migrations) [libraries](https://www.prisma.io/docs/orm/prisma-migrate/getting-started). Even Kysely itself has its own API for migrations, which differs from the types used to define tables. I wanted my database management layer to be **extremely light**, but also architected in an transparent way, that would make me feel like I know what's going behind the scenes.

The main class is `KyselyTables`, which provides the `buildSchema()`, `buildSchemaReset()` and `buildSchemaRevision()` methods. The main code that analyzes the table interfaces and their column fields is `#registerTableColumns()`. They all use [TypeScript's compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API) to properly parse the source file, no regexes involved. The whole API is heavily inspired by Kysely, and of course, compatible with Kysely.

The main class uses a `DialectAdapter` to generate the correct SQL statements for the database used.

As for parsing each column definition, it's done by a helper function called `extractType()`, which will check for all special types and use them to populate flags in each `ColumnDefinition`.

The trickiest part of the library is the schema diff detection. 

This first iteration uses [`json-diff`](https://github.com/andreyvit/json-diff), which is quite nice, but it still required some [massive data reconciliation glue code](https://github.com/galvez/kysely-tables/blob/dev/package/dialects/base.ts#L158). I aged six months in a week writing that function and do not recommend obssessing over it unless you have a very good alternative in mind and are willing to venture into the dark.

The [embedded runner](https://github.com/galvez/kysely-tables/blob/dev/package/runner.ts) that turns `db.ts` into a CLI is as minimalist as it can get. It isues [`minimist`](https://www.npmjs.com/package/minimist) for `process.argv` parsing and [`@clack/prompts`](https://www.npmjs.com/package/@clack/prompts) for the nice flows.

This should be enough for you to start digging and contribute if you wish!

## License

MIT
