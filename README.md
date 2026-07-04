# Portfolio Ops

Central agent context hub — ingests signals from Central Command and produces a unified morning brief + action queue.

## Phase 1 (implemented)

```bash
npm run ingest   # reads Central Command ci-status.json + projects.js
npm run dev      # serves dashboard at http://localhost:5190
```

Requires `Central Command` as a sibling folder on Desktop (default paths in `scripts/ingest-phase1.mjs`).

## Outputs

| File | Purpose |
|------|---------|
| `data/portfolio-context.json` | Normalized events + morning brief for agent consumption |
| `SYSTEM-ARCHITECTURE.md` | Systems map, operational fronts, report catalog |

## Roadmap

- **Phase 2** — LifeOS reports API merge
- **Phase 3** — Normalized event bus (Digest Agent, Slack)
- **Phase 4** — Task routing to SiskelBot / Cursor
- **Phase 5** — Closed-loop verification

See `SYSTEM-ARCHITECTURE.md` for full architecture.
