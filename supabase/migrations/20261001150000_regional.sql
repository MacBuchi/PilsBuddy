-- PilsBuddy R1: regional beer catalogue (Stufe R).
-- Breweries from OpenStreetMap + Wikidata, their main beers from Open Food Facts, postcodes from GeoNames.
-- Filled by tools/catalog (build → import SQL), never by the app: public read-only, no API writes.
-- Taste is not stored – the client derives it from style + ABV (tasteFromStyle, „Stil-Schätzung“).

-- ---------------------------------------------------------------------------------------------
-- breweries: deduplicated OSM/Wikidata breweries in DE/AT/CH
-- ---------------------------------------------------------------------------------------------

create table public.breweries (
  -- source id: osm-n123 / osm-w123 / osm-r123 (OpenStreetMap) or wd-q123 (Wikidata)
  id text primary key check (id ~ '^(osm-[nwr]|wd-q)[0-9]{1,20}$'),
  name text not null check (length(name) between 1 and 200),
  lat double precision not null check (lat between -90 and 90),
  lon double precision not null check (lon between -180 and 180),
  city text check (length(city) <= 120),
  postcode text check (length(postcode) <= 12),
  country text not null check (country in ('DE', 'AT', 'CH')),
  website text check (length(website) <= 300),
  founded smallint check (founded between 800 and 2100),
  -- which open sources know it: 'osm', 'wikidata'
  sources text[] not null default '{}',
  -- false = no longer in the sources (kept so ratings/snapshots on devices stay explainable)
  published boolean not null default true,
  updated_at timestamptz not null default now()
);

comment on table public.breweries is 'Regional breweries (OSM ODbL, Wikidata CC0), imported by tools/catalog.';

-- the client asks for 0.5° grid cells: bounding box on lat, then lon
create index breweries_lat_lon on public.breweries (lat, lon);

create trigger breweries_touch before update on public.breweries
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------------------------
-- beer_sources: where a beer comes from – a few rows, beers point here with a smallint + short ref
-- ---------------------------------------------------------------------------------------------

create table public.beer_sources (
  id smallint primary key,
  key text not null unique check (key ~ '^[a-z0-9-]{1,20}$'),
  name text not null,
  licence text not null,
  -- link to the record: {ref} = regional_beers.source_ref; null = ref is a path on the brewery website
  url_template text check (url_template like 'https://%{ref}%')
);

comment on table public.beer_sources is 'Sources of regional beers; regional_beers.source_ref is relative to url_template.';

insert into public.beer_sources (id, key, name, licence, url_template) values
  (1, 'off', 'Open Food Facts', 'ODbL', 'https://world.openfoodfacts.org/product/{ref}'),
  (2, 'wikidata', 'Wikidata', 'CC0', 'https://www.wikidata.org/wiki/{ref}'),
  (3, 'web', 'Website der Brauerei', 'Fakten (Name, Stil, Alkohol)', null),
  (4, 'openbeer', 'beer.db (openbeer)', 'Public Domain', 'https://github.com/openbeer/{ref}');

-- ---------------------------------------------------------------------------------------------
-- regional_beers: up to five main beers per brewery (one per style)
-- ---------------------------------------------------------------------------------------------

create table public.regional_beers (
  -- r-<EAN> (Open Food Facts), r-q<n> (Wikidata), r-w<hash> (website); charset of ratings.beer_id
  id text primary key check (id ~ '^r-[a-z0-9]{2,40}$'),
  brewery_id text not null references public.breweries (id) on delete cascade,
  name text not null check (length(name) between 1 and 200),
  -- canonical style of src/domain/styleProfile.ts, null = unknown
  style text check (length(style) <= 40),
  abv numeric(4, 1) check (abv between 0 and 20),
  -- container facts {ml, can, swing} for the derived bottle (parsePack)
  pack jsonb check (pack is null or jsonb_typeof(pack) = 'object'),
  -- order within the brewery: 0 = its most typical beer
  rank smallint not null default 0 check (rank between 0 and 99),
  source smallint not null references public.beer_sources (id),
  -- EAN, Q-id or website path – short on purpose, the full link comes from beer_sources.url_template
  source_ref text check (length(source_ref) <= 300),
  published boolean not null default true,
  updated_at timestamptz not null default now()
);

comment on table public.regional_beers is 'Main beers of regional breweries (Open Food Facts ODbL), imported by tools/catalog.';

create index regional_beers_brewery on public.regional_beers (brewery_id);
create index regional_beers_source on public.regional_beers (source);

create trigger regional_beers_touch before update on public.regional_beers
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------------------------
-- places: postcode → place + centre (GeoNames, CC-BY 4.0) for the postcode search
-- ---------------------------------------------------------------------------------------------

create table public.places (
  country text not null check (country in ('DE', 'AT', 'CH')),
  postcode text not null check (postcode ~ '^[0-9]{4,5}$'),
  name text not null check (length(name) between 1 and 120),
  lat double precision not null check (lat between -90 and 90),
  lon double precision not null check (lon between -180 and 180),
  primary key (country, postcode, name)
);

comment on table public.places is 'Postcodes of DE/AT/CH (GeoNames, CC-BY 4.0), imported by tools/catalog.';

-- „74906“ hits the primary key's second column only → own index; place names by prefix
create index places_postcode on public.places (postcode);
create index places_name on public.places (lower(name) text_pattern_ops);

-- ---------------------------------------------------------------------------------------------
-- row level security: read-only for everyone, published rows only
-- ---------------------------------------------------------------------------------------------

alter table public.breweries enable row level security;
alter table public.regional_beers enable row level security;
alter table public.places enable row level security;
alter table public.beer_sources enable row level security;

create policy "published breweries are public"
  on public.breweries for select
  to anon, authenticated
  using (published);

create policy "published regional beers are public"
  on public.regional_beers for select
  to anon, authenticated
  using (published);

create policy "places are public"
  on public.places for select
  to anon, authenticated
  using (true);

create policy "beer sources are public"
  on public.beer_sources for select
  to anon, authenticated
  using (true);

grant select on public.breweries, public.regional_beers, public.places, public.beer_sources to anon, authenticated;
