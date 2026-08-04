#!/usr/bin/env node
/**
 * Route sweep. Screenshots every route in .claude/routes.json at both viewports and
 * both themes, and reports the defects a machine can find without a model looking:
 * horizontal overflow (with the pixel amount and the offending element), console
 * errors, uncaught page errors, and non-200 responses.
 *
 * This exists because a model enumerating twenty routes reliably reports on three.
 * A for-loop cannot decide it has done enough. Read .screens/manifest.json — never
 * drive the browser route by route yourself.
 *
 *   node scripts/shots.mjs                  full sweep
 *   node scripts/shots.mjs --fast           desktop + light only
 *   node scripts/shots.mjs --routes /a,/b   just these
 *   node scripts/shots.mjs --base http://localhost:5173
 *   node scripts/shots.mjs --fresh-images   bypass the remote-image disk cache
 *
 * Remote images are cached to node_modules/.cache/shots-images across runs.
 * Without it every shot re-downloads every image (a fresh context has an empty
 * HTTP cache), which is what made this script the largest single consumer on the
 * shared Cloudinary account. See cacheRemoteImages().
 *
 * Env: BASE_URL, PW_EXECUTABLE_PATH
 */

import { chromium } from '@playwright/test'
import { mkdir, writeFile, readFile, rm, glob } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'

const ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd()
const OUT = path.join(ROOT, '.screens')
const CONFIG = path.join(ROOT, '.claude', 'routes.json')

// Remote images are cached to disk across runs. NOT under .screens/ — that
// directory is wiped at the start of every sweep (see `rm(OUT)` below), so a
// cache inside it would be cold every single time, which is the bug this fixes.
const IMG_CACHE = path.join(ROOT, 'node_modules', '.cache', 'shots-images')

// The image CDNs worth caching. Add a host here and its bytes are fetched once
// per URL for the life of the cache instead of once per shot.
const REMOTE_IMAGE_HOSTS = /^https?:\/\/(res\.cloudinary\.com|images\.unsplash\.com|placehold\.net|placehold\.co)\//

const argv = process.argv.slice(2)
const hasFlag = (f) => argv.includes(f)
const flagValue = (f) => {
  const i = argv.indexOf(f)
  return i !== -1 && argv[i + 1] ? argv[i + 1] : null
}

const FAST = hasFlag('--fast')

const DESKTOP = { name: 'desktop', width: 1440, height: 900 }
const MOBILE = { name: 'mobile', width: 390, height: 844 }

const CANDIDATE_PORTS = [3000, 3001, 3002, 5173, 5174, 4321, 8080]

async function probeBase(explicit) {
  // Generous on an explicit/expected port, impatient when scanning: a cold Next dev
  // route compiles on first request and can take five seconds or more, and a tight
  // timeout here reports a perfectly healthy server as "nothing is serving".
  const tryUrl = async (url, ms) => {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(ms) })
      return res.ok || res.status < 500
    } catch {
      return false
    }
  }
  if (explicit) {
    if (await tryUrl(explicit, 30000)) return explicit
    fail(
      `Nothing is serving ${explicit}. Start the dev server first (npm run dev), then re-run.`
    )
  }
  // Two passes: find the listening port quickly, then give the winner time to compile.
  for (const port of CANDIDATE_PORTS) {
    const url = `http://localhost:${port}`
    if (await tryUrl(url, 3000)) return url
  }
  for (const port of CANDIDATE_PORTS) {
    const url = `http://localhost:${port}`
    if (await tryUrl(url, 30000)) return url
  }
  fail(
    `No dev server found on ports ${CANDIDATE_PORTS.join(', ')}. Start one (npm run dev), then re-run.`
  )
}

function fail(message) {
  console.error(`\n  shots: ${message}\n`)
  process.exit(1)
}

/**
 * Fallback when .claude/routes.json is missing: walk the App Router tree. Dynamic
 * segments cannot be guessed, so they are skipped and warned about loudly — a route
 * that is skipped here is a route that never gets checked.
 */
