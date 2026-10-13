-- PilsBuddy V6: corrections from „Problem melden“ (Stufe V, Wunsch 2026-10-13).
-- A confirmed beer report can correct name, style or ABV of a regional beer: the maintainer fills the section
-- „Korrektur“ in the `bier-problem` issue and sets the label `korrigieren`; tool/feedback_bot.py writes the values here.
-- Like `hidden`, the catalogue import never touches this column – a correction survives every import. The client lays it
-- over the imported values and shows the beer as „geprüft“ (3, checked by hand).
-- Released clients read regional_beers(*) and ignore the unknown key.

alter table public.regional_beers add column correction jsonb
  check (
    correction is null or (
      jsonb_typeof(correction) = 'object'
      and correction <> '{}'::jsonb
      and correction - array['name', 'style', 'abv'] = '{}'::jsonb
      and (not correction ? 'name' or (jsonb_typeof(correction -> 'name') = 'string' and char_length(correction ->> 'name') between 1 and 200))
      and (not correction ? 'style' or (jsonb_typeof(correction -> 'style') = 'string' and char_length(correction ->> 'style') between 1 and 40))
      and (not correction ? 'abv' or (jsonb_typeof(correction -> 'abv') = 'number' and (correction ->> 'abv')::numeric between 0 and 20))
    )
  );

comment on column public.regional_beers.correction is
  'V6: {name?, style?, abv?} from a confirmed problem report (label `korrigieren`, tool/feedback_bot.py); never set by the import';

-- the V1 comment still described the first rules; V4 (#86) changed them
comment on column public.regional_beers.quality is
  '0 fraglich (only openbeer, or neither style nor ABV) · 1 gefunden (one source) · 2 bestätigt (EAN/Wikidata or two sources) · '
  '3 geprüft (style known, two sources agree on ABV, none contradicts); set by tools/catalog. A correction makes it 3 in the app';
