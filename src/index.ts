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
  dialect,
}: CreateSQLSchemaFromFileOptions): string[] {
  const kt = new KyselyTables({
    filePath,
    fileName,
    dialect,
  })
  return kt.buildSchema()
}

type CreateSQLSchemaFromSourceOptions = {
  source: string
  fileName: string
  dialect: Dialect
}

export function createSQLSchemaFromSource({
  source,
  fileName,
  dialect,
}: CreateSQLSchemaFromSourceOptions): string[] {
  const kt = new KyselyTables({ source, fileName, dialect })
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
  dialect: Dialect
}

export function createSQLSchemaRevision({
  source,
  fileName,
  snapshotSource,
  snapshotFileName,
  dialect,
}: CreateSQLSchemaRevisionOptions): string[] {
  const snapshot = new KyselyTables({
    source: snapshotSource,
    fileName: snapshotFileName,
    dialect,
  })

  const tables = new KyselyTables({
    source,
    fileName,
    dialect,
  })

  return tables.buildSchemaRevision(snapshot.tables)
}
