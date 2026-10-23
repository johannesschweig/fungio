-- Counts per first letter for the letter navigation. Uses the same name as the list:
-- iNaturalist German name, else DGfM name (fungi.german_name_dgfm), else latin name.
CREATE OR REPLACE FUNCTION get_letter_counts()
RETURNS TABLE(letter TEXT, count BIGINT)
LANGUAGE sql
STABLE
AS $$
  SELECT
    UPPER(LEFT(COALESCE(preferred_common_name, german_name_dgfm, name), 1)) AS letter,
    COUNT(*) AS count
  FROM public.fungi
  WHERE
    COALESCE(preferred_common_name, german_name_dgfm) IS NOT NULL
    OR (name IS NOT NULL AND LEFT(UPPER(name), 1) ~ '[A-Z]')
  GROUP BY letter
  ORDER BY letter;
$$;
