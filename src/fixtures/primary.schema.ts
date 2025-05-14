import { Primary } from 'kysely-tables'

export interface WithNumberPrimaryFieldTable {
  field_primary_number: Primary<number>
}

export interface WithStringPrimaryFieldTable {
  field_primary_string: Primary<string>
}
