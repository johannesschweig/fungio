-- Search helper column: latin name, german name and german alternative names, normalized so the
-- search ignores case, hyphens, spaces and umlaut spelling ("wiesenchampignon", "Wiesen-Champignon",
-- "roehrling" and "Röhrling" all match). The app normalizes the typed text the same way
-- (normalizeSearch in app/utils/utils.ts) - keep both in sync.

-- ä->ae, ö->oe, ü->ue, ß->ss, then drop hyphens/dashes/whitespace
CREATE OR REPLACE FUNCTION public.search_normalize(t text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(
    replace(replace(replace(replace(lower(t), 'ä', 'ae'), 'ö', 'oe'), 'ü', 'ue'), 'ß', 'ss'),
    '[-–—[:space:]]+', '', 'g')
$$;

ALTER TABLE public.fungi ADD COLUMN IF NOT EXISTS search_name text;

-- A trigger (not a generated column) because alternative_common_names::text is only
-- immutable for jsonb; this works for any column type. '|' keeps the names apart.
CREATE OR REPLACE FUNCTION public.fungi_set_search_name() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_name := public.search_normalize(
    NEW.name || '|' || coalesce(NEW.preferred_common_name, '') || '|' || coalesce(NEW.alternative_common_names::text, '')
  );
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS fungi_search_name_trg ON public.fungi;
CREATE TRIGGER fungi_search_name_trg
  BEFORE INSERT OR UPDATE OF name, preferred_common_name, alternative_common_names ON public.fungi
  FOR EACH ROW EXECUTE FUNCTION public.fungi_set_search_name();

-- backfill all existing rows (fires the trigger)
UPDATE public.fungi SET name = name;

NOTIFY pgrst, 'reload schema';
