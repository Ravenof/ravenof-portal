@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add supabase/migrations/20260924_rewards_boost_v3.sql scripts/progression-check.mjs src/lib/progression/types.ts src/app/admin/shop/AdminShopClient.tsx git-commit700.bat
git commit -m "700: atlygiu kelimas v3 - dienos uzduotys 150/275/450, skrynia 700 sid + 2 rubinai, login v3 lentele, ranked pergale 100, sezono XP 1500/lvl, boosteris 600" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_015TLWcibxvH546P5Uog8kPs"
git push
git log -1 --oneline
) > commit700.log 2>&1
