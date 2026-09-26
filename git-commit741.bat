@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/components/tutorial/TutorialGame.tsx src/components/tutorial/TutorialButton.tsx src/lib/version.ts git-commit741.bat
git commit -m "741: Senas vedamas mokymas (GUIDED_STEPS + Nauja mechanika patarimai + mokymo auksas) tik su guided prop (portalo TutorialButton) - nebesirodo draugiskoje kovoje pries bota, turnyre, reitinge ir pan.; APP_VERSION 741" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01JoeKHRowQ9gPcXNEz1bqGE"
git push
git log -1 --oneline
) > commit741.log 2>&1
