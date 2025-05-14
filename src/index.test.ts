import test from 'node:test'
import { ok } from 'node:assert'
import { readFileSync, writeFileSync } from 'node:fs'
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

// Kysely utility types
test('ColumnType<S, I, U> type utility', makeTest('coltype'))
test('Generated<T> type utility', makeTest('generated'))

// Added utility types
test('Default<T, V> type utility', makeTest('default'))
test('Primary<T> type utility', makeTest('primary'))
test('String type utilities', makeTest('strings'))
test('Number type utilities', makeTest('numbers'))

// Full examples
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
