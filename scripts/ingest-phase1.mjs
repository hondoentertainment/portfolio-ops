#!/usr/bin/env node
/**
 * Phase 1 ingestion: merge Central Command CI snapshot + deploy registry
 * into a canonical portfolio-context.json for the central agent.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir = dirname(fileURLToPath(import.meta.url))
const root = join(__dir, '..')
const desktop = join(root, '..')

const CC = join(desktop, 'Central Command')
const ciPath = join(CC, 'data', 'ci-status.json')
const projectsPath = join(CC, 'data', 'projects.js')
const outPath = join(root, 'public', 'data', 'portfolio-context.json')

function loadCi() {
  if (!existsSync(ciPath)) return null
  return JSON.parse(readFileSync(ciPath, 'utf-8'))
}

function loadDeployProjects() {
  if (!existsSync(projectsPath)) return []
  const raw = readFileSync(projectsPath, 'utf-8')
  const match = raw.match(/export const DEPLOY_PROJECTS = (\[[\s\S]*?\]);/)
  if (!match) return []
  // eslint-disable-next-line no-eval
  return eval(match[1])
}

function normalizeEvents(ci, projects) {
  const events = []
  const now = new Date().toISOString()

  if (ci?.repos) {
    for (const repo of ci.repos) {
      if (repo.status === 'healthy') continue
      const severity =
        repo.status === 'security' ? 'critical' : repo.codeFailure ? 'high' : 'medium'
      events.push({
        id: `evt_ci_${repo.repo}`,
        source: 'central-command',
        domain: 'ci-health',
        severity,
        title: `${repo.repo}: ${repo.status ?? 'CI issue'}`,
        entity: { type: 'repo', id: `hondoentertainment/${repo.repo}` },
        links: repo.latestRun?.url ? { github: repo.latestRun.url } : undefined,
        generatedAt: ci.generatedAt ?? now,
      })
    }
  }

  for (const p of projects) {
    if (!p.productionUrl) {
      events.push({
        id: `evt_deploy_${p.id}`,
        source: 'central-command',
        domain: 'deploy-release',
        severity: 'medium',
        title: `${p.name} has no production URL`,
        entity: { type: 'app', id: p.id },
        links: p.github ? { github: p.github } : undefined,
        generatedAt: now,
      })
    }
  }

  const order = { critical: 0, high: 1, medium: 2, low: 3 }
  events.sort((a, b) => order[a.severity] - order[b.severity])

  return events
}

function buildBrief(events) {
  const engineering = events.filter((e) =>
    ['ci-health', 'deploy-release'].includes(e.domain),
  )
  return {
    generatedAt: new Date().toISOString(),
    sections: {
      engineering: engineering.slice(0, 5).map((e) => e.title),
      life: ['Connect LifeOS reports API (Phase 2)'],
      business: ['Connect CrowdPass / pulse KPIs (Phase 2)'],
    },
    topActions: events.slice(0, 5).map((e) => ({
      title: e.title,
      severity: e.severity,
      domain: e.domain,
    })),
  }
}

const ci = loadCi()
const projects = loadDeployProjects()
const events = normalizeEvents(ci, projects)

const context = {
  version: 1,
  phase: 1,
  generatedAt: new Date().toISOString(),
  sources: {
    ciStatus: existsSync(ciPath) ? ciPath : null,
    deployRegistry: existsSync(projectsPath) ? projectsPath : null,
  },
  summary: {
    ciIssueCount: ci?.summary?.issueCount ?? null,
    deployProjectCount: projects.length,
    openEvents: events.length,
  },
  morningBrief: buildBrief(events),
  events,
}

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, JSON.stringify(context, null, 2))
console.log(`Wrote ${events.length} events to ${outPath}`)
