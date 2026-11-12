-- Frakciju ikonos: DB rode i pieštų emblemų rinkini (/icons/factions), kuris
-- neatitinka tikru frakciju simboliu (kortos, taisykles, kaladziu kurimas).
-- Perjungiam i kanonini rinkini /ravenof-ui/factions/<slug>.png.
update public.factions
   set icon_url = '/ravenof-ui/factions/' || slug || '.png'
 where slug in ('mirties-marsas','plesiku-naktis','vryhioko-gauja','demonu-orda',
                'inkvizicijos-legionas','sviesos-pulkas','mistikos-melodija','rytu-vejas','universalus');
