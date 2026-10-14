-- A few fungi came in with a lowercase first letter in preferred_common_name
-- (e.g. "edel-reizker" instead of "Edel-Reizker"); all other ~2,000 names are capitalized.
-- The UI prints the name as stored, so fix the data. Each UPDATE also matches on the old
-- value, so re-running it (or running it after the data was corrected elsewhere) changes nothing.
-- search_name is lowercased anyway, so it is unaffected.
UPDATE public.fungi SET preferred_common_name = 'Edel-Reizker'
  WHERE id = 155197 AND preferred_common_name = 'edel-reizker';

UPDATE public.fungi SET preferred_common_name = 'Rosshaar-Schwindling'
  WHERE id = 382517 AND preferred_common_name = 'rosshaar-schwindling';

UPDATE public.fungi SET preferred_common_name = 'Natternstieliger Schleimfuß'
  WHERE id = 54631 AND preferred_common_name = 'natternstieliger Schleimfuß';

UPDATE public.fungi SET preferred_common_name = 'Purpurgrauer Träuschling'
  WHERE id = 462193 AND preferred_common_name = 'purpurgrauer träuschling';

-- Same problem in alternative_common_names ("Auch bekannt als"): 2 of ~480 entries.
-- The column is jsonb[] (an array of jsonb strings), so the values must be cast to jsonb.
-- array_replace swaps just that element; the ANY check makes it a no-op once it is fixed.
UPDATE public.fungi
  SET alternative_common_names = array_replace(
    alternative_common_names, to_jsonb('echter reizker'::text), to_jsonb('Echter Reizker'::text))
  WHERE id = 155197 AND to_jsonb('echter reizker'::text) = ANY (alternative_common_names);

UPDATE public.fungi
  SET alternative_common_names = array_replace(
    alternative_common_names, to_jsonb('feld-schwindling'::text), to_jsonb('Feld-Schwindling'::text))
  WHERE id = 118240 AND to_jsonb('feld-schwindling'::text) = ANY (alternative_common_names);
