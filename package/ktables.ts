import ts from 'typescript'

import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { snakeCase } from 'scule'

import { extractType, extractDialect } from './tree.js'

import {
  Dialect,
  DialectAdapter,
  BuildSchemaOptions,
  TableDefinition,
  ColumnDefinition,
  SchemaRevisionStatement,
} from './types.js'

export class KyselyTables {
  tables: TableDefinition[]
  dialect?: Dialect
  sourceFile: ts.SourceFile
  #tableInterfaces: Set<string>

  #adapter: DialectAdapter | null

  constructor(options: BuildSchemaOptions) {
    this.tables = []

    this.#tableInterfaces = new Set()
    this.#adapter = null

    let sourceCode: string
    let fileName: string

    if (options.source) {
      sourceCode = options.source
      fileName = options.fileName
    } else if (options.filePath) {
      try {
        sourceCode = readFileSync(options.filePath, 'utf8')
        fileName = basename(options.filePath)
      } catch (error) {
        throw new Error(
          `Failed to read file ${options.filePath}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        )
      }
    } else {
      throw new Error('Either source or filePath must be provided')
    }

    if (typeof sourceCode !== 'string') {
      throw new Error('Source code must be a string')
    }

    this.dialect = options.dialect ?? extractDialect(sourceCode)

    this.sourceFile = ts.createSourceFile(
      fileName,
      sourceCode,
      ts.ScriptTarget.Latest,
      true,
    )
  }

  #registerTables(node: ts.Node): void {
    if (ts.isInterfaceDeclaration(node)) {
      const interfaceName = node.name.text
      if (interfaceName.endsWith('Table')) {
        this.#tableInterfaces.add(interfaceName)
      }
    }
    ts.forEachChild(node, this.#registerTables.bind(this))
  }

  #getTableNameFromInterface(interfaceName: string): string {
    const withoutSuffix = interfaceName.replace(/Table$/, '')
    return snakeCase(withoutSuffix)
  }

  #registerTableColumns(node: ts.Node): void {
    if (ts.isInterfaceDeclaration(node)) {
      const interfaceName = node.name.text

      if (!interfaceName.endsWith('Table')) {
        return
      }

      const tableName = this.#getTableNameFromInterface(interfaceName)
      const columns: ColumnDefinition[] = []

      for (const member of node.members) {
        if (
          ts.isPropertySignature(member) &&
          member.name &&
          ts.isIdentifier(member.name)
        ) {
          const columnName = member.name.text

          const column: ColumnDefinition = {
            tableName,
            interfaceName,
            name: columnName,
            nullable: false,
          }

          if (member.type) {
            extractType(member.type, column)
          }

          if (column.referencesTable) {
            if (!this.#tableInterfaces.has(column.referencesTable)) {
              throw new Error(
                `Reference error: Interface "${
                  column.referencesTable
                }" does not correspond to a valid table. Available tables are: ${Array.from(
                  this.#tableInterfaces,
                )
                  .map((t) => t + 'Table')
                  .join(', ')}`,
              )
            }
          }

          columns.push(column)
        }
      }

      this.tables.push({ interfaceName, name: tableName, columns })
    }

    ts.forEachChild(node, this.#registerTableColumns.bind(this))
  }

  buildSchema(): string[] {
    this.#registerTables(this.sourceFile)
    this.#registerTableColumns(this.sourceFile)

    if (!this.dialect) {
      throw new Error('Missing `dialect` export.')
    }

    this.#adapter = new this.dialect(this.tables)

    let sql = []

    const preamble = this.#adapter!.buildPreamble()
    if (preamble) {
      sql.push(preamble)
    }

    if (this.tables.length) {
      for (const table of this.tables) {
        sql.push(this.#adapter!.buildTable(table))
      }
    }

    return sql
  }

  registerTables() {
    this.#registerTables(this.sourceFile)
    this.#registerTableColumns(this.sourceFile)
  }

  buildSchemaReset(): SchemaRevisionStatement[] {
    this.registerTables()
    if (!this.dialect) {
      throw new Error('Missing `dialect` export.')
    }
    this.#adapter = new this.dialect(this.tables)
    return this.#adapter!.buildSchemaReset()
  }

  buildSchemaRevisions(tablesSnapshot: TableDefinition[]): {
    up: SchemaRevisionStatement[]
    down: SchemaRevisionStatement[]
  } {
    this.registerTables()
    if (!this.dialect) {
      throw new Error('Missing `dialect` export.')
    }
    this.#adapter = new this.dialect(this.tables)
    return {
      up: this.#adapter!.buildSchemaRevisions(
        structuredClone(this.tables),
        structuredClone(tablesSnapshot),
      ),
      down: this.#adapter!.buildSchemaRevisions(
        structuredClone(tablesSnapshot),
        structuredClone(this.tables),
      ),
    }
  }
}
