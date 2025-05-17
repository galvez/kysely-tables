export { createDatabase } from './runner'

import { Dialect } from './types'
import { KyselyTables } from './ktables'

export { PostgresDialect, SqliteDialect } from './dialects'
export { KyselyTables } from './ktables'

export type {
  Dialect,
  DialectAdapter,
  ColumnDefinition,
  TableDefinition,
  IndexDefinition,
  BuildSchemaOptions,
} from './types'

export type {
  Reference,
  Unique,
  Default,
  Primary,
  Sized,
  Text,
  Keys,
  Index,
  UniqueIndex,
} from './types'

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
  dialect,
}: CreateSQLSchemaFromSourceOptions): string[] {
  const kt = new KyselyTables({ source, fileName, dialect })
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
  up: string[],
  down: string[]
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
