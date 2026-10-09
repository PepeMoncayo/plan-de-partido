-- ═══════════════════════════════════════════════════════════════════
-- Plan de Partido · Esquema
-- Ejecutar en orden: 0001_schema → 0002_rls → 0003_storage (→ seed opcional)
-- ═══════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- updated_at automático
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── profiles ──────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  nombre      text,
  role        text not null default 'viewer' check (role in ('admin', 'viewer')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── teams ─────────────────────────────────────────────────────────
create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  shield_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── players ───────────────────────────────────────────────────────
create table if not exists public.players (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  position     text not null check (position in ('POR', 'DEF', 'CEN', 'DEL')),
  dorsal       integer check (dorsal between 1 and 99),
  age          integer check (age between 10 and 60),
  birth_date   date,
  height       integer check (height between 100 and 250),   -- cm
  weight       integer check (weight between 30 and 200),    -- kg
  fitness      integer not null default 80 check (fitness between 0 and 100),
  photo_url    text,
  team_id      uuid references public.teams(id) on delete set null,
  video_url    text,
  descripcion  text,
  -- { paseCorto, regate, control, visionJuego, disparo }  0–100
  con_balon    jsonb not null default '{}'::jsonb,
  -- { presion, anticipacion, marcaje, posicionamiento, recuperacion }  0–100
  sin_balon    jsonb not null default '{}'::jsonb,
  -- { velocidad, resistencia, fuerza, salto, agilidad }  0–100
  condicional  jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ─── matches ───────────────────────────────────────────────────────
create table if not exists public.matches (
  id               uuid primary key default gen_random_uuid(),
  home_team_id     uuid references public.teams(id) on delete set null,
  away_team_id     uuid references public.teams(id) on delete set null,
  home_team        text not null,
  away_team        text not null,
  home_shield_url  text,
  away_shield_url  text,
  opponent         text,
  date             date,
  competition      text not null default 'Amistoso',
  venue            text,
  status           text not null default 'Planificado'
                   check (status in ('Planificado', 'Jugado', 'Aplazado')),
  score            text,
  -- { name, style, tendencies: [] }
  referee          jsonb not null default '{}'::jsonb,

  -- Informe rival
  rival_buttons    jsonb not null default '{}'::jsonb,   -- { grupo: opción }
  rival_notes      text,
  rival_slide_url  text,
  rival_video_url  text,
  rival_extra_url  text,

  -- Alineación
  formation        text not null default '4-3-3',
  rival_formation  text,
  lineup           jsonb not null default '{}'::jsonb,   -- { spotId: playerId }

  -- Plan de partido: { ataque|defensa|transiciones: { notes, video, img1, img2, doc } }
  phases           jsonb not null default '{}'::jsonb,

  -- ABP: { ofensivo: { corners: [4], faltasLaterales: [2] },
  --        defensivo: { corner, faltaLateral, faltaFrontal } }
  -- cada tarjeta: { img1, img1Notes, img1VideoUrl, img2, img2Notes, img2VideoUrl }
  abp_data         jsonb not null default '{}'::jsonb,

  -- Vídeo y eventos
  video_url        text,
  half_times       jsonb not null default '{}'::jsonb,   -- { start1, end1, start2, end2 } en "m:ss"

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ─── match_events ──────────────────────────────────────────────────
create table if not exists public.match_events (
  id           uuid primary key default gen_random_uuid(),
  match_id     uuid not null references public.matches(id) on delete cascade,
  type         text not null check (type in ('gol', 'ocasion', 'duelo', 'nota')),
  minute       integer,
  video_time   numeric,              -- segundos en el vídeo
  note         text,
  player_id    uuid references public.players(id) on delete set null,
  player_name  text,
  field_x      numeric check (field_x between 0 and 100),
  field_y      numeric check (field_y between 0 and 100),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists match_events_match_id_idx on public.match_events (match_id);
create index if not exists players_position_idx on public.players (position);
create index if not exists matches_date_idx on public.matches (date);

-- Triggers updated_at
do $$
declare t text;
begin
  foreach t in array array['profiles', 'teams', 'players', 'matches', 'match_events'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at()', t);
  end loop;
end;
$$;

-- ─── Alta de usuario → perfil SIEMPRE como viewer ──────────────────
-- Para nombrar admin: ver README (UPDATE manual en el SQL editor).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, nombre, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)),
    'viewer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
