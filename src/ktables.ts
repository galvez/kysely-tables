import * as ts from 'typescript'
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { snakeCase } from 'scule'

import {
  Dialect,
  DialectAdapter,
  ConverterOptions,
  TableDefinition,
  ColumnDefinition,
  IndexDefinition,
} from './types'

import {
  REFERENCE_UTILITY,
  SIZED_UTILITY,
  NULLABLE,
  UNION_WITH_NULL,
  UNION_WITH_UNDEFINED,
} from './regex'

export class KyselyTables {
  private sourceFile: ts.SourceFile
  private tables: TableDefinition[]
  private tableInterfaces: Set<string>
  private indexes: IndexDefinition[] = []
  private adapter: DialectAdapter
  private dialect: Dialect

  constructor(options: ConverterOptions) {
    this.tables = []
    this.tableInterfaces = new Set()
    this.dialect = options.dialect

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

  private collectTableInterfaces(node: ts.Node): void {
    if (ts.isInterfaceDeclaration(node)) {
      const interfaceName = node.name.text

      if (interfaceName.endsWith('Table')) {
        this.tableInterfaces.add(interfaceName.replace(/Table$/, ''))
      }
    }

    ts.forEachChild(node, this.collectTableInterfaces.bind(this))
  }

  private extractTypeString(typeNode: ts.TypeNode): string {
    if (ts.isUnionTypeNode(typeNode)) {
      return typeNode.types.map((t) => this.extractTypeString(t)).join(' | ')
    }

    if (ts.isTypeReferenceNode(typeNode)) {
      const typeName = typeNode.typeName.getText()

      if (
        typeName === 'Reference' &&
        typeNode.typeArguments &&
        typeNode.typeArguments.length >= 3
      ) {
        const referencedTable = this.extractTypeString(
          typeNode.typeArguments[0],
        )
        const referencedColumn = this.extractTypeString(
          typeNode.typeArguments[1],
        )
        const keyType = this.extractTypeString(typeNode.typeArguments[2])
        return `Reference<${referencedTable}, ${referencedColumn}, ${keyType}>`
      }

      if (
        typeName === 'Generated' &&
        typeNode.typeArguments &&
        typeNode.typeArguments.length >= 1
      ) {
        const underlyingType = this.extractTypeString(typeNode.typeArguments[0])
        return `Generated<${underlyingType}>`
      }

      if (
        typeName === 'Unique' &&
        typeNode.typeArguments &&
        typeNode.typeArguments.length >= 1
      ) {
        const underlyingType = this.extractTypeString(typeNode.typeArguments[0])
        return `Unique<${underlyingType}>`
      }

      if (
        typeName === 'Primary' &&
        typeNode.typeArguments &&
        typeNode.typeArguments.length >= 1
      ) {
        const underlyingType = this.extractTypeString(typeNode.typeArguments[0])
        return `Primary<${underlyingType}>`
      }

      if (
        typeName === 'Default' &&
        typeNode.typeArguments &&
        typeNode.typeArguments.length >= 2
      ) {
        const underlyingType = this.extractTypeString(typeNode.typeArguments[0])
        const defaultValue = this.extractTypeString(typeNode.typeArguments[1])
        return `Default<${underlyingType}, ${defaultValue}>`
      }

      if (
        typeName === 'Sized' &&
        typeNode.typeArguments &&
        typeNode.typeArguments.length >= 2
      ) {
        const underlyingType = this.extractTypeString(typeNode.typeArguments[0])
        const size = this.extractTypeString(typeNode.typeArguments[1])
        return `Sized<${underlyingType}, ${size}>`
      }

      if (
        typeName === 'Text' &&
        typeNode.typeArguments &&
        typeNode.typeArguments.length >= 1
      ) {
        const underlyingType = this.extractTypeString(typeNode.typeArguments[0])
        return `Text<${underlyingType}>`
      }

      if (
        typeName === 'ColumnType' &&
        typeNode.typeArguments &&
        typeNode.typeArguments.length >= 1
      ) {
        const selectType = this.extractTypeString(typeNode.typeArguments[0])
        const insertType =
          typeNode.typeArguments.length >= 2
            ? this.extractTypeString(typeNode.typeArguments[1])
            : selectType
        const updateType =
          typeNode.typeArguments.length >= 3
            ? this.extractTypeString(typeNode.typeArguments[2])
            : selectType
        return `ColumnType<${selectType}, ${insertType}, ${updateType}>`
      }

      return typeName
    }

    switch (typeNode.kind) {
      case ts.SyntaxKind.StringKeyword:
        return 'string'
      case ts.SyntaxKind.NumberKeyword:
        return 'number'
      case ts.SyntaxKind.BooleanKeyword:
        return 'boolean'
      case ts.SyntaxKind.NullKeyword:
        return 'null'
      case ts.SyntaxKind.UndefinedKeyword:
        return 'undefined'
      case ts.SyntaxKind.NeverKeyword:
        return 'never'
      default:
        return typeNode.getText()
    }
  }

  private getTableNameFromInterface(interfaceName: string): string {
    const withoutSuffix = interfaceName.replace(/Table$/, '')
    return snakeCase(withoutSuffix)
  }

  private analyzeInterface(node: ts.Node): void {
    if (ts.isInterfaceDeclaration(node)) {
      const interfaceName = node.name.text

      if (!interfaceName.endsWith('Table')) {
        return
      }

      const tableName = this.getTableNameFromInterface(interfaceName)
      const columns: ColumnDefinition[] = []

      for (const member of node.members) {
        if (
          ts.isPropertySignature(member) &&
          member.name &&
          ts.isIdentifier(member.name)
        ) {
          const columnName = member.name.text

          let type: string
          let nullable = member.questionToken !== undefined

          if (member.type) {
            type = this.extractTypeString(member.type)
          } else {
            type = 'any'
          }

          if (!type) {
            throw new Error(`Type extraction failed for column ${columnName}`)
          }

          const column: ColumnDefinition = {
            name: columnName,
            tsType: type,
            nullable,
          }

          // Process nested type helpers
          let currentType = type
          let processedTypes = new Set<string>()

          while (currentType && !processedTypes.has(currentType)) {
            processedTypes.add(currentType)

            // Null and undefined
            const unionWithNullableMatch =
              currentType.match(UNION_WITH_NULL) ??
              currentType.match(UNION_WITH_UNDEFINED)

            if (unionWithNullableMatch) {
              column.nullable = true
              nullable = true
              currentType = (
                unionWithNullableMatch[1] || unionWithNullableMatch[2]
              ).trim()
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

            if (currentType.startsWith('Default<')) {
              let depth = 0
              let firstCommaIndex = -1

              for (let i = 0; i < currentType.length; i++) {
                if (currentType[i] === '<') depth++
                else if (currentType[i] === '>') depth--
                else if (currentType[i] === ',' && depth === 1) {
                  firstCommaIndex = i
                  break
                }
              }

              if (firstCommaIndex !== -1) {
                const innerPart = currentType.slice(8, firstCommaIndex).trim()
                const remainder = currentType
                  .slice(firstCommaIndex + 1, -1)
                  .trim()

                const defaultMatch = remainder.match(/['"](.+?)['"]/)
                const defaultValue = defaultMatch
                  ? defaultMatch[1]
                  : remainder.trim()

                if (defaultValue === 'now()') {
                  column.defaultValue = 'now()'
                } else {
                  column.defaultValue = `'${defaultValue}'`
                }

                currentType = innerPart
                continue
              }
            }

            break
          }

          column.tsType = currentType

          const columnTypeMatch = currentType.match(
            /^ColumnType<([^,]+),\s*([^,]+),\s*([^>]+)>$/,
          )
          if (columnTypeMatch) {
            const selectType = columnTypeMatch[1].trim()
            const insertType = columnTypeMatch[2].trim()
            const updateType = columnTypeMatch[3].trim()

            column.tsType = selectType
            column.insertType = insertType
            column.updateType = updateType
            column.isUpdateable = updateType !== 'never'

            const selectNullable =
              NULLABLE.test(selectType) || selectType.trim() === 'null'
            const insertNullable =
              NULLABLE.test(insertType) || insertType.trim() === 'null'
            const updateNullable =
              NULLABLE.test(updateType) || updateType.trim() === 'null'

            column.nullable = selectNullable || insertNullable || updateNullable
            nullable = column.nullable

            if (selectNullable) {
              if (selectType.trim() === 'null') {
                column.tsType = 'string'
              } else {
                column.tsType = selectType
                  .replace(/\|\s*null\s*|\s*null\s*\|/g, '')
                  .trim()
                column.tsType = column.tsType
                  .replace(/\|\s*\|/g, '|')
                  .replace(/^\||\|$/g, '')
                  .trim()
              }
            }
          }

          const referenceMatch = currentType.match(REFERENCE_UTILITY)
          if (referenceMatch) {
            const referencedInterface = referenceMatch[1].trim()
            const referencedColumn = referenceMatch[3].trim()
            const keyType = referenceMatch[4].trim()

            let baseInterfaceName: string
            if (referencedInterface.endsWith('Table')) {
              baseInterfaceName = referencedInterface.replace(/Table$/, '')
            } else {
              baseInterfaceName = referencedInterface
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

            const tableName = this.getTableNameFromInterface(
              baseInterfaceName + 'Table',
            )
            column.referencesTable = tableName
            column.referencesColumn = referencedColumn
            column.onDelete = 'no action'
            column.onUpdate = 'no action'

            column.tsType = keyType
          }

          columns.push(column)
        }
      }

      this.tables.push({ name: tableName, columns })
    }

    ts.forEachChild(node, this.analyzeInterface.bind(this))
  }

  // Method to collect indexes
  private collectIndexes(node: ts.Node): void {
    if (ts.isTypeAliasDeclaration(node) && node.name.text === 'Indexes') {
      const isExported = node.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
      )
      if (!isExported) return

      this.extractIndexesFromType(node.type)
    }

    // if (ts.isVariableStatement(node)) {
    //   const isExported = node.modifiers?.some(
    //     (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    //   )
    //   if (!isExported) return

    //   for (const declaration of node.declarationList.declarations) {
    //     if (
    //       ts.isIdentifier(declaration.name) &&
    //       declaration.name.text === 'indexes'
    //     ) {
    //       if (ts.isArrayLiteralExpression(declaration.initializer)) {
    //         this.extractIndexArray(declaration.initializer)
    //       }
    //     }
    //   }
    // }

    ts.forEachChild(node, this.collectIndexes.bind(this))
  }

  private extractIndexesFromType(typeNode: ts.TypeNode): void {
    if (ts.isIntersectionTypeNode(typeNode)) {
      for (const type of typeNode.types) {
        this.extractSingleIndex(type)
      }
    } else {
      this.extractSingleIndex(typeNode)
    }
  }

  private extractSingleIndex(typeNode: ts.TypeNode): void {
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
            tableName = this.getTableNameFromInterface(tableType.typeName.text)
          }

          const columnsType = typeNode.typeArguments[1]
          const columns = this.extractKeysFromType(columnsType)

          if (tableName && columns.length > 0) {
            const options =
              typeName === 'UniqueIndex' ? { unique: true } : undefined
            this.indexes.push({ tableName, columns, options })
          }
        }
      }
    }
  }

