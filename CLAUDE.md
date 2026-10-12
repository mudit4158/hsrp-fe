@AGENTS.md

## Claude Code

- After any change, and before every commit, follow the **maintain-docs** skill (`.claude/skills/maintain-docs/SKILL.md`)
  so README.md, AGENTS.md, docs/TRACKER.md (and the backend's decision log and tracker when relevant) stay current.
- Never edit `src/contracts`; run `pnpm contracts:sync` after a contract change in hsrp-dms-be.
- The pre-commit hook runs `pnpm docs:check`; fix what it reports instead of bypassing it.
- Never push or create a remote without the user's explicit confirmation.
