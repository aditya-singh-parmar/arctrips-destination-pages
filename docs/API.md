# API

## Current state: no runtime API

The deployed site has **no API**. No route handlers exist (`app/api/` is absent), no page calls `fetch`, and the only endpoints that respond are static files and `GET /search?q=` (which is a page that searches in the browser, not a service). This was verified by scanning all 47 pages and the repo.

Everything below is a **proposed contract** for the backend to build. It is derived from what the pages need today ([FEATURES.md](FEATURES.md)) and the data they hold ([DATA-SCHEMA.md](DATA-SCHEMA.md)). Machine-readable form: [api/openapi.yaml](api/openapi.yaml).

Business rules for stays (fees, deposits, cancellation, availability) are not defined here and not implemented anywhere in this repo. They live in the PRDs in Confluence space `ADS`. Do not implement them from this document.

## 1. Conventions

| Topic | Rule |
|---|---|
| Base | `/api/v1` on the same origin as the site. Next.js route handlers are the lowest-friction host ([ARCHITECTURE.md](ARCHITECTURE.md) section 7, option A) |
| Format | JSON, UTF-8. `Content-Type: application/json` |
| Validation | One zod schema per request, shared by the browser form and the server |
| Errors | `{ "error": { "code": "validation_failed", "message": "...", "fields": { "email": "Enter a valid email address" } } }`. `fields` only on 400 |
| Status codes | 200 read, 201 created, 202 accepted (async), 204 no content, 400 validation, 401 unauthenticated, 403 forbidden, 404, 409 conflict, 422 semantic, 429 rate limited, 5xx |
| Pagination | Cursor: `?limit=50&cursor=...` returns `{ "data": [...], "page": { "next": "cursor-or-null" } }`. Default 50, max 200 |
| Caching | Public GETs: `Cache-Control: public, s-maxage=300, stale-while-revalidate=3600`. Admin and subscriptions: `no-store` |
| IDs | Content addressed by slug (stable, URL-shaped). Everything else by UUID |
| Dates | ISO 8601 UTC |
| Language | `en-CA` only |

## 2. Authentication and roles

| Role | Can |
|---|---|
| Anonymous | Read published content, create a subscription, confirm, unsubscribe |
| `editor` | Create and edit content and media; cannot publish or manage routes |
| `admin` | Everything, including publish, routes and redirects, subscription export |

Admin endpoints require `Authorization: Bearer <Supabase Auth JWT>` with a `role` claim. Public endpoints need no credential. The Cloudinary secret and the Supabase service-role key exist only on the server.

## 3. Subscriptions (backs the three prototype forms)

Topics, seeded from the copy on the pages today:

| `topic` | Page that uses it | Consent text on the page |
|---|---|---|
| `seasonal-letter` | `/` | "Yes, send me the seasonal letter. You can unsubscribe from any email, and we never pass your address on." |
| `whale-watching-tofino` | `/tofino/whale-watching`, `/tofino/guides` | "Yes, tell me when whale watching opens in Tofino. You can unsubscribe from any email, and we never pass your address on." |

The two whale watching forms carry different wording and different success copy today. Treat them as one topic and unify the copy, or add `whale-watching-boats` as a third topic (Assumption: one topic; owner to confirm).

### `POST /api/v1/subscriptions`

```json
{
  "email": "you@example.com",
  "topic": "whale-watching-tofino",
  "consent": true,
  "source_path": "/tofino/whale-watching",
  "website": ""
}
```

| Field | Rule |
|---|---|
| `email` | required, valid address, max 254 chars, lowercased and trimmed |
| `topic` | required, an active `subscription_topics.key` |
| `consent` | required and `true`. **The checkbox on the pages is not `required` today; the form must block until it is ticked** |
| `source_path` | optional, must be one of the site's routes |
| `website` | honeypot, must be empty; if filled, return the normal 202 and store nothing |

Response `202`:

```json
{ "status": "pending" }
```

The response is identical whether the address is new, already pending, already confirmed or previously unsubscribed, so the endpoint cannot be used to discover who is subscribed. A confirmation email carries a single-use token. Re-posting a pending address resends at most once per 10 minutes.

| Case | Result |
|---|---|
| Invalid email or `consent` false | `400 validation_failed` with `fields` |
| Unknown or inactive `topic` | `422 unknown_topic` |
| More than 5 requests per hour per IP, or 3 per hour per email | `429 rate_limited` with `Retry-After` |

### `GET /api/v1/subscriptions/confirm?token=...`

Marks the subscription `confirmed`. Responds `303` to `{source_path}?confirmed=1` (or `/` if unknown). An invalid or expired token (24 hours) responds `303` to `/?confirm=expired`. The static pages do not read these parameters yet; add a one-line notice.

### `POST /api/v1/subscriptions/unsubscribe`

```json
{ "token": "..." }
```

