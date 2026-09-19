-- ── Tutorial kortos matomos VISIEMS žaidėjams (bug #3 „Nėra kortų", 2026-09-18) ──
-- Priežastis: TUT-### kortos turi status='hidden' (kad nesimatytų kolekcijoje), o `cards`
-- RLS politikos (cards_select, Admin read cards) leidžia skaityti tik status='active' ARBA
-- adminui. Todėl adminams tutorial'as veikė, o paprastam žaidėjui CardPool grįždavo tuščias
-- → nei rankos, nei kaladės, nei priešo kortų.
-- Kolekcija / deck builder / turgus ir toliau filtruoja status='active', tad TUT kortos
-- ten neatsiras. Idempotentiška.
drop policy if exists cards_select_tutorial on public.cards;
create policy cards_select_tutorial on public.cards
  for select to anon, authenticated
  using (card_number like 'TUT-%');

-- Patikra: turi būti 5 eilutės, tarp jų cards_select_tutorial
select policyname, cmd, qual from pg_policies where tablename = 'cards' order by 1;
