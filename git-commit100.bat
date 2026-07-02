@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/lib/game/types.ts src/lib/game/fieldEngine.ts src/lib/tutorial/engine.ts src/components/tutorial/TutorialGame.tsx src/components/admin/GameplayConfigEditor.tsx
git commit -m "feat(game): Batch 4 UI/UX - Platusis laukas (padaru limitas 5->10), kortos hover(desktop)/palaikymas(mobile) detalus view savo+prieso, efektu glow + spalvotos busenu ikonos, taikymo etikete prie kursoriaus + mobile banner, mill pop-up animacija i kapinyna, 'Kruva'->'Kapinynas' etiketes, iPhone Safari safe-area/scroll fix"
git push
git log -1 --oneline
) > commit100.log 2>&1
