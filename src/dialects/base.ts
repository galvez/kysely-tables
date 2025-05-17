import { diff as jsonDiff } from 'json-diff'

import {
  DialectAdapter,
  TableDefinition,
  IndexDefinition,
  ColumnDefinition,
} from '../types'

export abstract class BaseDialect implements DialectAdapter {
  tables?: TableDefinition[]

  constructor(tables?: TableDefinition[]) {
    this.tables = tables
  }

  abstract buildPreamble(): string
  abstract buildSchemaReset(tables?: TableDefinition[]): string[]
  abstract buildTableDrop(name: string, ifExists?: boolean): string
  abstract buildColumn(column: ColumnDefinition, constraints?: string[]): string
  abstract buildTable(table: TableDefinition): string
  abstract buildIndexes(indexes: IndexDefinition[]): string[]
  abstract buildReferences(table: TableDefinition): string[]

  buildSchemaRevisions(
    tables: TableDefinition[],
    tablesSnapshot: TableDefinition[],
  ): {
    up: string[]
    down: string[]
  } {
    const revisions = { 
      up: [] as string[], 
      down: [] as string[]
    }
    const schemaDiff = jsonDiff(tablesSnapshot, tables) ?? []
    if (!schemaDiff.length) {
      return revisions
    }
    for (const rev of schemaDiff) {
      let revInfo
      switch (rev[0]) {
        case '~':
          for (const columnRev of rev[1].columns) {
            switch (columnRev[0]) {
              case '+':
                revInfo = columnRev[1]
                revisions.up.push(this.buildAddColumn(revInfo))
                revisions.down.push(this.buildDropColumn(revInfo))
                break
              case '-':
                revInfo = columnRev[1]
                revisions.up.push(this.buildDropColumn(revInfo))
                revisions.down.push(this.buildAddColumn(revInfo))
                break
              case '~':
                console.log(`table column changed`, columnRev)
                break
            }
          }
          break
        case '-':
          revisions.up.push(this.buildTableDrop(rev[1].name))
          revisions.down.push(this.buildTable(rev[1]))
          break
        case '+':
          revisions.up.push(this.buildTable(rev[1]))
          revisions.down.push(this.buildTableDrop(rev[1].name))
          break
      }
    }
    return revisions
  }

  buildAddColumn(column: any): string {
    return `ALTER TABLE "${column.tableName}" ADD COLUMN${this.buildColumn(column)};`
  }

  buildDropColumn(column: any): string {
    return `ALTER TABLE "${column.tableName}" DROP COLUMN "${column.name}";`
  }

  protected validateTableExists(tableName: string): void {
    if (!this.tables) {
      throw new Error('Tables not populated for this instance')
    }
    const table = this.tables.find((t) => t.name === tableName)
    if (!table) {
      throw new Error(`Table "${tableName}" does not exist`)
    }
  }

  protected validateColumnExists(tableName: string, columnName: string): void {
    if (!this.tables) {
      throw new Error('Tables not populated for this instance')
    }
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
