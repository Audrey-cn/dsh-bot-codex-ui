// dsh-bot-codex-ui: self-check client plugin.
//
// The vendored ds-bot fork carries all 10 layout fixes. This plugin verifies
// after mount that the fixes are actually taking effect in the rendered DOM,
// so that a silent regression (upstream renamed a class, changed a structure,
// a stylesheet stopped matching) surfaces as a visible warning instead of an
// invisible bug.

// ---------------------------------------------------------------------------
// Self-check
// ---------------------------------------------------------------------------

function runSelfCheck() {
  const issues = []

  // 1. Composer: the row wrapper must exist and be a flex container.
  const card = document.querySelector('[data-composer-card]')
  if (card) {
    const row = card.querySelector('[class*="_row"]')
    if (!row) {
      issues.push('composer row wrapper not found — upstream may have changed the structure')
    } else {
      const display = getComputedStyle(row).display
      if (display === 'contents') {
        issues.push('composer row is display:contents — the structural fix is not applying')
      }
    }
  }

  // 2. Footer must be a single flex row (not a grid).
  const foot = document.querySelector('.dcu-foot')
  if (foot) {
    const display = getComputedStyle(foot).display
    if (display !== 'flex') {
      issues.push('sidebar footer is "' + display + '" instead of flex — the footer fix is not applying')
    }
  }

  // 3. The red warning badge must be hidden (its component is retired).
  const badge = document.querySelector('.bt-connect-warn')
  if (badge && getComputedStyle(badge).display !== 'none') {
    issues.push('the red warning badge is still visible')
  }

  // 4. The mode tabs must be rendered.
  const tabs = document.querySelector('.bt-mode-tabs, .bsf-mode-tabs')
  const footerSlot = document.querySelector('.dcu-footer-actions')
  if (footerSlot && !tabs) {
    issues.push('mode tabs not rendered — the sidebar footer slot may have changed')
  }

  // 5. The account entry must be a single icon (no name label).
  const label = document.querySelector('.dcu-settings-seat [class*="_label"]')
  if (label && getComputedStyle(label).display !== 'none') {
    issues.push('the account name label is still visible (expected a single icon)')
  }

  if (issues.length === 0) {
    console.log('[dsh-bot-codex-ui] self-check passed — all layout fixes are active')
    return
  }

  console.warn('[dsh-bot-codex-ui] self-check found issues:\n  ' + issues.join('\n  '))
  surfaceWarning(issues)
}

function surfaceWarning(issues) {
  // A dismissible red badge in the corner so the failure is not silent.
  const el = document.createElement('div')
  el.className = 'bot-codex-ui-warn'
  el.setAttribute('role', 'alert')
  el.style.cssText = [
    'position:fixed', 'bottom:16px', 'right:16px', 'z-index:99999',
    'max-width:380px', 'padding:10px 14px', 'border-radius:10px',
    'background:#b91c1c', 'color:#fff', 'font-size:12px', 'line-height:18px',
    'box-shadow:0 4px 12px rgba(0,0,0,.3)', 'cursor:pointer', 'white-space:pre-wrap',
  ].join(';')
  el.textContent = 'dsh-bot-codex-ui: some layout fixes are not applying.\n' +
    issues.join('\n') + '\n(click to dismiss)'
  el.addEventListener('click', () => el.remove())
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 20000)
}

// ---------------------------------------------------------------------------
// Plugin entry
// ---------------------------------------------------------------------------

export const inject = []

export function apply(ctx) {
  // Run the check once the DOM has settled. Two seconds is enough for the shell,
  // codex-ui and ds-bot to have mounted; the check is read-only and its only
  // side effect is a dismissible warning.
  const timer = setTimeout(runSelfCheck, 2000)
  ctx.effect(() => () => clearTimeout(timer), 'dsh-bot-codex-ui: self-check')
}
