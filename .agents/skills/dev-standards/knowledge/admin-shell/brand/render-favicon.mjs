/**
 * 从指定 SVG 生成 favicon.ico（16 + 32）。
 * 依赖：Node 18+、npm 包 sharp、to-ico（`pnpm add -D sharp to-ico`）。
 *
 * 用法：node render-favicon.mjs [svg路径] [输出 favicon.ico]
 * 省略参数时默认读取本目录 admin-shell-brand-mark.svg（skill 示例）。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import toIco from 'to-ico'

const __dirname = dirname(fileURLToPath(import.meta.url))
const svgPath = resolve(process.argv[2] ?? join(__dirname, 'admin-shell-brand-mark.svg'))
const out = resolve(process.argv[3] ?? join(__dirname, 'favicon.ico'))

const svg = readFileSync(svgPath)

const sizes = [16, 32]
const pngs = await Promise.all(
  sizes.map((size) =>
    sharp(svg, { density: 300 })
      .resize(size, size)
      .png()
      .toBuffer()
  )
)

const ico = await toIco(pngs)
writeFileSync(out, ico)
console.log(`Wrote ${out} from ${svgPath} (${sizes.join(', ')}px)`)
