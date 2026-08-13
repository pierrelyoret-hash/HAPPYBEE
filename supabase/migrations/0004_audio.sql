-- HAPPYBEE — reste de L2 (dictée vocale), L2.3/L2.4/L2.8
-- Même schéma que photo (métadonnées synchronisées, octet à part) et même
-- bucket privé que photos (données personnelles, pas de contenu public).
create table if not exists audio (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  colonie_id uuid references colonie(id),
  visite_id uuid references visite(id),
  fichier_local text,
  fichier_distant text,
  duree_secondes integer,
  transcription_brute text,
  statut_sync text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

alter table audio enable row level security;
drop policy if exists "audio_owner" on audio;
create policy "audio_owner" on audio for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('audio', 'audio', false)
on conflict (id) do nothing;

alter table storage.objects enable row level security;
drop policy if exists "audio_owner" on storage.objects;
create policy "audio_owner" on storage.objects for all
  using (bucket_id = 'audio' and auth.role() = 'authenticated')
  with check (bucket_id = 'audio' and auth.role() = 'authenticated');
