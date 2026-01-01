-- Normalize all condition values to only: new, like-new, used
-- This ensures data consistency

-- Update any variation of "new" to "new"
UPDATE public.listings 
SET condition = 'new' 
WHERE LOWER(TRIM(condition)) IN ('new', 'brand new', 'brand-new', 'neew', 'new ');

-- Update any variation of "like new" to "like-new"
UPDATE public.listings 
SET condition = 'like-new' 
WHERE LOWER(TRIM(condition)) IN ('like new', 'like-new', 'like  new', 'like new', 'likenew', 'nearly new', 'almost new');

-- Update any variation of "used" to "used"
UPDATE public.listings 
SET condition = 'used' 
WHERE LOWER(TRIM(condition)) IN ('used', 'pre-owned', 'preowned', 'secondhand', 'second hand', 'old');

-- Set any remaining invalid conditions to NULL so they can be reviewed
UPDATE public.listings 
SET condition = NULL 
WHERE condition NOT IN ('new', 'like-new', 'used') 
  AND condition IS NOT NULL;
