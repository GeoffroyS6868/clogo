// Bytes a first visit transfers (cold cache), as served by a running server.
// Usage: node scripts/bench/transfer.mjs http://localhost:3100 [encoding=br]
import { get } from 'node:http'

const base = process.argv[2] ?? 'http://localhost:3100'
const encoding = process.argv[3] ?? 'br'

function fetchRaw(path) {
  return new Promise((resolve, reject) => {
    get(new URL(path, base), { headers: { 'accept-encoding': encoding } }, (res) => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve({ status: res.statusCode, encoding: res.headers['content-encoding'] ?? 'identity', body: Buffer.concat(chunks) }))
    }).on('error', reject)
  })
}

const page = await fetchRaw('/')
const html = (encoding === 'identity' || page.encoding === 'identity')
  ? page.body.toString()
  : (await import('node:zlib'))[page.encoding === 'br' ? 'brotliDecompressSync' : 'gunzipSync'](page.body).toString()
const refs = [...new Set([...html.matchAll(/(?:src|href)="(\/[^"]+\.(?:js|mjs|css))"/g)].map(m => m[1]))]
const assets = await Promise.all(refs.map(async r => ({ path: r, ...(await fetchRaw(r)) })))

const all = [{ path: '/', ...page }, ...assets]
const errors = all.filter(a => a.status !== 200).length
const uncompressed = all.filter(a => a.encoding === 'identity').map(a => a.path)
console.log(JSON.stringify({
  base,
  requested: encoding,
  requests: all.length,
  bytes: all.reduce((s, a) => s + a.body.length, 0),
  uncompressed,
  errors
}, null, 2))
