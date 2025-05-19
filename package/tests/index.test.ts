// import './tree.test.ts'

import test from 'node:test'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createSQLSchemaFromSource } from '../index'

const dev = process.argv.includes('--dev') || process.env.DEV
const __dirname = dirname(fileURLToPath(import.meta.url))

// Kysely utility types
// test('ColumnType<S, I, U> type utility', makeTest('coltype', 'postgres'))
// test('ColumnType<S, I, U> type utility', makeTest('coltype', 'sqlite'))

// test('Generated<T> type utility', makeTest('generated', 'postgres'))
// test('Generated<T> type utility', makeTest('generated', 'sqlite'))

// // Added utility types
// test('Default<T, V> type utility', makeTest('default', 'postgres'))
// test('Default<T, V> type utility', makeTest('default', 'sqlite'))

// test('Primary<T> type utility', makeTest('primary', 'postgres'))
// test('Primary<T> type utility', makeTest('primary', 'sqlite'))

// test('String type utilities', makeTest('strings', 'postgres'))
// test('String type utilities', makeTest('strings', 'sqlite'))

test('Number type utilities', makeTest('numbers', 'postgres'))
test('Number type utilities', makeTest('numbers', 'sqlite'))

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
