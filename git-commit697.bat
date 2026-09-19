@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add supabase/migrations/20260920_tutorial_cards_rls.sql supabase/migrations/20260921_tutorial_real_cards.sql src/lib/tutorial2/cardPool.ts src/lib/tutorial2/lessonTypes.ts src/data/tutorialLessons/lessonSeeds.ts src/components/tutorial2/TutorialDirector.tsx src/locales/lt/onboarding.json src/locales/en/onboarding.json src/locales/lt/battle.json src/locales/en/battle.json supabase/migrations/20260922_admin_online_players.sql src/components/digital/AdminOnlineBar.tsx src/components/digital/DigitalHub.tsx src/components/digital/DigitalPvE.tsx src/lib/game/rng.ts src/lib/tutorial/ai/aiTypes.ts src/lib/tutorial/ai/aiEngine.ts src/lib/tutorial/ai/aiMaster.ts src/components/tutorial/TutorialGame.tsx src/lib/version.ts apps/desktop/package.json apps/desktop/build/installer.nsh apps/digital/baselines git-commit697.bat
git commit -m "697: APP_VERSION 697 (696 bundle jau buvo publikuotas be DI/PvE pakeitimu) + likusios 696 pataisos"
git push
git log -1 --oneline
) > commit697.log 2>&1
