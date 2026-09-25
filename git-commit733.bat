@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/app/digital/layout.tsx src/components/digital/DigitalHub.tsx tsconfig.check.scene.json src/lib/version.ts git-commit733.bat
git commit -m "733: Formato jungiklis (ZMK / Klasika) perkeltas i virsutine juosta tarp zaidejo ir valiutu (tik pradzios ekrane; desktop - tab'ai, mobile - chip), is hub'o pasalinta tab'u eilute ir papildomas tekstas" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01JMitPggicCjMqQoG7n1BWv"
git push
git log -1 --oneline
) > commit733.log 2>&1
