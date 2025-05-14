import test from 'node:test'
import { equal, deepEqual } from 'node:assert'
import { extractNullableType, extractDefaultType } from './tree'

test('extractNullableType()', () => {
  equal(extractNullableType('Date | undefined'), 'Date')
  equal(extractNullableType('null | string'), 'string')
  equal(typeof extractNullableType('null | string | Foobar'), 'undefined')
  equal(typeof extractNullableType('null | Date | string'), 'undefined')
})

test('extractDefaultType()', () => {
  deepEqual(
    extractDefaultType(`Default<string, "'member'">`),
    { type: 'string', defaultValue: `"'member'"` }
  )
  deepEqual(
    extractDefaultType(`Default<number, 99>`),
    { type: 'number', defaultValue: '99' }
  )
  deepEqual(
    extractDefaultType(`Default<boolean, false>`),
    { type: 'boolean', defaultValue: 'false' }
  )
  deepEqual(
    extractDefaultType(`Default<ColumnType<Date, string | null, never>, 'now()'>`),
    {
      type: 'ColumnType<Date, string | null, never>',
      defaultValue: "'now()'"
    }
  )
  deepEqual(
    extractDefaultType(`Default<ColumnType<Date, never, Date>, 'now()'>`),
    { type: 'ColumnType<Date, never, Date>', defaultValue: "'now()'" }
  )
  deepEqual(
    extractDefaultType(`ColumnType<Default<Date, 'now()'>, never, Date>`),
    { type: 'Date', defaultValue: "'now()'" }
  )
})
