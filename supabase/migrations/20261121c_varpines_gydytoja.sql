-- Varpų gydytoja → Varpinės gydytoja (v822). Tas pats avataras (id av_varpu_gydytoja ir failai lieka),
-- keičiasi tik LT vardas. EN vardas (Bell Healer) lieka. Idempotentiška.
update public.cosmetics
   set name = 'Varpinės gydytoja', updated_at = now()
 where id = 'av_varpu_gydytoja';

update public.shop_items
   set name = 'Varpinės gydytoja', updated_at = now()
 where slug = 'av_varpu_gydytoja';
