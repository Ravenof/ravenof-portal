@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/digital/Flames.tsx src/components/digital/DigitalCollection.tsx src/components/tutorial/ArenaBackground.tsx src/components/tutorial/TutorialGame.tsx git-commit255.bat
git commit -m "revert(perf): atstatyti optimizacijos commitai 252-254 i 251 (boosteriu fix) busena. Flames/ArenaBackground/DigitalCollection/TutorialGame grazinti i 251 versija (be will-change regresijos, be GameCard removal, be demo-only fetch). Visi ankstesni feature'ai (blessed, zetonu ikonos, draw anim, ZMK shatter, chat, pickers) islieka. Toliau optimizuosim atsargiai po viena."
git push
) > commit255.log 2>&1
