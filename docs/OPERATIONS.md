# Operations

Run book for building, checking, deploying and changing the site. Commands are run from the repo root.

## 1. Setup

```bash
node --version          # 22 or newer (Vercel runs 22; development used 24)
npm ci
npx playwright install chromium-headless-shell   # once, for qa-runtime
```

`scripts` invoke Next as `node node_modules/next/dist/bin/next` to avoid a `.bin` shim problem seen on Node 25; the form also works on Vercel.

## 2. Commands

| Command | Does |
|---|---|
| `npm run dev` | Dev server on port 3000 |
| `npm run build` / `npm start` | Production build and server. Build lists `/robots.txt` and `/sitemap.xml` |
| `npm test` | Vitest: URL contract (`routes.test.mjs`, 7), docx classifier (`decompose.test.mjs`, 33), cleaners (`clean.test.mjs`, 36) |
| `npm run lint` | ESLint. One known warning in `scripts/lib/decompose.mjs` |
| `npx tsc --noEmit` | Type check of the shell |
| `npm run prototype:sync` | design to public |
| `npm run qa:prototype` / `npm run qa:deployed` | Static gate on `design/prototype` / on `public/prototype` (the one that counts) |
| `npm run qa:runtime` | Loads every route in Chromium; fails on console errors, page errors, 404 sub-requests, empty containers. Needs a server, or `QA_BASE=<origin>` |
| `npm run concepts` | Static server for `design/` on port 4321 (early concepts) |
| `node scripts/nav-rebuild.mjs [--check]` | Regenerate the navigation in every page |
| `node scripts/canonical-rebuild.mjs [--check]` | Write canonical tags from the route map |

Port 3000 is the default for several sibling ArcTrips repos; whichever starts first wins silently. Confirm what answers before sweeping: `curl -s localhost:3000/ | head -c 200`.

## 3. The change loop

```bash
# 1 edit design/prototype/<page>.html
node scripts/nav-rebuild.mjs                    # only if nav changed
node scripts/sync-prototype.mjs
node scripts/qa-prototype.mjs public/prototype  # clean: N pages, every link, anchor and image valid
npm test && npm run build
(npm start &) ; sleep 5 ; QA_BASE=http://127.0.0.1:3000 node scripts/qa-runtime.mjs   # 0 of 47 pages with errors
```

"Done" is: pushed and checked on the Vercel URL, not green on localhost.

## 4. Deploy

There is no CI. Vercel auto-deploys the connected GitHub repo on push. Pushing `main` deploys production.

Recommended flow until CI exists:

1. Branch, commit, push, open a PR. Vercel builds a **preview** for the PR.
2. Run the loop in section 3 locally; run `QA_BASE=<preview-url> node scripts/qa-runtime.mjs` against the preview.
3. Spot check the preview: `/robots.txt`, `/sitemap.xml`, one page's canonical, `/destinations/canada/bc/tofino/` to `/destinations/canada/bc/tofino` (308), `/prototype/hiking-tofino.html` to `/destinations/canada/bc/tofino/things-to-do/hiking` (308).
4. Merge only when the above is green.

Vercel Deployment Protection must stay on "Preview deployments only". Setting "All deployments" puts a login in front of production and any webhook. After touching it, `curl -sI https://<production>/` and confirm it is not a 302 to `sso-api`.

Rollback: Vercel dashboard, Deployments, previous deployment, "Promote to production" (or the Vercel MCP `request_rollback`). No migrations are involved, so rollback is safe.

Commit author is the owner (`Aditya Parmar`); no `Co-Authored-By` trailers.

## 5. Recipes

### Add a page
1. Write `design/prototype/<file>.html`. Assets are root-absolute `/prototype/...`; links are clean routes, never `.html`.
2. Add one line to `ROUTES` in `scripts/lib/routes.mjs`.
3. `node scripts/nav-rebuild.mjs`, `node scripts/canonical-rebuild.mjs`, then the loop. `routes.test.mjs` fails if the page is unrouted or lacks its canonical.
4. Regenerate `.claude/routes.json` from `Object.values(ROUTES)`.

### Change a URL
Edit `ROUTES`. Old URLs are not redirected (the PRD forbids redirects; decision D-18). After production launch this needs revisiting, because moving a live URL loses its search ranking. `next.config.ts` redirects only `/prototype/<file>.html` to the route. Re-run canonicals and the loop. Read [routing.md](routing.md) first, especially "Production URL target".

### Cut over to a production domain
1. Add the domain in Vercel, wait for it to verify.
2. Set `SITE_ORIGIN` in `scripts/lib/routes.mjs`.
3. `node scripts/canonical-rebuild.mjs && node scripts/sync-prototype.mjs`; `npm test`.
4. Deploy; confirm `/robots.txt` names the new sitemap and a page canonical shows the new origin.
5. Submit `/sitemap.xml` in Search Console. Keep the old domain redirecting.

### Add an image
Cloudinary: follow [MEDIA.md](MEDIA.md) section 2 and check the ID resolves. Local: add to `design/prototype/media/<town>/` and an optimised copy to `public/prototype/media/<town>/`.

### Add a town from the `.docx` corpus
Read the document's real H2 list (`node scripts/analyze-corpus.mjs`), set `placeHeadings` from what you read, then classify with `decompose.mjs`. There is no page generator; the page is written by hand ([ARCHITECTURE.md](ARCHITECTURE.md) section 6).

## 6. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| A page loads unstyled at a two-segment URL | A relative asset path | Make it `/prototype/...` |
| Page works locally, 404s in production | `design/` and `public/` drifted | `sync-prototype.mjs`, then `qa:deployed` |
| `qa-runtime` says browser executable missing | Playwright browsers not installed | `npx playwright install chromium-headless-shell` |
| `qa-runtime` shows another app's pages | Port 3000 taken by a sibling repo | Use `-p 3100` and `QA_BASE` |
| Edited a JSON file, site unchanged | Pages inline their data | Edit the page's inline blob; see [DATA-SCHEMA.md](DATA-SCHEMA.md) section 0 |
| An image is blank | Cloudinary ID deleted | `curl -sI` it; re-upload or pick another |
| `routes.test.mjs` fails on a canonical | Route map or origin changed | `node scripts/canonical-rebuild.mjs` then sync |
| Build error `no exported member` from routes | `routes.d.mts` out of step with `routes.mjs` | Add the export to the `.d.mts` |

## 7. Monitoring

None configured: no analytics, no error tracking, no uptime check. Vercel runtime logs exist but the site has no server code to log. Recommended first additions: an uptime check on `/` and `/sitemap.xml`, and a scheduled `qa-runtime.mjs` run against production.
