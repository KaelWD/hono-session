import globals from 'globals'
import neostandard, { resolveIgnoresFromGitignore } from 'neostandard'

export default neostandard({
  ts: true,
  ignores: resolveIgnoresFromGitignore(),
  globals: {
    ...globals.nodeBuiltin,
    ...globals.es2024,
  },
})
