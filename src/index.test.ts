
import test from 'node:test'
import { ok } from 'node:assert'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { convertSourceToSQL } from './index.js'

test('should convert sample SaaS schema to PostgreSQL syntax', () => {
  const sourceCode = readFileSync('./fixtures/schema.ts', 'utf8')
  const output = convertSourceToSQL(sourceCode, 'schema.ts', 'postgresql')
  // writeFileSync('./fixtures/pgsql.sql', output)
  ok(output === readFileSync('./fixtures/pgsql.sql', 'utf8'))
})
