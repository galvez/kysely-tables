import { diff as jsonDiff } from 'json-diff'
import stringify from 'fast-safe-stringify'
import {
  DialectAdapter,
  TableDefinition,
  IndexDefinition,
  ColumnDefinition,
  SchemaRevisionStatement,
} from '../types'

// const diffStates = {
//   modified: Symbol('modified'),
//   deleted: Symbol('deleted'),
//   added: Symbol('added'),
// }

export abstract class BaseDialect implements DialectAdapter {
  tables?: TableDefinition[]

  constructor(tables?: TableDefinition[]) {
    this.tables = tables
  }

  abstract buildPreamble(): string
  abstract buildSchemaReset(tables?: TableDefinition[]): string[]
  abstract buildTableDrop(
    name: string,
    ifExists?: boolean,
  ): SchemaRevisionStatement
  abstract buildModifyColumn(
    tableName: string,
    column: ColumnDefinition,
  ): SchemaRevisionStatement
  abstract buildRevertColumn(
    tableName: string,
    column: ColumnDefinition,
  ): SchemaRevisionStatement
  abstract buildColumn(column: ColumnDefinition, constraints?: string[]): string
  abstract buildTable(table: TableDefinition): string
  abstract buildIndexes(indexes: IndexDefinition[]): string[]
  abstract buildReferences(table: TableDefinition): string[]

  buildSchemaRevisions(
    tables: TableDefinition[],
    tablesSnapshot: TableDefinition[],
  ): SchemaRevisionStatement[] {
    const revisions: SchemaRevisionStatement[] = []
    const schemaDiff = diffSchemas(tablesSnapshot, tables)
    if (schemaDiff && !schemaDiff.length) {
      return revisions
    }
    let revInfo
    for (const rev of schemaDiff) {
      switch (rev[0]) {
        case '~':
          const tableName = rev[1].__original.name
          for (const columnRev of rev[1].columns) {
            revInfo = columnRev[1]
            switch (columnRev[0]) {
              case '+':
                revisions.push(this.buildAddColumn(revInfo))
                break
              case '-':
                revisions.push(this.buildDropColumn(revInfo))
                break
              case '~':
                revisions.push(this.buildModifyColumn(tableName, revInfo))
                break
            }
          }
          break
        case '-':
          revisions.push(this.buildTableDrop(rev[1].name))
          break
        case '+':
          revisions.push({ sql: this.buildTable(rev[1]) })
          break
      }
    }
    return revisions
  }

  buildAddColumn(column: any): SchemaRevisionStatement {
    const constraints: string[] = []
    const columnSql = this.buildColumn(column, constraints)
    return {
      sql: `ALTER TABLE "${column.tableName}" ADD COLUMN${columnSql};`,
      constraints,
    }
  }

  buildDropColumn(column: any): SchemaRevisionStatement {
    return {
      sql: `ALTER TABLE "${column.tableName}" DROP COLUMN "${column.name}";`,
    }
  }

  protected validateTableExists(tableName: string): void {
    if (!this.tables) {
      throw new Error('Tables not populated for this instance')
    }
    const table = this.tables.find((t) => t.name === tableName)
    if (!table) {
      throw new Error(`Table "${tableName}" does not exist`)
    }
  }

  protected validateColumnExists(tableName: string, columnName: string): void {
    if (!this.tables) {
      throw new Error('Tables not populated for this instance')
    }
    const table = this.tables.find((t) => t.name === tableName)
    if (!table) {
      throw new Error(`Table "${tableName}" does not exist`)
    }

    const column = table.columns.find((col) => col.name === columnName)
    if (!column) {
      throw new Error(
        `Column "${columnName}" does not exist in table "${tableName}"`,
      )
    }
  }
}

