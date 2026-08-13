-- HAPPYBEE — reste de L2 (M13, observation cadre par cadre)
-- Complète le schéma observation_cadre posé au schéma seul en L1+
-- (migration 0001) : six champs du modèle complet (addendum §A.3) n'avaient
-- pas été transcrits à l'époque, faute d'interface à construire alors.
-- Additive uniquement, aucune donnée existante affectée.
alter table observation_cadre add column if not exists couvain_male_disperse boolean;
alter table observation_cadre add column if not exists couvain_bombe boolean;
alter table observation_cadre add column if not exists pollen_ancien boolean;
alter table observation_cadre add column if not exists fil_apparent boolean;
alter table observation_cadre add column if not exists ponts_de_cire boolean;
alter table observation_cadre add column if not exists moisissure boolean;
