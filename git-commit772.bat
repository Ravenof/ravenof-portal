@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/game/botMatchLog.ts src/components/tutorial/TutorialGame.tsx src/lib/version.ts supabase/migrations/20261112_bot_match_logs.sql git-commit772.bat
git commit -m "772: kovu pries DI zurnalas (DI gerinimui). Po kiekvienos kovos pries bota i bot_match_logs irasomas suspaustas ejimu zurnalas, busenos nuotraukos kiekvieno ejimo pradzioje (HP, auksas, boto ranka vardais, lenta), abi kalades ir DI kalades tipas. Tyliai - klaida nepaveikia kovos. Zaidejas mato tik savo irasus, adminas visus; saugoma 90 d. Migracija 20261112_bot_match_logs.sql. APP_VERSION 772" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2o25PZyna3vr72EaVN"
git push
git log -1 --oneline
) > commit772.log 2>&1
