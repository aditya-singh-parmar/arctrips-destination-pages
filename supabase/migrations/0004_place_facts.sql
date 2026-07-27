-- Key facts strip and coordinates for the destination page (PRD 6.2).
-- ADDITIVE ONLY. Shared instance with Website-Builder.
--
-- `facts` is editor-authored, not derived, because the PRD's key facts
-- (nearest airport, drive times, typical trip length) are factual claims that
-- go stale. OQ-10 has no source-of-truth process yet, so every value here is
-- reviewable in one place and the strip renders only what is set.
alter table public.geo_places add column if not exists facts jsonb not null default '[]'::jsonb;
