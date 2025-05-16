import ts from 'typescript'
import test from 'node:test'
import { ColumnDefinition } from './types'
import { equal, deepEqual } from 'node:assert'
import { extractType, extractNullableType, createSourceFragment } from './tree'

test('extractNullableType()', () => {
  equal(extractNullableType('Date | undefined'), 'Date')
  equal(extractNullableType('null | string'), 'string')
  equal(typeof extractNullableType('null | string | Foobar'), 'undefined')
  equal(typeof extractNullableType('null | Date | string'), 'undefined')
})

test('extractColumnType()', () => {
  testColumnTypeExtraction('Generated<Primary<number>>', {
    name: 'columnName',
    nullable: false,
    tsType: 'number',
    isPrimaryKey: true,
    isGenerated: true,
  })
  testColumnTypeExtraction('Sized<string, 100> | null', {
    name: 'columnName',
    nullable: true,
    tsType: 'string',
    size: '100',
  })
  testColumnTypeExtraction('Unique<Sized<string, 255>>', {
    name: 'columnName',
    nullable: false,
    tsType: 'string',
    size: '255',
    isUnique: true,
  })
  testColumnTypeExtraction('Text<string>', {
    name: 'columnName',
    nullable: false,
    tsType: 'string',
    isText: true,
  })
  testColumnTypeExtraction("Default<ColumnType<Date, string | null, never>, 'now()'>", {
    name: 'columnName',
    nullable: true,
    tsType: 'Date',
    defaultValue: 'now()',
  })
  testColumnTypeExtraction("Default<ColumnType<Date | null, string | null, never>, 'now()'>", {
    name: 'columnName',
    nullable: true,
    tsType: 'Date',
    defaultValue: 'now()',
  })
  testColumnTypeExtraction('string', {
    name: 'columnName',
    nullable: false,
    tsType: 'string',
  })
  testColumnTypeExtraction('number', {
    name: 'columnName',
    nullable: false,
    tsType: 'number',
  })
  testColumnTypeExtraction('boolean', {
    name: 'columnName',
    nullable: false,
    tsType: 'boolean',
  })
  testColumnTypeExtraction('null | Date', { 
    name: 'columnName', 
    nullable: true, 
    tsType: 'Date'
  })
  testColumnTypeExtraction('Date', { 
    name: 'columnName', 
    nullable: false, 
    tsType: 'Date'
  })  
})

function testColumnTypeExtraction(typeString: string, expected?: any) {
  const sourceFile = createSourceFragment(typeString)
  const column: ColumnDefinition = {
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
    deepEqual(column, expected)
  } else {
    console.log(typeString, column)
  }
}
