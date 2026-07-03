-- AdTeam AI — esquema de persistencia en Supabase (fase 2, parte 1).
-- Ejecuta esto UNA vez en tu proyecto: Dashboard → SQL Editor → pegar → Run.
--
-- Luego configura en el servidor de AdTeam:
--   SUPABASE_URL="https://<ref>.supabase.co"
--   SUPABASE_SERVICE_KEY="<service_role key>"   (Dashboard → Settings → API)

-- 1) Snapshot del store (proyectos, calendario, programados, biblioteca, etc.)
create table if not exists public.adteam_store (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- RLS activo sin políticas: solo la service_role key del servidor puede leer
-- o escribir. La clave pública (anon) no tiene acceso.
alter table public.adteam_store enable row level security;

-- 2) Bucket público para imágenes (URLs estables para Instagram).
insert into storage.buckets (id, name, public)
values ('adteam-uploads', 'adteam-uploads', true)
on conflict (id) do nothing;
