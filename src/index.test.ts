import test from 'node:test'
import { ok } from 'node:assert'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  Dialect,
  createSQLSchemaFromSource,
  PostgresDialect,
  SqliteDialect,
} from './index'

const __dirname = dirname(fileURLToPath(import.meta.url))

test("compatibility with Kysely's type utilities", () => {
  const tsSchema = join(__dirname, 'fixtures', 'kysely-compat.schema.ts')
  const source = readFileSync(tsSchema, 'utf8')

  const outputs = [
    [
      PostgresDialect,
      join(__dirname, 'fixtures', 'kysely-compat.schema.pgsql.sql'),
    ],
    [
      SqliteDialect,
      join(__dirname, 'fixtures', 'kysely-compat.schema.sqlite.sql'),
    ],
  ]

  for (const [dialect, outputPath] of outputs) {
    const output = createSQLSchemaFromSource({
      source,
      fileName: 'schema.ts',
      dialect: dialect as Dialect,
    })
          writeFileSync(outputPath, output)

    ok(output === readFileSync(outputPath as string, 'utf8'))
  }
})

test('Default<T, V> type utility', () => {
  const tsSchema = join(__dirname, 'fixtures', 'default.schema.ts')
  const source = readFileSync(tsSchema, 'utf8')

  const outputs = [
    [PostgresDialect, join(__dirname, 'fixtures', 'default.schema.pgsql.sql')],
    [SqliteDialect, join(__dirname, 'fixtures', 'default.schema.sqlite.sql')],
  ]

  for (const [dialect, outputPath] of outputs) {
    const output = createSQLSchemaFromSource({
      source,
      fileName: 'schema.ts',
      dialect: dialect as Dialect,
    })
    if (existsSync(outputPath)) {
      // writeFileSync(outputPath.replace('.sql', '.debug.sql'), output)
      writeFileSync(outputPath, output)
      ok(output === readFileSync(outputPath, 'utf8'))
    } else {
      writeFileSync(outputPath, output)
    }
  }
})

test('official SaaS Starter from Next.js', () => {
  const tsSchema = join(__dirname, 'fixtures', 'next-saas.schema.ts')
  const source = readFileSync(tsSchema, 'utf8')

  const outputs = [
    [
      PostgresDialect,
      join(__dirname, 'fixtures', 'next-saas.schema.pgsql.sql'),
    ],
    [SqliteDialect, join(__dirname, 'fixtures', 'next-saas.schema.sqlite.sql')],
  ]

  for (const [dialect, outputPath] of outputs) {
    const output = createSQLSchemaFromSource({
      source,
      fileName: 'schema.ts',
      dialect: dialect as Dialect,
    })
    writeFileSync(outputPath.replace('.sql', '.debug.sql'), output)
    ok(output === readFileSync(outputPath as string, 'utf8'))
  }
})
