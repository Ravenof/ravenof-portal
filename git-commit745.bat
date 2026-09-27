@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/components/digital/DigitalMyDecks.tsx src/locales/lt/decks.json src/locales/en/decks.json tsconfig.check.scene.json src/lib/version.ts git-commit745.bat
git commit -m "745: Mano kalades mobile - veiksmu mygtukai 2x2 (Redaguoti nebenukerpamas), LITE rezimas mobile/silpniems irenginiams (be zariju RAF, blend, blur, atspindzio ir filtru; maziau seseliu, 3 halo kortos) - nebelagina; APP_VERSION 745" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01JMitPggicCjMqQoG7n1BWv"
git push
git log -1 --oneline
) > commit745.log 2>&1
