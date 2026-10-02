-- PilsBuddy N4: the regional catalogue grows to Canada and the USA (Stufe N, #54).
-- Breweries from Open Brewery DB (MIT) keep their UUID as source id `obdb-<uuid>`; US ZIP codes are five digits like
-- German postcodes, Canadian postcodes are stored as their first three characters only (FSA, e.g. `M5V`) – coarse
-- enough that a typed postcode never pins down a street.
-- Released clients stay safe: they drop CA/US breweries in `sanitizeBrewery`, refuse an FSA before asking, and their
-- postcode lookup orders by country, so a five-digit code still finds the German place first.

alter table public.breweries drop constraint breweries_country_check;
alter table public.breweries add constraint breweries_country_check check (country in ('DE', 'AT', 'CH', 'CA', 'US'));

alter table public.breweries drop constraint breweries_id_check;
alter table public.breweries add constraint breweries_id_check
  check (id ~ '^((osm-[nwr]|wd-q|app-)[0-9]{1,20}|obdb-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$');

alter table public.places drop constraint places_country_check;
alter table public.places add constraint places_country_check check (country in ('DE', 'AT', 'CH', 'CA', 'US'));

alter table public.places drop constraint places_postcode_check;
alter table public.places add constraint places_postcode_check check (postcode ~ '^([0-9]{4,5}|[A-Z][0-9][A-Z])$');

comment on table public.breweries is 'Regional breweries (OSM ODbL, Wikidata CC0, Open Brewery DB MIT), imported by tools/catalog.';
comment on table public.places is 'Postcodes of DE/AT/CH/US and Canadian FSAs (GeoNames, CC-BY 4.0), imported by tools/catalog.';
