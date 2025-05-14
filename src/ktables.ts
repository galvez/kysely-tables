import ts from 'typescript'

import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { snakeCase } from 'scule'

import { 
  extractNormalizedTypeString,
  extractNullableType, 
  extractDefaultType,
  extractColumnType,
  extractReferenceType,
  extractKeysFromType,
  extractIndexArray
} from './tree'

import {
  Dialect,
  DialectAdapter,
  ConverterOptions,
  TableDefinition,
  ColumnDefinition,
  IndexDefinition,
} from './types'

import { REFERENCE_UTILITY, SIZED_UTILITY } from './regex'

export class KyselyTables {
  private sourceFile: ts.SourceFile
  private tables: TableDefinition[]
  private tableInterfaces: Set<string>
  private indexes: IndexDefinition[] = []
  private dialect: Dialect

  #adapter: DialectAdapter | null

  constructor(options: ConverterOptions) {
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
        this.tableInterfaces.add(interfaceName.replace(/Table$/, ''))
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

          let type: string = ''
          let nullable: boolean = false

          if (member.type) {
            type = extractNormalizedTypeString(member.type)
          }

          if (!type) {
            throw new Error(`Type extraction failed for column ${columnName}`)
          }

          const column: ColumnDefinition = {
            name: columnName,
            tsType: type,
            nullable,
          }

          let currentType = type
          let processedTypes = new Set<string>()

          while (currentType && !processedTypes.has(currentType)) {
            processedTypes.add(currentType)

            const nullableType = extractNullableType(currentType)
            if (nullableType) {
              column.nullable = true
              nullable = true
              currentType = nullableType
              continue
            }

            const sizedMatch = currentType.match(SIZED_UTILITY)
            if (sizedMatch) {
              break
            }

            const textMatch = currentType.match(/^Text<([^>]+)>$/)
            if (textMatch) {
              break
            }

            const generatedMatch = currentType.match(/^Generated<(.+)>$/)
            if (generatedMatch) {
              column.isGenerated = true
              currentType = generatedMatch[1].trim()
              continue
            }

            const primaryMatch = currentType.match(/^Primary<(.+)>$/)
            if (primaryMatch) {
              column.isPrimaryKey = true
              currentType = primaryMatch[1].trim()
              continue
            }

            const uniqueMatch = currentType.match(/^Unique<(.+)>$/)
            if (uniqueMatch) {
              column.isUnique = true
              currentType = uniqueMatch[1].trim()
              continue
            }

            const { type, defaultValue } = extractDefaultType(currentType)
            if (defaultValue) {
              column.defaultValue = defaultValue
              currentType = type
              continue
            }

            break
          }

          column.tsType = currentType

          const coltypeMeta = extractColumnType(currentType)

          if (coltypeMeta.type) {
            column.tsType = coltypeMeta.type
            column.nullable = coltypeMeta.nullable
          }

          const { 
            referenceType,
            referencedInterface,
            referencedColumn,
          } = extractReferenceType(currentType)

          if (referenceType) {
            let baseInterfaceName: string
            if (referencedInterface!.endsWith('Table')) {
              baseInterfaceName = referencedInterface!.replace(/Table$/, '')
            } else {
              baseInterfaceName = referencedInterface as string
            }

            if (!this.tableInterfaces.has(baseInterfaceName)) {
              throw new Error(
                `Reference error: Interface "${referencedInterface}" does not correspond to a valid table. Available tables are: ${Array.from(
                  this.tableInterfaces,
                )
                  .map((t) => t + 'Table')
                  .join(', ')}`,
              )
            }

            const tableName = this.#getTableNameFromInterface(baseInterfaceName + 'Table')
            column.referencesTable = tableName
            column.referencesColumn = referencedColumn
            column.tsType = referenceType
          }

          columns.push(column)
        }
      }

      this.tables.push({ name: tableName, columns })
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

    if (ts.isVariableStatement(node)) {
      const isExported = node.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
      )
      if (!isExported) return

      for (const declaration of node.declarationList.declarations) {
        if (
          ts.isIdentifier(declaration.name) &&
          declaration.name.text === 'indexes'
        ) {
          if (ts.isArrayLiteralExpression(declaration.initializer as ts.Node)) {
            for (const { tableName, columns, options } of extractIndexArray(declaration.initializer)) {
              this.indexes.push({ tableName, columns, options })
            }
          }
        }
      }
    }

    ts.forEachChild(node, this.#registerIndexes.bind(this))
  }

  #extractIndexesFromType(typeNode: ts.TypeNode): void {
    if (ts.isIntersectionTypeNode(typeNode)) {
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



  convert(): string {
    this.#registerTables(this.sourceFile)
    this.#registerTableColumns(this.sourceFile)
    this.#registerIndexes(this.sourceFile)

    this.#adapter = new this.dialect(this.tables)

    let sql = ''

    const preamble = this.#adapter.buildPreamble()
    if (preamble) {
      sql += preamble + '\n'
    }

    if (this.tables.length) {
      sql += '\n'

      for (const table of this.tables) {
        sql += this.#adapter.buildTable(table)
        sql += '\n\n'
      }
    }

    if (this.indexes.length > 0) {
      for (const index of this.#adapter.buildIndexes(this.indexes)) {
        sql += `${index}\n`
      }
      sql += '\n'      
    }

    for (const table of this.tables) {
      for (const constraint of this.#adapter.buildReferences(table)) {
        sql += `${constraint}\n\n`
      }
    }

    return sql
  }
}
