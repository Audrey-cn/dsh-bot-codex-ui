// dsh-bot-codex-ui: host stub.
//
// The real plugins are mounted separately via cordis.patch.yml (ds-bot and
// dsh-codex-ui). This entry exists to satisfy the Cordis loader for the bundle
// manifest and to carry the self-check client plugin.

export const name = 'dsh-bot-codex-ui'
export const inject = []

export function apply() {}
