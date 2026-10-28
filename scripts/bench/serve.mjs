// Serves scripts/bench/ to the page under test (cross-origin module import), on port 3199.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { join, basename } from 'node:path'

const DIR = import.meta.dirname

createServer(async (req, res) => {
  const name = basename(new URL(req.url, 'http://x').pathname)
  try {
    const body = await readFile(join(DIR, name))
    res.writeHead(200, { 'content-type': 'text/javascript', 'access-control-allow-origin': '*', 'cache-control': 'no-store' })
    res.end(body)
  } catch {
    res.writeHead(404, { 'access-control-allow-origin': '*' })
    res.end()
  }
}).listen(3199)
