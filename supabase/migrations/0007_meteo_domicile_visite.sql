-- HAPPYBEE — extension F2.4 (15/08/2026, arbitrage §18/§19 cahier des charges)
-- Capture automatique du relevé Netatmo extérieur sur une visite, pour le
-- rucher marqué comme celui où se trouve la station personnelle.
-- Additive uniquement, aucune donnée existante affectée.
alter table rucher add column if not exists station_meteo_ici boolean;
alter table visite add column if not exists meteo_domicile jsonb;
