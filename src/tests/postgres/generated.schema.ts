import { Generated } from 'kysely'
import { Primary } from 'kysely-tables'

export interface TableWithGeneratedTable {
  field_generated_primary: Generated<Primary<number>>
  field_generated: Generated<number>
}
