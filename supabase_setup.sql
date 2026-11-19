-- ═══════════════════════════════════════════════════
--  POS · Sol Latino & Licores San Pedro
--  Ejecuta este SQL en el SQL Editor de Supabase
-- ═══════════════════════════════════════════════════

-- ── PRODUCTOS ──────────────────────────────────────
create table if not exists productos (
  id          text primary key,
  co          text not null check (co in ('sol','lic')),
  bc          text not null unique,
  name        text not null,
  cat         text not null default 'otros',
  price       numeric(10,2) not null default 0,
  cost        numeric(10,2) default 0,
  stock       integer not null default 0,
  min         integer not null default 5,
  emoji       text default '📦',
  description text,
  last_sale       timestamptz,
  last_movement   timestamptz,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── CLIENTES ───────────────────────────────────────
create table if not exists clientes (
  id          text primary key,
  name        text not null,
  email       text,
  phone       text,
  nif         text,
  addr        text,
  total_buy   numeric(10,2) default 0,
  last_buy    timestamptz,
  created_at  timestamptz default now()
);

-- ── VENTAS ─────────────────────────────────────────
create table if not exists ventas (
  id          text primary key,
  inv_num     text not null,
  co          text not null check (co in ('sol','lic')),
  client_id   text references clientes(id) on delete set null,
  client_name text default 'Genérico',
  items       jsonb not null default '[]',
  sub         numeric(10,2) default 0,
  disc        numeric(10,2) default 0,
  dp          numeric(5,2) default 0,
  tax         numeric(10,2) default 0,
  tot         numeric(10,2) default 0,
  pay         text default 'efectivo',
  cash_rec    numeric(10,2),
  ts          timestamptz default now()
);

-- ── TRAZAS ─────────────────────────────────────────
create table if not exists trazas (
  id          text primary key,
  type        text not null,
  co          text not null,
  descripcion text not null,
  detail      text,
  ts          timestamptz default now()
);

-- ── CONFIG ─────────────────────────────────────────
create table if not exists config (
  key   text primary key,
  value text
);

-- Valores iniciales de config
insert into config (key, value) values
  ('footSol', '¡Gracias por tu visita! · El Sol Latino'),
  ('footLic', '¡Vuelve pronto! · Licores San Pedro')
on conflict (key) do nothing;

-- ── RLS: acceso público (anon key) ─────────────────
alter table productos enable row level security;
alter table clientes  enable row level security;
alter table ventas    enable row level security;
alter table trazas    enable row level security;
alter table config    enable row level security;

-- Policies: lectura y escritura para anon
create policy "anon_all_productos" on productos for all to anon using (true) with check (true);
create policy "anon_all_clientes"  on clientes  for all to anon using (true) with check (true);
create policy "anon_all_ventas"    on ventas    for all to anon using (true) with check (true);
create policy "anon_all_trazas"    on trazas    for all to anon using (true) with check (true);
create policy "anon_all_config"    on config    for all to anon using (true) with check (true);
