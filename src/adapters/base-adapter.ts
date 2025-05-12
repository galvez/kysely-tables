import { DatabaseAdapter, TableDefinition } from '../types'

export abstract class BaseDatabaseAdapter implements DatabaseAdapter {
  protected tables: TableDefinition[]
  protected databaseType: import('../types').DatabaseType

  constructor(
    tables: TableDefinition[],
    databaseType: import('../types').DatabaseType,
  ) {
    this.tables = tables
    this.databaseType = databaseType
  }

  protected convertNameToSnakeCase(name: string): string {
    return name
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  }
  
  // Abstract methods
  abstract convertTSTypeToSQL(tsType: string, nullable: boolean): string
  abstract generateCreateTableStatement(table: TableDefinition): string
  abstract generateIndexStatements(indexes: IndexDefinition[]): string[]
  abstract generateForeignKeyConstraints(table: TableDefinition): string[]
  abstract quoteIdentifier(identifier: string): string
  abstract getStatementSeparator(): string
  abstract supportsGeneratedColumns(): boolean
  abstract supportsCheckConstraints(): boolean
  abstract supportsPartialIndexes(): boolean

  protected validateTableExists(tableName: string): void {
    const table = this.tables.find((t) => t.name === tableName)
    if (!table) {
      throw new Error(`Table "${tableName}" does not exist`)
    }
  }

  protected validateColumnExists(tableName: string, columnName: string): void {
    const table = this.tables.find((t) => t.name === tableName)
    if (!table) {
      throw new Error(`Table "${tableName}" does not exist`)
    }

    const column = table.columns.find((col) => col.name === columnName)
    if (!column) {
      throw new Error(
        `Column "${columnName}" does not exist in table "${tableName}"`,
      )
    }
  }
}
