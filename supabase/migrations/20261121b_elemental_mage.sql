-- Stygų magė → Stichijų magė (v821). Tas pats avataras (id av_stygu_mage ir failai lieka –
-- kas jį turi, tas pasilieka), keičiasi tik vardas ir aprašymas. Idempotentiška.
update public.cosmetics
   set name = 'Stichijų magė',
       description = 'Stichijų valdovė: ugnis, ledas ir žaibas klauso vieno jos žodžio.',
       emoji = '⚡', updated_at = now()
 where id = 'av_stygu_mage';

insert into public.content_translations (owner_type, owner_id, locale, field, value) values
  ('cosmetic','av_stygu_mage','en','name','Elemental Mage'),
  ('cosmetic','av_stygu_mage','en','description','Mistress of the elements: fire, ice and lightning answer to a single word from her.')
on conflict (owner_type, owner_id, locale, field) do update set value = excluded.value;

update public.shop_items
   set name = 'Stichijų magė',
       description = 'Stichijų valdovė: ugnis, ledas ir žaibas klauso vieno jos žodžio.',
       updated_at = now()
 where slug = 'av_stygu_mage';
