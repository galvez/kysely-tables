import { snakeCase } from 'scule'
import { BaseDialect } from './base'
import { TableDefinition, ColumnDefinition, IndexDefinition } from '../types'
import { diff as jsonDiff } from 'json-diff'

export class SqliteDialect extends BaseDialect {
  buildPreamble(): string {
    return 'PRAGMA foreign_keys = ON;'
  }

  buildSchemaReset(tables?: TableDefinition[]): string[] {
    const output = []
    const iterable = tables ?? this.tables
    if (iterable && iterable.length) {
      output.push('PRAGMA foreign_keys = OFF;')
      for (const table of iterable) {
        output.push(this.buildTableDrop(table.name, true))
      }
      output.push('PRAGMA foreign_keys = OFF;')
    }
    return output
  }

  buildTableDrop(name: string, ifExists?: boolean): string {
    return `DROP TABLE${ifExists ? ' IF EXISTS ' : ' '}"${name}";`
  }

  buildSchemaRevision(
    tables: TableDefinition[], 
    tablesSnapshot: TableDefinition[]
  ): string[] {
    const revision = []
    const schemaDiff = jsonDiff(tablesSnapshot, tables) ?? []
    if (!schemaDiff.length) {
      return []
    }
    const adapter = new SqliteDialect()
    for (const rev of schemaDiff) {
      switch (rev[0]) {
        case '~':
          for (const columnRev of rev[1].columns) {
            switch (columnRev[0]) {
              case '+':
                console.log(`table column added`, columnRev)
                break
              case '-':
                console.log(`table column removed`, columnRev)
                break
              case '~':
                console.log(`table column changed`, columnRev)
                break
            }
          }
          break
        case '-':
          revision.push(adapter.buildTableDrop(rev[1].name))
          break
        case '+':
          revision.push(adapter.buildTable(rev[1]))
          break
      }
    }
    // const sql = []
    // if (!tables.length) {
    // }
    // return sql
    return revision
  }

  buildColumn(column: ColumnDefinition): string {
    let sqlType: string

    if (column.isText) {
      return 'TEXT'
    }

    if (column.size) {
      if (column.tsType === 'string') {
        return `VARCHAR(${column.size})`
      }
      return 'TEXT'
    }

    switch (column.tsType) {
      case 'string':
        sqlType = 'TEXT'
        break
      case 'number':
        sqlType = 'INTEGER'
        break
      case 'Date':
        sqlType = 'TEXT'
        break
      case 'boolean':
        sqlType = 'INTEGER'
        break
      default:
        // if (column.tsType.startsWith('JSONColumnType<')) {
        //   // Keeping this here in case SQLite ever gets JSON type
        //   sqlType = 'TEXT'
        // } else {
        sqlType = 'TEXT'
      // }
    }

    return sqlType
  }

  buildTable(table: TableDefinition): string {
    let sql = `CREATE TABLE IF NOT EXISTS "${table.name}" (\n`

    const columnDefinitions: string[] = []

    for (const column of table.columns) {
      let colDef = `  "${column.name}" `

      if (column.isPrimaryKey && column.isGenerated) {
        colDef += 'INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL'
      } else {
        const sqlType = this.buildColumn(column)
        colDef += sqlType

        if (column.defaultValue) {
          if (column.defaultValue === "now()") {
            colDef += " DEFAULT (datetime('now'))"
          } else if (column.defaultValue === 'CURRENT_TIMESTAMP') {
            colDef += ' DEFAULT CURRENT_TIMESTAMP'
          } else {
            colDef += ` DEFAULT ${column.defaultValue}`
          }
        }

        if (!column.nullable) {
          colDef += ' NOT NULL'
        }

        if (column.isPrimaryKey && !column.isGenerated) {
          colDef += ' PRIMARY KEY'
        }
      }

      if (column.isUnique && !column.isPrimaryKey) {
        colDef += ' UNIQUE'
      }

      columnDefinitions.push(colDef)
    }

    sql += columnDefinitions.join(',\n')

    const foreignKeys = this.buildTableLevelReferences(table)
    if (foreignKeys.length > 0) {
      sql += ',\n' + foreignKeys.join(',\n')
    }

    sql += '\n);'

    return sql
  }

  private buildTableLevelReferences(table: TableDefinition): string[] {
    const constraints: string[] = []

    for (const column of table.columns) {
      if (column.referencesTable && column.referencesColumn) {
        let constraint = `  FOREIGN KEY("${column.name}") REFERENCES "${
          column.referencesTable
        }"("${column.referencesColumn}")`

        constraints.push(constraint)
      }
    }

    return constraints
  }

  buildIndexes(indexes: IndexDefinition[]): string[] {
    const indexStatements: string[] = []
    const indexSignatures = new Set<string>()

    for (const index of indexes) {
      const signature = `${index.tableName}:${index.columns.join(',')}`

      if (indexSignatures.has(signature)) {
        throw new Error(
          `Duplicate index detected: An index on table "${index.tableName}" with columns [${index.columns.join(
            ', ',
          )}] has been defined multiple times.`,
        )
      }

      indexSignatures.add(signature)

      this.validateTableExists(index.tableName)
      for (const column of index.columns) {
        this.validateColumnExists(index.tableName, column)
      }

      let indexName: string

      if (index.options?.name) {
        indexName = index.options.name
      } else {
        const snakeCaseColumns = index.columns.map(snakeCase)
        indexName = `idx_${index.tableName}_${snakeCaseColumns.join('_')}`
      }

      const indexType = index.options?.unique
        ? 'CREATE UNIQUE INDEX'
        : 'CREATE INDEX'
      const columns = index.columns.map((col) => `"${col}"`).join(', ')

      indexStatements.push(
        `${indexType} IF NOT EXISTS "${indexName}" ON "${index.tableName}" (${columns});`,
      )
    }

    return indexStatements
  }

  buildReferences(_table: TableDefinition): string[] {
    return []
  }
}
