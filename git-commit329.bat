@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/components/digital/DigitalCollection.tsx
git commit -m "feat(ui): Kolekcijos knyga v2 - be vertikalaus scroll + filtrai pop-up'e. Ekranas fiksuoto aukscio (matuojamas iki tab bar), knyga automatiskai prisitaiko prie laisvos vietos (ResizeObserver: W=min(470, plotis, (aukstis-44)/1.4)) - niekas nesislenka. Filtrai/rikiavimas perkelti i bottom-sheet pop-up (mygtukas su aktyviu filtru skaitliuku salia paieskos): frakcija/retumas/tipas/rikiavimas/tik turimos + Isvalyti + 'Rodyti N kortu'. Pakuociu CTA nebe fixed overlay, o eilute apacioje. Kortoje: nuimta aukso kainos moneta, turimu vnt. skaitliukas perkeltas i kairi virsutini kampa. tsc+eslint svarus"
git push
git log -1 --oneline
) > commit329.log 2>&1
