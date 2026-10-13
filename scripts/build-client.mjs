// Builds client.js, the browser half, from the modules in src/client.
//
//   node scripts/build-client.mjs           writes client.js
//   node scripts/build-client.mjs --check   exits 1 when client.js differs from a fresh build
//
// The wrapper mirrors the one dsh uses to load plugin client bundles: a classic
// script that registers itself with window.__ModuleLoader__. The platform modules
// (react, react-dom, ui-primitives) stay external — the shell provides them.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const PLUGIN = dirname(dirname(fileURLToPath(import.meta.url)))
const OUTPUT = join(PLUGIN, 'client.js')
const PLATFORM_MODULES = ['react', 'react-dom', '@deepseek-ai/dsh-client-ui-primitives']
const PLUGIN_ID = 'dsh-bot-codex-ui'

export async function bundleClient() {
  const result = await build({
    absWorkingDir: PLUGIN,
    entryPoints: ['src/client/index.js'],
    bundle: true,
    format: 'cjs',
    platform: 'browser',
    target: 'es2022',
    external: PLATFORM_MODULES,
    treeShaking: false,
    charset: 'utf8',
    write: false,
    logLevel: 'silent',
  })
  if (result.warnings.length > 0) {
    throw new Error('esbuild warnings:\n' + result.warnings.map((w) => w.text).join('\n'))
  }
  return [
    '// Generated from src/client by scripts/build-client.mjs. Do not edit by hand.',
    'window.__ModuleLoader__.load({',
    `  id: '${PLUGIN_ID}',`,
    '  factory: (require) => {',
    'const module = { exports: {} }',
    result.outputFiles[0].text.trimEnd(),
    "return Object.defineProperty({ ...module.exports }, Symbol.toStringTag, { value: 'Module' })",
    '  },',
    '})',
    '',
  ].join('\n')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const next = await bundleClient()
  if (process.argv.includes('--check')) {
    let prev = ''
    try { prev = readFileSync(OUTPUT, 'utf8') } catch { /* missing */ }
    if (prev === next) {
      console.log('OK: client.js is up to date')
    } else {
      console.error('STALE: client.js differs from a fresh build — run npm run build')
      process.exit(1)
    }
  } else {
    writeFileSync(OUTPUT, next)
    console.log(`wrote client.js (${next.length} bytes)`)
  }
}
