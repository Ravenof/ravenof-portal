@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add supabase/migrations/20260618_booster_rarity.sql src/lib/economy.ts src/components/digital/DigitalHub.tsx src/components/digital/DigitalAlbum.tsx git-commit142.bat
git commit -m "feat(digital): boosteriu retumo sistema - 2 boosteriai (Gerio gynejai / Tamsos aliansas) su frakciju ribojimu (pack_factions), slotu retumas rvn_open_pack_v3 (kortos 1-9 12/9/6/3/1, korta 10 Unikalus+ 6/3/1); parduotuve rodo abu, albume booster pasirinkimas"
git push
) > commit142.log 2>&1
