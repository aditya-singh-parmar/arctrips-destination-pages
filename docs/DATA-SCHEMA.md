# Data schema

Two parts. Section 1 to 3 describe the data that exists today (static JSON), derived by scanning every record, not by reading one example. Section 4 onward is a **proposed** relational schema for the backend, with the mapping from the JSON.

## 0. Provenance and trust

| Fact | Detail |
|---|---|
| Source of truth today | `design/prototype/*.json`, copied to `public/prototype/*.json`. The two copies are identical at time of writing |
| Runtime use | **None.** Pages do not fetch these files. Each page carries its own inlined copy (`const DATA = {...}`, `const RAW = {...}`), pasted in at authoring time. Editing a JSON file changes nothing on the site |
| How the JSON was made | `.docx` guides through `scripts/lib/docx.mjs` and `decompose.mjs`. The driver that ran it was deleted ([ARCHITECTURE.md](ARCHITECTURE.md) section 6) |
| Unverified numbers | `climate.json` states of itself: "Seeded for design. NOT VERIFIED against the station record. Never present as fact while unverified." The pages nevertheless print it under "Climate figures are Environment Canada normals for the Tofino station" (`tofino.html`, `long-beach.html`). **Verify against the ECCC record or remove the attribution before the backend publishes weather.** The `tides` block is a fixed sample day, not a tide table |
| Counts that are not derived | "134 stays" (Tofino), "158" (Ucluelet) and "from $320 a night" are hardcoded. They match `corpus.destinations[].stays` but not `listings`, which has 12 sample rows |
| Source data to clean before import | `deep.json`: 758 of 1,075 places have a bare source URL as a body line; numbered prefixes such as `1. Lake Louise` in `name`. `vancouver-island.json`: 21 `Meta description:` prefixes; FAQ questions listed in `places`. Strip before import |

## 1. `corpus.json` (150 KB)

Top-level object, five arrays. Field presence is non-empty count over total.

### `destinations` (5)

| Field | Type | Present | Notes |
|---|---|---|---|
| `slug` | string | 5/5 | `tofino`, `ucluelet`, `edmonton`, `montreal`, `toronto` |
| `name` | string | 5/5 | |
| `standfirst` | string or null | 2/5 | |
| `overview` | string[] | 2/5 | paragraphs |
| `hero` | string | 5/5 | Cloudinary public ID |
| `stays` | number | 5/5 | 134, 158, 0, 0, 0. `toronto` has no page; `edmonton` and `montreal` exist as thin pages |

The other 21 towns have no `destinations` row; they appear only in `deep.json`.

### `guides` (15)

One per (town, subject). `city`, `cat`, `name`, `hero`, `lead` (all 15/15); `blocks` number; `photos` 13/15, an array of `{ id, caption: string|null, place: string|null }`. Cities: tofino, ucluelet. Subjects: fishing, beaches, surfing, whale-watching, birding, storm-watching, hiking, restaurants, kayaking.

### `places` (127)

| Field | Type | Present | Notes |
|---|---|---|---|
| `city`, `cat`, `slug`, `name` | string | 127/127 | unique on (`city`,`cat`,`slug`). Cities tofino, ucluelet. Subjects: kayaking, restaurants, hiking, storm-watching, whale-watching, beaches |
| `blurb` | string | 126/127 | |
| `goodFor` | string[] | 119/127 | "First-time kayakers", "Families" |
| `note` | string or null | 124/127 | the "Good to know" line |
| `hero` | string or null | 84/127 | Cloudinary public ID; 43 places have no hero |
| `body` | string[] | 126/127 | paragraphs |

### `articles` (31)

`slug`, `title`, `excerpt`, `cat` (31/31); `hero` string or null (29/31); `cities` string[] (30/31); `faqs` `{ q, a }[]` (18/31 non-empty). Subjects (11): whale-watching, restaurants, hiking, kayaking, events, camping, when-to-go, beaches, surfing, storm-watching, birding. **Only one article has a page**: "Wildlife tours in Tofino" at `/blog/whale-watching/canada/bc/tofino/wildlife-tours-in-tofino`. Every other title resolves to a scoped search.

### `listings` (12)

`slug` is **null on all 12**, so a listing has no stable identity. `title`, `city` (tofino 9, ucluelet 3), `hero`, `price` (320 to 500), `currency` (`CAD`), `rooms`, `beds`, `baths`, `rating`, `favorite`, `location`. Seed data: the hero IDs are shuffled (the code comments say a charter photo sits on a chalet and pages reassign photos). These are a sample for design, not inventory.

### Compact form in `search.html`

`RAW = { d, g, p, a, q }` with short keys: `d` towns (`s` slug, `n` name, `f` standfirst, `ov` overview, `h` hero, `st` has stays), `g` guides (`c` city, `k` subject, `n`, `h`, `l` lead, `ph` photo count), `p` places (`c`, `k`, `n`, `h`, `b` blurb, `f` goodFor, `no` note), `a` articles (`c` is the cities array), `q` questions.

