import { snakeCase } from 'scule'
import { BaseDialectAdapter } from './base'
import { TableDefinition, IndexDefinition } from '../types'

export class PostgreSQLDialect extends BaseDialectAdapter {
  constructor(tables: TableDefinition[]) {
    super(tables, 'postgresql')
  }

  getPreamble(): string {
    return ''
  }

  convertTSTypeToSQL(tsType: string): string {
    let sqlType: string

    const textMatch = tsType.match(/^Text<([^>]+)>$/)
    if (textMatch) {
      return 'text'
    }

    const sizedMatch = tsType.match(/^Sized<([^,]+),\s*(\d+)>$/)
    if (sizedMatch) {
      const underlyingType = sizedMatch[1].trim()
      const size = sizedMatch[2].trim()

      if (underlyingType === 'string') {
        return `varchar(${size})`
      }
      return 'text'
    }

    switch (tsType) {
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
        if (tsType.startsWith('Pick<')) {
          sqlType = 'json'
        } else {
          sqlType = 'text'
        }
    }

    return sqlType
  }

  generateCreateTableStatement(table: TableDefinition): string {
    let sql = `CREATE TABLE IF NOT EXISTS ${this.quoteIdentifier(table.name)} (\n`

    const columnDefinitions: string[] = []
    const constraints: string[] = []

    for (const column of table.columns) {
      let colDef = `  ${this.quoteIdentifier(column.name)} `

      if (column.isPrimaryKey && column.isGenerated) {
        colDef += 'serial PRIMARY KEY NOT NULL'
      } else {
        const sqlType = this.convertTSTypeToSQL(column.tsType, column.nullable)
        colDef += sqlType

        // Add default value before NOT NULL
        if (column.defaultValue) {
          if (column.defaultValue === 'CURRENT_TIMESTAMP') {
            colDef += ' DEFAULT now()'
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
        constraints.push(`  CONSTRAINT ${
          this.quoteIdentifier(`${table.name}_${snakeCase(column.name)}_unique`)
        } UNIQUE(${
          this.quoteIdentifier(column.name)
        })`)
      }

      columnDefinitions.push(colDef)
    }

    sql += columnDefinitions.join(',\n')

    if (constraints.length > 0) {
      sql += ',\n' + constraints.join(',\n')
    }

    sql += '\n);'

    return sql
  }

  generateIndexStatements(indexes: IndexDefinition[]): string[] {
    const indexStatements: string[] = []
    const indexSignatures = new Set<string>()

    for (const index of indexes) {
      // Create a unique signature for this index
      const signature = `${index.tableName}:${index.columns.join(',')}`

      // Check for duplicates
      if (indexSignatures.has(signature)) {
        throw new Error(
          `Duplicate index detected: An index on table "${index.tableName}" with columns [${index.columns.join(', ')}] has been defined multiple times.`,
        )
      }

      indexSignatures.add(signature)

      // Validate table and columns exist
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
      const columns = index.columns
        .map((col) => this.quoteIdentifier(col))
        .join(', ')

      indexStatements.push(
        `${indexType} ${this.quoteIdentifier(indexName)} ON ${this.quoteIdentifier(index.tableName)}(${columns});`,
      )
    }

    return indexStatements
  }

  generateForeignKeyConstraints(table: TableDefinition): string[] {
    const constraints: string[] = []

    for (const column of table.columns) {
      if (column.referencesTable && column.referencesColumn) {
        const snakeCaseColumnName = snakeCase(column.name)
        const snakeCaseReferencedColumn = snakeCase(column.referencesColumn)

        const constraintName = `${
          table.name
        }_${
          snakeCaseColumnName
        }_${
          column.referencesTable
        }_${
          snakeCaseReferencedColumn
        }_fk`
        const onDelete = column.onDelete || 'no action'
        const onUpdate = column.onUpdate || 'no action'

        constraints.push(`DO $$ BEGIN
 ALTER TABLE ${this.quoteIdentifier(table.name)} ADD CONSTRAINT ${this.quoteIdentifier(constraintName)}\n FOREIGN KEY (${this.quoteIdentifier(column.name)}) REFERENCES "public".${this.quoteIdentifier(column.referencesTable)}(${this.quoteIdentifier(column.referencesColumn)}) ON DELETE ${onDelete} ON UPDATE ${onUpdate};
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;`)
      }
    }

    return constraints
  }

  quoteIdentifier(identifier: string): string {
    // PostgreSQL uses double quotes for identifiers
    return `"${identifier}"`
  }

  supportsGeneratedColumns(): boolean {
    return true // PostgreSQL 12+ supports generated columns
  }

  supportsCheckConstraints(): boolean {
    return true
  }

  supportsPartialIndexes(): boolean {
    return true
  }
}
