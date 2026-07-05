#!/usr/bin/env node
/**
 * Portfolio context ingestion — Phase 1 (CI + deploy) with Phase 2 LifeOS hook.
 * Local: reads sibling Central Command folder on Desktop.
 * CI/Vercel: set CC_CI_URL / CC_PROJECTS_URL or uses GitHub raw defaults.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir = dirname(fileURLToPath(import.meta.url))
const root = join(__dir, '..')
const desktop = join(root, '..')
const CC = join(desktop, 'Central Command')
const outPath = join(root, 'public', 'data', 'portfolio-context.json')

const DEFAULT_CI_URL =
  'https://raw.githubusercontent.com/hondoentertainment/central-command/master/data/ci-status.json'
const DEFAULT_PROJECTS_URL =
  'https://raw.githubusercontent.com/hondoentertainment/central-command/master/data/projects.js'

async function loadText(sourcePath, urlEnv, defaultUrl) {
  if (sourcePath && existsSync(sourcePath)) {
    return readFileSync(sourcePath, 'utf-8')
  }
  const url = process.env[urlEnv] ?? defaultUrl
  if (!url) return null
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  return res.text()
}

async function loadCi() {
  const local = join(CC, 'data', 'ci-status.json')
  const text = await loadText(local, 'CC_CI_URL', DEFAULT_CI_URL)
  return text ? JSON.parse(text) : null
}

async function loadDeployProjects() {
  const local = join(CC, 'data', 'projects.js')
  const raw = await loadText(local, 'CC_PROJECTS_URL', DEFAULT_PROJECTS_URL)
  if (!raw) return []
  const match = raw.match(/export const DEPLOY_PROJECTS = (\[[\s\S]*?\]);/)
  if (!match) return []
  // eslint-disable-next-line no-eval
  return eval(match[1])
}

async function loadLifeSignals() {
  const api = process.env.LIFEOS_API_URL
  if (!api) {
    return {
      connected: false,
      items: ['LifeOS API not configured — set LIFEOS_API_URL for Phase 2'],
      events: [],
    }
  }
  try {
    const res = await fetch(api, {
      headers: process.env.LIFEOS_API_TOKEN
        ? { Authorization: `Bearer ${process.env.LIFEOS_API_TOKEN}` }
        : {},
    })
    if (!res.ok) throw new Error(String(res.status))
    const data = await res.json()
    const openCount = data.openItemCount ?? data.openItems?.length ?? 0
    const events =
      openCount > 0
        ? [
            {
              id: 'evt_life_open_items',
              source: 'lifeos',
              domain: 'life-ops',
              severity: openCount >= 5 ? 'medium' : 'low',
              title: `${openCount} open LifeOS items`,
              entity: { type: 'user', id: 'primary' },
              generatedAt: new Date().toISOString(),
            },
          ]
        : []
    return {
      connected: true,
      items: data.summary ? [data.summary] : [`${openCount} open items`],
      events,
    }
  } catch {
    return {
      connected: false,
      items: ['LifeOS API unreachable'],
      events: [],
    }
  }
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

function buildBrief(events, life) {
  const engineering = events.filter((e) =>
    ['ci-health', 'deploy-release'].includes(e.domain),
  )
  return {
    generatedAt: new Date().toISOString(),
    sections: {
      engineering: engineering.slice(0, 5).map((e) => e.title),
      life: life.items.slice(0, 3),
      business: ['CrowdPass / pulse KPIs — Phase 2 instrumentation pending'],
    },
    topActions: [...events, ...life.events].slice(0, 5).map((e) => ({
      title: e.title,
      severity: e.severity,
      domain: e.domain,
    })),
  }
}

const ci = await loadCi()
const projects = await loadDeployProjects()
const life = await loadLifeSignals()
const baseEvents = normalizeEvents(ci, projects)
const events = [...baseEvents, ...life.events].sort(
  (a, b) =>
    { const o = { critical: 0, high: 1, medium: 2, low: 3 }; return o[a.severity] - o[b.severity] },
)

const context = {
  version: 1,
  phase: life.connected ? 2 : 1,
  generatedAt: new Date().toISOString(),
  sources: {
    ciStatus: process.env.CC_CI_URL ?? (existsSync(join(CC, 'data', 'ci-status.json')) ? 'local' : DEFAULT_CI_URL),
    deployRegistry: process.env.CC_PROJECTS_URL ?? DEFAULT_PROJECTS_URL,
    lifeos: life.connected ? process.env.LIFEOS_API_URL : null,
  },
  summary: {
    ciIssueCount: ci?.summary?.issueCount ?? null,
    deployProjectCount: projects.length,
    openEvents: events.length,
  },
  morningBrief: buildBrief(baseEvents, life),
  events,
}

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, JSON.stringify(context, null, 2))
console.log(`Wrote ${events.length} events to ${outPath}`)
