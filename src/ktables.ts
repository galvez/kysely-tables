import ts from 'typescript'

import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { snakeCase } from 'scule'

import { extractType, extractKeysFromType } from './tree'

import {
  Dialect,
  DialectAdapter,
  BuildSchemaOptions,
  TableDefinition,
  ColumnDefinition,
  IndexDefinition,
} from './types'

export class KyselyTables {
  tables: TableDefinition[] = []

  private sourceFile: ts.SourceFile
  private tableInterfaces: Set<string>
  private indexes: IndexDefinition[] = []
  private dialect: Dialect

  #adapter: DialectAdapter | null

  constructor(options: BuildSchemaOptions) {
    this.tables = []
    this.tableInterfaces = new Set()
    this.dialect = options.dialect
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
        this.tableInterfaces.add(interfaceName)
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
            if (!this.tableInterfaces.has(column.referencesTable)) {
              throw new Error(
                `Reference error: Interface "${
                  column.referencesTable
                }" does not correspond to a valid table. Available tables are: ${Array.from(
                  this.tableInterfaces,
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

  #registerIndexes(node: ts.Node): void {
    if (ts.isTypeAliasDeclaration(node) && node.name.text === 'Indexes') {
      const isExported = node.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
      )
      if (!isExported) {
        return
      }

      this.#extractIndexesFromType(node.type)
    }

    ts.forEachChild(node, this.#registerIndexes.bind(this))
  }

  #extractIndexesFromType(typeNode: ts.TypeNode): void {
    if (ts.isUnionTypeNode(typeNode)) {
      for (const type of typeNode.types) {
        this.#extractSingleIndex(type)
      }
    } else {
      this.#extractSingleIndex(typeNode)
    }
  }

  #extractSingleIndex(typeNode: ts.TypeNode): void {
    if (
      ts.isTypeReferenceNode(typeNode) &&
      ts.isIdentifier(typeNode.typeName)
    ) {
      const typeName = typeNode.typeName.text

      if (typeName === 'Index' || typeName === 'UniqueIndex') {
        if (typeNode.typeArguments && typeNode.typeArguments.length >= 2) {
          const tableType = typeNode.typeArguments[0]
          let tableName = ''

          if (
            ts.isTypeReferenceNode(tableType) &&
            ts.isIdentifier(tableType.typeName)
          ) {
            tableName = this.#getTableNameFromInterface(tableType.typeName.text)
          }

          const columnsType = typeNode.typeArguments[1]
          const columns = extractKeysFromType(columnsType)

          if (tableName && columns.length > 0) {
            const options =
              typeName === 'UniqueIndex' ? { unique: true } : undefined
            this.indexes.push({ tableName, columns, options })
          }
        }
      }
    }
  }

  buildSchema(): string[] {
    this.#registerTables(this.sourceFile)
    this.#registerTableColumns(this.sourceFile)
    this.#registerIndexes(this.sourceFile)

    this.#adapter = new this.dialect(this.tables)

    let sql = []

    const preamble = this.#adapter.buildPreamble()
    if (preamble) {
      sql.push(preamble)
    }

    if (this.tables.length) {
      for (const table of this.tables) {
        sql.push(this.#adapter.buildTable(table))
      }
    }

    if (this.indexes.length > 0) {
      for (const index of this.#adapter.buildIndexes(this.indexes)) {
        sql.push(index)
      }
    }

    for (const table of this.tables) {
      for (const constraint of this.#adapter.buildReferences(table)) {
        sql.push(constraint)
      }
    }

    return sql
  }

  registerTables () {
    this.#registerTables(this.sourceFile)
    // TODO refactor to use a prepopulated Map for this.tables
    this.#registerTableColumns(this.sourceFile)
  }

  buildSchemaReset(): string[] {
    this.registerTables()
    this.#adapter = new this.dialect(this.tables)
    return this.#adapter.buildSchemaReset(this.tables)
  }

  buildSchemaRevision(tablesSnapshot: TableDefinition[]): string[] {
    this.registerTables()
    this.#adapter = new this.dialect(this.tables)
    return this.#adapter.buildSchemaRevision(this.tables, tablesSnapshot)
  }
}
