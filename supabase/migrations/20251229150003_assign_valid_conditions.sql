-- Assign conditions to all products randomly
-- This ensures all products have valid conditions

-- Update all products with NULL condition to have a random valid condition
UPDATE public.listings 
SET condition = (ARRAY['new', 'like-new', 'used'])[floor(random() * 3) + 1]
WHERE condition IS NULL OR condition NOT IN ('new', 'like-new', 'used');

-- Update any remaining invalid conditions
UPDATE public.listings 
SET condition = 'new'
WHERE condition NOT IN ('new', 'like-new', 'used');
