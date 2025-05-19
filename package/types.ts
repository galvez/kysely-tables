import type { Pool, PoolClient } from 'pg'
import type { Database as SqliteDatabase } from 'better-sqlite3'

import { PostgresDialect } from './dialects/postgres'
import { SqliteDialect } from './dialects/sqlite'

export type DatabaseDriver = Pool | PoolClient | SqliteDatabase

export type Dialect =
  | (new (tables?: TableDefinition[]) => PostgresDialect)
  | (new (tables?: TableDefinition[]) => SqliteDialect)

export interface DialectAdapter {
  buildPreamble(): string
  buildSchemaReset(tables?: TableDefinition[]): SchemaRevisionStatement[]
  buildSchemaRevisions(
    tables: TableDefinition[],
    tablesSnapshot: TableDefinition[],
  ): SchemaRevisionStatement[]
  buildTableDrop(name: string, ifExists?: boolean): SchemaRevisionStatement
  buildModifyColumn(
    tableName: string,
    column: ColumnDefinition,
  ): SchemaRevisionStatement
  buildColumn(column: ColumnDefinition, constraints?: string[]): string
  buildTable(table: TableDefinition): string
}

export type BuildSchemaOptions = {
  source?: string
  filePath?: string
  fileName: string
  dialect?: Dialect
}

export interface ColumnDefinition {
  tableName: string
  interfaceName: string
  name: string
  tsType?: string
  nullable: boolean
  isPrimaryKey?: boolean
  isUnique?: boolean
  isText?: boolean
  defaultValue?: string
  referencesTable?: string
  referencesColumn?: string
  size?: string
  isGenerated?: boolean
}

export interface TableDefinition {
  name: string
  interfaceName: string
  columns: ColumnDefinition[]
}

export type SchemaRevisionStatement = {
  sql?: string
  invalid?: { key: string; message: string }[]
  constraints?: string[]
  warning?: string
}

export type Reference<_Table, _Column extends string, T> = T
export type Unique<T extends string | null> = T
export type Default<T, _V> = T
export type Primary<T> = T
export type Sized<T extends string | null, _Size extends number> = T
export type Text<T extends string | null> = T
