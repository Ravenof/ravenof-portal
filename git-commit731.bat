@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/version.ts git-commit731.bat
git commit -m "731: versijos bump - 730 buvo publikuotas pries onboarding isdestymo pataisa (dezutes dydis is konteinerio, be 3D sonu/plokstelu, centruota karusele, kompaktiskas zemas landscape), release.bat atsisake perpublikuoti ta pati numeri" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01JMitPggicCjMqQoG7n1BWv"
git push
git log -1 --oneline
) > commit731.log 2>&1
