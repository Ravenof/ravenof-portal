-- ════════════════════════════════════════════════════════════════════════════
-- Kampanijos story-kaladėse panaudoti JAU EGZISTUOJANČIAS veikėjų kortas
-- (vietoj VRN dublikatų), kur jos yra teisingoje frakcijoje:
--   Gunteris    → „Gunteris Narsusis"   (sviesos-pulkas/Sviesos_Pulkas_233)
--   Doriana     → „Doriana Ugningoji"   (sviesos-pulkas/Sviesos_Pulkas_236)
--   Alarikas    → „Alarikas Teisusis"   (sviesos-pulkas/Sviesos_Pulkas_234)
--   Konstancijus→ „Tėvas Konstancijus"  (inkvizicijos-legionas/Inkvizicijos_legionas_285)
-- Lieka VRN (esamų nėra arba prequel-kanonas): Prazaras(VRN-001 žmogus), Madelius,
-- Eleonora, Saldas, Ema, Tautvydas + generiniai gynėjai. Belzatoras/demonai jau
-- naudojami per Demonų ordos frakciją (VRN demonai paslėpti).
-- Idempotentiška.
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare m record; v_old uuid; v_new uuid;
begin
  for m in
    select * from (values
      ('VRN-020','sviesos-pulkas/Sviesos_Pulkas_233'),
      ('VRN-022','sviesos-pulkas/Sviesos_Pulkas_236'),
      ('VRN-021','sviesos-pulkas/Sviesos_Pulkas_234'),
      ('VRN-018','inkvizicijos-legionas/Inkvizicijos_legionas_285')
    ) as t(vrn, existing)
  loop
    select id into v_old from public.cards where card_number = m.vrn;
    select id into v_new from public.cards where card_number = m.existing;
    if v_old is null or v_new is null then continue; end if;

    -- jei kaladėje jau yra esama korta — pašalinam VRN dublį (kad nebūtų PK konflikto)
    delete from public.deck_cards dc
      where dc.card_id = v_old
        and dc.deck_id in (select id from public.decks where name like '[Kampanija]%')
        and exists (select 1 from public.deck_cards d2 where d2.deck_id = dc.deck_id and d2.card_id = v_new);

    -- likusius VRN įrašus perrašom į esamą kortą
    update public.deck_cards dc
      set card_id = v_new
      where dc.card_id = v_old
        and dc.deck_id in (select id from public.decks where name like '[Kampanija]%');
  end loop;
end $$;
