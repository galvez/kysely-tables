import ts from 'typescript'
import type { Dialect, ColumnDefinition } from './types.js'
import { PostgresDialect, SqliteDialect } from './dialects/index.js'

const dialects: Record<string, Dialect> = { PostgresDialect, SqliteDialect }

export function extractType(
  typeNode: ts.TypeNode,
  column: ColumnDefinition,
): string {
  if (ts.isUnionTypeNode(typeNode)) {
    const nullableType = extractNullableType(typeNode.getText())
    if (nullableType) {
      column.nullable = true
      typeNode = nullableType as ts.TypeNode
      column.tsType = typeNode.getText()
    }
  }

  if (ts.isTypeReferenceNode(typeNode)) {
    const typeName = typeNode.typeName.getText()
    if (!typeNode.typeArguments) {
      column.tsType ??= typeName
      return typeName
    }

    if (
      typeName === 'Reference' &&
      typeNode.typeArguments &&
      typeNode.typeArguments.length >= 3
    ) {
      column.referencesTable = extractType(typeNode.typeArguments[0], column)
      column.referencesColumn = extractType(typeNode.typeArguments[1], column)
      const keyType = extractType(typeNode.typeArguments[2], column)
      column.tsType ??= keyType
      return `Reference<${column.referencesTable}, ${column.referencesColumn}, ${keyType}>`
    }

    if (
      typeName === 'Generated' &&
      typeNode.typeArguments &&
      typeNode.typeArguments.length === 1
    ) {
      const underlyingType = extractType(typeNode.typeArguments[0], column)
      column.tsType ??= underlyingType
      column.isGenerated = true
      return `Generated<${underlyingType}>`
    }

    if (
      typeName === 'Unique' &&
      typeNode.typeArguments &&
      typeNode.typeArguments.length >= 1
    ) {
      const underlyingType = extractType(typeNode.typeArguments[0], column)
      column.tsType ??= underlyingType
      column.isUnique = true
      return `Unique<${underlyingType}>`
    }

    if (
      typeName === 'Primary' &&
      typeNode.typeArguments &&
      typeNode.typeArguments.length >= 1
    ) {
      const underlyingType = extractType(typeNode.typeArguments[0], column)
      column.tsType ??= underlyingType
      column.isPrimaryKey = true
      return `Primary<${underlyingType}>`
    }

    if (
      typeName === 'Default' &&
      typeNode.typeArguments &&
      typeNode.typeArguments.length === 2
    ) {
      const underlyingType = extractType(typeNode.typeArguments[0], column)
      let defaultValue
      if (
        ts.isLiteralTypeNode(typeNode.typeArguments[1]) &&
        ts.isStringLiteral(typeNode.typeArguments[1].literal)
      ) {
        defaultValue = typeNode.typeArguments[1].getText().slice(1, -1)
      } else {
        defaultValue = typeNode.typeArguments[1].getText()
      }
      column.tsType ??= underlyingType
      column.defaultValue = defaultValue
      return `Default<${underlyingType}, ${defaultValue}>`
    }

    if (
      typeName === 'Sized' &&
      typeNode.typeArguments &&
      typeNode.typeArguments.length === 2
    ) {
      const underlyingType = extractType(typeNode.typeArguments[0], column)
      column.tsType ??= underlyingType
      column.size = typeNode.typeArguments[1].getText()
      return `Sized<${underlyingType}, ${column.size}>`
    }

    if (
      typeName === 'Text' &&
      typeNode.typeArguments &&
      typeNode.typeArguments.length === 1
    ) {
      const underlyingType = extractType(typeNode.typeArguments[0], column)
      column.isText = true
      column.tsType ??= underlyingType
      return `Text<${underlyingType}>`
    }

    if (
      typeName === 'ColumnType' &&
      typeNode.typeArguments &&
      typeNode.typeArguments.length >= 1
    ) {
      const selectType = extractType(typeNode.typeArguments[0], column)
      const insertType = extractType(typeNode.typeArguments[1], column)
      const updateType = extractType(typeNode.typeArguments[2], column)
      column.tsType = extractType(typeNode.typeArguments[0], column)
      return `ColumnType<${selectType}, ${insertType}, ${updateType}>`
    }

    return typeName
  }

  switch (typeNode.kind) {
    case ts.SyntaxKind.StringKeyword:
      column.tsType = 'string'
      break
    case ts.SyntaxKind.NumberKeyword:
      column.tsType = 'number'
      break
    case ts.SyntaxKind.BooleanKeyword:
      column.tsType = 'boolean'
      break
    case ts.SyntaxKind.NullKeyword:
      column.nullable = true
      column.tsType = 'null'
      break
    case ts.SyntaxKind.UndefinedKeyword:
      column.tsType = 'undefined'
      break
    case ts.SyntaxKind.NeverKeyword:
      column.tsType = 'never'
      break
    default:
      column.tsType = typeNode.getText()
  }

  return column.tsType as string
}

export function extractNullableType(typeString: string): ts.Node | undefined {
  const sourceFile = createSourceFragment(typeString)

  let nullableType: ts.Node | undefined

  ts.forEachChild(sourceFile, (node: ts.Node) => {
    if (ts.isTypeAliasDeclaration(node)) {
      if (ts.isUnionTypeNode(node.type)) {
        if (node.type.types.length !== 2) {
          return
        }
        for (const t of node.type.types) {
          if (
            t.kind === ts.SyntaxKind.NullKeyword ||
            t.kind === ts.SyntaxKind.UndefinedKeyword ||
            (ts.isLiteralTypeNode(t) &&
              (t.literal.kind === ts.SyntaxKind.NullKeyword ||
                t.literal.kind === ts.SyntaxKind.UndefinedKeyword))
          ) {
            continue
          }
          nullableType = t
        }
      }
    }
  })

  return nullableType
}

export function extractDialect(sourceCode: string): Dialect | undefined {
  const sourceFile = createSource(sourceCode)
  let dialect: string | undefined
  const visit = (node: ts.Node) => {
    if (
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      ts.isNewExpression(node.initializer) &&
      node.initializer.expression &&
      ts.isIdentifier(node.initializer.expression)
    ) {
      const className = node.initializer.expression.text
      if (['SqliteDialect', 'PostgresDialect'].includes(className)) {
        dialect = className
      }
    } else {
      ts.forEachChild(node, visit)
    }
  }
  ts.forEachChild(sourceFile, visit)
  if (dialect && dialects[dialect]) {
    return dialects[dialect]
  }
}

export function createSource(source: string): ts.SourceFile {
  return ts.createSourceFile('#source', source, ts.ScriptTarget.Latest, true)
}

export function createSourceFragment(typeString: string): ts.SourceFile {
  return ts.createSourceFile(
    '#fragment',
    `type T = ${typeString};`,
    ts.ScriptTarget.Latest,
    true,
  )
}
