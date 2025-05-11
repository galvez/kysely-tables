
export type DatabaseType = 'postgresql' | 'mssql' | 'sqlite';

export interface ConverterOptions {
  source?: string;
  filePath?: string;
  fileName?: string;
  databaseType?: DatabaseType;
}

export interface ColumnDefinition {
  name: string;
  tsType: string;
  nullable: boolean;
  isPrimaryKey?: boolean;
  isUnique?: boolean;
  defaultValue?: string;
  referencesTable?: string;
  referencesColumn?: string;
  onDelete?: 'no action' | 'cascade' | 'set null' | 'set default' | 'restrict';
  onUpdate?: 'no action' | 'cascade' | 'set null' | 'set default' | 'restrict';
  isGenerated?: boolean;
  insertType?: string;
  updateType?: string;
  isUpdateable?: boolean;
}

export interface TableDefinition {
  name: string;
  columns: ColumnDefinition[];
}

export interface IndexDefinition {
  tableName: string;
  columns: string[];
  options?: {
    unique?: boolean;
    name?: string;
  };
}

// Type utilities
export type Reference<Table, Column, KeyType> = KeyType;
export type Generated<T> = T;
export type ColumnType<SelectType, InsertType = SelectType, UpdateType = SelectType> = SelectType;
export type Unique<T> = T;
export type Default<T, V> = T;
export type Primary<T> = T;
export type Sized<T, Size extends number> = T;
export type Text<T> = T;
export type Keys<T extends string[]> = T;
export type Index<Table, Columns> = Columns;
export type UniqueIndex<Table, Columns> = Columns;
