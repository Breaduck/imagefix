## Workflow Requirements (MUST FOLLOW)

### Git: Always push to `main` (STRICT)
After completing a task, ALWAYS do the following in order:

1) Verify changes
- `npm run build` MUST pass
- `npm run lint` if available (recommended)
- Minimal smoke check if applicable (e.g., open localhost and confirm no obvious runtime error)

2) Commit (small & revertable)
- Keep commits small and focused (one logical change per commit)
- Commit message format:
  - `feat:` new feature
  - `fix:` bug fix
  - `refactor:` refactor without behavior change
  - `docs:` documentation only

3) Push
- Always push to: `origin main`
- Repo: https://github.com/Breaduck/imagefix
- 업데이트되는 모든 내용을 깃에 자동 PUSH해해

#### Hard rules
- NEVER push if `npm run build` fails.
- NEVER commit secrets or sensitive data:
  - `.env*`, API keys/tokens, user PDFs/images, generated outputs
- NO force-push to `main`.

#### If something is ambiguous or a safer/better alternative exists
- STOP and ask a short question before proceeding/committing.
Examples:
- Is server-side processing allowed? (privacy)
- Is external AI API allowed? (data leaves the machine)
- Export target: PNG/JPG only or PDF regeneration required?
- Should we optimize for speed or fidelity?

---

### Token minimization rules (STRICT)
- Before reading any files:
  - Run `git diff --name-only` and ONLY open files directly relevant to the task.
  - Prefer `rg` (ripgrep) search over opening large files.
  - Do NOT read multiple files "just in case".
- When uncertain:
  - Ask a short clarification question instead of reading more files.
- Keep changes surgical:
  - Touch the fewest files possible.
  - Avoid large refactors unless explicitly requested.

#### Efficiency checklist (CRITICAL)
1. **Ask first, explore later**
   - Multiple project folders? → Ask which one
   - Unclear requirements? → Ask before reading files
   - Better alternatives exist? → Propose them upfront
2. **Target directly**
   - Use specific file paths when mentioned in task
   - Avoid broad Glob patterns that include node_modules
   - Read only files you'll actually modify
3. **Proactive suggestions**
   - If you see a better approach → suggest it
   - If requirements seem unclear → ask clarifying questions
   - If trade-offs exist → present options before implementing

---

### Recommended repo setting (optional but strongly suggested)
Enable GitHub branch protection on `main`:
- Require status checks (build/lint) to pass
- Disallow force-push
This keeps `main` always deployable even with direct pushes.
