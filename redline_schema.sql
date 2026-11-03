-- REDLINE GARAGE — SUPABASE DATABASE + RLS + STORAGE + REALTIME
-- Run this entire file in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  permanent_address text,
  temporary_address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cars (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  manufacturer text not null,
  model text,
  year integer,
  horsepower integer,
  value numeric(12,2) not null default 0,
  tag text default 'COLLECTIBLE',
  description text,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.auctions (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,
  car_id uuid not null references public.cars(id) on delete cascade,
  title text not null,
  starting_bid numeric(12,2) not null default 0,
  current_bid numeric(12,2) not null default 0,
  min_increment numeric(12,2) not null default 1,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  status text not null default 'live' check (status in ('scheduled','live','ended','cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions(id) on delete cascade,
  bidder_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text,
  type text not null default 'info',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  car_id uuid not null references public.cars(id) on delete restrict,
  full_name text not null,
  phone text not null,
  shipping_address text not null,
  pin_code text not null,
  status text not null default 'pending' check (status in ('pending','confirmed','shipped','delivered','cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists cars_owner_id_idx on public.cars(owner_id);
create index if not exists auctions_status_ends_idx on public.auctions(status, ends_at);
create index if not exists bids_auction_id_idx on public.bids(auction_id);
create index if not exists bids_bidder_id_idx on public.bids(bidder_id);
create index if not exists notifications_user_id_read_idx on public.notifications(user_id, read);
create index if not exists orders_buyer_id_idx on public.orders(buyer_id);

-- Keep updated_at current.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Create a profile automatically whenever a Supabase Auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'username',''),
    nullif(new.raw_user_meta_data->>'display_name','')
  )
  on conflict (id) do update set
    username = coalesce(excluded.username, profiles.username),
    display_name = coalesce(excluded.display_name, profiles.display_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Atomic bid placement. Never trust the browser to update current_bid directly.
create or replace function public.place_bid(p_auction_id uuid, p_amount numeric)
returns public.bids
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.auctions;
  b public.bids;
  uid uuid := auth.uid();
  minimum numeric;
begin
  if uid is null then
    raise exception 'You must be signed in to bid.';
  end if;

  select * into a
  from public.auctions
  where id = p_auction_id
  for update;

  if not found then raise exception 'Auction not found.'; end if;
  if a.seller_id = uid then raise exception 'You cannot bid on your own auction.'; end if;
  if a.status <> 'live' then raise exception 'This auction is not live.'; end if;
  if now() < a.starts_at then raise exception 'This auction has not started.'; end if;
  if now() >= a.ends_at then raise exception 'This auction has ended.'; end if;

  minimum := greatest(a.starting_bid, a.current_bid + a.min_increment);
  if p_amount < minimum then
    raise exception 'Minimum accepted bid is %.', minimum;
  end if;

  insert into public.bids (auction_id, bidder_id, amount)
  values (a.id, uid, p_amount)
  returning * into b;

  update public.auctions
  set current_bid = p_amount
  where id = a.id;

  insert into public.notifications(user_id, title, message, type)
  values (uid, 'Bid placed', 'Your bid was accepted at ₹' || to_char(p_amount, 'FM9999999990.00'), 'success');

  if a.seller_id <> uid then
    insert into public.notifications(user_id, title, message, type)
    values (a.seller_id, 'New bid', 'Your auction received a new bid.', 'info');
  end if;

  return b;
end;
$$;

-- End expired auctions safely.
create or replace function public.settle_expired_auctions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare changed integer;
begin
  update public.auctions
  set status = 'ended'
  where status in ('scheduled','live') and ends_at <= now();
  get diagnostics changed = row_count;
  return changed;
end;
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.cars enable row level security;
alter table public.auctions enable row level security;
alter table public.bids enable row level security;
alter table public.notifications enable row level security;
alter table public.orders enable row level security;

drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles for select to authenticated using (id = auth.uid());

drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert on public.profiles for insert to authenticated with check (id = auth.uid());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists cars_public_select on public.cars;
create policy cars_public_select on public.cars for select to authenticated using (true);

drop policy if exists cars_owner_insert on public.cars;
create policy cars_owner_insert on public.cars for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists cars_owner_update on public.cars;
create policy cars_owner_update on public.cars for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists cars_owner_delete on public.cars;
create policy cars_owner_delete on public.cars for delete to authenticated using (owner_id = auth.uid());

drop policy if exists auctions_public_select on public.auctions;
create policy auctions_public_select on public.auctions for select to authenticated using (true);

drop policy if exists auctions_owner_insert on public.auctions;
create policy auctions_owner_insert on public.auctions for insert to authenticated with check (seller_id = auth.uid());

drop policy if exists auctions_owner_update on public.auctions;
create policy auctions_owner_update on public.auctions for update to authenticated using (seller_id = auth.uid()) with check (seller_id = auth.uid());

drop policy if exists bids_select_own on public.bids;
create policy bids_select_own on public.bids for select to authenticated using (bidder_id = auth.uid());

drop policy if exists bids_insert_own on public.bids;
create policy bids_insert_own on public.bids for insert to authenticated with check (bidder_id = auth.uid());

drop policy if exists notifications_own on public.notifications;
create policy notifications_own on public.notifications for select to authenticated using (user_id = auth.uid());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists orders_own_select on public.orders;
create policy orders_own_select on public.orders for select to authenticated using (buyer_id = auth.uid());

drop policy if exists orders_own_insert on public.orders;
create policy orders_own_insert on public.orders for insert to authenticated with check (buyer_id = auth.uid());

-- Storage bucket for car images.
insert into storage.buckets (id, name, public)
values ('car-images', 'car-images', true)
on conflict (id) do update set public = true;

drop policy if exists car_images_public_read on storage.objects;
create policy car_images_public_read on storage.objects for select to public
using (bucket_id = 'car-images');

drop policy if exists car_images_user_upload on storage.objects;
create policy car_images_user_upload on storage.objects for insert to authenticated
with check (bucket_id = 'car-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists car_images_user_update on storage.objects;
create policy car_images_user_update on storage.objects for update to authenticated
using (bucket_id = 'car-images' and owner_id = auth.uid())
with check (bucket_id = 'car-images' and owner_id = auth.uid());

drop policy if exists car_images_user_delete on storage.objects;
create policy car_images_user_delete on storage.objects for delete to authenticated
using (bucket_id = 'car-images' and owner_id = auth.uid());

-- Realtime for live auction UI.
alter table public.auctions replica identity full;
alter table public.bids replica identity full;
alter table public.notifications replica identity full;

do $$
begin
  begin alter publication supabase_realtime add table public.auctions; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.bids; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.notifications; exception when duplicate_object then null; end;
end $$;

-- Grants needed by the browser client for the exposed API.
grant usage on schema public to anon, authenticated;
grant select on public.cars, public.auctions to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert on public.cars to authenticated;
grant select, insert, update on public.auctions to authenticated;
grant select, insert on public.bids to authenticated;
grant select, update on public.notifications to authenticated;
grant select, insert on public.orders to authenticated;
grant execute on function public.place_bid(uuid,numeric) to authenticated;
grant execute on function public.settle_expired_auctions() to authenticated;

-- Return aggregate bid counts without exposing individual bids through RLS.
create or replace function public.get_auction_bid_counts()
returns table (auction_id uuid, bid_count bigint)
language sql
security definer
set search_path = public
as $$
  select b.auction_id, count(*)::bigint
  from public.bids b
  group by b.auction_id;
$$;

grant execute on function public.get_auction_bid_counts() to authenticated;
