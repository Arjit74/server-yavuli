alter table public.listings add column if not exists college_name text;
alter table public.listings add column if not exists why_selling text;
alter table public.listings add column if not exists age_of_item text;
alter table public.listings add column if not exists original_price numeric;
alter table public.listings add column if not exists location_city text;