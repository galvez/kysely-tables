
import minimist from 'minimist'
import pc from 'picocolors'
import { performance as perf } from 'node:perf_hooks'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, parse } from 'node:path'
import { 
  createSQLSchemaFromSource, 
  // createSQLSchemaRevisionFromSource, 
  PostgresDialect, 
  // SqliteDialect 
} from './index'

const start = perf.now()
const argv = minimist(process.argv.slice(1))

if (argv.create) {
  const {
    source,
    sourceDir,
    sourceFileName,
    sourceBaseFileName,
  } = readSource()

  const generatedSchema = createSQLSchemaFromSource({
    source,
    fileName: sourceFileName,
    dialect: PostgresDialect,
  })

  const generatedSchemaFileName = `${sourceBaseFileName}.sql`
  const generatedSchemaFilePath = join(sourceDir, generatedSchemaFileName)
  if (existsSync(generatedSchemaFilePath)) {
    console.warn(pc.yellow(`${pc.red('✖')} ${
      pc.cyan(generatedSchemaFileName)
    } exists, did you mean to --reset?`))
    process.exit()
  }

  writeFileSync(generatedSchemaFilePath, generatedSchema)
  success(`\n${pc.green('✔')} ${pc.cyan(generatedSchemaFileName)} written`)
}

if (argv.reset) {
  
}

if (argv.up) {
  
}

// tsx db/schema.ts --create

// tsx db/schema.ts --reset

// tsx db/schema.ts --do --undo

function readSource (): Record<string, string> {
  const [sourceFilePath] = argv._
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

function now (globalStartOverride?: number) {
  return (perf.now() - (globalStartOverride ?? start)).toFixed(2)
}
