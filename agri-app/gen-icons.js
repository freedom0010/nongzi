#!/usr/bin/env node
/**
 * 生成 TabBar 图标
 * 运行: node gen-icons.js
 * 输出到 src/static/tabbar/
 *
 * 正式项目建议用 Figma / 蓝湖 导出真实 PNG 图标
 * 此脚本用 SVG 生成占位图标，满足打包最低要求
 */

const fs   = require('fs')
const path = require('path')

const OUT_DIR = path.join(__dirname, 'src/static/tabbar')
fs.mkdirSync(OUT_DIR, { recursive: true })

const icons = {
  'home':      { normal: '🏠', path: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z' },
  'scan':      { normal: '📷', path: 'M3 5v4h2V5h4V3H5c-1.1 0-2 .9-2 2zm2 10H3v4c0 1.1.9 2 2 2h4v-2H5v-4zm14 4h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4zm0-16h-4v2h4v4h2V5c0-1.1-.9-2-2-2zM12 8c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z' },
  'inventory': { normal: '📦', path: 'M20 7H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm-9 9H7v-2h4v2zm6-4H7v-2h10v2z' },
  'record':    { normal: '📋', path: 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 14H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z' },
  'profile':   { normal: '👤', path: 'M12 12c2.2 0 4-1.8 4-4s-1.8-4-4-4-4 1.8-4 4 1.8 4 4 4zm0 2c-2.7 0-8 1.3-8 4v2h16v-2c0-2.7-5.3-4-8-4z' },
}

function makeSVG(pathD, color, size = 81) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
  <path fill="${color}" d="${pathD}"/>
</svg>`
}

Object.entries(icons).forEach(([name, icon]) => {
  // 普通（灰色）
  fs.writeFileSync(
    path.join(OUT_DIR, `${name}.svg`),
    makeSVG(icon.path, '#999999')
  )
  // 激活（绿色）
  fs.writeFileSync(
    path.join(OUT_DIR, `${name}-active.svg`),
    makeSVG(icon.path, '#1a5c2a')
  )
  console.log(`✅ 生成 ${name}.svg / ${name}-active.svg`)
})

console.log('\n图标生成完成！')
console.log('注意：HBuilderX 打包需要 PNG 格式图标')
console.log('可用工具将 SVG 转 PNG：https://cloudconvert.com/svg-to-png')
console.log('或在 Figma 中导出 3x 尺寸的 PNG（81×81px）')