async function discoverRoutes() {
  const appDirs = ['app', 'src/app'].map((d) => path.join(ROOT, d))
  const appDir = appDirs.find((d) => existsSync(d))
  if (!appDir) return { routes: [], skipped: [] }

  const routes = []
  const skipped = []

  for await (const entry of glob('**/page.{tsx,jsx,ts,js}', { cwd: appDir })) {
    const segments = path
      .dirname(entry)
      .split(path.sep)
      .filter((s) => s !== '.' && !(s.startsWith('(') && s.endsWith(')')))

    const route = '/' + segments.join('/')
    const normalised = route === '/' ? '/' : route.replace(/\/$/, '')

    if (segments.some((s) => s.startsWith('[')))
      skipped.push(normalised)
    else routes.push(normalised)
  }

  return { routes: [...new Set(routes)].sort(), skipped: [...new Set(skipped)].sort() }
}

async function loadConfig() {
  let config = {}
  if (existsSync(CONFIG)) {
    try {
      config = JSON.parse(await readFile(CONFIG, 'utf8'))
    } catch (err) {
      fail(`.claude/routes.json is not valid JSON: ${err.message}`)
    }
  }

  let routes = config.routes ?? []
  let discovered = null

  if (!routes.length) {
    discovered = await discoverRoutes()
    routes = discovered.routes
    if (!routes.length)
      fail(
        'No routes. Create .claude/routes.json with a "routes" array, or run from a Next.js App Router project.'
      )
  }

  const override = flagValue('--routes')
  if (override) routes = override.split(',').map((r) => r.trim()).filter(Boolean)

  return {
    routes: routes.map((r) => (typeof r === 'string' ? { path: r } : r)),
    baseUrl: flagValue('--base') || process.env.BASE_URL || config.baseUrl || null,
    themes: FAST ? ['light'] : config.themes ?? ['light', 'dark'],
    viewports: FAST ? [DESKTOP] : config.viewports ?? [DESKTOP, MOBILE],
    needsConcrete: config.needsConcreteValues ?? [],
    discovered,
  }
}

const OVERFLOW_PROBE = `(() => {
  const doc = document.documentElement
  const overflow = doc.scrollWidth - doc.clientWidth
  if (overflow <= 1) return { overflow: 0, culprits: [] }

  const limit = doc.clientWidth
  const culprits = []
  for (const el of document.querySelectorAll('body *')) {
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) continue
    const spill = Math.round(Math.max(rect.right - limit, -rect.left))
    if (spill <= 1) continue
    // Only report the outermost offender in a chain — a child spilling because its
    // parent does is noise.
    if (culprits.some((c) => c.node.contains(el))) continue
    culprits.push({
      node: el,
      spill,
      selector:
        el.tagName.toLowerCase() +
        (el.id ? '#' + el.id : '') +
        (typeof el.className === 'string' && el.className
          ? '.' + el.className.trim().split(/\\s+/).slice(0, 4).join('.')
          : ''),
    })
  }
  culprits.sort((a, b) => b.spill - a.spill)
  return {
    overflow: Math.round(overflow),
    culprits: culprits.slice(0, 5).map(({ selector, spill }) => ({ selector, spill })),
  }
})()`

/**
 * Serve remote images from a disk cache instead of re-downloading them.
 *
 * Every shot gets its own browser context (below), and a fresh context has an
 * empty HTTP cache — so a 70-route sweep at two viewports and two themes was
 * pulling every image on every page 280 times over. On 2026-07-30 that put
 * 25,325 requests and 1.8 GB through the shared Cloudinary account in one day,
 * 29% of the month's bandwidth, and pushed a free-tier account to 112%.
 *
 * The bytes are real, so what you look at is unchanged; only the second and
 * later fetches of the same URL are served locally. Pass --fresh-images to
 * bypass (use it when checking that a newly uploaded asset actually resolves).
 */
