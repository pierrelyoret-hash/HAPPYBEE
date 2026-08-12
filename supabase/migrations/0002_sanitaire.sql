-- HAPPYBEE — lot L2.2 (sanitaire), brief_L2.2_sanitaire.md §3
-- Additive uniquement : aucune table existante n'est modifiée. Même
-- convention que 0001_init.sql (user_id + RLS scopée à auth.uid()).

create table if not exists traitement (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  colonie_id uuid references colonie(id),
  date_debut date,
  date_fin date,
  produit text,
  numero_amm text,
  numero_lot text,
  dosage text,
  voie text,
  motif text,
  delai_attente_jours integer,
  date_fin_delai_attente date,
  ordonnance_document_id uuid,
  conforme_bio boolean,
  notes text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table if not exists comptage_varroa (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  colonie_id uuid references colonie(id),
  date date,
  methode text,
  duree_jours integer,
  nb_varroas integer,
  varroas_par_jour double precision,
  niveau_alerte text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table if not exists nourrissement (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  colonie_id uuid references colonie(id),
  date date,
  type text,
  quantite double precision,
  unite text,
  composition text,
  origine_produit text,
  notes text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

-- Schéma minimal (F3.6) — dans ce lot, uniquement le rattachement d'un
-- fichier à un traitement via traitement.ordonnance_document_id.
create table if not exists document (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  type text,
  date date,
  fichier text,
  libelle text,
  entite_liee_type text,
  entite_liee_id uuid,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'traitement', 'comptage_varroa', 'nourrissement', 'document'
  ])
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_owner', t);
    execute format(
      'create policy %I on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t || '_owner', t
    );
  end loop;
end $$;
