@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/components/tutorial/TutorialGame.tsx src/components/tutorial/BattleLayout.tsx src/components/tutorial/DesktopBattleLayout.tsx src/lib/game/timing.ts FX-ROLLBACK-IR-EFEKTU-SISTEMOS.md src/lib/version.ts git-commit707.bat
git commit -m "707: ZMK miniatiura pagaliau skrenda (data-pile truko REALIUOSE layout'uose) - skrydis 1.5s, flip, rezultatas 1.5s; raktazodzio FX pakeicia sena projektila (nebeskrenda du daiktai); + FX sistemu dokumentacija" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_015TLWcibxvH546P5Uog8kPs"
git push
git log -1 --oneline
) > commit707.log 2>&1
