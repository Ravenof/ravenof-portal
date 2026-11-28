@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add supabase/migrations/20261128_account_level_v4.sql src/lib/gamification/levels.ts src/lib/version.ts src/lib/digital/unlocks.ts src/lib/economy.ts src/lib/profile/client.ts src/components/digital/ui/LevelEmblem.tsx src/components/digital/ui/FeatureGate.tsx src/components/digital/ui/FormatSwitch.tsx src/components/digital/profile/AccountLevelScreen.tsx src/components/digital/DigitalHub.tsx src/components/digital/DigitalPvE.tsx src/components/digital/DigitalDecks.tsx src/components/digital/DigitalDeckBuilder.tsx src/components/tutorial/TutorialGame.tsx src/app/digital/layout.tsx src/locales/lt/profile.json src/locales/en/profile.json src/locales/lt/progression.json src/locales/en/progression.json src/locales/lt/battle.json src/locales/en/battle.json git-commit848.bat
git commit -m "848: paskyros lygiai v4 - nauja XP kreive, atlygiu lentele su pakopomis ir prestizo ratu, rezimu atrakinimas pagal lygi, XP uz pamokas ir pirma dienos pergale, naujas lygiu kelio ekranas, pakopos emblema" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2p52WXEcLzrz9fWNLQ"
git push
git log -1 --oneline
) > commit848.log 2>&1