const imgCacheStats = { hits: 0, misses: 0, bytesServed: 0 }

async function cacheRemoteImages(context) {
  if (hasFlag('--fresh-images')) return
  // Scoped to the image CDNs by pattern, NOT '**/*' with a resourceType check in
  // the handler. Playwright matches this natively, so the dev server's hundreds
  // of module requests are never routed through Node. Intercepting everything
  // added enough per-request latency to blow the 30s goto timeout on every shot.
  await context.route(REMOTE_IMAGE_HOSTS, async (route, request) => {
    const stem = path.join(IMG_CACHE, createHash('sha1').update(request.url()).digest('hex'))
    try {
      if (existsSync(`${stem}.bin`)) {
        const body = await readFile(`${stem}.bin`)
        imgCacheStats.hits++
        imgCacheStats.bytesServed += body.length
        return route.fulfill({
          status: 200,
          headers: JSON.parse(await readFile(`${stem}.json`, 'utf8')),
          body,
        })
      }
      imgCacheStats.misses++
      const res = await route.fetch()
      const body = await res.body()
      // Only cache successes. A 404 cached here would silently hide a broken
      // image from every later sweep, which is exactly what this script exists
      // to catch — let those fall through to the response listener each run.
      if (res.status() === 200 && body.length) {
        const ct = res.headers()['content-type']
        await writeFile(`${stem}.bin`, body)
        await writeFile(`${stem}.json`, JSON.stringify(ct ? { 'content-type': ct } : {}))
      }
      return route.fulfill({ response: res, body })
    } catch {
      // Never let a cache fault fail the shot.
      return route.continue()
    }
  })
}

async function capture(browser, { route, viewport, theme, baseUrl }) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    colorScheme: theme,
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  })
  await cacheRemoteImages(context)

  // Dark mode is driven two ways and the repos here use both. `colorScheme` above
  // covers the media-query strategy natively, from the very first paint. Tailwind's
  // class strategy needs a `dark` class on <html> — but writing it before hydration
  // makes the server and client HTML disagree, and React reports that as a hydration
  // error on every route. So the class goes on *after* load, in capture() below.
  const page = await context.newPage()

  const consoleErrors = []
  const pageErrors = []
  const badResponses = []

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 300))
  })
  page.on('pageerror', (err) => pageErrors.push(String(err.message).slice(0, 300)))
  page.on('response', (res) => {
    if (res.status() >= 400)
      badResponses.push({ status: res.status(), url: res.url().slice(0, 200) })
  })

  const slug = route.path === '/' ? 'home' : route.path.replace(/^\//, '').replace(/\//g, '-')
  const stem = `${slug}__${viewport.name}__${theme}`
  // Two shots, because one does not do both jobs. A 24,000px full-page PNG scaled to
  // fit is unreadable — you cannot judge hierarchy or contrast in it. The fold shot is
  // what you actually look at; the full one is for checking what is below it.
  const file = path.join(OUT, `${stem}.png`)
  const fullFile = path.join(OUT, `${stem}__full.png`)

  const result = {
    route: route.path,
    viewport: viewport.name,
    theme,
    screenshot: path.relative(ROOT, file),
    fullPage: path.relative(ROOT, fullFile),
    status: null,
    overflow: 0,
    culprits: [],
    consoleErrors: [],
    pageErrors: [],
    badResponses: [],
    error: null,
  }

  try {
    const response = await page.goto(`${baseUrl}${route.path}`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    })
    result.status = response?.status() ?? null

    if (route.waitFor) await page.waitForSelector(route.waitFor, { timeout: 10000 })

    // Re-assert the theme after hydration — a theme provider that reads storage on
    // mount will have overwritten whatever the init script set.
    await page.evaluate((mode) => {
      document.documentElement.classList.toggle('dark', mode === 'dark')
      document.documentElement.style.colorScheme = mode
    }, theme)

    // Let fonts and lazy images settle so the shot is not of a half-painted page.
    await page.evaluate(() => document.fonts?.ready)
    await page.waitForTimeout(250)

    const probe = await page.evaluate(OVERFLOW_PROBE)
    result.overflow = probe.overflow
    result.culprits = probe.culprits

    await page.screenshot({ path: file })
    await page.screenshot({ path: fullFile, fullPage: true })
  } catch (err) {
    result.error = String(err.message).split('\n')[0].slice(0, 300)
  }

  result.consoleErrors = consoleErrors.slice(0, 10)
  result.pageErrors = pageErrors.slice(0, 10)
  result.badResponses = badResponses.slice(0, 10)

  await context.close()
  return result
}

