@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add package.json scripts/simulate-tournament-bracket.ts src/components/digital/DigitalPvP.tsx src/components/digital/tournament src/components/tutorial/TutorialGame.tsx src/lib/tournament src/lib/version.ts src/locales/en/battle.json src/locales/lt/battle.json supabase/migrations/20261003_tournaments.sql git-commit740.bat
git commit -m "740: Turnyrai (draugiska kova) - double elimination 4/8/16 su grand final reset, lobby + uzpildymas botais, ready-check 60 s, ejimo laikmatis 60 s, stebejimas, atlygiai pagal vieta (economy_config tournament_rewards), migracija 20261003_tournaments.sql, test tourney:test; APP_VERSION 740" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01JoeKHRowQ9gPcXNEz1bqGE"
git push
git log -1 --oneline
) > commit740.log 2>&1
