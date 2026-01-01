-- Simplified view counting function that directly increments views
-- This fixes the issue with client_ip and user_agent not being set properly

CREATE OR REPLACE FUNCTION increment_view_count(listing_id_param BIGINT, user_id_param UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    new_view_count INTEGER;
BEGIN
    -- Simply increment the views count
    UPDATE public.listings 
    SET views = views + 1 
    WHERE id = listing_id_param
    RETURNING views INTO new_view_count;
    
    -- Return the new view count
    RETURN COALESCE(new_view_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
