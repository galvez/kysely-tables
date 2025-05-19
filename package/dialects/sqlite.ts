import { BaseDialect } from './base.js'
import {
  TableDefinition,
  ColumnDefinition,
  SchemaRevisionStatement,
} from '../types.js'

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
      return 'text'
    }

    if (column.size) {
      if (column.tsType === 'string') {
        return 'text'
      }
      return 'text'
    }

    switch (column.tsType) {
      case 'string':
        sqlType = 'text'
        break
      case 'number':
        sqlType = 'integer'
        break
      case 'Date':
        sqlType = 'text'
        break
      case 'boolean':
        sqlType = 'integer'
        break
      default:
        // if (column.tsType.startsWith('JSONColumnType<')) {
        //   // Keeping this here in case SQLite ever gets JSON type
        //   sqlType = 'text'
        // } else {
        sqlType = 'text'
      // }
    }

    return sqlType
  }

  buildColumn(column: ColumnDefinition, constraints: string[]): string {
    let colDef = `  "${column.name}" `

    if (column.isPrimaryKey && column.isGenerated) {
      colDef += 'integer PRIMARY KEY AUTOINCREMENT NOT NULL'
    } else if (column.isPrimaryKey) {
      colDef += 'integer PRIMARY KEY NOT NULL'
    } else {
      const sqlType = this.buildColumnType(column)
      colDef += sqlType

      if (column.defaultValue) {
        colDef += ` ${this.#buildDefaultValue(column.defaultValue)}`
      }

      if (!column.nullable) {
        colDef += ' NOT NULL'
      }
    }

    if (column.isUnique && !column.isPrimaryKey) {
      constraints.push(
        `  CONSTRAINT "${this.getConstraintName(column, 'unique')}" UNIQUE("${column.name}")`,
      )
    }

    return colDef
  }

  #buildDefaultValue(defaultValue: string) {
    if (defaultValue === 'now()') {
      return "DEFAULT (datetime('now'))"
    } else if (defaultValue === 'CURRENT_TIMESTAMP') {
      return 'DEFAULT CURRENT_TIMESTAMP'
    } else {
      return `DEFAULT ${defaultValue}`
    }
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
}