// Realizing I needed to write this function ruined my evening,
// and I started to wonder whether or not this was really worth it
function diffSchemas(snapshot: TableDefinition[], original: TableDefinition[]) {
  // TODO create types for jsonDiff structure
  const diff = jsonDiff(snapshot, original) ?? []

  let i = 0
  while (i < diff.length) {
    const [op, tableRev] = diff[i]
    if (op === ' ') {
      i++
      continue
    }
    if (['~', '-'].includes(op)) {
      tableRev.__original = snapshot[i++]
      if (tableRev.columns) {
        let c = 0
        let originalIndex = 0
        while (c < tableRev.columns.length) {
          const [cOp, columnDiff] = tableRev.columns[c]
          if (cOp === ' ') {
            originalIndex++
            c++
            continue
          }
          // Reconciliation when jsonDiff thinks it's
          // renaming and adding a new column:
          //
          // [
          //   "~",
          //   {
          //     "size__deleted": "255",
          //     "name": {
          //       "__old": "email",
          //       "__new": "new_field"
          //     }
          //   }
          // ],
          // [
          //   "+",
          //   {
          //     "tableName": "users",
          //     "interfaceName": "UsersTable",
          //     "name": "email",
          //     "nullable": false,
          //     "tsType": "string"
          //   }
          // ],
          if (cOp === '~') {
            columnDiff.__original = tableRev.__original.columns[originalIndex]
            const revIndex = tableRev.columns.findIndex((_: any) => {
              return _[0] === '+' && _[1].name === columnDiff.name.__old
            })
            if (revIndex !== -1 && revIndex > c) {
              const { name, ...rest } = columnDiff
              Object.assign(
                columnDiff,
                tableRev.__original.columns[originalIndex],
              )
              for (const m of Object.keys(rest)) {
                if (m.match(/((__deleted)|(__added))/)) {
                  const [key] = m.split(/((__deleted)|(__added))/)
                  delete columnDiff[key]
                  columnDiff[m] = rest[m]
                } else if (rest[m].__old) {
                  columnDiff[m] = rest[m]
                }
              }
              const rev = tableRev.columns[revIndex]
              rev[1].name = name.__new
            } else {
              columnDiff.__original = tableRev.__original.columns[originalIndex]
            }
            originalIndex++
            c++
            continue
          }
          // Reconcilation for -/+ sequence with same column name
          if (cOp === '-') {
            const name = columnDiff.name
            const revIndex = tableRev.columns.findIndex((_: any) => {
              return _[0] === '+' && _[1].name === name
            })
            if (revIndex !== -1 && revIndex > c) {
              tableRev.columns[c][0] = '~'
              const [rev] = tableRev.columns.splice(revIndex, 1)
              {
                const { name: _, ...rest } = columnDiff
                for (const m of Object.keys(rest)) {
                  if (!(m in rev[1])) {
                    columnDiff[`${m}__deleted`] = columnDiff[m]
                    delete columnDiff[m]
                  }
                }
              }
              {
                const { name: _, ...rest } = rev[1]
                for (const m of Object.keys(rest)) {
                  if (!(m in columnDiff)) {
                    columnDiff[`${m}__added`] = rev[1][m]
                    delete columnDiff[m]
                  }
                }
              }
              continue
            } else {
              c++
              continue
            }
          }
          // Reconcilation for +/~ sequence with same column name
          if (cOp === '+') {
            const name = columnDiff.name
            const revIndex = tableRev.columns.findIndex((_: any) => {
              return _[0] === '~' && _[1].name.__old === name
            })
            if (revIndex !== -1 && revIndex > c) {
              tableRev.columns[c][0] = '~'
              const [rev] = tableRev.columns.splice(revIndex, 1)
              const { name: _, ...rest } = rev[1]
              for (const m of Object.keys(rest)) {
                if (m.match(/((__deleted)|(__added))/)) {
                  const [key] = m.split(/((__deleted)|(__added))/)
                  delete columnDiff[key]
                  columnDiff[m] = rest[m]
                } else if (rest[m].__old) {
                  columnDiff[m] = rest[m]
                }
              }
              continue
            } else {
              c++
              continue
            }
          }
          if (cOp === ' ') {
            originalIndex++
            c++
            continue
          }
          originalIndex++
          c++
        }
      }
    }
  }
  // console.log('diff', JSON.stringify(diff, null, 2))
  // Nevermind, that was actually satisfying as fuck
  return diff
}
