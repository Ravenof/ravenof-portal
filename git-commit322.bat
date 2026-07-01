@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add src/components/digital/ui/HubKit.tsx
git add src/components/digital/DigitalAlbum.tsx
git add src/components/digital/DigitalCollection.tsx
git add src/components/social/FriendsClient.tsx
git add git-commit322.bat
echo === Commit ===
git commit -m "feat(retention #5): premium tuscios busenos su CTA. HubKit: pernaudojamas EmptyState (svytintis ikonas + antraste + CTA mygtukas/nuoroda). Album tuscias -> 'Atplesk pakuote' arba 'I parduotuve'. Kolekcija: ownedOnly tuscia -> 'Atplesti pakuote' (openPacks), filtrai tuscia -> svelnus 'Nieko nerasta'. Draugai tuscia -> 'Prideti drauga' fokusuoja vardo lauka. tsc svarus."
echo === Push ===
git push
echo.
echo ============= BAIGTA. Ziurek ar nera klaidu. =============
pause
