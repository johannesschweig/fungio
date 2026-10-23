-- Letter list (/all/<letter>). The shown name is iNaturalist's German name, else the DGfM name
-- (fungi.german_name_dgfm), else the latin name; the app picks the same one with getDisplayName().
-- The return type changed (german_name_dgfm added), so the old function has to be dropped first.
DROP FUNCTION IF EXISTS public.get_mushrooms_by_letter(text);

CREATE FUNCTION public.get_mushrooms_by_letter(p_letter TEXT)
RETURNS TABLE(
  id integer,
  name TEXT,
  preferred_common_name TEXT,
  german_name_dgfm TEXT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    id,
    name,
    preferred_common_name,
    german_name_dgfm
  FROM public.fungi
  WHERE
    COALESCE(preferred_common_name, german_name_dgfm, name) IS NOT NULL
    AND UPPER(LEFT(COALESCE(preferred_common_name, german_name_dgfm, name), 1)) = UPPER(p_letter)
  ORDER BY COALESCE(preferred_common_name, german_name_dgfm, name) ASC, id ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_mushrooms_by_letter(text) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
