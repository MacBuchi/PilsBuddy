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
  if n_beers <> 5 then raise exception 'beers: % (want 5)', n_beers; end if;
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
