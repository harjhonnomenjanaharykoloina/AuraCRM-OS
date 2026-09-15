import fs from 'node:fs'

const source = new URL('../node_modules/.prisma/client/wasm.js', import.meta.url)
const dest = new URL('../node_modules/.prisma/client/wasm.mjs', import.meta.url)

if (fs.existsSync(source)) {
  fs.copyFileSync(source, dest)
  console.log('✓ Copied wasm.js → wasm.mjs')
} else {
  console.warn('⚠ wasm.js not found, skipping')
}
