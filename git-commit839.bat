@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add tools/cards-sync-figma.mjs git-commit839.bat
git commit -m "839: kortu vaizdu sinchronizacija - frakcijos pirmenybe, apytiksliai vardai, rankiniai pataisymai (Impas, Keltornas)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2q4xKtxDCTMeqeaDnr"
git push
git log -1 --oneline
) > commit839.log 2>&1
