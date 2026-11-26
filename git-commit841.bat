@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/components/digital/progression/kit.tsx src/components/digital/progression/ChoiceModals.tsx src/lib/version.ts tools/cards-sync-figma.mjs tools/figma-cards-plugin/code.js tools/figma-cards-plugin/ui.html git-commit840.bat git-commit841.bat
git commit -m "841: boosterio pasirinkimo langas nebeuzdengiamas navigacijos (portalas), pakuote telpa mobile; Figma plugin teksto keitimas, sync --only, Olafas Burgas nekeliamas" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2q4xKtxDCTMeqeaDnr"
git push
git log -1 --oneline
) > commit841.log 2>&1
