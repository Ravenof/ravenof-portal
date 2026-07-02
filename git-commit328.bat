@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/components/digital/DigitalCollection.tsx
git commit -m "feat(ui): Kolekcija perdaryta i kortu KNYGA (main menu dark-fantasy stilius). 9 kortos puslapyje (3x3) su 3D puslapio vertimo animacija (framer-motion rotateY + playCardFlip garsas) - montuojama tik 9 GameCard vienu metu, greitesnis krovimas + lazy img. Knygos remas: oktagono aukso viršelis + 'lapu' sluoksniai uz nugaros, puslapio numeris ir rodykles knygos apacioje, swipe kaire/desine verčia puslapi. Filtrai: frakcija/retumas/tipas + NAUJAS rikiavimas (kaina auk/maz, pavadinimas, retumas, turimos pirma) + paieska + tik turimos; filtrą pakeitus grizta i 1 psl. Islaikyta: pack chooser/PackOpen/preview modalas/empty states. tsc+eslint svarus"
git push
git log -1 --oneline
) > commit328.log 2>&1
