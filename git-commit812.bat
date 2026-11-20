@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/cosmetics.ts src/lib/digital/cosmeticsStore.ts src/components/tutorial/TutorialGame.tsx src/components/digital/ShopModal.tsx src/components/digital/CosmeticsModal.tsx src/components/digital/profile/ProfileCosmeticsModal.tsx src/lib/gamification/shop.ts src/app/admin/shop/AdminShopClient.tsx src/locales/lt/profile.json src/locales/en/profile.json src/locales/lt/shop.json src/locales/en/shop.json src/locales/lt/common.json src/locales/en/common.json supabase/migrations/20261120_avatar_frames.sql src/lib/version.ts build-aab.bat android/app/src/main/AndroidManifest.xml git-commit812.bat
git commit -m "812: ZMK kruvele naudoja kalades nugarele; avataro remeliai - nauja kosmetikos rusis avatar_frame (kova, profilis, parduotuve, adminas) + migracija 20261120; build-aab pataisos ir landscape feature manifeste" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2oYWU2WAsACmgeB9Ak"
git push
git log -1 --oneline
) > commit812.log 2>&1
