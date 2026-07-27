-- Arc Trips, Destinations Experience: the geographic tree.
-- country > province > [region >] town > area, self-referencing.
--
-- ADDITIVE ONLY. This Supabase instance is shared with the sibling
-- Website-Builder project. Nothing here drops, renames or alters an existing
-- table or column. Every added column is nullable or carries a default.
--
-- The existing `places` table means a point of interest inside a category
-- guide (Long Beach within tofino/beaches). This new `geo_places` table means
-- a geographic node. They are different things and both are kept.
-- See docs/superpowers/specs/2026-07-27-destinations-experience-design.md 3.

create table if not exists public.geo_places (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null,
  name            text not null,                       -- correct orthography
  type            text not null check (type in ('country','province','region','town','area')),
  parent_id       uuid references public.geo_places(id) on delete cascade,
  status          text not null default 'draft'
                    check (status in ('draft','coming_soon','published','hidden','archived')),
  standfirst      text,
  intro           jsonb not null default '[]'::jsonb,  -- ArticleBlock[]
  body            jsonb not null default '[]'::jsonb,  -- ArticleBlock[]
  hero_public_id  text,
  gallery         jsonb not null default '[]'::jsonb,
  lat             numeric,
  lng             numeric,
  bounds          jsonb,
  timezone        text,                                -- set at country, inherited
  currency        text,
  unit_system     text,
  also_appears_in uuid[] not null default '{}',        -- areas only
  seo_title       text,
  seo_description text,
  og_image        text,
  sort_priority   int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- An area may never take a reserved slug. Blocked at write, not at render.
  constraint geo_places_slug_not_reserved
    check (slug not in ('things-to-do','plan','compare')),
  -- also_appears_in is meaningful only for areas.
  constraint geo_places_also_appears_areas_only
    check (type = 'area' or cardinality(also_appears_in) = 0)
);

-- Slugs are unique among siblings. Enforced by constraint, not by a
-- pre-check, so two concurrent creates cannot both succeed.
create unique index if not exists geo_places_sibling_slug_idx
  on public.geo_places (coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), slug);
create index if not exists geo_places_parent_idx on public.geo_places (parent_id);
create index if not exists geo_places_type_idx   on public.geo_places (type);

-- The category join. A category page exists if and only if a row is here.
create table if not exists public.destination_categories (
  geo_place_id    uuid not null references public.geo_places(id) on delete cascade,
  category_slug   text not null references public.categories(slug) on delete cascade,
  status          text not null default 'coming_soon'
                    check (status in ('active','coming_soon','hidden')),
  overview_body   jsonb not null default '[]'::jsonb,  -- ArticleBlock[]
  best_months     int[] not null default '{}',         -- 1 to 12
  hero_public_id  text,
  gallery         jsonb not null default '[]'::jsonb,
  sort_order      int not null default 0,
  seo_title       text,
  seo_description text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (geo_place_id, category_slug),

  -- A category cannot go active with an empty body. An empty category page is
  -- worse than no page.
  constraint destination_categories_active_needs_body
    check (status <> 'active' or jsonb_array_length(overview_body) > 0),
  constraint destination_categories_months_valid
    check (best_months <@ array[1,2,3,4,5,6,7,8,9,10,11,12])
);

-- Planning: the practical axis and the intent axis, joined to towns.
create table if not exists public.planning_topics (
  slug       text primary key,
  name       text not null,
  sort_order int not null default 0,
  status     text not null default 'active'
);

create table if not exists public.traveller_profiles (
  slug       text primary key,
  name       text not null,
  sort_order int not null default 0
);

create table if not exists public.geo_place_topics (
  geo_place_id uuid not null references public.geo_places(id) on delete cascade,
  topic_slug   text not null references public.planning_topics(slug) on delete cascade,
  sort_order   int not null default 0,
  published    boolean not null default true,
  primary key (geo_place_id, topic_slug)
);

