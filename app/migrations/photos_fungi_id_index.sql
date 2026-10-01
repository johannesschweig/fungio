-- Lookup index for "photos of fungus X" / "first photo of fungus X" (ORDER BY id).
-- Without it every nested photosCollection and the photo_url subquery in
-- fungi_seasonal scanned the whole photos table (~130k rows, ~20-360 ms per fungus).
CREATE INDEX IF NOT EXISTS photos_fungi_id_id_idx
  ON public.photos (fungi_id, id);
