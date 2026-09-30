@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/components/digital/DigitalMyDecks.tsx src/locales/lt/decks.json src/locales/en/decks.json tsconfig.check.scene.json src/lib/version.ts git-commit746.bat
git commit -m "746: Mano kalades - raktiniu kortu halo pakeltas virs dezutes lanku (nebepersidengia su pacia kalade), kortos kiek mazesnes, dezutes dydis perskaiciuotas su halo aukciu; APP_VERSION 746" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01JMitPggicCjMqQoG7n1BWv"
git push
git log -1 --oneline
) > commit746.log 2>&1
