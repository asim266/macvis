#!/usr/bin/env node
// Generate assets/icon.icns from an SVG of the MacVis logomark.
// Run with: pnpm exec node scripts/build-icon.mjs

import sharp from 'sharp'
import { mkdirSync, existsSync, rmSync } from 'fs'
import { execSync } from 'child_process'
import path from 'path'

const ROOT = path.resolve(import.meta.dirname || path.dirname(new URL(import.meta.url).pathname), '..')
const ASSETS = path.join(ROOT, 'assets')
const ICONSET = path.join(ROOT, 'icon.iconset')

// 1024×1024 SVG — green gradient rounded square with monospace M
const svg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <!-- sRGB equivalents of oklch(72% 0.19 148) → oklch(54% 0.22 150) -->
      <stop offset="0%"  stop-color="#34d399" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
    <filter id="inner" x="0" y="0" width="100%" height="100%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="6" />
      <feOffset dx="0" dy="6" />
      <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" />
      <feColorMatrix values="0 0 0 0 1   0 0 0 0 1   0 0 0 0 1   0 0 0 0.25 0"/>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background rounded square with green gradient -->
  <rect x="64" y="64" width="896" height="896" rx="224" ry="224" fill="url(#bg)" filter="url(#inner)"/>

  <!-- Subtle inner highlight at the top -->
  <rect x="64" y="64" width="896" height="448" rx="224" ry="224" fill="white" opacity="0.08"/>

  <!-- "M" wordmark in monospace -->
  <text x="512" y="700"
        text-anchor="middle"
        font-family="-apple-system, 'SF Pro Display', 'Helvetica Neue', system-ui, sans-serif"
        font-size="640"
        font-weight="800"
        fill="white"
        letter-spacing="-30">M</text>
</svg>
`)

const PNG_SIZES = [16, 32, 64, 128, 256, 512, 1024]
const ICONSET_FILES = [
  { size: 16,   name: 'icon_16x16.png' },
  { size: 32,   name: 'icon_16x16@2x.png' },
  { size: 32,   name: 'icon_32x32.png' },
  { size: 64,   name: 'icon_32x32@2x.png' },
  { size: 128,  name: 'icon_128x128.png' },
  { size: 256,  name: 'icon_128x128@2x.png' },
  { size: 256,  name: 'icon_256x256.png' },
  { size: 512,  name: 'icon_256x256@2x.png' },
  { size: 512,  name: 'icon_512x512.png' },
  { size: 1024, name: 'icon_512x512@2x.png' },
]

async function main() {
  mkdirSync(ASSETS, { recursive: true })
  if (existsSync(ICONSET)) rmSync(ICONSET, { recursive: true })
  mkdirSync(ICONSET, { recursive: true })

  // Render a 1024 master PNG and keep it
  const masterPath = path.join(ASSETS, 'icon.png')
  await sharp(svg).resize(1024, 1024).png().toFile(masterPath)
  console.log('✓ Wrote', masterPath)

  // Render each size into iconset/
  for (const { size, name } of ICONSET_FILES) {
    const out = path.join(ICONSET, name)
    await sharp(svg).resize(size, size).png().toFile(out)
  }
  console.log('✓ Wrote', ICONSET_FILES.length, 'iconset PNGs')

  // Convert iconset → .icns via macOS iconutil
  const icnsPath = path.join(ASSETS, 'icon.icns')
  execSync(`iconutil -c icns "${ICONSET}" -o "${icnsPath}"`, { stdio: 'inherit' })
  console.log('✓ Wrote', icnsPath)

  // Clean up the temp iconset folder
  rmSync(ICONSET, { recursive: true })
}

main().catch(err => { console.error(err); process.exit(1) })
