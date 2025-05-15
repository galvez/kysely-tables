import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'
import { readFileSync, writeFileSync } from 'node:fs'

import { createSQLSchemaFromSource, PostgresDialect, SqliteDialect } from '../index'

const __dirname = dirname(fileURLToPath(import.meta.url))

const output = createSQLSchemaFromSource({
  source: readFileSync(join(__dirname, 'types.ts'), 'utf8'),
  fileName: 'schema.ts',
  dialect: PostgresDialect,
})

writeFileSync(join(__dirname, 'create.sql'), output)
