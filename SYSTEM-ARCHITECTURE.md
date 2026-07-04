# Portfolio System Architecture

Central reference for systems, operational fronts, and reports feeding the **Central Agent**.

## Tier 0 — Orchestration

| System | Role |
|--------|------|
| **Central Agent** | Cross-domain triage, briefing, routing |
| **Central Command** | Ops hub: deploys, CI, runbook, tool registry |
| **SiskelBot** | AI execution: tools, RAG, workflows |
| **GitHub Digest Agent** | Org telemetry: CI, security, PRs |
| **LifeOS** | Daily Pulse, reviews, open items |

## Operational Fronts

| Front | Goal |
|-------|------|
| A — Deploy & Release | Production URLs reachable |
| B — CI Health | Fix workflows, security, budget blocks |
| C — Build & Ship | Idea → repo → Vercel → registry |
| D — AI Operations | Agent routing and audit |
| E — Life Execution | Daily pulse and reviews |
| F — Business & Revenue | CrowdPass, pulse, pilots |
| G — Comms | Slack/email triage |
| H — Creative | Content production |

## Unified Reports (Central Agent)

- **Morning Unified Brief** — top actions across domains (daily AM)
- **Evening Close-Out** — done vs carrying over (daily PM)
- **Weekly Portfolio Status** — health per domain
- **Action Queue Export** — prioritized events (continuous)

## Phase Roadmap

| Phase | Deliverable |
|-------|-------------|
| 1 | Digest + CI snapshot + deploy registry → `portfolio-context.json` |
| 2 | LifeOS reports merge |
| 3 | Normalized event bus |
| 4 | Task routing to SiskelBot / Cursor |
| 5 | Closed-loop verification |

## Source Files

- `Central Command/data/ci-status.json`
- `Central Command/data/projects.js`
- `Central Command/data/ci-tracked-repos.json`

Run `npm run ingest` in this repo to materialize current context.
