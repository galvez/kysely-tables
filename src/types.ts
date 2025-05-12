import PostgreSQLDialect from './dialects/pgsql'
import SQLiteDialect from './dialects/sqlite'

export type Dialect = PostgreSQLDialect | SQLiteDialect

export interface DialectAdapter {
  buildPreamble(): string
  buildColumn(tsType: string): string
  buildTable(table: Table): string
  buildIndexes(indexes: Index[]): string[]
  buildReferences(table: Table): string[]
}

export type ConverterOptions =
  | {
      filePath: string
      fileName: string
      adapter: DialectAdapter
    }
  | {
      source: string
      fileName: string
      adapter: DialectAdapter
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

export interface IndexIndefinition {
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
