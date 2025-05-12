import { PostgresDialect } from './dialects/pgsql'
import { SqliteDialect } from './dialects/sqlite'

export type Dialect = PostgresDialect | SqliteDialect

export interface DialectAdapter {
  buildPreamble(): string
  buildColumn(tsType: string): string
  buildTable(table: TableDefinition): string
  buildIndexes(indexes: IndexDefinition[]): string[]
  buildReferences(table: TableDefinition): string[]
}

export type ConverterOptions = {
  source?: string
  filePath?: string
  fileName: string
  dialect: DialectAdapter
}

export interface ColumnDefinition {
  name: string
  tsType: string
  nullable: boolean
  isPrimaryKey?: boolean
  isUnique?: boolean
  defaultValue?: string
  referencesTable?: string
  referencesColumn?: string
  onDelete?: 'no action' | 'cascade' | 'set null' | 'set default' | 'restrict'
  onUpdate?: 'no action' | 'cascade' | 'set null' | 'set default' | 'restrict'
  isGenerated?: boolean
  insertType?: string
  updateType?: string
  isUpdateable?: boolean
}

export interface TableDefinition {
  name: string
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
export type Generated<T> = T
export type ColumnType<
  SelectType,
  _InsertType = SelectType,
  _UpdateType = SelectType,
> = SelectType
export type Unique<T> = T
export type Default<T, _V> = T
export type Primary<T> = T
export type Sized<T, _Size extends number> = T
export type Text<T> = T
export type Keys<T extends string[]> = T
export type Index<_Table, Columns> = Columns
export type UniqueIndex<_Table, Columns> = Columns
