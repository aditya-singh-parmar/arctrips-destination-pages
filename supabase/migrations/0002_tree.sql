-- Arc Trips — Destination Pages v1.1 tree
-- Region > City > Category > Place, plus the CTA engine tables.
-- Public pages are read-only: RLS allows anon read of published rows.
-- Additive only: new tables plus `alter table ... add column if not exists`.
-- This Supabase instance is shared with a sibling project; never drop or
-- alter an existing column or table here.

create table if not exists public.regions (
  slug           text primary key,
  name           text not null,
  hero_public_id text,
  blurb          text,
  sort_order     int not null default 0,
  published      boolean not null default true
);

-- `destinations` (from 0001) is the city table. Add the region link.
alter table public.destinations add column if not exists region_slug text references public.regions(slug) on delete set null;

create table if not exists public.categories (
  slug        text primary key,
  name        text not null,
  theme       text not null,          -- grouping label only, never a route
  sort_order  int not null default 0
);

create table if not exists public.city_categories (
  city_slug      text not null references public.destinations(slug) on delete cascade,
  category_slug  text not null references public.categories(slug) on delete cascade,
  intro          jsonb not null default '[]'::jsonb,   -- ArticleBlock[]
  hero_public_id text,
  sort_order     int not null default 0,
  published      boolean not null default true,
  primary key (city_slug, category_slug)
);

create table if not exists public.places (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null,
  city_slug      text not null references public.destinations(slug) on delete cascade,
  category_slug  text not null references public.categories(slug) on delete cascade,
  name           text not null,
  blurb          text,
  body           jsonb not null default '[]'::jsonb,   -- ArticleBlock[]
  good_for       jsonb not null default '[]'::jsonb,   -- string[]
  good_to_know   text,
  hero_public_id text,
  lat            numeric,
  lng            numeric,
  sort_order     int not null default 0,
  published      boolean not null default true,
  unique (city_slug, category_slug, slug)
);
create index if not exists places_city_cat_idx on public.places (city_slug, category_slug);

-- articles gains multi-city and region attachment
alter table public.articles add column if not exists city_slugs   text[] not null default '{}';
alter table public.articles add column if not exists region_slug  text references public.regions(slug) on delete set null;
alter table public.articles add column if not exists category_slug text references public.categories(slug) on delete set null;
alter table public.articles add column if not exists faqs jsonb not null default '[]'::jsonb;  -- {q,a}[]

create table if not exists public.photos (
  id            uuid primary key default gen_random_uuid(),
  public_id     text not null,
  city_slug     text references public.destinations(slug) on delete cascade,
  category_slug text references public.categories(slug) on delete set null,
  place_slug    text,                                  -- matches places.slug within the city+category
  caption       text,
  source_url    text,
  sort_order    int not null default 0,
  published     boolean not null default true
);
create index if not exists photos_city_cat_idx on public.photos (city_slug, category_slug);

create table if not exists public.product_lines (
  slug         text primary key,
  name         text not null,
  brand        text not null default 'arctrips',      -- arctrips | arctrips-fishing
  status       text not null default 'coming_soon',   -- live | coming_soon
  external_url text,
  blurb        text,
  sort_order   int not null default 0
);

create table if not exists public.category_products (
  category_slug     text not null references public.categories(slug) on delete cascade,
  product_line_slug text not null references public.product_lines(slug) on delete cascade,
  priority          int not null default 0,
  primary key (category_slug, product_line_slug)
);

create table if not exists public.experiences (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  product_line_slug text not null references public.product_lines(slug) on delete cascade,
  city_slug         text references public.destinations(slug) on delete cascade,
  category_slug     text references public.categories(slug) on delete set null,
  place_slug        text,
  title             text not null,
  duration          text,
  price_from        numeric,
  currency          text not null default 'CAD',
  hero_public_id    text,
  book_url          text,
  sort_order        int not null default 0,
  published         boolean not null default true
);
create index if not exists experiences_city_cat_idx on public.experiences (city_slug, category_slug);

create table if not exists public.notify_signups (
  id                uuid primary key default gen_random_uuid(),
  email             text not null,
  product_line_slug text references public.product_lines(slug) on delete set null,
  city_slug         text,
  created_at        timestamptz not null default now()
);

alter table public.regions           enable row level security;
alter table public.categories        enable row level security;
alter table public.city_categories   enable row level security;
alter table public.places            enable row level security;
alter table public.photos            enable row level security;
alter table public.product_lines     enable row level security;
alter table public.category_products enable row level security;
alter table public.experiences       enable row level security;
alter table public.notify_signups    enable row level security;

create policy "regions public read"           on public.regions           for select using (published = true);
create policy "categories public read"        on public.categories        for select using (true);
create policy "city_categories public read"   on public.city_categories   for select using (published = true);
create policy "places public read"            on public.places            for select using (published = true);
create policy "photos public read"            on public.photos            for select using (published = true);
create policy "product_lines public read"     on public.product_lines     for select using (true);
create policy "category_products public read" on public.category_products for select using (true);
create policy "experiences public read"       on public.experiences       for select using (published = true);
-- notify_signups: no public select policy. Inserts happen via a server action using the service role.
