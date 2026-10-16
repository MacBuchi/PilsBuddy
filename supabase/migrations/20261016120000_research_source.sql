-- V12: beers researched on other sites than the brewery's own (shop, beer portal, regional guide) – the ref is the
-- full https link of the page that names the beer, like the app reports (source 5).
insert into public.beer_sources (id, key, name, licence, url_template) values
  (6, 'research', 'Recherche (Quelle verlinkt)', 'Fakten (Name, Stil, Alkohol)', null)
  on conflict (id) do nothing;
