-- Clear existing listings and favorites
DELETE FROM public.favorites;
DELETE FROM public.listings;

-- Insert fresh sample listings
-- Note: Replace 'REPLACE_WITH_USER_ID' with a real user UUID if needed, 
-- but these will be assigned to a default user or the first user found.

DO $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get the first available user ID
    SELECT id INTO v_user_id FROM public.users LIMIT 1;
    
    -- If no user exists, we can't insert listings with FK
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'No user found in public.users. Please sign up first.';
    ELSE
        INSERT INTO public.listings (user_id, title, description, category, price, condition, location, images, status)
        VALUES 
        (v_user_id, 'iPhone 13 Pro - Graphite', 'Slightly used iPhone 13 Pro, 256GB, graphite color. Excellent condition with original box.', 'Electronics', 65000, 'like-new', 'Delhi', ARRAY['https://images.unsplash.com/photo-1632661674596-df8be070a5c5?q=80&w=1000&auto=format&fit=crop'], 'active'),
        
        (v_user_id, 'Engineering Mathematics - HK Dass', 'Latest edition, very helpful for semester exams. No marks or highlights.', 'Books & Study Material', 450, 'new', 'Mumbai', ARRAY['https://images.unsplash.com/photo-1543004629-141a44569ee8?q=80&w=1000&auto=format&fit=crop'], 'active'),
        
        (v_user_id, 'Ergonomic Office Chair', 'Breathable mesh back, adjustable height and armrests. Perfect for long study sessions.', 'Furniture', 4500, 'used', 'Bangalore', ARRAY['https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?q=80&w=1000&auto=format&fit=crop'], 'active'),
        
        (v_user_id, 'Nike Air Max 270', 'Original Nike shoes, size UK 9. Only worn twice, looks brand new.', 'Clothing', 5500, 'like-new', 'Pune', ARRAY['https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1000&auto=format&fit=crop'], 'active'),
        
        (v_user_id, 'Guitar Lessons for Beginners', 'Professional guitar teacher offering 1-on-1 lessons. 5 years of experience.', 'Services', 800, 'new', 'Chennai', ARRAY['https://images.unsplash.com/photo-1510915361894-db8b60106cb1?q=80&w=1000&auto=format&fit=crop'], 'active'),
        
        (v_user_id, 'Wilson Tennis Racket', 'Professional grade tennis racket, lightweight and durable. Includes cover.', 'Sports & Outdoors', 2200, 'used', 'Hyderabad', ARRAY['https://images.unsplash.com/photo-1617083266333-5a5050febead?q=80&w=1000&auto=format&fit=crop'], 'active'),
        
        (v_user_id, 'Casio Digital Keyboard', '61 keys, multiple instrument voices and rhythms. Great for intermediate players.', 'Music & Instruments', 12000, 'like-new', 'Kolkata', ARRAY['https://images.unsplash.com/photo-1520529611473-d58ff3f47a3e?q=80&w=1000&auto=format&fit=crop'], 'active'),
        
        (v_user_id, 'MacBook Air M1', '8GB RAM, 256GB SSD. Space Grey. 1 year old, very well maintained.', 'Electronics', 55000, 'like-new', 'Delhi', ARRAY['https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=1000&auto=format&fit=crop'], 'active'),
        
        (v_user_id, 'The Alchemist - Paulo Coelho', 'Classic novel, must read. Paperback in good condition.', 'Books & Study Material', 150, 'used', 'Mumbai', ARRAY['https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=1000&auto=format&fit=crop'], 'active'),
        
        (v_user_id, 'Levi''s 511 Slim Fit Jeans', 'Size 32, dark blue. Brand new with tags.', 'Clothing', 1800, 'new', 'Bangalore', ARRAY['https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=1000&auto=format&fit=crop'], 'active');
    END IF;
END $$;