## 2. Seasonal data

### `best-months.json`

Object keyed by 22 subject slugs, each an array of month numbers (1 to 12) in season: beaches, surfing, kayaking, fishing, boating, hot-springs, whale-watching, birding, storm-watching, parks, hiking, mountain-biking, skiing, camping, restaurants, markets, breweries, landmarks, arts-history, events, when-to-go, getting-around. This is the 22-category taxonomy the sitewide pages use; Tofino pages count only their own eleven. It is not town-specific.

### `climate.json`

| Key | Shape |
|---|---|
| `_source`, `_fields` | strings; see section 0 |
| `tofino`, `ucluelet` | 12 objects `{ hi, lo, mm, days }` (mean daily high C, mean daily low C, mean monthly rain mm, days with rain), January first |
| `seasons` | `storm`, `green`, `long`, each `{ months: number[], name, claim }` |
| `tides` | per town `{ station, low1, low1m, high1, high1m, low2, sunset }` with `"HH:MM"` strings and metres |

## 3. Town content

### `vancouver-island.json` (61 KB)

`{ islandGuides: [{ file, title, lead, sections: string[], places: string[], placeCount }] (7), towns: { "<Town Name>": [ same shape ] } }`. Eleven towns keyed by display name (Tofino 11 guides, Ucluelet 9, Victoria 6, eight others 1 each).

### `deep.json` (2.3 MB)

`{ "<town-slug>": { name, docs: string[], places: [{ name, section, body: string[], images: string[], note }] } }`. 25 keys: 24 towns plus `vancouver-island`. 1,075 places in total. `images` are paths under `media/<town>/`. These become the 24 content-only town pages; there is no build step from this file to those pages.

## 4. Proposed relational schema (PostgreSQL)

Targets Supabase. Proposed, not built. Naming: snake_case, `uuid` keys except natural slugs where the slug is the identity. All tables get `created_at`, `updated_at`.

```sql
-- Reference ---------------------------------------------------------------
create table towns (
  slug            text primary key,                 -- 'tofino'; also the URL segment today
  name            text not null,
  province_code   text not null,                    -- 'BC','AB','QC'... st-john unresolved
  country_code    text not null default 'CA',
  region_slug     text,                             -- 'vancouver-island', 'mainland-coast'...
  standfirst      text,
  overview        text[] not null default '{}',
  hero_media_id   uuid,                             -- references media_assets
  stays_count     int,                              -- cache from the stays product, not authored
  status          text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table subjects (                             -- the 22-category taxonomy
  slug text primary key,                            -- 'hiking','whale-watching'...
  label text not null,
  kind text not null default 'activity'
);

-- Content -----------------------------------------------------------------
create table guides (
  id uuid primary key default gen_random_uuid(),
  town_slug    text not null references towns(slug),
  subject_slug text not null references subjects(slug),
  name text not null, lead text, hero_media_id uuid, status text not null default 'draft',
  unique (town_slug, subject_slug)
);

create table places (
  id uuid primary key default gen_random_uuid(),
  town_slug    text not null references towns(slug),
  subject_slug text not null references subjects(slug),
  slug text not null, name text not null,
  blurb text, note text, body text[] not null default '{}', good_for text[] not null default '{}',
  hero_media_id uuid, position int not null default 0,
  status text not null default 'draft',
  unique (town_slug, subject_slug, slug)
);

create table articles (
  slug text primary key, title text not null, excerpt text,
  subject_slug text references subjects(slug), hero_media_id uuid,
  status text not null default 'draft'
);
create table article_towns (article_slug text references articles(slug) on delete cascade,
                            town_slug text references towns(slug), primary key (article_slug, town_slug));
create table faqs (
  id uuid primary key default gen_random_uuid(),
  article_slug text not null references articles(slug) on delete cascade,
  question text not null, answer text not null, position int not null default 0
);

-- Seasonal ------------------------------------------------------------------
create table subject_months (subject_slug text references subjects(slug), month int check (month between 1 and 12),
                             primary key (subject_slug, month));
create table climate_normals (
  town_slug text references towns(slug), month int check (month between 1 and 12),
  hi_c numeric(4,1), lo_c numeric(4,1), rain_mm int, rain_days int,
  source text not null, verified boolean not null default false,
  primary key (town_slug, month)
);
create table season_windows (key text primary key, name text not null, months int[] not null, claim text);
-- Tides are not stored. Read them from the Canadian Hydrographic Service at request time.

-- Media -------------------------------------------------------------------------
create table media_assets (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,                   -- Cloudinary public ID, see MEDIA.md
  kind text not null default 'image' check (kind in ('image','video')),
  alt text not null,                                -- required: the pages reuse it as alt text
  caption text,
  width int, height int, bytes int, format text,
  town_slug text references towns(slug), subject_slug text references subjects(slug),
  place_id uuid references places(id) on delete set null,
  source_url text, license text, credit text,
  uploaded_by uuid, created_at timestamptz default now()
);
create table guide_photos (guide_id uuid references guides(id) on delete cascade,
  media_id uuid references media_assets(id), position int not null default 0,
  caption text, place_id uuid references places(id), primary key (guide_id, media_id));

-- Stays read model (the source of truth is the Arc Trips stays product) -------------
create table stay_summaries (
  external_id text primary key,                     -- id in the stays product; fixes slug = null
  slug text unique, title text not null, town_slug text references towns(slug),
  hero_media_id uuid, price_cents int, currency char(3) default 'CAD',
  rooms int, beds int, baths numeric(3,1), rating numeric(2,1), url text,
  synced_at timestamptz
);

-- Subscriptions (backs the three prototype forms) ------------------------------------------
create table subscription_topics (
  key text primary key,                             -- 'seasonal-letter','whale-watching-tofino'
  label text not null, consent_text text not null, consent_version int not null, active boolean default true
);
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  email citext not null,
  topic_key text not null references subscription_topics(key),
  status text not null default 'pending' check (status in ('pending','confirmed','unsubscribed','bounced')),
  consent_version int not null, consented_at timestamptz not null,
  source_path text,                                 -- page the form was on, e.g. /whale-watching/canada/bc/tofino
  ip_hash text,                                     -- hashed, never raw
  confirm_token_hash text, confirmed_at timestamptz, unsubscribed_at timestamptz,
  created_at timestamptz default now(),
  unique (email, topic_key)
);

-- URLs as data ---------------------------------------------------------------------------------
create table routes (
  path text primary key,                            -- '/destinations/canada/bc/tofino/things-to-do/hiking'; lowercase, no trailing slash
  entity_type text not null,                        -- 'town','guide','place','article','page'
  entity_id text not null,
  noindex boolean not null default false,
  created_at timestamptz default now()
);
create table redirects (
  from_path text primary key, to_path text not null, status int not null default 308,
  created_at timestamptz default now()
);

-- Admin ----------------------------------------------------------------------------------------
create table audit_log (
  id bigint generated always as identity primary key,
  actor uuid, action text not null, entity_type text, entity_id text, diff jsonb,
  at timestamptz default now()
);
```

