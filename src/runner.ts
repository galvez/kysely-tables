
import minimist from 'minimist'
import { readFileSync } from 'node:fs'
import { join, parse } from 'node:path'

const argv = minimist(process.argv.slice(1))


if (argv.create) {
  const schemaSource = readSource()
}

if (argv.reset) {
  
}

if (argv.up) {
  
}

// tsx db/schema.ts --create

// tsx db/schema.ts --reset

// tsx db/schema.ts --do --undo

function readSource () {
  const [sourceFilePath] = argv._
  const { name, ext, dir } = parse(sourceFilePath)
  const snapshoptFileName = `${name}.db${ext}`
  const snapshoptFilePath = join(dir, snapshoptFileName)
  const source = readFileSync(sourceFilePath, 'utf8')
  return {
    sourceDir: dir,
    sourceFileName: `${name}${ext}`,
    sourceFilePath,
    snapshoptFileName,
    snapshoptFilePath,
    source,
  }
}
