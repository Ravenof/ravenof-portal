@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/admin/GameplayConfigEditor.tsx git-commit190.bat
git commit -m "feat(admin/aura): nemirtingumo (auraImmortal) zymimasis langelis perkeltas i pagrindini Pasyvi aura bloka (matomas salia scope/frakcija/includes-self); auraOn ir clear apima auraImmortal; pasalintas dublikatas is Pranasumas bloko. Variklis jau palaiko - galioja pagal auraScope/auraFaction/auraIncludesSelf (kiti apart caster, konkreti frakcija)"
git push
) > commit190.log 2>&1
