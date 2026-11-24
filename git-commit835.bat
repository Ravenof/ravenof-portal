@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/gamification/shop.ts src/components/digital/ShopModal.tsx src/lib/version.ts git-commit835.bat
git commit -m "835: rubinu paketai visiems (REAL_MONEY_SHOP_ENABLED=true); parduotuves kainos nebeuzdengiamos isblukinto fono" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2q4xKtxDCTMeqeaDnr"
git push
git log -1 --oneline
) > commit835.log 2>&1
