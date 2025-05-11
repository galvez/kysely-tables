// Main entry point
export { TypeScriptToSQLConverter } from './converter';
export { 
  convertTSToSQL, 
  convertSourceToSQL 
} from './converter';

// Export types
export type { 
  DatabaseType,
  ColumnDefinition,
  TableDefinition,
  IndexDefinition,
  ConverterOptions
} from './types';

// Export type utilities
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
  UniqueIndex
} from './types';

// Export adapters for advanced usage
export {
  DatabaseAdapter,
  DatabaseAdapterFactory,
  PostgreSQLAdapter,
  MSSQLAdapter,
  SQLiteAdapter
} from './adapters';