#!/usr/bin/env node
/**
 * Upstream update checker for dsh-bot-codex-ui.
 *
 * The plugin vendors a modified ds-bot and pins dsh-codex-ui. Both upstreams
 * release very frequently (ds-bot roughly daily, dsh-codex-ui every 1-2 days),
 * so without an explicit check we silently fall behind.
 *
 * This script:
 *   1. Reads the versions this plugin is built from (ds-bot in the vendored
 *      fork, dsh-codex-ui in package.json).
 *   2. Queries npm for the latest published versions.
 *   3. Reports any newer releases, and (optionally) tests whether our source
 *      patch still applies cleanly to the newest ds-bot.
 *
 * Exit codes:
 *   0  everything is up to date
 *   1  one or both upstreams have newer releases
 *   2  could not determine versions (network or parse failure)
 *
 * Usage:
 *   node scripts/check-upstream.mjs              # version check only
 *   node scripts/check-upstream.mjs --test-patch # also try the patch on new ds-bot
 *   node scripts/check-upstream.mjs --json       # machine-readable output
 */
import { readFileSync, existsSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const args = process.argv.slice(2)
const testPatch = args.includes('--test-patch')
const jsonOut = args.includes('--json')

// ---- where our baselines live -------------------------------------------------

function localDsBotVersion() {
  // base.json records the upstream RELEASE we forked from. The vendored
  // ds-bot/package.json can disagree (upstream git tags sometimes carry a
  // different version than the npm release), so base.json is authoritative.
  const p = join(ROOT, 'base.json')
  if (!existsSync(p)) {
    // Fallback to the vendored package.json.
    try { return JSON.parse(readFileSync(join(ROOT, 'ds-bot', 'package.json'), 'utf8')).version } catch { return null }
  }
  try { return JSON.parse(readFileSync(p, 'utf8')).dsBot?.baseVersion ?? null } catch { return null }
}

function localCodexVersion() {
  const p = join(ROOT, 'base.json')
  if (existsSync(p)) {
    try { return JSON.parse(readFileSync(p, 'utf8')).codexUi?.baseVersion ?? null } catch { /* fall through */ }
  }
  try {
    const spec = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).dependencies?.['@michengai/dsh-codex-ui']
    return spec ? spec.replace(/^[\^~>=<\s]+/, '').split(/\s/)[0] : null
  } catch { return null }
}

// ---- version comparison (numeric, pre-release aware enough for our needs) -----

function cmp(a, b) {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0)
    if (d !== 0) return d < 0 ? -1 : 1
  }
  return 0
}

// ---- registry access ---------------------------------------------------------

async function latestVersion(pkg) {
  const res = await fetch(`https://registry.npmjs.org/${pkg}`, {
    headers: { accept: 'application/vnd.npm.install-v1+json' },
  })
  if (!res.ok) throw new Error(`${pkg}: HTTP ${res.status}`)
  const body = await res.text()
  // The abbreviated packument has dist-tags but no time; use it when present.
  const tag = body.match(/"latest":"([^"]+)"/)
  return tag ? tag[1] : null
}

// ---- optional: test whether our patch applies to the newest ds-bot ------------

async function testPatchApplies(version) {
  const tmp = join(ROOT, '.upstream-check')
  rmSync(tmp, { recursive: true, force: true })
  mkdirSync(tmp, { recursive: true })
  try {
    // Shallow clone the tag directly.
    execFileSync('git', [
      'clone', '--depth', '1', '--branch', `v${version}`,
      'https://github.com/Fei2411/DeepSeek-Bot.git', join(tmp, 'upstream'),
    ], { stdio: 'pipe' })
    // The patch expects a full history for --3way; unshallow so it can merge.
    execFileSync('git', ['fetch', '-q', '--unshallow'], { cwd: join(tmp, 'upstream'), stdio: 'pipe' })
    const patchPath = join(ROOT, 'ds-bot-local.patch')
    if (!existsSync(patchPath)) return { ok: false, reason: 'no patch file at ds-bot-local.patch' }
    execFileSync('git', ['apply', '--3way', patchPath], {
      cwd: join(tmp, 'upstream'), stdio: 'pipe',
    })
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: String(e.stderr || e.message).split('\n').slice(-3).join(' | ') }
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}

// ---- main --------------------------------------------------------------------

async function main() {
  const dsLocal = localDsBotVersion()
  const cxLocal = localCodexVersion()

  let dsLatest, cxLatest
  try {
    dsLatest = await latestVersion('ds-bot')
    cxLatest = await latestVersion('@michengai/dsh-codex-ui')
  } catch (e) {
    console.error('ERROR: could not reach the npm registry:', e.message)
    process.exit(2)
  }

  const result = {
    dsBot: { local: dsLocal, latest: dsLatest, behind: dsLatest ? cmp(dsLocal, dsLatest) < 0 : false },
    codexUi: { local: cxLocal, latest: cxLatest, behind: cxLatest ? cmp(cxLocal, cxLatest) < 0 : false },
    patch: null,
  }

  if (jsonOut) {
    if (testPatch && result.dsBot.behind) result.patch = await testPatchApplies(dsLatest)
    console.log(JSON.stringify(result, null, 2))
    process.exit(result.dsBot.behind || result.codexUi.behind ? 1 : 0)
  }

  console.log('=== upstream update check ===')
  console.log(`  ds-bot       local ${dsLocal}   latest ${dsLatest}   ${result.dsBot.behind ? '⚠ BEHIND' : '✓ up to date'}`)
  console.log(`  dsh-codex-ui local ${cxLocal}   latest ${cxLatest}   ${result.codexUi.behind ? '⚠ BEHIND' : '✓ up to date'}`)

  if (testPatch && result.dsBot.behind) {
    console.log()
    console.log(`  testing whether our patch applies to ds-bot ${dsLatest} …`)
    const patch = await testPatchApplies(dsLatest)
    result.patch = patch
    if (patch.ok) {
      console.log(`  patch: ✓ applies cleanly to v${dsLatest} — safe to merge`)
    } else {
      console.log(`  patch: ✗ does NOT apply cleanly — manual merge needed`)
      console.log(`         ${patch.reason}`)
    }
  }

  console.log()
  if (result.dsBot.behind) {
    console.log(`ACTION: ds-bot ${dsLocal} → ${dsLatest}. See dsbot-local/SOP.md for the merge procedure.`)
  }
  if (result.codexUi.behind) {
    console.log(`ACTION: dsh-codex-ui ${cxLocal} → ${cxLatest}. Update the dependency and re-verify the layout.`)
  }
  if (!result.dsBot.behind && !result.codexUi.behind) {
    console.log('No action needed — both upstreams match the versions this plugin is built from.')
  }

  process.exit(result.dsBot.behind || result.codexUi.behind ? 1 : 0)
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(2) })
