-- HAPPYBEE — schéma miroir d'IndexedDB (lot L2, synchronisation)
-- Mono-utilisateur : chaque table porte user_id, RLS scope tout à auth.uid().
-- Aucune suppression physique côté client (deleted_at) — répliqué ici tel quel.

create table if not exists rucher (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  nom text,
  commune text,
  latitude double precision,
  longitude double precision,
  altitude double precision,
  date_creation date,
  date_fermeture date,
  environnement text,
  notes text,
  ordre_tournee jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table if not exists ruche (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  rucher_id uuid references rucher(id),
  numero integer,
  type text,
  date_acquisition date,
  origine text,
  qr_code text,
  statut text,
  immobilisation_id uuid,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table if not exists colonie (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  ruche_id uuid references ruche(id),
  date_debut date,
  date_fin date,
  motif_fin text,
  origine text,
  colonie_mere_id uuid,
  race_presumee text,
  statut text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table if not exists reine (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  colonie_id uuid references colonie(id),
  annee_naissance integer,
  origine text,
  marquage_couleur text,
  marquee boolean,
  clippee boolean,
  lignee text,
  date_introduction date,
  date_fin date,
  motif_fin text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table if not exists visite (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  colonie_id uuid references colonie(id),
  date timestamptz,
  heure text,
  type text,
  nb_cadres_couvain_opercule integer,
  nb_cadres_couvain_ouvert integer,
  nb_cadres_provisions integer,
  population integer,
  reine_vue boolean,
  oeufs_vus boolean,
  temperament integer,
  batisse integer,
  cellules_royales_nb integer,
  cellules_royales_type text,
  anomalies jsonb,
  score_ponte integer,
  signes_sanitaires jsonb,
  suspicion_reglementee boolean,
  source_agregats text,
  observation_libre text,
  action_entreprise text,
  priorite text,
  suivi_prevu_le date,
  provenance_champs jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table if not exists tache (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  colonie_id uuid references colonie(id),
  rucher_id uuid references rucher(id),
  libelle text,
  date_echeance timestamptz,
  priorite text,
  origine text,
  regle_origine text,
  statut text,
  visite_declencheuse_id uuid,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

-- Table posée au schéma en L1+, sans interface avant L2 (brief L1+ §4).
create table if not exists observation_cadre (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  visite_id uuid references visite(id),
  position integer,
  face text,
  type_cadre text,
  couvain_opercule integer,
  couvain_ouvert integer,
  oeufs integer,
  miel_opercule integer,
  nectar_frais integer,
  pollen integer,
  cellules_vides integer,
  non_bati integer,
  couvain_male integer,
  score_ponte integer,
  homogeneite_stades boolean,
  miel_qualite text,
  pollen_diversite integer,
  annee_cire integer,
  etat_bati integer,
  a_reformer boolean,
  motif_reforme text,
  cellules_royales_nb integer,
  cellules_royales_type text,
  cellules_royales_pos text,
  cellules_operculees boolean,
  signes jsonb,
  test_allumette text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table if not exists photo (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  visite_id uuid references visite(id),
  observation_cadre_id uuid references observation_cadre(id),
  fichier_local text,
  fichier_distant text,
  legende text,
  prise_le timestamptz,
  latitude double precision,
  longitude double precision,
  statut_sync text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

-- RLS : chaque table n'est lisible/modifiable que par son propriétaire.
-- Un seul compte technique existe (jumelage par appareil, pas de compte visible
-- pour l'exploitant) — cette politique reste correcte si HAPPYBEE devient
-- multi-utilisateur un jour, sans rien changer ici.
-- Rejouable sans erreur : la politique est supprimée puis recréée plutôt
-- que simplement créée (CREATE POLICY n'a pas de IF NOT EXISTS en Postgres).
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'rucher', 'ruche', 'colonie', 'reine', 'visite', 'tache',
    'observation_cadre', 'photo'
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
