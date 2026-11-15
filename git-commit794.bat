@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/app/admin/shop/AdminShopClient.tsx src/lib/version.ts git-commit794.bat
git commit -m "794: admin kosmetikos (nugareles, avatarai) issaugojimas kartu sukuria ir atnaujina parduotuves preke (shop_items + sidabro kaina), trinant - preke isjungiama" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2roVTLcAdN84CcY8er"
git push
git log -1 --oneline
) > commit794.log 2>&1
