import fs from 'fs';
import chalk from 'chalk';
import glob from 'glob';
import path from 'path';
//import { parse as parseTypeScript } from "parse-imports-ts";
//import chalk from 'chalk';

function normalizePath(s: string): string {
  return s.split('\\').join('/');
}

export function resolveGlob(filter: string, cwd: string): string[] {
  return glob.sync(filter, { cwd, nosort: true, dot: false });
}

export function findSourceFiles(ctx: {ext: string, cwd: string}): string[] {
  const filters = [`**/**/*.${ctx.ext}`];

  const result: string[] = filters.reduce((p, c) => [...p, ...resolveGlob(c, ctx.cwd)], [])
    .map(s => path.join(ctx.cwd, s))
    .map(normalizePath);
  return result;
}

export function cutBase(base: string, s: string): string {
  if (s.startsWith(base)) {
    return s.substring(base.length);
  } else {
    return s;
  }
}

export function getFileContent(filename: string): string {
  return fs.readFileSync(filename, 'utf-8');
}


export function getLines(content: string): string[] {
  return content.split(/\r?\n/);
}

const RE_IMPORT = /(import|export).+from\s+['"](.+)['"]/gi;

export interface ImportLineInfo {
  text: string;
  importExpr: string;
  importPath: string;
  effectivePath: string;
  effectiveRelPath: string;
}

function isFileDisabled(s: string[]): boolean {
  return !!s.find(x => x.includes('disable:ts-imports'));
}

function isLineDisabled(s: string): boolean {
  return s.includes('disable-line') || (s.includes('disable') && s.includes('ts-imports'))
}

function getImportLines(filename: string): ImportLineInfo[] {
  const content = getFileContent(filename);
  let lines = getLines(content)
  lines = isFileDisabled(lines) ? [] : lines;

  const base = path.dirname(filename);
  return lines
    .filter(x => x.match(RE_IMPORT))
    .filter(x => !isLineDisabled(x))
    //.filter(s => s.includes('..'))
    .map(s => {
      const match = RE_IMPORT.exec(s) || [];
      const importExpr = match[1] || s;
      const firstIndex = importExpr.indexOf('.');
      const lastIndex = importExpr.lastIndexOf('../');
      const importPath = lastIndex === -1 ? '' : importExpr.substring(firstIndex, lastIndex + 3);

      let effectivePath = '';
      let effectiveRelPath = '';
      if (importPath) {
        effectivePath = normalizePath(path.join(filename, importPath));
        effectiveRelPath = path.relative(base, effectivePath);
      } else {
        //console.warn(chalk.yellow('WARNING! ') + `Import expression '${importExpr}' can not be resolved.`)
      }

      const lineInfo: ImportLineInfo = {
        text: s,
        importExpr,
        importPath,
        effectivePath,
        effectiveRelPath
      };

      return lineInfo;
    });
}

function getTypeScriptFileImports(filename: string): string[]{
  const list = getImportLines(filename)
  return list.map(x => x.text);
}

export function listSourceFiles(cwd: string){ 
  const list = findSourceFiles({ ext: 'ts', cwd});
  list.forEach(s => {
    console.log(s);
    const imports = getTypeScriptFileImports(s);
    imports.forEach(s1 => {
      console.log('   ', s1);    
    })
  })
  console.log(chalk.green(cwd));
}