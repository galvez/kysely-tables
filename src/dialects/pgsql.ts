import { snakeCase } from 'scule'
import { BaseDialect } from './base'
import {
  TableDefinition,
  IndexDefinition,
  ColumnDefinition,
  SchemaRevisionStatement,
} from '../types'

export class PostgresDialect extends BaseDialect {
  buildPreamble(): string {
    return ''
  }

  buildSchemaReset(tables?: TableDefinition[]): string[] {
    const output = []
    const iterable = tables ?? this.tables
    if (iterable && iterable.length) {
      for (const table of iterable) {
        output.push(this.buildTableDrop(table.name, true).sql)
      }
    }
    return output
  }

  buildTableDrop(name: string, ifExists?: boolean): SchemaRevisionStatement {
    return {
      sql: `DROP TABLE${ifExists ? ' IF EXISTS ' : ' '}"${name}" CASCADE;`,
    }
  }

  buildModifyColumn(
    tableName: string,
    columnDiff: any,
  ): SchemaRevisionStatement {
    let rename
    let cType
    const invalid: SchemaRevisionStatement['invalid'] = []
    const changes: string[] = []
    const keys = Object.keys(columnDiff)
    for (const key of keys) {
      if (key === 'name' && hasProp(columnDiff[key], '__old')) {
        rename = `RENAME COLUMN "${columnDiff[key].__old}" to "${columnDiff[key].__new}"`
      }
      if (!key.match(/((__deleted)|(__added))/)) {
        if (hasProp(columnDiff[key], '__old')) {
          if (key === 'nullable') {
            if (columnDiff[key].__new) {
              changes.push('SET NOT NULL')
            } else {
              changes.push('DROP NOT NULL')
            }
          } else if (key === 'tsType') {
            cType = `SET TYPE ${this.buildColumnPrimitiveType(columnDiff[key].__new)}`
          }
        }
      }
      if (key.endsWith('__deleted')) {
        const [_key] = key.split('__deleted')
        if (_key === 'isText' || _key === 'size') {
          cType = 'SET TYPE varchar(255)'
        }
        if (_key === 'defaultValue') {
          changes.push(`DROP DEFAULT`)
        }
        if (_key === 'isUnique') {
          changes.push(
            `DROP CONSTRAINT "${this.#getConstraintName(
              columnDiff.__original,
              'unique',
            )}"`,
          )
        }
        if (_key === 'isPrimaryKey') {
          changes.push(
            `DROP CONSTRAINT "${this.#getConstraintName(
              columnDiff.__original,
              'primary',
            )}"`,
          )
        }
      }
      if (key.endsWith('__added')) {
        const [_key] = key.split('__added')
        if (_key === 'isText') {
          changes.push('SET TYPE text')
        } else if (_key === 'size') {
          changes.push(`SET TYPE varchar(${columnDiff[key]})`)
        }
        if (_key === 'defaultValue') {
          changes.push(
            `SET DEFAULT ${this.#buildDefaultValue(columnDiff[key])}`,
          )
        }
        if (_key === 'isPrimary') {
          changes.push(
            `ADD CONSTRAINT "${this.#getConstraintName(
              columnDiff.__original,
              'PRIMARY',
            )} PRIMARY KEY ("${columnDiff.__original.name}")`,
          )
        }
        if (_key === 'isUnique') {
          changes.push(
            `ADD CONSTRAINT "${this.#getConstraintName(
              columnDiff.__original,
              'unique',
            )}" UNIQUE ("${columnDiff.__original.name}")`,
          )
        }
      }
    }
    if (cType) {
      changes.unshift(cType)
    }
    for (let i = 0; i < changes.length; i++) {
      changes[i] = `ALTER COLUMN "${columnDiff.__original.name}" ${changes[i]}`
    }
    if (rename) {
      return {
        sql: `ALTER TABLE "${tableName}"${
          changes.length ? ` ${changes.join(',\n')}` : ' '
        }${rename};`,
        warning:
          'Renaming columns is unsafe. In production,\n' +
          'first transfer data to a new column (expand)\n' +
          'and remove the old column later (contract).',
        invalid,
      }
    } else {
      return {
        sql: `ALTER TABLE "${tableName}"${
          changes.length ? ` ${changes.join(',\n')}` : ' '
        };`,
        invalid,
      }
    }
  }

  buildColumnType(column: ColumnDefinition): string {
    if (column.isText) {
      return 'text'
    }

    if (column.size) {
      if (column.tsType === 'string') {
        return `varchar(${column.size})`
      }
      return 'text'
    }

    return this.buildColumnPrimitiveType(column.tsType ?? '')
  }

  buildColumnPrimitiveType(tsType: string): string {
    switch (tsType) {
      case 'string':
        return 'varchar(255)'
      case 'number':
        return 'integer'
      case 'Date':
        return 'timestamp'
      case 'boolean':
        return 'boolean'
      default:
        return 'text'
    }
  }

  buildColumn(column: ColumnDefinition, constraints: string[]): string {
    let colDef = `  "${column.name}" `

    if (column.isGenerated) {
      colDef += 'serial NOT NULL'
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

    if (column.isPrimaryKey) {
      constraints.push(
        `  CONSTRAINT "${this.#getConstraintName(column, 'primary')}" PRIMARY KEY ("${column.name}")`,
      )
    }
    if (column.isUnique && !column.isPrimaryKey) {
      constraints.push(
        `  CONSTRAINT "${this.#getConstraintName(column, 'unique')}" UNIQUE ("${column.name}")`,
      )
    }

    return colDef
  }

  #buildDefaultValue(defaultValue: string) {
    if (defaultValue === 'now()') {
      return 'DEFAULT now()'
    } else if (defaultValue === 'CURRENT_TIMESTAMP') {
      return 'DEFAULT CURRENT_TIMESTAMP'
    } else {
      return `DEFAULT ${defaultValue}`
    }
  }

  #getConstraintName(column: ColumnDefinition, id: string) {
    return `${column.tableName}_${snakeCase(column.name)}_${snakeCase(id)}`
  }

  buildTable(table: TableDefinition): string {
    let sql = `CREATE TABLE IF NOT EXISTS "${table.name}" (\n`

    const columnDefinitions: string[] = []
    const constraints: string[] = []

    for (const column of table.columns) {
      const colDef = this.buildColumn(column, constraints)
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

      const indexType = index.options?.unique
        ? 'CREATE UNIQUE INDEX'
        : 'CREATE INDEX'
      const columns = index.columns.map((col) => `"${col}"`).join(', ')

      indexStatements.push(
        `${indexType} "${indexName}" ON "${index.tableName}"(${columns});`,
      )
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

function hasProp(obj: unknown, prop: string): boolean {
  if (typeof obj === 'object' && obj !== null) {
    return prop in obj
  }
  return false
}
