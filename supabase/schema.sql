-- ---------- Tabelas ----------

create table if not exists public.keys (
  id          bigint generated always as identity primary key,
  code        text not null,
  description text not null,
  status      text not null default 'available'
              check (status in ('available', 'withdrawn')),
  created_at  timestamptz not null default now(),
  created_by  uuid default auth.uid() references auth.users(id) on delete set null
);

create unique index if not exists keys_code_unique
  on public.keys (upper(code));

create table if not exists public.people (
  id         bigint generated always as identity primary key,
  name       text not null,
  phone      text,
  email      text,
  created_at timestamptz not null default now()
);

create table if not exists public.key_movements (
  id         bigint generated always as identity primary key,
  key_id     bigint not null references public.keys(id) on delete cascade,
  person_id  bigint references public.people(id) on delete set null,
  type       text not null check (type in ('withdrawal', 'return')),
  notes      text,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null
);

create index if not exists key_movements_key_id_idx
  on public.key_movements (key_id);
create index if not exists key_movements_created_at_idx
  on public.key_movements (created_at desc);

-- Apenas usuários autenticados (logados) acessam os dados.

alter table public.keys           enable row level security;
alter table public.people         enable row level security;
alter table public.key_movements  enable row level security;

drop policy if exists "keys_authenticated_all" on public.keys;
create policy "keys_authenticated_all" on public.keys
  for all to authenticated using (true) with check (true);

drop policy if exists "people_authenticated_all" on public.people;
create policy "people_authenticated_all" on public.people
  for all to authenticated using (true) with check (true);

drop policy if exists "movements_authenticated_all" on public.key_movements;
create policy "movements_authenticated_all" on public.key_movements
  for all to authenticated using (true) with check (true);
