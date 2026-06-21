@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/admin/GameplayConfigEditor.tsx git-commit198.bat
git commit -m "feat(admin/aura): Burtu zala +X (auraSpellDamage) + tik tipui perkelta i pagrindini Pasyvi aura bloka (salia +ATK/+HP/scope/frakcija); itraukta i auraOn; pasalintas dublikatas is Pranasumas bloko"
git push
) > commit198.log 2>&1
