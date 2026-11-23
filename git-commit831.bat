@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add supabase/functions/verify-receipt/index.ts src/components/digital/shop/AvatarPackPreview.tsx src/components/digital/ShopModal.tsx src/locales/lt/shop.json src/locales/en/shop.json src/lib/version.ts git-commit831.bat
git commit -m "831: parduotuveje avataro pack perziura - veido israiskos, reakcijos su balsu ir frazemis, emociju ratas, Pakalbinti; verify-receipt CORS" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2q4xKtxDCTMeqeaDnr"
git push
git log -1 --oneline
) > commit831.log 2>&1
