-- =====================================================
--  TABLA DEUDAS / CREDITO
--  Ejecutar en Supabase SQL Editor
-- =====================================================

-- Tabla principal de deudas
create table if not exists deudas (
  id            text primary key,
  co            text not null check (co in ('sol','lic')),
  client_id     text references clientes(id) on delete set null,
  client_name   text not null,
  venta_id      text references ventas(id) on delete set null,
  inv_num       text not null,
  monto_total   numeric(10,2) not null default 0,
  monto_pagado  numeric(10,2) not null default 0,
  monto_deuda   numeric(10,2) not null default 0,
  estado        text not null default 'pendiente' check (estado in ('pendiente','parcial','pagado')),
  items         jsonb not null default '[]',
  foto_url      text,
  vendedor      text,
  nota          text,
  ts_creacion   timestamptz default now(),
  ts_vencimiento timestamptz,
  ts_pagado     timestamptz,
  pagos         jsonb not null default '[]'
);

-- RLS
alter table deudas enable row level security;
create policy "anon_all_deudas" on deudas for all to anon using (true) with check (true);

-- Agregar columna saldo_deuda a clientes si no existe
alter table clientes add column if not exists saldo_deuda numeric(10,2) default 0;

-- Index para buscar por cliente
create index if not exists idx_deudas_client on deudas(client_id);
create index if not exists idx_deudas_estado on deudas(estado);
