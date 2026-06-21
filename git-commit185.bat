@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add supabase/migrations/20260623_ranked_fixes.sql git-commit185.bat
git commit -m "fix(ranked): xp_transactions CHECK kuriamas dinamiskai (visos jau esancios source_type reiksmes + ranked_*), kad nepazeistu egzistuojanciu eiluciu - migracija praeina iki galo"
git push
) > commit185.log 2>&1