`200 { "status": "unsubscribed" }`. Each email must also carry `List-Unsubscribe` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click`. Unsubscribing is idempotent and requires no login.

### Front-end change

In `index.html`, `whale-watching.html`, `guide.html` the submit handler currently shows the confirmation state only (the prototype stub). Wire it to the API as follows: disable the button and show "Sending" while the request runs; on `202` show "Check your inbox to confirm" (not "you are on the list", because confirmation is pending); on `400` show the field message next to the input; on `429` or a network failure show a retry message and keep the form. Keep the existing rule: confirm by replacing the form, never by greying a control out.

## 4. Public content (read)

All `GET`, all return only `status = 'published'`.

| Endpoint | Returns |
|---|---|
| `/destinations` | towns, with `province_code`, `region_slug`, `stays_count` |
| `/destinations/{slug}` | one town with `overview`, `hero`, its guides and subject list |
| `/guides?town=&subject=` | guides, with `photos` |
| `/places?town=&subject=&q=&limit=&cursor=` | places, ordered by `position` |
| `/places/{town}/{subject}/{slug}` | one place with `body`, `good_for`, `note`, photos |
| `/articles?town=&subject=` and `/articles/{slug}` | articles, with `faqs` |
| `/seasons/{subject}` | months in season for a subject (`subject_months`) |
| `/climate/{town}` | 12 monthly normals plus `verified` and `source`. **Do not serve while `verified` is false** |
| `/routes` | every published path with `entity_type`, `noindex`; the data behind the sitemap |

### `GET /api/v1/search`

Mirror of the browser search so a server index can replace the 170 KB blob.

| Param | Meaning |
|---|---|
| `q` | text; empty returns the two live towns |
| `in` | town slug scope |
| `show` | `all`, `destinations`, `guides`, `places`, `articles`, `questions` |
| `limit` | per type, defaults 4, 6, 8, 6, 6 |

Type weights to reproduce ranking: towns 18, guides 14, places 5, articles 6, questions 2. Each hit: `{ type, name, kicker, body, href, hero, cities, cat }`. `href` must follow the resolution invariant: a place resolves to the subject page that owns it, never by name; an article with no page resolves to a search scoped to its town.

## 5. Stays

`GET /api/v1/stays?town=tofino&limit=12` returns the read model (`stay_summaries`): `id`, `slug`, `title`, `town`, `hero`, `price_cents`, `currency`, `rooms`, `beds`, `baths`, `rating`, `url`. It is a cache of the Arc Trips stays product, not a source of truth. It replaces the 12 sample listings and the hardcoded 134 and 158. Until real stay pages exist, `url` is empty and the pages keep linking to `/not-found`.

## 6. Admin

All require a role. All writes append to `audit_log`.

| Endpoint | Role | Purpose |
|---|---|---|
| `GET/POST /admin/{towns,guides,places,articles,faqs}` | editor | list, create |
| `GET/PUT/DELETE /admin/{type}/{id}` | editor (delete: admin) | read, replace, delete. Writes create or update a `draft` |
| `POST /admin/{type}/{id}/publish` | admin | `draft` to `published`. Refuses if a media `alt` is missing, if a slug would change a published URL without a redirect, or if `climate` is unverified. Triggers the Vercel deploy hook when pages are generated at build time |
| `POST /admin/media/signature` | editor | Returns Cloudinary signed-upload parameters. Body `{ town, subject, place_slug? }`. The server builds `public_id` (`guides/<town>/<subject>/<slug>-<N>`) |
| `POST /admin/media` | editor | Registers an uploaded asset: `{ public_id, alt, caption?, credit?, license? }`. Verifies it exists, stores width, height, bytes, format. `alt` required |
| `GET /admin/media?town=&subject=&unused=true` | editor | Browse the library |
| `DELETE /admin/media/{id}` | admin | Refuses while any published record references it |
| `GET/POST/DELETE /admin/redirects` | admin | Manage `redirects`. Rejects loops and chains |
| `GET /admin/subscriptions?topic=&status=` and `.../export.csv` | admin | Review and export. Audit-logged |
| `GET /admin/audit?entity_type=&entity_id=` | admin | History |

## 7. Webhooks (inbound)

| Endpoint | From | Verifies |
|---|---|---|
| `POST /webhooks/cloudinary` | Cloudinary notification URL | signature header; updates `media_assets` on `upload` and `delete` |
| `POST /webhooks/email` | the chosen email provider | provider signature; marks `bounced` and `unsubscribed` |

## 8. Rate limits

| Scope | Limit |
|---|---|
| `POST /subscriptions` | 5 per hour per IP, 3 per hour per email |
| Public GET | 120 per minute per IP |
| Admin | 600 per minute per user |
| Media signature | 60 per hour per user |

Assumption: numbers are starting points, not PRD values. Owner: Aditya Parmar.

## 9. Non-goals

Accounts for visitors, booking, payments and reviews are not part of this API. Those belong to the Arc Trips stays product.
