CREATE OR REPLACE VIEW fungi_seasonal AS
SELECT 
  f.id, 
  f.name, 
  f.preferred_common_name, 
  f.obs_count_ger,
  a.season_from,
  a.season_to,
  a.edibility,
  a.toxicity,
  (SELECT url FROM photos p WHERE p.fungi_id = f.id LIMIT 1) as photo_url,
  CASE 
    WHEN (a.season_to - a.season_from + 1) >= 12 THEN f.obs_count_ger * 0.1
    ELSE f.obs_count_ger 
  END as seasonal_priority,
  f.german_name_dgfm -- DGfM fallback name; appended last because CREATE OR REPLACE VIEW can only add columns at the end
FROM fungi f
JOIN attributes a ON f.id = a.fungi_id;

ALTER VIEW public.fungi_seasonal SET (security_invoker = on);
GRANT SELECT ON public.fungi_seasonal TO anon, authenticated, service_role;
COMMENT ON VIEW public.fungi_seasonal IS '@graphql({"primary_key_columns": ["id"]})';