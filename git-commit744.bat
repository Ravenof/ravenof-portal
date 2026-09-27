@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/components/digital/DigitalMyDecks.tsx src/locales/lt/decks.json src/locales/en/decks.json tsconfig.check.scene.json src/lib/version.ts git-commit744.bat
git commit -m "744: Mano kalades - naujas altoriaus meniu (3D coverflow karusele su frakcijos altoriumi, zarijomis, atspindziu ir raktiniu kortu halo; info panelis su count-up statistika, aukso kreive, raktinemis kortomis; AKTYVINTI su antspaudu, blyksniu, banga, kibirkstimis ir drebejimu; TRINTI - dezute sudega; ijimo animacija; portrait/landscape/desktop be scroll; rodykles, ratukas, swipe), pilnas kortu sarasas per KORTOS drawer; APP_VERSION 744" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01JMitPggicCjMqQoG7n1BWv"
git push
git log -1 --oneline
) > commit744.log 2>&1
