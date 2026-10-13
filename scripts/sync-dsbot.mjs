#!/usr/bin/env node
/**
 * sync-dsbot.mjs — keep the vendored ds-bot/ in this bundle in step with the local
 * patch kit's fork/, which is the single source of truth for the patched ds-bot.
 *
 * WHY THIS EXISTS
 *   dsbot-local/fork/        : ds-bot 0.1.5 + our 12 local fixes (10 UI + voice + scroll).
 *                              It is read-only here — never written by this script.
 *   dsh-bot-codex-ui/ds-bot/ : a vendored copy that ships inside the community bundle.
 *                              Left alone it drifts from the fork (it is already one
 *                              release behind). This script is the one-way sync that
 *                              removes that drift.
 *
 * DIRECTION IS STRICTLY ONE WAY: fork/  ->  ds-bot/. Nothing is written back to fork/.
 *
 * Usage:
 *   node scripts/sync-dsbot.mjs              # sync, rebuild ds-bot/client.js, self-check
 *   node scripts/sync-dsbot.mjs --dry-run    # report the differences only, change nothing
 *   node scripts/sync-dsbot.mjs --no-build   # sync sources but skip the rebuild
 *
 * Exits non-zero with a clear message on any failure.
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const BUNDLE = dirname(dirname(fileURLToPath(import.meta.url)))
const KIT = join(BUNDLE, '..', 'dsbot-local')
const FORK = join(KIT, 'fork')
const VENDORED = join(BUNDLE, 'ds-bot')
const BUILD_SCRIPT = join(VENDORED, 'scripts', 'build-client.mjs')

const args = process.argv.slice(2)
const dry = args.includes('--dry-run')
const noBuild = args.includes('--no-build')

const fail = (msg) => {
  console.error(`ERROR: ${msg}`)
  process.exit(1)
}

// ---- preconditions ------------------------------------------------------------
if (!existsSync(FORK)) fail(`source of truth not found: ${FORK}`)
if (!existsSync(VENDORED)) fail(`vendored target not found: ${VENDORED}`)
if (!existsSync(join(FORK, 'package.json'))) fail(`fork/ does not look like a ds-bot tree (no package.json): ${FORK}`)

const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex')

// Walk a tree, returning a Map of relative path -> { size, sha } for every file,
// skipping node_modules and build outputs that are regenerated.
function walk(root, skip) {
  const out = new Map()
  const stack = ['']
  while (stack.length) {
    const rel = stack.pop()
    const abs = join(root, rel)
    for (const name of readdirSync(abs)) {
      const relPath = rel ? `${rel}/${name}` : name
      if (skip.has(name)) continue
      const st = statSync(join(root, relPath))
      if (st.isDirectory()) stack.push(relPath)
      else out.set(relPath, { size: st.size, sha: sha(join(root, relPath)) })
    }
  }
  return out
}

const SKIP = new Set(['node_modules', '.git'])
// client.js is a build output: it is regenerated after the sync, so a source-file
// comparison should not treat a stale one as a meaningful source difference.
const REGEN = new Set(['client.js'])

console.log(`sync-dsbot: fork (truth) -> vendored ds-bot`)
console.log(`  source : ${FORK}`)
console.log(`  target : ${VENDORED}`)
console.log(`  mode   : ${dry ? 'DRY-RUN (no writes)' : 'SYNC'}${noBuild ? ' + no-build' : ''}`)
console.log()

// ---- compare -----------------------------------------------------------------
const forkFiles = walk(FORK, SKIP)
const venFiles = walk(VENDORED, SKIP)

const isSource = (p) => !REGEN.has(p.split('/').pop())

const added = [] // in fork, missing in vendored
const removed = [] // in vendored, not in fork
const changed = [] // present in both, different bytes
const same = []

for (const [p, meta] of forkFiles) {
  if (!isSource(p)) continue
  const v = venFiles.get(p)
  if (!v) added.push(p)
  else if (v.sha !== meta.sha) changed.push(p)
  else same.push(p)
}
for (const p of venFiles.keys()) {
  if (!isSource(p)) continue
  if (!forkFiles.has(p)) removed.push(p)
}

// Version banner for the report.
const verOf = (root) => {
  try { return JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version } catch { return '?' }
}
console.log(`version  fork=${verOf(FORK)}  vendored=${verOf(VENDORED)}`)
console.log(`files    identical=${same.length}  changed=${changed.length}  add=${added.length}  remove=${removed.length}`)
console.log()

const section = (title, list) => {
  if (!list.length) return
  console.log(`${title} (${list.length}):`)
  for (const p of list.sort()) console.log(`    ${p}`)
  console.log()
}

section('CHANGED', changed)
section('ADD (in fork, not in vendored)', added)
section('REMOVE (in vendored, not in fork)', removed)

if (!changed.length && !added.length && !removed.length && verOf(FORK) === verOf(VENDORED)) {
  console.log('Already in sync (source files identical).')
  // Still allow a rebuild to refresh client.js if requested.
  if (dry || noBuild) { console.log('RESULT: IN SYNC'); process.exit(0) }
} else if (dry) {
  console.log('RESULT: DRY-RUN — differences above would be applied; nothing written.')
  process.exit(0)
}

// ---- sync: fork -> vendored (one way), excluding node_modules ----------------
// rsync --delete makes vendored an exact mirror of fork's tracked content. The
// exclusion of node_modules keeps each tree's own dependency install intact.
console.log('syncing source files (rsync -a --delete, excluding node_modules) …')
try {
  execFileSync('rsync', [
    '-a', '--delete',
    '--exclude', 'node_modules',
    '--exclude', '.git',
    `${FORK}/`, `${VENDORED}/`,
  ], { stdio: 'inherit' })
} catch (e) {
  fail(`rsync failed: ${e.message}`)
}
console.log('  source sync done.')
console.log()

// ---- rebuild ds-bot/client.js in place ---------------------------------------
if (noBuild) {
  console.log('RESULT: SYNCED (rebuild skipped --no-build)')
  process.exit(0)
}

console.log('rebuilding ds-bot/client.js …')
try {
  execFileSync(process.execPath, [relative(BUNDLE, BUILD_SCRIPT) === BUILD_SCRIPT ? BUILD_SCRIPT : BUILD_SCRIPT], {
    cwd: VENDORED,
    stdio: 'inherit',
  })
} catch (e) {
  fail(`build failed: ${e.message}`)
}

if (!existsSync(join(VENDORED, 'client.js'))) fail('build produced no client.js')

// ---- self-check: rebuilt client.js must match a fresh build (build --check) ---
console.log('self-check: client.js must match a fresh build …')
try {
  execFileSync(process.execPath, [BUILD_SCRIPT, '--check'], { cwd: VENDORED, stdio: 'inherit' })
  console.log('  check passed.')
} catch (e) {
  fail(`build --check failed (client.js is not reproducible): ${e.message}`)
}

const artifactSha = sha(join(VENDORED, 'client.js'))
const baseKit = (() => {
  try { return JSON.parse(readFileSync(join(KIT, 'base.json'), 'utf8')) } catch { return null }
})()

console.log()
console.log('RESULT: SYNCED + BUILT')
console.log(`  ds-bot version   : ${verOf(VENDORED)}`)
console.log(`  client.js sha256 : ${artifactSha}`)
if (baseKit?.artifactSha256) {
  const match = baseKit.artifactSha256 === artifactSha
  console.log(`  kit base sha256  : ${baseKit.artifactSha256}  ${match ? '(MATCH)' : '(differs — expected if the kit rebuilt after its own deploy copy)'}`)
}
console.log()
console.log('Next (not done here):')
console.log('  - review `git -C dsh-bot-codex-ui status/diff` and commit when the user confirms')
console.log('  - reload DSH (Cmd+R) to see the client change')
