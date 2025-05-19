import { Sized, Text } from 'kysely-tables'

export interface WithStringFieldsTable {
  field_string: string
  field_string_large: Text<string>
  field_string_sized: Sized<string, 100>
  field_string_nullable: string | null
  field_string_large_nullable: Text<string> | null
  field_string_sized_nullable: Sized<string, 100> | null
}

// TODO Text<string | null>