Row-level security: `select` on `status = 'published'` rows for `anon`; every write through the service role or a role claim `editor`/`admin` from Supabase Auth. `subscriptions` has **no** public `select`; only the API inserts, via the service role.

`routes` and `redirects` exist because URL structure is a contract ([routing.md](routing.md)). Today `scripts/lib/routes.mjs` is that data. If the PRD tree is adopted, the move is a data change here plus a redirect policy decision, not a code edit.

## 5. Mapping from today's data

| Source | Target | Transform |
|---|---|---|
| `corpus.destinations` | `towns` | add `province_code`, `region_slug`; `stays` to `stays_count` |
| `corpus.guides` | `guides`, `guide_photos` | `cat` to `subject_slug`; `photos[].id` to a `media_assets` row by `public_id` |
| `corpus.places` | `places` | `city`, `cat` to town and subject; array order to `position`; `hero` to `media_assets` |
| `corpus.articles`, `.faqs` | `articles`, `article_towns`, `faqs` | `cities[]` explodes to `article_towns` |
| `corpus.listings` | `stay_summaries` (sample only) | no stable ID: generate one, mark as sample, replace with a real sync |
| `best-months.json` | `subject_months` | explode arrays |
| `climate.json` | `climate_normals`, `season_windows` | set `verified = false` until checked against ECCC |
| `deep.json` | `towns`, `places` | drop bare-URL body lines; strip `^\d+\.\s` from `name`; keep `section` as a place group; `images` to `media_assets` after upload |
| `vancouver-island.json` | `articles` (island guides) | strip `Meta description:`; drop `places` entries that are questions |
| `ROUTES` | `routes`, `redirects` | one row per route; legacy `.html` paths to `redirects` |

Import order: `subjects`, `towns`, `media_assets`, `guides`, `places`, `articles`, `faqs`, seasonal tables, `routes`. Idempotent upserts on the natural keys above.

## 6. Invariants any implementation must keep

1. A place resolves to the subject page that owns it, never by name (both towns have kayaking and a Wild Pacific Trail).
2. A subject has exactly one URL; a guide has exactly one home.
3. Alt text is required on every media asset.
4. Months wrap: windows are contiguous runs read round the year ("November to February").
5. Counts shown to visitors are counts of things they can use, never of what the team has produced.
6. Nothing renders an unverified figure as fact.
7. URLs are derived, not authored, and follow the PRD: `/{section}/{country}/{province}/{town}/{slug}`, lowercase, hyphenated, no trailing slash ([routing.md](routing.md)). `towns.country_code` and `province_code` are part of every town URL, so changing either changes the URL and must write a `routes` row. Slugs are immutable once published. The PRD forbids redirects, so the `redirects` table is for the owner's explicit exceptions only.
