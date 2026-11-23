@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/components/digital/PackChooser.tsx src/components/digital/DigitalCollection.tsx src/components/digital/ShopModal.tsx src/locales/lt/collection.json src/locales/en/collection.json src/locales/lt/shop.json src/locales/en/shop.json src/lib/version.ts git-commit827.bat
git commit -m "827: paku pasirinkimas su paku paveiksleliais (bendras PackChooser), parduotuves Open packs atidaro pakus is karto, be dovanos emoji LT/EN" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2q4xKtxDCTMeqeaDnr"
git push
git log -1 --oneline
) > commit827.log 2>&1
