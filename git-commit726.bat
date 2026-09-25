@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/game/timing.ts src/components/tutorial/BattleFxLayer.tsx src/components/tutorial/TutorialGame.tsx src/lib/version.ts SOUND-AUDITAS-2026-09.md git-commit726.bat
git commit -m "726: Smugio FX optimizacija ir tvarka - daleliu glow per sprite cache (drawImage vietoj createRadialGradient kiekvienai dalelei), spinduliai be shadowBlur, keliu smugiu vienu metu daleliu dalyba, DEVASTATING 56 ziezirbu; smugio sprogimas dabar eina PO projektilo nusileidimo (padarams ir herojui), ne vietoj jo" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01JMitPggicCjMqQoG7n1BWv"
git push
git log -1 --oneline
) > commit726.log 2>&1
