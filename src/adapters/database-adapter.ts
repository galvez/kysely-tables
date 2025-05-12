import { TableDefinition, IndexDefinition } from '../types'

export interface DatabaseAdapter {
  convertTSTypeToSQL(tsType: string, nullable: boolean): string
  generateCreateTableStatement(table: TableDefinition): string
  generateIndexStatements(indexes: IndexDefinition[]): string[]
  generateForeignKeyConstraints(table: TableDefinition): string[]
  quoteIdentifier(identifier: string): string
  supportsGeneratedColumns(): boolean
  supportsCheckConstraints(): boolean
  supportsPartialIndexes(): boolean
}

export class DatabaseAdapterFactory {
  static createAdapter(
    databaseType: import('../types').DatabaseType,
    tables: TableDefinition[],
  ): DatabaseAdapter {
    switch (databaseType) {
      case 'pgsql':
        return new (require('./postgresql-adapter').PostgreSQLAdapter)(tables)
      case 'sqlite':
        return new (require('./sqlite-adapter').SQLiteAdapter)(tables)
      default:
        throw new Error(`Unsupported database type: ${databaseType}`)
    }
  }
}
