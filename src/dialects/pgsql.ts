import { snakeCase } from 'scule'
import { BaseDialect } from './base'
import { TableDefinition, IndexDefinition, ColumnDefinition } from '../types'

export class PostgresDialect extends BaseDialect {
  buildPreamble(): string {
    return ''
  }

  buildColumn(column: ColumnDefinition): string {
    let sqlType: string

    if (column.isText) {
      return 'text'
    }

    if (column.size) {
      if (column.tsType === 'string') {
        return `varchar(${column.size})`
      }
      return 'text'
    }

    switch (column.tsType) {
      case 'string':
        sqlType = 'varchar(255)'
        break
      case 'number':
        sqlType = 'integer'
        break
      case 'Date':
        sqlType = 'timestamp'
        break
      case 'boolean':
        sqlType = 'boolean'
        break
      default:
        // if (column.tsType.startsWith('JSONColumnType<')) {
        //   sqlType = 'jsonb'
        // } else {
          sqlType = 'text'
        // }
    }

    return sqlType
  }

  buildTable(table: TableDefinition): string {
    let sql = `CREATE TABLE IF NOT EXISTS "${table.name}" (\n`

    const columnDefinitions: string[] = []
    const constraints: string[] = []

    for (const column of table.columns) {
      let colDef = `  "${column.name}" `

      if (column.isPrimaryKey && column.isGenerated) {
        colDef += 'serial PRIMARY KEY NOT NULL'
      } else {
        const sqlType = this.buildColumn(column)
        colDef += sqlType

        if (column.defaultValue) {
          if (column.defaultValue === "now()") {
            colDef += ' DEFAULT now()'
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
        constraints.push(`  CONSTRAINT "${`${table.name}_${snakeCase(column.name)}_unique`}" UNIQUE("${column.name}")`)
      }

      columnDefinitions.push(colDef)
    }

    sql += columnDefinitions.join(',\n')

    const foreignKeys = this.buildTableLevelReferences(table)
    if (foreignKeys.length > 0) {
      sql += ',\n' + foreignKeys.join(',\n')
    }

    if (constraints.length > 0) {
      sql += ',\n' + constraints.join(',\n')
    }

    sql += '\n);'

    return sql
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

      const indexType = index.options?.unique ? 'CREATE UNIQUE INDEX' : 'CREATE INDEX'
      const columns = index.columns.map((col) => `"${col}"`).join(', ')

      indexStatements.push(`${indexType} "${indexName}" ON "${index.tableName}"(${columns});`)
    }

    return indexStatements
  }

  buildReferences(_table: TableDefinition): string[] {
    return []
  }

  private buildTableLevelReferences(table: TableDefinition): string[] {
    const constraints: string[] = []

    for (const column of table.columns) {
      if (column.referencesTable && column.referencesColumn) {
        const snakeCaseColumnName = snakeCase(column.name)
        const snakeCaseReferencedColumn = snakeCase(column.referencesColumn)

        const constraintName = `${snakeCaseColumnName}_${column.referencesTable}_${snakeCaseReferencedColumn}_fk`

        let constraint = `  CONSTRAINT "${constraintName}" FOREIGN KEY("${column.name}") REFERENCES "${
          column.referencesTable
        }"("${column.referencesColumn}")`

        constraints.push(constraint)
      }
    }

    return constraints
  }
}
