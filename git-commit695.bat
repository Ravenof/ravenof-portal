@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add supabase/migrations/20260920_tutorial_cards_rls.sql src/lib/tutorial2/cardPool.ts src/data/tutorialLessons/lessonSeeds.ts src/components/tutorial2/TutorialDirector.tsx src/components/tutorial/TutorialGame.tsx src/lib/version.ts apps/desktop/package.json apps/desktop/build/installer.nsh apps/digital/baselines git-commit695.bat
git commit -m "695: tutorial - TUT kortu nebera, pamokos naudoja tikras kolekcijos kortas (lessonSeeds + cardPool pagal varda, cempiono faze Vardas|2), Windows installeris per-user + uzdaro Ravenof.exe (0.1.1), tutorial: padaras iskvieciamas numetus bet kur lentoje"
git push
git log -1 --oneline
) > commit695.log 2>&1
