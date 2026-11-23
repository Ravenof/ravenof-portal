@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
echo === npm install native-purchases ===
call npm install --no-audit --no-fund
git add package.json package-lock.json
git add src/components/digital/ui/FormatSwitch.tsx src/locales/lt/home.json src/locales/en/home.json
git add src/lib/digital/iap.ts src/components/digital/shop/RubyPacks.tsx src/components/digital/ShopModal.tsx src/locales/lt/shop.json src/locales/en/shop.json
git add src/app/digital/layout.tsx src/lib/rewards/rewardVisuals.ts
git add public/ravenof-ui/currencies/cur-rubies.png public/ravenof-ui/currencies/cur-silver.png public/ravenof-ui/currencies/cur-essence.png
git add public/digital/icons/cur-rubies.png public/digital/icons/cur-silver.png public/digital/icons/cur-essence.png
git add public/ravenof-ui/shop/rubies
git add supabase/migrations/20261123_rubies_iap_packs.sql supabase/functions/verify-receipt/index.ts
git add src/lib/version.ts git-commit830.bat
git commit -m "830: ZMK/Klasikos info mygtukas; rubinu paketai 100-10000 per Google Play Billing (tik adminams), native-purchases, verify-receipt consume + account check; naujos gotikines valiutu ikonos" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2q4xKtxDCTMeqeaDnr"
git push
git log -1 --oneline
) > commit830.log 2>&1
