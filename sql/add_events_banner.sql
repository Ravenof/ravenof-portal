-- Renginių banerio stulpelis.
-- Paleisti Supabase SQL Editor lange (Run).
alter table events
  add column if not exists banner_url text;
