import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const sourceRoot = fileURLToPath(new URL('../src/', import.meta.url))
const outputRoot = fileURLToPath(new URL('../dist/', import.meta.url))

async function collect(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await collect(path)))
    else if (entry.name.endsWith('.ts')) files.push(path)
  }
  return files
}

for (const file of await collect(sourceRoot)) {
  const source = await readFile(file, 'utf8')
  const result = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: file,
    reportDiagnostics: true,
  })
  const errors =
    result.diagnostics?.filter(
      (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
    ) ?? []
  if (errors.length) {
    const message = ts.formatDiagnosticsWithColorAndContext(errors, {
      getCanonicalFileName: (path) => path,
      getCurrentDirectory: () => process.cwd(),
      getNewLine: () => '\n',
    })
    throw new Error(message)
  }
  const output = join(
    outputRoot,
    relative(sourceRoot, file).replace(/\.ts$/, '.js'),
  )
  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, result.outputText, 'utf8')
}
