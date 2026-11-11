@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/components/tutorial/TutorialGame.tsx src/locales/lt/navigation.json src/lib/version.ts git-commit759.bat
git commit -m "759: Kovos UI - tuscios padaru vietos tik tylus konturas (nebedominuoja arenos, tempiant korta ryskios kaip anksciau); klaidos pranesimas rodomas virs rankos, o ne ant priesininko portreto; trukstant aukso aukso skaitiklis sumirksi raudonai (ir PvP sveciui); PvE puslapio pavadinimas Kova su DI; APP_VERSION 759" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2o25PZyna3vr72EaVN"
git push
git log -1 --oneline
) > commit759.log 2>&1
