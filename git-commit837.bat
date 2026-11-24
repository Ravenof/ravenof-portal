@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add tools/figma-cards-plugin/manifest.json tools/figma-cards-plugin/code.js tools/figma-cards-plugin/ui.html tools/figma-card-sink.mjs tools/cards-sync-figma.mjs git-commit837.bat
git commit -m "837: Figma kortu numeracijos ir eksporto plugin'as (LT+EN), PNG priemimo serveris, kortu vaizdu ikelimas i zaidima" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2q4xKtxDCTMeqeaDnr"
git push
git log -1 --oneline
) > commit837.log 2>&1
