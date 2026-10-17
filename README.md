# dsh-bot-codex-ui

**One install for the DS Bot team + Codex-style sidebar, with their layout conflicts fixed.**

This plugin bundles a modified copy of [ds-bot](https://github.com/Fei2411/DeepSeek-Bot)
(Bot team, group chats, memory) and the [dsh-codex-ui](https://github.com/MichengAI/dsh-codex-ui)
sidebar skin into a single DSH plugin. It fixes the visual conflicts that appear when
both are installed separately.

> Built on the shoulders of two giants: [Fei2411/DeepSeek-Bot](https://github.com/Fei2411/DeepSeek-Bot)
> and [MichengAI/dsh-codex-ui](https://github.com/MichengAI/dsh-codex-ui).

## What you get

- **DS Bot**: a team of long-lived Bots with group chats, memory, capabilities and usage tracking.
- **Codex-style sidebar**: workspace tree, search, turn navigation in a modern layout.
- **Fixed layout**: the composer, sidebar footer, account entry and conversation width
  no longer fight between the two plugins.

## What it fixes

| # | Problem (when both plugins are installed) | Fix |
|---|---|---|
| 1 | Composer control row misaligned; buttons crowd | Restored the official column structure |
| 2 | Composer internal spacing wrong | Restored the official gap and padding |
| 3 | Bottom control band too tight (buttons nearly touch) | Restored a 10px rhythm |
| 4 | Sidebar footer stacks into two rows | Forced a single flex row |
| 5 | Footer height jumps between surfaces | Locked to 60px |
| 6 | Horizontal divider inconsistent between modes | Declared on the footer itself |
| 7 | Account entry wider than the mode tabs | Single 36px icon; name label hidden |
| 8 | One-way mode switch (only in Agent mode) | Two-tab switcher (Agent / DS Bot) |
| 9 | "Connect plugins" button with a standing red "!" badge | Moved into the account menu; badge retired |
| 10 | Conversation column wider than the classic Agent surface | Removed the local width pin |

## Install

**Install from GitHub** (this package vendors ds-bot via a `file:` dependency,
which means it cannot be published to npm — GitHub is the distribution channel):

```sh
dsh plugin --profile web add github:Audrey-cn/dsh-bot-codex-ui
```

Or from a local checkout:

```sh
dsh plugin --profile web add file:/path/to/dsh-bot-codex-ui
```

**Do not install `ds-bot` or `@michengai/dsh-codex-ui` separately** — this plugin
bundles both. Installing them alongside will cause duplicate plugin entries.

## Self-check

Two seconds after mount, the plugin verifies its layout fixes in the rendered DOM:

1. Composer row wrapper exists and is a flex container (not `display:contents`).
2. Sidebar footer is a single flex row.
3. The red warning badge is hidden.
4. The mode tabs rendered.
5. The account entry is a single icon (no name label).

If any check fails, a dismissible red warning appears in the corner and a console
warning lists what went wrong. This prevents **silent failure** — the bugs returning
without any signal.

## Build

```sh
npm run build      # writes client.js
npm run check      # verifies client.js is up to date
```

## Repository layout

```
dsh-bot-codex-ui/
  package.json          dsh.bundle manifest + dependencies
  cordis.patch.yml      mounts codex-ui + ds-bot + our self-check
  index.js              host stub
  src/client/index.js   self-check client plugin
  ds-bot/               vendored ds-bot fork (with the 10 layout fixes)
  client.js             built self-check bundle
  README.md / LICENSE / NOTICE
```

## Upstream versions

| Upstream | Version | Relationship |
|---|---|---|
| ds-bot | 0.1.5 (vendored, modified) | `ds-bot/` directory |
| @michengai/dsh-codex-ui | 1.1.36 (unmodified) | npm dependency |

When ds-bot releases a new version, merge the changes into `ds-bot/` and rebuild.
The layout fixes are in `ds-bot/src/client/`; see the git log for the exact changes.


## Upstream update tracking

Both upstreams release very frequently (ds-bot roughly daily, dsh-codex-ui every
1–2 days), so this plugin can silently fall behind. Two mechanisms prevent that:

### Automated check (GitHub Actions)

A daily workflow runs [`scripts/check-upstream.mjs`](scripts/check-upstream.mjs)
and opens (or updates) a single tracking issue when either upstream has a newer
release. If the issue is no longer relevant, it is closed automatically.

### Local check

```sh
node scripts/check-upstream.mjs                # version check only
node scripts/check-upstream.mjs --test-patch   # also test the patch on new ds-bot
node scripts/check-upstream.mjs --json         # machine-readable
```

`--test-patch` clones the newest ds-bot and attempts to apply
[`ds-bot-local.patch`](ds-bot-local.patch). If the patch applies cleanly the merge
is mechanical; if not, a manual merge is needed (see the merge procedure in
`dsbot-local/SOP.md`).

### Baselines

[`base.json`](base.json) records the upstream release versions this plugin is
built from. The vendored `ds-bot/package.json` can disagree with the npm release
(upstream git tags sometimes carry a different version), so `base.json` is the
authoritative source for the version check.


## Host compatibility

| DSH host | Status |
|---|---|
| `0.2.1-rc.1` / `0.2.1-rc.2` | ✅ supported (codex-ui 1.1.42+) |
| `0.2.0-rc.1` / `0.2.0-rc.2` | ✅ supported |

`@michengai/dsh-codex-ui` gained official `0.2.1-rc.2` support in **1.1.42**. On
`0.2.1-rc.2` the Desktop's own account launcher fills the sidebar settings seat,
so this plugin styles **both** footer shapes (the skin's `.dcu-foot` and the
shell's `[class*="_footArea"]`) and hides the account name in each — the name
already lives in the menu the button opens.

Note: `@deepseek-ai/dsh-experimental-inspector` retries a WebSocket to
`ws://127.0.0.1:9230/ingest` forever when the handshake fails, flooding the
DevTools console. It is an optional debugging bundle; disable it in the profile
patch layer if the noise matters.

## License

Apache-2.0. See `LICENSE` and `NOTICE` for third-party attributions and
modification notices.

## Disclaimer

This is an independent community project. It is not affiliated with, endorsed by,
or sponsored by DeepSeek, Fei2411, or MichengAI. "DeepSeek", "DS Bot" and "Codex"
are trademarks of their respective owners.
