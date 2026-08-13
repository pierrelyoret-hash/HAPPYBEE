-- HAPPYBEE — reste de L2 (photos), F2.3/L2.9
-- Bucket privé : les photos de rucher sont des données personnelles de
-- l'exploitant, pas de contenu public. Accès via URL signée à la demande.
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

-- Mono-utilisateur (jumelage par appareil, un seul compte technique) : la
-- politique se limite à "authentifié", plutôt qu'un rapprochement sur la
-- colonne owner/owner_id de storage.objects, dont le nom a changé entre
-- versions de Supabase — inutile de parier dessus pour un seul compte.
alter table storage.objects enable row level security;

drop policy if exists "photos_owner" on storage.objects;
create policy "photos_owner" on storage.objects for all
  using (bucket_id = 'photos' and auth.role() = 'authenticated')
  with check (bucket_id = 'photos' and auth.role() = 'authenticated');
