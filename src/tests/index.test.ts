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
} from '../index'

const dev = process.argv.includes('--dev')
const __dirname = dirname(fileURLToPath(import.meta.url))

// Kysely utility types
// test('ColumnType<S, I, U> type utility', makeTest('coltype'))
// test('Generated<T> type utility', makeTest('generated'))

// Added utility types
// test('Default<T, V> type utility', makeTest('default'))
// test('Primary<T> type utility', makeTest('primary'))
// test('String type utilities', makeTest('strings'))
// test('Number type utilities', makeTest('numbers'))

// Full examples
test('Full SaaS schema example', makeTest('saas', 'postgres'))
test('Full SaaS schema example', makeTest('saas', 'sqlite'))

function makeTest(name: string, dialect: string) {
  return () => {
    const tsSchema = join(__dirname, dialect, `${name}.schema.ts`)
    const source = readFileSync(tsSchema, 'utf8')

    const outputPath = join(__dirname, dialect, `${name}.schema.sql`)

    const output = createSQLSchemaFromSource({
      source,
      fileName: '#fragment',
    })
    if (dev) {
      writeFileSync(outputPath, output.join('\n\n'))
    }
    if (output.join('\n\n') !== readFileSync(outputPath, 'utf8')) {
      console.log(output)
      console.log()
      console.log('Test failed:', name)
      process.exit()
    }
  }
}