function isClean(shot) {
  return (
    !shot.error &&
    shot.overflow === 0 &&
    !shot.consoleErrors.length &&
    !shot.pageErrors.length &&
    !shot.badResponses.length &&
    (shot.status === null || shot.status < 400)
  )
}

function contactSheet(shots, meta) {
  const cards = shots
    .map((s) => {
      const problems = [
        s.error && `error: ${s.error}`,
        s.status >= 400 && `HTTP ${s.status}`,
        s.overflow > 0 &&
          `overflow ${s.overflow}px — ${s.culprits.map((c) => `${c.selector} (+${c.spill}px)`).join(', ')}`,
        s.consoleErrors.length && `${s.consoleErrors.length} console error(s)`,
        s.pageErrors.length && `${s.pageErrors.length} page error(s)`,
        s.badResponses.length && `${s.badResponses.length} failed request(s)`,
      ].filter(Boolean)

      return `<figure class="${problems.length ? 'bad' : 'ok'}">
  <a href="${path.basename(s.fullPage)}"><img src="${path.basename(s.screenshot)}" loading="lazy" alt="${s.route} ${s.viewport} ${s.theme}"></a>
  <figcaption>
    <strong>${s.route}</strong> <span>${s.viewport} · ${s.theme} · <a href="${path.basename(s.fullPage)}">full page</a></span>
    ${problems.length ? `<ul>${problems.map((p) => `<li>${p}</li>`).join('')}</ul>` : '<p class="clean">clean</p>'}
  </figcaption>
</figure>`
    })
    .join('\n')

  return `<meta charset="utf-8"><title>Route sweep — ${meta.total} shots</title>
<style>
  :root { color-scheme: light dark; font-family: ui-sans-serif, system-ui, sans-serif; }
  body { margin: 0; padding: 24px; background: Canvas; color: CanvasText; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .meta { opacity: .7; font-size: 13px; margin-bottom: 24px; }
  .grid { display: grid; gap: 24px; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); }
  figure { margin: 0; border: 1px solid color-mix(in srgb, CanvasText 20%, transparent); border-radius: 8px; overflow: hidden; }
  figure.bad { border-color: #d33; }
  img { display: block; width: 100%; height: auto; max-height: 520px; object-fit: cover; object-position: top; background: #8881; }
  figcaption { padding: 10px 12px; font-size: 13px; border-top: 1px solid color-mix(in srgb, CanvasText 15%, transparent); }
  figcaption span { opacity: .6; }
  ul { margin: 6px 0 0; padding-left: 16px; color: #d33; }
  .clean { margin: 6px 0 0; opacity: .5; }
</style>
<h1>Route sweep — ${meta.clean}/${meta.total} clean</h1>
<div class="meta">${meta.baseUrl} · ${meta.routes} routes · ${meta.elapsed}s</div>
<div class="grid">
${cards}
</div>`
}

const config = await loadConfig()
const baseUrl = await probeBase(config.baseUrl)

if (config.needsConcrete.length) {
  console.warn(
    `  shots: ${config.needsConcrete.length} dynamic route(s) in .claude/routes.json still have no concrete value, so they are NOT being checked. Replace the placeholder with a real slug or id and move it into "routes":`
  )
  for (const r of config.needsConcrete) console.warn(`         ${r}`)
  console.warn('')
}

