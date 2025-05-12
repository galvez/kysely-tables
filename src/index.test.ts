import test from 'node:test'
import { ok } from 'node:assert'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  createSQLSchemaFromSource,
  PostgreSQLDialect,
  SQLiteDialect,
} from './index'

const __dirname = dirname(fileURLToPath(import.meta.url))

test('official SaaS Starter from Next.js', () => {
  const tsSchema = join(__dirname, 'fixtures', 'next-saas.schema.ts')
  const source = readFileSync(tsSchema, 'utf8')

  const outputs = [
    [
      PostgreSQLDialect,
      join(__dirname, 'fixtures', 'next-saas.schema.pgsql.sql'),
    ],
    [SQLiteDialect, join(__dirname, 'fixtures', 'next-saas.schema.sqlite.sql')],
  ]

  for (const [dialect, outputPath] of outputs) {
    const output = createSQLSchemaFromSource({
      source,
      fileName: 'schema.ts',
      dialect,
    })
    writeFileSync(outputPath, output)
    ok(output === readFileSync(outputPath, 'utf8'))
  }
})

test("compatibility with Kysely's type utilities", () => {
  const tsSchema = join(__dirname, 'fixtures', 'kysely-compat.schema.ts')
  const source = readFileSync(tsSchema, 'utf8')

  const outputs = [
    [
      PostgreSQLDialect,
      join(__dirname, 'fixtures', 'kysely-compat.schema.pgsql.sql'),
    ],
    [
      SQLiteDialect,
      join(__dirname, 'fixtures', 'kysely-compat.schema.sqlite.sql'),
    ],
  ]

  for (const [dialect, outputPath] of outputs) {
    const output = createSQLSchemaFromSource({
      source,
      fileName: 'schema.ts',
      dialect,
    })
    writeFileSync(outputPath, output)
    ok(output === readFileSync(outputPath, 'utf8'))
  }
})
