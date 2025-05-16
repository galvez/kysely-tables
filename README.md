# kysely-tables

An attempt to give [Kysely]() the same level of DX from [Prisma]() and [Drizzle]().

Use the **same Kysely types** for your **SQL table schema**, **migrations** and **queries**.

- No need for an intermediary [schema defining API](https://orm.drizzle.team/docs/schemas) or [schema language](https://www.prisma.io/docs/orm/prisma-schema/overview).
- No need to [connect to the database to retrieve the schema structure](https://github.com/RobinBlomberg/kysely-codegen).
- No need to [bloat](https://github.com/drizzle-team/drizzle-kysely) [your](https://github.com/eoin-obrien/prisma-extension-kysely) [setup](https://github.com/valtyr/prisma-kysely) mixing multiple database libraries.

**Your Kysely types** become the **single source of truth** for your `CREATE TABLE` statements.

**And also** for **creating and running migrations**, very much like Prisma and Drizzle.
