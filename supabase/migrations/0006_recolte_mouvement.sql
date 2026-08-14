-- HAPPYBEE — lot L3 (récoltes, mouvements), cahier des charges §4.2/M4/M7
-- Additive uniquement : aucune table existante n'est modifiée. Même
-- convention que 0001_init.sql (user_id + RLS scopée à auth.uid()).

create table if not exists recolte (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  colonie_id uuid references colonie(id),
  date date,
  produit text,
  mode_saisie text,
  poids_brut double precision,
  tare_hausse double precision,
  nb_hausses integer,
  nb_cadres integer,
  ratio_remplissage_pct double precision,
  poids_net double precision,
  type_miellee text,
  notes text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table if not exists mouvement (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  ruche_id uuid references ruche(id),
  colonie_id uuid references colonie(id),
  date date,
  type text,
  rucher_origine_id uuid references rucher(id),
  rucher_destination_id uuid references rucher(id),
  motif text,
  notes text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'recolte', 'mouvement'
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
