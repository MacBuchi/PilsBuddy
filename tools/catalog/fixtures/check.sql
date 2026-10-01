-- CI: after importing the fixture build twice, the API role sees exactly the expected rows.
set role anon;
do $$
declare
  n_breweries int := (select count(*) from public.breweries);
  n_beers int := (select count(*) from public.regional_beers);
  n_places int := (select count(*) from public.places);
  eichbaum text[] := (select array_agg(name order by rank) from public.regional_beers where brewery_id = 'osm-n1');
begin
  if n_breweries <> 5 then raise exception 'breweries: % (want 5)', n_breweries; end if;
  if n_beers <> 7 then raise exception 'beers: % (want 7)', n_beers; end if;
  if n_places <> 4 then raise exception 'places: % (want 4)', n_places; end if;
  if eichbaum <> array['Ureich Premium Pils', 'Eichbaum Export', 'Kurpfälzer Naturradler'] then
    raise exception 'Eichbaum main beers: %', eichbaum;
  end if;
  if (select founded from public.breweries where id = 'osm-n1') <> 1679 then raise exception 'Wikidata not merged'; end if;
end $$;
reset role;
-- the second import changed nothing
do $$
begin
  if (select count(distinct updated_at) from public.breweries) <> 1 then raise exception 'second import touched rows'; end if;
end $$;
-- every beer links back to its source
do $$
begin
  if exists (select 1 from public.regional_beers r join public.beer_sources s on s.id = r.source where r.source_ref is null) then
    raise exception 'beer without source_ref';
  end if;
  if (select replace(s.url_template, '{ref}', r.source_ref) from public.regional_beers r join public.beer_sources s on s.id = r.source where r.id = 'r-q501')
     <> 'https://www.wikidata.org/wiki/Q501' then raise exception 'Wikidata link broken'; end if;
  -- openbeer adds the Bock; its Doppelbock loses to the more complete Open Food Facts entry
  if (select array_agg(s.key || ':' || r.style order by r.rank) from public.regional_beers r join public.beer_sources s on s.id = r.source where r.brewery_id = 'wd-q3')
     <> array['off:Doppelbock', 'wikidata:Weißbier', 'openbeer:Bock'] then raise exception 'Andechs beers wrong'; end if;
  if not exists (select 1 from public.regional_beers where source = 4 and source_ref = 'oberbayern/blob/master/beers.txt') then
    raise exception 'openbeer source_ref missing';
  end if;
end $$;
