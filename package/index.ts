export { createDatabase } from './runner.js'

import { Dialect, SchemaRevisionStatement } from './types.js'
import { KyselyTables } from './ktables.js'

export { PostgresDialect, SqliteDialect } from './dialects/index.js'
export { KyselyTables } from './ktables.js'

export type {
  Dialect,
  DialectAdapter,
  ColumnDefinition,
  TableDefinition,
  BuildSchemaOptions,
} from './types.js'

export type { Reference, Unique, Default, Primary, Sized, Text } from './types.js'

type CreateSQLSchemaFromFileOptions = {
  filePath: string
  fileName: string
  dialect: Dialect
}

export function createSQLSchemaFromFile({
  filePath,
  fileName,
}: CreateSQLSchemaFromFileOptions): string[] {
  const kt = new KyselyTables({
    filePath,
    fileName,
  })
  return kt.buildSchema()
}

type CreateSQLSchemaFromSourceOptions = {
  source: string
  fileName: string
}

export function createSQLSchemaFromSource({
  source,
  fileName,
}: CreateSQLSchemaFromSourceOptions): string[] {
  const kt = new KyselyTables({ source, fileName })
  return kt.buildSchema()
}

export function createSQLSchemaResetFromSource({
  source,
  fileName,
}: CreateSQLSchemaFromSourceOptions): SchemaRevisionStatement[] {
  const kt = new KyselyTables({ source, fileName })
  return kt.buildSchemaReset()
}

type CreateSQLSchemaRevisionOptions = {
  source: string
  fileName: string
  snapshotSource: string
  snapshotFileName: string
}

export function createSQLSchemaRevision({
  source,
  fileName,
  snapshotSource,
  snapshotFileName,
}: CreateSQLSchemaRevisionOptions): {
  up: SchemaRevisionStatement[]
  down: SchemaRevisionStatement[]
} {
  const snapshot = new KyselyTables({
    source: snapshotSource,
    fileName: snapshotFileName,
  })
  snapshot.registerTables()

  const tables = new KyselyTables({
    source,
    fileName,
  })

  return tables.buildSchemaRevisions(snapshot.tables)
}
