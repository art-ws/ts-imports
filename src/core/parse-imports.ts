function extractBetween(delim: string, s: string): string {
  const idx1 = s.indexOf(delim)
  if (idx1 === -1) return null
  const idx2 = s.indexOf(delim, idx1 + 1)
  if (idx2 === -1) return null
  return s.substring(idx1 + 1, idx2)
}

export function parseTypeScriptImport(input: string): string {
  return extractBetween(`"`, input) || extractBetween(`'`, input)
}

