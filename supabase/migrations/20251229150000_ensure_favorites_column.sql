-- Ensure favorites column exists on listings table
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS favorites INTEGER DEFAULT 0;

-- If the migration already added favorites_count, sync it to favorites
UPDATE public.listings 
SET favorites = COALESCE(favorites_count, 0) 
WHERE favorites = 0 AND COALESCE(favorites_count, 0) > 0;

-- Create or replace trigger to keep favorites column in sync with favorites table
CREATE OR REPLACE FUNCTION sync_favorites_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.listings 
        SET favorites = (SELECT COUNT(*) FROM public.favorites WHERE listing_id = NEW.listing_id)
        WHERE id = NEW.listing_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.listings 
        SET favorites = GREATEST(0, (SELECT COUNT(*) FROM public.favorites WHERE listing_id = OLD.listing_id))
        WHERE id = OLD.listing_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger if it exists
DROP TRIGGER IF EXISTS trg_favorites_count ON public.favorites;

-- Create new trigger
CREATE TRIGGER trg_sync_favorites
AFTER INSERT OR DELETE ON public.favorites
FOR EACH ROW EXECUTE FUNCTION sync_favorites_count();
