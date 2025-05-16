export { createRunner } from './runner'

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
  const kt = new KyselyTables({
    source,
    fileName,
    dialect,
  })
  return kt.buildSchema()
}

export function createSQLSchemaResetFromSource({
  source,
  fileName,
  dialect,
}: CreateSQLSchemaFromSourceOptions): string[] {
  const kt = new KyselyTables({
    source,
    fileName,
    dialect,
  })
  return kt.buildSchemaReset()
}

export function createSQLSchemaRevisionFromSnapshot({
  source,
  fileName,
  dialect,
}: CreateSQLSchemaFromSourceOptions): string[] {
  const kt = new KyselyTables({
    source,
    fileName,
    dialect,
  })
  return kt.buildSchemaRevision()
}
