@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add supabase/migrations/20260925_bots_humanlike.sql src/lib/ranked/bots.ts src/lib/ranked/client.ts src/components/digital/ranked/RankedQueue.tsx src/components/digital/ranked/RankedClient.tsx src/components/digital/DigitalPvP.tsx src/components/tutorial/TutorialGame.tsx src/locales/lt/battle.json src/locales/en/battle.json src/lib/version.ts git-commit703.bat
git commit -m "703: botai kaip zaidejai - tikri avatarai vietoj emoji, sunkumas pagal ranga (top10 hard / vid5 normal / zem5 easy), matchmaking laukimas atsitiktinis 50-110s (ranked + draugiska greita kova), botai atsako chate (labas/gl/gg)" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_015TLWcibxvH546P5Uog8kPs"
git push
git log -1 --oneline
) > commit703.log 2>&1