if (config.discovered) {
  console.warn(
    `  shots: no .claude/routes.json — discovered ${config.discovered.routes.length} routes from the App Router tree.`
  )
  if (config.discovered.skipped.length) {
    console.warn(
      `  shots: SKIPPED ${config.discovered.skipped.length} dynamic route(s), they will never be checked until you add concrete values to .claude/routes.json:`
    )
    for (const r of config.discovered.skipped) console.warn(`         ${r}`)
  }
}

await rm(OUT, { recursive: true, force: true })
await mkdir(OUT, { recursive: true })
await mkdir(IMG_CACHE, { recursive: true })

const started = Date.now()
const browser = await chromium.launch({
  executablePath: process.env.PW_EXECUTABLE_PATH || undefined,
})

const jobs = []
for (const route of config.routes)
  for (const viewport of config.viewports)
    for (const theme of config.themes) jobs.push({ route, viewport, theme, baseUrl })

// Raising this past ~6 buys almost nothing: the bottleneck is the dev server rendering,
// not the browser. Measured on a 10-route Next repo: 4 → 93s, 8 → 88s, 12 → 89s.
const CONCURRENCY = Number(process.env.SHOTS_CONCURRENCY || 6)
const shots = new Array(jobs.length)
let next = 0

await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, async () => {
    while (next < jobs.length) {
      const i = next++
      shots[i] = await capture(browser, jobs[i])
      process.stdout.write('.')
    }
  })
)

await browser.close()
process.stdout.write('\n')

const elapsed = ((Date.now() - started) / 1000).toFixed(1)
const problems = shots.filter((s) => !isClean(s))

const manifest = {
  baseUrl,
  generatedIn: `${elapsed}s`,
  routes: config.routes.length,
  viewports: config.viewports.map((v) => v.name),
  themes: config.themes,
  total: shots.length,
  clean: shots.length - problems.length,
  problems: problems.length,
  contactSheet: '.screens/index.html',
  notChecked: [...(config.discovered?.skipped ?? []), ...config.needsConcrete],
  shots,
}

await writeFile(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2))
await writeFile(
  path.join(OUT, 'index.html'),
  contactSheet(shots, {
    total: shots.length,
    clean: shots.length - problems.length,
    routes: config.routes.length,
    baseUrl,
    elapsed,
  })
)

console.log(
  `\n  ${shots.length} shots · ${config.routes.length} routes · ${elapsed}s · ${shots.length - problems.length}/${shots.length} clean`
)

{
  const { hits, misses, bytesServed } = imgCacheStats
  if (hits || misses) {
    const mb = (bytesServed / 1e6).toFixed(1)
    console.log(
      `  images: ${hits} from cache (${mb} MB not re-downloaded) · ${misses} fetched` +
        (misses ? '' : ' · nothing hit the CDN')
    )
  } else if (hasFlag('--fresh-images')) {
    console.log('  images: cache bypassed (--fresh-images) — every image re-downloaded')
  }
}

for (const s of problems) {
  const why = [
    s.error,
    s.status >= 400 && `HTTP ${s.status}`,
    s.overflow > 0 &&
      `overflow ${s.overflow}px (${s.culprits.map((c) => `${c.selector} +${c.spill}px`).join(', ')})`,
    s.consoleErrors.length && `console: ${s.consoleErrors[0]}`,
    s.pageErrors.length && `pageerror: ${s.pageErrors[0]}`,
    s.badResponses.length && `${s.badResponses[0].status} ${s.badResponses[0].url}`,
  ]
    .filter(Boolean)
    .join(' · ')
  console.log(`  ✗ ${s.route} [${s.viewport}/${s.theme}] ${why}`)
}

console.log(`\n  .screens/manifest.json · .screens/index.html\n`)
process.exit(problems.length ? 1 : 0)