  private extractKeysFromType(typeNode: ts.TypeNode): string[] {
    if (
      ts.isTypeReferenceNode(typeNode) &&
      ts.isIdentifier(typeNode.typeName) &&
      typeNode.typeName.text === 'Keys'
    ) {
      const columns: string[] = []

      if (typeNode.typeArguments && typeNode.typeArguments.length > 0) {
        const tupleType = typeNode.typeArguments[0]

        if (ts.isTupleTypeNode(tupleType)) {
          for (const element of tupleType.elements) {
            if (
              ts.isLiteralTypeNode(element) &&
              ts.isStringLiteral(element.literal)
            ) {
              columns.push(element.literal.text)
            }
          }
        } else {
          for (const arg of typeNode.typeArguments) {
            if (ts.isLiteralTypeNode(arg) && ts.isStringLiteral(arg.literal)) {
              columns.push(arg.literal.text)
            }
          }
        }
      }

      return columns
    }

    return []
  }

  // private extractIndexArray(arrayLiteral: ts.ArrayLiteralExpression): void {
  //   for (const element of arrayLiteral.elements) {
  //     if (
  //       ts.isCallExpression(element) &&
  //       ts.isIdentifier(element.expression) &&
  //       element.expression.text === 'Index'
  //     ) {
  //       const args = element.arguments
  //       if (args.length >= 2) {
  //         const tableNameArg = args[0]
  //         let tableName = ''
  //         if (ts.isStringLiteral(tableNameArg)) {
  //           tableName = tableNameArg.text
  //         }

