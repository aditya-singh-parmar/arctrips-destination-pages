-- Arc Trips — Destination Pages
-- Landing-page + area-page content. Shapes mirror app/lib/content.ts.
-- Public pages are read-only: RLS allows anon read of published rows;
-- writes happen only via the service-role key (seed/ingestion), which bypasses RLS.

-- ── Destinations (areas: Tofino, Ucluelet, ...) ──────────────────────────────
create table if not exists public.destinations (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  name           text not null,
  region         text,
  hero_public_id text,                        -- Cloudinary public ID (explore tile / area hero)
  listing_count  int not null default 0,
  coming_soon    boolean not null default false,
  sort_order     int not null default 0,
  -- area-page fields (phase 2)
  standfirst     text,
  overview       jsonb not null default '[]'::jsonb,  -- string[] paragraphs
  gallery        jsonb not null default '[]'::jsonb,  -- { publicId, alt, caption }[]
  published      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists destinations_sort_idx on public.destinations (sort_order);

-- ── Listings (accommodation cards) ───────────────────────────────────────────
create table if not exists public.listings (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique,
  title             text not null,
  location          text,
  destination_slug  text references public.destinations(slug) on delete set null,
  hero_public_id    text,
  price_per_night   numeric,
  currency          text not null default 'CAD',
  rooms             int,
  beds              int,
  baths             int,
  rating            numeric,
  guest_favorite    boolean not null default false,
  -- collection flags used by the landing page rails
  is_holiday        boolean not null default false,
  published         boolean not null default true,
  created_at        timestamptz not null default now()
);
create index if not exists listings_destination_idx on public.listings (destination_slug);

-- ── Reviews ("Real stories from real stays") ─────────────────────────────────
create table if not exists public.reviews (
  id             uuid primary key default gen_random_uuid(),
  author_name    text not null,
  author_initial text,
  avatar_color   text,                         -- hex, e.g. #D4C4AF
  dated          text,                         -- display date string, e.g. "Jul 2024"
  body           text,
  media_public_id text,                        -- optional image/video-poster (Cloudinary)
  is_video       boolean not null default false,
  is_featured    boolean not null default false,
  sort_order     int not null default 0,
  published      boolean not null default true,
  created_at     timestamptz not null default now()
);

alter table public.destinations enable row level security;
alter table public.listings     enable row level security;
alter table public.reviews      enable row level security;

create policy "destinations public read" on public.destinations for select using (published = true);
create policy "listings public read"     on public.listings     for select using (published = true);
create policy "reviews public read"      on public.reviews      for select using (published = true);