-- Existing tables gain a nullable link to their geo node. Nothing is moved.
alter table public.destinations add column if not exists geo_place_id uuid references public.geo_places(id) on delete set null;
alter table public.places       add column if not exists geo_place_id uuid references public.geo_places(id) on delete set null;
alter table public.photos       add column if not exists geo_place_id uuid references public.geo_places(id) on delete set null;
alter table public.articles     add column if not exists geo_place_id uuid references public.geo_places(id) on delete set null;

-- Content items: the articles table widens rather than being replaced.
alter table public.articles add column if not exists type            text not null default 'article';
alter table public.articles add column if not exists section_tag     text;
alter table public.articles add column if not exists topic_slug      text references public.planning_topics(slug) on delete set null;
alter table public.articles add column if not exists profile_slugs   text[] not null default '{}';
alter table public.articles add column if not exists status          text not null default 'published';
alter table public.articles add column if not exists published_at    timestamptz;
alter table public.articles add column if not exists updated_at      timestamptz not null default now();
alter table public.articles add column if not exists author          text;
alter table public.articles add column if not exists seo_description text;

-- Notify-me capture. CASL requires express consent, stored and versioned.
-- Nothing is sent from this repository; delivery is blocked on OQ-11.
create table if not exists public.notify_requests (
  id                    uuid primary key default gen_random_uuid(),
  email                 text not null,
  geo_place_id          uuid references public.geo_places(id) on delete cascade,
  category_slug         text references public.categories(slug) on delete cascade,
  consent_timestamp     timestamptz not null default now(),
  consent_source_url    text not null,
  consent_text_version  text not null,
  status                text not null default 'pending'
                          check (status in ('pending','notified','unsubscribed','bounced')),
  bounce_count          int not null default 0,
  created_at            timestamptz not null default now(),
  notified_at           timestamptz
);

-- A duplicate email + place + category updates rather than inserting.
create unique index if not exists notify_requests_unique_idx
  on public.notify_requests (
    lower(email),
    coalesce(geo_place_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(category_slug, '')
  );

-- Search support. The synonym list is editor-maintained, never code.
create table if not exists public.search_synonyms (
  term     text primary key,
  maps_to  text not null
);

create table if not exists public.search_zero_results (
  query      text primary key,
  hits       int not null default 1,
  last_seen  timestamptz not null default now()
);

alter table public.geo_places             enable row level security;
alter table public.destination_categories enable row level security;
alter table public.planning_topics        enable row level security;
alter table public.traveller_profiles     enable row level security;
alter table public.geo_place_topics       enable row level security;
alter table public.notify_requests        enable row level security;
alter table public.search_synonyms        enable row level security;
alter table public.search_zero_results    enable row level security;

-- Public read of renderable rows only. draft, hidden and archived are invisible
-- to the anon key, so an unpublished node cannot leak through the resolver.
drop policy if exists "geo_places public read" on public.geo_places;
create policy "geo_places public read" on public.geo_places
  for select using (status in ('published','coming_soon'));
drop policy if exists "destination_categories public read" on public.destination_categories;
create policy "destination_categories public read" on public.destination_categories
  for select using (status in ('active','coming_soon'));
drop policy if exists "planning_topics public read" on public.planning_topics;
create policy "planning_topics public read" on public.planning_topics    for select using (status = 'active');
drop policy if exists "traveller_profiles public read" on public.traveller_profiles;
create policy "traveller_profiles public read" on public.traveller_profiles for select using (true);
drop policy if exists "geo_place_topics public read" on public.geo_place_topics;
create policy "geo_place_topics public read" on public.geo_place_topics   for select using (published = true);
drop policy if exists "search_synonyms public read" on public.search_synonyms;
create policy "search_synonyms public read" on public.search_synonyms    for select using (true);
-- notify_requests and search_zero_results: no public select. Writes happen
-- through a server action on the service role.
