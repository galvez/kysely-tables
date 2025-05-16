import {
  DialectAdapter,
  TableDefinition,
  IndexDefinition,
  ColumnDefinition,
} from '../types'

export abstract class BaseDialect implements DialectAdapter {
  tables: TableDefinition[]

  constructor(tables: TableDefinition[]) {
    this.tables = tables
  }

  abstract buildPreamble(): string
  abstract buildSchemaReset(tables: TableDefinition[]): string
  abstract buildColumn(column: ColumnDefinition): string
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
