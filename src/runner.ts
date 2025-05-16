import 'tsx/esm'

import minimist from 'minimist'
import pc from 'picocolors'
import { Kysely, KyselyConfig } from 'kysely'
import { performance as perf } from 'node:perf_hooks'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, parse } from 'node:path'
import {
  createSQLSchemaFromSource,
  createSQLSchemaResetFromSource,
  // createSQLSchemaRevisionFromSource,
  PostgresDialect,
  // SqliteDialect
} from './index'

const start = perf.now()

export function createRunner<Database>(config: KyselyConfig) {
  const argv = minimist(process.argv.slice(1))

  if (argv.create) {
    const { source, sourceDir, sourceFileName, sourceBaseFileName } =
      readSource(argv._[0])

    const generatedSchema = createSQLSchemaFromSource({
      source,
      fileName: sourceFileName,
      dialect: PostgresDialect,
    })

    const generatedSchemaFileName = `${sourceBaseFileName}.sql`
    const generatedSchemaFilePath = join(sourceDir, generatedSchemaFileName)
    if (existsSync(generatedSchemaFilePath)) {
      console.warn(
        pc.yellow(
          `${pc.red('✖')} ${pc.cyan(
            generatedSchemaFileName,
          )} exists, did you mean to --reset?`,
        ),
      )
      process.exit(1)
    }

    writeFileSync(generatedSchemaFilePath, generatedSchema)
    success(`${pc.green('✔')} ${pc.cyan(generatedSchemaFileName)} written`)
  }

  const database = new Kysely<Database>(config)

  if (argv.reset) {
    const { source, sourceDir, sourceFileName, sourceBaseFileName } =
      readSource(argv._[0])

    const generatedSchemaReset = createSQLSchemaResetFromSource({
      source,
      fileName: sourceFileName,
      dialect: PostgresDialect,
    })

    console.log(generatedSchemaReset)
  }

  if (argv.up) {
  }

  return database
}

function readSource(sourceFilePath: string): Record<string, string> {
  const { name, ext, dir } = parse(sourceFilePath)
  const snapshoptFileName = `${name}.snapshot${ext}`
  const snapshoptFilePath = join(dir, snapshoptFileName)
  const source = readFileSync(sourceFilePath, 'utf8')
  return {
    sourceDir: dir,
    sourceFileName: `${name}${ext}`,
    sourceFilePath,
    sourceBaseFileName: name,
    snapshoptFileName,
    snapshoptFilePath,
    source,
  }
}

function success(log: string, globalStartOverride?: number) {
  console.log(`${log} in ${now(globalStartOverride)}`)
}

function now(globalStartOverride?: number) {
  return (perf.now() - (globalStartOverride ?? start)).toFixed(2)
}
