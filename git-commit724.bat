@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/components/digital/DigitalDeckBuilder.tsx src/lib/version.ts git-commit724.bat
git commit -m "724: Deck builder hover preview didesnis - iki 380px plocio (apie 62 proc. ekrano auksco), 800px paveikslas, didesnis pavadinimas; rodomas toje puseje kur daugiau vietos" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01JMitPggicCjMqQoG7n1BWv"
git push
git log -1 --oneline
) > commit724.log 2>&1
