// src/adapters/sqlite-adapter.ts
import { BaseDatabaseAdapter } from './base-adapter'
import { TableDefinition, IndexDefinition } from '../types'

export class SQLiteAdapter extends BaseDatabaseAdapter {
  constructor(tables: TableDefinition[]) {
    super(tables, 'sqlite')
  }

  getPreamble(): string {
    return 'PRAGMA foreign_keys = ON;'
  }

  convertTSTypeToSQL(tsType: string, nullable: boolean): string {
    let sqlType: string

    // SQLite has a simplified type system (TEXT, INTEGER, REAL, BLOB)

    // Check for Text type
    const textMatch = tsType.match(/^Text<([^>]+)>$/)
    if (textMatch) {
      return 'TEXT'
    }

    // Check for Sized type - SQLite doesn't enforce varchar size
    const sizedMatch = tsType.match(/^Sized<([^,]+),\s*(\d+)>$/)
    if (sizedMatch) {
      const underlyingType = sizedMatch[1].trim()

      if (underlyingType === 'string') {
        // SQLite treats VARCHAR(n) the same as TEXT, but we'll include it for documentation
        const size = sizedMatch[2].trim()
        return `VARCHAR(${size})`
      }
      return 'TEXT'
    }

    switch (tsType) {
      case 'string':
        sqlType = 'TEXT'
        break
      case 'number':
        sqlType = 'INTEGER'
        break
      case 'Date':
        sqlType = 'TEXT' // SQLite stores dates as TEXT, REAL, or INTEGER
        break
      case 'boolean':
        sqlType = 'INTEGER' // SQLite uses INTEGER 0/1 for booleans
        break
      default:
        if (tsType.startsWith('Pick<')) {
          sqlType = 'TEXT' // SQLite doesn't have native JSON type
        } else {
          sqlType = 'TEXT'
        }
    }

    return sqlType
  }

  generateCreateTableStatement(table: TableDefinition): string {
    let sql = `CREATE TABLE IF NOT EXISTS ${this.quoteIdentifier(table.name)} (\n`

    const columnDefinitions: string[] = []

    for (const column of table.columns) {
      let colDef = `  ${this.quoteIdentifier(column.name)} `

      if (column.isPrimaryKey && column.isGenerated) {
        // SQLite uses INTEGER PRIMARY KEY AUTOINCREMENT for auto-increment
        colDef += 'INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL'
      } else {
        const sqlType = this.convertTSTypeToSQL(column.tsType, column.nullable)
        colDef += sqlType

        // Add default value
        if (column.defaultValue) {
          if (column.defaultValue === 'now()') {
            colDef += " DEFAULT (datetime('now'))"
          } else if (column.defaultValue === 'CURRENT_TIMESTAMP') {
            colDef += ' DEFAULT CURRENT_TIMESTAMP'
          } else {
            colDef += ` DEFAULT ${column.defaultValue}`
          }
        }

        // Add NOT NULL constraint
        if (!column.nullable) {
          colDef += ' NOT NULL'
        }

        // Handle primary key for non-generated columns
        if (column.isPrimaryKey && !column.isGenerated) {
          colDef += ' PRIMARY KEY'
        }
      }

      // Handle unique constraints
      if (column.isUnique && !column.isPrimaryKey) {
        colDef += ' UNIQUE'
      }

      columnDefinitions.push(colDef)
    }

    sql += columnDefinitions.join(',\n')

    // Add foreign key constraints at table level with proper SQLite syntax
    const foreignKeys = this.generateTableLevelForeignKeys(table)
    if (foreignKeys.length > 0) {
      sql += ',\n' + foreignKeys.join(',\n')
    }

    sql += '\n);'

    return sql
  }

  private generateTableLevelForeignKeys(table: TableDefinition): string[] {
    const constraints: string[] = []

    for (const column of table.columns) {
      if (column.referencesTable && column.referencesColumn) {
        // Use simple SQLite syntax for foreign keys
        let constraint = `  FOREIGN KEY(${this.quoteIdentifier(column.name)}) REFERENCES ${this.quoteIdentifier(column.referencesTable)}(${this.quoteIdentifier(column.referencesColumn)})`

        // Add referential actions if they're not the default
        const onDelete = this.convertSQLiteReferentialAction(
          column.onDelete || 'no action',
        )
        const onUpdate = this.convertSQLiteReferentialAction(
          column.onUpdate || 'no action',
        )

        if (onDelete !== 'NO ACTION') {
          constraint += ` ON DELETE ${onDelete}`
        }

        if (onUpdate !== 'NO ACTION') {
          constraint += ` ON UPDATE ${onUpdate}`
        }

        constraints.push(constraint)
      }
    }

    return constraints
  }

  private convertSQLiteReferentialAction(action: string): string {
    // SQLite supports most referential actions
    switch (action.toUpperCase()) {
      case 'NO ACTION':
        return 'NO ACTION'
      case 'CASCADE':
        return 'CASCADE'
      case 'SET NULL':
        return 'SET NULL'
      case 'SET DEFAULT':
        return 'SET DEFAULT'
      case 'RESTRICT':
        return 'RESTRICT'
      default:
        return 'NO ACTION'
    }
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
        // Convert each column name to snake_case for the index name
        const snakeCaseColumns = index.columns.map((col) =>
          this.convertNameToSnakeCase(col),
        )
        indexName = `idx_${index.tableName}_${snakeCaseColumns.join('_')}`
      }

      const indexType = index.options?.unique
        ? 'CREATE UNIQUE INDEX'
        : 'CREATE INDEX'
      const columns = index.columns
        .map((col) => this.quoteIdentifier(col))
        .join(', ')

      // SQLite doesn't have IF NOT EXISTS for indexes, so we need to check differently
      indexStatements.push(
        `${indexType} IF NOT EXISTS ${this.quoteIdentifier(indexName)} ON ${this.quoteIdentifier(index.tableName)} (${columns});`,
      )
    }

    return indexStatements
  }

  // SQLite foreign keys are defined at table creation time. This method returns 
  // an empty array since they're handled in generateCreateTableStatement().
  generateForeignKeyConstraints(table: TableDefinition): string[] {
    return []
  }

  quoteIdentifier(identifier: string): string {
    return `"${identifier}"`
  }

  getStatementSeparator(): string {
    return ';'
  }

  supportsGeneratedColumns(): boolean {
    return false
  }

  supportsCheckConstraints(): boolean {
    return true
  }

  supportsPartialIndexes(): boolean {
    return true
  }
}
