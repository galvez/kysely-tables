import * as ts from 'typescript'
import { ok } from 'node:assert'

export function extractNullableType(typeString: string): boolean {
  const sourceFile = ts.createSourceFile(
    '#fragment',
    `type T = ${typeString};`,
    ts.ScriptTarget.Latest,
    true,
  )

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

if (process.stdout.isTTY) {
  ok(extractNullableType('Date | undefined') === 'Date')
  ok(extractNullableType('null | string') === 'string')
  ok(typeof extractNullableType('null | string | Foobar') === 'undefined')
  ok(typeof extractNullableType('null | Date | string') === 'undefined')
}

export function extractDefaultType(typeString: string): {
  type: string
  defaultValue: string | null
} {
  const sourceFile = ts.createSourceFile(
    '#fragment',
    `type T = ${typeString};`,
    ts.ScriptTarget.Latest,
    true,
  )

  let typeWithDefault: string | null = null
  let defaultValue: string | null = null

  ts.forEachChild(sourceFile, (node: ts.Node) => {
    if (ts.isTypeAliasDeclaration(node)) {
      if (
        ts.isTypeReferenceNode(node.type) &&
        node.type.typeName.getText() === 'Default' &&
        node.type.typeArguments.length === 2
      ) {
        typeWithDefault = node.type.typeArguments[0].getText()
        const defaultArg = node.type.typeArguments[1]

        if (
          ts.isLiteralTypeNode(defaultArg) &&
          ts.isStringLiteral(defaultArg.literal)
        ) {
          defaultValue = defaultArg.literal.text
        } else {
          defaultValue = `'${defaultArg.getText()}'`
        }
      }
    }
  })

  return {
    type: typeWithDefault ?? typeString,
    defaultValue,
  }
}
