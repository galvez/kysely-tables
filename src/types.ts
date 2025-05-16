import { PostgresDialect } from './dialects/pgsql'
import { SqliteDialect } from './dialects/sqlite'

export type Dialect =
  | (new (tables: TableDefinition[]) => PostgresDialect)
  | (new (tables: TableDefinition[]) => SqliteDialect)

export interface DialectAdapter {
  buildPreamble(): string
  buildSchemaReset(tables: TableDefinition[]): string
  buildColumn(column: ColumnDefinition): string
  buildTable(table: TableDefinition): string
  buildIndexes(indexes: IndexDefinition[]): string[]
  buildReferences(table: TableDefinition): string[]
}

export type BuildSchemaOptions = {
  source?: string
  filePath?: string
  fileName: string
  dialect: Dialect
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
  onDelete?: 'no action' | 'cascade' | 'set null' | 'set default' | 'restrict'
  onUpdate?: 'no action' | 'cascade' | 'set null' | 'set default' | 'restrict'
  isGenerated?: boolean
  insertType?: string
  updateType?: string
  isUpdateable?: boolean
}

export interface TableDefinition {
  name: string
  interfaceName: string
  columns: ColumnDefinition[]
}

export interface IndexDefinition {
  tableName: string
  columns: string[]
  options?: {
    unique?: boolean
    name?: string
  }
}

export type Reference<_Table, _Column, T> = T
export type Unique<T> = T
export type Default<T, _V> = T
export type Primary<T> = T
export type Sized<T, _Size extends number> = T
export type Text<T> = T
export type Keys<T extends string[]> = T
export type Index<_Table, Columns> = Columns
export type UniqueIndex<_Table, Columns> = Columns
