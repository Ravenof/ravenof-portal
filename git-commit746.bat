@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/components/tutorial/TutorialGame.tsx src/lib/tutorial/engine.ts src/lib/game/effectEngine.ts scripts/simulate-no-target-summon.ts package.json src/lib/version.ts git-commit746.bat
git commit -m "746: Engine fix - kovos sauksnis su rankiniu taikiniu, kai TINKAMO taikinio nera (filtrai: potipis/frakcija/busena), nebeblokuoja iskvietimo (pvz. Dr. Krudzas be zombiu lauke); pendingBattlecry tik kai yra tinkamu taikiniu; sauksnis nebetaiko paties saves auto-pick'e; test game:test:notarget; APP_VERSION 746" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01JoeKHRowQ9gPcXNEz1bqGE"
git push
git log -1 --oneline
) > commit746.log 2>&1
