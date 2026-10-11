-- PilsBuddy V1: how well a regional beer is backed (Stufe V, Wunsch 2026-10-11). Set by tools/catalog on every import:
--   0 fraglich  – one weak hint only (an openbeer list from ~2014, or a website heading without style or ABV);
--                 shown in the finder, never in the swipe deck
--   1 gefunden  – one current source (usually the brewery's own website)
--   2 bestätigt – a product with EAN / a Wikidata item, or two independent sources, and the ABV is known
--   3 geprüft   – researched by hand (curated beers.json / `beers`; reserved here for hand-checked rows)
-- Released clients do not select the column; rows inserted without it (beer reports, R6) start at 1.
alter table public.regional_beers add column quality smallint not null default 1 check (quality between 0 and 3);

comment on column public.regional_beers.quality is
  '0 fraglich · 1 gefunden · 2 bestätigt (EAN/Wikidata or two sources, ABV known) · 3 geprüft (by hand); set by tools/catalog';
