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

const dev = process.argv.includes('--dev')
const __dirname = dirname(fileURLToPath(import.meta.url))

// Type utilities
test('Default<T, V> type utility', makeTest('default'))
test('ColumnType<S, I, U> type utility', makeTest('coltype'))

// Adapted from nextjs/saas-starter/blob/main/lib/db/schema.ts
test('Full SaaS schema example', makeTest('saas'))

function makeTest (name: string) {
  return () => {
    const tsSchema = join(__dirname, 'fixtures', `${name}.schema.ts`)
    const source = readFileSync(tsSchema, 'utf8')

    const outputs: [Dialect, string][] = [
      [PostgresDialect, join(__dirname, 'fixtures', `${name}.schema.pgsql.sql`)],
      [SqliteDialect, join(__dirname, 'fixtures', `${name}.schema.sqlite.sql`)],
    ]

    for (const [dialect, outputPath] of outputs) {
      const output = createSQLSchemaFromSource({
        source,
        fileName: '#fragment',
        dialect: dialect as Dialect,
      })
      if (dev) {
        writeFileSync(outputPath, output)
      }
      ok(output === readFileSync(outputPath, 'utf8'))
    }
  }
}