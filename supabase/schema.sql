-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Logo creations table
create table logo_creations (
  id uuid default gen_random_uuid() primary key,
  session_id text not null,
  prompt text not null,
  aspect_ratio text default '1:1',
  resolution text default '1k',
  input_image text,
  result_image text,
  request_id text unique,
  status text default 'processing',
  credit_cost int default 18,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index idx_logo_creations_session_id on logo_creations(session_id);
create index idx_logo_creations_request_id on logo_creations(request_id);

-- Updated_at trigger function
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Updated_at trigger
create trigger set_updated_at
  before update on logo_creations
  for each row execute function set_updated_at();
