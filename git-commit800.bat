@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/gamification/shop.ts src/components/digital/ShopModal.tsx src/lib/version.ts git-commit800.bat
git commit -m "800: parduotuveje paslepta rubinu sekcija ir prekes tik uz tikrus pinigus (REAL_MONEY_SHOP_ENABLED=false), kol neprijungtas Play Billing; rubinai kaip valiuta lieka" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2oYWU2WAsACmgeB9Ak"
git push
git log -1 --oneline
) > commit800.log 2>&1
