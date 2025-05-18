import { snakeCase } from 'scule'
import { BaseDialect } from './base'
import {
  Dialect,
  TableDefinition,
  ColumnDefinition,
  IndexDefinition,
  SchemaRevisionStatement,
} from '../types'

export class SqliteDialect extends BaseDialect {
  buildPreamble(): string {
    return 'PRAGMA foreign_keys = ON;'
  }

  buildSchemaReset(tables?: TableDefinition[]): SchemaRevisionStatement[] {
    const output: SchemaRevisionStatement[] = []
    const iterable = tables ?? this.tables
    if (iterable && iterable.length) {
      output.push({ sql: 'PRAGMA foreign_keys = OFF;' })
      for (const table of iterable) {
        const rev = this.buildTableDrop(table.name, true)
        if (rev.sql) {
          output.push(rev)
        }
      }
      output.push({ sql: 'PRAGMA foreign_keys = OFF;' })
    }
    return output
  }

  buildTableDrop(name: string, ifExists?: boolean): SchemaRevisionStatement {
    return { sql: `DROP TABLE${ifExists ? ' IF EXISTS ' : ' '}"${name}";` }
  }

  buildModifyColumn(
    tableName: string,
    columnDiff: any,
  ): SchemaRevisionStatement {
    let rename
    let invalid = []
    const keys = Object.keys(columnDiff)
    for (const key of keys) {
      if (key === 'name' && columnDiff[key].__old) {
        rename = `RENAME COLUMN "${columnDiff[key].__old}" to "${columnDiff[key].__new}"`
      }
      if (key.endsWith('__deleted') || key.endsWith('__added')) {
        const [_key] = key.split(/((__deleted)|(__added))/)
        invalid.push({
          key: columnDiff.__original.name,
          message:
            "SQLite doesn't support altering column types.\n" +
            'First transfer data to a new column (expand)\n' +
            'and remove the old column later (contract).',
        })
      }
    }
    if (rename) {
      return {
        sql: `ALTER TABLE "${tableName}" ${rename};`,
        warning:
          'Renaming columns is unsafe. In production,\n' +
          'first transfer data to a new column (expand)\n' +
          'and remove the old column later (contract).',
        invalid,
      }
    } else {
      return { invalid }
    }
  }

  buildColumnType(column: ColumnDefinition): string {
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

  buildColumn(column: ColumnDefinition, constraints: string[]): string {
    let colDef = `  "${column.name}" `

    if (column.isPrimaryKey && column.isGenerated) {
      colDef += 'INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL'
    } else if (column.isPrimaryKey) {
      colDef += 'INTEGER PRIMARY KEY NOT NULL'
    } else {
      const sqlType = this.buildColumnType(column)
      colDef += sqlType

      if (column.defaultValue) {
        if (column.defaultValue === 'now()') {
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
    }

    if (column.isUnique && !column.isPrimaryKey) {
      constraints.push(
        `  CONSTRAINT "${this.#getConstraintName(column, 'unique')}" UNIQUE("${column.name}")`,
      )
    }

    return colDef
  }

  #getConstraintName(column: ColumnDefinition, id: string) {
    return `${column.tableName}_${snakeCase(column.name)}_${snakeCase(id)}}`
  }

  buildTable(table: TableDefinition): string {
    let sql = `CREATE TABLE IF NOT EXISTS "${table.name}" (\n`

    const columnDefinitions: string[] = []
    const constraints: string[] = []

    for (const column of table.columns) {
      columnDefinitions.push(this.buildColumn(column, constraints))
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
