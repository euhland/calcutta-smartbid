create table if not exists public.auction_sessions (
  id text primary key,
  name text not null,
  focus_syndicate_id text not null,
  operator_passcode text not null,
  viewer_passcode text not null,
  payout_rules jsonb not null,
  projection_provider text not null,
  final_four_pairings jsonb not null,
  live_state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.syndicates (
  id text primary key,
  session_id text not null references public.auction_sessions(id) on delete cascade,
  name text not null,
  color text not null,
  spend numeric not null default 0,
  remaining_bankroll numeric not null default 0,
  owned_team_ids jsonb not null default '[]'::jsonb,
  portfolio_expected_value numeric not null default 0
);

create table if not exists public.team_projections (
  id text not null,
  session_id text not null references public.auction_sessions(id) on delete cascade,
  name text not null,
  short_name text not null,
  region text not null,
  seed integer not null,
  rating numeric not null,
  offense numeric not null,
  defense numeric not null,
  tempo numeric not null,
  source text not null,
  primary key (session_id, id)
);

create table if not exists public.simulation_snapshots (
  id text primary key,
  session_id text not null references public.auction_sessions(id) on delete cascade,
  provider text not null,
  iterations integer not null,
  generated_at timestamptz not null,
  payload jsonb not null
);

create table if not exists public.purchase_records (
  id text primary key,
  session_id text not null references public.auction_sessions(id) on delete cascade,
  team_id text not null,
  buyer_syndicate_id text not null,
  price numeric not null,
  created_at timestamptz not null default now()
);

alter publication supabase_realtime add table public.auction_sessions;
alter publication supabase_realtime add table public.purchase_records;
