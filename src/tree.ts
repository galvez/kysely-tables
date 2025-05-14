import ts from 'typescript'

export function extractNormalizedTypeString(typeNode: ts.TypeNode): string {
  if (ts.isUnionTypeNode(typeNode)) {
    return typeNode.types.map((t) => extractNormalizedTypeString(t)).join(' | ')
  }

  if (ts.isTypeReferenceNode(typeNode)) {
    const typeName = typeNode.typeName.getText()

    if (
      typeName === 'Reference' &&
      typeNode.typeArguments &&
      typeNode.typeArguments.length >= 3
    ) {
      const referencedTable = extractNormalizedTypeString(
        typeNode.typeArguments[0],
      )
      const referencedColumn = extractNormalizedTypeString(
        typeNode.typeArguments[1],
      )
      const keyType = extractNormalizedTypeString(typeNode.typeArguments[2])
      return `Reference<${referencedTable}, ${referencedColumn}, ${keyType}>`
    }

    if (
      typeName === 'Generated' &&
      typeNode.typeArguments &&
      typeNode.typeArguments.length >= 1
    ) {
      const underlyingType = extractNormalizedTypeString(
        typeNode.typeArguments[0],
      )
      return `Generated<${underlyingType}>`
    }

    if (
      typeName === 'Unique' &&
      typeNode.typeArguments &&
      typeNode.typeArguments.length >= 1
    ) {
      const underlyingType = extractNormalizedTypeString(
        typeNode.typeArguments[0],
      )
      return `Unique<${underlyingType}>`
    }

    if (
      typeName === 'Primary' &&
      typeNode.typeArguments &&
      typeNode.typeArguments.length >= 1
    ) {
      const underlyingType = extractNormalizedTypeString(
        typeNode.typeArguments[0],
      )
      return `Primary<${underlyingType}>`
    }

    if (
      typeName === 'Default' &&
      typeNode.typeArguments &&
      typeNode.typeArguments.length >= 2
    ) {
      const underlyingType = extractNormalizedTypeString(
        typeNode.typeArguments[0],
      )
      const defaultValue = extractNormalizedTypeString(typeNode.typeArguments[1])
      return `Default<${underlyingType}, ${defaultValue}>`
    }

    if (
      typeName === 'Sized' &&
      typeNode.typeArguments &&
      typeNode.typeArguments.length >= 2
    ) {
      const underlyingType = extractNormalizedTypeString(
        typeNode.typeArguments[0],
      )
      const size = extractNormalizedTypeString(typeNode.typeArguments[1])
      return `Sized<${underlyingType}, ${size}>`
    }

    if (
      typeName === 'Text' &&
      typeNode.typeArguments &&
      typeNode.typeArguments.length >= 1
    ) {
      const underlyingType = extractNormalizedTypeString(
        typeNode.typeArguments[0],
      )
      return `Text<${underlyingType}>`
    }

    if (
      typeName === 'ColumnType' &&
      typeNode.typeArguments &&
      typeNode.typeArguments.length >= 1
    ) {
      const selectType = extractNormalizedTypeString(typeNode.typeArguments[0])
      const insertType =
        typeNode.typeArguments.length >= 2
          ? extractNormalizedTypeString(typeNode.typeArguments[1])
          : selectType
      const updateType =
        typeNode.typeArguments.length >= 3
          ? extractNormalizedTypeString(typeNode.typeArguments[2])
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

export function extractNullableType(typeString: string): string | undefined {
  const sourceFile = createSourceFragment(typeString)

  let nullableType: string | undefined

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
          nullableType = t.getText()
        }
      }
    }
  })
  return nullableType
}

export function extractDefaultType(typeString: string): {
  type: string
  defaultValue: string | null
} {
  const sourceFile = createSourceFragment(typeString)

  let typeWithDefault: string | null = null
  let defaultValue: string | null = null

  const visit = (nodeType: ts.Node) => {
    if (
      ts.isTypeReferenceNode(nodeType) &&
      nodeType.typeName.getText() === 'Default' &&
      nodeType.typeArguments?.length === 2) {
      typeWithDefault = nodeType.typeArguments![0].getText()
      const defaultArg = nodeType.typeArguments![1]
      if (ts.isLiteralTypeNode(defaultArg)) {
        defaultValue = defaultArg.literal.getText()
      } else {
        defaultValue = defaultArg.getText()
      }
    } else {
      ts.forEachChild(nodeType, visit)
    }
  }

  ts.forEachChild(sourceFile, (node: ts.Node) => {
    if (
      ts.isTypeAliasDeclaration(node) && 
      ts.isTypeReferenceNode(node.type)
    ) {
      visit(node.type)
    }
  })

  return {
    type: typeWithDefault ?? typeString,
    defaultValue,
  }
}

export function extractColumnType(typeString: string): { 
  type: string | null,  
  nullable: boolean 
} {
  const sourceFile = createSourceFragment(typeString)

  let nullable: boolean = false
  let columnType: string | null = null

  ts.forEachChild(sourceFile, (node: ts.Node) => {
    if (ts.isTypeAliasDeclaration(node)) {
      if (
        ts.isTypeReferenceNode(node.type) &&
        node.type.typeName.getText() === 'ColumnType' &&
        node.type.typeArguments?.length === 3
      ) {
        const originalType = node.type.typeArguments[0].getText()
        const nullableType = extractNullableType(originalType)
        if (nullableType) {
          columnType = nullableType
          nullable = true
        } else {
          columnType = originalType
          for (const potentiallyNullable of [
            extractNullableType(node.type.typeArguments[0].getText()),
            extractNullableType(node.type.typeArguments[1].getText())
          ]) {
            if (potentiallyNullable) {
              nullable = true
            }
          }
        }
        if (columnType) {
          const { type: typeWithDefault, defaultValue } = extractDefaultType(columnType)
          if (defaultValue) {
            columnType = typeWithDefault
          }
        }
      }
    }
  })

  return { type: columnType, nullable }
}

function createSourceFragment(typeString: string): ts.SourceFile {
  return ts.createSourceFile(
    '#fragment',
    `type T = ${typeString};`,
    ts.ScriptTarget.Latest,
    true,
  )
}
