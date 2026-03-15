/**
 * Genera icon-192.png e icon-512.png cuadrados desde app-icon.svg.
 * Requiere: npm install sharp --save-dev
 * Uso: node scripts/generate-icons.mjs
 */
import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const svgPath = join(root, 'src', 'assets', 'app-icon.svg')
const publicDir = join(root, 'public')

const svg = readFileSync(svgPath)

async function run() {
  const sizes = [192, 512]
  let buf192
  for (const size of sizes) {
    const buf = await sharp(svg)
      .resize(size, size)
      .png()
      .toBuffer()
    writeFileSync(join(publicDir, `icon-${size}.png`), buf)
    if (size === 192) buf192 = buf
    console.log(`Written public/icon-${size}.png (${size}x${size})`)
  }
  if (buf192) {
    const assetsDir = join(root, 'src', 'assets')
    writeFileSync(join(assetsDir, 'icon-192.png'), buf192)
    console.log('Written src/assets/icon-192.png (para Nav)')
  }
}

run().catch(e => { console.error(e); process.exit(1) })
