
-- SIGMA KEY ARENA
-- Run in the Supabase SQL Editor.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Player',
  best_wpm integer not null default 0,
  best_score integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'waiting'
    check (status in ('waiting', 'running', 'finished')),
  max_players integer not null default 4
    check (max_players = 4),
  target_text text not null,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  winner_id uuid references public.profiles(id)
);

create table if not exists public.match_players (
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  wpm integer not null default 0,
  accuracy numeric(5,2) not null default 0,
  score integer not null default 0,
  finished boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (match_id, player_id)
);

alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;

create policy "Profiles visible to authenticated users"
on public.profiles for select to authenticated
using (true);

create policy "Players create their own profile"
on public.profiles for insert to authenticated
with check (auth.uid() = id);

create policy "Players update their own profile"
on public.profiles for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Authenticated users can view matches"
on public.matches for select to authenticated
using (true);

create policy "Authenticated users can view match players"
on public.match_players for select to authenticated
using (true);

-- IMPORTANT:
-- Do not add unrestricted client insert/update policies for match scores.
-- Production matchmaking, room capacity, score validation and winner
-- selection should be performed by trusted server-side functions.
-- Never put the Supabase service-role key in browser JavaScript.
