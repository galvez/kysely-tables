
import * as ts from 'typescript';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

import {
  DatabaseType,
  ConverterOptions,
  TableDefinition,
  ColumnDefinition,
  IndexDefinition
} from './types';

import {
  DatabaseAdapter,
  DatabaseAdapterFactory
} from './adapters';

export class TypeScriptToSQLConverter {
  private sourceFile: ts.SourceFile;
  private tables: TableDefinition[] = [];
  private tableInterfaces: Set<string> = new Set();
  private indexes: IndexDefinition[] = [];
  private databaseAdapter: DatabaseAdapter;
  
  constructor(options: ConverterOptions | string, indexes?: IndexDefinition[]) {
    // Handle backward compatibility
    if (typeof options === 'string') {
      options = { filePath: options, databaseType: 'postgresql' };
    }
    
    // Set default database type
    const databaseType = options.databaseType || 'postgresql';
    
    // Store indexes if provided
    this.indexes = indexes || [];

    let sourceCode: string;
    let fileName: string;

    if (options.source) {
      sourceCode = options.source;
      fileName = options.fileName || 'schema.ts';
    } else if (options.filePath) {
      try {
        sourceCode = readFileSync(options.filePath, 'utf8');
        fileName = basename(options.filePath);
      } catch (error) {
        throw new Error(`Failed to read file ${options.filePath}: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      throw new Error('Either source or filePath must be provided');
    }

    // Ensure sourceCode is a string
    if (typeof sourceCode !== 'string') {
      throw new Error('Source code must be a string');
    }

    this.sourceFile = ts.createSourceFile(
      fileName,
      sourceCode,
      ts.ScriptTarget.Latest,
      true
    );
    
    // Initialize adapter - we'll create it once tables are collected
    // For now, create a temporary adapter
    this.databaseAdapter = DatabaseAdapterFactory.createAdapter(databaseType, []);
  }

  // Method to collect table names and interfaces
  private collectTableInterfaces(node: ts.Node): void {
    if (ts.isInterfaceDeclaration(node)) {
      const interfaceName = node.name.text;
      
      if (interfaceName.endsWith('Table')) {
        this.tableInterfaces.add(interfaceName.replace(/Table$/, ''));
      }
    }

    ts.forEachChild(node, this.collectTableInterfaces.bind(this));
  }

  // Extract type string from TypeScript AST nodes
  private extractTypeString(typeNode: ts.TypeNode): string {
    if (ts.isUnionTypeNode(typeNode)) {
      return typeNode.types.map(t => this.extractTypeString(t)).join(' | ');
    }
    
    if (ts.isTypeReferenceNode(typeNode)) {
      const typeName = typeNode.typeName.getText();
      
      if (typeName === 'Reference' && typeNode.typeArguments && typeNode.typeArguments.length >= 3) {
        const referencedTable = this.extractTypeString(typeNode.typeArguments[0]);
        const referencedColumn = this.extractTypeString(typeNode.typeArguments[1]);
        const keyType = this.extractTypeString(typeNode.typeArguments[2]);
        return `Reference<${referencedTable}, ${referencedColumn}, ${keyType}>`;
      }
      
      if (typeName === 'Generated' && typeNode.typeArguments && typeNode.typeArguments.length >= 1) {
        const underlyingType = this.extractTypeString(typeNode.typeArguments[0]);
        return `Generated<${underlyingType}>`;
      }
      
      if (typeName === 'Unique' && typeNode.typeArguments && typeNode.typeArguments.length >= 1) {
        const underlyingType = this.extractTypeString(typeNode.typeArguments[0]);
        return `Unique<${underlyingType}>`;
      }
      
      if (typeName === 'Primary' && typeNode.typeArguments && typeNode.typeArguments.length >= 1) {
        const underlyingType = this.extractTypeString(typeNode.typeArguments[0]);
        return `Primary<${underlyingType}>`;
      }
      
      if (typeName === 'Default' && typeNode.typeArguments && typeNode.typeArguments.length >= 2) {
        const underlyingType = this.extractTypeString(typeNode.typeArguments[0]);
        const defaultValue = this.extractTypeString(typeNode.typeArguments[1]);
        return `Default<${underlyingType}, ${defaultValue}>`;
      }
      
      if (typeName === 'Sized' && typeNode.typeArguments && typeNode.typeArguments.length >= 2) {
        const underlyingType = this.extractTypeString(typeNode.typeArguments[0]);
        const size = this.extractTypeString(typeNode.typeArguments[1]);
        return `Sized<${underlyingType}, ${size}>`;
      }
      
      if (typeName === 'Text' && typeNode.typeArguments && typeNode.typeArguments.length >= 1) {
        const underlyingType = this.extractTypeString(typeNode.typeArguments[0]);
        return `Text<${underlyingType}>`;
      }
      
      if (typeName === 'ColumnType' && typeNode.typeArguments && typeNode.typeArguments.length >= 1) {
        const selectType = this.extractTypeString(typeNode.typeArguments[0]);
        const insertType = typeNode.typeArguments.length >= 2 ? this.extractTypeString(typeNode.typeArguments[1]) : selectType;
        const updateType = typeNode.typeArguments.length >= 3 ? this.extractTypeString(typeNode.typeArguments[2]) : selectType;
        return `ColumnType<${selectType}, ${insertType}, ${updateType}>`;
      }
      
      return typeName;
    }
    
    switch (typeNode.kind) {
      case ts.SyntaxKind.StringKeyword:
        return 'string';
      case ts.SyntaxKind.NumberKeyword:
        return 'number';
      case ts.SyntaxKind.BooleanKeyword:
        return 'boolean';
      case ts.SyntaxKind.NullKeyword:
        return 'null';
      case ts.SyntaxKind.UndefinedKeyword:
        return 'undefined';
      case ts.SyntaxKind.NeverKeyword:
        return 'never';
      default:
        return typeNode.getText();
    }
  }

  // Get table name from interface name
  private getTableNameFromInterface(interfaceName: string): string {
    const withoutSuffix = interfaceName.replace(/Table$/, '');
    const snakeCase = withoutSuffix
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .slice(1);
    
    return snakeCase;
  }

  // Analyze interface and create table definition
  private analyzeInterface(node: ts.Node): void {
    if (ts.isInterfaceDeclaration(node)) {
      const interfaceName = node.name.text;
      
      if (!interfaceName.endsWith('Table')) {
        return;
      }

      const tableName = this.getTableNameFromInterface(interfaceName);
      const columns: ColumnDefinition[] = [];

      for (const member of node.members) {
        if (ts.isPropertySignature(member) && member.name && ts.isIdentifier(member.name)) {
          const columnName = member.name.text;
          
          let type: string;
          let nullable = member.questionToken !== undefined;
          
          if (member.type) {
            type = this.extractTypeString(member.type);
          } else {
            type = 'any';
          }

          if (!type) {
            console.warn(`Type extraction failed for column ${columnName}`);
            continue;
          }

          const column: ColumnDefinition = {
            name: columnName,
            tsType: type,
            nullable,
          };

          // Process nested type helpers
          let currentType = type;
          let processedTypes = new Set<string>();
          
          while (currentType && !processedTypes.has(currentType)) {
            processedTypes.add(currentType);
            
            // Handle union with null
            const unionWithNullMatch = currentType.match(/^(.+?)\s*\|\s*null\s*$|^null\s*\|\s*(.+?)$/);
            if (unionWithNullMatch) {
              column.nullable = true;
              nullable = true;
              currentType = (unionWithNullMatch[1] || unionWithNullMatch[2]).trim();
              continue;
            }
            
            // Handle union with undefined
            const unionWithUndefinedMatch = currentType.match(/^(.+?)\s*\|\s*undefined\s*$|^undefined\s*\|\s*(.+?)$/);
            if (unionWithUndefinedMatch) {
              column.nullable = true;
              nullable = true;
              currentType = (unionWithUndefinedMatch[1] || unionWithUndefinedMatch[2]).trim();
              continue;
            }
            
            // Check for Sized and Text types - keep them intact
            const sizedMatch = currentType.match(/^Sized<([^,]+),\s*(\d+)>$/);
            if (sizedMatch) {
              break;
            }

            const textMatch = currentType.match(/^Text<([^>]+)>$/);
            if (textMatch) {
              break;
            }

            // Process other type wrappers
            const generatedMatch = currentType.match(/^Generated<(.+)>$/);
            if (generatedMatch) {
              column.isGenerated = true;
              currentType = generatedMatch[1].trim();
              continue;
            }

            const primaryMatch = currentType.match(/^Primary<(.+)>$/);
            if (primaryMatch) {
              column.isPrimaryKey = true;
              currentType = primaryMatch[1].trim();
              continue;
            }

            const uniqueMatch = currentType.match(/^Unique<(.+)>$/);
            if (uniqueMatch) {
              column.isUnique = true;
              currentType = uniqueMatch[1].trim();
              continue;
            }

            // Process Default type
            if (currentType.startsWith('Default<')) {
              let depth = 0;
              let firstCommaIndex = -1;
              
              for (let i = 0; i < currentType.length; i++) {
                if (currentType[i] === '<') depth++;
                else if (currentType[i] === '>') depth--;
                else if (currentType[i] === ',' && depth === 1) {
                  firstCommaIndex = i;
                  break;
                }
              }
              
              if (firstCommaIndex !== -1) {
                const innerPart = currentType.slice(8, firstCommaIndex).trim();
                const remainder = currentType.slice(firstCommaIndex + 1, -1).trim();
                
                const defaultMatch = remainder.match(/['"](.+?)['"]/);
                const defaultValue = defaultMatch ? defaultMatch[1] : remainder.trim();
                
                if (defaultValue === 'now()') {
                  column.defaultValue = 'now()';
                } else {
                  column.defaultValue = `'${defaultValue}'`;
                }
                
                currentType = innerPart;
                continue;
              }
            }
            
            break;
          }
          
          column.tsType = currentType;
          
          // Process ColumnType
          const columnTypeMatch = currentType.match(/^ColumnType<([^,]+),\s*([^,]+),\s*([^>]+)>$/);
          if (columnTypeMatch) {
            const selectType = columnTypeMatch[1].trim();
            const insertType = columnTypeMatch[2].trim();
            const updateType = columnTypeMatch[3].trim();
            
            column.tsType = selectType;
            column.insertType = insertType;
            column.updateType = updateType;
            column.isUpdateable = updateType !== 'never';
            
            const selectNullable = /\|\s*null\s*|\s*null\s*\|/.test(selectType) || selectType.trim() === 'null';
            const insertNullable = /\|\s*null\s*|\s*null\s*\|/.test(insertType) || insertType.trim() === 'null';
            const updateNullable = /\|\s*null\s*|\s*null\s*\|/.test(updateType) || updateType.trim() === 'null';
            
            column.nullable = selectNullable || insertNullable || updateNullable;
            nullable = column.nullable;
            
            if (selectNullable) {
              if (selectType.trim() === 'null') {
                column.tsType = 'string';
              } else {
                column.tsType = selectType.replace(/\|\s*null\s*|\s*null\s*\|/g, '').trim();
                column.tsType = column.tsType.replace(/\|\s*\|/g, '|').replace(/^\||\|$/g, '').trim();
              }
            }
          }

          // Process Reference type
          const referenceMatch = currentType.match(/^Reference<([^,]+),\s*(['"]?)([^,'"]+)\2,\s*([^>]+)>$/);
          if (referenceMatch) {
            const referencedInterface = referenceMatch[1].trim();
            const referencedColumn = referenceMatch[3].trim();
            const keyType = referenceMatch[4].trim();
            
            let baseInterfaceName: string;
            if (referencedInterface.endsWith('Table')) {
              baseInterfaceName = referencedInterface.replace(/Table$/, '');
            } else {
              baseInterfaceName = referencedInterface;
            }
            
            if (!this.tableInterfaces.has(baseInterfaceName)) {
              throw new Error(`Reference error: Interface "${referencedInterface}" does not correspond to a valid table. Available tables are: ${Array.from(this.tableInterfaces).map(t => t + 'Table').join(', ')}`);
            }
            
            const tableName = this.getTableNameFromInterface(baseInterfaceName + 'Table');
            column.referencesTable = tableName;
            column.referencesColumn = referencedColumn;
            column.onDelete = 'no action';
            column.onUpdate = 'no action';
            
            column.tsType = keyType;
          }

          columns.push(column);
        }
      }

      this.tables.push({ name: tableName, columns });
    }

    ts.forEachChild(node, this.analyzeInterface.bind(this));
  }

  // Method to collect indexes
  private collectIndexes(node: ts.Node): void {
    if (ts.isTypeAliasDeclaration(node) && node.name.text === 'Indexes') {
      const isExported = node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword);
      if (!isExported) return;

      this.extractIndexesFromType(node.type);
    }

    if (ts.isVariableStatement(node)) {
      const isExported = node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword);
      if (!isExported) return;

      for (const declaration of node.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.name.text === 'indexes') {
          if (ts.isArrayLiteralExpression(declaration.initializer)) {
            this.extractIndexArray(declaration.initializer);
          }
        }
      }
    }

    ts.forEachChild(node, this.collectIndexes.bind(this));
  }

  private extractIndexesFromType(typeNode: ts.TypeNode): void {
    if (ts.isIntersectionTypeNode(typeNode)) {
      for (const type of typeNode.types) {
        this.extractSingleIndex(type);
      }
    } else {
      this.extractSingleIndex(typeNode);
    }
  }

  private extractSingleIndex(typeNode: ts.TypeNode): void {
    if (ts.isTypeReferenceNode(typeNode) && ts.isIdentifier(typeNode.typeName)) {
      const typeName = typeNode.typeName.text;
      
      if (typeName === 'Index' || typeName === 'UniqueIndex') {
        if (typeNode.typeArguments && typeNode.typeArguments.length >= 2) {
          const tableType = typeNode.typeArguments[0];
          let tableName = '';
          
          if (ts.isTypeReferenceNode(tableType) && ts.isIdentifier(tableType.typeName)) {
            tableName = this.getTableNameFromInterface(tableType.typeName.text);
          }
          
          const columnsType = typeNode.typeArguments[1];
          const columns = this.extractKeysFromType(columnsType);
          
          if (tableName && columns.length > 0) {
            const options = typeName === 'UniqueIndex' ? { unique: true } : undefined;
            this.indexes.push({ tableName, columns, options });
          }
        }
      }
    }
  }

  private extractKeysFromType(typeNode: ts.TypeNode): string[] {
    if (ts.isTypeReferenceNode(typeNode) && 
        ts.isIdentifier(typeNode.typeName) && 
        typeNode.typeName.text === 'Keys') {
      
      const columns: string[] = [];
      
      if (typeNode.typeArguments && typeNode.typeArguments.length > 0) {
        const tupleType = typeNode.typeArguments[0];
        
        if (ts.isTupleTypeNode(tupleType)) {
          for (const element of tupleType.elements) {
            if (ts.isLiteralTypeNode(element) && ts.isStringLiteral(element.literal)) {
              columns.push(element.literal.text);
            }
          }
        } else {
          for (const arg of typeNode.typeArguments) {
            if (ts.isLiteralTypeNode(arg) && ts.isStringLiteral(arg.literal)) {
              columns.push(arg.literal.text);
            }
          }
        }
      }
      
      return columns;
    }
    
    return [];
  }

  private extractIndexArray(arrayLiteral: ts.ArrayLiteralExpression): void {
    for (const element of arrayLiteral.elements) {
      if (ts.isCallExpression(element) && 
          ts.isIdentifier(element.expression) && 
          element.expression.text === 'Index') {
        
        const args = element.arguments;
        if (args.length >= 2) {
          const tableNameArg = args[0];
          let tableName = '';
          if (ts.isStringLiteral(tableNameArg)) {
            tableName = tableNameArg.text;
          }

          const columnsArg = args[1];
          let columns: string[] = [];
          if (ts.isArrayLiteralExpression(columnsArg)) {
            columns = columnsArg.elements.map(col => {
              if (ts.isStringLiteral(col)) {
                return col.text;
              }
              return '';
            }).filter(Boolean);
          }

          let options: { unique?: boolean; name?: string } | undefined;
          if (args.length >= 3 && ts.isObjectLiteralExpression(args[2])) {
            options = {};
            for (const prop of args[2].properties) {
              if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
                if (prop.name.text === 'unique' && ts.isTrue(prop.initializer)) {
                  options.unique = true;
                } else if (prop.name.text === 'name' && ts.isStringLiteral(prop.initializer)) {
                  options.name = prop.initializer.text;
                }
              }
            }
          }

          if (tableName && columns.length > 0) {
            this.indexes.push({ tableName, columns, options });
          }
        }
      }
    }
  }

  // Main conversion method in src/converter.ts
  convert(): string {
    // First pass: collect table interfaces and indexes
    this.collectTableInterfaces(this.sourceFile);
    this.collectIndexes(this.sourceFile);
    
    // Second pass: analyze interfaces
    this.analyzeInterface(this.sourceFile);
    
    // Now create the adapter with the collected tables
    this.databaseAdapter = DatabaseAdapterFactory.createAdapter(
      this.databaseAdapter.constructor.name === 'PostgreSQLAdapter' ? 'postgresql' :
      this.databaseAdapter.constructor.name === 'MSSQLAdapter' ? 'mssql' :
      'sqlite',
      this.tables
    );
    
    // Generate SQL using the adapter
    let sql = '';
    
    // Add database-specific preamble if any
    const preamble = this.databaseAdapter.getPreamble();
    if (preamble) {
      sql += preamble + '\n\n';
    }
    
    sql += '\n';
    
    // Generate CREATE TABLE statements
    for (const table of this.tables) {
      sql += this.databaseAdapter.generateCreateTableStatement(table);
      sql += '\n\n';
    }
    
    // Generate indexes
    if (this.indexes.length > 0) {
      const indexStatements = this.databaseAdapter.generateIndexStatements(this.indexes);
      for (const index of indexStatements) {
        sql += index;
        sql += '\n';
      }
    }

    sql += '\n'
    
    // Generate foreign key constraints
    for (const table of this.tables) {
      const constraints = this.databaseAdapter.generateForeignKeyConstraints(table);
      for (const constraint of constraints) {
        sql += constraint + '\n\n';
      }
    }
    
    return sql;
  }
}

// Convenience functions
export function convertTSToSQL(inputFile: string, databaseType: DatabaseType = 'postgresql'): string {
  const converter = new TypeScriptToSQLConverter({ filePath: inputFile, databaseType });
  return converter.convert();
}

export function convertSourceToSQL(source: string, fileName?: string, databaseType: DatabaseType = 'postgresql'): string {
  const converter = new TypeScriptToSQLConverter({ source, fileName, databaseType });
  return converter.convert();
}