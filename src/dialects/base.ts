import type { Dialect, DialectAdapter, TableDefinition } from '../types'

export abstract class BaseDialect implements DialectAdapter {
  tables: TableDefinition[]
  dialect: Dialect

  constructor(tables: TableDefinition[], dialect: Dialect) {
    this.tables = tables
    this.dialect = dialect
  }

  abstract buildPreamble(): string
  abstract buildColumn(tsType: string, nullable: boolean): string
  abstract buildTable(table: TableDefinition): string
  abstract buildIndexes(indexes: IndexDefinition[]): string[]
  abstract buildReferences(table: TableDefinition): string[]

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