  //         const columnsArg = args[1]
  //         let columns: string[] = []
  //         if (ts.isArrayLiteralExpression(columnsArg)) {
  //           columns = columnsArg.elements
  //             .map((col) => {
  //               if (ts.isStringLiteral(col)) {
  //                 return col.text
  //               }
  //               return ''
  //             })
  //             .filter(Boolean)
  //         }

  //         let options: { unique?: boolean; name?: string } | undefined
  //         if (args.length >= 3 && ts.isObjectLiteralExpression(args[2])) {
  //           options = {}
  //           for (const prop of args[2].properties) {
  //             if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
  //               if (
  //                 prop.name.text === 'unique' &&
  //                 ts.isTrue(prop.initializer)
  //               ) {
  //                 options.unique = true
  //               } else if (
  //                 prop.name.text === 'name' &&
  //                 ts.isStringLiteral(prop.initializer)
  //               ) {
  //                 options.name = prop.initializer.text
  //               }
  //             }
  //           }
  //         }

  //         if (tableName && columns.length > 0) {
  //           this.indexes.push({ tableName, columns, options })
  //         }
  //       }
  //     }
  //   }
  // }

  // Main conversion method in src/converter.ts
  convert(): string {
    this.collectTableInterfaces(this.sourceFile)
    this.collectIndexes(this.sourceFile)
    this.analyzeInterface(this.sourceFile)

    this.adapter = new this.dialect(this.tables)

    let sql = ''

    const preamble = this.adapter.buildPreamble()
    if (preamble) {
      sql += preamble + '\n'
    }

    sql += '\n'

    for (const table of this.tables) {
      sql += this.adapter.buildTable(table)
      sql += '\n\n'
    }

    if (this.indexes.length > 0) {
      for (const index of this.adapter.buildIndexes(this.indexes)) {
        sql += `${index}\n`
      }
    }

    sql += '\n'

    for (const table of this.tables) {
      for (const constraint of this.adapter.buildReferences(table)) {
        sql += `${constraint}\n\n`
      }
    }

    return sql
  }
}

type CreateSQLSchemaFromFileOptions = {
  filePath: string
  fileName: string
  dialect: Dialect
}

export function createSQLSchemaFromFile({
  filePath,
  fileName,
  dialect,
}: CreateSQLSchemaFromFileOptions): string {
  const kt = new KyselyTables({
    filePath,
    fileName,
    dialect,
  })
  return kt.convert()
}

type CreateSQLSchemaFromSourceOptions = {
  source: string
  fileName: string
  dialect: Dialect
}

export function createSQLSchemaFromSource({
  source,
  fileName,
  dialect,
}: CreateSQLSchemaFromSourceOptions): string {
  const kt = new KyselyTables({
    source,
    fileName,
    dialect,
  })
  return kt.convert()
}
