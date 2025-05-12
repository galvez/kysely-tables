// Main entry point
export { TypeScriptToSQLConverter } from './converter'
export { convertTSToSQL, convertSourceToSQL } from './converter'

// Export types
export type {
  DatabaseType,
  ColumnDefinition,
  TableDefinition,
  IndexDefinition,
  ConverterOptions,
} from './types'

export type {
  Reference,
  Generated,
  ColumnType,
  Unique,
  Default,
  Primary,
  Sized,
  Text,
  Keys,
  Index,
  UniqueIndex,
} from './types'

export {
  DatabaseAdapter,
  DatabaseAdapterFactory,
  PostgreSQLAdapter,
  SQLiteAdapter,
} from './adapters'
