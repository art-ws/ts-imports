import chalk from "chalk"
import fs from "fs"
import glob from "glob"
import path from "path"
import { parseTypeScriptImport } from "./parse-imports"
//import { parse as parseTypeScript } from "parse-imports-ts";
//import chalk from 'chalk';

function normalizePath(s: string): string {
  return s.split("\\").join("/")
}

export function resolveGlob(filter: string, cwd: string): string[] {
  return glob.sync(filter, { cwd, nosort: true, dot: false })
}

export function findSourceFiles(ctx: { ext: string; cwd: string }): string[] {
  const filters = [`**/**/*.${ctx.ext}`]

  const result: string[] = filters
    .reduce((p, c) => [...p, ...resolveGlob(c, ctx.cwd)], [])
    .map((s) => path.join(ctx.cwd, s))
    .map(normalizePath)
  return result
}

export function cutBase(base: string, s: string): string {
  if (s.startsWith(base)) {
    return s.substring(base.length)
  } else {
    return s
  }
}

function trimStart(s: string, symbols: string): string {
  if (s.startsWith(symbols)) {
    return s.substring(symbols.length)
  }
  return s
}

function cutFileNameBase(isFullPath: boolean, base: string, filename: string) {
  if (isFullPath) return filename
  let s = cutBase(base, filename)
  return trimStart(s, "/")
}

export function getFileContent(filename: string): string {
  return fs.readFileSync(filename, "utf-8")
}

export function getLines(content: string): string[] {
  return content.split(/\r?\n/)
}

const RE_IMPORT = /.+from\s+['"](.+)['"]/gi

function isFileDisabled(s: string[]): boolean {
  return !!s.find((x) => x.includes("disable:ts-imports"))
}

function isLineDisabled(s: string): boolean {
  return (
    s.startsWith("//") ||
    s.includes("disable-line") ||
    (s.includes("disable") && s.includes("ts-imports"))
  )
}

export interface ImportLineInfo {
  source: string
  importExpr: string
}

function getTypeScriptImportLines(filename: string): ImportLineInfo[] {
  const content = getFileContent(filename)
  let lines = getLines(content)
  lines = isFileDisabled(lines) ? [] : lines

  return lines
    .filter((x) => x.match(RE_IMPORT))
    .filter((x) => !isLineDisabled(x))
    .map((s) => {
      const importExpr = parseTypeScriptImport(s)
      const lineInfo: ImportLineInfo = {
        source: s,
        importExpr,
      }
      return lineInfo
    })
    .filter((x) => !!x.importExpr)
}

export interface ResolvedImportLineInfo {
  importExpr: string
  source: string
  filename: string
  exists: boolean
}
export interface FileWithImports {
  filename: string
  dependencies: ResolvedImportLineInfo[]
}

function getFileWithImports(filename: string, ext: string): FileWithImports {
  const imports = getTypeScriptImportLines(filename)
  const dir = path.dirname(filename)
  return {
    filename,
    dependencies: imports.map((x) => {
      let fn: string = null
      let exists: boolean = null
      const { importExpr, source } = x
      if (importExpr.startsWith(".")) {
        let n = importExpr
        if (n.endsWith(".")) {
          n += `/index`
        }
        if (!n.endsWith(`.${ext}`)) {
          n += `.${ext}`
        }
        fn = path.join(dir, n)
        if (fs.existsSync(fn)) {
          exists = true
        } else {
          fn = path.join(dir, importExpr)
          if (fs.existsSync(fn)) {
            fn = fn + `/index.${ext}`
            exists = fs.existsSync(fn)
          }
        }
      }

      return {
        importExpr,
        source,
        exists,
        filename: fn,
      }
    }),
  }
}
export function listSourceFiles(o: {
  cwd: string
  ext?: string
  isVerbose: boolean
  isNums: boolean
  isRefs: boolean
  isRel: boolean
  filter: string
}) {
  const {
    cwd,
    ext = "ts",
    isVerbose = false,
    isNums = false,
    isRefs = false,
    filter = "*",
    isRel = false,
  } = o
  const list = findSourceFiles({ ext, cwd }).map((s) =>
    getFileWithImports(s, ext)
  )

  list
    .filter((x) => isMatchFilter(x.filename, filter))
    .forEach((x, i) => {
      let filename =
        (isNums ? i + 1 + ") " : "") +
        cutFileNameBase(isVerbose, cwd, x.filename)
      console.log(filename)

      if (isRefs) {
        x.dependencies.forEach((d, j) => {
          const offset = "   "
          const nn = isNums ? j + 1 + ") " : ""
          if (d.filename) {
            let filename =
              nn +
              (isRel
                ? path.relative(path.dirname(x.filename), d.filename)
                : cutFileNameBase(isVerbose, cwd, d.filename))
            if (d.exists) {
              console.log(chalk.blue(offset + filename))
            } else {
              console.log(chalk.red(offset + filename))
            }
          } else {
            console.log(chalk.yellow(offset + nn + d.importExpr))
          }
        })
      }
    })
}

function isMatchFilter(s: string, filter: string): boolean {
  if (filter === "*") return true
  return s.includes(filter)
}

export function listDependencies(o: {
  cwd: string
  ext?: string
  isVerbose?: boolean
  isNums?: boolean
  isRefs?: boolean
  isRel: boolean
  filter: string
  isDepsOnly: boolean
}) {
  const {
    cwd,
    ext = "ts",
    isVerbose = false,
    isNums = false,
    isRefs = false,
    filter = "*",
    isDepsOnly,
    isRel = false,
  } = o
  const list = findSourceFiles({ ext, cwd }).map((s) =>
    getFileWithImports(s, ext)
  )

  type T1 = {
    [dependency: string]: string[]
  }

  const cache: T1 = {}

  list.forEach((x) => {
    x.dependencies.forEach((d) => {
      let dependency = null
      if (isDepsOnly) {
        if (!d.filename) {
          dependency = d.importExpr
        }
      } else {
        dependency = d.filename || d.importExpr
      }
      if (dependency) {
        const files = cache[dependency] || []
        files.push(x.filename)
        cache[dependency] = files
      }
    })
  })

  type T2 = {
    dependency: string
    files: string[]
  }

  const items: T2[] = Object.keys(cache).map((key) => {
    const files = cache[key].map((fn) =>
      isRel
        ? path.relative(path.dirname(key), fn)
        : cutFileNameBase(isVerbose, cwd, fn)
    )
    files.sort()
    return {
      dependency: cutFileNameBase(isVerbose, cwd, key),
      files,
    }
  })

  items.sort((a: T2, b: T2) => {
    return a.files.length - b.files.length
  })

  items
    .filter((x) => isMatchFilter(x.dependency, filter))
    .forEach((x, i) => {
      console.log((isNums ? i + 1 + ") " : "") + x.dependency)
      if (isRefs) {
        const offset = "  "
        x.files.forEach((fn, j) => {
          console.log(chalk.blue(offset + (isNums ? j + 1 + ") " : "") + fn))
        })
      }
    })
}
