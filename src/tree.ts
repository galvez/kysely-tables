import * as ts from 'typescript'
import { ok } from 'node:assert'

// console.log(ts.SyntaxKind)

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
            (t.kind === ts.SyntaxKind.LiteralType &&
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

export function extractDefaultType2(typeString: string): {
  type: string
  defaultValue: string | null
} {
  const sourceFile = createSourceFragment(typeString)

  let typeWithDefault: string | null = null
  let defaultValue: string | null = null

  ts.forEachChild(sourceFile, (node: ts.Node) => {
    if (
      ts.isTypeAliasDeclaration(node) && 
      ts.isTypeReferenceNode(node.type) &&
      node.type.typeName.getText() === 'Default' &&
      node.type.typeArguments?.length === 2
    ) {
      const nodeType: ts.NodeWithTypeArguments = node.type
      typeWithDefault = nodeType.typeArguments![0].getText()
      const defaultArg = nodeType.typeArguments![1]
      if (ts.isLiteralTypeNode(defaultArg)) {
        defaultValue = defaultArg.literal.getText()
      } else {
        defaultValue = defaultArg.getText()
      }
    }
  })

  return {
    type: typeWithDefault ?? typeString,
    defaultValue,
  }
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
  type: string
  defaultValue: string | null
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
        // if (columnType) {
        //   const { type: typeWithDefault, defaultValue } = extractDefaultType(columnType)
        //   if (defaultValue) {
        //     columnType = typeWithDefault
        //   }
        // }
      }
    }
  })

  return { columnType, nullable }
}

function createSourceFragment(typeString: string): ts.SourceFile {
  return ts.createSourceFile(
    '#fragment',
    `type T = ${typeString};`,
    ts.ScriptTarget.Latest,
    true,
  )
}
