import ts from 'typescript'
import test from 'node:test'
import { ColumnDefinition } from './types'
import { equal } from 'node:assert'
import { extractType, extractNullableType, createSourceFragment } from './tree'

test('extractNullableType()', () => {
  equal(extractNullableType('Date | undefined')!.getText(), 'Date')
  equal(extractNullableType('null | string')!.getText(), 'string')
  equal(typeof extractNullableType('null | string | Foobar'), 'undefined')
  equal(typeof extractNullableType('null | Date | string'), 'undefined')
})

test(
  ...makeTypeExtractionTest('Generated<Primary<number>>', {
    name: 'columnName',
    nullable: false,
    tsType: 'number',
    isPrimaryKey: true,
    isGenerated: true,
  }),
)

test(
  ...makeTypeExtractionTest('Sized<string, 100> | null', {
    name: 'columnName',
    nullable: true,
    tsType: 'string',
    size: '100',
  }),
)

test(
  ...makeTypeExtractionTest('Unique<Sized<string, 255>>', {
    name: 'columnName',
    nullable: false,
    tsType: 'string',
    size: '255',
    isUnique: true,
  }),
)

test(
  ...makeTypeExtractionTest('Text<string>', {
    name: 'columnName',
    nullable: false,
    tsType: 'string',
    isText: true,
  }),
)

test(
  ...makeTypeExtractionTest(
    "Default<ColumnType<Date, string | null, never>, 'now()'>",
    {
      name: 'columnName',
      nullable: true,
      tsType: 'Date',
      defaultValue: 'now()',
    },
  ),
)

test(
  ...makeTypeExtractionTest(
    "Default<ColumnType<Date | null, string | null, never>, 'now()'>",
    {
      name: 'columnName',
      nullable: true,
      tsType: 'Date',
      defaultValue: 'now()',
    },
  ),
)

test(
  ...makeTypeExtractionTest('string', {
    name: 'columnName',
    nullable: false,
    tsType: 'string',
  }),
)

test(
  ...makeTypeExtractionTest('number', {
    name: 'columnName',
    nullable: false,
    tsType: 'number',
  }),
)

test(
  ...makeTypeExtractionTest('boolean', {
    name: 'columnName',
    nullable: false,
    tsType: 'boolean',
  }),
)

test(
  ...makeTypeExtractionTest('null | Date', {
    name: 'columnName',
    nullable: true,
    tsType: 'Date',
  }),
)

test(
  ...makeTypeExtractionTest('Date', {
    name: 'columnName',
    nullable: false,
    tsType: 'Date',
  }),
)

function makeTypeExtractionTest(
  typeString: string,
  expected?: any,
): [string, () => void] {
  return [
    `extractType(${typeString})`,
    () => {
      const sourceFile = createSourceFragment(typeString)
      const column: ColumnDefinition = {
        tableName: 'tableName',
        interfaceName: 'TableNameTable',
        name: 'columnName',
        nullable: false,
      }
      ts.forEachChild(sourceFile, (node: ts.Node) => {
        if (ts.isTypeAliasDeclaration(node)) {
          ts.forEachChild(sourceFile, (node: ts.Node) => {
            if (ts.isTypeAliasDeclaration(node)) {
              extractType(node.type, column)
            }
          })
        }
      })
      if (expected) {
        for (const key of Object.keys(expected)) {
          equal(column[key as keyof ColumnDefinition], expected[key])
        }
      } else {
        console.log(typeString, column)
      }
    },
  ]
}
