// Sizes of what the browser downloads, from a production build (.output/public).
// Usage: node scripts/bench/bundle.mjs [out.json]
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, extname, relative } from 'node:path'
import { gzipSync, brotliCompressSync } from 'node:zlib'

const ROOT = '.output/public'

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    // Pre-compressed copies (.br / .gz) are alternative encodings of a file already counted
    if (/\.(br|gz)$/.test(name)) return []
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

function sizes(path) {
  const data = readFileSync(path)
  return { raw: data.length, gzip: gzipSync(data, { level: 9 }).length, brotli: brotliCompressSync(data).length }
}

const KIND = { '.js': 'js', '.mjs': 'js', '.css': 'css', '.woff2': 'font', '.woff': 'font', '.html': 'html', '.json': 'json' }
const files = walk(ROOT).map(path => ({ path: relative(ROOT, path).replaceAll('\\', '/'), kind: KIND[extname(path)] ?? 'other', ...sizes(path) }))

const sum = (list, key) => list.reduce((s, f) => s + f[key], 0)
const byKind = {}
for (const f of files) {
  byKind[f.kind] ??= { files: 0, raw: 0, gzip: 0, brotli: 0 }
  byKind[f.kind].files++
  for (const key of ['raw', 'gzip', 'brotli']) byKind[f.kind][key] += f[key]
}

// What the first visit downloads before the page is interactive: the HTML and every script,
// module preload and stylesheet it references
const html = readFileSync(join(ROOT, 'index.html'), 'utf8')
const refs = new Set([...html.matchAll(/(?:src|href)="\/([^"]+\.(?:js|mjs|css))"/g)].map(m => m[1]))
const initial = files.filter(f => f.path === 'index.html' || refs.has(f.path))
const missing = [...refs].filter(r => !files.some(f => f.path === r))

const report = {
  total: { files: files.length, raw: sum(files, 'raw'), gzip: sum(files, 'gzip'), brotli: sum(files, 'brotli') },
  byKind,
  initial: { files: initial.length, raw: sum(initial, 'raw'), gzip: sum(initial, 'gzip'), brotli: sum(initial, 'brotli'), list: initial.map(f => f.path) },
  largest: [...files].sort((a, b) => b.gzip - a.gzip).slice(0, 8).map(f => ({ path: f.path, gzip: f.gzip })),
  errors: missing.length,
  missing
}

console.log(JSON.stringify({ total: report.total, initial: { ...report.initial, list: undefined }, byKind, errors: report.errors }, null, 2))
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2))
