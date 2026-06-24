@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add supabase/migrations/20260629_booster_rarity_v2.sql git-commit221.bat
git commit -m "feat(booster): nauja 10 kortu retumo struktura (slotai 1-5 Paprastas, 6-7 Magiskas, 8 wildcard 60/30/8/1/1, 9 65/25/8/2, 10 garant. Unikalus+ 82/15/3) - rvn_open_pack_v3 abiem boosteriams"
git push
) > commit221.log 2>&1
