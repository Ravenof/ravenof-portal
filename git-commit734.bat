@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add apps/desktop/main.js apps/desktop/package.json src/components/tutorial/TutorialGame.tsx src/lib/version.ts git-commit734.bat
git commit -m "734: Desktop (Electron) visada pilnas ekranas, ne tik kovoje - BrowserWindow fullscreen, F11 / Alt+Enter perjungia i langa (isimenama userData/window.json), HTML5 fullscreen isejimas nebeismeta is pilno ekrano; TutorialGame desktop app'e nebekviecia requestFullscreen/exitFullscreen; desktop 0.1.2" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01JMitPggicCjMqQoG7n1BWv"
git push
git log -1 --oneline
) > commit734.log 2>&1
