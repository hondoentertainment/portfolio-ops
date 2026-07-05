# Portfolio Ops

Central agent context hub — ingests signals from Central Command and produces a unified morning brief + action queue.

**Production:** [portfolio-ops.vercel.app](https://portfolio-ops.vercel.app) *(after deploy)*  
**Repository:** [github.com/hondoentertainment/portfolio-ops](https://github.com/hondoentertainment/portfolio-ops)

## Quick start

```bash
npm run ingest   # CI snapshot + deploy registry → public/data/portfolio-context.json
npm run dev      # dashboard at http://localhost:5190
```

Remote ingestion uses GitHub raw URLs from `central-command` when local files are unavailable (Vercel build, GitHub Actions).

## Phase status

| Phase | Status |
|-------|--------|
| **1** — CI + deploy registry | ✅ Implemented |
| **2** — LifeOS API merge | 🔌 Set `LIFEOS_API_URL` (+ optional `LIFEOS_API_TOKEN`) |
| **3** — Event bus (Digest, Slack) | Planned |
| **4** — Task routing (SiskelBot, Cursor) | Planned |
| **5** — Closed-loop verification | Planned |

## Automation

- **GitHub Action** — daily ingest at 12:00 UTC, commits refreshed `portfolio-context.json`
- **Vercel** — builds run ingest before deploy

See `SYSTEM-ARCHITECTURE.md` for full architecture.
